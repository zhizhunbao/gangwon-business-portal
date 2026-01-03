"""Layer rule implementation.

Implements exception layer rule checking based on file paths.
"""
import os
import inspect
import warnings
from typing import Dict, Set, List

from .._02_abstracts.abstract_layer_rule import AbstractLayerRule


class LayerRule(AbstractLayerRule):
    """
    Implementation of AbstractLayerRule.
    
    Validates that exceptions are only raised from allowed locations
    based on architectural boundaries.
    """
    
    ALL_EXCEPTIONS: Set[str] = {
        "ValidationError",
        "AuthenticationError",
        "AuthorizationError",
        "NotFoundError",
        "ConflictError",
        "RateLimitError",
        "DatabaseError",
        "ExternalServiceError",
        "InternalError",
    }
    
    INFRA_EXCEPTIONS: Set[str] = {
        "DatabaseError",
        "ExternalServiceError",
        "InternalError",
    }
    
    AUTH_EXCEPTIONS: Set[str] = {
        "AuthenticationError",
        "AuthorizationError",
    }
    
    BUSINESS_EXCEPTIONS: Set[str] = {
        "ValidationError",
        "AuthenticationError",
        "AuthorizationError",
        "NotFoundError",
        "ConflictError",
        "RateLimitError",
    }
    
    def __init__(self):
        """Initialize layer rules."""
        # Enable by default in development environment
        env = os.getenv("ENV", "development")
        default_enable = "true" if env == "development" else "false"
        
        self._enable_check = os.getenv(
            "ENABLE_EXCEPTION_LAYER_CHECK", default_enable
        ).lower() == "true"
        
        self._strict_mode = os.getenv(
            "EXCEPTION_LAYER_STRICT", "false"
        ).lower() == "true"
        
        self._log_violations = True  # Always log violations
        
        self._layer_rules = self._build_layer_rules()
        self._file_rules = self._build_file_rules()
    
    def _build_layer_rules(self) -> Dict[str, Set[str]]:
        """Build layer rules mapping."""
        return {
            "common/modules/audit/service.py": {"DatabaseError"},
            "common/modules/audit/router.py": {"NotFoundError", "DatabaseError"},
            "common/modules/audit/decorator.py": set(),
            "common/modules/audit/schemas.py": set(),
            "common/modules/config/settings.py": {"InternalError"},
            "common/modules/db/session.py": {"DatabaseError"},
            "common/modules/db/models.py": set(),
            "common/modules/email/service.py": {"ExternalServiceError"},
            "common/modules/email/background.py": {"ExternalServiceError"},
            "common/modules/exception": self.ALL_EXCEPTIONS,
            "common/modules/export/exporter.py": {"ValidationError", "InternalError"},
            "common/modules/health/service.py": {"InternalError", "ExternalServiceError"},
            "common/modules/health/adapter.py": {"ExternalServiceError"},
            "common/modules/health/router.py": {"InternalError"},
            "common/modules/health/config.py": set(),
            "common/modules/integrations": {"ExternalServiceError", "ValidationError"},
            "common/modules/interceptor/error.py": self.ALL_EXCEPTIONS,
            "common/modules/interceptor/database.py": {"DatabaseError"},
            "common/modules/interceptor/auth.py": {"AuthenticationError", "AuthorizationError"},
            "common/modules/interceptor/router.py": set(),
            "common/modules/interceptor/config.py": set(),
            "common/modules/interceptor/service.py": self.ALL_EXCEPTIONS,
            "common/modules/logger/service.py": {"InternalError"},
            "common/modules/logger/router.py": {"NotFoundError", "ValidationError"},
            "common/modules/logger/db_writer.py": {"DatabaseError"},
            "common/modules/logger/file_writer.py": {"InternalError"},
            "common/modules/logger/handlers.py": set(),
            "common/modules/logger/filters.py": set(),
            "common/modules/logger/formatter.py": set(),
            "common/modules/logger/config.py": set(),
            "common/modules/logger/interfaces.py": set(),
            "common/modules/logger/schemas.py": set(),
            "common/modules/logger/request.py": set(),
            "common/modules/logger/startup.py": set(),
            "common/modules/logger/base_writer.py": set(),
            "common/modules/storage/service.py": {"ExternalServiceError", "ValidationError"},
            "common/modules/supabase/client.py": {"ExternalServiceError"},
            "common/modules/supabase/service.py": {"DatabaseError", "ExternalServiceError"},
            "common/modules/supabase/message_service.py": {"DatabaseError", "ExternalServiceError"},
            "modules/": self.ALL_EXCEPTIONS,
        }
    
    def _build_file_rules(self) -> Dict[str, Set[str]]:
        """Build file-specific rules for business modules."""
        return {
            "service.py": self.BUSINESS_EXCEPTIONS,
            "router.py": self.BUSINESS_EXCEPTIONS,
            "dependencies.py": self.AUTH_EXCEPTIONS,
            "schemas.py": set(),
            "models.py": set(),
            "config.py": set(),
            "interfaces.py": set(),
            "__init__.py": set(),
        }
    
    def get_allowed_exceptions(self, filepath: str) -> Set[str]:
        """Get allowed exception types for a given file path."""
        filepath = filepath.replace("\\", "/")
        filename = filepath.split("/")[-1]
        
        for pattern, allowed in self._layer_rules.items():
            if pattern in filepath:
                return allowed
        
        if "/modules/" in filepath and "/common/" not in filepath:
            if filename in self._file_rules:
                return self._file_rules[filename]
            return self.BUSINESS_EXCEPTIONS
        
        return self.ALL_EXCEPTIONS
    
    def check_exception_usage(
        self, 
        exception_class_name: str, 
        skip_frames: int = 3
    ) -> None:
        """Check if the exception is allowed from the current location."""
        if not self._enable_check:
            return
        
        frame = inspect.currentframe()
        if frame is None:
            return
        
        try:
            caller = inspect.getouterframes(frame)[skip_frames]
            caller_path = caller.filename
            
            allowed = self.get_allowed_exceptions(caller_path)
            
            if exception_class_name not in allowed:
                allowed_str = ", ".join(sorted(allowed)) if allowed else "none"
                msg = (
                    f"\n[Exception Layer Violation]\n"
                    f"  Exception: {exception_class_name}\n"
                    f"  Location: {caller_path}:{caller.lineno}\n"
                    f"  Allowed: {allowed_str}\n"
                    f"  Consider moving this logic to the service layer."
                )
                
                if self._strict_mode:
                    raise RuntimeError(msg)
                else:
                    warnings.warn(msg, stacklevel=skip_frames + 1)
        finally:
            del frame
    
    def validate_rules(self) -> List[str]:
        """Validate that layer rules are consistent."""
        errors = []
        
        for pattern, allowed in self._layer_rules.items():
            for exc in allowed:
                if exc not in self.ALL_EXCEPTIONS:
                    errors.append(
                        f"Unknown exception '{exc}' in rule for '{pattern}'"
                    )
        
        for filename, allowed in self._file_rules.items():
            for exc in allowed:
                if exc not in self.ALL_EXCEPTIONS:
                    errors.append(
                        f"Unknown exception '{exc}' in file rule for '{filename}'"
                    )
        
        return errors


# Singleton instance
layer_rule = LayerRule()
