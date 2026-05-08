import numpy as np

from app.core.config import GLOBAL_MIN, GLOBAL_MAX

from app.spectral.preprocessing import preprocess_spectrum

def align_spectra(query, db, points=500):

    qx, qy = query[:,0], query[:,1]
    dx, dy = db[:,0], db[:,1]

    new_x = np.linspace(
        GLOBAL_MIN,
        GLOBAL_MAX,
        points
    )

    q_interp = np.interp(
        new_x,
        qx,
        qy,
        left=np.nan,
        right=np.nan
    )

    d_interp = np.interp(
        new_x,
        dx,
        dy,
        left=np.nan,
        right=np.nan
    )

    mask = (
        ~np.isnan(q_interp)
        &
        ~np.isnan(d_interp)
    )

    if np.sum(mask) < 20:
        return None, None

    q_final = preprocess_spectrum(
        q_interp[mask]
    )

    d_final = preprocess_spectrum(
        d_interp[mask]
    )

    return q_final, d_final