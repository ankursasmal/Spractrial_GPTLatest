"""
Spectral Matching API (FINAL STABLE VERSION)
-------------------------------------------

✔ Global wavelength range (0.42–14 µm)
✔ Handles different spectrometers
✔ Multi-normalization (vector + z-score + robust)
✔ Safe SID (no log crash)
✔ No NaN / JSON error
✔ Stable hybrid scoring
"""

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

GLOBAL_MIN = 0.42
GLOBAL_MAX = 14.0

# =========================================================
# APP INIT
# =========================================================

app = FastAPI(title="Spectral Matching API - FINAL")

client = MongoClient(MONGO_URI)
collection = client[DB_NAME][COLLECTION_NAME]

# =========================================================
# ALIGNMENT (GLOBAL RANGE + MASK)
# =========================================================

def align_spectra(query, db, points=500):

    qx, qy = query[:,0], query[:,1]
    dx, dy = db[:,0], db[:,1]

    new_x = np.linspace(GLOBAL_MIN, GLOBAL_MAX, points)

    q_interp = np.interp(new_x, qx, qy, left=np.nan, right=np.nan)
    d_interp = np.interp(new_x, dx, dy, left=np.nan, right=np.nan)

    mask = ~np.isnan(q_interp) & ~np.isnan(d_interp)

    if np.sum(mask) < 20:
        return None, None

    return q_interp[mask], d_interp[mask]

# =========================================================
# NORMALIZATION
# =========================================================

def normalize_multi(a, b):

    a_vec = a / (np.linalg.norm(a) + 1e-8)
    b_vec = b / (np.linalg.norm(b) + 1e-8)

    a_z = (a - np.mean(a)) / (np.std(a) + 1e-8)
    b_z = (b - np.mean(b)) / (np.std(b) + 1e-8)

    def robust(x):
        return (x - np.median(x)) / (np.percentile(x,75) - np.percentile(x,25) + 1e-8)

    a_r = robust(a)
    b_r = robust(b)

    return (a_vec, b_vec), (a_z, b_z), (a_r, b_r)

# =========================================================
# METRICS (SAFE)
# =========================================================

def spectral_angle_mapper(a, b):
    cos_theta = np.clip(np.dot(a, b), -1, 1)
    return np.degrees(np.arccos(cos_theta))

def rmse(a, b):
    return np.sqrt(np.mean((a - b) ** 2))

def spectral_information_divergence(a, b):

    a = np.abs(a)
    b = np.abs(b)

    a = a / (np.sum(a) + 1e-8)
    b = b / (np.sum(b) + 1e-8)

    mask = (a > 1e-10) & (b > 1e-10)

    if np.sum(mask) == 0:
        return 1.0

    a = a[mask]
    b = b[mask]

    sid = np.sum(a * np.log(a / b)) + np.sum(b * np.log(b / a))

    return float(sid)

def spectral_correlation(a, b):
    return np.corrcoef(a, b)[0,1]

def spectral_depth(spec):
    return float(np.max(spec) - np.min(spec))

def depth_similarity(d1, d2):
    return max(0.0, 1 - abs(d1 - d2)/(d1 + 1e-8))

# =========================================================
# METRIC COMPUTATION (SAFE)
# =========================================================

def compute_metrics(a, b):

    angle = spectral_angle_mapper(a, b)
    err = rmse(a, b)
    sid = spectral_information_divergence(a, b)
    corr = spectral_correlation(a, b)

    # 🔥 remove NaN / inf
    angle = np.nan_to_num(angle, nan=90.0)
    err   = np.nan_to_num(err, nan=1.0)
    sid   = np.nan_to_num(sid, nan=1.0)
    corr  = np.nan_to_num(corr, nan=0.0)

    return angle, err, sid, corr

# =========================================================
# API
# =========================================================

@app.post("/api/spectral/match")
async def match_spectrum(payload: dict = Body(...)):

    spectral_data = payload.get("spectral_data")

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

        # SCORING
        sam_score  = np.exp(-angle / 20)
        sid_score  = 1 / (1 + sid)
        rmse_score = np.exp(-err)
        corr_score = (corr + 1) / 2

        accuracy = 100 * (
            0.30 * sam_score +
            0.25 * sid_score +
            0.20 * rmse_score +
            0.15 * corr_score +
            0.10 * depth_score
        )

        # FINAL CLEAN
        accuracy = float(np.nan_to_num(accuracy, nan=0.0))

        results.append({
            "material": doc.get("metadata", {}).get("Name"),
            "class": doc.get("metadata", {}).get("Class"),
            "subclass": doc.get("metadata", {}).get("Subclass"),
            "accuracy": round(accuracy, 2),
            "points": len(db_raw)
        })

    # SORT TOP RESULTS
    results = sorted(results, key=lambda x: x["accuracy"], reverse=True)[:10]

    return {
        "algorithm_used": "hybrid",
        "total_matches": len(results),
        "matches": results
    }

# =========================================================
# RUN
# =========================================================

if __name__ == "__main__":
    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=True)