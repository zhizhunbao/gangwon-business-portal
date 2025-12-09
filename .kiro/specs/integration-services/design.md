# Design Document - Integration Services

## Introduction

This document describes the design for a unified integration services layer for the Gangwon Business Portal. The design establishes a standardized framework for managing third-party service integrations with consistent error handling, retry logic, circuit breaker protection, monitoring, caching, and rate limiting. The system builds upon existing integrations (Nice D&B API, Email service) and adds new capabilities (SMS service, Korean address search) while providing a robust foundation for future integrations.

## Architecture Overview

### System Components

```
┌─────────────────────────────────────────────────────────────────┐
│                      Application Layer                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Member     │  │    Admin     │  │   Business   │         │
│  │   Module     │  │   Module     │  │    Logic     │         │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │
│         │                  │                  │                  │
│         └──────────────────┴──────────────────┘                 │
└────────────────────────────┼────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                  Integration Service Layer                      │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Base Integration Framework                   │      │
│  │  - Retry Logic                                       │      │
│  │  - Circuit Breaker                                   │      │
│  │  - Rate Limiting                                     │      │
│  │  - Caching                                           │      │
│  │  - Monitoring                                        │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Nice D&B    │  │    Email     │  │     SMS      │         │
│  │ Integration  │  │ Integration  │  │ Integration  │         │
│  └──────────────┘  └────────────��─┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Address    │  │   Webhook    │  │     Mock     │         │
│  │ Integration  │  │   Handler    │  │ Integration  │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Supporting Services                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Cache     │  │   Metrics    │  │    Health    │         │
│  │   Service    │  │  Collector   │  │   Monitor    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    External Services                            │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  Nice D&B    │  │     SMTP     │  │   AWS SNS    │         │
│  │     API      │  │   Providers  │  │   (SMS)      │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐                                               │
│  │    Daum      │                                               │
│  │  Postcode    │                                               │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```


### Component Responsibilities

| Component | Responsibility | Input | Output |
|-----------|---------------|-------|--------|
| **Base Integration** | Provide common functionality for all integrations | Integration config | Standardized interface |
| **Retry Logic** | Automatically retry failed API calls | Failed request | Retry attempts with backoff |
| **Circuit Breaker** | Prevent cascading failures | Failure count | Circuit state (open/closed/half-open) |
| **Rate Limiter** | Control API call frequency | API call request | Allow/deny decision |
| **Cache Service** | Store and retrieve cached responses | Cache key, TTL | Cached data or miss |
| **Metrics Collector** | Track API call metrics | API call events | Metrics (latency, success rate) |
| **Health Monitor** | Check integration health | Health check request | Health status |
| **Nice D&B Integration** | Business information verification | Business number | Company data |
| **Email Integration** | Send emails via SMTP | Email data | Delivery status |
| **SMS Integration** | Send SMS via AWS SNS | Phone number, message | Delivery status |
| **Address Integration** | Korean address search | Search keyword | Address data |
| **Webhook Handler** | Process incoming webhooks | Webhook payload | Processing result |
| **Mock Integration** | Simulate external services | Request data | Mock response |

## Data Models

### 1. Integration Configuration (integration_configs table - new)

**Purpose**: Store configuration for each integration

**Schema**:
```sql
CREATE TABLE integration_configs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Integration metadata
    integration_name VARCHAR(50) NOT NULL UNIQUE,  -- 'nice_dnb', 'email', 'sms', 'address'
    integration_type VARCHAR(50) NOT NULL,  -- 'api', 'smtp', 'webhook'
    is_enabled BOOLEAN DEFAULT TRUE,
    is_mock_mode BOOLEAN DEFAULT FALSE,
    
    -- API configuration
    base_url TEXT,
    api_key_encrypted TEXT,
    timeout_seconds INTEGER DEFAULT 30,
    
    -- Retry configuration
    max_retries INTEGER DEFAULT 3,
    retry_backoff_factor FLOAT DEFAULT 2.0,
    retry_max_delay_seconds INTEGER DEFAULT 60,
    
    -- Circuit breaker configuration
    circuit_breaker_enabled BOOLEAN DEFAULT TRUE,
    circuit_breaker_failure_threshold INTEGER DEFAULT 5,
    circuit_breaker_timeout_seconds INTEGER DEFAULT 60,
    
    -- Rate limiting configuration
    rate_limit_enabled BOOLEAN DEFAULT TRUE,
    rate_limit_calls_per_minute INTEGER DEFAULT 60,
    rate_limit_calls_per_hour INTEGER DEFAULT 1000,
    
    -- Caching configuration
    cache_enabled BOOLEAN DEFAULT TRUE,
    cache_ttl_seconds INTEGER DEFAULT 3600,
    
    -- Additional configuration (JSON)
    extra_config JSONB
);

-- Indexes
CREATE INDEX idx_integration_configs_name ON integration_configs(integration_name);
CREATE INDEX idx_integration_configs_enabled ON integration_configs(is_enabled) WHERE is_enabled = TRUE;
```


### 2. Integration Call Logs (integration_call_logs table - new)

**Purpose**: Log all API calls for monitoring and debugging

**Schema**:
```sql
CREATE TABLE integration_call_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Integration info
    integration_name VARCHAR(50) NOT NULL,
    integration_type VARCHAR(50) NOT NULL,
    
    -- Request info
    request_method VARCHAR(10),
    request_url TEXT,
    request_headers JSONB,
    request_body JSONB,
    
    -- Response info
    response_status INTEGER,
    response_headers JSONB,
    response_body JSONB,
    
    -- Timing
    duration_ms INTEGER,
    
    -- Result
    is_success BOOLEAN,
    error_message TEXT,
    error_type VARCHAR(50),
    
    -- Context
    user_id UUID,
    trace_id VARCHAR(255),
    
    -- Retry info
    retry_count INTEGER DEFAULT 0,
    is_from_cache BOOLEAN DEFAULT FALSE,
    
    -- Circuit breaker state
    circuit_breaker_state VARCHAR(20)  -- 'closed', 'open', 'half_open'
);

-- Indexes
CREATE INDEX idx_integration_call_logs_integration_name ON integration_call_logs(integration_name);
CREATE INDEX idx_integration_call_logs_created_at ON integration_call_logs(created_at DESC);
CREATE INDEX idx_integration_call_logs_is_success ON integration_call_logs(is_success);
CREATE INDEX idx_integration_call_logs_trace_id ON integration_call_logs(trace_id);
CREATE INDEX idx_integration_call_logs_user_id ON integration_call_logs(user_id);
```

### 3. Integration Metrics (integration_metrics table - new)

**Purpose**: Store aggregated metrics for each integration

**Schema**:
```sql
CREATE TABLE integration_metrics (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Integration info
    integration_name VARCHAR(50) NOT NULL,
    
    -- Time window
    metric_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    window_minutes INTEGER DEFAULT 5,  -- 5-minute windows
    
    -- Call counts
    total_calls INTEGER DEFAULT 0,
    successful_calls INTEGER DEFAULT 0,
    failed_calls INTEGER DEFAULT 0,
    cached_calls INTEGER DEFAULT 0,
    
    -- Response times (milliseconds)
    avg_response_time FLOAT,
    p50_response_time INTEGER,
    p95_response_time INTEGER,
    p99_response_time INTEGER,
    max_response_time INTEGER,
    
    -- Error stats
    error_rate FLOAT,  -- Percentage
    timeout_count INTEGER DEFAULT 0,
    
    -- Circuit breaker stats
    circuit_breaker_open_count INTEGER DEFAULT 0,
    
    -- Rate limiting stats
    rate_limited_count INTEGER DEFAULT 0,
    
    -- Cache stats
    cache_hit_rate FLOAT  -- Percentage
);

-- Indexes
CREATE INDEX idx_integration_metrics_name_timestamp ON integration_metrics(integration_name, metric_timestamp DESC);
CREATE INDEX idx_integration_metrics_timestamp ON integration_metrics(metric_timestamp DESC);
```


### 4. Integration Health Status (integration_health table - new)

**Purpose**: Track current health status of each integration

**Schema**:
```sql
CREATE TABLE integration_health (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Integration info
    integration_name VARCHAR(50) NOT NULL UNIQUE,
    
    -- Health status
    status VARCHAR(20) NOT NULL,  -- 'healthy', 'degraded', 'unhealthy'
    last_check_at TIMESTAMP WITH TIME ZONE,
    last_success_at TIMESTAMP WITH TIME ZONE,
    last_failure_at TIMESTAMP WITH TIME ZONE,
    
    -- Failure tracking
    consecutive_failures INTEGER DEFAULT 0,
    total_failures_24h INTEGER DEFAULT 0,
    
    -- Circuit breaker state
    circuit_breaker_state VARCHAR(20) DEFAULT 'closed',  -- 'closed', 'open', 'half_open'
    circuit_opened_at TIMESTAMP WITH TIME ZONE,
    
    -- Health check details
    health_check_message TEXT,
    health_check_details JSONB
);

-- Indexes
CREATE INDEX idx_integration_health_name ON integration_health(integration_name);
CREATE INDEX idx_integration_health_status ON integration_health(status);
```

### 5. Webhook Events (webhook_events table - new)

**Purpose**: Store incoming webhook events for processing

**Schema**:
```sql
CREATE TABLE webhook_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Webhook info
    integration_name VARCHAR(50) NOT NULL,
    event_type VARCHAR(100) NOT NULL,
    
    -- Request data
    headers JSONB,
    payload JSONB,
    signature VARCHAR(255),
    signature_verified BOOLEAN,
    
    -- Processing status
    status VARCHAR(20) DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
    processed_at TIMESTAMP WITH TIME ZONE,
    retry_count INTEGER DEFAULT 0,
    
    -- Result
    processing_result JSONB,
    error_message TEXT
);

-- Indexes
CREATE INDEX idx_webhook_events_integration_name ON webhook_events(integration_name);
CREATE INDEX idx_webhook_events_status ON webhook_events(status);
CREATE INDEX idx_webhook_events_created_at ON webhook_events(created_at DESC);
```

## Component Design

### 1. Base Integration Class

**File**: `backend/src/common/modules/integration/base.py`

**Purpose**: Provide common functionality for all integrations

**Methods**:
```python
class BaseIntegration(ABC):
    def __init__(self, config: IntegrationConfig):
        self.config = config
        self.circuit_breaker = CircuitBreaker(config)
        self.rate_limiter = RateLimiter(config)
        self.cache = CacheService(config)
        self.metrics = MetricsCollector(config)
        
    @abstractmethod
    async def _make_request(self, **kwargs) -> Any:
        """Implement actual API call logic"""
        pass
        
    async def call(self, **kwargs) -> IntegrationResponse:
        """Main entry point with retry, circuit breaker, caching"""
        # Check circuit breaker
        if self.circuit_breaker.is_open():
            return await self._handle_circuit_open(**kwargs)
            
        # Check cache
        cache_key = self._generate_cache_key(**kwargs)
        cached_response = await self.cache.get(cache_key)
        if cached_response:
            return cached_response
            
        # Check rate limit
        await self.rate_limiter.acquire()
        
        # Make request with retry
        response = await self._call_with_retry(**kwargs)
        
        # Cache response
        if response.is_success:
            await self.cache.set(cache_key, response)
            
        # Collect metrics
        await self.metrics.record(response)
        
        return response
        
    async def _call_with_retry(self, **kwargs) -> IntegrationResponse:
        """Execute request with retry logic"""
        
    async def _handle_circuit_open(self, **kwargs) -> IntegrationResponse:
        """Handle requests when circuit breaker is open"""
        
    def _generate_cache_key(self, **kwargs) -> str:
        """Generate cache key from request parameters"""
        
    async def health_check(self) -> HealthCheckResult:
        """Perform health check"""
```


### 2. Circuit Breaker

**File**: `backend/src/common/modules/integration/circuit_breaker.py`

**Purpose**: Implement circuit breaker pattern to prevent cascading failures

**Methods**:
```python
class CircuitBreaker:
    def __init__(self, config: IntegrationConfig):
        self.failure_threshold = config.circuit_breaker_failure_threshold
        self.timeout = config.circuit_breaker_timeout_seconds
        self.state = CircuitState.CLOSED
        self.failure_count = 0
        self.last_failure_time = None
        self.opened_at = None
        
    def is_open(self) -> bool:
        """Check if circuit breaker is open"""
        
    def is_half_open(self) -> bool:
        """Check if circuit breaker is in half-open state"""
        
    async def record_success(self):
        """Record successful call"""
        
    async def record_failure(self):
        """Record failed call and potentially open circuit"""
        
    async def attempt_reset(self):
        """Attempt to close circuit after timeout"""
        
    def get_state(self) -> str:
        """Get current circuit breaker state"""
```

### 3. Rate Limiter

**File**: `backend/src/common/modules/integration/rate_limiter.py`

**Purpose**: Implement token bucket algorithm for rate limiting

**Methods**:
```python
class RateLimiter:
    def __init__(self, config: IntegrationConfig):
        self.calls_per_minute = config.rate_limit_calls_per_minute
        self.calls_per_hour = config.rate_limit_calls_per_hour
        self.minute_bucket = TokenBucket(self.calls_per_minute, 60)
        self.hour_bucket = TokenBucket(self.calls_per_hour, 3600)
        
    async def acquire(self) -> bool:
        """Acquire token, wait if necessary"""
        
    async def try_acquire(self) -> bool:
        """Try to acquire token without waiting"""
        
    def get_available_tokens(self) -> dict:
        """Get available tokens in each bucket"""
        
class TokenBucket:
    def __init__(self, capacity: int, refill_period: int):
        self.capacity = capacity
        self.tokens = capacity
        self.refill_period = refill_period
        self.last_refill = time.time()
        
    async def consume(self, tokens: int = 1) -> bool:
        """Consume tokens from bucket"""
        
    def refill(self):
        """Refill tokens based on elapsed time"""
```

### 4. Cache Service

**File**: `backend/src/common/modules/integration/cache.py`

**Purpose**: Cache API responses to reduce costs and improve performance

**Methods**:
```python
class CacheService:
    def __init__(self, config: IntegrationConfig):
        self.ttl = config.cache_ttl_seconds
        self.enabled = config.cache_enabled
        self.redis_client = get_redis_client()  # Or in-memory cache
        
    async def get(self, key: str) -> Optional[Any]:
        """Get cached value"""
        
    async def set(self, key: str, value: Any, ttl: Optional[int] = None):
        """Set cached value with TTL"""
        
    async def delete(self, key: str):
        """Delete cached value"""
        
    async def delete_pattern(self, pattern: str):
        """Delete all keys matching pattern"""
        
    async def get_stats(self) -> CacheStats:
        """Get cache hit/miss statistics"""
```


### 5. Metrics Collector

**File**: `backend/src/common/modules/integration/metrics.py`

**Purpose**: Collect and aggregate metrics for monitoring

**Methods**:
```python
class MetricsCollector:
    def __init__(self, config: IntegrationConfig):
        self.integration_name = config.integration_name
        
    async def record(self, response: IntegrationResponse):
        """Record API call metrics"""
        
    async def record_call_log(self, log_data: dict):
        """Store detailed call log"""
        
    async def aggregate_metrics(self, window_minutes: int = 5):
        """Aggregate metrics for time window"""
        
    async def get_metrics(
        self,
        start_time: datetime,
        end_time: datetime
    ) -> List[IntegrationMetrics]:
        """Get metrics for time range"""
        
    async def calculate_percentiles(
        self,
        response_times: List[int]
    ) -> dict:
        """Calculate p50, p95, p99 percentiles"""
```

### 6. Health Monitor

**File**: `backend/src/common/modules/integration/health.py`

**Purpose**: Monitor integration health and perform health checks

**Methods**:
```python
class HealthMonitor:
    def __init__(self):
        self.integrations = {}
        
    async def register_integration(self, integration: BaseIntegration):
        """Register integration for health monitoring"""
        
    async def check_health(self, integration_name: str) -> HealthStatus:
        """Perform health check for integration"""
        
    async def check_all_health(self) -> dict:
        """Check health of all integrations"""
        
    async def update_health_status(
        self,
        integration_name: str,
        status: str,
        details: dict
    ):
        """Update health status in database"""
        
    async def get_health_status(self, integration_name: str) -> HealthStatus:
        """Get current health status"""
        
    async def alert_on_degradation(self, integration_name: str):
        """Send alert when health degrades"""
```

### 7. Nice D&B Integration

**File**: `backend/src/modules/integration/nice_dnb.py`

**Purpose**: Business information verification via Nice D&B API

**Methods**:
```python
class NiceDnBIntegration(BaseIntegration):
    async def search_company(
        self,
        business_number: str
    ) -> CompanyInfo:
        """Search company by business registration number"""
        
    async def search_representative(
        self,
        name: str,
        business_number: str
    ) -> RepresentativeInfo:
        """Search company representative"""
        
    async def _make_request(self, **kwargs) -> Any:
        """Implement Nice D&B API call"""
```

### 8. Email Integration

**File**: `backend/src/common/modules/email/service.py` (enhance existing)

**Purpose**: Send emails via SMTP with multiple provider support

**Methods**:
```python
class EmailIntegration(BaseIntegration):
    async def send_email(
        self,
        to: str,
        subject: str,
        body: str,
        template: Optional[str] = None,
        variables: Optional[dict] = None
    ) -> EmailResult:
        """Send email with optional template"""
        
    async def send_bulk_email(
        self,
        recipients: List[str],
        subject: str,
        body: str
    ) -> List[EmailResult]:
        """Send email to multiple recipients"""
        
    async def render_template(
        self,
        template: str,
        variables: dict
    ) -> str:
        """Render email template with variables"""
        
    async def track_delivery_status(
        self,
        email_id: str
    ) -> DeliveryStatus:
        """Track email delivery status"""
```


### 9. SMS Integration

**File**: `backend/src/common/modules/sms/service.py` (new)

**Purpose**: Send SMS messages via AWS SNS

**Methods**:
```python
class SMSIntegration(BaseIntegration):
    async def send_sms(
        self,
        phone_number: str,
        message: str
    ) -> SMSResult:
        """Send SMS message"""
        
    async def send_bulk_sms(
        self,
        phone_numbers: List[str],
        message: str
    ) -> List[SMSResult]:
        """Send SMS to multiple recipients"""
        
    async def validate_phone_number(
        self,
        phone_number: str
    ) -> bool:
        """Validate phone number format"""
        
    async def track_delivery_status(
        self,
        sms_id: str
    ) -> DeliveryStatus:
        """Track SMS delivery status"""
        
    async def _make_request(self, **kwargs) -> Any:
        """Implement AWS SNS API call"""
```

### 10. Korean Address Search Integration

**File**: `backend/src/modules/integration/address.py` (new)

**Purpose**: Korean address search via Daum Postcode API

**Methods**:
```python
class AddressIntegration(BaseIntegration):
    async def search_address(
        self,
        keyword: str
    ) -> List[AddressResult]:
        """Search addresses by keyword"""
        
    async def get_address_details(
        self,
        postal_code: str
    ) -> AddressDetails:
        """Get detailed address information"""
        
    async def _make_request(self, **kwargs) -> Any:
        """Implement Daum Postcode API call"""
```

### 11. Webhook Handler

**File**: `backend/src/common/modules/integration/webhook.py` (new)

**Purpose**: Handle incoming webhooks from external services

**Methods**:
```python
class WebhookHandler:
    def __init__(self):
        self.handlers = {}
        
    def register_handler(
        self,
        integration_name: str,
        event_type: str,
        handler: Callable
    ):
        """Register webhook event handler"""
        
    async def process_webhook(
        self,
        integration_name: str,
        headers: dict,
        payload: dict
    ) -> WebhookResult:
        """Process incoming webhook"""
        
    async def verify_signature(
        self,
        integration_name: str,
        headers: dict,
        payload: dict
    ) -> bool:
        """Verify webhook signature"""
        
    async def store_webhook_event(
        self,
        integration_name: str,
        event_type: str,
        headers: dict,
        payload: dict,
        signature_verified: bool
    ) -> UUID:
        """Store webhook event in database"""
        
    async def retry_failed_webhook(
        self,
        webhook_id: UUID
    ):
        """Retry failed webhook processing"""
```

### 12. Mock Integration

**File**: `backend/src/common/modules/integration/mock.py` (new)

**Purpose**: Provide mock implementations for testing

**Methods**:
```python
class MockIntegration(BaseIntegration):
    def __init__(self, config: IntegrationConfig):
        super().__init__(config)
        self.mock_responses = {}
        self.simulate_errors = False
        self.simulate_delay = 0
        
    def set_mock_response(
        self,
        request_pattern: dict,
        response: Any
    ):
        """Set mock response for request pattern"""
        
    def enable_error_simulation(
        self,
        error_rate: float = 0.1
    ):
        """Enable error simulation"""
        
    def set_delay(self, delay_ms: int):
        """Set simulated delay"""
        
    async def _make_request(self, **kwargs) -> Any:
        """Return mock response"""
```


## Data Flow

### 1. API Call Flow with Retry and Circuit Breaker

```
Application calls integration
    ↓
BaseIntegration.call()
    ↓
Check circuit breaker state
    ├─ Open → Return cached/fallback response
    └─ Closed/Half-Open → Continue
    ↓
Generate cache key
    ↓
Check cache
    ├─ Hit → Return cached response
    └─ Miss → Continue
    ↓
Acquire rate limit token
    ↓
Attempt 1: Make API request
    ├─ Success → Cache response, record metrics, return
    └─ Failure → Continue to retry
    ↓
Wait (exponential backoff)
    ↓
Attempt 2: Make API request
    ├─ Success → Cache response, record metrics, return
    └─ Failure → Continue to retry
    ↓
Wait (exponential backoff)
    ↓
Attempt 3: Make API request
    ├─ Success → Cache response, record metrics, return
    └─ Failure → Record failure, update circuit breaker
    ↓
Check consecutive failures
    ├─ >= threshold → Open circuit breaker
    └─ < threshold → Keep circuit closed
    ↓
Return error response with fallback data if available
```

### 2. Health Check Flow

```
Scheduled task (every 5 minutes)
    ↓
Health Monitor
    ↓
For each registered integration:
    ↓
    Call integration.health_check()
        ↓
        Make test API call
        ↓
        Check response
            ├─ Success → Status = healthy
            ├─ Slow response → Status = degraded
            └─ Failure → Status = unhealthy
    ↓
    Update integration_health table
    ↓
    Check if status changed
        ├─ Degraded/Unhealthy → Send alert
        └─ No change → Continue
    ↓
Return aggregated health status
```

### 3. Webhook Processing Flow

```
External service sends webhook
    ↓
POST /api/v1/webhooks/{integration_name}
    ↓
Webhook Handler
    ↓
Verify webhook signature
    ├─ Invalid → Return 401 Unauthorized
    └─ Valid → Continue
    ↓
Store webhook event in database (status: pending)
    ↓
Return 200 OK (acknowledge receipt)
    ↓
Process webhook asynchronously
    ↓
Find registered handler for event type
    ├─ Not found → Mark as failed
    └─ Found → Execute handler
        ↓
        Handler processes event
            ├─ Success → Mark as completed
            └─ Failure → Mark as failed, schedule retry
    ↓
Update webhook_events table with result
```

### 4. Metrics Collection Flow

```
API call completes
    ↓
Metrics Collector.record()
    ↓
Create integration_call_logs record
    - Integration name
    - Request/response details
    - Duration
    - Success/failure
    - Trace ID
    ↓
Update in-memory metrics buffer
    ↓
Every 5 minutes (scheduled task):
    ↓
    Aggregate metrics from buffer
        - Calculate success/failure rates
        - Calculate percentiles (p50, p95, p99)
        - Calculate cache hit rate
    ↓
    Create integration_metrics record
    ↓
    Clear buffer
    ↓
    Check alert thresholds
        ├─ Failure rate > 10% → Send alert
        └─ OK → Continue
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Integration Call Logging
*For any* integration call, a log entry should be created with provider, endpoint, duration, and status.

**Validates: Requirements 1.4, 7.1**

### Property 2: Metrics Collection
*For any* integration call, metrics should be collected and recorded.

**Validates: Requirements 1.5, 7.2, 7.3**

### Property 3: Company Search Functionality
*For any* valid business registration number, the Nice D&B integration should return company information or a valid error.

**Validates: Requirements 2.1**

### Property 4: Representative Search Functionality
*For any* valid name and business registration number combination, the Nice D&B integration should return representative information or a valid error.

**Validates: Requirements 2.2**

### Property 5: Nice D&B Response Caching
*For any* Nice D&B API call, if the same request is made within 24 hours, the cached response should be returned.

**Validates: Requirements 2.3**

### Property 6: Nice D&B Fallback on Failure
*For any* Nice D&B API failure, if cached data exists, it should be returned.

**Validates: Requirements 2.4**

### Property 7: Email Template Variable Substitution
*For any* email template with variables, all variables should be correctly substituted in the rendered output.

**Validates: Requirements 3.2**

### Property 8: Email Delivery Status Tracking
*For any* email sent, a delivery status record should be created and tracked.

**Validates: Requirements 3.3**

### Property 9: Email Retry on Failure
*For any* failed email send, the system should retry up to 3 times before marking as permanently failed.

**Validates: Requirements 3.4**

### Property 10: Email Operation Logging
*For any* email operation, a log entry should be created with recipient, subject, and status.

**Validates: Requirements 3.5**

### Property 11: SMS Sending Functionality
*For any* valid phone number and message, the SMS integration should send the message or return a valid error.

**Validates: Requirements 4.1**

### Property 12: Phone Number Validation
*For any* SMS send attempt, phone number validation should occur before sending.

**Validates: Requirements 4.2**

### Property 13: SMS Delivery Status Tracking
*For any* SMS sent, a delivery status record should be created and tracked.

**Validates: Requirements 4.3**

### Property 14: SMS Retry on Failure
*For any* failed SMS send, the system should retry up to 3 times before marking as permanently failed.

**Validates: Requirements 4.4**

### Property 15: SMS Rate Limiting
*For any* series of SMS sends, the rate limit should be enforced to prevent exceeding provider limits.

**Validates: Requirements 4.5**

### Property 16: Address Search Functionality
*For any* search keyword, the address integration should return matching addresses or an empty list.

**Validates: Requirements 5.2**

### Property 17: Address Data Structure
*For any* address search result, it should contain postal code, address, and detailed address fields.

**Validates: Requirements 5.3**

### Property 18: Address Search Caching
*For any* address search, repeated searches for the same keyword should use cached results.

**Validates: Requirements 5.4**

### Property 19: API Call Retry with Exponential Backoff
*For any* failed API call, it should be retried up to 3 times with exponentially increasing delays.

**Validates: Requirements 6.1**

### Property 20: Circuit Breaker Opening
*For any* integration with 5 consecutive failures, the circuit breaker should open.

**Validates: Requirements 6.3**

### Property 21: Circuit Breaker Fallback
*For any* API call when circuit breaker is open, cached data or fallback response should be returned.

**Validates: Requirements 6.4**

### Property 22: Circuit Breaker Auto-Recovery
*For any* opened circuit breaker, it should automatically attempt to close after 60 seconds.

**Validates: Requirements 6.5**

### Property 23: API Call Detailed Logging
*For any* API call, request and response details should be logged with all required fields.

**Validates: Requirements 7.1, 14.1, 14.2**

### Property 24: Success/Failure Rate Tracking
*For any* series of API calls, success and failure rates should be accurately calculated.

**Validates: Requirements 7.2**

### Property 25: Response Time Percentile Tracking
*For any* series of API calls, p50, p95, and p99 response time percentiles should be calculated.

**Validates: Requirements 7.3**

### Property 26: High Failure Rate Alerting
*For any* integration with failure rate exceeding 10%, an alert should be generated.

**Validates: Requirements 7.4**

### Property 27: Rate Limit Enforcement
*For any* API provider, the configured rate limit should be enforced.

**Validates: Requirements 8.1**

### Property 28: Rate Limit Queuing
*For any* API call when rate limit is reached, the call should be queued until tokens are available.

**Validates: Requirements 8.2**

### Property 29: Rate Limit Violation Logging
*For any* rate limit violation, a log entry should be created.

**Validates: Requirements 8.4**

### Property 30: Cache TTL Expiration
*For any* cached response, it should expire after the configured TTL.

**Validates: Requirements 9.1**

### Property 31: Cache Key Generation
*For any* API request, the cache key should be derived from request parameters.

**Validates: Requirements 9.2**

### Property 32: Cache Invalidation
*For any* cache invalidation request, matching cache entries should be removed.

**Validates: Requirements 9.3**

### Property 33: Cache Hit/Miss Rate Tracking
*For any* series of cache operations, hit and miss rates should be accurately tracked.

**Validates: Requirements 9.4**

### Property 34: Configuration Validation on Startup
*For any* invalid configuration, the system should detect and report errors on startup.

**Validates: Requirements 10.3**

### Property 35: Runtime Configuration Updates
*For any* configuration update, changes should take effect without requiring system restart.

**Validates: Requirements 10.5**

### Property 36: Error Message Context
*For any* integration error, the error message should include context information.

**Validates: Requirements 11.2**

### Property 37: Integration Error Logging
*For any* integration error, a log entry with full context should be created.

**Validates: Requirements 11.4**

### Property 38: Sensitive Data Redaction in Errors
*For any* error message shown to end users, sensitive API details should be redacted.

**Validates: Requirements 11.5**

### Property 39: Periodic Health Checks
*For any* registered integration, health checks should be performed every 5 minutes.

**Validates: Requirements 12.2**

### Property 40: Health Status Reporting
*For any* integration, health status should be one of: healthy, degraded, or unhealthy.

**Validates: Requirements 12.3**

### Property 41: Health Check in System Endpoint
*For any* system health check request, integration health results should be included.

**Validates: Requirements 12.4**

### Property 42: Health Degradation Alerting
*For any* integration health degradation, an alert should be generated.

**Validates: Requirements 12.5**

### Property 43: Mock Mode Configuration
*For any* integration with mock mode enabled, mock responses should be returned instead of real API calls.

**Validates: Requirements 13.2**

### Property 44: Mock Response Realism
*For any* request in mock mode, the response should be realistic based on request parameters.

**Validates: Requirements 13.3**

### Property 45: Mock Error Simulation
*For any* mock integration with error simulation enabled, errors should be simulated according to configuration.

**Validates: Requirements 13.4**

### Property 46: Mock Mode Logging
*For any* API call in mock mode, a log entry should indicate mock mode is active.

**Validates: Requirements 13.5**

### Property 47: API Request Logging
*For any* API request, method, URL, headers, and body should be logged.

**Validates: Requirements 14.1**

### Property 48: API Response Logging
*For any* API response, status, headers, and body should be logged.

**Validates: Requirements 14.2**

### Property 49: Sensitive Data Redaction in Logs
*For any* log entry, sensitive data (API keys, passwords) should be redacted.

**Validates: Requirements 14.3**

### Property 50: Trace ID in Integration Logs
*For any* integration log entry, a trace_id should be present for correlation.

**Validates: Requirements 14.4**

### Property 51: Webhook Signature Verification
*For any* incoming webhook, the signature should be verified before processing.

**Validates: Requirements 15.2**

### Property 52: Webhook Processing Retry
*For any* failed webhook processing, it should be retried according to retry policy.

**Validates: Requirements 15.4**

### Property 53: Webhook Event Logging
*For any* webhook event, a log entry should be created.

**Validates: Requirements 15.5**


## Security Considerations

### 1. API Key Management

- **Encrypted storage**: API keys stored encrypted in database
- **Environment variables**: Load sensitive credentials from environment
- **Key rotation**: Support for rotating API keys without downtime
- **Access control**: Restrict access to integration configurations to admins only

### 2. Webhook Security

- **Signature verification**: Verify webhook signatures using HMAC-SHA256
- **IP whitelisting**: Optional IP whitelist for webhook sources
- **Rate limiting**: Prevent webhook flooding attacks
- **Replay protection**: Detect and reject replayed webhook requests

### 3. Data Protection

- **Sensitive data redaction**: Automatic redaction in logs and error messages
- **TLS/HTTPS**: All external API calls over HTTPS
- **Request/response encryption**: Encrypt sensitive data in transit
- **Audit logging**: Log all integration configuration changes

### 4. Error Handling

- **No sensitive data in errors**: Never expose API keys or secrets in error messages
- **Generic error messages**: Show generic errors to end users, detailed errors in logs
- **Error rate monitoring**: Alert on unusual error patterns

## Performance Considerations

### 1. Caching Strategy

- **Response caching**: Cache API responses with configurable TTL
- **Cache warming**: Pre-populate cache for frequently accessed data
- **Cache invalidation**: Intelligent cache invalidation on data updates
- **Distributed cache**: Use Redis for shared cache across instances

### 2. Rate Limiting

- **Token bucket algorithm**: Smooth rate limiting with burst support
- **Per-integration limits**: Different limits for different providers
- **Graceful degradation**: Queue requests when rate limit reached
- **Rate limit monitoring**: Track rate limit usage and violations

### 3. Async Processing

- **Non-blocking calls**: All integration calls are async
- **Background tasks**: Process webhooks and retries in background
- **Connection pooling**: Reuse HTTP connections for better performance
- **Timeout management**: Set appropriate timeouts for each integration

### 4. Database Optimization

- **Indexes**: Comprehensive indexes on frequently queried fields
- **Partitioning**: Partition call logs by date for better performance
- **Archival**: Archive old logs to reduce active table size
- **Query optimization**: Use efficient queries for metrics aggregation

## Testing Strategy

### 1. Unit Tests

- Test each integration class independently
- Test retry logic with simulated failures
- Test circuit breaker state transitions
- Test rate limiter token consumption
- Test cache operations (get, set, invalidate)
- Test metrics calculation

### 2. Integration Tests

- Test end-to-end API call flow
- Test webhook processing flow
- Test health check execution
- Test configuration loading and validation
- Test error handling and fallback

### 3. Property-Based Tests

- Verify correctness properties (see Correctness Properties section)
- Use Hypothesis (Python) for property-based testing
- Test with randomly generated request data
- Test retry logic with random failure patterns
- Test rate limiting with random call patterns

### 4. Mock Testing

- Test all integrations in mock mode
- Verify mock responses match real API structure
- Test error simulation in mock mode
- Test development workflow with mocks

### 5. Load Testing

- Test rate limiting under high load
- Test circuit breaker under sustained failures
- Test cache performance with high hit rates
- Test metrics collection performance

## Deployment Considerations

### 1. Configuration

- Load integration configs from environment variables
- Support per-environment configuration (dev, staging, prod)
- Validate all configurations on startup
- Provide configuration templates and documentation

### 2. Monitoring

- Monitor API call success/failure rates
- Monitor response times and percentiles
- Monitor circuit breaker state changes
- Monitor rate limit usage
- Monitor cache hit/miss rates
- Alert on integration health degradation

### 3. Logging

- Structured logging for all integration operations
- Include trace_id for request correlation
- Redact sensitive data in logs
- Aggregate logs for analysis

### 4. Scaling

- Horizontal scaling: Multiple instances share cache and metrics
- Distributed rate limiting: Use Redis for shared rate limit state
- Load balancing: Distribute webhook processing across instances
- Database connection pooling: Efficient database usage

## Future Enhancements

### 1. Advanced Features

- **GraphQL support**: Add support for GraphQL APIs
- **gRPC support**: Add support for gRPC services
- **WebSocket support**: Add support for WebSocket connections
- **Batch operations**: Optimize bulk API calls

### 2. Enhanced Monitoring

- **Distributed tracing**: OpenTelemetry integration
- **Real-time dashboards**: Live integration health monitoring
- **Anomaly detection**: ML-based anomaly detection for API calls
- **Cost tracking**: Track API usage costs per integration

### 3. Developer Experience

- **Integration SDK**: Provide SDK for easy integration development
- **Testing tools**: Enhanced testing utilities and fixtures
- **Documentation generator**: Auto-generate API documentation
- **Integration marketplace**: Share and discover integrations

### 4. Reliability

- **Multi-region support**: Failover to backup regions
- **Chaos engineering**: Built-in chaos testing capabilities
- **SLA monitoring**: Track and report on SLA compliance
- **Automated recovery**: Self-healing capabilities

## References

- [Backend Architecture Standards](../backend-architecture-standards/design.md)
- [Logging and Monitoring Spec](../logging-and-monitoring/design.md)
- [Audit and Compliance Spec](../audit-and-compliance/design.md)
- [Nice D&B API Documentation](https://www.nicednb.co.kr/)
- [AWS SNS Documentation](https://docs.aws.amazon.com/sns/)
- [Daum Postcode API](https://postcode.map.daum.net/guide)

