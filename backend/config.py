import os
from dotenv import load_dotenv

load_dotenv()

class Config:
    MONGO_URI = os.getenv('MONGO_URI', 'mongodb://localhost:27017/')
    DATABASE_NAME = os.getenv('DATABASE_NAME', 'store_db')
    COLLECTION_NAME = os.getenv('COLLECTION_NAME', 'json_data')
    SECRET_KEY = os.getenv('SECRET_KEY', 'nenewenewuewewuuewqwoqook')