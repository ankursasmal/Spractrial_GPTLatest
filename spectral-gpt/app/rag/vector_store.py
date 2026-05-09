import numpy as np

from app.core.database import collection

from app.ai.embedding_service import generate_embedding
from app.ai.similarity_engine import cosine_similarity


# =========================================================
# BUILD EMBEDDINGS FOR ALL DOCUMENTS
# RUN ONCE / WHEN DB UPDATES
# =========================================================

def build_vector_index():

    docs = collection.find({})

    updated = 0

    for doc in docs:

        spectral_data = doc.get("spectral_data")

        if not spectral_data:
            continue

        try:
            spectrum = [point[1] for point in spectral_data]

            embedding = generate_embedding(spectrum)

            if embedding is None:
                continue

            collection.update_one(
                {"_id": doc["_id"]},
                {
                    "$set": {
                        "embedding": embedding.tolist()
                    }
                }
            )

            updated += 1

        except Exception:
            continue

    return updated


# =========================================================
# VECTOR SEARCH USING SIAMESE EMBEDDINGS
# =========================================================

def search_similar_spectra(query_spectrum, top_k=5):

    query_embedding = generate_embedding(query_spectrum)

    if query_embedding is None:
        return []

    docs = collection.find(
        {
            "embedding": {
                "$exists": True
            }
        },
        {
            "_id": 0
        }
    )

    scored_results = []

    for doc in docs:

        stored_embedding = doc.get("embedding")

        if not stored_embedding:
            continue

        score = cosine_similarity(
            query_embedding,
            np.array(stored_embedding)
        )

        metadata = doc.get("metadata", {})

        scored_results.append(
            {
                "material": metadata.get("Name"),
                "class_name": metadata.get("Class"),
                "subclass": metadata.get("Subclass"),
                "siamese_similarity": round(
                    score * 100,
                    2
                ),
                "document": doc
            }
        )

    scored_results.sort(
        key=lambda x: x["siamese_similarity"],
        reverse=True
    )

    return scored_results[:top_k]


# =========================================================
# GET DOCS BY CLASS
# =========================================================

def retrieve_docs_by_class(class_name, limit=5):

    cursor = collection.find(
        {
            "metadata.Class": class_name
        },
        {
            "_id": 0
        }
    ).limit(limit)

    return list(cursor)