"""
Data formatting utilities.

Common functions for formatting dates, times, status values, and other data
for display purposes across all modules.
"""
from datetime import datetime, date
from typing import Union, Optional


def parse_datetime(dt_input: Union[str, datetime]) -> datetime:
    """
    Parse datetime string to datetime object.
    
    Args:
        dt_input: Datetime string or datetime object
        
    Returns:
        Parsed datetime object
        
    Raises:
        ValueError: If datetime string is invalid
    """
    if isinstance(dt_input, str):
        return datetime.fromisoformat(dt_input.replace('Z', '+00:00'))
    return dt_input


def parse_date(date_input: Union[str, date, datetime]) -> date:
    """
    Parse date string to date object.
    
    Args:
        date_input: Date string, date object, or datetime object
        
    Returns:
        Parsed date object
        
    Raises:
        ValueError: If date string is invalid
    """
    if isinstance(date_input, str):
        dt = datetime.fromisoformat(date_input.replace('Z', '+00:00'))
        return dt.date()
    elif isinstance(date_input, datetime):
        return date_input.date()
    return date_input


def format_datetime_display(dt_input: Union[str, datetime, None]) -> str:
    """
    Format datetime for display in Korean format.
    
    Args:
        dt_input: Datetime string, datetime object, or None
        
    Returns:
        Formatted datetime string (YYYY-MM-DD HH:MM) or empty string if None
    """
    if dt_input is None:
        return ""
    dt = parse_datetime(dt_input)
    return dt.strftime('%Y-%m-%d %H:%M')


def format_date_display(date_input: Union[str, date, datetime, None]) -> str:
    """
    Format date for display in Korean format.
    
    Args:
        date_input: Date string, date object, datetime object, or None
        
    Returns:
        Formatted date string (YYYY.MM.DD) or empty string if None
    """
    if date_input is None:
        return ""
    dt = parse_date(date_input)
    return dt.strftime('%Y.%m.%d')


def format_date_range_display(start_date: Union[str, date, datetime], 
                            end_date: Union[str, date, datetime]) -> str:
    """
    Format date range for display.
    
    Args:
        start_date: Start date
        end_date: End date
        
    Returns:
        Formatted date range string
    """
    start_dt = parse_date(start_date)
    end_dt = parse_date(end_date)
    
    return f"{start_dt.strftime('%Y.%m.%d')} ~ {end_dt.strftime('%Y.%m.%d')}"


def format_period_display(year: int, quarter: Optional[int]) -> str:
    """
    Format year and quarter for display.
    
    Args:
        year: Year
        quarter: Quarter (1-4) or None for annual records
        
    Returns:
        Formatted period string
    """
    if quarter is None:
        return f"{year}년 연간"
    return f"{year}년 {quarter}분기"


# Status formatters

def format_status_display(status: str, status_type: str = "project") -> str:
    """
    Generic status formatter with type-specific mappings.
    
    Args:
        status: Status value
        status_type: Type of status (project, member, performance, etc.)
        
    Returns:
        Formatted status display string
        
    Raises:
        KeyError: If status not found in mapping
    """
    status_maps = {
        "project": {
            "active": "진행중",
            "inactive": "비활성",
            "archived": "보관됨",
            "draft": "초안",
        },
        "member": {
            "pending": "승인 대기",
            "active": "활성",
            "inactive": "비활성", 
            "suspended": "정지됨",
        },
        "performance": {
            "draft": "초안",
            "submitted": "제출됨",
            "under_review": "검토중",
            "revision_requested": "수정요청",
            "approved": "승인됨",
            "rejected": "거부됨",
        },
        "application": {
            "submitted": "제출됨",
            "under_review": "검토중",
            "approved": "승인됨",
            "rejected": "거부됨",
        }
    }
    
    status_map = status_maps.get(status_type, {})
    return status_map[status]  # Let it fail if status not found


def format_approval_status_display(status: str) -> str:
    """
    Format approval status for display.
    
    Args:
        status: Approval status value
        
    Returns:
        Formatted approval status display string
    """
    status_map = {
        "pending": "승인 대기",
        "approved": "승인됨", 
        "rejected": "거부됨",
    }
    return status_map.get(status, status)  # Return original if not found


def format_member_status_display(status: str) -> str:
    """
    Format member status for display.
    
    Args:
        status: Member status value
        
    Returns:
        Formatted member status display string
    """
    return format_status_display(status, "member")


def format_performance_status_display(status: str) -> str:
    """
    Format performance status for display.
    
    Args:
        status: Performance status value
        
    Returns:
        Formatted performance status display string
    """
    return format_status_display(status, "performance")


def format_performance_type_display(type_str: str) -> str:
    """
    Format performance type for display.
    
    Args:
        type_str: Performance type value
        
    Returns:
        Formatted performance type display string
    """
    type_map = {
        "sales": "매출실적",
        "support": "지원실적",
        "ip": "지식재산",
    }
    return type_map[type_str]


def format_board_type_display(board_type: str) -> str:
    """
    Format board type for display.
    
    Args:
        board_type: Board type value
        
    Returns:
        Formatted board type display string
    """
    type_map = {
        "notice": "공지사항",
        "announcement": "안내사항", 
        "news": "뉴스",
    }
    return type_map[board_type]


# Quantity formatters

def format_count_display(count: int, unit: str = "건") -> str:
    """
    Format count with Korean unit.
    
    Args:
        count: Count value
        unit: Unit string (default: "건")
        
    Returns:
        Formatted count string
    """
    return f"{count}{unit}"


def format_view_count_display(count: int) -> str:
    """
    Format view count for display.
    
    Args:
        count: View count
        
    Returns:
        Formatted view count string
    """
    return f"{count}회"