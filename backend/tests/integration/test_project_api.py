"""
Project Management API Integration Tests

Tests for project management endpoints:
- List projects (public)
- Get project detail (public)
- Apply to project (member)
- Get my applications (member)
- Admin: Create/Update/Delete projects
- Admin: Manage applications
"""

import requests
import json
from datetime import datetime, timedelta
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


class ProjectAPITester:
    """Project API tester class"""
    
    def __init__(self, base_url: str):
        self.base_url = base_url
        self.member_token: Optional[str] = None
        self.admin_token: Optional[str] = None
        self.results = []
        self.test_project_id: Optional[str] = None
        self.test_application_id: Optional[str] = None

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

    def test_list_projects_public(self) -> bool:
        """TC4.1: List projects (public access)"""
        try:
            response = requests.get(
                f"{self.base_url}/api/projects",
                params={"page": 1, "page_size": 10},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                total = data.get("total", 0)
                items = data.get("items", [])
                
                # Store first project ID for later tests
                if items:
                    self.test_project_id = items[0].get("id")
                
                self.log_result(
                    "TC4.1: List Projects (Public)",
                    True,
                    f"Status: 200, Total: {total}, Items: {len(items)}"
                )
                return True
            else:
                self.log_result(
                    "TC4.1: List Projects (Public)",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.1: List Projects (Public)", False, f"Exception: {str(e)}")
            return False

    def test_get_project_detail_public(self) -> bool:
        """TC4.2: Get project detail (public access)"""
        if not self.test_project_id:
            self.log_result("TC4.2: Get Project Detail (Public)", False, "No test project ID available")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/projects/{self.test_project_id}",
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC4.2: Get Project Detail (Public)",
                    True,
                    f"Status: 200, Title: {data.get('title')[:30]}..., Status: {data.get('status')}"
                )
                return True
            else:
                self.log_result(
                    "TC4.2: Get Project Detail (Public)",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.2: Get Project Detail (Public)", False, f"Exception: {str(e)}")
            return False

    def test_admin_create_project(self) -> bool:
        """TC4.5: Admin create project"""
        if not self.admin_token:
            self.log_result("TC4.5: Admin Create Project", False, "No admin token")
            return False

        try:
            start_date = datetime.now()
            end_date = start_date + timedelta(days=365)
            
            project_data = {
                "title": f"Test Project {datetime.now().strftime('%H%M%S')}",
                "description": "This is a test project created by integration tests.",
                "target_audience": "Test companies",
                "start_date": start_date.strftime("%Y-%m-%d"),
                "end_date": end_date.strftime("%Y-%m-%d"),
                "status": "active"
            }
            
            response = requests.post(
                f"{self.base_url}/api/admin/projects",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=project_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                # Use newly created project for application test
                self.test_project_id = data.get("id")
                self.log_result(
                    "TC4.5: Admin Create Project",
                    True,
                    f"Status: 201, ID: {self.test_project_id}, Title: {data.get('title')}"
                )
                return True
            else:
                self.log_result(
                    "TC4.5: Admin Create Project",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.5: Admin Create Project", False, f"Exception: {str(e)}")
            return False

    def test_apply_to_project(self) -> bool:
        """TC4.3: Apply to project"""
        if not self.member_token:
            self.log_result("TC4.3: Apply to Project", False, "No member token")
            return False
        
        if not self.test_project_id:
            self.log_result("TC4.3: Apply to Project", False, "No test project ID")
            return False

        try:
            application_data = {
                "application_reason": "We are interested in this project and believe we meet all the requirements. Our company has relevant experience in this field."
            }
            
            response = requests.post(
                f"{self.base_url}/api/projects/{self.test_project_id}/apply",
                headers={"Authorization": f"Bearer {self.member_token}"},
                json=application_data,
                timeout=10
            )
            
            if response.status_code == 201:
                data = response.json()
                self.test_application_id = data.get("id")
                self.log_result(
                    "TC4.3: Apply to Project",
                    True,
                    f"Status: 201, Application ID: {self.test_application_id}"
                )
                return True
            elif response.status_code == 400 and "already" in response.text.lower():
                self.log_result(
                    "TC4.3: Apply to Project",
                    True,
                    f"Status: 400, Already applied (expected for repeat tests)"
                )
                return True
            else:
                self.log_result(
                    "TC4.3: Apply to Project",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.3: Apply to Project", False, f"Exception: {str(e)}")
            return False

    def test_get_my_applications(self) -> bool:
        """TC4.4: Get my applications"""
        if not self.member_token:
            self.log_result("TC4.4: Get My Applications", False, "No member token")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/my-applications",
                headers={"Authorization": f"Bearer {self.member_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                # Handle both list and paginated response
                items = data if isinstance(data, list) else data.get("items", [])
                self.log_result(
                    "TC4.4: Get My Applications",
                    True,
                    f"Status: 200, Applications count: {len(items)}"
                )
                return True
            else:
                self.log_result(
                    "TC4.4: Get My Applications",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.4: Get My Applications", False, f"Exception: {str(e)}")
            return False

    def test_admin_get_project_applications(self) -> bool:
        """TC4.6: Admin get project applications"""
        if not self.admin_token:
            self.log_result("TC4.6: Admin Get Project Applications", False, "No admin token")
            return False
        
        if not self.test_project_id:
            self.log_result("TC4.6: Admin Get Project Applications", False, "No test project ID")
            return False

        try:
            response = requests.get(
                f"{self.base_url}/api/admin/projects/{self.test_project_id}/applications",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                items = data if isinstance(data, list) else data.get("items", [])
                
                # Store application ID if found
                if items and not self.test_application_id:
                    self.test_application_id = items[0].get("id")
                
                self.log_result(
                    "TC4.6: Admin Get Project Applications",
                    True,
                    f"Status: 200, Applications: {len(items)}"
                )
                return True
            else:
                self.log_result(
                    "TC4.6: Admin Get Project Applications",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.6: Admin Get Project Applications", False, f"Exception: {str(e)}")
            return False

    def test_admin_update_project(self) -> bool:
        """TC4.7: Admin update project"""
        if not self.admin_token:
            self.log_result("TC4.7: Admin Update Project", False, "No admin token")
            return False
        
        if not self.test_project_id:
            self.log_result("TC4.7: Admin Update Project", False, "No test project ID")
            return False

        try:
            update_data = {
                "description": "Updated description - " + datetime.now().isoformat()
            }
            
            response = requests.put(
                f"{self.base_url}/api/admin/projects/{self.test_project_id}",
                headers={"Authorization": f"Bearer {self.admin_token}"},
                json=update_data,
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC4.7: Admin Update Project",
                    True,
                    f"Status: 200, Updated description starts with: {data.get('description', '')[:30]}..."
                )
                return True
            else:
                self.log_result(
                    "TC4.7: Admin Update Project",
                    False,
                    f"Status: {response.status_code}, Error: {response.text[:200]}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.7: Admin Update Project", False, f"Exception: {str(e)}")
            return False

    def test_list_projects_with_filter(self) -> bool:
        """TC4.8: List projects with status filter"""
        try:
            response = requests.get(
                f"{self.base_url}/api/projects",
                params={"page": 1, "page_size": 10, "status": "active"},
                timeout=10
            )
            
            if response.status_code == 200:
                data = response.json()
                self.log_result(
                    "TC4.8: List Projects (Filter)",
                    True,
                    f"Status: 200, Active projects: {data.get('total', 0)}"
                )
                return True
            else:
                self.log_result(
                    "TC4.8: List Projects (Filter)",
                    False,
                    f"Status: {response.status_code}"
                )
                return False
        except Exception as e:
            self.log_result("TC4.8: List Projects (Filter)", False, f"Exception: {str(e)}")
            return False

    def run_all_tests(self) -> dict:
        """Run all project management tests"""
        print("=" * 60)
        print("Project Management API Test Suite")
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
        self.test_list_projects_public()
        self.test_get_project_detail_public()
        self.test_admin_create_project()
        self.test_apply_to_project()
        self.test_get_my_applications()
        self.test_admin_get_project_applications()
        self.test_admin_update_project()
        self.test_list_projects_with_filter()

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
            "module": "project_management",
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
        
        with open(os.path.join(results_dir, "project_test_results.json"), "w", encoding="utf-8") as f:
            json.dump(summary, f, indent=2, ensure_ascii=False)
        
        print(f"\nResults saved to: test_results/project_test_results.json")
        
        return summary


def main():
    """Main entry point"""
    tester = ProjectAPITester(BASE_URL)
    return tester.run_all_tests()


if __name__ == "__main__":
    main()

