"""Exception handling contracts (interfaces and data classes).

Defines the ABC interfaces and shared data classes for exception handling.
"""
# Data classes (d_ prefix)
from .d_exception_context import DExceptionContext
from .d_exception_record import DExceptionRecord
from .d_exception_stats import DExceptionStats

# Enum contracts (e_ prefix)
from .e_exception_type import EExceptionType
from .e_exception_const import EExceptionLevel, EExceptionSource, EExceptionLayer

# Constant contracts (c_ prefix)
from .c_exception import (
    CExceptionField,
    CMessageTemplate,
    CFieldFormat,
    CSensitiveField,
)

# Repository interfaces (r_ prefix)
from .r_exception import IExceptionRepository

# Service interfaces (i_ prefix)
from .i_exception import IException
from .i_exception_classifier import IExceptionClassifier
from .i_exception_recorder import IExceptionRecorder
from .i_exception_monitor import IExceptionMonitor
from .i_exception_service import IExceptionService
from .i_layer_rule import ILayerRule

# Exception contracts (exc_ prefix)
from .exc_exception import ICustomException

__all__ = [
    # Data classes
    "DExceptionContext",
    "DExceptionRecord",
    "DExceptionStats",
    # Enum contracts
    "EExceptionType",
    "EExceptionLevel",
    "EExceptionSource",
    "EExceptionLayer",
    # Constant contracts
    "CExceptionField",
    "CMessageTemplate",
    "CFieldFormat",
    "CSensitiveField",
    # Repository interfaces
    "IExceptionRepository",
    # Service interfaces
    "IException",
    "IExceptionClassifier",
    "IExceptionRecorder",
    "IExceptionMonitor",
    "IExceptionService",
    "ILayerRule",
    # Exception contracts
    "ICustomException",
]
