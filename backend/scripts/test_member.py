#!/usr/bin/env python3
"""
Member module tests.
"""
from test_base import BaseAPITester, Fore, Style


async def test_member_module(tester: BaseAPITester):
    """Test member module."""
    print(f"\n{Fore.CYAN}=== Testing Member Module ==={Style.RESET_ALL}")
    
    # Test verify company (public)
    verify_data = {
        "business_number": "123-45-67890"
    }
    await tester.make_request("POST", "/api/members/verify-company", data=verify_data,
                           expected_status=[200, 503], name="Verify company")
    
    # Test member profile (requires auth)
    if tester.auth_token:
        await tester.make_request("GET", "/api/member/profile", expected_status=200, name="Get member profile")
        
        # Test update profile
        update_data = {
            "company_name": "Updated Company Name"
        }
        await tester.make_request("PUT", "/api/member/profile", data=update_data,
                              expected_status=[200, 400], name="Update member profile")
    
    # Test admin endpoints
    if tester.admin_token:
        old_auth = tester.auth_token
        tester.auth_token = tester.admin_token
        
        await tester.make_request("GET", "/api/admin/members", expected_status=200, name="Get members list (admin)")
        
        if tester.test_member_id:
            await tester.make_request("GET", f"/api/admin/members/{tester.test_member_id}", 
                                   expected_status=[200, 404], name="Get member detail (admin)")
        
        tester.auth_token = old_auth

