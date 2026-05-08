from pydantic import BaseModel
from typing import List

# =========================================================
# MATCH ITEM
# =========================================================

class MatchItem(BaseModel):

    material: str | None = None

    class_name: str | None = None

    subclass: str | None = None

    accuracy: float

# =========================================================
# MATCH RESPONSE
# =========================================================

class MatchResponse(BaseModel):

    matches: List[MatchItem]

    ai_explanation: str

# =========================================================
# CHAT RESPONSE
# =========================================================

class ChatResponse(BaseModel):

    response: str