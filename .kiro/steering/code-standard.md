---
inclusion: always
---

# Code Standard

This document defines critical coding standards for this codebase. Follow these rules strictly when writing or modifying code.

## Core Principles

### SOLID + DRY + KISS

Apply these principles when writing code:

| Principle | Requirement | Priority |
|-----------|-------------|----------|
| KISS | Keep it simple, avoid over-engineering | **Highest** |
| SRP | One class, one responsibility | High |
| DRY | No duplication, centralize definitions | High |
| OCP | Extend via interfaces, don't modify existing code | Medium |
| DIP | Depend on abstractions, use dependency injection | Medium |

**Priority**: KISS > SRP > DRY > OCP/DIP > LSP/ISP

When principles conflict, favor simplicity and single responsibility over abstraction.

### No Backward Compatibility Code
The codebase maintains a single, consistent API contract. Do not add compatibility layers or fallback chains.

**Forbidden patterns:**
```javascript
// ❌ NEVER use fallback chains for field names
const items = response.items ?? response.records ?? response.faqs;
const id = response.fileId ?? response.file_id ?? response.id;

// ❌ NEVER support multiple field name variations
if (data.userId || data.user_id || data.id) { ... }

// ❌ NEVER add "just in case" compatibility code
const value = newField ?? oldField ?? legacyField;
```

**Correct approach:**
```javascript
// ✅ Use the single, defined field name
const items = response.items;
const id = response.fileId;
```

### Service Layer Responsibilities
Service layer functions handle business logic and API communication only. They must NOT perform data transformations.

**Service layer MUST NOT:**
- Map field names between formats
- Convert data formats or structures
- Handle backward compatibility
- Manually convert between camelCase and snake_case
- Transform API responses

**Example of what NOT to do:**
```javascript
// ❌ FORBIDDEN in service layer
async function getProjects() {
  const response = await api.get('/projects');
  return response.data.map(project => ({
    projectId: project.project_id,  // ❌ Field mapping
    projectName: project.name,      // ❌ Field mapping
    createdAt: new Date(project.created_at)  // ❌ Format conversion
  }));
}
```

**Correct service layer:**
```javascript
// ✅ CORRECT - service returns data as-is
async function getProjects() {
  const response = await api.get('/projects');
  return response.data;
}
```

### Data Transformation Boundaries
Data transformations between camelCase (frontend) and snake_case (backend) happen at specific boundaries only.

**Allowed transformation locations:**
- ✅ API interceptors (request/response interceptors in axios/fetch configuration)
- ✅ Component layer (when preparing data for display or submission)

**Forbidden transformation locations:**
- ❌ Service layer functions
- ❌ Utility functions that wrap service calls
- ❌ Store/state management actions

**Example of correct transformation:**
```javascript
// ✅ CORRECT - transformation in API interceptor
axios.interceptors.response.use(response => {
  return camelCaseKeys(response.data);
});

// ✅ CORRECT - transformation in component
function ProjectCard({ project }) {
  const displayData = {
    title: project.projectName,
    date: formatDate(project.createdAt)
  };
  return <Card {...displayData} />;
}
```

## Comment Guidelines

### Python Backend
**Required:**
- ✅ **All functions, methods, and classes MUST have docstrings**
- ✅ Single-line docstrings using `"""` for functions, classes, and modules
- ✅ Chinese language for all comments

**Allowed:**
- ✅ Single-line docstrings using `"""` for functions, classes, and modules
- ✅ Chinese language for all comments

**Forbidden:**
- ❌ Multi-line docstrings (use single-line `"""` instead)
- ❌ Inline comments within function bodies
- ❌ Hash comments (`#`) for documentation
- ❌ Functions or methods without docstrings

**Examples:**
```python
# ❌ FORBIDDEN - multi-line docstring
def get_user(user_id: str):
    """
    Get user by ID.
    
    Args:
        user_id: The user ID
    
    Returns:
        User data
    """
    pass

# ❌ FORBIDDEN - inline comments
def get_user(user_id: str):
    """获取用户"""
    # Query the database
    result = db.query(user_id)
    # Return the result
    return result

# ❌ FORBIDDEN - no docstring
def get_user(user_id: str):
    result = db.query(user_id)
    return result

# ✅ CORRECT - single-line docstring only
def get_user(user_id: str):
    """获取用户"""
    result = db.query(user_id)
    return result
```

### JavaScript/React Frontend
**Required:**
- ✅ **All functions and components SHOULD have JSDoc comments**

**Allowed:**
- ✅ JSDoc comments for functions and components
- ✅ Single-line comments (`//`) for brief explanations
- ✅ Chinese language for all comments

**Forbidden:**
- ❌ Excessive inline comments explaining obvious code
- ❌ Commented-out code blocks

## Implementation Checklist

When writing or reviewing code, verify:

1. **No fallback chains** - Each field is accessed by its single, defined name
2. **Service purity** - Services only call APIs and return raw responses
3. **Transformation boundaries** - Data conversion happens only in interceptors or components
4. **Single source of truth** - API contract defines field names; no variations supported
5. **Comment compliance** - Python uses single-line `"""` docstrings only, no inline comments
6. **All methods documented** - Every function, method, and class has a docstring

## Rationale

These rules ensure:
- **Predictability**: Code behavior is consistent and easy to trace
- **Maintainability**: Changes to API contracts are explicit and localized
- **Debuggability**: Data flow is clear with transformations at defined boundaries
- **Performance**: No redundant transformation layers
- **Readability**: Clean code with minimal, meaningful comments
