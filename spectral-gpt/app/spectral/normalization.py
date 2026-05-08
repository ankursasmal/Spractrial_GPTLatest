import numpy as np

def normalize_multi(a, b):

    a_vec = a / (np.linalg.norm(a) + 1e-8)
    b_vec = b / (np.linalg.norm(b) + 1e-8)

    a_z = (a - np.mean(a)) / (np.std(a) + 1e-8)
    b_z = (b - np.mean(b)) / (np.std(b) + 1e-8)

    def robust(x):
        return (
            x - np.median(x)
        ) / (
            np.percentile(x,75) -
            np.percentile(x,25) + 1e-8
        )

    a_r = robust(a)
    b_r = robust(b)

    return (a_vec, b_vec), (a_z, b_z), (a_r, b_r)