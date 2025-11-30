"""
Audit log module.

This module provides audit logging functionality for compliance and security tracking.
It records all critical operations (login, CRUD, approvals, file operations, admin actions)
for government compliance requirements (7-year retention period).

Usage:
    from ...common.modules.audit import audit_log_service, create_audit_log
    
    # Create audit log
    await audit_log_service.create_audit_log(
        db=db,
        action="login",
        user_id=user.id,
        ip_address=request.client.host,
        user_agent=request.headers.get("user-agent"),
    )
"""

from .service import AuditLogService
from .decorator import audit_log, get_client_info

# Create service instance
audit_log_service = AuditLogService()

__all__ = [
    "AuditLogService",
    "audit_log_service",
    "audit_log",
    "get_client_info",
]























