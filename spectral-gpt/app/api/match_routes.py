from fastapi import APIRouter

from app.models.request_models import (
    SpectralMatchRequest
)

from app.models.response_models import (
    MatchResponse
)

from app.services.spectral_service import (
    analyze_spectrum
)

router = APIRouter()

@router.post(
    "/match",
    response_model=MatchResponse
)

async def match_spectrum(
    payload: SpectralMatchRequest
):

    result = analyze_spectrum(
        payload.spectral_data
    )

    return result