# Backend Integration Tests

## 📋 Overview

This directory contains integration tests for the Gangwon Business Portal API.

## 📁 Directory Structure

```
tests/
├── __init__.py
├── README.md                      # This file
├── setup_test_data.py             # Database test data setup (async)
├── setup_test_users_api.py        # Test user setup via API
├── run_all_tests.py               # Main test runner
├── integration/                   # Integration tests
│   ├── __init__.py
│   ├── test_auth_api.py           # Authentication tests
│   ├── test_member_api.py         # Member management tests
│   ├── test_performance_api.py    # Performance management tests
│   ├── test_project_api.py        # Project management tests
│   ├── test_content_api.py        # Content management tests
│   └── test_support_api.py        # Support module tests
└── test_results/                  # Test results (auto-generated)
    ├── auth_test_results.json
    ├── member_test_results.json
    ├── performance_test_results.json
    ├── project_test_results.json
    ├── content_test_results.json
    ├── support_test_results.json
    └── integration_test_summary.json
```

## 🚀 Quick Start

### Prerequisites

1. **Backend server running**:
   ```bash
   cd backend
   python -m uvicorn src.main:app --reload --host 127.0.0.1 --port 8000
   ```

2. **Test users created**:
   ```bash
   # Option 1: Via database (recommended)
   python tests/setup_test_data.py
   
   # Option 2: Via API
   python tests/setup_test_users_api.py
   ```

3. **Dependencies installed**:
   ```bash
   pip install requests
   ```

### Running Tests

```bash
# Run all tests
cd backend
python tests/run_all_tests.py

# Run individual module tests
python tests/integration/test_auth_api.py
python tests/integration/test_member_api.py
python tests/integration/test_performance_api.py
python tests/integration/test_project_api.py
python tests/integration/test_content_api.py
python tests/integration/test_support_api.py
```

## 🔐 Test Credentials

| Role | Business Number | Password | Status |
|------|-----------------|----------|--------|
| **Member** | 123-45-67890 | Member123! | approved |
| **Admin** | 000-00-00000 | Admin123! | approved |

## 📊 Test Modules

### 1. Authentication (`test_auth_api.py`)
- TC1.1: Member login
- TC1.2: Member login (wrong password)
- TC1.3: Admin login
- TC1.4: Member registration
- TC1.5: Password reset request
- TC1.6: Get current user
- TC1.7: Token refresh
- ERR1.1: Access without token

### 2. Member Management (`test_member_api.py`)
- TC2.1: Get member profile
- TC2.2: Update member profile
- TC2.3: Admin list members
- TC2.3b: Admin list members (filtered)
- TC2.4: Admin get member detail
- ERR2.1: Member access admin endpoint
- ERR3.1: Get non-existent member

### 3. Performance Management (`test_performance_api.py`)
- TC3.1: Create performance record
- TC3.2: List performance records
- TC3.3: Get performance detail
- TC3.4: Update performance
- TC3.5: Submit performance
- TC3.6: Admin list performance
- TC3.7: Admin approve performance

### 4. Project Management (`test_project_api.py`)
- TC4.1: List projects (public)
- TC4.2: Get project detail
- TC4.3: Apply to project
- TC4.4: Get my applications
- TC4.5: Admin create project
- TC4.6: Admin get applications
- TC4.7: Admin update project
- TC4.8: List projects (filtered)

### 5. Content Management (`test_content_api.py`)
- TC5.1: List notices (public)
- TC5.2: Get latest notices
- TC5.3: List press releases
- TC5.3b: Get latest press
- TC5.4: Get banners
- TC5.5: Admin create notice
- TC5.5b: Admin update notice
- TC5.6: Admin create banner
- TC5.6b: Admin get all banners
- TC5.7: Get system info

### 6. Support Module (`test_support_api.py`)
- TC6.1: List FAQs (public)
- TC6.1b: List FAQs (filtered)
- TC6.1c: Admin create FAQ
- TC6.1d: Admin update FAQ
- TC6.2: Create inquiry
- TC6.3: List my inquiries
- TC6.4: Get inquiry detail
- TC6.5: Admin list inquiries
- TC6.5b: Admin reply inquiry
- TC6.6: View replied inquiry

## 📈 Expected Output

```
======================================================================
Gangwon Business Portal - Integration Test Suite
======================================================================
Start Time: 2025-11-26 10:00:00
Base URL: http://127.0.0.1:8000
======================================================================

✓ Server health check passed

============================================================
Running: authentication
============================================================

✅ PASS - TC1.1: Member Login
   Status: 200, Token received: eyJhbGciOiJIUzI1NiIs...

✅ PASS - TC1.2: Member Login (Wrong Password)
   Status: 401, Correctly rejected invalid credentials

...

======================================================================
INTEGRATION TEST SUMMARY REPORT
======================================================================
Timestamp: 2025-11-26T10:05:00.000000

📊 OVERALL RESULTS:
   Total Tests: 50
   Passed: 48 ✅
   Failed: 2 ❌
   Success Rate: 96.0%

📋 MODULE BREAKDOWN:
----------------------------------------------------------------------
Module                      Tests   Passed   Failed       Rate
----------------------------------------------------------------------
authentication                  8        8        0     100.0% ✅
member_management               7        7        0     100.0% ✅
performance_management          9        9        0     100.0% ✅
project_management              8        7        1      87.5%
content_management             10       10        0     100.0% ✅
support                        10        9        1      90.0%
----------------------------------------------------------------------

⚠️ 2 TEST(S) FAILED - Review failed tests above
======================================================================
```

## 🔧 Configuration

Environment variables:
```bash
# Custom base URL
export TEST_BASE_URL=http://localhost:8000
```

## 📝 Adding New Tests

1. Create a new test file in `tests/integration/`:
   ```python
   # test_new_module_api.py
   class NewModuleAPITester:
       def __init__(self, base_url: str):
           self.base_url = base_url
           self.results = []
       
       def log_result(self, test_name: str, success: bool, details: str):
           # ... logging logic
       
       def test_something(self) -> bool:
           # ... test logic
           return True
       
       def run_all_tests(self) -> dict:
           # ... run all tests
           return summary
   
   def main():
       tester = NewModuleAPITester(BASE_URL)
       return tester.run_all_tests()
   
   if __name__ == "__main__":
       main()
   ```

2. Add to `TEST_MODULES` in `run_all_tests.py`:
   ```python
   TEST_MODULES = [
       # ... existing modules
       ("new_module", "integration.test_new_module_api"),
   ]
   ```

## 📚 Related Documentation

- [Test Cases](../../docs/TEST_CASES.md) - Detailed test case specifications
- [API Documentation](http://localhost:8000/docs) - Swagger UI
- [Backend README](../README.md) - Backend development guide
