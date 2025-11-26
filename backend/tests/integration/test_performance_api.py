"""
Performance API Test Script

This script tests the Performance Management API endpoints using the requests library.
"""

import requests
import json
from datetime import datetime
from typing import Optional

# Configuration
BASE_URL = "http://127.0.0.1:8000"
MEMBER_CREDENTIALS = {
    "business_number": "123-45-67890",
    "password": "Member123!"
}
ADMIN_CREDENTIALS = {
    "username": "000-00-00000",
    "password": "Admin123!"
}


class PerformanceAPITester:
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.member_token: Optional[str] = None
        self.admin_token: Optional[str] = None
        self.test_performance_id: Optional[str] = None
        self.results = []

    def log_result(self, test_name: str, success: bool, details: str):
        """Log test result"""
        status = "✅ PASS" if success else "❌ FAIL"
        result = {
            "test": test_name,
            "status": status,
            "details": details,
            "timestamp": datetime.now().isoformat()
        }
        self.results.append(result)
        print(f"{status} - {test_name}")
        print(f"   {details}\n")

    def test_member_login(self) -> bool:
        """Test 1: Member login"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/login",
                json=MEMBER_CREDENTIALS
            )
            
            if response.status_code == 200:
                data = response.json()
                self.member_token = data.get("access_token")
                self.log_result(
                    "TC1: Member Login",
                    True,
                    f"Status: {response.status_code}, Token received: {self.member_token[:20]}..."
                )
                return True
            else:
                self.log_result(
                    "TC1: Member Login",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC1: Member Login", False, f"Exception: {str(e)}")
            return False

    def test_create_performance(self) -> bool:
        """Test 2: Create performance record"""
        if not self.member_token:
            self.log_result("TC2: Create Performance", False, "No member token available")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.member_token}"}
            data = {
                "year": 2024,
                "quarter": 4,
                "type": "sales",
                "data_json": {
                    "sales_employment": {
                        "total_revenue": 1500000000,
                        "new_employees": 5,
                        "total_employees": 35,
                        "revenue_breakdown": [
                            {"category": "국내매출", "amount": 1000000000},
                            {"category": "수출매출", "amount": 500000000}
                        ]
                    }
                }
            }

            response = requests.post(
                f"{self.base_url}/api/performance",
                headers=headers,
                json=data
            )

            if response.status_code == 201:
                result = response.json()
                self.test_performance_id = result.get("id")
                self.log_result(
                    "TC2: Create Performance",
                    True,
                    f"Status: 201, ID: {self.test_performance_id}, Status: {result.get('status')}"
                )
                return True
            else:
                self.log_result(
                    "TC2: Create Performance",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC2: Create Performance", False, f"Exception: {str(e)}")
            return False

    def test_list_performance(self) -> bool:
        """Test 3: List performance records"""
        if not self.member_token:
            self.log_result("TC3: List Performance", False, "No member token available")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.member_token}"}
            response = requests.get(
                f"{self.base_url}/api/performance",
                headers=headers,
                params={"page": 1, "page_size": 10}
            )

            if response.status_code == 200:
                result = response.json()
                total = result.get("total", 0)
                items_count = len(result.get("items", []))
                self.log_result(
                    "TC3: List Performance",
                    True,
                    f"Status: 200, Total: {total}, Items: {items_count}"
                )
                return True
            else:
                self.log_result(
                    "TC3: List Performance",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC3: List Performance", False, f"Exception: {str(e)}")
            return False

    def test_get_performance_detail(self) -> bool:
        """Test 4: Get performance record details"""
        if not self.member_token or not self.test_performance_id:
            self.log_result("TC4: Get Performance Detail", False, "Missing token or ID")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.member_token}"}
            response = requests.get(
                f"{self.base_url}/api/performance/{self.test_performance_id}",
                headers=headers
            )

            if response.status_code == 200:
                result = response.json()
                self.log_result(
                    "TC4: Get Performance Detail",
                    True,
                    f"Status: 200, Year: {result.get('year')}, Quarter: {result.get('quarter')}"
                )
                return True
            else:
                self.log_result(
                    "TC4: Get Performance Detail",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC4: Get Performance Detail", False, f"Exception: {str(e)}")
            return False

    def test_update_performance(self) -> bool:
        """Test 5: Update performance record"""
        if not self.member_token or not self.test_performance_id:
            self.log_result("TC5: Update Performance", False, "Missing token or ID")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.member_token}"}
            data = {
                "data_json": {
                    "sales_employment": {
                        "total_revenue": 2000000000,  # Updated value
                        "new_employees": 10,
                        "total_employees": 40
                    }
                }
            }

            response = requests.put(
                f"{self.base_url}/api/performance/{self.test_performance_id}",
                headers=headers,
                json=data
            )

            if response.status_code == 200:
                result = response.json()
                new_revenue = result.get("data_json", {}).get("sales_employment", {}).get("total_revenue")
                self.log_result(
                    "TC5: Update Performance",
                    True,
                    f"Status: 200, New Revenue: {new_revenue}"
                )
                return True
            else:
                self.log_result(
                    "TC5: Update Performance",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC5: Update Performance", False, f"Exception: {str(e)}")
            return False

    def test_submit_performance(self) -> bool:
        """Test 6: Submit performance for review"""
        if not self.member_token or not self.test_performance_id:
            self.log_result("TC6: Submit Performance", False, "Missing token or ID")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.member_token}"}
            response = requests.post(
                f"{self.base_url}/api/performance/{self.test_performance_id}/submit",
                headers=headers
            )

            if response.status_code == 200:
                result = response.json()
                status = result.get("status")
                self.log_result(
                    "TC6: Submit Performance",
                    True,
                    f"Status: 200, New Status: {status}"
                )
                return True
            else:
                self.log_result(
                    "TC6: Submit Performance",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC6: Submit Performance", False, f"Exception: {str(e)}")
            return False

    def test_admin_login(self) -> bool:
        """Test 7: Admin login"""
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/admin-login",
                json=ADMIN_CREDENTIALS
            )

            if response.status_code == 200:
                data = response.json()
                self.admin_token = data.get("access_token")
                self.log_result(
                    "TC7: Admin Login",
                    True,
                    f"Status: 200, Token received: {self.admin_token[:20]}..."
                )
                return True
            else:
                self.log_result(
                    "TC7: Admin Login",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC7: Admin Login", False, f"Exception: {str(e)}")
            return False

    def test_admin_list_performance(self) -> bool:
        """Test 8: Admin list all performance records"""
        if not self.admin_token:
            self.log_result("TC8: Admin List Performance", False, "No admin token available")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            response = requests.get(
                f"{self.base_url}/api/admin/performance",
                headers=headers,
                params={"status": "submitted", "page": 1, "page_size": 10}
            )

            if response.status_code == 200:
                result = response.json()
                total = result.get("total", 0)
                items_count = len(result.get("items", []))
                self.log_result(
                    "TC8: Admin List Performance",
                    True,
                    f"Status: 200, Total: {total}, Items: {items_count}"
                )
                return True
            else:
                self.log_result(
                    "TC8: Admin List Performance",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC8: Admin List Performance", False, f"Exception: {str(e)}")
            return False

    def test_admin_approve_performance(self) -> bool:
        """Test 9: Admin approve performance"""
        if not self.admin_token or not self.test_performance_id:
            self.log_result("TC9: Admin Approve Performance", False, "Missing token or ID")
            return False

        try:
            headers = {"Authorization": f"Bearer {self.admin_token}"}
            data = {
                "status": "approved",
                "comments": "Data verified and approved - test comment"
            }

            response = requests.put(
                f"{self.base_url}/api/admin/performance/{self.test_performance_id}/approve",
                headers=headers,
                json=data
            )

            if response.status_code == 200:
                result = response.json()
                status = result.get("status")
                self.log_result(
                    "TC9: Admin Approve Performance",
                    True,
                    f"Status: 200, New Status: {status}"
                )
                return True
            else:
                self.log_result(
                    "TC9: Admin Approve Performance",
                    False,
                    f"Status: {response.status_code}, Error: {response.text}"
                )
                return False
        except Exception as e:
            self.log_result("TC9: Admin Approve Performance", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self):
        """Run all tests in sequence"""
        print("="*60)
        print("Performance API Test Suite")
        print("="*60)
        print(f"Base URL: {self.base_url}")
        print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("="*60)
        print()

        # Run tests
        self.test_member_login()
        self.test_create_performance()
        self.test_list_performance()
        self.test_get_performance_detail()
        self.test_update_performance()
        self.test_submit_performance()
        self.test_admin_login()
        self.test_admin_list_performance()
        self.test_admin_approve_performance()

        # Print summary
        print("="*60)
        print("Test Summary")
        print("="*60)
        
        total_tests = len(self.results)
        passed_tests = sum(1 for r in self.results if "✅" in r["status"])
        failed_tests = total_tests - passed_tests
        
        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests} ✅")
        print(f"Failed: {failed_tests} ❌")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print("="*60)

        # Save results to file
        with open("test_results.json", "w", encoding="utf-8") as f:
            json.dump(self.results, f, indent=2, ensure_ascii=False)
        print("\nDetailed results saved to: test_results.json")


def main():
    """Main entry point for the test runner"""
    tester = PerformanceAPITester(BASE_URL)
    tester.run_all_tests()
    
    # Return results for the test runner
    total = len(tester.results)
    passed = sum(1 for r in tester.results if "✅" in r["status"])
    return {
        "module": "performance_management",
        "total_tests": total,
        "passed": passed,
        "failed": total - passed,
        "success_rate": (passed / total * 100) if total > 0 else 0,
        "results": tester.results
    }


if __name__ == "__main__":
    main()
