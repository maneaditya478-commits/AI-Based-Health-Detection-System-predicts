"""
Authentication module — JWT-based login/signup with role-based access.

Roles: 'doctor', 'patient'
Default credentials (seeded automatically):
  - Doctor: doctor / doctor123
  - Patient: patient / patient123
"""

from __future__ import annotations

import os
from datetime import datetime, timedelta
from typing import Optional

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

# Using simple hashlib for password hashing instead of bcrypt (avoids C compiler dependency)
import hashlib
import hmac
import secrets
import json
import base64

# --- Password Hashing (using PBKDF2 — no C dependencies needed) ---

SALT_LENGTH = 16

def hash_password(password: str) -> str:
    """Hash a password using PBKDF2-SHA256."""
    salt = secrets.token_hex(SALT_LENGTH)
    dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
    return f"{salt}${dk.hex()}"


def verify_password(password: str, hashed: str) -> bool:
    """Verify a password against its hash."""
    try:
        salt, stored_hash = hashed.split("$", 1)
        dk = hashlib.pbkdf2_hmac('sha256', password.encode(), salt.encode(), 100000)
        return hmac.compare_digest(dk.hex(), stored_hash)
    except Exception:
        return False


# --- JWT Token Handling (simple implementation — no jose dependency) ---

JWT_SECRET = os.environ.get("JWT_SECRET", "change-me-in-production")
JWT_ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = 24


def _base64url_encode(data: bytes) -> str:
    return base64.urlsafe_b64encode(data).rstrip(b'=').decode()


def _base64url_decode(s: str) -> bytes:
    padding = 4 - len(s) % 4
    if padding != 4:
        s += '=' * padding
    return base64.urlsafe_b64decode(s)


def create_token(data: dict) -> str:
    """Create a simple JWT token."""
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {
        **data,
        "exp": (datetime.utcnow() + timedelta(hours=JWT_EXPIRE_HOURS)).isoformat()
    }

    header_b64 = _base64url_encode(json.dumps(header).encode())
    payload_b64 = _base64url_encode(json.dumps(payload).encode())

    message = f"{header_b64}.{payload_b64}"
    signature = hmac.new(JWT_SECRET.encode(), message.encode(), hashlib.sha256).digest()
    sig_b64 = _base64url_encode(signature)

    return f"{header_b64}.{payload_b64}.{sig_b64}"


def decode_token(token: str) -> Optional[dict]:
    """Decode and verify a JWT token."""
    try:
        parts = token.split(".")
        if len(parts) != 3:
            return None

        header_b64, payload_b64, sig_b64 = parts
        
        # Verify signature
        message = f"{header_b64}.{payload_b64}"
        expected_sig = hmac.new(JWT_SECRET.encode(), message.encode(), hashlib.sha256).digest()
        actual_sig = _base64url_decode(sig_b64)

        if not hmac.compare_digest(expected_sig, actual_sig):
            return None

        # Decode payload
        payload = json.loads(_base64url_decode(payload_b64))

        # Check expiration
        if "exp" in payload:
            exp = datetime.fromisoformat(payload["exp"])
            if datetime.utcnow() > exp:
                return None

        return payload
    except Exception:
        return None


# --- FastAPI Security Dependency ---

security = HTTPBearer(auto_error=False)


async def get_current_user(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    """Extract current user from JWT Bearer token. Returns None if no token provided."""
    if credentials is None:
        return None
    
    token = credentials.credentials
    payload = decode_token(token)
    
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token"
        )

    return payload


async def require_doctor(credentials: HTTPAuthorizationCredentials = Depends(security)):
    """Require a doctor role for the endpoint."""
    if credentials is None:
        raise HTTPException(status_code=401, detail="Authentication required")
    
    payload = decode_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=401, detail="Invalid or expired token")
    if payload.get("role") != "doctor":
        raise HTTPException(status_code=403, detail="Doctor access required")
    
    return payload
