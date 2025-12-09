# Design Document - Backend Architecture Standards

## Overview

This design document establishes the architectural patterns, technical standards, and implementation guidelines for the Gangwon Business Portal backend application. The system is built using FastAPI 0.115+, Python 3.11+, SQLAlchemy 2.0+ (async), and follows a modular architecture pattern with clear separation between common infrastructure and business modules.

### Goals

1. **Consistency**: Establish uniform patterns across all backend code
2. **Maintainability**: Create a codebase that is easy to understand and modify
3. **Scalability**: Support growth in features, data volume, and concurrent users
4. **Performance**: Leverage async/await for non-blocking I/O operations
5. **Security**: Implement security best practices throughout the stack
6. **Observability**: Provide comprehensive logging and monitoring

### Scope

This specification covers:
- Project structure and module organization
- Database design and ORM patterns
- API design and routing conventions
- Request/response validation
- Error handling and exception management
- Logging and monitoring systems
- Authentication and authorization
- Service layer architecture
- Dependency injection patterns
- Database migrations
- Async programming standards
- Data export functionality
- File upload and storage
- Email service integration
- Audit logging
- Configuration management
- Testing strategies
- Code quality standards
- Security practices

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Client (Browser/Mobile)              │
└────────────────────┬────────────────────────────────────┘
                     │ HTTPS/REST
         ┌───────────▼───────────┐
         │   FastAPI Application │
         │   (API Gateway)       │
         ├───────────────────────┤
         │   Middleware Layer    │
         │   - CORS              │
         │   - Logging           │
         │   - Exception Handler │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   Router Layer        │
         │   - Auth Router       │
         │   - Member Router     │
         │   - Performance Router│
         │   - Project Router    │
         │   - Content Router    │
         │   - Support Router    │
         └───────────┬───────────┘
                     │
         ┌───────────▼───────────┐
         │   Service Layer       │
         │   - Business Logic    │
         │   - Validation        │
         │   - Orchestration     │
         └───────────┬───────────┘
                     │
    ┌────────────────┼────────────────┐
    │                │                │
┌───▼────┐    ┌──────▼──────┐  ┌─────▼─────┐
│Database│    │   Storage   │  │  External │
│(Postgres)   │ (Supabase)  │  │    APIs   │
└────────┘    └─────────────┘  └───────────┘
```

### Layer Responsibilities

#### 1. API Gateway Layer (FastAPI)

**Responsibilities:**
- Route HTTP requests to appropriate handlers
- Apply middleware (CORS, logging, exception handling)
- Validate request/response data
- Handle authentication and authorization
- Generate API documentation (OpenAPI/Swagger)

#### 2. Router Layer

**Responsibilities:**
- Define API endpoints and HTTP methods
- Extract request data (path params, query params, body)
- Call service layer methods
- Return HTTP responses
- Keep logic minimal (thin controllers)

#### 3. Service Layer

**Responsibilities:**
- Implement business logic
- Orchestrate multiple operations
- Validate business rules
- Handle transactions
- Call repository/data access layer
- Integrate with external services

#### 4. Data Access Layer (SQLAlchemy)

**Responsibilities:**
- Define database models
- Execute database queries
- Manage database sessions
- Handle database transactions
- Implement repository pattern (optional)

#### 5. Common Infrastructure Layer

**Responsibilities:**
- Configuration management
- Logging and monitoring
- Exception handling
- Audit logging
- Email service
- File storage
- Data export
- External API integrations

### Technology Stack

| Category | Technology | Version | Purpose |
|----------|-----------|---------|---------|
| **Framework** | FastAPI | 0.115+ | Web framework |
| | Uvicorn | 0.30+ | ASGI server |
| **Database** | PostgreSQL | - | Primary database |
| | SQLAlchemy | 2.0+ | ORM |
| | asyncpg | 0.29+ | Async PostgreSQL driver |
| | Alembic | 1.13+ | Database migrations |
| **Validation** | Pydantic | 2.5+ | Data validation |
| | pydantic-settings | 2.1+ | Configuration management |
| **Auth** | python-jose | 3.3+ | JWT handling |
| | passlib | 1.7+ | Password hashing |
| **Email** | aiosmtplib | 3.0+ | Async SMTP client |
| | Jinja2 | 3.1+ | Email templates |
| **Export** | openpyxl | 3.1+ | Excel generation |
| **Storage** | supabase | 2.3+ | File storage |
| **Testing** | pytest | 7.4+ | Testing framework |
| | pytest-asyncio | 0.21+ | Async test support |
| | httpx | 0.27+ | HTTP client for testing |

## Components and Interfaces

### Module Architecture

#### Module Structure

Each business module follows this structure:

```
modules/{module_name}/
├── __init__.py
├── router.py          # API endpoints
├── service.py         # Business logic
├── schemas.py         # Pydantic models
├── models.py          # SQLAlchemy models
└── dependencies.py    # Module-specific dependencies (optional)
```

#### Example: Member Module

```python
# modules/member/router.py
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from .service import MemberService
from .schemas import MemberCreate, MemberResponse
from ...common.modules.db.session import get_db

router = APIRouter(prefix="/api/v1/members", tags=["members"])

@router.post("/", response_model=MemberResponse, status_code=201)
async def create_member(
    member_data: MemberCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create a new member."""
    service = MemberService(db)
    member = await service.create_member(member_data)
    return member

# modules/member/service.py
from sqlalchemy.ext.asyncio import AsyncSession
from .models import Member
from .schemas import MemberCreate
from ...common.modules.exception import NotFoundError, ConflictError

class MemberService:
    def __init__(self, db: AsyncSession):
        self.db = db
    
    async def create_member(self, data: MemberCreate) -> Member:
        """Create a new member."""
        # Check if member already exists
        existing = await self.get_by_business_number(data.business_number)
        if existing:
            raise ConflictError("Member with this business number already exists")
        
        # Create member
        member = Member(**data.model_dump())
        self.db.add(member)
        await self.db.commit()
        await self.db.refresh(member)
        
        return member

# modules/member/schemas.py
from pydantic import BaseModel, Field, EmailStr
from datetime import datetime
from typing import Optional

class MemberCreate(BaseModel):
    """Schema for creating a member."""
    business_number: str = Field(..., description="Business registration number")
    company_name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8)

class MemberResponse(BaseModel):
    """Schema for member response."""
    id: str
    business_number: str
    company_name: str
    email: str
    status: str
    created_at: datetime
    
    class Config:
        from_attributes = True

# modules/member/models.py
from sqlalchemy import Column, String, DateTime, Enum
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid
from ...common.modules.db.base import Base

class Member(Base):
    """Member database model."""
    __tablename__ = "members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_number = Column(String(20), unique=True, nullable=False, index=True)
    company_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    password_hash = Column(String(255), nullable=False)
    status = Column(String(20), default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
```

### Database Architecture

#### Database Session Management

```python
# common/modules/db/session.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from ..config import settings

# Create async engine
engine = create_async_engine(
    settings.DATABASE_URL,
    echo=settings.DEBUG,
    pool_size=10,
    max_overflow=20,
)

# Create session factory
AsyncSessionLocal = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Dependency for getting database session
async def get_db() -> AsyncSession:
    """Get database session."""
    async with AsyncSessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()
```

#### Model Base Class

```python
# common/modules/db/base.py
from sqlalchemy.orm import declarative_base

Base = declarative_base()

# Import all models here for Alembic
from ...modules.member.models import Member
from ...modules.performance.models import PerformanceRecord
# ... other models
```

### API Design Patterns

#### RESTful Endpoint Conventions

| Operation | HTTP Method | Endpoint | Description |
|-----------|------------|----------|-------------|
| List | GET | `/api/v1/members` | Get all members (with pagination) |
| Get | GET | `/api/v1/members/{id}` | Get specific member |
| Create | POST | `/api/v1/members` | Create new member |
| Update | PUT | `/api/v1/members/{id}` | Update entire member |
| Partial Update | PATCH | `/api/v1/members/{id}` | Update specific fields |
| Delete | DELETE | `/api/v1/members/{id}` | Delete member |
| Custom Action | POST | `/api/v1/members/{id}/approve` | Custom operation |

#### Response Format

```python
# Success Response (200, 201)
{
    "id": "uuid",
    "business_number": "123-45-67890",
    "company_name": "Example Corp",
    "status": "approved",
    "created_at": "2024-01-01T00:00:00Z"
}

# Error Response (400, 404, 500)
{
    "error_code": "RESOURCE_NOT_FOUND",
    "message": "Member not found",
    "details": {
        "member_id": "uuid"
    },
    "trace_id": "trace-123-456"
}

# Validation Error Response (422)
{
    "error_code": "VALIDATION_ERROR",
    "message": "Validation failed",
    "details": [
        {
            "field": "email",
            "message": "Invalid email format"
        }
    ],
    "trace_id": "trace-123-456"
}
```

### Authentication and Authorization

#### JWT Token Structure

```python
# Token payload
{
    "sub": "user_id",  # Subject (user ID)
    "email": "user@example.com",
    "role": "member",  # or "admin"
    "exp": 1234567890,  # Expiration timestamp
    "iat": 1234567890,  # Issued at timestamp
}
```

#### Authentication Dependency

```python
# common/modules/auth/dependencies.py
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession
from ..db.session import get_db
from ..config import settings

security = HTTPBearer()

async def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: AsyncSession = Depends(get_db),
):
    """Get current authenticated user."""
    token = credentials.credentials
    
    try:
        payload = jwt.decode(
            token,
            settings.SECRET_KEY,
            algorithms=[settings.ALGORITHM]
        )
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid authentication credentials"
            )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid authentication credentials"
        )
    
    # Get user from database
    user = await get_user_by_id(db, user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    return user

async def get_current_admin_user(
    current_user = Depends(get_current_user),
):
    """Get current user and verify admin role."""
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user
```

## Data Models

### Database Models (SQLAlchemy)

Database models represent tables in PostgreSQL:

```python
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.dialects.postgresql import UUID, JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

class PerformanceRecord(Base):
    """Performance record model."""
    __tablename__ = "performance_records"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False)
    year = Column(Integer, nullable=False)
    quarter = Column(Integer, nullable=False)
    type = Column(String(20), nullable=False)  # sales, support, ip
    data_json = Column(JSONB, nullable=False)
    status = Column(String(20), default="draft")
    submitted_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    member = relationship("Member", back_populates="performance_records")
    reviews = relationship("PerformanceReview", back_populates="record")
    
    # Indexes
    __table_args__ = (
        Index("idx_performance_member_year_quarter", "member_id", "year", "quarter"),
        Index("idx_performance_status", "status"),
    )
```

### Pydantic Schemas

Schemas define request/response data structures:

```python
from pydantic import BaseModel, Field, validator
from datetime import datetime
from typing import Optional, Dict, Any

class PerformanceRecordCreate(BaseModel):
    """Schema for creating performance record."""
    year: int = Field(..., ge=2000, le=2100)
    quarter: int = Field(..., ge=1, le=4)
    type: str = Field(..., pattern="^(sales|support|ip)$")
    data_json: Dict[str, Any]
    
    @validator("data_json")
    def validate_data_json(cls, v, values):
        """Validate data_json based on type."""
        record_type = values.get("type")
        if record_type == "sales":
            required_fields = ["revenue", "employees"]
            for field in required_fields:
                if field not in v:
                    raise ValueError(f"Missing required field: {field}")
        return v

class PerformanceRecordResponse(BaseModel):
    """Schema for performance record response."""
    id: str
    member_id: str
    year: int
    quarter: int
    type: str
    data_json: Dict[str, Any]
    status: str
    submitted_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

Based on the acceptance criteria analysis, the following correctness properties must be upheld by the backend architecture:

### Property 1: Module Structure Consistency
*For any* business module in the `modules/` directory, the module SHALL contain `router.py`, `service.py`, `schemas.py`, and `models.py` files.
**Validates: Requirements 1.4**

### Property 2: Absolute Import Usage
*For any* Python file, imports SHALL use absolute paths starting from the `src` package root instead of relative imports.
**Validates: Requirements 1.5**

### Property 3: Snake Case Naming for Files and Functions
*For any* Python file, function, variable, or module name, the name SHALL use snake_case naming convention.
**Validates: Requirements 2.1**

### Property 4: Pascal Case Naming for Classes
*For any* class definition, the class name SHALL use PascalCase naming convention.
**Validates: Requirements 2.2**

### Property 5: File Size Limit
*For any* Python file, the file SHALL contain no more than 500 lines of code.
**Validates: Requirements 2.8**

### Property 6: Async Database Operations
*For any* database operation, the operation SHALL use async/await pattern with AsyncSession.
**Validates: Requirements 3.1**

### Property 7: Database Naming Convention
*For any* database table or column name, the name SHALL use snake_case naming convention.
**Validates: Requirements 3.4**

### Property 8: Model Type Hints
*For any* SQLAlchemy model field or relationship, the field SHALL have type hints defined.
**Validates: Requirements 3.8**

### Property 9: API Route Versioning
*For any* API route, the route path SHALL be prefixed with `/api/v1/` for versioning.
**Validates: Requirements 4.2**

### Property 10: Plural Resource Names
*For any* resource endpoint, the resource name SHALL use plural nouns (e.g., `/members`, `/projects`).
**Validates: Requirements 4.4**

### Property 11: Validation Error Detail
*For any* validation error response, the response SHALL include field names and specific error messages.
**Validates: Requirements 5.5**

### Property 12: Schema Field Naming
*For any* Pydantic schema field, the field name SHALL use snake_case naming convention.
**Validates: Requirements 5.6**

### Property 13: Error Response Format
*For any* error response, the response SHALL include `error_code`, `message`, and `details` fields.
**Validates: Requirements 6.5**

### Property 14: Trace ID in Errors
*For any* error response, the response SHALL include a `trace_id` field for debugging.
**Validates: Requirements 6.7**

### Property 15: HTTP Request Logging
*For any* HTTP request, the system SHALL log the request method, path, status code, and duration.
**Validates: Requirements 7.2**

### Property 16: Unique Trace ID Generation
*For any* HTTP request, the system SHALL generate a unique `trace_id` for request correlation.
**Validates: Requirements 7.3**

### Property 17: Sensitive Data Sanitization
*For any* log entry, sensitive data (passwords, tokens, API keys) SHALL be sanitized before logging.
**Validates: Requirements 7.9**

### Property 18: Role-Based Access Control
*For any* protected endpoint requiring admin access, the system SHALL verify the user's role before allowing access.
**Validates: Requirements 8.5**

### Property 19: Thin Router Functions
*For any* router function, the function SHALL delegate business logic to the service layer and contain minimal logic.
**Validates: Requirements 9.2**

### Property 20: Service Method Type Hints
*For any* service method, the method SHALL have type hints for all parameters and return values.
**Validates: Requirements 9.5**

### Property 21: Database Session Injection
*For any* route that requires database access, the route SHALL use the `get_db` dependency for session injection.
**Validates: Requirements 10.2**

### Property 22: Async I/O Operations
*For any* I/O operation (database, HTTP, file), the operation SHALL use async/await pattern.
**Validates: Requirements 12.1**

### Property 23: Sync/Async Code Separation
*For any* code module, the module SHALL NOT mix synchronous and asynchronous code without proper handling.
**Validates: Requirements 12.6**

### Property 24: Export Filename Timestamps
*For any* data export operation, the generated filename SHALL include a timestamp.
**Validates: Requirements 13.6**

### Property 25: File Upload Naming
*For any* file upload, the system SHALL generate a unique server filename while preserving the original filename in the database.
**Validates: Requirements 14.4**

### Property 26: Audit Log Required Fields
*For any* audit log entry, the entry SHALL include `user_id`, `action`, `resource_type`, `resource_id`, `ip_address`, and `user_agent`.
**Validates: Requirements 16.2**

### Property 27: Test Coverage Minimum
*For any* business logic module, the module SHALL have at least 70% test coverage.
**Validates: Requirements 18.3**

### Property 28: Function Type Hints
*For any* function, the function SHALL have type hints for all parameters and return values.
**Validates: Requirements 19.4**

### Property 29: Function Length Limit
*For any* function, the function SHALL contain no more than 50 lines of code.
**Validates: Requirements 19.6**

### Property 30: Parameterized Queries
*For any* database query, the query SHALL use parameterized queries (via SQLAlchemy ORM) to prevent SQL injection.
**Validates: Requirements 20.2**

## Error Handling

### Exception Hierarchy

```python
# common/modules/exception/exceptions.py

class AppException(Exception):
    """Base application exception."""
    def __init__(self, message: str, status_code: int = 500, 
                 error_code: str = None, details: dict = None):
        self.message = message
        self.status_code = status_code
        self.error_code = error_code or self.__class__.__name__
        self.details = details or {}

class NotFoundError(AppException):
    """Resource not found (404)."""
    def __init__(self, resource: str = "Resource", details: dict = None):
        super().__init__(
            message=f"{resource} not found",
            status_code=404,
            error_code="RESOURCE_NOT_FOUND",
            details=details
        )

class ValidationError(AppException):
    """Validation error (400)."""
    def __init__(self, message: str, details: dict = None):
        super().__init__(
            message=message,
            status_code=400,
            error_code="VALIDATION_ERROR",
            details=details
        )

class UnauthorizedError(AppException):
    """Unauthorized access (401)."""
    def __init__(self, message: str = "Unauthorized", details: dict = None):
        super().__init__(
            message=message,
            status_code=401,
            error_code="UNAUTHORIZED",
            details=details
        )

class ForbiddenError(AppException):
    """Forbidden access (403)."""
    def __init__(self, message: str = "Forbidden", details: dict = None):
        super().__init__(
            message=message,
            status_code=403,
            error_code="FORBIDDEN",
            details=details
        )

class ConflictError(AppException):
    """Resource conflict (409)."""
    def __init__(self, message: str = "Resource conflict", details: dict = None):
        super().__init__(
            message=message,
            status_code=409,
            error_code="RESOURCE_CONFLICT",
            details=details
        )
```

### Exception Handlers

```python
# common/modules/exception/handlers.py
from fastapi import Request, status
from fastapi.responses import JSONResponse
from fastapi.exceptions import RequestValidationError
from sqlalchemy.exc import SQLAlchemyError
import logging

logger = logging.getLogger(__name__)

async def app_exception_handler(request: Request, exc: AppException):
    """Handle custom application exceptions."""
    trace_id = getattr(request.state, "trace_id", "unknown")
    
    # Log based on status code
    if exc.status_code >= 500:
        logger.error(f"Application error: {exc.message}", extra={
            "trace_id": trace_id,
            "error_code": exc.error_code,
            "details": exc.details
        })
    else:
        logger.warning(f"Client error: {exc.message}", extra={
            "trace_id": trace_id,
            "error_code": exc.error_code
        })
    
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "error_code": exc.error_code,
            "message": exc.message,
            "details": exc.details,
            "trace_id": trace_id
        }
    )

async def validation_exception_handler(request: Request, exc: RequestValidationError):
    """Handle Pydantic validation errors."""
    trace_id = getattr(request.state, "trace_id", "unknown")
    
    errors = []
    for error in exc.errors():
        errors.append({
            "field": ".".join(str(loc) for loc in error["loc"]),
            "message": error["msg"],
            "type": error["type"]
        })
    
    logger.warning(f"Validation error: {len(errors)} fields", extra={
        "trace_id": trace_id,
        "errors": errors
    })
    
    return JSONResponse(
        status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
        content={
            "error_code": "VALIDATION_ERROR",
            "message": "Validation failed",
            "details": errors,
            "trace_id": trace_id
        }
    )

async def sqlalchemy_exception_handler(request: Request, exc: SQLAlchemyError):
    """Handle SQLAlchemy database errors."""
    trace_id = getattr(request.state, "trace_id", "unknown")
    
    logger.error(f"Database error: {str(exc)}", extra={
        "trace_id": trace_id,
        "exception_type": type(exc).__name__
    })
    
    return JSONResponse(
        status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
        content={
            "error_code": "DATABASE_ERROR",
            "message": "A database error occurred",
            "details": {},
            "trace_id": trace_id
        }
    )
```

### Error Handling Best Practices

1. **Use specific exception types** - Don't use generic Exception
2. **Include context in exceptions** - Add details dict with relevant information
3. **Log before raising** - Log important context before raising exceptions
4. **Don't expose internals** - Sanitize error messages for production
5. **Use trace_id** - Always include trace_id for debugging

## Testing Strategy

### Testing Pyramid

```
        ┌─────────────┐
        │   E2E Tests │  ← Playwright (Critical flows)
        │   (5%)      │
        ├─────────────┤
        │ Integration │  ← pytest + TestClient (API endpoints)
        │   (25%)     │
        ├─────────────┤
        │ Unit Tests  │  ← pytest (Service layer, utilities)
        │   (70%)     │
        └─────────────┘
```

### Unit Testing

**Tools**: pytest + pytest-asyncio

**What to Test**:
- Service layer methods
- Utility functions
- Data transformations
- Business logic
- Validation logic

**Example**:
```python
# tests/unit/test_member_service.py
import pytest
from unittest.mock import AsyncMock, MagicMock
from src.modules.member.service import MemberService
from src.modules.member.schemas import MemberCreate
from src.common.modules.exception import ConflictError

@pytest.mark.asyncio
async def test_create_member_success():
    """Test successful member creation."""
    # Arrange
    db_mock = AsyncMock()
    service = MemberService(db_mock)
    member_data = MemberCreate(
        business_number="123-45-67890",
        company_name="Test Corp",
        email="test@example.com",
        password="password123"
    )
    
    # Mock database operations
    service.get_by_business_number = AsyncMock(return_value=None)
    
    # Act
    result = await service.create_member(member_data)
    
    # Assert
    assert result is not None
    db_mock.add.assert_called_once()
    db_mock.commit.assert_called_once()

@pytest.mark.asyncio
async def test_create_member_duplicate():
    """Test member creation with duplicate business number."""
    # Arrange
    db_mock = AsyncMock()
    service = MemberService(db_mock)
    member_data = MemberCreate(
        business_number="123-45-67890",
        company_name="Test Corp",
        email="test@example.com",
        password="password123"
    )
    
    # Mock existing member
    service.get_by_business_number = AsyncMock(return_value=MagicMock())
    
    # Act & Assert
    with pytest.raises(ConflictError):
        await service.create_member(member_data)
```

### Integration Testing

**Tools**: pytest + FastAPI TestClient + httpx

**What to Test**:
- API endpoints
- Request/response flow
- Authentication/authorization
- Database integration
- Error handling

**Example**:
```python
# tests/integration/test_member_api.py
import pytest
from httpx import AsyncClient
from src.main import app

@pytest.mark.asyncio
async def test_create_member_api(async_client: AsyncClient):
    """Test member creation API endpoint."""
    # Arrange
    member_data = {
        "business_number": "123-45-67890",
        "company_name": "Test Corp",
        "email": "test@example.com",
        "password": "password123"
    }
    
    # Act
    response = await async_client.post("/api/v1/members", json=member_data)
    
    # Assert
    assert response.status_code == 201
    data = response.json()
    assert data["business_number"] == member_data["business_number"]
    assert data["company_name"] == member_data["company_name"]
    assert "password" not in data  # Password should not be in response

@pytest.mark.asyncio
async def test_create_member_validation_error(async_client: AsyncClient):
    """Test member creation with invalid data."""
    # Arrange
    invalid_data = {
        "business_number": "invalid",
        "company_name": "T",  # Too short
        "email": "not-an-email",
        "password": "123"  # Too short
    }
    
    # Act
    response = await async_client.post("/api/v1/members", json=invalid_data)
    
    # Assert
    assert response.status_code == 422
    data = response.json()
    assert data["error_code"] == "VALIDATION_ERROR"
    assert "details" in data
    assert len(data["details"]) > 0
```

### Test Fixtures

```python
# tests/conftest.py
import pytest
from httpx import AsyncClient
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker
from src.main import app
from src.common.modules.db.base import Base
from src.common.modules.db.session import get_db

# Test database URL
TEST_DATABASE_URL = "postgresql+asyncpg://test:test@localhost/test_db"

@pytest.fixture(scope="session")
async def test_engine():
    """Create test database engine."""
    engine = create_async_engine(TEST_DATABASE_URL, echo=False)
    
    # Create tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    yield engine
    
    # Drop tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    
    await engine.dispose()

@pytest.fixture
async def test_db(test_engine):
    """Create test database session."""
    async_session = sessionmaker(
        test_engine, class_=AsyncSession, expire_on_commit=False
    )
    
    async with async_session() as session:
        yield session
        await session.rollback()

@pytest.fixture
async def async_client(test_db):
    """Create async HTTP client for testing."""
    # Override get_db dependency
    async def override_get_db():
        yield test_db
    
    app.dependency_overrides[get_db] = override_get_db
    
    async with AsyncClient(app=app, base_url="http://test") as client:
        yield client
    
    app.dependency_overrides.clear()
```

### Property-Based Testing

For architecture standards, we use static analysis and linting:

**Tools**:
- mypy for type checking
- pylint/flake8 for code style
- Custom scripts for architecture validation

**Example**:
```python
# scripts/validate_architecture.py
import ast
import os
from pathlib import Path

def validate_module_structure():
    """Validate that all modules have required files."""
    modules_dir = Path("src/modules")
    required_files = ["router.py", "service.py", "schemas.py", "models.py"]
    
    for module_dir in modules_dir.iterdir():
        if not module_dir.is_dir():
            continue
        
        for required_file in required_files:
            file_path = module_dir / required_file
            if not file_path.exists():
                raise AssertionError(
                    f"Module {module_dir.name} missing {required_file}"
                )

def validate_type_hints():
    """Validate that all functions have type hints."""
    violations = []
    
    for py_file in Path("src").rglob("*.py"):
        with open(py_file) as f:
            tree = ast.parse(f.read())
        
        for node in ast.walk(tree):
            if isinstance(node, ast.FunctionDef):
                # Check if function has return type hint
                if node.returns is None and node.name != "__init__":
                    violations.append(f"{py_file}:{node.lineno} - {node.name}")
    
    if violations:
        raise AssertionError(f"Functions without type hints:\n" + "\n".join(violations))
```


## Implementation Guidelines

### Project Structure

```
backend/
├── src/
│   ├── common/
│   │   └── modules/
│   │       ├── config/           # Configuration management
│   │       │   ├── __init__.py
│   │       │   └── settings.py
│   │       ├── db/               # Database configuration
│   │       │   ├── __init__.py
│   │       │   ├── base.py
│   │       │   └── session.py
│   │       ├── logger/           # Logging system
│   │       │   ├── __init__.py
│   │       │   ├── startup.py
│   │       │   └── request.py
│   │       ├── exception/        # Exception handling
│   │       │   ├── __init__.py
│   │       │   ├── exceptions.py
│   │       │   └── handlers.py
│   │       ├── audit/            # Audit logging
│   │       ├── email/            # Email service
│   │       ├── storage/          # File storage
│   │       ├── export/           # Data export
│   │       └── integrations/     # External APIs
│   │
│   ├── modules/
│   │   ├── user/                 # Authentication
│   │   │   ├── __init__.py
│   │   │   ├── router.py
│   │   │   ├── service.py
│   │   │   ├── schemas.py
│   │   │   ├── models.py
│   │   │   └── dependencies.py
│   │   ├── member/               # Member management
│   │   ├── performance/          # Performance records
│   │   ├── project/              # Project management
│   │   ├── content/              # Content management
│   │   ├── support/              # Support services
│   │   ├── upload/               # File uploads
│   │   └── dashboard/            # Dashboard
│   │
│   ├── __init__.py
│   └── main.py                   # Application entry point
│
├── alembic/                      # Database migrations
│   ├── versions/
│   └── env.py
├── tests/
│   ├── unit/
│   ├── integration/
│   └── conftest.py
├── scripts/                      # Utility scripts
├── requirements.txt
├── alembic.ini
└── .env.example
```

### Naming Conventions

| Type | Convention | Example |
|------|-----------|---------|
| Files | snake_case | `member_service.py`, `user_router.py` |
| Modules | snake_case | `member`, `performance` |
| Classes | PascalCase | `MemberService`, `PerformanceRecord` |
| Functions | snake_case | `create_member`, `get_by_id` |
| Variables | snake_case | `member_data`, `is_active` |
| Constants | UPPER_SNAKE_CASE | `MAX_FILE_SIZE`, `API_VERSION` |
| Database Tables | snake_case | `members`, `performance_records` |
| Database Columns | snake_case | `business_number`, `created_at` |
| API Endpoints | kebab-case | `/api/v1/performance-records` |
| Pydantic Schemas | PascalCase + suffix | `MemberCreate`, `MemberResponse` |

### Code Style Guidelines

#### Import Order

```python
# 1. Standard library imports
import os
import logging
from datetime import datetime
from typing import Optional, List

# 2. Third-party imports
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, Field

# 3. Local application imports
from src.common.modules.db.session import get_db
from src.common.modules.exception import NotFoundError
from .models import Member
from .schemas import MemberCreate, MemberResponse
from .service import MemberService
```

#### Function Structure

```python
async def create_member(
    member_data: MemberCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
) -> MemberResponse:
    """
    Create a new member.
    
    Args:
        member_data: Member creation data
        db: Database session
        current_user: Current authenticated admin user
    
    Returns:
        Created member data
    
    Raises:
        ConflictError: If member with business number already exists
        ValidationError: If member data is invalid
    """
    # 1. Validate input
    if not member_data.business_number:
        raise ValidationError("Business number is required")
    
    # 2. Business logic
    service = MemberService(db)
    member = await service.create_member(member_data)
    
    # 3. Return response
    return MemberResponse.from_orm(member)
```

#### Type Hints

```python
# Always use type hints
from typing import Optional, List, Dict, Any
from uuid import UUID

async def get_member_by_id(
    member_id: UUID,
    db: AsyncSession
) -> Optional[Member]:
    """Get member by ID."""
    result = await db.execute(
        select(Member).where(Member.id == member_id)
    )
    return result.scalar_one_or_none()

async def get_members(
    skip: int = 0,
    limit: int = 100,
    db: AsyncSession = None
) -> List[Member]:
    """Get list of members."""
    result = await db.execute(
        select(Member).offset(skip).limit(limit)
    )
    return result.scalars().all()
```

### Database Best Practices

#### Model Definition

```python
from sqlalchemy import Column, String, DateTime, Integer, ForeignKey, Index
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from datetime import datetime
import uuid

class Member(Base):
    """Member model."""
    __tablename__ = "members"
    
    # Primary key
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    
    # Required fields
    business_number = Column(String(20), unique=True, nullable=False)
    company_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # Optional fields
    status = Column(String(20), default="pending")
    approval_status = Column(String(20), default="pending")
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    performance_records = relationship("PerformanceRecord", back_populates="member")
    
    # Indexes
    __table_args__ = (
        Index("idx_member_business_number", "business_number"),
        Index("idx_member_email", "email"),
        Index("idx_member_status", "status"),
    )
```

#### Query Patterns

```python
# Good: Use async/await
async def get_member(db: AsyncSession, member_id: UUID) -> Optional[Member]:
    result = await db.execute(
        select(Member).where(Member.id == member_id)
    )
    return result.scalar_one_or_none()

# Good: Use eager loading for relationships
async def get_member_with_records(db: AsyncSession, member_id: UUID):
    result = await db.execute(
        select(Member)
        .options(selectinload(Member.performance_records))
        .where(Member.id == member_id)
    )
    return result.scalar_one_or_none()

# Good: Use pagination
async def get_members_paginated(
    db: AsyncSession,
    skip: int = 0,
    limit: int = 20
) -> List[Member]:
    result = await db.execute(
        select(Member)
        .offset(skip)
        .limit(limit)
        .order_by(Member.created_at.desc())
    )
    return result.scalars().all()
```

#### Transaction Management

```python
# Automatic transaction management
async def create_member_with_profile(
    db: AsyncSession,
    member_data: MemberCreate,
    profile_data: ProfileCreate
):
    """Create member and profile in a transaction."""
    try:
        # Create member
        member = Member(**member_data.model_dump())
        db.add(member)
        await db.flush()  # Get member.id without committing
        
        # Create profile
        profile = MemberProfile(member_id=member.id, **profile_data.model_dump())
        db.add(profile)
        
        # Commit transaction
        await db.commit()
        await db.refresh(member)
        
        return member
    except Exception as e:
        await db.rollback()
        raise
```

### API Design Best Practices

#### Endpoint Organization

```python
# Group related endpoints in routers
router = APIRouter(prefix="/api/v1/members", tags=["members"])

# List resources
@router.get("/", response_model=List[MemberResponse])
async def list_members(
    skip: int = Query(0, ge=0),
    limit: int = Query(20, ge=1, le=100),
    status: Optional[str] = Query(None),
    db: AsyncSession = Depends(get_db),
):
    """List members with pagination and filtering."""
    pass

# Get single resource
@router.get("/{member_id}", response_model=MemberResponse)
async def get_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Get member by ID."""
    pass

# Create resource
@router.post("/", response_model=MemberResponse, status_code=201)
async def create_member(
    member_data: MemberCreate,
    db: AsyncSession = Depends(get_db),
):
    """Create new member."""
    pass

# Update resource
@router.put("/{member_id}", response_model=MemberResponse)
async def update_member(
    member_id: UUID,
    member_data: MemberUpdate,
    db: AsyncSession = Depends(get_db),
):
    """Update member."""
    pass

# Delete resource
@router.delete("/{member_id}", status_code=204)
async def delete_member(
    member_id: UUID,
    db: AsyncSession = Depends(get_db),
):
    """Delete member."""
    pass

# Custom actions
@router.post("/{member_id}/approve", response_model=MemberResponse)
async def approve_member(
    member_id: UUID,
    approval_data: ApprovalData,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_admin_user),
):
    """Approve member registration."""
    pass
```

#### Response Models

```python
# Base response model
class BaseResponse(BaseModel):
    """Base response model."""
    id: UUID
    created_at: datetime
    updated_at: datetime
    
    class Config:
        from_attributes = True

# List response with pagination
class PaginatedResponse(BaseModel):
    """Paginated response model."""
    items: List[Any]
    total: int
    skip: int
    limit: int
    
    @property
    def has_more(self) -> bool:
        return self.skip + self.limit < self.total

# Success response
class SuccessResponse(BaseModel):
    """Success response model."""
    message: str
    data: Optional[Dict[str, Any]] = None
```

### Security Best Practices

#### Password Hashing

```python
from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def hash_password(password: str) -> str:
    """Hash password using bcrypt."""
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash."""
    return pwd_context.verify(plain_password, hashed_password)
```

#### Input Validation

```python
from pydantic import BaseModel, Field, validator, EmailStr

class MemberCreate(BaseModel):
    """Member creation schema with validation."""
    business_number: str = Field(
        ...,
        regex=r"^\d{3}-\d{2}-\d{5}$",
        description="Business registration number (XXX-XX-XXXXX)"
    )
    company_name: str = Field(..., min_length=2, max_length=200)
    email: EmailStr
    password: str = Field(..., min_length=8, max_length=100)
    
    @validator("password")
    def validate_password_strength(cls, v):
        """Validate password strength."""
        if not any(c.isupper() for c in v):
            raise ValueError("Password must contain at least one uppercase letter")
        if not any(c.islower() for c in v):
            raise ValueError("Password must contain at least one lowercase letter")
        if not any(c.isdigit() for c in v):
            raise ValueError("Password must contain at least one digit")
        return v
```

#### SQL Injection Prevention

```python
# Good: Use SQLAlchemy ORM (automatically parameterized)
result = await db.execute(
    select(Member).where(Member.email == user_email)
)

# Good: Use bound parameters
result = await db.execute(
    text("SELECT * FROM members WHERE email = :email"),
    {"email": user_email}
)

# Bad: String concatenation (vulnerable to SQL injection)
# NEVER DO THIS!
query = f"SELECT * FROM members WHERE email = '{user_email}'"
```

### Performance Optimization

#### Database Query Optimization

```python
# Use select_in_load for relationships
from sqlalchemy.orm import selectinload

members = await db.execute(
    select(Member)
    .options(selectinload(Member.performance_records))
    .where(Member.status == "active")
)

# Use indexes for frequently queried columns
class Member(Base):
    __tablename__ = "members"
    
    email = Column(String(255), unique=True, nullable=False, index=True)
    status = Column(String(20), default="pending", index=True)
    
    __table_args__ = (
        Index("idx_member_email_status", "email", "status"),
    )
```

#### Async Operations

```python
import asyncio

# Run multiple async operations concurrently
async def get_dashboard_data(db: AsyncSession):
    """Get dashboard data with concurrent queries."""
    # Run queries concurrently
    members_task = get_total_members(db)
    revenue_task = get_total_revenue(db)
    projects_task = get_active_projects(db)
    
    members, revenue, projects = await asyncio.gather(
        members_task,
        revenue_task,
        projects_task
    )
    
    return {
        "total_members": members,
        "total_revenue": revenue,
        "active_projects": projects
    }
```

### Logging Best Practices

```python
import logging

logger = logging.getLogger(__name__)

async def create_member(db: AsyncSession, data: MemberCreate):
    """Create member with proper logging."""
    logger.info(
        "Creating member",
        extra={
            "business_number": data.business_number,
            "company_name": data.company_name,
            # Don't log sensitive data like passwords
        }
    )
    
    try:
        member = Member(**data.model_dump(exclude={"password"}))
        member.password_hash = hash_password(data.password)
        
        db.add(member)
        await db.commit()
        
        logger.info(
            "Member created successfully",
            extra={"member_id": str(member.id)}
        )
        
        return member
    except Exception as e:
        logger.error(
            "Failed to create member",
            extra={
                "error": str(e),
                "business_number": data.business_number
            },
            exc_info=True
        )
        raise
```

## Development Workflow

### Local Development Setup

1. **Install Python 3.11+**
   ```bash
   python --version  # Should be 3.11 or higher
   ```

2. **Create virtual environment**
   ```bash
   cd backend
   python -m venv .venv
   source .venv/bin/activate  # On Windows: .venv\Scripts\activate
   ```

3. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment**
   ```bash
   cp .env.example .env.local
   # Edit .env.local with your settings
   ```

5. **Run database migrations**
   ```bash
   alembic upgrade head
   ```

6. **Start development server**
   ```bash
   uvicorn src.main:app --reload --port 8000
   ```

### Database Migrations

```bash
# Create new migration
alembic revision --autogenerate -m "Add member table"

# Apply migrations
alembic upgrade head

# Rollback migration
alembic downgrade -1

# View migration history
alembic history
```

### Running Tests

```bash
# Run all tests
pytest

# Run with coverage
pytest --cov=src --cov-report=html

# Run specific test file
pytest tests/unit/test_member_service.py

# Run specific test
pytest tests/unit/test_member_service.py::test_create_member_success

# Run with verbose output
pytest -v

# Run async tests
pytest -v tests/integration/
```

### Code Quality Checks

```bash
# Type checking
mypy src/

# Linting
pylint src/
flake8 src/

# Format code
black src/
isort src/
```

