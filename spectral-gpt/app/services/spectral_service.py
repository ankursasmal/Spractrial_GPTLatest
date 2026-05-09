import numpy as np

from app.spectral.hybrid_match import hybrid_match

from app.ai.predictor import predict_class
from app.rag.vector_store import search_similar_spectra
from app.ai.similarity_engine import unknown_detection

from app.rag.retriever import get_docs_from_matches
from app.rag.context_builder import build_context_from_docs

from app.llm.explanation_service import generate_explanation


def analyze_spectrum(spectral_data):

    query = np.array(
        spectral_data,
        dtype=np.float32
    )

    cnn_prediction = predict_class(query)

    siamese_results = search_similar_spectra(
        query,
        top_k=5
    )

    hybrid_matches = hybrid_match(query)

    combined_matches = hybrid_matches

    if siamese_results:
        combined_matches.extend(siamese_results)

    combined_matches = sorted(
        combined_matches,
        key=lambda x: x.get(
            "accuracy",
            x.get("siamese_similarity", 0)
        ),
        reverse=True
    )

    top_score = combined_matches[0].get(
        "accuracy",
        combined_matches[0].get(
            "siamese_similarity",
            0
        )
    )

    if unknown_detection(top_score):
        return {
            "matches": [],
            "cnn_prediction": cnn_prediction,
            "ai_explanation":
                "Unknown or weakly matching spectrum."
        }

    docs = get_docs_from_matches(
        combined_matches
    )

    context = build_context_from_docs(
        docs
    )

    explanation = generate_explanation(
        combined_matches,
        context
    )

    return {
        "matches": combined_matches[:10],
        "cnn_prediction": cnn_prediction,
        "ai_explanation": explanation
    }