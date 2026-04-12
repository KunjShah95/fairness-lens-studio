from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
import logging

logger = logging.getLogger(__name__)

security = HTTPBearer()

async def get_current_user(token=Depends(security)):
    """
    Stub for Firebase Auth verification.
    TODO: Implement actual Firebase ID token verification
    """
    # For now, return a mock user
    return {
        "uid": "default_user",
        "email": "test@equitylens.dev",
        "role": "analyst"
    }

def require_role(allowed_roles: list):
    """Dependency to verify user has required role."""
    async def checker(user=Depends(get_current_user)):
        role = user.get("role", "public")
        if role not in allowed_roles:
            raise HTTPException(status_code=403, detail="Insufficient permissions")
        return user
    return checker
