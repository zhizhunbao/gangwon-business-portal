#!/usr/bin/env python3
"""
Support module tests.
"""
from test_base import BaseAPITester, Fore, Style


async def test_support_module(tester: BaseAPITester):
    """Test support module."""
    print(f"\n{Fore.CYAN}=== Testing Support Module ==={Style.RESET_ALL}")
    
    # Test public FAQ endpoint
    await tester.make_request("GET", "/api/faqs", expected_status=200, name="Get FAQs")
    
    # Test inquiries (requires auth)
    if tester.auth_token:
        await tester.make_request("GET", "/api/inquiries", expected_status=200, name="Get my inquiries")
        
        # Test create inquiry
        inquiry_data = {
            "subject": "Test Inquiry",
            "content": "This is a test inquiry"
        }
        result = await tester.make_request("POST", "/api/inquiries", data=inquiry_data,
                                       expected_status=201, name="Create inquiry")
        
        if result.status == "passed" and result.response_data:
            inquiry_id = result.response_data.get("id")
            if inquiry_id:
                await tester.make_request("GET", f"/api/inquiries/{inquiry_id}", 
                                      expected_status=200, name="Get inquiry detail")

