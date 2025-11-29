#!/usr/bin/env python3
"""
Content module tests.
"""
from test_base import BaseAPITester, Fore, Style


async def test_content_module(tester: BaseAPITester):
    """Test content module."""
    print(f"\n{Fore.CYAN}=== Testing Content Module ==={Style.RESET_ALL}")
    
    # Test public endpoints
    await tester.make_request("GET", "/api/banners", expected_status=200, name="Get banners")
    await tester.make_request("GET", "/api/notices", expected_status=200, name="Get notices")
    await tester.make_request("GET", "/api/notices/latest5", expected_status=200, name="Get latest notices")
    await tester.make_request("GET", "/api/press", expected_status=200, name="Get press releases")
    await tester.make_request("GET", "/api/press/latest1", expected_status=200, name="Get latest press")
    await tester.make_request("GET", "/api/system-info", expected_status=200, name="Get system info")
    
    # Test admin endpoints (if we have admin token)
    if tester.admin_token:
        old_auth = tester.auth_token
        tester.auth_token = tester.admin_token
        
        await tester.make_request("GET", "/api/admin/content/banners", expected_status=200, name="Get banners (admin)")
        
        tester.auth_token = old_auth

