import numpy as np

from app.core.database import collection

from app.spectral.alignment import align_spectra
from app.spectral.normalization import normalize_multi
from app.spectral.metrics import *

def hybrid_match(query):

    results = []

    for doc in collection.find():

        db_raw = doc.get("spectral_data")

        if not db_raw:
            continue

        db_spec = np.array(db_raw, dtype=np.float64)

        qy, dy = align_spectra(query, db_spec)

        if qy is None:
            continue

        q_depth = spectral_depth(qy)
        d_depth = spectral_depth(dy)

        depth_score = depth_similarity(
            q_depth,
            d_depth
        )

        (v1, v2), (z1, z2), (r1, r2) = \
            normalize_multi(qy, dy)

        angle1, err1, sid1, corr1 = \
            compute_metrics(v1, v2)

        angle2, err2, sid2, corr2 = \
            compute_metrics(z1, z2)

        angle3, err3, sid3, corr3 = \
            compute_metrics(r1, r2)

        angle = (angle1 + angle2 + angle3) / 3
        err   = (err1 + err2 + err3) / 3
        sid   = (sid1 + sid2 + sid3) / 3
        corr  = (corr1 + corr2 + corr3) / 3

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

        results.append({
            "material": doc.get("metadata", {}).get("Name"),
            "class": doc.get("metadata", {}).get("Class"),
            "subclass": doc.get("metadata", {}).get("Subclass"),
            "accuracy": round(float(accuracy), 2)
        })

    results = sorted(
        results,
        key=lambda x: x["accuracy"],
        reverse=True
    )[:10]

    return results