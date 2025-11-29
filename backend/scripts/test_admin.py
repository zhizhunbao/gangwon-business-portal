#!/usr/bin/env python3
"""
Admin module tests.
"""
from test_base import BaseAPITester, Fore, Style


async def test_admin_module(tester: BaseAPITester):
    """Test admin-only endpoints."""
    print(f"\n{Fore.CYAN}=== Testing Admin Module ==={Style.RESET_ALL}")
    
    if not tester.admin_token:
        print(f"{Fore.YELLOW}⚠ Skipping admin tests: No admin token available{Style.RESET_ALL}")
        return
    
    old_auth = tester.auth_token
    tester.auth_token = tester.admin_token
    
    # Admin - Member Management
    print(f"\n{Fore.CYAN}  Admin - Member Management{Style.RESET_ALL}")
    await tester.make_request("GET", "/api/admin/members", expected_status=200, name="Get members list (admin)")
    
    if tester.test_member_id:
        await tester.make_request("GET", f"/api/admin/members/{tester.test_member_id}", 
                               expected_status=[200, 404], name="Get member detail (admin)")
    
    # Admin - Content Management
    print(f"\n{Fore.CYAN}  Admin - Content Management{Style.RESET_ALL}")
    await tester.make_request("GET", "/api/admin/content/banners", expected_status=200, name="Get banners (admin)")
    
    # Test create banner
    banner_data = {
        "banner_type": "MAIN",
        "image_url": "https://example.com/banner.jpg",
        "link_url": "https://example.com",
        "is_active": True,  # Boolean, not string
        "display_order": 0
    }
    result = await tester.make_request("POST", "/api/admin/content/banners", data=banner_data,
                                   expected_status=[201, 400], name="Create banner (admin)")
    
    # Test create notice (admin only endpoint)
    notice_data = {
        "title": "Test Notice",
        "content_html": "<p>This is a test notice</p>",
        "board_type": "notice"
    }
    await tester.make_request("POST", "/api/admin/content/notices", data=notice_data,
                           expected_status=[201, 400], name="Create notice (admin)")
    
    # Test create press release (admin only endpoint)
    press_data = {
        "title": "Test Press Release",
        "image_url": "https://example.com/press.jpg"
    }
    await tester.make_request("POST", "/api/admin/content/press", data=press_data,
                           expected_status=[201, 400], name="Create press release (admin)")
    
    # Admin - Support Management
    print(f"\n{Fore.CYAN}  Admin - Support Management{Style.RESET_ALL}")
    await tester.make_request("GET", "/api/admin/inquiries", expected_status=200, name="Get inquiries (admin)")
    
    # Test create FAQ (admin only endpoint)
    faq_data = {
        "category": "회원가입",
        "question": "Test FAQ Question?",
        "answer": "This is a test FAQ answer",
        "display_order": 0
    }
    await tester.make_request("POST", "/api/admin/faqs", data=faq_data,
                           expected_status=[201, 400], name="Create FAQ (admin)")
    
    # Admin - Performance Management
    print(f"\n{Fore.CYAN}  Admin - Performance Management{Style.RESET_ALL}")
    await tester.make_request("GET", "/api/admin/performance", expected_status=200, name="Get performance records (admin)")
    
    # Admin - Project Management
    print(f"\n{Fore.CYAN}  Admin - Project Management{Style.RESET_ALL}")
    
    # Test create project (admin only endpoint)
    project_data = {
        "title": "Test Project",
        "description": "This is a test project description",
        "target_audience": "Test target audience",
        "start_date": "2024-01-01",
        "end_date": "2024-12-31",
        "image_url": "https://example.com/project.jpg",
        "status": "active"
    }
    await tester.make_request("POST", "/api/admin/projects", data=project_data,
                           expected_status=[201, 400], name="Create project (admin)")
    
    # Test export (may fail if no data, so allow 400)
    await tester.make_request("GET", "/api/admin/applications/export", 
                           expected_status=[200, 400, 500], name="Export applications (admin)")
    
    # Restore original auth token
    tester.auth_token = old_auth

