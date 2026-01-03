"""Exception enumeration contracts."""
from enum import Enum


class EExceptionLevel(str, Enum):
    """异常级别枚举"""
    CRITICAL = "CRITICAL"
    ERROR = "ERROR"
    WARNING = "WARNING"
    INFO = "INFO"


class EExceptionSource(str, Enum):
    """异常来源枚举"""
    BACKEND = "backend"
    FRONTEND = "frontend"


class EExceptionLayer(str, Enum):
    """异常发生的层级"""
    EXCEPTION = "Exception"
    DATABASE = "Database"
    AUTH = "Auth"
    API = "API"
    SERVICE = "Service"
    ROUTER = "Router"
