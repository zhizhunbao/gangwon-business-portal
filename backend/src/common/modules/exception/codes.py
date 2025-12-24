from enum import Enum


class ErrorCode(int, Enum):
    """
    Centralized repository for business error codes.
    Uses numeric ranges for easier categorization.
    """

    # --- 1000 - 1999: Authentication ---
    INVALID_CREDENTIALS = 1001
    INVALID_ADMIN_CREDENTIALS = 1002
    TOKEN_EXPIRED = 1003
    INVALID_TOKEN = 1004

    # --- 2000 - 2999: Account Status ---
    ACCOUNT_PENDING_APPROVAL = 2001
    ACCOUNT_SUSPENDED = 2002
    ACCOUNT_DELETED = 2003

    # --- 3000 - 3999: Authorization ---
    ADMIN_REQUIRED = 3001
    MEMBER_REQUIRED = 3002
    OWNERSHIP_REQUIRED = 3003

    # --- 4000 - 4999: Validation ---
    VALIDATION_FAILED = 4001
    DUPLICATE_RESOURCE = 4002

    # --- 5000 - 5999: System ---
    SYSTEM_ERROR = 5001
    DATABASE_ERROR = 5002
    EXTERNAL_SERVICE_ERROR = 5003
