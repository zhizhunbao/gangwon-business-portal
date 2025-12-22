"""
Data validation utilities.

Common validation functions for business rules, formats, and data integrity
across all modules.
"""
import re
from typing import Optional


def validate_business_number(business_number: str) -> bool:
    """
    Validate Korean business registration number format.
    
    Args:
        business_number: Business registration number string
        
    Returns:
        True if valid format, False otherwise
    """
    if not business_number:
        return False
    
    # Remove any hyphens or spaces
    clean_number = re.sub(r'[-\s]', '', business_number)
    
    # Check if it's 10 digits
    if not re.match(r'^\d{10}$', clean_number):
        return False
    
    # Additional checksum validation could be added here
    return True


def validate_email_format(email: str) -> bool:
    """
    Validate email format.
    
    Args:
        email: Email address string
        
    Returns:
        True if valid format, False otherwise
    """
    if not email:
        return False
    
    email_pattern = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return bool(re.match(email_pattern, email))


def validate_phone_number(phone: str) -> bool:
    """
    Validate Korean phone number format.
    
    Args:
        phone: Phone number string
        
    Returns:
        True if valid format, False otherwise
    """
    if not phone:
        return False
    
    # Remove any hyphens, spaces, or parentheses
    clean_phone = re.sub(r'[-\s()]', '', phone)
    
    # Check Korean phone number patterns
    patterns = [
        r'^010\d{8}$',      # Mobile: 010-XXXX-XXXX
        r'^02\d{7,8}$',     # Seoul: 02-XXX-XXXX or 02-XXXX-XXXX
        r'^0[3-6]\d{1}\d{7,8}$',  # Other cities: 0XX-XXX-XXXX or 0XX-XXXX-XXXX
        r'^070\d{8}$',      # VoIP: 070-XXXX-XXXX
        r'^080\d{7}$',      # Toll-free: 080-XXX-XXXX
    ]
    
    return any(re.match(pattern, clean_phone) for pattern in patterns)


def validate_uuid_format(uuid_str: str) -> bool:
    """
    Validate UUID format.
    
    Args:
        uuid_str: UUID string
        
    Returns:
        True if valid UUID format, False otherwise
    """
    if not uuid_str:
        return False
    
    uuid_pattern = r'^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$'
    return bool(re.match(uuid_pattern, uuid_str.lower()))


def validate_year_range(year: int, min_year: int = 2000, max_year: int = 2100) -> bool:
    """
    Validate year is within reasonable range.
    
    Args:
        year: Year to validate
        min_year: Minimum allowed year
        max_year: Maximum allowed year
        
    Returns:
        True if year is in valid range, False otherwise
    """
    return min_year <= year <= max_year


def validate_quarter(quarter: int) -> bool:
    """
    Validate quarter is between 1-4.
    
    Args:
        quarter: Quarter to validate
        
    Returns:
        True if valid quarter, False otherwise
    """
    return 1 <= quarter <= 4


def validate_status_value(status: str, allowed_statuses: list[str]) -> bool:
    """
    Validate status value against allowed list.
    
    Args:
        status: Status value to validate
        allowed_statuses: List of allowed status values
        
    Returns:
        True if status is allowed, False otherwise
    """
    return status in allowed_statuses


def validate_file_size(file_size: int, max_size_mb: int = 10) -> bool:
    """
    Validate file size is within limits.
    
    Args:
        file_size: File size in bytes
        max_size_mb: Maximum allowed size in MB
        
    Returns:
        True if file size is acceptable, False otherwise
    """
    max_size_bytes = max_size_mb * 1024 * 1024
    return 0 < file_size <= max_size_bytes


def validate_url_format(url: str) -> bool:
    """
    Validate URL format.
    
    Args:
        url: URL string to validate
        
    Returns:
        True if valid URL format, False otherwise
    """
    if not url:
        return False
    
    url_pattern = r'^https?:\/\/(?:[-\w.])+(?:\:[0-9]+)?(?:\/(?:[\w\/_.])*(?:\?(?:[\w&=%.])*)?(?:\#(?:[\w.])*)?)?$'
    return bool(re.match(url_pattern, url))