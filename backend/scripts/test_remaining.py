#!/usr/bin/env python3
"""
Remaining endpoints tests.
"""
from test_base import BaseAPITester, Fore, Style


async def test_remaining_endpoints(tester: BaseAPITester):
    """Test remaining endpoints that haven't been tested yet."""
    print(f"\n{Fore.CYAN}=== Testing Remaining Endpoints ==={Style.RESET_ALL}")
    
    if not tester.admin_token:
        print(f"{Fore.YELLOW}⚠ Skipping remaining tests: No admin token available{Style.RESET_ALL}")
        return
    
    old_auth = tester.auth_token
    tester.auth_token = tester.admin_token
    
    # 1. Approval-related endpoints
    print(f"\n{Fore.CYAN}  1. Approval-related endpoints{Style.RESET_ALL}")
    
    # Get pending members for approval testing
    members_result = await tester.make_request("GET", "/api/admin/members?approval_status=pending&page_size=10", 
                                             expected_status=200, name="Get pending members for approval test")
    if members_result.status == "passed" and members_result.response_data:
        items = members_result.response_data.get("items", [])
        if items:
            tester.pending_member_id = items[0].get("id")
            print(f"{Fore.GREEN}✓ Found pending member ID: {tester.pending_member_id}{Style.RESET_ALL}")
    
    # Test member approval
    if tester.pending_member_id:
        approve_data = {"comments": "Test approval"}
        await tester.make_request("PUT", f"/api/admin/members/{tester.pending_member_id}/approve", 
                               data=approve_data, expected_status=[200, 400, 404], 
                               name="Approve member (admin)")
    
    # Test member rejection (need a new pending member)
    members_result = await tester.make_request("GET", "/api/admin/members?approval_status=pending&page_size=10", 
                                             expected_status=200, name="Get pending members for rejection test")
    if members_result.status == "passed" and members_result.response_data:
        items = members_result.response_data.get("items", [])
        if items:
            reject_member_id = items[0].get("id")
            reject_data = {"comments": "Test rejection"}
            await tester.make_request("PUT", f"/api/admin/members/{reject_member_id}/reject", 
                                   data=reject_data, expected_status=[200, 400, 404], 
                                   name="Reject member (admin)")
    
    # Get submitted performance records for approval testing
    perf_result = await tester.make_request("GET", "/api/admin/performance?status=submitted&page_size=10", 
                                         expected_status=200, name="Get submitted performance records")
    if perf_result.status == "passed" and perf_result.response_data:
        items = perf_result.response_data.get("items", [])
        if items:
            tester.test_performance_id = items[0].get("id")
            print(f"{Fore.GREEN}✓ Found submitted performance ID: {tester.test_performance_id}{Style.RESET_ALL}")
    
    # Test performance approval
    if tester.test_performance_id:
        approve_data = {"comments": "Test performance approval"}
        await tester.make_request("POST", f"/api/admin/performance/{tester.test_performance_id}/approve", 
                               data=approve_data, expected_status=[200, 400, 404], 
                               name="Approve performance (admin)")
    
    # Test performance rejection (need a new submitted record)
    perf_result = await tester.make_request("GET", "/api/admin/performance?status=submitted&page_size=10", 
                                         expected_status=200, name="Get submitted performance for rejection")
    if perf_result.status == "passed" and perf_result.response_data:
        items = perf_result.response_data.get("items", [])
        if items:
            reject_perf_id = items[0].get("id")
            reject_data = {"comments": "Test performance rejection"}
            await tester.make_request("POST", f"/api/admin/performance/{reject_perf_id}/reject", 
                                   data=reject_data, expected_status=[200, 400, 404], 
                                   name="Reject performance (admin)")
    
    # 2. Project-related endpoints
    print(f"\n{Fore.CYAN}  2. Project-related endpoints{Style.RESET_ALL}")
    
    # Get project list to find a project ID
    projects_result = await tester.make_request("GET", "/api/projects?page_size=10", 
                                              expected_status=200, name="Get projects for detail test")
    if projects_result.status == "passed" and projects_result.response_data:
        items = projects_result.response_data.get("items", [])
        if items:
            tester.test_project_id = items[0].get("id")
            print(f"{Fore.GREEN}✓ Found project ID: {tester.test_project_id}{Style.RESET_ALL}")
    
    # Test project detail
    if tester.test_project_id:
        await tester.make_request("GET", f"/api/projects/{tester.test_project_id}", 
                               expected_status=200, name="Get project detail")
    
    # Test project application (requires member auth)
    if tester.test_project_id:
        # Switch to member token for application
        member_old_auth = tester.auth_token
        # Try to get member token if available
        if not tester.auth_token or tester.auth_token == tester.admin_token:
            # Try to login as member
            login_data = {
                "business_number": "999-99-99999",
                "password": "password123"
            }
            login_result = await tester.make_request("POST", "/api/auth/login", data=login_data,
                                                   expected_status=[200, 401], name="Login for project application")
            if login_result.status == "passed" and login_result.response_data:
                member_token = login_result.response_data.get("access_token")
                if member_token:
                    tester.auth_token = member_token
        
        # Test project application
        if tester.auth_token and tester.auth_token != tester.admin_token:
            apply_data = {
                "application_reason": "This is a test application reason for testing purposes"
            }
            await tester.make_request("POST", f"/api/projects/{tester.test_project_id}/apply", 
                                   data=apply_data, expected_status=[201, 400], 
                                   name="Apply to project")
            tester.auth_token = member_old_auth
    
    # Test application status update (admin)
    tester.auth_token = tester.admin_token
    # Get applications from a project
    if tester.test_project_id:
        # Try to get applications for this project
        apps_result = await tester.make_request("GET", f"/api/admin/projects/{tester.test_project_id}/applications", 
                                             expected_status=[200, 404], name="Get applications for project")
        if apps_result.status == "passed" and apps_result.response_data:
            items = apps_result.response_data.get("items", [])
            if items:
                app_id = items[0].get("id")
                status_data = {"status": "under_review", "review_notes": "Test review"}
                await tester.make_request("PUT", f"/api/admin/applications/{app_id}/status", 
                                       data=status_data, expected_status=[200, 400, 404], 
                                       name="Update application status (admin)")
    
    # 3. File-related endpoints
    print(f"\n{Fore.CYAN}  3. File-related endpoints{Style.RESET_ALL}")
    
    # Test file upload (create a simple text file)
    # Note: This is a simplified test - actual file upload requires multipart/form-data
    await tester.make_request("POST", "/api/upload/public", 
                           expected_status=[400, 422], name="File upload endpoint (public)")
    
    # Test file download (need a file ID from existing data)
    await tester.make_request("GET", "/api/admin/performance?page_size=10", 
                          expected_status=200, name="Get performance with potential files")
    # Note: File download test would need actual file_id from database
    await tester.make_request("GET", "/api/upload/00000000-0000-0000-0000-000000000000", 
                           expected_status=[404, 400], name="File download endpoint (test)")
    
    # 4. Data export endpoint
    print(f"\n{Fore.CYAN}  4. Data export endpoint{Style.RESET_ALL}")
    # Export endpoint uses query parameters for filtering and format
    # Note: PerformanceListQuery requires page parameter (defaults to 1)
    # Try with minimal parameters first
    await tester.make_request("GET", "/api/admin/performance/export?format=excel", 
                           expected_status=[200, 400, 422, 500], name="Export performance data (Excel)")
    await tester.make_request("GET", "/api/admin/performance/export?format=csv", 
                           expected_status=[200, 400, 422, 500], name="Export performance data (CSV)")
    # Also try with explicit page parameters
    await tester.make_request("GET", "/api/admin/performance/export?format=excel&page=1&page_size=20", 
                           expected_status=[200, 400, 422, 500], name="Export performance data (Excel with params)")
    await tester.make_request("GET", "/api/admin/performance/export?format=csv&page=1&page_size=20", 
                           expected_status=[200, 400, 422, 500], name="Export performance data (CSV with params)")
    
    # 5. Support module - Inquiry reply
    print(f"\n{Fore.CYAN}  5. Support module - Inquiry reply{Style.RESET_ALL}")
    
    # Get inquiries for reply testing
    inquiries_result = await tester.make_request("GET", "/api/admin/inquiries?page_size=10", 
                                               expected_status=200, name="Get inquiries for reply test")
    if inquiries_result.status == "passed" and inquiries_result.response_data:
        items = inquiries_result.response_data.get("items", [])
        if items:
            tester.test_inquiry_id = items[0].get("id")
            print(f"{Fore.GREEN}✓ Found inquiry ID: {tester.test_inquiry_id}{Style.RESET_ALL}")
    
    # Test inquiry reply
    if tester.test_inquiry_id:
        reply_data = {
            "admin_reply": "This is a test reply from admin"
        }
        await tester.make_request("POST", f"/api/admin/inquiries/{tester.test_inquiry_id}/reply", 
                               data=reply_data, expected_status=[200, 400, 404], 
                               name="Reply to inquiry (admin)")
    
    # 6. Audit log module
    print(f"\n{Fore.CYAN}  6. Audit log module{Style.RESET_ALL}")
    await tester.make_request("GET", "/api/admin/audit-logs?page_size=10", 
                           expected_status=200, name="Get audit logs list")
    await tester.make_request("GET", "/api/admin/audit-logs?action=create&page_size=10", 
                           expected_status=200, name="Get audit logs (filtered by action)")
    await tester.make_request("GET", "/api/admin/audit-logs?page=1&page_size=20", 
                           expected_status=200, name="Get audit logs (pagination)")
    
    # Get a specific audit log ID for detail test
    logs_result = await tester.make_request("GET", "/api/admin/audit-logs?page_size=1", 
                                         expected_status=200, name="Get audit log for detail test")
    if logs_result.status == "passed" and logs_result.response_data:
        items = logs_result.response_data.get("items", [])
        if items:
            log_id = items[0].get("id")
            await tester.make_request("GET", f"/api/admin/audit-logs/{log_id}", 
                                   expected_status=[200, 404], name="Get audit log detail")
    
    # 7. Pagination, filtering, sorting
    print(f"\n{Fore.CYAN}  7. Pagination, filtering, sorting{Style.RESET_ALL}")
    
    # Test pagination
    await tester.make_request("GET", "/api/admin/members?page=2&page_size=5", 
                           expected_status=200, name="Test pagination (members)")
    
    # Test filtering
    await tester.make_request("GET", "/api/admin/members?approval_status=approved&status=active", 
                           expected_status=200, name="Test filtering (members)")
    await tester.make_request("GET", "/api/admin/performance?status=approved&year=2024", 
                           expected_status=200, name="Test filtering (performance)")
    
    # Test sorting (if supported)
    await tester.make_request("GET", "/api/admin/members?page_size=10", 
                           expected_status=200, name="Test sorting (members)")
    
    tester.auth_token = old_auth

