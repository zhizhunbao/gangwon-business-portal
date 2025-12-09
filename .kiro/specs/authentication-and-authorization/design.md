# Design Document - Authentication and Authorization

## Overview

This design document outlines the refactoring and enhancement of the authentication and authorization system for the Gangwon Business Portal. The current implementation has several technical debts that need to be addressed:

1. **Hardcoded Admin Identification**: Admins are identified by `business_number == "000-00-00000"`, which is inflexible and unmaintainable
2. **Missing Token Blacklist**: No mechanism to invalidate tokens before expiration, making logout ineffective
3. **Inconsistent Role Management**: JWT tokens contain role information, but permission checks still rely on hardcoded business number comparisons
4. **Limited Security Features**: Missing password policies, login attempt limiting, and comprehensive audit logging

The refactored system will implement a proper Role-Based Access Control (RBAC) system, token lifecycle management, enhanced security features, and comprehensive audit logging.

## Architecture

### High-Level Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Client Applications                      │
│              (Member Portal / Admin Portal)                  │
└────────────────────────┬────────────────────────────────────┘
                         │ HTTPS + JWT Token
                         ▼
┌─────────────────────────────────────────────────────────────┐
│                   API Gateway (FastAPI)                      │
│  ┌──────────────────────────────────────────────────────┐  │
│  │         Authentication Middleware                     │  │
│  │  - Token Validation                                   │  │
│  │  - Blacklist Check                                    │  │
│  │  - Role Extraction                                    │  │
│  └──────────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────────┘
                         │
        ┌────────────────┼────────────────┐
        │                │                │
        ▼                ▼                ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│   Database   │  │ Token Store  │  │ Audit Logs   │
│  (Members,   │  │ (Blacklist,  │  │ (Auth Events)│
│   Roles)     │  │  Sessions)   │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

### Component Interaction Flow

**Login Flow:**
```
User → Login Request → Auth Service → Validate Credentials
                                    → Check Account Status
                                    → Generate JWT Token (with role)
                                    → Log Login Event
                                    → Return Token + User Info
```

**Permission Check Flow:**
```
Request → Extract Token → Validate Token → Check Blacklist
                                        → Extract Role
                                        → Verify Permission
                                        → Allow/Deny Access
```


## Components and Interfaces

### 1. Authentication Service (`backend/src/modules/user/service.py`)

**Responsibilities:**
- User authentication (login, logout)
- Password management (hashing, validation, reset)
- Token generation and validation
- Role management
- Account lockout logic

**Key Methods:**
```python
class AuthService:
    # Authentication
    async def authenticate(business_number: str, password: str, db: AsyncSession) -> Member
    async def authenticate_admin(username: str, password: str, db: AsyncSession) -> Member
    
    # Token Management
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str
    def decode_token(token: str) -> dict
    async def blacklist_token(token: str, db: AsyncSession) -> None
    async def is_token_blacklisted(token: str, db: AsyncSession) -> bool
    
    # Password Management
    def verify_password(plain_password: str, hashed_password: str) -> bool
    def get_password_hash(password: str) -> str
    def validate_password_strength(password: str) -> bool
    async def check_password_history(user_id: UUID, password: str, db: AsyncSession) -> bool
    
    # Account Management
    async def register_member(data: MemberRegisterRequest, db: AsyncSession) -> Member
    async def lock_account(user_id: UUID, reason: str, db: AsyncSession) -> None
    async def unlock_account(user_id: UUID, db: AsyncSession) -> None
    
    # Role Management
    def get_user_role(member: Member) -> str
    async def change_user_role(user_id: UUID, new_role: str, db: AsyncSession) -> None
```

### 2. Authorization Dependencies (`backend/src/modules/user/dependencies.py`)

**Responsibilities:**
- Token extraction and validation
- Permission checking
- Role-based access control

**Key Functions:**
```python
# Current User Dependencies
async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)) -> Member
async def get_current_active_user(current_user: Member = Depends(get_current_user)) -> Member

# Role-Based Dependencies
async def require_admin(current_user: Member = Depends(get_current_active_user)) -> Member
async def require_member(current_user: Member = Depends(get_current_active_user)) -> Member

# Resource-Level Dependencies
async def require_resource_owner(resource_id: UUID, current_user: Member = Depends(get_current_active_user), db: AsyncSession = Depends(get_db)) -> Member
```

### 3. Token Blacklist Service (`backend/src/modules/user/token_blacklist.py`)

**Responsibilities:**
- Token blacklist management
- Expired token cleanup
- Blacklist queries

**Key Methods:**
```python
class TokenBlacklistService:
    async def add_to_blacklist(token: str, expires_at: datetime, db: AsyncSession) -> None
    async def is_blacklisted(token: str, db: AsyncSession) -> bool
    async def cleanup_expired_tokens(db: AsyncSession) -> int
    async def invalidate_user_tokens(user_id: UUID, db: AsyncSession) -> int
```

### 4. Password Policy Service (`backend/src/modules/user/password_policy.py`)

**Responsibilities:**
- Password strength validation
- Password history management
- Password policy enforcement

**Key Methods:**
```python
class PasswordPolicyService:
    def validate_password(password: str) -> tuple[bool, list[str]]
    async def add_to_history(user_id: UUID, password_hash: str, db: AsyncSession) -> None
    async def check_history(user_id: UUID, password: str, db: AsyncSession) -> bool
    def get_password_requirements() -> dict
```

### 5. Login Attempt Tracker (`backend/src/modules/user/login_tracker.py`)

**Responsibilities:**
- Track failed login attempts
- Account lockout management
- IP-based rate limiting

**Key Methods:**
```python
class LoginAttemptTracker:
    async def record_failed_attempt(identifier: str, ip_address: str, db: AsyncSession) -> None
    async def record_successful_login(identifier: str, db: AsyncSession) -> None
    async def is_account_locked(identifier: str, db: AsyncSession) -> bool
    async def is_ip_blocked(ip_address: str, db: AsyncSession) -> bool
    async def unlock_account(identifier: str, db: AsyncSession) -> None
```


## Data Models

### 1. Member Model (Enhanced)

```python
class Member(Base):
    __tablename__ = "members"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    business_number = Column(String(20), unique=True, nullable=True)  # Nullable for admins
    company_name = Column(String(200), nullable=False)
    email = Column(String(255), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    
    # NEW: Role field
    role = Column(String(20), nullable=False, default="member")  # Values: admin, member
    
    # Status fields
    status = Column(String(20), nullable=False, default="pending")  # active, pending, suspended
    approval_status = Column(String(20), nullable=False, default="pending")  # pending, approved, rejected
    
    # Account security
    failed_login_attempts = Column(Integer, default=0)
    account_locked_until = Column(DateTime, nullable=True)
    last_login_at = Column(DateTime, nullable=True)
    last_login_ip = Column(String(45), nullable=True)
    
    # Password reset
    reset_token = Column(String(255), nullable=True)
    reset_token_expires = Column(DateTime, nullable=True)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    password_history = relationship("PasswordHistory", back_populates="member", cascade="all, delete-orphan")
    login_attempts = relationship("LoginAttempt", back_populates="member", cascade="all, delete-orphan")
```

### 2. Token Blacklist Model (NEW)

```python
class TokenBlacklist(Base):
    __tablename__ = "token_blacklist"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    token = Column(String(500), unique=True, nullable=False, index=True)
    user_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False)
    reason = Column(String(100), nullable=True)  # logout, password_change, role_change, etc.
    blacklisted_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    expires_at = Column(DateTime, nullable=False, index=True)
    
    # Relationships
    member = relationship("Member")
```

### 3. Password History Model (NEW)

```python
class PasswordHistory(Base):
    __tablename__ = "password_history"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)
    
    # Relationships
    member = relationship("Member", back_populates="password_history")
```

### 4. Login Attempt Model (NEW)

```python
class LoginAttempt(Base):
    __tablename__ = "login_attempts"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=True)  # Nullable for failed attempts
    identifier = Column(String(255), nullable=False, index=True)  # business_number or email
    ip_address = Column(String(45), nullable=False, index=True)
    user_agent = Column(String(500), nullable=True)
    success = Column(Boolean, nullable=False)
    failure_reason = Column(String(100), nullable=True)
    attempted_at = Column(DateTime, default=datetime.utcnow, nullable=False, index=True)
    
    # Relationships
    member = relationship("Member", back_populates="login_attempts")
```

### 5. API Token Model (NEW, Optional)

```python
class APIToken(Base):
    __tablename__ = "api_tokens"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    member_id = Column(UUID(as_uuid=True), ForeignKey("members.id"), nullable=False)
    token = Column(String(500), unique=True, nullable=False, index=True)
    name = Column(String(100), nullable=False)  # User-friendly name
    scopes = Column(JSON, nullable=True)  # List of allowed scopes
    last_used_at = Column(DateTime, nullable=True)
    expires_at = Column(DateTime, nullable=True)
    revoked = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    member = relationship("Member")
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Role Storage and Retrieval
*For any* user created in the system, when storing their role in the database, retrieving that user should return the same role value.
**Validates: Requirements 1.1**

### Property 2: JWT Token Contains Role
*For any* authenticated user, the JWT token generated for that user should contain a role field that matches the user's role in the database.
**Validates: Requirements 1.2**

### Property 3: Permission Checks Use Role Field
*For any* protected endpoint request, the permission check should extract and use the role field from the JWT token rather than checking hardcoded business numbers.
**Validates: Requirements 1.3**

### Property 4: Role Change Invalidates Tokens
*For any* user whose role is changed, all existing tokens for that user should be invalidated and require re-authentication.
**Validates: Requirements 1.5**

### Property 5: Admin Accounts Support NULL Business Numbers
*For any* admin user created with a NULL business number, the system should accept and store the account successfully.
**Validates: Requirements 2.1**

### Property 6: Admin Creation Sets Role
*For any* admin account created, the role field should be automatically set to "admin".
**Validates: Requirements 2.2**

### Property 7: Multiple Admin Accounts
*For any* set of admin accounts with different credentials, each should be able to authenticate independently.
**Validates: Requirements 2.3**

### Property 8: Admin Login Verifies Role
*For any* login attempt to admin endpoints, only users with role="admin" should be granted access.
**Validates: Requirements 2.4**

### Property 9: Member Access Restriction
*For any* member user (role="member"), attempts to access admin-only endpoints should be denied regardless of their business number.
**Validates: Requirements 2.5**

### Property 10: Logout Blacklists Token
*For any* user logout action, the user's current token should be added to the blacklist.
**Validates: Requirements 3.1**

### Property 11: Blacklisted Token Rejection
*For any* token in the blacklist, attempts to use that token for authentication should be rejected.
**Validates: Requirements 3.2**

### Property 12: Expired Token Cleanup
*For any* token in the blacklist that has expired, the system should automatically remove it after a cleanup period.
**Validates: Requirements 3.3**

### Property 13: Password Change Invalidates Tokens
*For any* user who changes their password, all existing tokens for that user should be invalidated.
**Validates: Requirements 3.4**

### Property 14: Token Refresh Without Re-authentication
*For any* valid token near expiration, the system should be able to issue a new token without requiring the user to re-enter credentials.
**Validates: Requirements 3.5**

### Property 15: Minimum Password Length
*For any* password creation or change attempt, passwords with fewer than 8 characters should be rejected.
**Validates: Requirements 4.1**

### Property 16: Password Complexity Requirements
*For any* password, it should be rejected if it doesn't contain at least one uppercase letter, one lowercase letter, one number, and one special character.
**Validates: Requirements 4.2**

### Property 17: Password History Check
*For any* password change attempt, if the new password matches any of the user's recent passwords, it should be rejected.
**Validates: Requirements 4.3**

### Property 18: Password Hashing with Bcrypt
*For any* password stored in the database, it should be hashed using bcrypt with an appropriate cost factor.
**Validates: Requirements 4.4**

### Property 19: Generic Authentication Error Messages
*For any* failed login attempt, the error message should not reveal whether the username or password was incorrect.
**Validates: Requirements 4.5**

### Property 20: Account Lockout After Failed Attempts
*For any* user account, after 5 failed login attempts within 15 minutes, the account should be locked for 30 minutes.
**Validates: Requirements 5.1**

### Property 21: Separate Tracking by IP and Account
*For any* failed login attempts, the system should track attempts by IP address and user account independently.
**Validates: Requirements 5.2**

### Property 22: Lockout Email Notification
*For any* account lockout event, an email notification should be sent to the user's registered email address.
**Validates: Requirements 5.3**

### Property 23: Admin Account Unlock
*For any* locked account, an admin should be able to manually unlock it.
**Validates: Requirements 5.4**

### Property 24: Failed Attempt Counter Reset
*For any* user account with failed login attempts, a successful login should reset the failed attempt counter to zero.
**Validates: Requirements 5.5**

### Property 25: Default Token Expiration
*For any* JWT token created without "Remember Me", the expiration time should be set to 30 minutes from creation.
**Validates: Requirements 6.1**

### Property 26: Extended Token Expiration
*For any* JWT token created with "Remember Me" selected, the expiration time should be set to 7 days from creation.
**Validates: Requirements 6.2**

### Property 27: Automatic Token Refresh
*For any* active user with a token expiring within 5 minutes, the system should automatically refresh the token.
**Validates: Requirements 6.3**

### Property 28: Concurrent Session Independence
*For any* user logged in from multiple devices, each session should have an independent token that can be managed separately.
**Validates: Requirements 6.5**

### Property 29: Unified Permission Decorator
*For any* protected endpoint in the system, it should use the same permission checking decorator.
**Validates: Requirements 7.1**

### Property 30: Authentication and Authorization Verification
*For any* protected endpoint request, the system should verify both valid authentication (token) and correct authorization (role).
**Validates: Requirements 7.2**

### Property 31: Correct HTTP Status Codes
*For any* permission check failure, the system should return HTTP 401 for authentication failures and HTTP 403 for authorization failures.
**Validates: Requirements 7.3**

### Property 32: Permission Failure Logging
*For any* permission check failure, the event should be logged to the audit log with relevant details.
**Validates: Requirements 7.4**

### Property 33: Resource-Level Permissions
*For any* resource access attempt, users should only be able to access resources they own or have explicit permission to access.
**Validates: Requirements 7.5**

### Property 34: Business Number Format Validation
*For any* registration attempt, business registration numbers should be validated against the correct format before acceptance.
**Validates: Requirements 8.1**

### Property 35: Duplicate Registration Prevention
*For any* registration attempt using an existing business number or email, the registration should be rejected.
**Validates: Requirements 8.2**

### Property 36: Pending Status on Registration
*For any* new account registration, the account status should be set to "pending" requiring admin approval.
**Validates: Requirements 8.3**

### Property 37: Registration Confirmation Email
*For any* completed registration, a confirmation email should be sent to the registered email address.
**Validates: Requirements 8.4**

### Property 38: Registration Rate Limiting
*For any* IP address, registration attempts should be limited to a maximum of 3 per hour.
**Validates: Requirements 8.5**

### Property 39: Secure Reset Token Generation
*For any* password reset request, the generated token should be cryptographically secure and unique.
**Validates: Requirements 9.1**

### Property 40: Reset Token Expiration
*For any* password reset token, it should expire after 1 hour from generation.
**Validates: Requirements 9.2**

### Property 41: Reset Token Single Use
*For any* password reset token, once used successfully, it should be immediately invalidated and cannot be reused.
**Validates: Requirements 9.4**

### Property 42: Generic Reset Response
*For any* password reset request, the system response should not reveal whether the email address exists in the system.
**Validates: Requirements 9.5**

### Property 43: Comprehensive Login Logging
*For any* login attempt (successful or failed), the event should be logged with timestamp, IP address, and user agent.
**Validates: Requirements 10.1**

### Property 44: Logout Event Logging
*For any* logout action, the event should be logged to the audit log.
**Validates: Requirements 10.2**

### Property 45: Password Change Logging
*For any* password change or reset request, the event should be logged to the audit log.
**Validates: Requirements 10.3**

### Property 46: Role Change Logging
*For any* user role change or permission modification, the event should be logged to the audit log.
**Validates: Requirements 10.4**

### Property 47: Audit Log Retention
*For any* authentication audit log entry, it should be retained for at least 7 years for compliance.
**Validates: Requirements 10.5**


## Error Handling

### Error Types and HTTP Status Codes

| Error Type | HTTP Status | Description | Example |
|------------|-------------|-------------|---------|
| `UnauthorizedError` | 401 | Invalid or missing authentication credentials | Invalid token, expired token |
| `ForbiddenError` | 403 | Valid authentication but insufficient permissions | Member accessing admin endpoint |
| `ValidationError` | 422 | Invalid input data | Weak password, invalid email format |
| `ConflictError` | 409 | Resource conflict | Duplicate business number |
| `NotFoundError` | 404 | Resource not found | User not found |
| `TooManyRequestsError` | 429 | Rate limit exceeded | Too many login attempts |

### Error Response Format

```json
{
  "error_code": "UNAUTHORIZED",
  "message": "Invalid credentials",
  "details": {
    "field": "password",
    "reason": "incorrect_password"
  },
  "trace_id": "550e8400-e29b-41d4-a716-446655440000",
  "timestamp": "2025-01-29T10:30:00Z"
}
```

### Error Handling Strategy

1. **Generic Error Messages**: Never reveal specific information about why authentication failed (e.g., "Invalid credentials" instead of "Password incorrect")
2. **Rate Limiting**: Implement exponential backoff for repeated failures
3. **Audit Logging**: Log all authentication failures with relevant context
4. **User Notification**: Send email alerts for security-relevant events (account lockout, password changes)
5. **Graceful Degradation**: If external services (email, Nice D&B) fail, continue with core functionality


## Testing Strategy

### Unit Testing

Unit tests will verify specific functionality of individual components:

**Authentication Service Tests:**
- Password hashing and verification
- Token generation and validation
- Role extraction from tokens
- Password strength validation
- Account lockout logic

**Authorization Tests:**
- Role-based permission checks
- Resource ownership verification
- Token blacklist checks
- Admin vs member access control

**Password Policy Tests:**
- Minimum length enforcement
- Complexity requirements
- Password history checking
- Bcrypt hashing verification

**Login Attempt Tracker Tests:**
- Failed attempt counting
- Account lockout timing
- IP-based rate limiting
- Counter reset on success

### Property-Based Testing

Property-based tests will verify universal properties across all inputs using **pytest** with **Hypothesis** library (minimum 100 iterations per test):

**Configuration:**
```python
from hypothesis import given, settings
import hypothesis.strategies as st

@settings(max_examples=100)
@given(...)
def test_property_...():
    pass
```

**Test Tagging Format:**
Each property-based test must be tagged with a comment referencing the design document:
```python
# Feature: authentication-and-authorization, Property 1: Role Storage and Retrieval
@settings(max_examples=100)
@given(role=st.sampled_from(['admin', 'member']))
async def test_role_storage_and_retrieval(role):
    """Test that stored roles are retrieved correctly"""
    # Test implementation
```

**Key Property Tests:**

1. **Role Management Properties** (Properties 1-9):
   - Role storage and retrieval consistency
   - JWT token role inclusion
   - Permission checks using role field
   - Admin account creation and authentication

2. **Token Lifecycle Properties** (Properties 10-14):
   - Token blacklist functionality
   - Token invalidation on password/role change
   - Token refresh mechanism

3. **Password Security Properties** (Properties 15-19):
   - Password strength validation
   - Password history enforcement
   - Bcrypt hashing verification
   - Generic error messages

4. **Account Security Properties** (Properties 20-24):
   - Account lockout after failed attempts
   - Separate tracking by IP and account
   - Failed attempt counter reset

5. **Session Management Properties** (Properties 25-28):
   - Token expiration times
   - Automatic token refresh
   - Concurrent session independence

6. **Permission Properties** (Properties 29-33):
   - Unified permission decorator usage
   - Authentication and authorization verification
   - Correct HTTP status codes
   - Resource-level permissions

7. **Registration Properties** (Properties 34-38):
   - Business number format validation
   - Duplicate prevention
   - Pending status assignment
   - Rate limiting

8. **Password Reset Properties** (Properties 39-42):
   - Secure token generation
   - Token expiration and single-use
   - Generic response messages

9. **Audit Logging Properties** (Properties 43-47):
   - Comprehensive event logging
   - Log retention compliance

### Integration Testing

Integration tests will verify end-to-end workflows:

**Authentication Flows:**
- Complete registration → approval → login flow
- Password reset request → email → reset completion
- Login → token generation → API access → logout

**Authorization Flows:**
- Member accessing member endpoints (success)
- Member accessing admin endpoints (failure)
- Admin accessing admin endpoints (success)
- Resource ownership verification

**Security Flows:**
- Failed login attempts → account lockout → unlock
- Password change → token invalidation → re-login
- Role change → token invalidation → re-authentication

### Test Data Strategy

**Test Users:**
```python
TEST_USERS = {
    "admin": {
        "business_number": None,
        "email": "admin@test.com",
        "role": "admin",
        "password": "Admin123!@#"
    },
    "member": {
        "business_number": "123-45-67890",
        "email": "member@test.com",
        "role": "member",
        "password": "Member123!@#"
    },
    "pending_member": {
        "business_number": "987-65-43210",
        "email": "pending@test.com",
        "role": "member",
        "status": "pending",
        "password": "Pending123!@#"
    }
}
```

### Test Coverage Goals

- **Unit Test Coverage**: > 80% for authentication and authorization modules
- **Property Test Coverage**: All 47 correctness properties must have corresponding property-based tests
- **Integration Test Coverage**: All critical user flows must be tested end-to-end
- **Security Test Coverage**: All security-related requirements must have dedicated tests


## Migration Strategy

### Phase 1: Database Schema Migration

**Step 1: Add role column to members table**
```python
# Alembic migration
def upgrade():
    # Add role column with default value
    op.add_column('members', sa.Column('role', sa.String(20), nullable=False, server_default='member'))
    
    # Update existing admin user (business_number = '000-00-00000')
    op.execute("UPDATE members SET role = 'admin' WHERE business_number = '000-00-00000'")
    
    # Add account security columns
    op.add_column('members', sa.Column('failed_login_attempts', sa.Integer, server_default='0'))
    op.add_column('members', sa.Column('account_locked_until', sa.DateTime, nullable=True))
    op.add_column('members', sa.Column('last_login_at', sa.DateTime, nullable=True))
    op.add_column('members', sa.Column('last_login_ip', sa.String(45), nullable=True))
    
    # Make business_number nullable for admin accounts
    op.alter_column('members', 'business_number', nullable=True)
```

**Step 2: Create new tables**
```python
def upgrade():
    # Token blacklist table
    op.create_table('token_blacklist',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('token', sa.String(500), nullable=False),
        sa.Column('user_id', sa.UUID(), nullable=False),
        sa.Column('reason', sa.String(100), nullable=True),
        sa.Column('blacklisted_at', sa.DateTime(), nullable=False),
        sa.Column('expires_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['user_id'], ['members.id']),
    )
    op.create_index('ix_token_blacklist_token', 'token_blacklist', ['token'], unique=True)
    op.create_index('ix_token_blacklist_expires_at', 'token_blacklist', ['expires_at'])
    
    # Password history table
    op.create_table('password_history',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=False),
        sa.Column('password_hash', sa.String(255), nullable=False),
        sa.Column('created_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['member_id'], ['members.id']),
    )
    
    # Login attempts table
    op.create_table('login_attempts',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('member_id', sa.UUID(), nullable=True),
        sa.Column('identifier', sa.String(255), nullable=False),
        sa.Column('ip_address', sa.String(45), nullable=False),
        sa.Column('user_agent', sa.String(500), nullable=True),
        sa.Column('success', sa.Boolean(), nullable=False),
        sa.Column('failure_reason', sa.String(100), nullable=True),
        sa.Column('attempted_at', sa.DateTime(), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.ForeignKeyConstraint(['member_id'], ['members.id']),
    )
    op.create_index('ix_login_attempts_identifier', 'login_attempts', ['identifier'])
    op.create_index('ix_login_attempts_ip_address', 'login_attempts', ['ip_address'])
    op.create_index('ix_login_attempts_attempted_at', 'login_attempts', ['attempted_at'])
```

### Phase 2: Code Migration

**Step 1: Update AuthService (Backward Compatible)**
```python
# Add new role-based methods while keeping old methods
class AuthService:
    @staticmethod
    def is_admin(member: Member) -> bool:
        """Check if member is admin - supports both old and new methods"""
        # New method: check role field
        if hasattr(member, 'role') and member.role:
            return member.role == 'admin'
        # Old method: fallback to business number check
        return member.business_number == "000-00-00000"
```

**Step 2: Update JWT Token Generation**
```python
# Include role in token payload
def create_access_token(self, data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    # Ensure role is included
    if 'role' not in to_encode:
        # Fallback for backward compatibility
        to_encode['role'] = 'member'
    # ... rest of token generation
```

**Step 3: Update Permission Dependencies**
```python
# New role-based permission check
async def require_admin(current_user: Member = Depends(get_current_active_user)) -> Member:
    """Require admin role - uses role field"""
    if current_user.role != 'admin':
        raise ForbiddenError("Admin access required")
    return current_user
```

### Phase 3: Frontend Migration

**Step 1: Update Auth Service**
```javascript
// Ensure role is stored and used
async login(credentials) {
    const response = await apiService.post(`${API_PREFIX}/auth/login`, requestData);
    if (response.access_token) {
        setStorage(ACCESS_TOKEN_KEY, response.access_token);
        const userInfo = {
            ...response.user,
            role: response.user.role || 'member' // Ensure role is present
        };
        setStorage('user_info', userInfo);
    }
    return response;
}
```

**Step 2: Update Permission Checks**
```javascript
// Use role from user info instead of hardcoded checks
isAdmin() {
    const user = this.getCurrentUserFromStorage();
    return user?.role === 'admin'; // Use role field
}
```

### Phase 4: Testing and Validation

1. **Run all existing tests** to ensure backward compatibility
2. **Run new property-based tests** to verify new functionality
3. **Perform manual testing** of critical flows:
   - Existing admin login (business_number = '000-00-00000')
   - New admin login (with role field)
   - Member login and access control
   - Token blacklist functionality
   - Password policy enforcement
4. **Monitor logs** for any permission check failures
5. **Gradual rollout** with feature flags if needed

### Phase 5: Cleanup (After Validation)

1. **Remove backward compatibility code** (hardcoded business number checks)
2. **Update documentation** to reflect new role-based system
3. **Archive old admin account** or migrate to proper admin account
4. **Remove feature flags** if used

### Rollback Plan

If issues are discovered:
1. **Revert database migration** using Alembic downgrade
2. **Revert code changes** using git
3. **Clear token blacklist** if causing issues
4. **Restore from backup** if data corruption occurs

### Timeline

- **Phase 1 (Database)**: 1 day
- **Phase 2 (Backend Code)**: 2-3 days
- **Phase 3 (Frontend Code)**: 1-2 days
- **Phase 4 (Testing)**: 2-3 days
- **Phase 5 (Cleanup)**: 1 day

**Total Estimated Time**: 7-10 days


## Security Considerations

### 1. Password Security

**Hashing Algorithm**: Bcrypt with cost factor 12
- Provides strong protection against brute force attacks
- Automatically handles salting
- Adjustable cost factor for future-proofing

**Password Policy Enforcement**:
- Minimum 8 characters
- At least one uppercase, lowercase, number, and special character
- Password history check (last 5 passwords)
- No common passwords (check against dictionary)

**Password Storage**:
- Never store plain text passwords
- Never log passwords (even in error messages)
- Use secure password reset tokens (cryptographically random)

### 2. Token Security

**JWT Token Best Practices**:
- Short expiration times (30 minutes default)
- Include minimal information in payload
- Sign with strong secret key (minimum 256 bits)
- Use HS256 algorithm
- Implement token blacklist for logout

**Token Transmission**:
- Always use HTTPS
- Include tokens in Authorization header (not URL)
- Set secure and httpOnly flags for cookies (if used)

**Token Validation**:
- Verify signature
- Check expiration
- Verify issuer and audience
- Check blacklist status

### 3. Rate Limiting

**Login Attempts**:
- 5 failed attempts per account per 15 minutes → 30-minute lockout
- 10 failed attempts per IP per hour → 1-hour IP block
- Exponential backoff for repeated failures

**Registration**:
- 3 registration attempts per IP per hour
- CAPTCHA after 2 failed attempts

**Password Reset**:
- 3 reset requests per email per hour
- Token expires after 1 hour
- Single-use tokens

**API Requests**:
- 100 requests per minute per user
- 1000 requests per hour per IP

### 4. Session Management

**Session Security**:
- Regenerate session ID after login
- Invalidate sessions on logout
- Support concurrent sessions with independent tokens
- Track session metadata (IP, user agent, last activity)

**Session Timeout**:
- 30 minutes of inactivity for regular sessions
- 7 days for "Remember Me" sessions
- Automatic token refresh for active users

### 5. Audit Logging

**What to Log**:
- All authentication events (login, logout, failed attempts)
- All authorization failures
- Password changes and resets
- Role changes
- Account lockouts and unlocks
- Token blacklist additions

**Log Information**:
- Timestamp (UTC)
- User ID (if authenticated)
- IP address
- User agent
- Action performed
- Result (success/failure)
- Failure reason (if applicable)

**Log Retention**:
- 7 years for compliance
- Secure storage with encryption
- Regular backup and archival

### 6. Input Validation

**Business Number Validation**:
- Format: XXX-XX-XXXXX (10 digits with dashes)
- Checksum validation (if applicable)
- Uniqueness check

**Email Validation**:
- RFC 5322 compliant format
- Domain validation (MX record check)
- Disposable email detection
- Uniqueness check

**Password Validation**:
- Length and complexity checks
- No SQL injection patterns
- No script injection patterns
- Trim whitespace

### 7. Error Handling

**Security-Conscious Error Messages**:
- Never reveal whether username exists
- Generic "Invalid credentials" for all auth failures
- Don't expose internal system details
- Log detailed errors server-side only

**Error Response Sanitization**:
- Remove stack traces in production
- Remove database error details
- Remove file paths and system information

### 8. HTTPS and Transport Security

**Requirements**:
- TLS 1.2 or higher
- Strong cipher suites only
- HSTS header enabled
- Certificate pinning (mobile apps)

**Headers**:
```
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Content-Security-Policy: default-src 'self'
```

### 9. Dependency Security

**Regular Updates**:
- Keep all dependencies up to date
- Monitor security advisories
- Use automated dependency scanning (Dependabot, Snyk)

**Vulnerable Dependencies**:
- Immediate patching for critical vulnerabilities
- Risk assessment for non-critical vulnerabilities
- Document accepted risks

### 10. Compliance

**GDPR Compliance**:
- Right to access (user can view their data)
- Right to erasure (user can delete account)
- Right to portability (user can export data)
- Data minimization (collect only necessary data)
- Consent management (explicit consent for data processing)

**Korean Personal Information Protection Act (PIPA)**:
- Secure storage of personal information
- Encryption of sensitive data
- Audit logging of access to personal information
- Data retention limits
- User notification of data breaches


## API Endpoints

### Authentication Endpoints

#### POST /api/auth/register
Register a new member account.

**Request:**
```json
{
  "business_number": "123-45-67890",
  "company_name": "Example Corp",
  "email": "contact@example.com",
  "password": "SecurePass123!",
  "industry": "Technology",
  "region": "강원특별자치도",
  "address": "123 Main St",
  "terms_agreed": true
}
```

**Response (201):**
```json
{
  "message": "Registration successful. Please wait for admin approval.",
  "member_id": "550e8400-e29b-41d4-a716-446655440000"
}
```

#### POST /api/auth/login
Authenticate a member and receive JWT token.

**Request:**
```json
{
  "business_number": "123-45-67890",
  "password": "SecurePass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "business_number": "123-45-67890",
    "company_name": "Example Corp",
    "email": "contact@example.com",
    "role": "member",
    "status": "active",
    "approval_status": "approved"
  }
}
```

#### POST /api/auth/admin-login
Authenticate an admin user.

**Request:**
```json
{
  "username": "admin@example.com",
  "password": "AdminPass123!"
}
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": {
    "id": "660e8400-e29b-41d4-a716-446655440000",
    "business_number": null,
    "company_name": "System Admin",
    "email": "admin@example.com",
    "role": "admin",
    "status": "active",
    "approval_status": "approved"
  }
}
```

#### POST /api/auth/logout
Logout current user and blacklist token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "message": "Logged out successfully"
}
```

#### POST /api/auth/refresh
Refresh access token.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "user": { ... }
}
```

#### GET /api/auth/me
Get current user information.

**Headers:**
```
Authorization: Bearer <token>
```

**Response (200):**
```json
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "business_number": "123-45-67890",
  "company_name": "Example Corp",
  "email": "contact@example.com",
  "role": "member",
  "status": "active",
  "approval_status": "approved",
  "created_at": "2025-01-01T00:00:00Z"
}
```

#### POST /api/auth/password-reset-request
Request password reset.

**Request:**
```json
{
  "business_number": "123-45-67890",
  "email": "contact@example.com"
}
```

**Response (200):**
```json
{
  "message": "If your email is registered, you will receive a password reset link."
}
```

#### POST /api/auth/password-reset
Reset password with token.

**Request:**
```json
{
  "token": "abc123def456...",
  "new_password": "NewSecurePass123!"
}
```

**Response (200):**
```json
{
  "message": "Password reset successful. You can now login with your new password."
}
```

#### POST /api/auth/change-password
Change password for authenticated user.

**Headers:**
```
Authorization: Bearer <token>
```

**Request:**
```json
{
  "current_password": "OldPass123!",
  "new_password": "NewPass123!"
}
```

**Response (200):**
```json
{
  "message": "Password changed successfully"
}
```

### Admin Endpoints

#### POST /api/admin/users/{user_id}/role
Change user role (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Request:**
```json
{
  "role": "admin"
}
```

**Response (200):**
```json
{
  "message": "User role updated successfully",
  "user": {
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "role": "admin"
  }
}
```

#### POST /api/admin/users/{user_id}/unlock
Unlock user account (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Response (200):**
```json
{
  "message": "Account unlocked successfully"
}
```

#### GET /api/admin/audit-logs
Get authentication audit logs (admin only).

**Headers:**
```
Authorization: Bearer <admin_token>
```

**Query Parameters:**
- `user_id` (optional): Filter by user ID
- `action` (optional): Filter by action type (login, logout, password_change, etc.)
- `start_date` (optional): Filter by start date
- `end_date` (optional): Filter by end date
- `page` (optional): Page number (default: 1)
- `page_size` (optional): Items per page (default: 20)

**Response (200):**
```json
{
  "items": [
    {
      "id": "770e8400-e29b-41d4-a716-446655440000",
      "user_id": "550e8400-e29b-41d4-a716-446655440000",
      "action": "login",
      "ip_address": "192.168.1.1",
      "user_agent": "Mozilla/5.0...",
      "success": true,
      "timestamp": "2025-01-29T10:30:00Z"
    }
  ],
  "total": 100,
  "page": 1,
  "page_size": 20,
  "total_pages": 5
}
```


## Dependencies

### External Dependencies

This spec depends on the following existing specs:
- **backend-architecture-standards**: Database models, error handling, logging
- **frontend-architecture-standards**: API service, state management, routing

### Internal Module Dependencies

**Backend:**
- `common/modules/db`: Database session and models
- `common/modules/config`: Configuration management
- `common/modules/logger`: Logging infrastructure
- `common/modules/exception`: Error handling
- `common/modules/audit`: Audit logging
- `common/modules/email`: Email notifications

**Frontend:**
- `shared/services/api.service.js`: HTTP client
- `shared/services/logger.service.js`: Frontend logging
- `shared/stores/auth.store.js`: Authentication state
- `shared/utils/storage.js`: Local storage management
- `shared/utils/constants.js`: Constants and enums

### Third-Party Dependencies

**Backend:**
- `passlib[bcrypt]`: Password hashing
- `python-jose[cryptography]`: JWT token handling
- `pydantic`: Data validation
- `sqlalchemy`: ORM
- `hypothesis`: Property-based testing

**Frontend:**
- `axios`: HTTP client
- `zustand`: State management
- `react-router-dom`: Routing
- `jwt-decode`: JWT token decoding

## Performance Considerations

### Database Optimization

**Indexes:**
```sql
-- Token blacklist
CREATE INDEX idx_token_blacklist_token ON token_blacklist(token);
CREATE INDEX idx_token_blacklist_expires_at ON token_blacklist(expires_at);
CREATE INDEX idx_token_blacklist_user_id ON token_blacklist(user_id);

-- Login attempts
CREATE INDEX idx_login_attempts_identifier ON login_attempts(identifier);
CREATE INDEX idx_login_attempts_ip_address ON login_attempts(ip_address);
CREATE INDEX idx_login_attempts_attempted_at ON login_attempts(attempted_at);

-- Members
CREATE INDEX idx_members_role ON members(role);
CREATE INDEX idx_members_email ON members(email);
CREATE INDEX idx_members_business_number ON members(business_number);
```

**Query Optimization:**
- Use connection pooling (SQLAlchemy async pool)
- Implement query result caching for frequently accessed data
- Use database-level constraints for data integrity
- Batch operations for bulk updates

### Caching Strategy

**Token Blacklist Cache:**
- Cache blacklisted tokens in Redis (if available)
- TTL matches token expiration
- Reduces database queries for token validation

**User Role Cache:**
- Cache user roles in memory (short TTL: 5 minutes)
- Invalidate on role change
- Reduces database queries for permission checks

**Rate Limit Cache:**
- Use Redis for rate limit counters
- Sliding window algorithm
- Automatic expiration

### Performance Targets

- **Login**: < 500ms (95th percentile)
- **Token Validation**: < 50ms (95th percentile)
- **Permission Check**: < 10ms (95th percentile)
- **Password Hashing**: < 200ms (bcrypt cost factor 12)
- **Token Blacklist Check**: < 20ms (with caching)

## Monitoring and Observability

### Metrics to Track

**Authentication Metrics:**
- Login success rate
- Login failure rate by reason
- Average login time
- Token generation rate
- Token validation rate
- Token blacklist size

**Security Metrics:**
- Failed login attempts per hour
- Account lockouts per day
- Password reset requests per day
- Suspicious activity alerts
- Rate limit violations

**Performance Metrics:**
- API endpoint response times
- Database query times
- Cache hit rates
- Token validation times

### Alerts

**Critical Alerts:**
- Unusual spike in failed login attempts (> 100/minute)
- High rate of account lockouts (> 10/hour)
- Token blacklist size exceeding threshold (> 10,000)
- Authentication service downtime

**Warning Alerts:**
- Slow authentication response times (> 1 second)
- High cache miss rate (< 80%)
- Approaching rate limits

### Logging

**Log Levels:**
- **ERROR**: Authentication failures, system errors
- **WARNING**: Rate limit violations, suspicious activity
- **INFO**: Successful logins, logouts, password changes
- **DEBUG**: Token validation, permission checks (development only)

**Log Format:**
```json
{
  "timestamp": "2025-01-29T10:30:00Z",
  "level": "INFO",
  "module": "auth.service",
  "action": "login",
  "user_id": "550e8400-e29b-41d4-a716-446655440000",
  "ip_address": "192.168.1.1",
  "user_agent": "Mozilla/5.0...",
  "success": true,
  "duration_ms": 245,
  "trace_id": "abc123def456"
}
```

## Future Enhancements

### Phase 2 Features (Not in Current Scope)

1. **Multi-Factor Authentication (MFA)**
   - TOTP support
   - SMS verification
   - Backup codes
   - Recovery options

2. **OAuth2 Social Login**
   - Google authentication
   - Naver authentication
   - Kakao authentication

3. **API Token Management**
   - Generate API tokens
   - Scope-based permissions
   - Token rotation
   - Usage analytics

4. **Advanced Security Features**
   - Device fingerprinting
   - Anomaly detection
   - Geolocation-based access control
   - Biometric authentication (mobile)

5. **Enhanced Audit Logging**
   - Real-time audit log streaming
   - Advanced search and filtering
   - Compliance reports
   - Automated threat detection

6. **Session Management Dashboard**
   - View active sessions
   - Revoke specific sessions
   - Session history
   - Device management

