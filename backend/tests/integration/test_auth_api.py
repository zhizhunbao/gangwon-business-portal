"""
Authentication API Integration Tests

Tests for authentication endpoints:
- Member login
- Admin login
- Registration
- Password reset
- Get current user
"""

import requests
import json
from datetime import datetime
from typing import Optional
import os
import sys

# Configuration
BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")

# Test credentials (must match setup_test_data.py)
MEMBER_CREDENTIALS = {
    "business_number": "123-45-67890",
    "password": "Member123!"
}
ADMIN_CREDENTIALS = {
    "username": "000-00-00000",
    "password": "Admin123!"
}

# New user for registration test
NEW_USER_DATA = {
    "business_number": "999-8877766",
    "company_name": "Test New Company",
    "password": "testpass123",
    "email": "newtest@example.com",
    "region": "Gangwon-do",
    "company_type": "Corporation",
    "corporate_number": "110111-9999999",
    "address": "456 New Street",
    "contact_person": "Test Person",
    "industry": "Manufacturing",
    "revenue": 500000000,
    "employee_count": 20,
    "founding_date": "2023-01-01",
    "website": "https://newtest.com",
    "main_business": "Product Manufacturing",
    "terms_agreed": True
}


class AuthAPITester:
    """Authentication API tester class"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.member_token: Optional[str] = None
        self.admin_token: Optional[str] = None
        self.results = []
        self.new_member_id: Optional[str] = None
        self.reset_token: Optional[str] = None

    def log_result(self, test_name: str, success: bool, details: str):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": "pass" if success else "fail",
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status} - {test_name}")
        print(f"   {details}\n")

    def test_member_login(self) -> bool:
        """TC1.1: Member login with valid credentials"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=MEMBER_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.member_token = data.get("access_token")
                if self.member_token:
                    self.log_result(
                        "TC1.1: Member Login",
                        True,
                        f"Status: 200, Token received: {self.member_token[:30]}..."
                    )
                    return True
                else:
                    self.log_result("TC1.1: Member Login", False, "No token in response")
                    return False
            else:
                self.log_result(
                    "TC1.1: Member Login",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC1.1: Member Login", False, f"Exception: {str(e)}")
            return False

    def test_member_login_wrong_password(self) -> bool:
        """TC1.2: Member login with wrong password"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json={"business_number": "123-45-67890", "password": "wrongpassword"},
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "TC1.2: Member Login (Wrong Password)",
                    True,
                    f"Status: 401, Correctly rejected invalid credentials"
                )
                return True
            else:
                self.log_result(
                    "TC1.2: Member Login (Wrong Password)",
                    False,
                    f"Expected 401, got {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC1.2: Member Login (Wrong Password)", False, f"Exception: {str(e)}")
            return False

    def test_admin_login(self) -> bool:
        """TC1.3: Admin login"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/admin-login",
                json=ADMIN_CREDENTIALS,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                if self.admin_token:
                    self.log_result(
                        "TC1.3: Admin Login",
                        True,
                        f"Status: 200, Token received: {self.admin_token[:30]}..."
                    )
                    return True
                else:
                    self.log_result("TC1.3: Admin Login", False, "No token in response")
                    return False
            else:
                self.log_result(
                    "TC1.3: Admin Login",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC1.3: Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_member_register(self) -> bool:
        """TC1.4: Member registration"""
        try:
            # Use unique business number for each test run (format: XXX-XX-XXXXX, at least 10 chars)
            timestamp = datetime.now().strftime('%H%M%S')
            unique_bn = f"999-88-{timestamp}"  # Format: XXX-XX-XXXXXX (12 chars with dashes)
            test_data = NEW_USER_DATA.copy()
            test_data["business_number"] = unique_bn
            test_data["email"] = f"test_{timestamp}@example.com"
            
            response = requests.post(
                f"{self.base_url}/api/auth/register",
                json=test_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.new_member_id = data.get("id")
                self.log_result(
                    "TC1.4: Member Registration",
                    True,
                    f"Status: 201, New member ID: {self.new_member_id}, Status: {data.get('approval_status', 'pending')}"
                )
                return True
            elif response.status_code == 400 and "already" in response.text.lower():
                self.log_result(
                    "TC1.4: Member Registration",
                    True,
                    f"Status: 400, User already exists (expected for repeat tests)"
                )
                return True
            else:
                self.log_result(
                    "TC1.4: Member Registration",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC1.4: Member Registration", False, f"Exception: {str(e)}")
            return False

    def test_password_reset_request(self) -> bool:
        """TC1.5: Password reset request"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/password-reset-request",
                json={
                    "business_number": "123-45-67890",
                    "email": "test@example.com"
                },
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # In development mode, reset_token may be returned
                self.reset_token = data.get("reset_token")
                self.log_result(
                    "TC1.5: Password Reset Request",
                    True,
                    f"Status: 200, Message: {data.get('message', 'OK')}"
                )
                return True
            else:
                self.log_result(
                    "TC1.5: Password Reset Request",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC1.5: Password Reset Request", False, f"Exception: {str(e)}")
            return False

    def test_get_current_user(self) -> bool:
        """TC1.6: Get current user info"""
        if not self.member_token:
            self.log_result("TC1.6: Get Current User", False, "No member token available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/auth/me",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC1.6: Get Current User",
                    True,
                    f"Status: 200, Company: {data.get('company_name')}, BN: {data.get('business_number')}"
                )
                return True
            else:
                self.log_result(
                    "TC1.6: Get Current User",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC1.6: Get Current User", False, f"Exception: {str(e)}")
            return False

    def test_get_current_user_no_token(self) -> bool:
        """ERR1.1: Access without token should return 401"""
        try:
            response = requests.get(
                f"{self.base_url}/api/auth/me",
                timeout=10
            )
            
            if response.status_code == 401:
                self.log_result(
                    "ERR1.1: Access Without Token",
                    True,
                    f"Status: 401, Correctly rejected unauthenticated request"
                )
                return True
            else:
                self.log_result(
                    "ERR1.1: Access Without Token",
                    False,
                    f"Expected 401, got {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("ERR1.1: Access Without Token", False, f"Exception: {str(e)}")
            return False

    def test_token_refresh(self) -> bool:
        """TC1.7: Token refresh"""
        if not self.member_token:
            self.log_result("TC1.7: Token Refresh", False, "No member token available")
            return False

        try:
            response = requests.post(
                f"{self.base_url}/api/auth/refresh",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                new_token = data.get("access_token")
                if new_token:
                    self.log_result(
                        "TC1.7: Token Refresh",
                        True,
                        f"Status: 200, New token received: {new_token[:30]}..."
                    )
                    return True
            
            self.log_result(
                "TC1.7: Token Refresh",
                False,
                f"Status: {response.status_code}, Error: {response.text[:200]}"
            )
            return False
        except Exception as e:
            self.log_result("TC1.7: Token Refresh", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> dict:
        """Run all authentication tests"""
        print("=" * 60)
        print("Authentication API Test Suite")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print()

        # Run tests
        self.test_member_login()
        self.test_member_login_wrong_password()
        self.test_admin_login()
        self.test_member_register()
        self.test_password_reset_request()
        self.test_get_current_user()
        self.test_get_current_user_no_token()
        self.test_token_refresh()

        # Calculate summary
        total = len(self.results)
        passed = sum(1 for r in self.results if r["status"] == "pass")
        failed = total - passed
        success_rate = (passed / total * 100) if total > 0 else 0

        # Print summary
        print("=" * 60)
        print("Test Summary")
        print("=" * 60)
        print(f"Total Tests: {total}")
        print(f"Passed: {passed} ✅")
        print(f"Failed: {failed} ❌")
        print(f"Success Rate: {success_rate:.1f}%")
        print("=" * 60)

        summary = {
            "module": "authentication",
            "total_tests": total,
            "passed": passed,
            "failed": failed,
            "success_rate": success_rate,
            "timestamp": datetime.now().isoformat(),
            "results": self.results
        }

        # Save results
        results_dir = os.path.join(os.path.dirname(__file__), "..", "test_results")
        os.makedirs(results_dir, exist_ok=True)
        
        with open(os.path.join(results_dir, "auth_test_results.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\nResults saved to: test_results/auth_test_results.json")
        
        return summary


def main():
    """Main entry point"""
    tester = AuthAPITester(BASE_URL)
    return tester.run_all_tests()


if __name__ == "__main__":
    main()

