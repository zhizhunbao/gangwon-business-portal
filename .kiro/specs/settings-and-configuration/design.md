# Design Document - Settings and Configuration

## Introduction

This document describes the design for a dynamic configuration management system for the Gangwon Business Portal. The design establishes a flexible, version-controlled configuration framework that allows business users to manage system behavior without code changes. The system supports business domain configurations, industry cooperation categories, intellectual property classifications, terms and conditions management, with comprehensive auditing, caching, and import/export capabilities.

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
│                  Configuration Service Layer                    │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────────────────────────────────────────────┐      │
│  │         Configuration Manager                        │      │
│  │  - CRUD Operations                                   │      │
│  │  - Validation                                        │      │
│  │  - Versioning                                        │      │
│  │  - Caching                                           │      │
│  └──────────────────────────────────────────────────────┘      │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   Business   │  │   Industry   │  │      IP      │         │
│  │   Domain     │  │ Cooperation  │  │Classification│         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Terms     │  │    Import    │  │    Export    │         │
│  │   Service    │  │   Service    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    Supporting Services                          │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    Cache     │  │   Version    │  │    Audit     │         │
│  │   Service    │  │   Manager    │  │   Service    │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐                            │
│  │  Dependency  │  │  Validation  │                            │
│  │   Tracker    │  │   Service    │                            │
│  └──────────────┘  └──────────────┘                            │
└─────────────────────────────────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                      Storage Layer                              │
├─────────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │   business   │  │   industry   │  │      ip      │         │
│  │   _domains   │  │_cooperation  │  │_classifications│       │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │    terms     │  │configuration │  │configuration │         │
│  │_conditions   │  │  _versions   │  │_audit_logs   │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
```


### Component Responsibilities

| Component | Responsibility | Input | Output |
|-----------|---------------|-------|--------|
| **Configuration Manager** | Coordinate all configuration operations | Configuration requests | Configuration data |
| **Business Domain Service** | Manage business domain categories | CRUD requests | Business domain data |
| **Industry Cooperation Service** | Manage industry cooperation categories | CRUD requests | Industry cooperation data |
| **IP Classification Service** | Manage IP classification types | CRUD requests | IP classification data |
| **Terms Service** | Manage terms and conditions versions | CRUD requests | Terms data |
| **Import Service** | Import configurations from JSON | JSON file | Import result |
| **Export Service** | Export configurations to JSON | Export request | JSON file |
| **Cache Service** | Cache frequently accessed configurations | Cache key | Cached data or miss |
| **Version Manager** | Track configuration versions | Configuration changes | Version records |
| **Audit Service** | Log all configuration changes | Change events | Audit logs |
| **Dependency Tracker** | Track configuration usage | Configuration ID | Dependency list |
| **Validation Service** | Validate configuration data | Configuration data | Validation result |

## Data Models

### 1. Business Domains (business_domains table - new)

**Purpose**: Store business domain categories for company classification

**Schema**:
```sql
CREATE TABLE business_domains (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Domain info
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by UUID REFERENCES members(id),
    updated_by UUID REFERENCES members(id)
);

-- Indexes
CREATE INDEX idx_business_domains_code ON business_domains(code);
CREATE INDEX idx_business_domains_is_active ON business_domains(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_business_domains_display_order ON business_domains(display_order);
```

### 2. Industry Cooperation Categories (industry_cooperation_categories table - new)

**Purpose**: Store industry-academia cooperation field categories

**Schema**:
```sql
CREATE TABLE industry_cooperation_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Category info
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    
    -- Hierarchy
    parent_id UUID REFERENCES industry_cooperation_categories(id),
    level INTEGER DEFAULT 0,
    path VARCHAR(500),  -- Materialized path for hierarchy
    
    -- Display
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by UUID REFERENCES members(id),
    updated_by UUID REFERENCES members(id)
);

-- Indexes
CREATE INDEX idx_industry_cooperation_code ON industry_cooperation_categories(code);
CREATE INDEX idx_industry_cooperation_parent ON industry_cooperation_categories(parent_id);
CREATE INDEX idx_industry_cooperation_is_active ON industry_cooperation_categories(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_industry_cooperation_display_order ON industry_cooperation_categories(display_order);
```

### 3. IP Classifications (ip_classifications table - new)

**Purpose**: Store intellectual property classification types

**Schema**:
```sql
CREATE TABLE ip_classifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Classification info
    code VARCHAR(50) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    classification_type VARCHAR(50) NOT NULL,  -- 'patent', 'trademark', 'copyright', 'design'
    
    -- Hierarchy (for subtypes)
    parent_id UUID REFERENCES ip_classifications(id),
    level INTEGER DEFAULT 0,
    
    -- Display
    display_order INTEGER DEFAULT 0,
    
    -- Status
    is_active BOOLEAN DEFAULT TRUE,
    
    -- Metadata
    created_by UUID REFERENCES members(id),
    updated_by UUID REFERENCES members(id)
);

-- Indexes
CREATE INDEX idx_ip_classifications_code ON ip_classifications(code);
CREATE INDEX idx_ip_classifications_type ON ip_classifications(classification_type);
CREATE INDEX idx_ip_classifications_parent ON ip_classifications(parent_id);
CREATE INDEX idx_ip_classifications_is_active ON ip_classifications(is_active) WHERE is_active = TRUE;
```


### 4. Terms and Conditions (terms_conditions table - new)

**Purpose**: Store terms and conditions with version control

**Schema**:
```sql
CREATE TABLE terms_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Terms info
    term_type VARCHAR(50) NOT NULL,  -- 'usage_terms', 'privacy_policy', 'marketing_consent'
    version_number INTEGER NOT NULL,
    title VARCHAR(255) NOT NULL,
    content TEXT NOT NULL,
    
    -- Effective dates
    effective_date TIMESTAMP WITH TIME ZONE NOT NULL,
    expiry_date TIMESTAMP WITH TIME ZONE,
    
    -- Status
    is_active BOOLEAN DEFAULT FALSE,
    
    -- Metadata
    created_by UUID REFERENCES members(id),
    
    -- Constraints
    UNIQUE(term_type, version_number)
);

-- Indexes
CREATE INDEX idx_terms_conditions_type ON terms_conditions(term_type);
CREATE INDEX idx_terms_conditions_is_active ON terms_conditions(is_active) WHERE is_active = TRUE;
CREATE INDEX idx_terms_conditions_effective_date ON terms_conditions(effective_date DESC);
CREATE UNIQUE INDEX idx_terms_conditions_active_per_type ON terms_conditions(term_type) WHERE is_active = TRUE;
```

### 5. Configuration Versions (configuration_versions table - new)

**Purpose**: Track all configuration changes with versioning

**Schema**:
```sql
CREATE TABLE configuration_versions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Version info
    configuration_type VARCHAR(50) NOT NULL,  -- 'business_domain', 'industry_cooperation', 'ip_classification', 'terms'
    configuration_id UUID NOT NULL,
    version_number INTEGER NOT NULL,
    
    -- Change info
    change_type VARCHAR(20) NOT NULL,  -- 'create', 'update', 'delete'
    before_data JSONB,
    after_data JSONB,
    changes JSONB,  -- Field-level changes
    
    -- Metadata
    changed_by UUID REFERENCES members(id),
    change_reason TEXT
);

-- Indexes
CREATE INDEX idx_config_versions_type_id ON configuration_versions(configuration_type, configuration_id);
CREATE INDEX idx_config_versions_created_at ON configuration_versions(created_at DESC);
CREATE INDEX idx_config_versions_changed_by ON configuration_versions(changed_by);
```

### 6. Configuration Audit Logs (configuration_audit_logs table - new)

**Purpose**: Comprehensive audit trail for all configuration operations

**Schema**:
```sql
CREATE TABLE configuration_audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Operation info
    operation VARCHAR(50) NOT NULL,  -- 'create', 'update', 'delete', 'import', 'export', 'read'
    configuration_type VARCHAR(50) NOT NULL,
    configuration_id UUID,
    
    -- User info
    user_id UUID REFERENCES members(id),
    user_role VARCHAR(50),
    ip_address VARCHAR(45),
    user_agent TEXT,
    
    -- Operation details
    operation_data JSONB,
    before_data JSONB,
    after_data JSONB,
    
    -- Result
    is_success BOOLEAN,
    error_message TEXT,
    
    -- Context
    trace_id VARCHAR(255)
);

-- Indexes
CREATE INDEX idx_config_audit_logs_type ON configuration_audit_logs(configuration_type);
CREATE INDEX idx_config_audit_logs_operation ON configuration_audit_logs(operation);
CREATE INDEX idx_config_audit_logs_user_id ON configuration_audit_logs(user_id);
CREATE INDEX idx_config_audit_logs_created_at ON configuration_audit_logs(created_at DESC);
CREATE INDEX idx_config_audit_logs_trace_id ON configuration_audit_logs(trace_id);
```

### 7. Configuration Dependencies (configuration_dependencies table - new)

**Purpose**: Track which data records use each configuration

**Schema**:
```sql
CREATE TABLE configuration_dependencies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    -- Configuration info
    configuration_type VARCHAR(50) NOT NULL,
    configuration_id UUID NOT NULL,
    
    -- Dependent record info
    dependent_table VARCHAR(100) NOT NULL,
    dependent_id UUID NOT NULL,
    
    -- Metadata
    UNIQUE(configuration_type, configuration_id, dependent_table, dependent_id)
);

-- Indexes
CREATE INDEX idx_config_dependencies_config ON configuration_dependencies(configuration_type, configuration_id);
CREATE INDEX idx_config_dependencies_dependent ON configuration_dependencies(dependent_table, dependent_id);
```

## Component Design

### 1. Configuration Manager

**File**: `backend/src/modules/settings/manager.py`

**Purpose**: Coordinate all configuration operations

**Methods**:
```python
class ConfigurationManager:
    def __init__(self):
        self.cache = CacheService()
        self.version_manager = VersionManager()
        self.audit_service = AuditService()
        self.dependency_tracker = DependencyTracker()
        self.validation_service = ValidationService()
        
    async def get_all_configurations(
        self,
        db: AsyncSession
    ) -> dict:
        """Get all configurations (cached)"""
        
    async def get_configuration_by_type(
        self,
        db: AsyncSession,
        config_type: str
    ) -> List[dict]:
        """Get configurations by type"""
        
    async def invalidate_cache(self):
        """Invalidate configuration cache"""
        
    async def warm_cache(self, db: AsyncSession):
        """Pre-populate cache on startup"""
```


### 2. Business Domain Service

**File**: `backend/src/modules/settings/business_domain_service.py`

**Purpose**: Manage business domain categories

**Methods**:
```python
class BusinessDomainService:
    async def create_business_domain(
        self,
        db: AsyncSession,
        data: BusinessDomainCreate,
        user_id: UUID
    ) -> BusinessDomain:
        """Create new business domain"""
        
    async def update_business_domain(
        self,
        db: AsyncSession,
        domain_id: UUID,
        data: BusinessDomainUpdate,
        user_id: UUID
    ) -> BusinessDomain:
        """Update business domain"""
        
    async def delete_business_domain(
        self,
        db: AsyncSession,
        domain_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete business domain (if not in use)"""
        
    async def get_all_business_domains(
        self,
        db: AsyncSession,
        include_inactive: bool = False
    ) -> List[BusinessDomain]:
        """Get all business domains"""
        
    async def reorder_business_domains(
        self,
        db: AsyncSession,
        order_map: dict,
        user_id: UUID
    ):
        """Update display order"""
```

### 3. Industry Cooperation Service

**File**: `backend/src/modules/settings/industry_cooperation_service.py`

**Purpose**: Manage industry cooperation categories with hierarchy

**Methods**:
```python
class IndustryCooperationService:
    async def create_category(
        self,
        db: AsyncSession,
        data: IndustryCooperationCreate,
        user_id: UUID
    ) -> IndustryCooperationCategory:
        """Create new category"""
        
    async def update_category(
        self,
        db: AsyncSession,
        category_id: UUID,
        data: IndustryCooperationUpdate,
        user_id: UUID
    ) -> IndustryCooperationCategory:
        """Update category"""
        
    async def delete_category(
        self,
        db: AsyncSession,
        category_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete category (if not in use)"""
        
    async def get_category_tree(
        self,
        db: AsyncSession
    ) -> List[dict]:
        """Get hierarchical category tree"""
        
    async def move_category(
        self,
        db: AsyncSession,
        category_id: UUID,
        new_parent_id: Optional[UUID],
        user_id: UUID
    ):
        """Move category to new parent"""
```

### 4. IP Classification Service

**File**: `backend/src/modules/settings/ip_classification_service.py`

**Purpose**: Manage IP classification types

**Methods**:
```python
class IPClassificationService:
    async def create_classification(
        self,
        db: AsyncSession,
        data: IPClassificationCreate,
        user_id: UUID
    ) -> IPClassification:
        """Create new IP classification"""
        
    async def update_classification(
        self,
        db: AsyncSession,
        classification_id: UUID,
        data: IPClassificationUpdate,
        user_id: UUID
    ) -> IPClassification:
        """Update IP classification"""
        
    async def delete_classification(
        self,
        db: AsyncSession,
        classification_id: UUID,
        user_id: UUID
    ) -> bool:
        """Delete IP classification (if not in use)"""
        
    async def get_classifications_by_type(
        self,
        db: AsyncSession,
        classification_type: str
    ) -> List[IPClassification]:
        """Get classifications by type (patent, trademark, etc.)"""
        
    async def get_classification_tree(
        self,
        db: AsyncSession,
        classification_type: str
    ) -> List[dict]:
        """Get hierarchical classification tree"""
```

### 5. Terms Service

**File**: `backend/src/modules/settings/terms_service.py`

**Purpose**: Manage terms and conditions with versioning

**Methods**:
```python
class TermsService:
    async def create_terms_version(
        self,
        db: AsyncSession,
        data: TermsCreate,
        user_id: UUID
    ) -> TermsConditions:
        """Create new terms version"""
        
    async def activate_terms_version(
        self,
        db: AsyncSession,
        terms_id: UUID,
        user_id: UUID
    ) -> TermsConditions:
        """Activate terms version (deactivate others of same type)"""
        
    async def get_active_terms(
        self,
        db: AsyncSession,
        term_type: str
    ) -> Optional[TermsConditions]:
        """Get active terms for type"""
        
    async def get_terms_history(
        self,
        db: AsyncSession,
        term_type: str
    ) -> List[TermsConditions]:
        """Get all versions for term type"""
        
    async def check_user_acceptance(
        self,
        db: AsyncSession,
        user_id: UUID,
        term_type: str
    ) -> bool:
        """Check if user has accepted current active terms"""
```

### 6. Import Service

**File**: `backend/src/modules/settings/import_service.py`

**Purpose**: Import configurations from JSON

**Methods**:
```python
class ImportService:
    async def preview_import(
        self,
        db: AsyncSession,
        json_data: dict
    ) -> ImportPreview:
        """Preview what will be imported"""
        
    async def import_configurations(
        self,
        db: AsyncSession,
        json_data: dict,
        user_id: UUID
    ) -> ImportResult:
        """Import configurations from JSON"""
        
    async def validate_import_data(
        self,
        json_data: dict
    ) -> ValidationResult:
        """Validate JSON structure and data"""
        
    async def apply_import(
        self,
        db: AsyncSession,
        import_data: dict,
        user_id: UUID
    ) -> ImportResult:
        """Apply validated import"""
```

### 7. Export Service

**File**: `backend/src/modules/settings/export_service.py`

**Purpose**: Export configurations to JSON

**Methods**:
```python
class ExportService:
    async def export_all_configurations(
        self,
        db: AsyncSession
    ) -> dict:
        """Export all configurations to JSON"""
        
    async def export_by_type(
        self,
        db: AsyncSession,
        config_type: str
    ) -> dict:
        """Export specific configuration type"""
        
    async def export_with_metadata(
        self,
        db: AsyncSession,
        include_versions: bool = False,
        include_audit: bool = False
    ) -> dict:
        """Export with additional metadata"""
```

### 8. Cache Service

**File**: `backend/src/modules/settings/cache_service.py`

**Purpose**: Cache frequently accessed configurations

**Methods**:
```python
class CacheService:
    def __init__(self):
        self.redis_client = get_redis_client()
        self.cache_prefix = "config:"
        self.default_ttl = 3600  # 1 hour
        
    async def get_cached_config(
        self,
        config_type: str
    ) -> Optional[List[dict]]:
        """Get cached configuration"""
        
    async def set_cached_config(
        self,
        config_type: str,
        data: List[dict]
    ):
        """Cache configuration"""
        
    async def invalidate_config_cache(
        self,
        config_type: Optional[str] = None
    ):
        """Invalidate cache (all or specific type)"""
        
    async def get_cache_stats(self) -> dict:
        """Get cache hit/miss statistics"""
        
    async def warm_cache(self, db: AsyncSession):
        """Pre-populate cache with all active configurations"""
```

### 9. Version Manager

**File**: `backend/src/modules/settings/version_manager.py`

**Purpose**: Track configuration versions

**Methods**:
```python
class VersionManager:
    async def create_version(
        self,
        db: AsyncSession,
        config_type: str,
        config_id: UUID,
        change_type: str,
        before_data: Optional[dict],
        after_data: Optional[dict],
        user_id: UUID,
        reason: Optional[str] = None
    ) -> ConfigurationVersion:
        """Create new version record"""
        
    async def get_version_history(
        self,
        db: AsyncSession,
        config_type: str,
        config_id: UUID
    ) -> List[ConfigurationVersion]:
        """Get version history"""
        
    async def compare_versions(
        self,
        db: AsyncSession,
        version_id_1: UUID,
        version_id_2: UUID
    ) -> dict:
        """Compare two versions"""
        
    async def rollback_to_version(
        self,
        db: AsyncSession,
        version_id: UUID,
        user_id: UUID
    ) -> bool:
        """Rollback to previous version"""
```

### 10. Audit Service

**File**: `backend/src/modules/settings/audit_service.py`

**Purpose**: Log all configuration operations

**Methods**:
```python
class AuditService:
    async def log_operation(
        self,
        db: AsyncSession,
        operation: str,
        config_type: str,
        config_id: Optional[UUID],
        user_id: Optional[UUID],
        operation_data: dict,
        before_data: Optional[dict] = None,
        after_data: Optional[dict] = None,
        is_success: bool = True,
        error_message: Optional[str] = None
    ) -> ConfigurationAuditLog:
        """Log configuration operation"""
        
    async def query_audit_logs(
        self,
        db: AsyncSession,
        filters: AuditLogQuery
    ) -> List[ConfigurationAuditLog]:
        """Query audit logs with filters"""
```

### 11. Dependency Tracker

**File**: `backend/src/modules/settings/dependency_tracker.py`

**Purpose**: Track configuration usage

**Methods**:
```python
class DependencyTracker:
    async def track_dependency(
        self,
        db: AsyncSession,
        config_type: str,
        config_id: UUID,
        dependent_table: str,
        dependent_id: UUID
    ):
        """Track configuration usage"""
        
    async def remove_dependency(
        self,
        db: AsyncSession,
        config_type: str,
        config_id: UUID,
        dependent_table: str,
        dependent_id: UUID
    ):
        """Remove dependency tracking"""
        
    async def get_dependencies(
        self,
        db: AsyncSession,
        config_type: str,
        config_id: UUID
    ) -> List[dict]:
        """Get all dependencies for configuration"""
        
    async def get_dependency_count(
        self,
        db: AsyncSession,
        config_type: str,
        config_id: UUID
    ) -> int:
        """Get dependency count"""
        
    async def can_delete(
        self,
        db: AsyncSession,
        config_type: str,
        config_id: UUID
    ) -> bool:
        """Check if configuration can be deleted"""
```

### 12. Validation Service

**File**: `backend/src/modules/settings/validation_service.py`

**Purpose**: Validate configuration data

**Methods**:
```python
class ValidationService:
    async def validate_business_domain(
        self,
        db: AsyncSession,
        data: dict,
        is_update: bool = False
    ) -> ValidationResult:
        """Validate business domain data"""
        
    async def validate_industry_cooperation(
        self,
        db: AsyncSession,
        data: dict,
        is_update: bool = False
    ) -> ValidationResult:
        """Validate industry cooperation data"""
        
    async def validate_ip_classification(
        self,
        db: AsyncSession,
        data: dict,
        is_update: bool = False
    ) -> ValidationResult:
        """Validate IP classification data"""
        
    async def validate_terms(
        self,
        db: AsyncSession,
        data: dict
    ) -> ValidationResult:
        """Validate terms and conditions data"""
        
    async def validate_code_uniqueness(
        self,
        db: AsyncSession,
        config_type: str,
        code: str,
        exclude_id: Optional[UUID] = None
    ) -> bool:
        """Validate code uniqueness"""
        
    async def validate_parent_exists(
        self,
        db: AsyncSession,
        config_type: str,
        parent_id: UUID
    ) -> bool:
        """Validate parent exists for hierarchical configs"""
```


## Data Flow

### 1. Configuration Create Flow

```
Admin creates configuration
    ↓
Validation Service
    - Validate required fields
    - Validate code uniqueness
    - Validate parent exists (if hierarchical)
    ↓
Configuration Service (Business Domain/Industry Cooperation/IP/Terms)
    ↓
Create database record
    ↓
Version Manager
    - Create version record (change_type: 'create')
    ↓
Audit Service
    - Log create operation
    ↓
Cache Service
    - Invalidate cache for this config type
    ↓
WebSocket notification (optional)
    - Notify frontend of configuration change
    ↓
Return created configuration
```

### 2. Configuration Update Flow

```
Admin updates configuration
    ↓
Validation Service
    - Validate required fields
    - Validate code uniqueness (excluding current)
    - Validate parent exists (if hierarchical)
    ↓
Get current configuration (before state)
    ↓
Configuration Service
    ↓
Update database record
    ↓
Version Manager
    - Create version record (change_type: 'update')
    - Store before/after states
    - Calculate field-level changes
    ↓
Audit Service
    - Log update operation with before/after
    ↓
Cache Service
    - Invalidate cache for this config type
    ↓
WebSocket notification
    - Notify frontend of configuration change
    ↓
Return updated configuration
```

### 3. Configuration Delete Flow

```
Admin deletes configuration
    ↓
Dependency Tracker
    - Check if configuration is in use
    ├─ Has dependencies → Return error (cannot delete)
    └─ No dependencies → Continue
    ↓
Get current configuration (for audit)
    ↓
Configuration Service
    ↓
Delete database record
    ↓
Version Manager
    - Create version record (change_type: 'delete')
    - Store deleted data
    ↓
Audit Service
    - Log delete operation with deleted data
    ↓
Cache Service
    - Invalidate cache for this config type
    ↓
WebSocket notification
    - Notify frontend of configuration change
    ↓
Return success
```

### 4. Configuration Query Flow (with caching)

```
User/Application requests configuration
    ↓
Cache Service
    - Check cache
    ├─ Cache hit → Return cached data
    └─ Cache miss → Continue
    ↓
Configuration Service
    ↓
Query database
    ↓
Cache Service
    - Store in cache
    ↓
Audit Service (if configured)
    - Log read operation
    ↓
Return configuration data
```

### 5. Configuration Import Flow

```
Admin uploads JSON file
    ↓
Import Service
    ↓
Validate JSON structure
    ├─ Invalid → Return validation errors
    └─ Valid → Continue
    ↓
Preview import
    - Compare with existing configurations
    - Identify: new, updated, unchanged
    ↓
Admin reviews preview
    ├─ Cancel → Return
    └─ Confirm → Continue
    ↓
For each configuration in import:
    ↓
    Validation Service
        - Validate data
    ↓
    Configuration Service
        - Create or update
    ↓
    Version Manager
        - Create version record
    ↓
    Audit Service
        - Log import operation
    ↓
Cache Service
    - Invalidate all configuration caches
    ↓
Return import result (success count, error count, details)
```

### 6. Configuration Export Flow

```
Admin requests export
    ↓
Export Service
    ↓
Query all configurations (or filtered by type)
    ↓
Format as JSON
    - Include metadata (export date, version)
    - Optionally include version history
    - Optionally include audit trail
    ↓
Audit Service
    - Log export operation
    ↓
Return JSON file
```

### 7. Terms Activation Flow

```
Admin activates new terms version
    ↓
Terms Service
    ↓
Deactivate current active version (same term type)
    ↓
Activate new version
    ↓
Version Manager
    - Create version record
    ↓
Audit Service
    - Log activation
    ↓
Cache Service
    - Invalidate terms cache
    ↓
WebSocket notification
    - Notify all users of new terms
    ↓
Return activated terms
```


## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system-essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Business Domain Creation
*For any* valid business domain data (name, code, description), creation should succeed and return the created domain.

**Validates: Requirements 1.1**

### Property 2: Business Domain Update
*For any* existing business domain and valid update data, the update should be applied successfully.

**Validates: Requirements 1.2**

### Property 3: Business Domain Deletion Constraint
*For any* business domain not in use, deletion should succeed; for any business domain in use, deletion should fail.

**Validates: Requirements 1.3**

### Property 4: Business Domain Ordering
*For any* set of business domains with display_order values, retrieval should return them sorted by display_order.

**Validates: Requirements 1.4**

### Property 5: Business Domain Code Uniqueness
*For any* business domain code, attempting to create another domain with the same code should fail.

**Validates: Requirements 1.5**

### Property 6: Industry Cooperation Creation
*For any* valid industry cooperation data, creation should succeed and return the created category.

**Validates: Requirements 2.1**

### Property 7: Industry Cooperation Update
*For any* existing industry cooperation category and valid update data, the update should be applied successfully.

**Validates: Requirements 2.2**

### Property 8: Industry Cooperation Deletion Constraint
*For any* industry cooperation category not in use, deletion should succeed; for any category in use, deletion should fail.

**Validates: Requirements 2.3**

### Property 9: Industry Cooperation Hierarchy
*For any* parent-child relationship in industry cooperation categories, the child should reference a valid parent.

**Validates: Requirements 2.4**

### Property 10: Industry Cooperation Code Uniqueness
*For any* industry cooperation code, attempting to create another category with the same code should fail.

**Validates: Requirements 2.5**

### Property 11: IP Classification Creation
*For any* valid IP classification data, creation should succeed and return the created classification.

**Validates: Requirements 3.1**

### Property 12: IP Classification Update
*For any* existing IP classification and valid update data, the update should be applied successfully.

**Validates: Requirements 3.2**

### Property 13: IP Classification Deletion Constraint
*For any* IP classification not in use, deletion should succeed; for any classification in use, deletion should fail.

**Validates: Requirements 3.3**

### Property 14: IP Classification Subtypes
*For any* IP classification with subtypes, the parent-child relationship should be maintained correctly.

**Validates: Requirements 3.4**

### Property 15: IP Classification Code Uniqueness
*For any* IP classification code, attempting to create another classification with the same code should fail.

**Validates: Requirements 3.5**

### Property 16: Terms Version Creation
*For any* new terms and conditions, a version should be created with an incremented version number.

**Validates: Requirements 4.1**

### Property 17: Terms Type Independence
*For any* term type (usage_terms, privacy_policy, marketing_consent), versions should be independently manageable.

**Validates: Requirements 4.2**

### Property 18: Terms Version Data Completeness
*For any* terms version, it should contain version number, effective date, and content.

**Validates: Requirements 4.3**

### Property 19: Terms Active Version Uniqueness
*For any* term type, only one version should be marked as active at a time.

**Validates: Requirements 4.4**

### Property 20: Terms Deletion Constraint
*For any* terms version with user acceptances, deletion should fail; for any version without acceptances, deletion should succeed.

**Validates: Requirements 4.5**

### Property 21: Business Domain Retrieval
*For any* request to retrieve business domains, all active domains should be returned.

**Validates: Requirements 5.1**

### Property 22: Industry Cooperation Retrieval
*For any* request to retrieve industry cooperation categories, all active categories should be returned.

**Validates: Requirements 5.2**

### Property 23: IP Classification Retrieval
*For any* request to retrieve IP classifications, all active classifications should be returned.

**Validates: Requirements 5.3**

### Property 24: Active Terms Retrieval
*For any* term type, only the active version should be returned.

**Validates: Requirements 5.4**

### Property 25: Configuration Status Filtering
*For any* status filter (active/inactive), only configurations matching that status should be returned.

**Validates: Requirements 5.5**

### Property 26: Required Field Validation
*For any* configuration with missing required fields, validation should fail.

**Validates: Requirements 6.1**

### Property 27: Code Uniqueness Validation
*For any* configuration type, duplicate codes should be rejected by validation.

**Validates: Requirements 6.2**

### Property 28: Hierarchical Relationship Validation
*For any* child configuration with non-existent parent, validation should fail.

**Validates: Requirements 6.3**

### Property 29: JSON Schema Validation
*For any* imported JSON with invalid structure, validation should fail before applying changes.

**Validates: Requirements 6.4**

### Property 30: Deletion Constraint Validation
*For any* configuration with dependencies, deletion should be prevented.

**Validates: Requirements 6.5**

### Property 31: Configuration Export Completeness
*For any* export request, all configurations (or filtered subset) should be included in the JSON output.

**Validates: Requirements 7.1, 7.2**

### Property 32: Configuration Import Success
*For any* valid JSON import, all configurations should be created or updated successfully.

**Validates: Requirements 7.3**

### Property 33: Import Validation Before Apply
*For any* import operation, validation should occur before any database changes are made.

**Validates: Requirements 7.4**

### Property 34: Import Preview Accuracy
*For any* import, the preview should accurately show what will be created, updated, or unchanged.

**Validates: Requirements 7.5**

### Property 35: Configuration Caching
*For any* active configuration, it should be available in cache after first access.

**Validates: Requirements 8.1**

### Property 36: Cache Invalidation on Update
*For any* configuration update, the cache for that configuration type should be invalidated.

**Validates: Requirements 8.2**

### Property 37: Manual Cache Refresh
*For any* manual cache refresh request, the cache should be reloaded from database.

**Validates: Requirements 8.3**

### Property 38: Cache Hit/Miss Tracking
*For any* series of cache operations, hit and miss rates should be accurately tracked.

**Validates: Requirements 8.4**

### Property 39: Cache Warming on Startup
*For any* application startup, all active configurations should be pre-loaded into cache.

**Validates: Requirements 8.5**

### Property 40: Create Operation Audit
*For any* configuration create operation, an audit log with user, timestamp, and data should be created.

**Validates: Requirements 9.1**

### Property 41: Update Operation Audit
*For any* configuration update operation, an audit log with before/after states should be created.

**Validates: Requirements 9.2**

### Property 42: Delete Operation Audit
*For any* configuration delete operation, an audit log with deleted data should be created.

**Validates: Requirements 9.3**

### Property 43: Import Operation Audit
*For any* configuration import operation, an audit log with imported data should be created.

**Validates: Requirements 9.4**

### Property 44: Audit Log Query
*For any* combination of filters (type, user, date range), matching audit logs should be returned.

**Validates: Requirements 9.5**

### Property 45: Frontend Configuration Loading
*For any* frontend request, all configurations should be loadable in one API call.

**Validates: Requirements 10.1**

### Property 46: Frontend Type-Specific Loading
*For any* configuration type request, only that type should be returned.

**Validates: Requirements 10.2**

### Property 47: Configuration Change Notification
*For any* configuration change, a WebSocket notification should be sent to connected clients.

**Validates: Requirements 10.4**

### Property 48: Configuration Version in Response
*For any* configuration API response, a version identifier should be included.

**Validates: Requirements 10.5**

### Property 49: Version Creation on Change
*For any* configuration change (create, update, delete), a new version record should be created.

**Validates: Requirements 11.1**

### Property 50: Version Data Completeness
*For any* configuration version, it should contain version number, timestamp, and changed_by user.

**Validates: Requirements 11.2**

### Property 51: Configuration History Retrieval
*For any* configuration, all historical versions should be retrievable.

**Validates: Requirements 11.3**

### Property 52: Version Comparison
*For any* two configuration versions, differences should be identifiable.

**Validates: Requirements 11.4**

### Property 53: Version Rollback
*For any* previous configuration version, rollback should restore that state.

**Validates: Requirements 11.5**

### Property 54: Admin Write Access Control
*For any* non-admin user, configuration write operations should be rejected.

**Validates: Requirements 12.1**

### Property 55: Super-Admin Import/Export Access
*For any* non-super-admin user, import/export operations should be rejected.

**Validates: Requirements 12.2**

### Property 56: Authenticated Read Access
*For any* authenticated user, configuration read operations should succeed.

**Validates: Requirements 12.3**

### Property 57: Anonymous Terms Access
*For any* anonymous user, active terms and conditions should be accessible.

**Validates: Requirements 12.4**

### Property 58: Configuration Access Logging
*For any* configuration access attempt, an audit log should be created.

**Validates: Requirements 12.5**

### Property 59: Configuration Search
*For any* search term (name or code), matching configurations should be returned.

**Validates: Requirements 13.1**

### Property 60: Configuration Type Filtering
*For any* type filter, only configurations of that type should be returned.

**Validates: Requirements 13.2**

### Property 61: Configuration Status Filtering
*For any* status filter, only configurations with that status should be returned.

**Validates: Requirements 13.3**

### Property 62: Configuration Date Range Filtering
*For any* date range filter, only configurations created in that range should be returned.

**Validates: Requirements 13.4**

### Property 63: Search Result Pagination
*For any* search with many results, pagination should work correctly.

**Validates: Requirements 13.5**

### Property 64: Dependency Tracking
*For any* configuration usage, a dependency record should be created.

**Validates: Requirements 14.1**

### Property 65: Deletion Prevention with Dependencies
*For any* configuration with dependencies, deletion should fail.

**Validates: Requirements 14.2**

### Property 66: Dependency Count Accuracy
*For any* configuration, the dependency count should match the actual number of dependent records.

**Validates: Requirements 14.3**

### Property 67: Dependency Details Retrieval
*For any* configuration, all dependent records should be retrievable.

**Validates: Requirements 14.4**

### Property 68: Force Deletion with Cascade
*For any* configuration with dependencies, force deletion should remove both configuration and dependencies.

**Validates: Requirements 14.5**


## Security Considerations

### 1. Access Control

- **Admin-only writes**: All configuration write operations require admin authentication
- **Super-admin for import/export**: Import/export operations require super-admin role
- **Read access for authenticated users**: All authenticated users can read configurations
- **Public terms access**: Active terms and conditions accessible to anonymous users
- **Audit all access**: Log all configuration access attempts

### 2. Data Validation

- **Input validation**: Validate all configuration data before saving
- **Code uniqueness**: Enforce unique codes within each configuration type
- **Referential integrity**: Validate parent-child relationships
- **JSON schema validation**: Validate imported JSON structure
- **Dependency checking**: Prevent deletion of configurations in use

### 3. Audit Trail

- **Complete audit log**: Record all configuration operations
- **Before/after states**: Track data changes for updates
- **User attribution**: Record who made each change
- **Immutable audit logs**: Prevent modification of audit records
- **Audit log retention**: Retain audit logs according to compliance requirements

### 4. Version Control

- **Automatic versioning**: Create version for every change
- **Version history**: Maintain complete history of changes
- **Rollback capability**: Support reverting to previous versions
- **Version comparison**: Enable comparing different versions

## Performance Considerations

### 1. Caching Strategy

- **In-memory caching**: Cache all active configurations in Redis
- **Cache warming**: Pre-populate cache on application startup
- **Cache invalidation**: Invalidate cache on configuration changes
- **Cache TTL**: Set appropriate TTL for cached data (1 hour default)
- **Cache hit rate monitoring**: Track cache effectiveness

### 2. Database Optimization

- **Indexes**: Comprehensive indexes on frequently queried fields
- **Query optimization**: Use efficient queries for configuration retrieval
- **Materialized paths**: Use materialized paths for hierarchical data
- **Pagination**: Paginate large result sets

### 3. API Performance

- **Bulk loading**: Load all configurations in one request for frontend
- **Selective loading**: Support loading specific configuration types
- **Response compression**: Compress large JSON responses
- **ETags**: Use ETags for cache validation

### 4. Import/Export Performance

- **Batch processing**: Process imports in batches
- **Transaction management**: Use transactions for atomic imports
- **Progress tracking**: Provide progress feedback for large imports
- **Async processing**: Process large exports asynchronously

## Testing Strategy

### 1. Unit Tests

- Test each service method independently
- Test validation logic for all configuration types
- Test cache operations (get, set, invalidate)
- Test version creation and comparison
- Test dependency tracking

### 2. Integration Tests

- Test end-to-end configuration CRUD flow
- Test import/export functionality
- Test cache invalidation on updates
- Test WebSocket notifications
- Test access control enforcement

### 3. Property-Based Tests

- Verify correctness properties (see Correctness Properties section)
- Use Hypothesis (Python) for property-based testing
- Test with randomly generated configuration data
- Test validation with invalid data
- Test hierarchical relationships with random structures

### 4. UI Tests

- Test configuration management UI
- Test import/export UI
- Test version history and comparison UI
- Test terms management with rich text editor

### 5. Performance Tests

- Load test configuration retrieval with caching
- Test import performance with large JSON files
- Test export performance with many configurations
- Test cache performance under high load

## Deployment Considerations

### 1. Database Migration

- Create all configuration tables
- Add indexes for performance
- Migrate existing hardcoded configurations to database
- Set up initial configuration data

### 2. Configuration

- Configure cache settings (Redis connection, TTL)
- Configure WebSocket for real-time notifications
- Configure access control roles
- Configure audit log retention

### 3. Monitoring

- Monitor configuration change frequency
- Monitor cache hit/miss rates
- Monitor API response times
- Monitor import/export operations
- Alert on validation failures

### 4. Backup and Recovery

- Regular database backups
- Export configurations periodically
- Test configuration restore procedures
- Document rollback procedures

## Future Enhancements

### 1. Advanced Features

- **Configuration templates**: Pre-defined configuration sets
- **Configuration inheritance**: Inherit settings from parent configurations
- **Configuration scheduling**: Schedule configuration changes for future dates
- **Configuration approval workflow**: Multi-step approval for sensitive changes

### 2. Enhanced UI

- **Drag-and-drop ordering**: Visual reordering of configurations
- **Bulk operations**: Bulk create, update, delete
- **Configuration preview**: Preview changes before applying
- **Configuration diff viewer**: Visual diff for version comparison

### 3. Integration

- **API for external systems**: Allow external systems to query configurations
- **Webhook notifications**: Notify external systems of configuration changes
- **Configuration sync**: Sync configurations across multiple environments

### 4. Analytics

- **Configuration usage analytics**: Track which configurations are most used
- **Change frequency analysis**: Identify frequently changed configurations
- **Impact analysis**: Analyze impact of configuration changes

## References

- [Backend Architecture Standards](../backend-architecture-standards/design.md)
- [Frontend Architecture Standards](../frontend-architecture-standards/design.md)
- [Audit and Compliance Spec](../audit-and-compliance/design.md)
- [Logging and Monitoring Spec](../logging-and-monitoring/design.md)

