"""Exception type enumeration contract."""
from enum import Enum


class EExceptionType(Enum):
    """Enumeration of all exception types in the system."""
    
    # Frontend Exception Types
    NETWORK_ERROR = "NetworkError"
    API_ERROR = "ApiError"
    VALIDATION_ERROR = "ValidationError"
    AUTH_ERROR = "AuthError"
    RENDER_ERROR = "RenderError"
    RUNTIME_ERROR = "RuntimeError"
    
    # Backend Exception Types
    AUTHENTICATION_ERROR = "AuthenticationError"
    AUTHORIZATION_ERROR = "AuthorizationError"
    NOT_FOUND_ERROR = "NotFoundError"
    CONFLICT_ERROR = "ConflictError"
    RATE_LIMIT_ERROR = "RateLimitError"
    DATABASE_ERROR = "DatabaseError"
    EXTERNAL_SERVICE_ERROR = "ExternalServiceError"
    INTERNAL_ERROR = "InternalError"
