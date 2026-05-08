import numpy as np

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

    sid = np.sum(a * np.log(a / b)) + \
          np.sum(b * np.log(b / a))

    return float(sid)

def spectral_correlation(a, b):
    return np.corrcoef(a, b)[0,1]

def spectral_depth(spec):
    return float(np.max(spec) - np.min(spec))

def depth_similarity(d1, d2):
    return max(
        0.0,
        1 - abs(d1 - d2)/(d1 + 1e-8)
    )

def compute_metrics(a, b):

    angle = spectral_angle_mapper(a, b)
    err = rmse(a, b)
    sid = spectral_information_divergence(a, b)
    corr = spectral_correlation(a, b)

    angle = np.nan_to_num(angle, nan=90.0)
    err   = np.nan_to_num(err, nan=1.0)
    sid   = np.nan_to_num(sid, nan=1.0)
    corr  = np.nan_to_num(corr, nan=0.0)

    return angle, err, sid, corr