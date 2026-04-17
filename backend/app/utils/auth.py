from fastapi import HTTPException, Depends
from fastapi.security import HTTPBearer
import logging
import json

logger = logging.getLogger(__name__)

security = HTTPBearer()

_firebase_initialized = False
_firebase_app = None


def _init_firebase():
    """Initialize Firebase Admin SDK."""
    global _firebase_initialized, _firebase_app
    if _firebase_initialized:
        return True

    from app.config import settings

    if not settings.firebase_config_json:
        logger.warning("Firebase config not set, using dev mode")
        return False

    try:
        import firebase_admin
        from firebase_admin import credentials

        # Handle JSON string or file path
        if settings.firebase_config_json.startswith("{"):
            cred_dict = json.loads(settings.firebase_config_json)
            cred = credentials.Certificate(cred_dict)
        else:
            cred = credentials.Certificate(settings.firebase_config_json)

        _firebase_app = firebase_admin.initialize_app(cred)
        _firebase_initialized = True
        logger.info("Firebase Admin SDK initialized successfully")
        return True

    except Exception as e:
        logger.error(f"Firebase initialization failed: {e}")
        _firebase_initialized = False
        return False


async def get_current_user(token=Depends(security)):
    """
    Verify Firebase ID token and extract user info.

    Falls back to dev mode if Firebase is not configured.
    """
    from app.config import settings

    # Initialize Firebase if not done
    if not _firebase_initialized:
        _init_firebase()

    # Dev mode fallback
    if not _firebase_initialized:
        if settings.environment == "development":
            logger.info("Using dev mode user (Firebase not configured)")
            return {"uid": "dev_user", "email": "dev@equitylens.local", "role": "admin"}
        else:
            raise HTTPException(
                status_code=503, detail="Authentication service unavailable"
            )

    try:
        from firebase_admin import auth

        # Verify the token
        decoded_token = auth.verify_id_token(token.credentials)

        return {
            "uid": decoded_token.get("uid"),
            "email": decoded_token.get("email"),
            "email_verified": decoded_token.get("email_verified", False),
            "name": decoded_token.get("name"),
            "role": decoded_token.get("role", "analyst"),  # Custom claim
            "claims": decoded_token,
        }

    except Exception as e:
        logger.error(f"Token verification failed: {e}")
        raise HTTPException(
            status_code=401, detail=f"Invalid authentication token: {str(e)}"
        )


def require_role(allowed_roles: list):
    """
    Dependency to verify user has required role.

    Usage:
        @router.get("/admin")
        async def admin_endpoint(user=Depends(require_role(["admin"]))):
            ...
    """

    async def checker(user=Depends(get_current_user)):
        user_role = user.get("role", "public")
        if user_role not in allowed_roles:
            logger.warning(
                f"User {user.get('uid')} denied: role {user_role} not in {allowed_roles}"
            )
            raise HTTPException(
                status_code=403,
                detail=f"Access denied. Required roles: {allowed_roles}",
            )
        return user

    return checker


async def get_optional_user(token=Depends(HTTPBearer(auto_error=False))):
    """
    Get user if token provided, otherwise return None.
    Useful for endpoints that work with or without auth.
    """
    if token is None:
        return None

    try:
        return await get_current_user(token)
    except HTTPException:
        return None
