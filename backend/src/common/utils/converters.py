"""
Data conversion utilities.

Common functions for converting between different data formats,
sanitizing data, and transforming structures.
"""
from typing import Any, Dict, List, Optional, Type, TypeVar
from pydantic import BaseModel
from datetime import datetime, date


T = TypeVar('T', bound=BaseModel)


def dict_to_model(data: Dict[str, Any], model_class: Type[T]) -> T:
    """
    Convert dictionary to Pydantic model instance.
    
    Args:
        data: Dictionary data
        model_class: Pydantic model class
        
    Returns:
        Model instance
    """
    return model_class.model_validate(data)


def model_to_dict(model: BaseModel, exclude_none: bool = True) -> Dict[str, Any]:
    """
    Convert Pydantic model to dictionary.
    
    Args:
        model: Pydantic model instance
        exclude_none: Whether to exclude None values
        
    Returns:
        Dictionary representation
    """
    return model.model_dump(exclude_none=exclude_none)


def sanitize_dict(data: Dict[str, Any], 
                 remove_keys: Optional[List[str]] = None,
                 keep_keys: Optional[List[str]] = None) -> Dict[str, Any]:
    """
    Sanitize dictionary by removing or keeping specific keys.
    
    Args:
        data: Dictionary to sanitize
        remove_keys: Keys to remove from dictionary
        keep_keys: Keys to keep (all others removed)
        
    Returns:
        Sanitized dictionary
    """
    if keep_keys is not None:
        return {k: v for k, v in data.items() if k in keep_keys}
    
    if remove_keys is not None:
        return {k: v for k, v in data.items() if k not in remove_keys}
    
    return data.copy()


def flatten_dict(data: Dict[str, Any], separator: str = '.') -> Dict[str, Any]:
    """
    Flatten nested dictionary.
    
    Args:
        data: Dictionary to flatten
        separator: Separator for nested keys
        
    Returns:
        Flattened dictionary
    """
    def _flatten(obj: Any, parent_key: str = '') -> Dict[str, Any]:
        items = []
        
        if isinstance(obj, dict):
            for key, value in obj.items():
                new_key = f"{parent_key}{separator}{key}" if parent_key else key
                items.extend(_flatten(value, new_key).items())
        else:
            return {parent_key: obj}
        
        return dict(items)
    
    return _flatten(data)


def normalize_string(text: str) -> str:
    """
    Normalize string by trimming whitespace and converting to lowercase.
    
    Args:
        text: String to normalize
        
    Returns:
        Normalized string
    """
    if not text:
        return ""
    
    return text.strip().lower()


def clean_phone_number(phone: str) -> str:
    """
    Clean phone number by removing formatting characters.
    
    Args:
        phone: Phone number string
        
    Returns:
        Cleaned phone number
    """
    if not phone:
        return ""
    
    import re
    return re.sub(r'[-\s()]', '', phone)


def clean_business_number(business_number: str) -> str:
    """
    Clean business number by removing formatting characters.
    
    Args:
        business_number: Business number string
        
    Returns:
        Cleaned business number
    """
    if not business_number:
        return ""
    
    import re
    return re.sub(r'[-\s]', '', business_number)


def convert_to_serializable(obj: Any) -> Any:
    """
    Convert object to JSON serializable format.
    
    Args:
        obj: Object to convert
        
    Returns:
        JSON serializable object
    """
    if isinstance(obj, (datetime, date)):
        return obj.isoformat()
    elif isinstance(obj, dict):
        return {key: convert_to_serializable(value) for key, value in obj.items()}
    elif isinstance(obj, list):
        return [convert_to_serializable(item) for item in obj]
    elif hasattr(obj, '__dict__'):
        return convert_to_serializable(obj.__dict__)
    else:
        return obj


def merge_dicts(*dicts: Dict[str, Any]) -> Dict[str, Any]:
    """
    Merge multiple dictionaries, with later ones taking precedence.
    
    Args:
        *dicts: Dictionaries to merge
        
    Returns:
        Merged dictionary
    """
    result = {}
    for d in dicts:
        if d:
            result.update(d)
    return result


def extract_fields(data: Dict[str, Any], fields: List[str]) -> Dict[str, Any]:
    """
    Extract specific fields from dictionary.
    
    Args:
        data: Source dictionary
        fields: List of field names to extract
        
    Returns:
        Dictionary with only specified fields
    """
    return {field: data.get(field) for field in fields if field in data}


def rename_keys(data: Dict[str, Any], key_mapping: Dict[str, str]) -> Dict[str, Any]:
    """
    Rename keys in dictionary according to mapping.
    
    Args:
        data: Dictionary to process
        key_mapping: Mapping of old_key -> new_key
        
    Returns:
        Dictionary with renamed keys
    """
    result = {}
    for key, value in data.items():
        new_key = key_mapping.get(key, key)
        result[new_key] = value
    return result