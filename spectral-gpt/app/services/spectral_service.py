import numpy as np

from app.spectral.hybrid_match import hybrid_match

from app.llm.explanation_service import (
    generate_explanation
)

# =========================================================
# MAIN SPECTRAL ANALYSIS SERVICE
# =========================================================

def analyze_spectrum(spectral_data):

    # convert to numpy
    query = np.array(
        spectral_data,
        dtype=np.float64
    )

    # spectral matching
    matches = hybrid_match(query)

    # safe AI explanation
    try:

        explanation = generate_explanation(
            matches
        )

    except Exception as e:

        explanation = (
            f"LLM unavailable: {str(e)}"
        )

    # final response
    return {
        "matches": matches,
        "ai_explanation": explanation
    }