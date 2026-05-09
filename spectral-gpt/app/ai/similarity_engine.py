import numpy as np


def cosine_similarity(vec1, vec2):

    if vec1 is None or vec2 is None:
        return 0.0

    denom = (
        np.linalg.norm(vec1) *
        np.linalg.norm(vec2)
    )

    if denom == 0:
        return 0.0

    return float(
        np.dot(vec1, vec2) / denom
    )


def combine_scores(
    hybrid_score,
    siamese_score,
    cnn_confidence=0.0
):
    """
    weighted fusion
    """

    final_score = (
        0.5 * hybrid_score +
        0.35 * siamese_score * 100 +
        0.15 * cnn_confidence
    )

    return round(final_score, 2)


def unknown_detection(score, threshold=70):

    if score < threshold:
        return True

    return False