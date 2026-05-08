from fastapi import APIRouter
from app.llm.openai_client import ask_llm

router = APIRouter()

@router.post("/chat")

async def spectral_chat(payload: dict):

    question = payload.get("question")

    response = ask_llm(question)

    return {
        "response": response
    }