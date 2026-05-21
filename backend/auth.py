import os
import jwt
from datetime import datetime, timedelta
from fastapi import Request, HTTPException
from pydantic import BaseModel

JWT_SECRET = os.getenv("JWT_SECRET", "sovereign-dormitory-secret-key-2026")
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


class LoginRequest(BaseModel):
    password: str


def create_token(data: dict) -> str:
    payload = data.copy()
    payload["exp"] = datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS)
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(request: Request):
    auth_header = request.headers.get("Authorization")
    if not auth_header or not auth_header.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = auth_header.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")
