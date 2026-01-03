"""Exception handling implementations.

Concrete implementations of exception handling components.
"""
from .impl_classifier import ExceptionClassifier, exception_classifier
from .impl_recorder import ExceptionRecorder, exception_recorder, file_path_to_module
from .impl_monitor import ExceptionMonitor, exception_monitor
from .impl_layer_rule import LayerRule, layer_rule
from .impl_custom_exception import (
    ValidationError,
    AuthenticationError,
    AuthorizationError,
    NotFoundError,
    ConflictError,
    RateLimitError,
    DatabaseError,
    ExternalServiceError,
    InternalError,
    EXCEPTION_TYPE_MAP,
    create_exception_from_type,
    set_layer_rule,
    get_layer_rule,
)

# Re-export AbstractCustomException from abstracts layer
from .._02_abstracts import AbstractCustomException

__all__ = [
    # Classifier
    "ExceptionClassifier",
    "exception_classifier",
    # Recorder
    "ExceptionRecorder",
    "exception_recorder",
    "file_path_to_module",
    # Monitor
    "ExceptionMonitor",
    "exception_monitor",
    # Layer Rule
    "LayerRule",
    "layer_rule",
    # Custom Exceptions (base class)
    "AbstractCustomException",
    # Custom Exceptions
    "ValidationError",
    "AuthenticationError",
    "AuthorizationError",
    "NotFoundError",
    "ConflictError",
    "RateLimitError",
    "DatabaseError",
    "ExternalServiceError",
    "InternalError",
    "EXCEPTION_TYPE_MAP",
    "create_exception_from_type",
    "set_layer_rule",
    "get_layer_rule",
]
