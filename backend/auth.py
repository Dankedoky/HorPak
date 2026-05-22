import os
import jwt
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
from pydantic import BaseModel
from dotenv import load_dotenv

load_dotenv(dotenv_path=os.path.join(os.path.dirname(__file__), ".env"))

JWT_SECRET = os.getenv("JWT_SECRET")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7

APP_ENV = (os.getenv("APP_ENV") or os.getenv("ENV") or "").lower()
IS_PRODUCTION = APP_ENV == "production" or os.getenv("RENDER", "").lower() == "true"

if IS_PRODUCTION:
    if not JWT_SECRET:
        raise RuntimeError("CRITICAL SECURITY CONFIGURATION ERROR: JWT_SECRET environment variable must be set in production mode.")
    if not os.getenv("ADMIN_PASSWORD"):
        raise RuntimeError("CRITICAL SECURITY CONFIGURATION ERROR: ADMIN_PASSWORD environment variable must be set in production mode.")



class LoginRequest(BaseModel):
    password: str


def create_token(data: dict) -> str:
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET is not configured on the server")
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(request: Request):
    if not JWT_SECRET:
        raise HTTPException(status_code=500, detail="JWT_SECRET is not configured on the server")
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    
    parts = auth_header.split(" ")
    if len(parts) < 2 or not parts[1].strip():
        raise HTTPException(status_code=401, detail="Not authenticated")
        
    token = parts[1].strip()
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

