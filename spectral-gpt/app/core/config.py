import os
from dotenv import load_dotenv

load_dotenv()

# =========================================================
# DATABASE
# =========================================================

MONGO_URI = os.getenv(
    "MONGO_URI",
    "mongodb://localhost:27017"
)

DB_NAME = "spectralGpt"

COLLECTION_NAME = "spectralData"

# =========================================================
# OPENAI
# =========================================================

OPENAI_API_KEY = os.getenv(
    "OPENAI_API_KEY"
)

# =========================================================
# SPECTRAL RANGE
# =========================================================

GLOBAL_MIN = 0.42

GLOBAL_MAX = 14.0