"""
Member Management API Integration Tests

Tests for member management endpoints:
- Get member profile
- Update member profile
- Admin: List members
- Admin: Get member detail
- Admin: Approve/Reject member
"""

import requests
import json
from datetime import datetime
from typing import Optional
import os

# Configuration
BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")

MEMBER_CREDENTIALS = {
    "business_number": "123-45-67890",
    "password": "Member123!"
}
ADMIN_CREDENTIALS = {
    "username": "000-00-00000",
    "password": "Admin123!"
}


class MemberAPITester:
    """Member API tester class"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.member_token: Optional[str] = None
        self.admin_token: Optional[str] = None
        self.results = []
        self.test_member_id: Optional[str] = None

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

    def setup_tokens(self) -> bool:
        """Get authentication tokens"""
        print("Setting up authentication tokens...\n")
        
        # Member login
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=MEMBER_CREDENTIALS,
                timeout=10
            )
            if response.status_code == 200:
                self.member_token = response.json().get("access_token")
                print(f"✓ Member token acquired")
            else:
                print(f"✗ Member login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Member login error: {e}")
            return False

        # Admin login
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/admin-login",
                json=ADMIN_CREDENTIALS,
                timeout=10
            )
            if response.status_code == 200:
                self.admin_token = response.json().get("access_token")
                print(f"✓ Admin token acquired\n")
            else:
                print(f"✗ Admin login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Admin login error: {e}")
            return False

        return True

    def test_get_member_profile(self) -> bool:
        """TC2.1: Get member profile"""
        if not self.member_token:
            self.log_result("TC2.1: Get Member Profile", False, "No member token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/member/profile",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC2.1: Get Member Profile",
                    True,
                    f"Status: 200, Company: {data.get('company_name')}, Industry: {data.get('industry')}"
                )
                return True
            else:
                self.log_result(
                    "TC2.1: Get Member Profile",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC2.1: Get Member Profile", False, f"Exception: {str(e)}")
            return False

    def test_update_member_profile(self) -> bool:
        """TC2.2: Update member profile"""
        if not self.member_token:
            self.log_result("TC2.2: Update Member Profile", False, "No member token")
            return False

        try:
            update_data = {
                "industry": "Software Development",
                "employee_count": 60
            }
            
            response = requests.put(
                f"{self.base_url}/api/member/profile",
                headers={"Authorization": f"Bearer {self.member_token}"},
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC2.2: Update Member Profile",
                    True,
                    f"Status: 200, Updated industry: {data.get('industry')}, employees: {data.get('employee_count')}"
                )
                return True
            else:
                self.log_result(
                    "TC2.2: Update Member Profile",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC2.2: Update Member Profile", False, f"Exception: {str(e)}")
            return False

    def test_admin_list_members(self) -> bool:
        """TC2.3: Admin get member list"""
        if not self.admin_token:
            self.log_result("TC2.3: Admin List Members", False, "No admin token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/members",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                params={"page": 1, "page_size": 10},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("total", 0)
                items = data.get("items", [])
                
                # Store first member ID for detail test
                if items:
                    self.test_member_id = items[0].get("id")
                
                self.log_result(
                    "TC2.3: Admin List Members",
                    True,
                    f"Status: 200, Total: {total}, Items: {len(items)}"
                )
                return True
            else:
                self.log_result(
                    "TC2.3: Admin List Members",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC2.3: Admin List Members", False, f"Exception: {str(e)}")
            return False

    def test_admin_list_members_with_filter(self) -> bool:
        """TC2.3b: Admin list members with filters"""
        if not self.admin_token:
            self.log_result("TC2.3b: Admin List Members (Filter)", False, "No admin token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/members",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                params={"page": 1, "page_size": 10, "approval_status": "approved"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC2.3b: Admin List Members (Filter)",
                    True,
                    f"Status: 200, Total approved: {data.get('total', 0)}"
                )
                return True
            else:
                self.log_result(
                    "TC2.3b: Admin List Members (Filter)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC2.3b: Admin List Members (Filter)", False, f"Exception: {str(e)}")
            return False

    def test_admin_get_member_detail(self) -> bool:
        """TC2.4: Admin get member detail"""
        if not self.admin_token:
            self.log_result("TC2.4: Admin Get Member Detail", False, "No admin token")
            return False
        
        if not self.test_member_id:
            self.log_result("TC2.4: Admin Get Member Detail", False, "No test member ID")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/members/{self.test_member_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC2.4: Admin Get Member Detail",
                    True,
                    f"Status: 200, Company: {data.get('company_name')}, Status: {data.get('approval_status')}"
                )
                return True
            else:
                self.log_result(
                    "TC2.4: Admin Get Member Detail",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC2.4: Admin Get Member Detail", False, f"Exception: {str(e)}")
            return False

    def test_member_access_admin_endpoint(self) -> bool:
        """ERR2.1: Member trying to access admin endpoint"""
        if not self.member_token:
            self.log_result("ERR2.1: Member Access Admin Endpoint", False, "No member token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/members",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 403:
                self.log_result(
                    "ERR2.1: Member Access Admin Endpoint",
                    True,
                    f"Status: 403, Correctly denied access to admin endpoint"
                )
                return True
            else:
                self.log_result(
                    "ERR2.1: Member Access Admin Endpoint",
                    False,
                    f"Expected 403, got {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("ERR2.1: Member Access Admin Endpoint", False, f"Exception: {str(e)}")
            return False

    def test_admin_get_nonexistent_member(self) -> bool:
        """ERR3.1: Admin get non-existent member"""
        if not self.admin_token:
            self.log_result("ERR3.1: Get Non-existent Member", False, "No admin token")
            return False

        try:
            fake_id = "00000000-0000-0000-0000-000000000000"
            response = requests.get(
                f"{self.base_url}/api/admin/members/{fake_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 404:
                self.log_result(
                    "ERR3.1: Get Non-existent Member",
                    True,
                    f"Status: 404, Correctly returned Not Found"
                )
                return True
            else:
                self.log_result(
                    "ERR3.1: Get Non-existent Member",
                    False,
                    f"Expected 404, got {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("ERR3.1: Get Non-existent Member", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> dict:
        """Run all member management tests"""
        print("=" * 60)
        print("Member Management API Test Suite")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print()

        # Setup tokens
        if not self.setup_tokens():
            print("Failed to setup authentication tokens. Aborting tests.")
            return {"error": "Authentication setup failed"}

        # Run tests
        self.test_get_member_profile()
        self.test_update_member_profile()
        self.test_admin_list_members()
        self.test_admin_list_members_with_filter()
        self.test_admin_get_member_detail()
        self.test_member_access_admin_endpoint()
        self.test_admin_get_nonexistent_member()

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
            "module": "member_management",
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
        
        with open(os.path.join(results_dir, "member_test_results.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\nResults saved to: test_results/member_test_results.json")
        
        return summary


def main():
    """Main entry point"""
    tester = MemberAPITester(BASE_URL)
    return tester.run_all_tests()


if __name__ == "__main__":
    main()

