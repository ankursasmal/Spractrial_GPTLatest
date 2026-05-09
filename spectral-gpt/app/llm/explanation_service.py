from app.llm.prompt_builder import (
    build_explanation_prompt,
    build_chat_prompt
)

from app.llm.ollama_client import ask_llm


def generate_explanation(
    matches,
    context
):

    prompt = build_explanation_prompt(
        matches,
        context
    )

    return ask_llm(prompt)


def generate_chat_response(
    question,
    context
):

    prompt = build_chat_prompt(
        question,
        context
    )

    return ask_llm(prompt)