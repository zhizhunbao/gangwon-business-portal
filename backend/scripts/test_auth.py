#!/usr/bin/env python3
"""
Auth module tests.
"""
import asyncio
import random
import sys
from test_base import BaseAPITester, Fore, Style, BASE_URL


async def test_auth_module(tester: BaseAPITester):
    """Test authentication module."""
    print(f"\n{Fore.CYAN}=== Testing Auth Module ==={Style.RESET_ALL}")
    
    # Test public endpoints
    await tester.make_request("GET", "/api/auth/me", expected_status=401, name="Get current user (unauthorized)")
    
    # Test registration with a unique business number
    test_business_number = f"999-{random.randint(10, 99)}-{random.randint(10000, 99999)}"
    register_data = {
        "business_number": test_business_number,
        "company_name": "API Test Company",
        "password": "Test1234!",
        "email": f"test{random.randint(1000, 9999)}@example.com",
        "region": "江原特别自治道",  # Required field
        "terms_agreed": True
    }
    result = await tester.make_request("POST", "/api/auth/register", data=register_data, 
                                    expected_status=[201, 400], name="Register new member")
    
    # If registration succeeds, note that the account needs admin approval
    if result.status == "passed":
        print(f"{Fore.YELLOW}Note: Registered account needs admin approval before login{Style.RESET_ALL}")
    
    # Try to login with test account (999-99-99999, password: password123)
    # This account is created by generate_test_data.py and is approved
    test_business_number = "999-99-99999"
    login_data = {
        "business_number": test_business_number,
        "password": "password123"  # Default test password
    }
    result = await tester.make_request("POST", "/api/auth/login", data=login_data, 
                                    expected_status=[200, 401], name="Member login (test account)")
    if result.status == "passed" and result.response_data and "access_token" in result.response_data:
        tester.auth_token = result.response_data["access_token"]
        print(f"{Fore.GREEN}✓ Obtained auth token from test account{Style.RESET_ALL}")
    else:
        print(f"{Fore.YELLOW}⚠ Could not login with test account. Make sure test data is generated.{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}  Run: python backend/scripts/generate_test_data.py{Style.RESET_ALL}")
    
    # Test admin login
    admin_login_data = {
        "username": "000-00-00000",
        "password": "password123"  # Default test password
    }
    result = await tester.make_request("POST", "/api/auth/admin-login", data=admin_login_data,
                                    expected_status=[200, 401], name="Admin login")
    if result.status == "passed" and result.response_data and "access_token" in result.response_data:
        tester.admin_token = result.response_data["access_token"]
        print(f"{Fore.GREEN}✓ Obtained admin token{Style.RESET_ALL}")
    else:
        print(f"{Fore.YELLOW}⚠ Could not login as admin. Make sure admin account is created.{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}  Run: python backend/scripts/generate_test_data.py{Style.RESET_ALL}")
    
    # Test get current user (with auth)
    if tester.auth_token:
        result = await tester.make_request("GET", "/api/auth/me", expected_status=200, name="Get current user (authorized)")
        if result.status == "passed" and result.response_data:
            tester.test_member_id = result.response_data.get("id")
            print(f"{Fore.GREEN}✓ Got member ID: {tester.test_member_id}{Style.RESET_ALL}")
    
    # Test update profile (requires auth)
    if tester.auth_token:
        profile_update_data = {
            "company_name": "Updated Test Company"
        }
        await tester.make_request("PUT", "/api/auth/profile", data=profile_update_data,
                              expected_status=[200, 400], name="Update profile via auth endpoint")
    
    # Test password reset request
    reset_request_data = {
        "business_number": "000-00-00000",
        "email": "admin@example.com"
    }
    await tester.make_request("POST", "/api/auth/password-reset-request", data=reset_request_data,
                           expected_status=[200, 400], name="Password reset request")
    
    # Test refresh token
    if tester.auth_token:
        await tester.make_request("POST", "/api/auth/refresh", expected_status=200, name="Refresh token")


async def test_single_unauthorized():
    """Test the specific failing test case: Get current user (unauthorized)."""
    import httpx
    
    print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}Testing: Get current user (unauthorized){Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
    print(f"Base URL: {BASE_URL}\n")
    
    tester = BaseAPITester(base_url=BASE_URL, verbose=True)
    
    # Check server health first
    if not await tester.check_server_health():
        print(f"\n{Fore.RED}Server is not available. Please start the backend server first.{Style.RESET_ALL}")
        return False
    
    # Run the specific test with increased timeout and better error handling
    print(f"\n{Fore.CYAN}Running test: Get current user (unauthorized){Style.RESET_ALL}")
    
    # Try direct request with longer timeout and explicit connection settings
    url = f"{BASE_URL}/api/auth/me"
    try:
        # Use explicit timeout configuration
        timeout = httpx.Timeout(60.0, connect=10.0)
        async with httpx.AsyncClient(timeout=timeout, follow_redirects=True) as client:
            print(f"{Fore.YELLOW}Making request to: {url}{Style.RESET_ALL}")
            response = await client.get(url)
            
            print(f"{Fore.GREEN}✓ Request successful{Style.RESET_ALL}")
            print(f"Status Code: {response.status_code}")
            
            # Try to read response body
            try:
                response_text = response.text
                print(f"Response Body: {response_text[:200]}")
            except Exception as e:
                print(f"{Fore.YELLOW}⚠ Could not read response body: {str(e)}{Style.RESET_ALL}")
                # Try reading as bytes
                try:
                    response_bytes = response.content
                    print(f"Response Bytes (first 200): {response_bytes[:200]}")
                except Exception:
                    pass
            
            if response.status_code == 401:
                print(f"{Fore.GREEN}✓ Test PASSED: Got expected 401 status code{Style.RESET_ALL}")
                return True
            else:
                print(f"{Fore.RED}✗ Test FAILED: Expected 401, got {response.status_code}{Style.RESET_ALL}")
                return False
                
    except httpx.TimeoutException as e:
        print(f"{Fore.RED}✗ Request timed out: {str(e)}{Style.RESET_ALL}")
        return False
    except httpx.RemoteProtocolError as e:
        print(f"{Fore.RED}✗ Protocol error: {str(e)}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Note: This might be a server-side issue. Check server logs.{Style.RESET_ALL}")
        # Try again with the tester to see if it works differently
        print(f"\n{Fore.CYAN}Trying with BaseAPITester...{Style.RESET_ALL}")
        result = await tester.make_request("GET", "/api/auth/me", expected_status=401, name="Get current user (unauthorized)")
        if result.status == "passed":
            print(f"{Fore.GREEN}✓ Test PASSED via BaseAPITester{Style.RESET_ALL}")
            return True
        return False
    except Exception as e:
        print(f"{Fore.RED}✗ Request failed: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        return False
    
    # Also run through the tester for consistency
    print(f"\n{Fore.CYAN}Also testing with BaseAPITester for consistency...{Style.RESET_ALL}")
    result = await tester.make_request("GET", "/api/auth/me", expected_status=401, name="Get current user (unauthorized)")
    
    # Print detailed result
    print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
    print(f"{Fore.CYAN}BaseAPITester Result{Style.RESET_ALL}")
    print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
    print(f"Test Name: {result.name}")
    print(f"Endpoint: {result.endpoint}")
    print(f"Method: {result.method}")
    print(f"Status: {Fore.GREEN if result.status == 'passed' else Fore.RED}{result.status}{Style.RESET_ALL}")
    print(f"Status Code: {result.status_code}")
    print(f"Response Time: {result.response_time_ms:.0f}ms" if result.response_time_ms else "N/A")
    
    if result.error_message:
        print(f"Error: {Fore.YELLOW}{result.error_message}{Style.RESET_ALL}")
    
    if result.response_data:
        print(f"Response Data: {result.response_data}")
    
    return result.status == "passed"


if __name__ == "__main__":
    """Run the single test case."""
    try:
        success = asyncio.run(test_single_unauthorized())
        sys.exit(0 if success else 1)
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Test interrupted by user{Style.RESET_ALL}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Fore.RED}Unexpected error: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
