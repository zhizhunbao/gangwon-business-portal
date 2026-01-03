"""Layer rule interface.

Defines the contract for exception layer rule checking.
"""
from abc import ABC, abstractmethod
from typing import Set, List


class ILayerRule(ABC):
    """Interface for layer rule checking."""
    
    @abstractmethod
    def get_allowed_exceptions(self, filepath: str) -> Set[str]:
        """
        Get allowed exception types for a given file path.
        
        Args:
            filepath: The file path to check
            
        Returns:
            Set of allowed exception class names
        """
        pass
    
    @abstractmethod
    def check_exception_usage(
        self, 
        exception_class_name: str, 
        skip_frames: int = 3
    ) -> None:
        """
        Check if the exception is allowed to be raised from the current location.
        
        Args:
            exception_class_name: Name of the exception class being raised
            skip_frames: Number of stack frames to skip to get to the actual caller
        """
        pass
    
    @abstractmethod
    def validate_rules(self) -> List[str]:
        """
        Validate that layer rules are consistent.
        
        Returns:
            List of validation error messages (empty if valid)
        """
        pass
