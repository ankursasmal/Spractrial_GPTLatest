from app.llm.prompt_builder import build_prompt
from app.llm.openai_client import ask_llm

def generate_explanation(matches):

    prompt = build_prompt(matches)

    explanation = ask_llm(prompt)

    return explanation