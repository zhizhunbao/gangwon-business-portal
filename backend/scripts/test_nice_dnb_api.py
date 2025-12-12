"""
Test script to verify Nice D&B API configuration and connectivity.

This script tests:
1. Configuration loading
2. OAuth token acquisition
3. API endpoint connectivity
"""
import asyncio
import sys
import os
import json
from pathlib import Path

# Add parent directory to path to import modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Change to backend directory to ensure .env.local is found
os.chdir(backend_dir)

from src.common.modules.config.settings import settings
from src.common.modules.integrations.nice_dnb import nice_dnb_client
import httpx

# Test business numbers
TEST_BUSINESS_NUMBERS = [
    "1108801231",
    "7788602046",
]


async def test_configuration():
    """Test if API configuration is loaded correctly."""
    print("=" * 60)
    print("1. Testing Configuration")
    print("=" * 60)
    
    print(f"API Key: {settings.NICE_DNB_API_KEY[:10]}..." if settings.NICE_DNB_API_KEY else "API Key: Not set")
    print(f"API Secret Key: {'*' * 20} (hidden)" if settings.NICE_DNB_API_SECRET_KEY else "API Secret Key: Not set")
    print(f"API URL: {settings.NICE_DNB_API_URL}")
    print(f"OAuth Token Endpoint: {settings.NICE_DNB_OAUTH_TOKEN_ENDPOINT}")
    print(f"Company Info Endpoint: {settings.NICE_DNB_COMPANY_INFO_ENDPOINT}")
    
    is_configured = nice_dnb_client._is_configured()
    print(f"Configuration Status: {'✅ Configured' if is_configured else '❌ Not Configured'}")
    
    if not is_configured:
        print("\n⚠️  API is not configured. Please check your .env.local file.")
        return False
    
    return True


async def test_oauth_token():
    """Test OAuth token acquisition."""
    print("\n" + "=" * 60)
    print("2. Testing OAuth Token Acquisition")
    print("=" * 60)
    
    # Get OAuth token endpoint from settings
    token_url = settings.NICE_DNB_OAUTH_TOKEN_ENDPOINT
    if not token_url:
        print("  ❌ NICE_DNB_OAUTH_TOKEN_ENDPOINT is not configured in .env.local")
        return False, None, None
    
    print("Testing token endpoint")
    print(f"Token URL: {token_url}")
    
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            response = await client.post(
                token_url,
                json={
                    "appKey": settings.NICE_DNB_API_KEY,
                    "appSecret": settings.NICE_DNB_API_SECRET_KEY,
                    "grantType": "client_credentials",
                    "scope": "oob",
                },
                headers={
                    "Content-Type": "application/json; charset=UTF-8",
                    "Accept": "application/json",
                },
            )
            
            print(f"  Status Code: {response.status_code}")
            
            if response.status_code == 200:
                token_data = response.json()
                # Nice D&B uses camelCase: accessToken, not access_token
                access_token = token_data.get("accessToken")
                expires_in = token_data.get("expiresIn", "N/A")
                print(f"  ✅ Success! Token obtained (expires in {expires_in}s)")
                print(f"  Token preview: {access_token[:20]}..." if access_token else "  No token in response")
                return True, token_url, access_token
            else:
                print(f"  ❌ Failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"  Error: {error_data}")
                except Exception:
                    print(f"  Error: {response.text[:200]}")
                return False, None, None
    except httpx.RequestError as e:
        print(f"  ❌ Request Error: {str(e)}")
        return False, None, None
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False, None, None


async def test_api_endpoint(access_token: str, token_url: str, business_number: str):
    """Test actual API endpoint with a specific business number."""
    # Get company info endpoint from settings
    api_url = settings.NICE_DNB_COMPANY_INFO_ENDPOINT
    if not api_url:
        print(f"  ❌ NICE_DNB_COMPANY_INFO_ENDPOINT is not configured in .env.local")
        return False, None
    
    # Try both GET and POST methods
    # Based on endpoint name "certification", it likely requires POST with JSON body
    request_body = {
        "bizNo": business_number,
    }
    
    print(f"\n  Testing business number: {business_number}")
    print(f"  API URL: {api_url}")
    print(f"  Request body: {request_body}")
    
    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json; charset=UTF-8",
        "Accept": "application/json",
    }
    
    # Try POST method first (most likely for certification endpoint)
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            print(f"  Trying POST method...")
            response = await client.post(api_url, headers=headers, json=request_body)
            
            print(f"  Status Code: {response.status_code}")
            
            if response.status_code == 200:
                data = response.json()
                print("  ✅ Success! API endpoint is working (POST method)")
                print(f"  Response structure: {list(data.keys())}")
                # Try to print company information if available
                if isinstance(data, dict):
                    # Check dataBody structure
                    data_body = data.get("dataBody", {})
                    if data_body:
                        # Print all keys in dataBody
                        print(f"  DataBody keys: {list(data_body.keys())}")
                        # Print full dataBody content (formatted)
                        print(f"\n  Full DataBody content:")
                        print(f"  {json.dumps(data_body, ensure_ascii=False, indent=2)}")
                        
                        # Try to extract company information
                        company_name = (
                            data_body.get("cmpNm")  # Korean company name
                            or data_body.get("cmpEnm")  # English company name
                            or data_body.get("corpNm") 
                            or data_body.get("companyName") 
                            or data_body.get("name")
                            or data_body.get("corpName")
                            or data_body.get("bzmnNm")
                        )
                        if company_name:
                            print(f"\n  Company Name: {company_name}")
                        # Print more company info if available
                        address = data_body.get("addr") or data_body.get("address")
                        if address:
                            print(f"  Address: {address}")
                        ceo = data_body.get("ceoNm") or data_body.get("ceo") or data_body.get("representative")
                        if ceo:
                            print(f"  CEO: {ceo}")
                        biz_no = data_body.get("bizNo") or data_body.get("business_number")
                        if biz_no:
                            print(f"  Business Number: {biz_no}")
                    else:
                        print(f"  Note: dataBody is empty or not found")
                        # Print full response if dataBody is empty
                        print(f"  Full response: {json.dumps(data, ensure_ascii=False, indent=2)}")
                return True, api_url
            elif response.status_code == 405:
                # Method not allowed, try GET method
                print(f"  POST method returned 405, trying GET method...")
                try:
                    response = await client.get(api_url, headers=headers, params={"bizNo": business_number})
                    print(f"  Status Code (GET): {response.status_code}")
                    if response.status_code == 200:
                        data = response.json()
                        print("  ✅ Success! API endpoint is working (GET method)")
                        print(f"  Response structure: {list(data.keys())}")
                        if isinstance(data, dict):
                            data_body = data.get("dataBody", data)
                            if data_body:
                                print(f"  DataBody keys: {list(data_body.keys())[:10]}...")
                                company_name = (
                                    data_body.get("corpNm") 
                                    or data_body.get("companyName") 
                                    or data_body.get("name")
                                    or data_body.get("corpName")
                                    or data_body.get("bzmnNm")
                                )
                                if company_name:
                                    print(f"  Company Name: {company_name}")
                        return True, api_url
                    else:
                        print(f"  ❌ GET method also failed: {response.status_code}")
                        try:
                            error_data = response.json()
                            print(f"  Error: {error_data}")
                        except Exception:
                            print(f"  Error: {response.text[:200]}")
                        return False, None
                except Exception as e:
                    print(f"  ❌ GET method error: {str(e)}")
                    return False, None
            else:
                print(f"  ❌ Failed: {response.status_code}")
                try:
                    error_data = response.json()
                    print(f"  Error: {error_data}")
                except Exception:
                    print(f"  Error: {response.text[:200]}")
                return False, None
    except httpx.RequestError as e:
        print(f"  ❌ Request Error: {str(e)}")
        return False, None
    except Exception as e:
        print(f"  ❌ Error: {str(e)}")
        return False, None


async def test_all_api_endpoints(access_token: str, token_url: str):
    """Test API endpoints with all test business numbers."""
    print("\n" + "=" * 60)
    print("3. Testing API Endpoints")
    print("=" * 60)
    print(f"Using token from: {token_url}")
    print(f"Testing {len(TEST_BUSINESS_NUMBERS)} business number(s)")
    
    results = []
    api_url = None
    
    for business_number in TEST_BUSINESS_NUMBERS:
        success, url = await test_api_endpoint(access_token, token_url, business_number)
        results.append((business_number, success))
        if url:
            api_url = url
    
    all_success = all(success for _, success in results)
    return all_success, api_url


async def test_service_method(business_number: str):
    """Test the service method directly with a specific business number."""
    print(f"\n  Testing business number: {business_number}")
    
    response = await nice_dnb_client.search_company(business_number)
    
    if response:
        print("  ✅ Service method returned data")
        print(f"  Company Name: {response.data.company_name}")
        print(f"  Business Number: {response.data.business_number}")
        return True
    else:
        print("  ❌ Service method returned None")
        print("  This could mean:")
        print("    - OAuth token acquisition failed")
        print("    - API endpoint is incorrect")
        print("    - API request failed")
        return False


async def test_all_service_methods():
    """Test service methods with all test business numbers."""
    print("\n" + "=" * 60)
    print("4. Testing Service Methods")
    print("=" * 60)
    print(f"Testing {len(TEST_BUSINESS_NUMBERS)} business number(s)")
    
    results = []
    
    for business_number in TEST_BUSINESS_NUMBERS:
        success = await test_service_method(business_number)
        results.append((business_number, success))
    
    all_success = all(success for _, success in results)
    return all_success


async def main():
    """Run all tests."""
    print("\n" + "=" * 60)
    print("Nice D&B API Configuration Test")
    print("=" * 60)
    
    # Test 1: Configuration
    if not await test_configuration():
        print("\n❌ Configuration test failed. Exiting.")
        return
    
    # Test 2: OAuth Token
    token_success, token_url, access_token = await test_oauth_token()
    if not token_success:
        print("\n❌ OAuth token test failed. Cannot proceed with API tests.")
        return
    
    # Test 3: API Endpoints
    api_success, api_url = await test_all_api_endpoints(access_token, token_url)
    
    # Test 4: Service Methods
    service_success = await test_all_service_methods()
    
    # Summary
    print("\n" + "=" * 60)
    print("Test Summary")
    print("=" * 60)
    print(f"Configuration: {'✅' if True else '❌'}")
    print(f"OAuth Token: {'✅' if token_success else '❌'}")
    print(f"API Endpoint: {'✅' if api_success else '❌'}")
    print(f"Service Method: {'✅' if service_success else '❌'}")
    
    if token_success and api_success and service_success:
        print("\n🎉 All tests passed! Your API configuration is working correctly.")
        if token_url:
            print(f"\nWorking token endpoint: {token_url}")
        if api_url:
            print(f"Working API endpoint: {api_url}")
    else:
        print("\n⚠️  Some tests failed. Please check the errors above and:")
        print("   1. Verify your API credentials")
        print("   2. Check the API documentation for correct endpoints")
        print("   3. Ensure network connectivity")


if __name__ == "__main__":
    asyncio.run(main())

