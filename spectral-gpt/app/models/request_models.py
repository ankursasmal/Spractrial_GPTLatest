from pydantic import BaseModel
from typing import List

# =========================================================
# SPECTRAL MATCH REQUEST
# =========================================================

class SpectralMatchRequest(BaseModel):

    spectral_data: List[List[float]]

# =========================================================
# CHAT REQUEST
# =========================================================

class ChatRequest(BaseModel):

    question: str