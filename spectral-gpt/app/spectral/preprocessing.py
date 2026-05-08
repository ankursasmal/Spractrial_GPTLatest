import numpy as np
from scipy.signal import savgol_filter

# =========================================================
# REMOVE NAN / INF
# =========================================================

def clean_spectrum(spec):

    spec = np.nan_to_num(
        spec,
        nan=0.0,
        posinf=0.0,
        neginf=0.0
    )

    return spec

# =========================================================
# SMOOTHING
# Savitzky-Golay Filter
# =========================================================

def smooth_spectrum(y,
                    window_length=11,
                    polyorder=2):

    if len(y) < window_length:
        return y

    return savgol_filter(
        y,
        window_length=window_length,
        polyorder=polyorder
    )

# =========================================================
# MIN MAX NORMALIZATION
# =========================================================

def minmax_normalize(y):

    y_min = np.min(y)
    y_max = np.max(y)

    return (
        y - y_min
    ) / (
        y_max - y_min + 1e-8
    )

# =========================================================
# STANDARD NORMALIZATION
# =========================================================

def zscore_normalize(y):

    return (
        y - np.mean(y)
    ) / (
        np.std(y) + 1e-8
    )

# =========================================================
# BASELINE CORRECTION
# =========================================================

def baseline_correction(y):

    baseline = np.min(y)

    return y - baseline

# =========================================================
# FIRST DERIVATIVE
# =========================================================

def first_derivative(y):

    return np.gradient(y)

# =========================================================
# SECOND DERIVATIVE
# =========================================================

def second_derivative(y):

    return np.gradient(
        np.gradient(y)
    )

# =========================================================
# FULL PREPROCESS PIPELINE
# =========================================================

def preprocess_spectrum(y):

    # clean
    y = clean_spectrum(y)

    # smooth
    y = smooth_spectrum(y)

    # baseline correction
    y = baseline_correction(y)

    # normalize
    y = minmax_normalize(y)

    return y