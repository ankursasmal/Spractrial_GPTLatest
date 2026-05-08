"""
Spectral Matching API (Robust Auto Spectral Matching)
-----------------------------------------------------

Algorithms:
- direct  : exact match
- sam     : spectral angle mapper
- sid     : spectral information divergence
- depth   : spectral depth similarity
- hybrid  : sam + sid + rmse + correlation + depth

Supports:
✔ different wavelength ranges
✔ different dataset lengths
✔ different spectroradiometers
✔ automatic wavelength alignment
"""

from fastapi import FastAPI, Body, HTTPException
from pymongo import MongoClient
import numpy as np
import uvicorn

 
MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "spectralGpt"
COLLECTION_NAME = "spectralData"

MATCH_MIN = 70.0

# =========================================================
# APP
# =========================================================

app = FastAPI(title="Spectral Matching API")

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

 # SPECTRAL ALIGNMENT
 
def align_spectra(query, db, points=200):

    qx = query[:,0]
    qy = query[:,1]

    dx = db[:,0]
    dy = db[:,1]

    min_wave = max(qx.min(), dx.min())
    max_wave = min(qx.max(), dx.max())

    if min_wave >= max_wave:
        return None, None

    new_x = np.linspace(min_wave, max_wave, points)

    q_interp = np.interp(new_x, qx, qy)
    d_interp = np.interp(new_x, dx, dy)

    return q_interp, d_interp


 # NORMALIZATION
 
def normalize(a, b):

    mn = min(a.min(), b.min())
    mx = max(a.max(), b.max())

    return (
        (a - mn) / (mx - mn + 1e-8),
        (b - mn) / (mx - mn + 1e-8)
    )

 # METRICS
 
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

    sid = np.sum(a * np.log((a + 1e-8)/(b + 1e-8))) + \
          np.sum(b * np.log((b + 1e-8)/(a + 1e-8)))

    return sid


def spectral_correlation(a, b):

    return np.corrcoef(a, b)[0,1]


def spectral_depth(spec):

    return float(np.max(spec) - np.min(spec))


def depth_similarity(d1, d2):

    return max(0.0, 1 - abs(d1 - d2)/(d1 + 1e-8))


def direct_match(a, b, tol=1e-6):

    return len(a) == len(b) and np.allclose(a, b, atol=tol)


 # API only normaizion SID use


@app.post("/api/spectral/match")
async def match_spectrum(payload: dict = Body(...)):

    spectral_data = payload.get("spectral_data")
    algo_type = payload.get("algo_type", "hybrid").lower()

    if not spectral_data:
        raise HTTPException(400, "spectral_data is required")

    query = np.array(spectral_data, dtype=np.float64)

    if query.ndim != 2 or query.shape[1] != 2:
        raise HTTPException(400, "spectral_data must be [[wavelength,value], ...]")

    results = []

    for doc in collection.find():

        db_raw = doc.get("spectral_data")

        if not isinstance(db_raw, list) or len(db_raw) < 10:
            continue

        try:
            db_spec = np.array(db_raw, dtype=np.float64)
        except:
            continue

        if db_spec.ndim != 2 or db_spec.shape[1] != 2:
            continue

         # AUTO ALIGN SPECTRA
 
        qy, dy = align_spectra(query, db_spec)

        if qy is None:
            continue

        qn, dn = normalize(qy, dy)

        angle = spectral_angle_mapper(qn, dn)
        err = rmse(qn, dn)

        sid = spectral_information_divergence(qn, dn)
        corr = spectral_correlation(qn, dn)

        q_depth = spectral_depth(qy)
        d_depth = spectral_depth(dy)

        depth_score = depth_similarity(q_depth, d_depth)

         # ALGORITHM SWITCH
 
        if algo_type == "direct":

            if not direct_match(qy, dy):
                continue

            accuracy = 100.0

        elif algo_type == "sam":

            accuracy = round(100 * (1 - angle/70),2)

        elif algo_type == "sid":

            accuracy = round(100 * (1/(1+sid)),2)

        elif algo_type == "depth":

            accuracy = round(100 * depth_score,2)

        elif algo_type == "hybrid":

            accuracy = round(
                100 * (
                    0.30*(1 - angle/70) +
                    0.25*(1/(1+sid)) +
                    0.20*(1 - err) +
                    0.15*corr +
                    0.10*depth_score
                ),2
            )

        else:

            raise HTTPException(
                400,
                "algo_type must be one of: direct, sam, sid, depth, hybrid"
            )

         # MATCH FILTER
 
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
                "depth_similarity": round(depth_score,3),

                "spectral_points": len(db_raw)
            })

    results.sort(key=lambda x: x["accuracy"], reverse=True)

    return {

        "algorithm_used": algo_type,
        "match_range": "70–100%",
        "total_matches": len(results),
        "matches": results
    }


  
 
 # RUN
 
if __name__ == "__main__":

    uvicorn.run(
        "app:app",
        host="0.0.0.0",
        port=8000,
        reload=True
    )