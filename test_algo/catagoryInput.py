from fastapi import FastAPI, Body, HTTPException
from pymongo import MongoClient
import numpy as np
import uvicorn

# =========================================================
# CONFIG
# =========================================================
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "spectralGpt"
COLLECTION_NAME = "spectralData"

MATCH_MIN =60.0
INTERP_POINTS = 300

# =========================================================
# APP INIT
# =========================================================
app = FastAPI(title="Spectral Matching API (Final)")

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# =========================================================
# DATA CLEANING
# =========================================================
def sort_spectrum(spec):
    return spec[spec[:,0].argsort()]


def remove_duplicates(spec):
    _, idx = np.unique(spec[:,0], return_index=True)
    return spec[idx]


def clean_spectrum(spec):
    spec = sort_spectrum(spec)
    spec = remove_duplicates(spec)
    return spec


# =========================================================
# ALIGN + INTERPOLATION
# =========================================================
def align_spectra(query, db, points=INTERP_POINTS):

    qx, qy = query[:,0], query[:,1]
    dx, dy = db[:,0], db[:,1]

    min_wave = max(qx.min(), dx.min())
    max_wave = min(qx.max(), dx.max())

    if min_wave >= max_wave:
        return None, None

    new_x = np.linspace(min_wave, max_wave, points)

    q_interp = np.interp(new_x, qx, qy)
    d_interp = np.interp(new_x, dx, dy)

    return q_interp, d_interp


# =========================================================
# NORMALIZATION
# =========================================================
def normalize(a, b):

    mn = min(a.min(), b.min())
    mx = max(a.max(), b.max())

    if abs(mx - mn) < 1e-8:
        return a, b

    return (a - mn)/(mx-mn), (b - mn)/(mx-mn)


# =========================================================
# METRICS
# =========================================================
def spectral_angle_mapper(a, b):
    a = a / (np.linalg.norm(a) + 1e-8)
    b = b / (np.linalg.norm(b) + 1e-8)

    cos_theta = np.clip(np.dot(a, b), -1, 1)
    return np.degrees(np.arccos(cos_theta))


def rmse(a, b):
    return np.sqrt(np.mean((a - b) ** 2))


def spectral_information_divergence(a, b):
    a = a / (np.sum(a) + 1e-8)
    b = b / (np.sum(b) + 1e-8)

    return np.sum(a*np.log((a+1e-8)/(b+1e-8))) + \
           np.sum(b*np.log((b+1e-8)/(a+1e-8)))


def spectral_correlation(a, b):
    return np.corrcoef(a, b)[0,1]


def spectral_depth(spec):
    return float(np.max(spec) - np.min(spec))


def depth_similarity(d1, d2):
    return max(0.0, 1 - abs(d1 - d2)/(d1 + 1e-8))


def direct_match(a, b, tol=1e-6):
    return len(a) == len(b) and np.allclose(a, b, atol=tol)


# =========================================================
# CATEGORY RANGE
# =========================================================
def get_category_range(docs):

    min_w = float("inf")
    max_w = float("-inf")

    for doc in docs:
        data = doc.get("spectral_data", [])
        if not data:
            continue

        arr = np.array(data)
        arr = clean_spectrum(arr)

        min_w = min(min_w, arr[:,0].min())
        max_w = max(max_w, arr[:,0].max())

    if min_w == float("inf"):
        return None, None

    return min_w, max_w


# =========================================================
# API
# =========================================================
@app.post("/api/spectral/match")
async def match_spectrum(payload: dict = Body(...)):

    spectral_data = payload.get("spectral_data")
    algo_type = payload.get("algo_type", "hybrid").lower()
    category = payload.get("category")

    if not spectral_data:
        raise HTTPException(400, "spectral_data is required")

    # Convert query
    try:
        query = np.array(spectral_data, dtype=np.float64)
    except:
        raise HTTPException(400, "Invalid spectral_data format")

    if query.ndim != 2 or query.shape[1] != 2:
        raise HTTPException(400, "spectral_data must be [[wavelength,value], ...]")

    query = clean_spectrum(query)

    # =====================================================
    # FILTER DATABASE BY CATEGORY
    # =====================================================
    db_docs = []

    for doc in collection.find():

        if category:
            db_class = doc.get("metadata", {}).get("Class", "").lower()
            db_sub = doc.get("metadata", {}).get("Subclass", "").lower()

            if category.lower() not in db_class and category.lower() not in db_sub:
                continue

        db_docs.append(doc)

    if not db_docs:
        raise HTTPException(404, "No matching category data found")

    # =====================================================
    # FIND RANGE
    # =====================================================
    min_w, max_w = get_category_range(db_docs)

    if min_w is None:
        raise HTTPException(500, "Invalid DB spectral data")

    results = []

    # =====================================================
    # MATCH LOOP
    # =====================================================
    for doc in db_docs:

        db_raw = doc.get("spectral_data")

        if not isinstance(db_raw, list) or len(db_raw) < 10:
            continue

        try:
            db_spec = np.array(db_raw, dtype=np.float64)
        except:
            continue

        if db_spec.ndim != 2 or db_spec.shape[1] != 2:
            continue

        db_spec = clean_spectrum(db_spec)

        # ALIGN USING INTERPOLATION
        qy, dy = align_spectra(query, db_spec)

        if qy is None:
            continue

        # NORMALIZE
        qn, dn = normalize(qy, dy)

        # METRICS
        angle = spectral_angle_mapper(qn, dn)
        err = rmse(qn, dn)
        sid = spectral_information_divergence(qn, dn)
        corr = spectral_correlation(qn, dn)

        depth_score = depth_similarity(
            spectral_depth(qy),
            spectral_depth(dy)
        )

        # =================================================
        # ALGO SWITCH
        # =================================================
        if algo_type == "direct":

            if not direct_match(qy, dy):
                continue

            accuracy = 100.0

        elif algo_type == "sam":
            accuracy = 100 * (1 - angle/60)

        elif algo_type == "sid":
            accuracy = 100 * (1/(1+sid))

        elif algo_type == "depth":
            accuracy = 100 * depth_score

        elif algo_type == "hybrid":
            accuracy = 100 * (
                0.30*(1 - angle/60) +
                0.25*(1/(1+sid)) +
                0.20*(1 - err) +
                0.15*corr +
                0.10*depth_score
            )

        else:
            raise HTTPException(400, "Invalid algo_type")

        accuracy = round(max(0, accuracy), 2)

        if accuracy >= MATCH_MIN:

            results.append({
                "material": doc.get("metadata", {}).get("Name"),
                "class": doc.get("metadata", {}).get("Class"),
                "subclass": doc.get("metadata", {}).get("Subclass"),
                "accuracy": accuracy,

                "sam_angle": round(angle,3),
                "rmse": round(err,5),
                "sid": round(sid,5),
                "correlation": round(corr,3),
                "depth_similarity": round(depth_score,3)
            })

    results.sort(key=lambda x: x["accuracy"], reverse=True)

    return {
        "category_used": category,
        "range_used": [round(min_w,3), round(max_w,3)],
        "algorithm": algo_type,
        "total_matches": len(results),
        "matches": results
    }


# =========================================================
# RUN
# =========================================================
if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)