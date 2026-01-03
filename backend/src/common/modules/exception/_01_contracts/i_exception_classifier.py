"""Exception classifier interface.

Defines the contract for exception classification.
"""
from abc import ABC, abstractmethod

from .i_exception import IException


class IExceptionClassifier(ABC):
    """Interface for exception classification."""
    
    @abstractmethod
    def classify(self, exception: Exception) -> IException:
        """Classify an exception into the appropriate custom exception type."""
        pass
