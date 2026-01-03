"""Exception handling service layer.

Provides unified interface for exception handling operations.
"""
from .service_exception import ExceptionService, exception_service

__all__ = [
    "ExceptionService",
    "exception_service",
]
