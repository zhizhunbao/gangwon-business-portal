#!/usr/bin/env python3
"""
Project module tests.
"""
from test_base import BaseAPITester, Fore, Style


async def test_project_module(tester: BaseAPITester):
    """Test project module."""
    print(f"\n{Fore.CYAN}=== Testing Project Module ==={Style.RESET_ALL}")
    
    # Test public endpoints
    await tester.make_request("GET", "/api/projects", expected_status=200, name="Get projects")
    
    if tester.auth_token:
        await tester.make_request("GET", "/api/my-applications", expected_status=200, name="Get my applications")

