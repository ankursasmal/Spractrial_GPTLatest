from app.rag.retriever import search_docs_by_query
from app.rag.context_builder import build_context_from_docs

from app.llm.explanation_service import (
    generate_chat_response
)


def handle_chat(question):

    docs = search_docs_by_query(
        question,
        limit=5
    )

    context = build_context_from_docs(
        docs
    )

    response = generate_chat_response(
        question,
        context
    )

    return response