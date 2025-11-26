"""
Support Module API Integration Tests

Tests for support module endpoints:
- FAQ (public)
- Inquiries (member and admin)
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


class SupportAPITester:
    """Support API tester class"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.member_token: Optional[str] = None
        self.admin_token: Optional[str] = None
        self.results = []
        self.test_faq_id: Optional[str] = None
        self.test_inquiry_id: Optional[str] = None

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

    # ========== FAQ Tests ==========
    
    def test_list_faqs_public(self) -> bool:
        """TC6.1: List FAQs (public)"""
        try:
            response = requests.get(
                f"{self.base_url}/api/faqs",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else len(data.get("items", []))
                self.log_result(
                    "TC6.1: List FAQs (Public)",
                    True,
                    f"Status: 200, Count: {count}"
                )
                return True
            else:
                self.log_result(
                    "TC6.1: List FAQs (Public)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.1: List FAQs (Public)", False, f"Exception: {str(e)}")
            return False

    def test_list_faqs_with_category(self) -> bool:
        """TC6.1b: List FAQs with category filter"""
        try:
            response = requests.get(
                f"{self.base_url}/api/faqs",
                params={"category": "general"},
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_result(
                    "TC6.1b: List FAQs (Category Filter)",
                    True,
                    f"Status: 200"
                )
                return True
            else:
                self.log_result(
                    "TC6.1b: List FAQs (Category Filter)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.1b: List FAQs (Category Filter)", False, f"Exception: {str(e)}")
            return False

    def test_admin_create_faq(self) -> bool:
        """TC6.1c: Admin create FAQ"""
        if not self.admin_token:
            self.log_result("TC6.1c: Admin Create FAQ", False, "No admin token")
            return False

        try:
            faq_data = {
                "category": "general",
                "question": f"Test Question {datetime.now().strftime('%H%M%S')}?",
                "answer": "This is a test answer created by integration tests.",
                "display_order": 999
            }
            
            response = requests.post(
                f"{self.base_url}/api/admin/faqs",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=faq_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_faq_id = data.get("id")
                self.log_result(
                    "TC6.1c: Admin Create FAQ",
                    True,
                    f"Status: 201, ID: {self.test_faq_id}"
                )
                return True
            else:
                self.log_result(
                    "TC6.1c: Admin Create FAQ",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.1c: Admin Create FAQ", False, f"Exception: {str(e)}")
            return False

    def test_admin_update_faq(self) -> bool:
        """TC6.1d: Admin update FAQ"""
        if not self.admin_token or not self.test_faq_id:
            self.log_result("TC6.1d: Admin Update FAQ", False, "Missing token or ID")
            return False

        try:
            update_data = {
                "answer": f"Updated answer - {datetime.now().isoformat()}"
            }
            
            response = requests.put(
                f"{self.base_url}/api/admin/faqs/{self.test_faq_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                self.log_result(
                    "TC6.1d: Admin Update FAQ",
                    True,
                    f"Status: 200"
                )
                return True
            else:
                self.log_result(
                    "TC6.1d: Admin Update FAQ",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.1d: Admin Update FAQ", False, f"Exception: {str(e)}")
            return False

    # ========== Inquiry Tests ==========
    
    def test_member_create_inquiry(self) -> bool:
        """TC6.2: Member create inquiry"""
        if not self.member_token:
            self.log_result("TC6.2: Create Inquiry", False, "No member token")
            return False

        try:
            inquiry_data = {
                "subject": f"Test Inquiry {datetime.now().strftime('%H%M%S')}",
                "content": "This is a test inquiry content. Please help me with this question."
            }
            
            response = requests.post(
                f"{self.base_url}/api/inquiries",
                headers={"Authorization": f"Bearer {self.member_token}"},
                json=inquiry_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_inquiry_id = data.get("id")
                self.log_result(
                    "TC6.2: Create Inquiry",
                    True,
                    f"Status: 201, ID: {self.test_inquiry_id}"
                )
                return True
            else:
                self.log_result(
                    "TC6.2: Create Inquiry",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.2: Create Inquiry", False, f"Exception: {str(e)}")
            return False

    def test_member_list_inquiries(self) -> bool:
        """TC6.3: Member list own inquiries"""
        if not self.member_token:
            self.log_result("TC6.3: List My Inquiries", False, "No member token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/inquiries",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else len(data.get("items", []))
                
                # Get inquiry ID if not already set
                items = data if isinstance(data, list) else data.get("items", [])
                if items and not self.test_inquiry_id:
                    self.test_inquiry_id = items[0].get("id")
                
                self.log_result(
                    "TC6.3: List My Inquiries",
                    True,
                    f"Status: 200, Count: {count}"
                )
                return True
            else:
                self.log_result(
                    "TC6.3: List My Inquiries",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.3: List My Inquiries", False, f"Exception: {str(e)}")
            return False

    def test_member_get_inquiry_detail(self) -> bool:
        """TC6.4: Member get inquiry detail"""
        if not self.member_token or not self.test_inquiry_id:
            self.log_result("TC6.4: Get Inquiry Detail", False, "Missing token or ID")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/inquiries/{self.test_inquiry_id}",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC6.4: Get Inquiry Detail",
                    True,
                    f"Status: 200, Title: {data.get('title', '')[:30]}, Status: {data.get('status')}"
                )
                return True
            else:
                self.log_result(
                    "TC6.4: Get Inquiry Detail",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.4: Get Inquiry Detail", False, f"Exception: {str(e)}")
            return False

    def test_admin_list_all_inquiries(self) -> bool:
        """TC6.5: Admin list all inquiries"""
        if not self.admin_token:
            self.log_result("TC6.5: Admin List All Inquiries", False, "No admin token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/inquiries",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                count = len(data) if isinstance(data, list) else len(data.get("items", []))
                self.log_result(
                    "TC6.5: Admin List All Inquiries",
                    True,
                    f"Status: 200, Total: {count}"
                )
                return True
            else:
                self.log_result(
                    "TC6.5: Admin List All Inquiries",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.5: Admin List All Inquiries", False, f"Exception: {str(e)}")
            return False

    def test_admin_reply_inquiry(self) -> bool:
        """TC6.5b: Admin reply to inquiry"""
        if not self.admin_token or not self.test_inquiry_id:
            self.log_result("TC6.5b: Admin Reply Inquiry", False, "Missing token or ID")
            return False

        try:
            reply_data = {
                "admin_reply": f"Thank you for your inquiry. This is a test reply - {datetime.now().isoformat()}"
            }
            
            response = requests.put(
                f"{self.base_url}/api/admin/inquiries/{self.test_inquiry_id}/reply",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=reply_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC6.5b: Admin Reply Inquiry",
                    True,
                    f"Status: 200, New Status: {data.get('status')}"
                )
                return True
            else:
                self.log_result(
                    "TC6.5b: Admin Reply Inquiry",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.5b: Admin Reply Inquiry", False, f"Exception: {str(e)}")
            return False

    def test_member_view_replied_inquiry(self) -> bool:
        """TC6.6: Member view replied inquiry"""
        if not self.member_token or not self.test_inquiry_id:
            self.log_result("TC6.6: View Replied Inquiry", False, "Missing token or ID")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/inquiries/{self.test_inquiry_id}",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                has_reply = bool(data.get("admin_reply"))
                self.log_result(
                    "TC6.6: View Replied Inquiry",
                    True,
                    f"Status: 200, Has Reply: {has_reply}, Status: {data.get('status')}"
                )
                return True
            else:
                self.log_result(
                    "TC6.6: View Replied Inquiry",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC6.6: View Replied Inquiry", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> dict:
        """Run all support module tests"""
        print("=" * 60)
        print("Support Module API Test Suite")
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
        # FAQ tests
        self.test_list_faqs_public()
        self.test_list_faqs_with_category()
        self.test_admin_create_faq()
        self.test_admin_update_faq()
        
        # Inquiry tests
        self.test_member_create_inquiry()
        self.test_member_list_inquiries()
        self.test_member_get_inquiry_detail()
        self.test_admin_list_all_inquiries()
        self.test_admin_reply_inquiry()
        self.test_member_view_replied_inquiry()

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
            "module": "support",
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
        
        with open(os.path.join(results_dir, "support_test_results.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\nResults saved to: test_results/support_test_results.json")
        
        return summary


def main():
    """Main entry point"""
    tester = SupportAPITester(BASE_URL)
    return tester.run_all_tests()


if __name__ == "__main__":
    main()

