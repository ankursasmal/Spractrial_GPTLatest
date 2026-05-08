from fastapi import FastAPI

from app.api.match_routes import router as match_router
from app.api.chat_routes import router as chat_router

app = FastAPI(title="SpectralGPT")

app.include_router(
    match_router,
    prefix="/api/spectral"
)

app.include_router(
    chat_router,
    prefix="/api/chat"
)