from pymongo import MongoClient

client = MongoClient(
    "mongodb://localhost:27017"
)

db = client["spectralGpt"]

collection = db["spectralData"]