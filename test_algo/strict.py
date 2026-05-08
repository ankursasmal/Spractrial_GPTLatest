"""
Spectral Matching API (Generalized + Multi-Normalization + Robust Hybrid)
-------------------------------------------------------------------------

✔ Supports different wavelength ranges
✔ Supports different resolutions & gaps
✔ Works with all spectrometers
✔ Multi-normalization (vector + z-score + robust)
✔ Cubic interpolation alignment
✔ Advanced hybrid scoring
"""

from fastapi import FastAPI, Body, HTTPException
from pymongo import MongoClient
import numpy as np
from scipy.interpolate import interp1d
import uvicorn

# =========================================================
# CONFIG
# =========================================================

MONGO_URI = "mongodb://localhost:27017"
DB_NAME = "spectralGpt"
COLLECTION_NAME = "spectralData"

MATCH_MIN = 60.0

# =========================================================
# APP INIT
# =========================================================

app = FastAPI(title="Spectral Matching API - Advanced")

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# =========================================================
# ALIGNMENT (CUBIC INTERPOLATION)
# =========================================================

def align_spectra(query, db, points=300):

    qx, qy = query[:,0], query[:,1]
    dx, dy = db[:,0], db[:,1]

    min_wave = max(qx.min(), dx.min())
    max_wave = min(qx.max(), dx.max())

    if min_wave >= max_wave:
        return None, None

    # adaptive resolution
    points = max(len(qx), len(dx), points)

    new_x = np.linspace(min_wave, max_wave, points)

    f_q = interp1d(qx, qy, kind='cubic', fill_value="extrapolate")
    f_d = interp1d(dx, dy, kind='cubic', fill_value="extrapolate")

    return f_q(new_x), f_d(new_x)

# =========================================================
# MULTI NORMALIZATION
# =========================================================

def normalize_multi(a, b):

    # Vector normalization
    a_vec = a / (np.linalg.norm(a) + 1e-8)
    b_vec = b / (np.linalg.norm(b) + 1e-8)

    # Z-score normalization
    a_z = (a - np.mean(a)) / (np.std(a) + 1e-8)
    b_z = (b - np.mean(b)) / (np.std(b) + 1e-8)

    # Robust normalization (IQR)
    def robust(x):
        return (x - np.median(x)) / (np.percentile(x,75) - np.percentile(x,25) + 1e-8)

    a_r = robust(a)
    b_r = robust(b)

    return (a_vec, b_vec), (a_z, b_z), (a_r, b_r)

# =========================================================
# METRICS
# =========================================================

def spectral_angle_mapper(a, b):
    cos_theta = np.clip(np.dot(a, b), -1, 1)
    return np.degrees(np.arccos(cos_theta))

def rmse(a, b):
    return np.sqrt(np.mean((a - b) ** 2))

def spectral_information_divergence(a, b):
    a = a / (np.sum(a) + 1e-8)
    b = b / (np.sum(b) + 1e-8)

    return np.sum(a * np.log((a+1e-8)/(b+1e-8))) + \
           np.sum(b * np.log((b+1e-8)/(a+1e-8)))

def spectral_correlation(a, b):
    return np.corrcoef(a, b)[0,1]

def spectral_depth(spec):
    return float(np.max(spec) - np.min(spec))

def depth_similarity(d1, d2):
    return max(0.0, 1 - abs(d1 - d2)/(d1 + 1e-8))

def direct_match(a, b, tol=1e-6):
    return len(a) == len(b) and np.allclose(a, b, atol=tol)

# =========================================================
# METRIC COMPUTATION
# =========================================================

def compute_metrics(a, b):
    angle = spectral_angle_mapper(a, b)
    err = rmse(a, b)
    sid = spectral_information_divergence(a, b)
    corr = spectral_correlation(a, b)
    return angle, err, sid, corr

# =========================================================
# API
# =========================================================

@app.post("/api/spectral/match")
async def match_spectrum(payload: dict = Body(...)):

    spectral_data = payload.get("spectral_data")
    algo_type = payload.get("algo_type", "hybrid").lower()

    if not spectral_data:
        raise HTTPException(400, "spectral_data is required")

    query = np.array(spectral_data, dtype=np.float64)

    if query.ndim != 2 or query.shape[1] != 2:
        raise HTTPException(400, "Invalid spectral format")

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

        # ALIGN
        qy, dy = align_spectra(query, db_spec)

        if qy is None:
            continue

        # DEPTH
        q_depth = spectral_depth(qy)
        d_depth = spectral_depth(dy)
        depth_score = depth_similarity(q_depth, d_depth)

        # =============================
        # ALGORITHM SWITCH
        # =============================

        if algo_type == "direct":

            if not direct_match(qy, dy):
                continue

            accuracy = 100.0

        elif algo_type == "hybrid":

            # MULTI NORMALIZATION
            (v1, v2), (z1, z2), (r1, r2) = normalize_multi(qy, dy)

            # METRICS
            angle1, err1, sid1, corr1 = compute_metrics(v1, v2)
            angle2, err2, sid2, corr2 = compute_metrics(z1, z2)
            angle3, err3, sid3, corr3 = compute_metrics(r1, r2)

            # FUSION
            angle = (angle1 + angle2 + angle3) / 3
            err   = (err1 + err2 + err3) / 3
            sid   = (sid1 + sid2 + sid3) / 3
            corr  = (corr1 + corr2 + corr3) / 3

            # IMPROVED SCORING
            sam_score = np.exp(-angle / 10)
            sid_score = 1 / (1 + sid)
            rmse_score = 1 - err
            corr_score = (corr + 1) / 2

            accuracy = round(
                100 * (
                    0.30 * sam_score +
                    0.25 * sid_score +
                    0.20 * rmse_score +
                    0.15 * corr_score +
                    0.10 * depth_score
                ), 2
            )

        elif algo_type == "sam":

            (v1, v2), _, _ = normalize_multi(qy, dy)
            angle, _, _, _ = compute_metrics(v1, v2)
            accuracy = round(100 * np.exp(-angle/10), 2)

        elif algo_type == "sid":

            _, (z1, z2), _ = normalize_multi(qy, dy)
            _, _, sid, _ = compute_metrics(z1, z2)
            accuracy = round(100 * (1/(1+sid)), 2)

        elif algo_type == "depth":

            accuracy = round(100 * depth_score, 2)

        else:
            raise HTTPException(400, "Invalid algo_type")

        # FILTER
        if accuracy >= MATCH_MIN:

            results.append({
                "material": doc.get("metadata", {}).get("Name"),
                "class": doc.get("metadata", {}).get("Class"),
                "subclass": doc.get("metadata", {}).get("Subclass"),
                "accuracy": accuracy,
                "points": len(db_raw)
            })

    results.sort(key=lambda x: x["accuracy"], reverse=True)

    return {
        "algorithm_used": algo_type,
        "total_matches": len(results),
        "matches": results
    }

# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)