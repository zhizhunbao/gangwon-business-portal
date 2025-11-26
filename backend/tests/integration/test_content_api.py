"""
Content Management API Integration Tests

Tests for content management endpoints:
- Notices (public and admin)
- Press releases (public and admin)
- Banners (public and admin)
- System info
"""

import requests
import json
from datetime import datetime
from typing import Optional
import os

# Configuration
BASE_URL = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")

ADMIN_CREDENTIALS = {
    "username": "000-00-00000",
    "password": "Admin123!"
}


class ContentAPITester:
    """Content API tester class"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.admin_token: Optional[str] = None
        self.results = []
        self.test_notice_id: Optional[str] = None
        self.test_press_id: Optional[str] = None
        self.test_banner_id: Optional[str] = None

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

    def setup_admin_token(self) -> bool:
        """Get admin authentication token"""
        print("Setting up admin authentication...\n")
        
        try:
            response = requests.post(
                f"{self.base_url}/api/auth/admin-login",
                json=ADMIN_CREDENTIALS,
                timeout=10
            )
            if response.status_code == 200:
                self.admin_token = response.json().get("access_token")
                print(f"✓ Admin token acquired\n")
                return True
            else:
                print(f"✗ Admin login failed: {response.status_code}")
                return False
        except Exception as e:
            print(f"✗ Admin login error: {e}")
            return False

    # ========== Notice Tests ==========
    
    def test_list_notices_public(self) -> bool:
        """TC5.1: List notices (public)"""
        try:
            response = requests.get(
                f"{self.base_url}/api/notices",
                params={"page": 1, "page_size": 10},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("total", 0)
                items = data.get("items", [])
                
                if items:
                    self.test_notice_id = items[0].get("id")
                
                self.log_result(
                    "TC5.1: List Notices (Public)",
                    True,
                    f"Status: 200, Total: {total}, Items: {len(items)}"
                )
                return True
            else:
                self.log_result(
                    "TC5.1: List Notices (Public)",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.1: List Notices (Public)", False, f"Exception: {str(e)}")
            return False

    def test_get_latest_notices(self) -> bool:
        """TC5.2: Get latest 5 notices"""
        try:
            response = requests.get(
                f"{self.base_url}/api/notices/latest5",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else len(data.get("items", []))
                self.log_result(
                    "TC5.2: Get Latest Notices",
                    True,
                    f"Status: 200, Count: {count} (max 5)"
                )
                return True
            else:
                self.log_result(
                    "TC5.2: Get Latest Notices",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.2: Get Latest Notices", False, f"Exception: {str(e)}")
            return False

    def test_admin_create_notice(self) -> bool:
        """TC5.5: Admin create notice"""
        if not self.admin_token:
            self.log_result("TC5.5: Admin Create Notice", False, "No admin token")
            return False

        try:
            notice_data = {
                "title": f"Test Notice {datetime.now().strftime('%H%M%S')}",
                "content_html": "<p>This is a test notice content created by integration tests.</p>"
            }
            
            response = requests.post(
                f"{self.base_url}/api/admin/content/notices",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=notice_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_notice_id = data.get("id")
                self.log_result(
                    "TC5.5: Admin Create Notice",
                    True,
                    f"Status: 201, ID: {self.test_notice_id}"
                )
                return True
            else:
                self.log_result(
                    "TC5.5: Admin Create Notice",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.5: Admin Create Notice", False, f"Exception: {str(e)}")
            return False

    def test_admin_update_notice(self) -> bool:
        """TC5.5b: Admin update notice"""
        if not self.admin_token or not self.test_notice_id:
            self.log_result("TC5.5b: Admin Update Notice", False, "Missing token or ID")
            return False

        try:
            update_data = {
                "title": f"Updated Notice {datetime.now().strftime('%H%M%S')}"
            }
            
            response = requests.put(
                f"{self.base_url}/api/admin/content/notices/{self.test_notice_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_result(
                    "TC5.5b: Admin Update Notice",
                    True,
                    f"Status: 200, Updated successfully"
                )
                return True
            else:
                self.log_result(
                    "TC5.5b: Admin Update Notice",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.5b: Admin Update Notice", False, f"Exception: {str(e)}")
            return False

    # ========== Press Release Tests ==========
    
    def test_list_press_releases(self) -> bool:
        """TC5.3: List press releases (public)"""
        try:
            response = requests.get(
                f"{self.base_url}/api/press",
                params={"page": 1, "page_size": 10},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("total", 0)
                items = data.get("items", [])
                
                if items:
                    self.test_press_id = items[0].get("id")
                
                self.log_result(
                    "TC5.3: List Press Releases (Public)",
                    True,
                    f"Status: 200, Total: {total}, Items: {len(items)}"
                )
                return True
            else:
                self.log_result(
                    "TC5.3: List Press Releases (Public)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.3: List Press Releases (Public)", False, f"Exception: {str(e)}")
            return False

    def test_get_latest_press(self) -> bool:
        """TC5.3b: Get latest press release"""
        try:
            response = requests.get(
                f"{self.base_url}/api/press/latest1",
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_result(
                    "TC5.3b: Get Latest Press Release",
                    True,
                    f"Status: 200"
                )
                return True
            elif response.status_code == 404:
                self.log_result(
                    "TC5.3b: Get Latest Press Release",
                    True,
                    f"Status: 404, No press releases available"
                )
                return True
            else:
                self.log_result(
                    "TC5.3b: Get Latest Press Release",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.3b: Get Latest Press Release", False, f"Exception: {str(e)}")
            return False

    # ========== Banner Tests ==========
    
    def test_get_banners(self) -> bool:
        """TC5.4: Get active banners (public)"""
        try:
            response = requests.get(
                f"{self.base_url}/api/banners",
                params={"type": "MAIN"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else len(data.get("items", []))
                self.log_result(
                    "TC5.4: Get Banners (Public)",
                    True,
                    f"Status: 200, Count: {count}"
                )
                return True
            else:
                self.log_result(
                    "TC5.4: Get Banners (Public)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.4: Get Banners (Public)", False, f"Exception: {str(e)}")
            return False

    def test_admin_create_banner(self) -> bool:
        """TC5.6: Admin create banner"""
        if not self.admin_token:
            self.log_result("TC5.6: Admin Create Banner", False, "No admin token")
            return False

        try:
            banner_data = {
                "banner_type": "MAIN",
                "image_url": "/uploads/banners/test.png",
                "is_active": "true"
            }
            
            response = requests.post(
                f"{self.base_url}/api/admin/content/banners",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=banner_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_banner_id = data.get("id")
                self.log_result(
                    "TC5.6: Admin Create Banner",
                    True,
                    f"Status: 201, ID: {self.test_banner_id}"
                )
                return True
            else:
                self.log_result(
                    "TC5.6: Admin Create Banner",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.6: Admin Create Banner", False, f"Exception: {str(e)}")
            return False

    def test_admin_get_all_banners(self) -> bool:
        """TC5.6b: Admin get all banners (including inactive)"""
        if not self.admin_token:
            self.log_result("TC5.6b: Admin Get All Banners", False, "No admin token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/content/banners",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else len(data.get("items", []))
                self.log_result(
                    "TC5.6b: Admin Get All Banners",
                    True,
                    f"Status: 200, Total: {count}"
                )
                return True
            else:
                self.log_result(
                    "TC5.6b: Admin Get All Banners",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.6b: Admin Get All Banners", False, f"Exception: {str(e)}")
            return False

    # ========== System Info Tests ==========
    
    def test_get_system_info(self) -> bool:
        """TC5.7: Get system info (public)"""
        try:
            response = requests.get(
                f"{self.base_url}/api/system-info",
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_result(
                    "TC5.7: Get System Info (Public)",
                    True,
                    f"Status: 200"
                )
                return True
            elif response.status_code == 404:
                self.log_result(
                    "TC5.7: Get System Info (Public)",
                    True,
                    f"Status: 404, System info not configured yet"
                )
                return True
            else:
                self.log_result(
                    "TC5.7: Get System Info (Public)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC5.7: Get System Info (Public)", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> dict:
        """Run all content management tests"""
        print("=" * 60)
        print("Content Management API Test Suite")
        print("=" * 60)
        print(f"Base URL: {self.base_url}")
        print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        print("=" * 60)
        print()

        # Setup admin token
        if not self.setup_admin_token():
            print("Failed to setup admin authentication. Some tests will be skipped.")

        # Run tests
        self.test_list_notices_public()
        self.test_get_latest_notices()
        self.test_admin_create_notice()
        self.test_admin_update_notice()
        self.test_list_press_releases()
        self.test_get_latest_press()
        self.test_get_banners()
        self.test_admin_create_banner()
        self.test_admin_get_all_banners()
        self.test_get_system_info()

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
            "module": "content_management",
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
        
        with open(os.path.join(results_dir, "content_test_results.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\nResults saved to: test_results/content_test_results.json")
        
        return summary


def main():
    """Main entry point"""
    tester = ContentAPITester(BASE_URL)
    return tester.run_all_tests()


if __name__ == "__main__":
    main()

