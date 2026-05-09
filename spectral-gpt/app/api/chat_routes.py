from fastapi import APIRouter

from app.services.chat_service import (
    handle_chat
)

router = APIRouter()


@router.post("/chat")
async def spectral_chat(payload: dict):

    question = payload.get("question")

    if not question:
        return {
            "response": "Question required"
        }

    response = handle_chat(
        question
    )

    return {
        "response": response
    }