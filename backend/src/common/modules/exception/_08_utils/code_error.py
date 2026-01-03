"""Business error codes.

Centralized repository for business error codes with default messages.
Organized by business module for better maintainability.

Code Ranges:
- 1xxx: Authentication (user module)
- 2xxx: Account Status (user module)
- 3xxx: Authorization (user module)
- 4xxx: Validation (common)
- 5xxx: Resource Not Found (common)
- 6xxx: System (common)
- 10xxx: User Module
- 11xxx: Member Module
- 12xxx: Project Module
- 13xxx: Upload Module
- 14xxx: Content Module
- 15xxx: Messages Module
- 16xxx: Performance Module
- 17xxx: Support Module
- 18xxx: Dashboard Module
"""
from enum import Enum
from typing import NamedTuple


class ErrorInfo(NamedTuple):
    """Error code info with code and default message."""
    code: int
    message: str


class ErrorCode(Enum):
    """
    Centralized repository for business error codes.
    Uses numeric ranges for easier categorization.
    """

    # ============================================================
    # COMMON ERRORS (1000 - 6999)
    # ============================================================

    # --- 1000 - 1999: Authentication ---
    INVALID_CREDENTIALS = ErrorInfo(1001, "Invalid username or password")
    INVALID_ADMIN_CREDENTIALS = ErrorInfo(1002, "Invalid admin credentials")
    TOKEN_EXPIRED = ErrorInfo(1003, "Token has expired, please login again")
    INVALID_TOKEN = ErrorInfo(1004, "Invalid access token")
    INVALID_TOKEN_PAYLOAD = ErrorInfo(1005, "Invalid token payload")
    CREDENTIALS_VALIDATION_FAILED = ErrorInfo(1006, "Could not validate credentials")
    NOT_AUTHENTICATED = ErrorInfo(1007, "Not authenticated")
    INVALID_USER_ID_FORMAT = ErrorInfo(1008, "Invalid user ID format")
    INACTIVE_USER = ErrorInfo(1009, "Inactive user")

    # --- 2000 - 2999: Account Status ---
    ACCOUNT_PENDING_APPROVAL = ErrorInfo(2001, "Account is pending approval")
    ACCOUNT_SUSPENDED = ErrorInfo(2002, "Account has been suspended")
    ACCOUNT_DELETED = ErrorInfo(2003, "Account has been deleted")
    CURRENT_PASSWORD_INCORRECT = ErrorInfo(2004, "Current password is incorrect")
    RESET_TOKEN_INVALID = ErrorInfo(2005, "Invalid reset token")
    RESET_TOKEN_EXPIRED = ErrorInfo(2006, "Reset token has expired")

    # --- 3000 - 3999: Authorization ---
    ADMIN_REQUIRED = ErrorInfo(3001, "Admin permission required")
    MEMBER_REQUIRED = ErrorInfo(3002, "Member permission required")
    OWNERSHIP_REQUIRED = ErrorInfo(3003, "Resource ownership required")
    PERMISSION_DENIED = ErrorInfo(3004, "You don't have permission to access this resource")
    DELETE_PERMISSION_DENIED = ErrorInfo(3005, "You don't have permission to delete this resource")

    # --- 4000 - 4999: Validation (Common) ---
    VALIDATION_FAILED = ErrorInfo(4001, "Validation failed")
    DUPLICATE_RESOURCE = ErrorInfo(4002, "Resource already exists")
    INVALID_EMAIL_FORMAT = ErrorInfo(4003, "Invalid email format")
    RECORD_CREATE_FAILED = ErrorInfo(4004, "Failed to create record")
    RECORD_UPDATE_FAILED = ErrorInfo(4005, "Failed to update record")
    RECORD_DELETE_FAILED = ErrorInfo(4006, "Failed to delete record")

    # --- 5000 - 5999: Resource Not Found (Common) ---
    RESOURCE_NOT_FOUND = ErrorInfo(5001, "Resource not found")

    # --- 6000 - 6999: System ---
    SYSTEM_ERROR = ErrorInfo(6001, "System error")
    DATABASE_ERROR = ErrorInfo(6002, "Database operation failed")
    EXTERNAL_SERVICE_ERROR = ErrorInfo(6003, "External service call failed")

    # ============================================================
    # USER MODULE (10000 - 10999)
    # ============================================================
    USER_NOT_FOUND = ErrorInfo(10001, "User not found")
    USER_ALREADY_EXISTS = ErrorInfo(10002, "User already exists")
    BUSINESS_NUMBER_ALREADY_REGISTERED = ErrorInfo(10003, "Business number already registered")
    EMAIL_ALREADY_REGISTERED = ErrorInfo(10004, "Email already registered")

    # ============================================================
    # MEMBER MODULE (11000 - 11999)
    # ============================================================
    MEMBER_NOT_FOUND = ErrorInfo(11001, "Member not found")
    MEMBER_EMAIL_NOT_FOUND = ErrorInfo(11002, "Member with matching email not found")
    MEMBER_ALREADY_EXISTS = ErrorInfo(11003, "Member already exists")
    MEMBER_PROFILE_INCOMPLETE = ErrorInfo(11004, "Member profile is incomplete")

    # ============================================================
    # PROJECT MODULE (12000 - 12999)
    # ============================================================
    PROJECT_NOT_FOUND = ErrorInfo(12001, "Project not found")
    PROJECT_ALREADY_APPLIED = ErrorInfo(12002, "Project has already been applied")
    APPLICATION_NOT_FOUND = ErrorInfo(12003, "Application not found")
    PROJECT_CLOSED = ErrorInfo(12004, "Project is closed for applications")
    PROJECT_DEADLINE_PASSED = ErrorInfo(12005, "Project application deadline has passed")

    # ============================================================
    # UPLOAD MODULE (13000 - 13999)
    # ============================================================
    FILE_NOT_FOUND = ErrorInfo(13001, "File not found")
    FILE_DELETED = ErrorInfo(13002, "File does not exist or has been deleted")
    FILE_SIZE_EXCEEDED = ErrorInfo(13003, "File size exceeds maximum allowed size")
    FILE_EXTENSION_NOT_ALLOWED = ErrorInfo(13004, "File extension is not allowed")
    FILE_TYPE_NOT_ALLOWED = ErrorInfo(13005, "File type is not allowed")
    FILE_UPLOAD_FAILED = ErrorInfo(13006, "File upload failed")

    # ============================================================
    # CONTENT MODULE (14000 - 14999)
    # ============================================================
    CONTENT_NOT_FOUND = ErrorInfo(14001, "Content not found")
    BANNER_NOT_FOUND = ErrorInfo(14002, "Banner not found")
    INVALID_CONTENT_TYPE = ErrorInfo(14003, "Invalid content type")

    # ============================================================
    # MESSAGES MODULE (15000 - 15999)
    # ============================================================
    MESSAGE_NOT_FOUND = ErrorInfo(15001, "Message not found")
    MESSAGE_ALREADY_READ = ErrorInfo(15002, "Message has already been read")
    RECIPIENT_NOT_FOUND = ErrorInfo(15003, "Message recipient not found")

    # ============================================================
    # PERFORMANCE MODULE (16000 - 16999)
    # ============================================================
    PERFORMANCE_RECORD_NOT_FOUND = ErrorInfo(16001, "Performance record not found")
    INVALID_PERFORMANCE_DATA = ErrorInfo(16002, "Invalid performance data")

    # ============================================================
    # SUPPORT MODULE (17000 - 17999)
    # ============================================================
    FAQ_NOT_FOUND = ErrorInfo(17001, "FAQ not found")
    INQUIRY_NOT_FOUND = ErrorInfo(17002, "Inquiry not found")

    # ============================================================
    # DASHBOARD MODULE (18000 - 18999)
    # ============================================================
    DASHBOARD_DATA_UNAVAILABLE = ErrorInfo(18001, "Dashboard data is unavailable")

    # ============================================================
    # ADMIN MODULE (19000 - 19999)
    # ============================================================
    ADMIN_NOT_FOUND = ErrorInfo(19001, "Admin not found")
    ADMIN_ALREADY_EXISTS = ErrorInfo(19002, "Admin already exists")

    @property
    def code(self) -> int:
        return self.value.code

    @property
    def message(self) -> str:
        return self.value.message
