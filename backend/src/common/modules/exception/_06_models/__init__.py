"""Exception handling model layer.

Contains database ORM models and Repository implementations.

Note: Exception records are stored via the unified logging system.
The ErrorLog model in common/modules/db/models.py is used for persistence.
This layer delegates to the logger module rather than defining its own models.

See: common/modules/db/models.py -> ErrorLog
See: common/modules/logger/service.py -> logging_service.error()
"""

__all__ = []
