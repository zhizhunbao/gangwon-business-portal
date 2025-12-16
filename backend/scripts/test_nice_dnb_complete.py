"""
Complete Nice D&B API Test Script
Combines OAuth token retrieval, endpoint testing, and key verification functionality
"""
import asyncio
import sys
import os
import httpx

# Add parent directory to path
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.common.modules.integrations.nice_dnb.service import nice_dnb_client
from src.common.modules.config.settings import settings


def print_section(title, char="=", width=80):
    """Print a formatted section header"""
    print(f"\n{char * width}")
    print(f"{title:^{width}}")
    print(f"{char * width}\n")


def print_step(step_num, title, details=None):
    """Print a step in the process"""
    print(f"\n{'─' * 80}")
    print(f"📍 Step {step_num}: {title}")
    print(f"{'─' * 80}")
    if details:
        for key, value in details.items():
            print(f"   {key}: {value}")


async def get_oauth_token():
    """Step 1: Get OAuth access token"""
    print_step(1, "OAuth Token Retrieval", {
        "Endpoint": settings.NICE_DNB_OAUTH_TOKEN_ENDPOINT,
        "App Key": settings.NICE_DNB_API_KEY,
        "Secret Key": f"{settings.NICE_DNB_API_SECRET_KEY[:20]}...",
        "Method": "POST",
        "Grant Type": "client_credentials"
    })
    
    try:
        access_token = await nice_dnb_client._get_access_token()
        if access_token:
            print(f"   ✅ Token retrieved successfully")
            print(f"   🔑 Access Token: {access_token[:50]}...")
            
            # Get token details if available
            if nice_dnb_client._token_expires_at:
                expires_at = nice_dnb_client._token_expires_at.strftime("%Y-%m-%d %H:%M:%S")
                print(f"   ⏰ Token expires at: {expires_at}")
            
            return access_token
        else:
            print(f"   ❌ Token retrieval failed")
            return None
    except Exception as e:
        print(f"   ❌ Token retrieval error: {str(e)}")
        return None


async def test_endpoint(api_url, business_number, access_token, endpoint_name, method="POST"):
    """Test a single endpoint"""
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            headers = nice_dnb_client._get_headers(access_token)
            
            if method == "POST":
                response = await client.post(
                    api_url,
                    headers=headers,
                    json={"bizNo": business_number},
                )
            else:
                response = await client.get(
                    api_url,
                    headers=headers,
                    params={"bizNo": business_number},
                )
            
            response.raise_for_status()
            data = response.json()
            
            return {
                "success": True,
                "status_code": response.status_code,
                "data": data,
                "method": method
            }
    except httpx.HTTPStatusError as e:
        error_data = {}
        if e.response.text:
            try:
                error_data = e.response.json()
            except Exception:
                pass
        
        return {
            "success": False,
            "status_code": e.response.status_code,
            "error": str(e),
            "error_data": error_data,
            "response_text": e.response.text[:500] if e.response.text else None,
            "method": method
        }
    except Exception as e:
        return {
            "success": False,
            "error": str(e),
            "method": method
        }


async def test_all_endpoints():
    """Complete test flow"""
    print_section("Nice D&B API Complete Test Flow", "=")
    
    # Configuration info
    print("📋 Configuration:")
    print(f"   API Base URL: {settings.NICE_DNB_API_URL}")
    print(f"   OAuth Token Endpoint: {settings.NICE_DNB_OAUTH_TOKEN_ENDPOINT}")
    print(f"   Company Info Endpoint: {settings.NICE_DNB_COMPANY_INFO_ENDPOINT}")
    print(f"   Criteria Search Endpoint: {settings.NICE_DNB_CRITERIA_SEARCH_ENDPOINT}")
    print(f"   Financial Statement Endpoint: {settings.NICE_DNB_FINANCIAL_STATEMENT_ENDPOINT}")
    print(f"   Global Rate Endpoint: {settings.NICE_DNB_GLOBAL_RATE_ENDPOINT}")
    
    # Step 1: Get OAuth token
    access_token = await get_oauth_token()
    if not access_token:
        print("\n❌ Failed to retrieve Access Token, test terminated")
        return
    
    # Step 2: Test endpoints
    print_step(2, "Endpoint Testing", {
        "Test Numbers": "1108801231, 7788602046",
        "Test Method": "POST (fallback to GET if failed)"
    })
    
    test_numbers = ["1108801231", "7788602046"]
    
    # List all endpoints to test
    endpoints = [
        ("CRITERIA_SEARCH", "Criteria Search Endpoint", settings.NICE_DNB_CRITERIA_SEARCH_ENDPOINT),
        ("COMPANY_INFO", "Company Info Endpoint (certification)", settings.NICE_DNB_COMPANY_INFO_ENDPOINT),
        ("FINANCIAL_STATEMENT", "Financial Statement Endpoint", settings.NICE_DNB_FINANCIAL_STATEMENT_ENDPOINT),
        ("GLOBAL_RATE", "Global Rate Endpoint", settings.NICE_DNB_GLOBAL_RATE_ENDPOINT),
    ]
    
    results_summary = []
    
    for business_number in test_numbers:
        print(f"\n{'═' * 80}")
        print(f"📊 Testing Business Number: {business_number}")
        print(f"{'═' * 80}")
        
        for endpoint_code, endpoint_name, api_url in endpoints:
            if not api_url:
                print(f"\n⏭️  {endpoint_name} ({endpoint_code}): Not configured")
                continue
            
            print(f"\n🔍 {endpoint_name} ({endpoint_code})")
            print(f"   URL: {api_url}")
            
            # Try POST first
            result = await test_endpoint(api_url, business_number, access_token, endpoint_name, "POST")
            
            if result["success"]:
                print(f"   ✅ POST Success (Status: {result['status_code']})")
                data_body = result["data"].get("dataBody", result["data"])
                
                # Extract key information
                biz_no = data_body.get("bizNo") if isinstance(data_body, dict) else None
                cmp_nm = data_body.get("cmpNm") if isinstance(data_body, dict) else None
                corp_no = data_body.get("corpNo") if isinstance(data_body, dict) else None
                
                print(f"   📋 Response Data:")
                if biz_no:
                    print(f"      - bizNo: {biz_no}")
                    if biz_no == business_number:
                        print(f"      ✅ bizNo matches query number!")
                    else:
                        print(f"      ⚠️  bizNo does NOT match (returns fixed test data)")
                if cmp_nm:
                    print(f"      - cmpNm: {cmp_nm}")
                if corp_no:
                    print(f"      - corpNo: {corp_no}")
                
                # Check response header
                res_cd = result["data"].get("dataHeader", {}).get("resCd")
                if res_cd:
                    print(f"      - Response Code: {res_cd}")
                
                results_summary.append({
                    "endpoint": endpoint_name,
                    "business_number": business_number,
                    "status": "success",
                    "biz_no_match": biz_no == business_number if biz_no else False
                })
                
            else:
                status_code = result.get("status_code")
                print(f"   ❌ POST Failed (Status: {status_code})")
                
                if status_code == 403:
                    error_data = result.get("error_data", {})
                    error_msg = error_data.get("dataBody", {}).get("errorMsg", "Unknown")
                    error_code = error_data.get("dataBody", {}).get("errorCode", "Unknown")
                    print(f"   📋 Error Information:")
                    print(f"      - Error Code: {error_code}")
                    print(f"      - Error Message: {error_msg}")
                    
                    results_summary.append({
                        "endpoint": endpoint_name,
                        "business_number": business_number,
                        "status": "403_forbidden",
                        "error": error_msg
                    })
                    
                elif status_code == 405:
                    # Try GET if POST returns 405
                    print(f"   🔄 Trying GET method...")
                    get_result = await test_endpoint(api_url, business_number, access_token, endpoint_name, "GET")
                    if get_result["success"]:
                        print(f"   ✅ GET Success (Status: {get_result['status_code']})")
                        data_body = get_result["data"].get("dataBody", get_result["data"])
                        biz_no = data_body.get("bizNo") if isinstance(data_body, dict) else None
                        if biz_no:
                            print(f"      - bizNo: {biz_no}")
                            if biz_no == business_number:
                                print(f"      ✅ bizNo matches query number!")
                    else:
                        print(f"   ❌ GET also failed: {get_result.get('error', 'Unknown error')}")
                        results_summary.append({
                            "endpoint": endpoint_name,
                            "business_number": business_number,
                            "status": "failed",
                            "error": get_result.get("error", "Unknown")
                        })
                else:
                    error_msg = result.get("error", "Unknown error")
                    print(f"   📋 Error: {error_msg}")
                    if result.get("response_text"):
                        print(f"   📄 Response: {result['response_text'][:200]}")
                    results_summary.append({
                        "endpoint": endpoint_name,
                        "business_number": business_number,
                        "status": "failed",
                        "error": error_msg
                    })
    
    # Step 3: Summary
    print_step(3, "Test Results Summary")
    
    print("\n📊 Endpoint Availability Summary:")
    endpoint_status = {}
    for result in results_summary:
        endpoint = result["endpoint"]
        if endpoint not in endpoint_status:
            endpoint_status[endpoint] = {
                "success": 0,
                "forbidden": 0,
                "failed": 0,
                "biz_no_match": 0
            }
        
        if result["status"] == "success":
            endpoint_status[endpoint]["success"] += 1
            if result.get("biz_no_match"):
                endpoint_status[endpoint]["biz_no_match"] += 1
        elif result["status"] == "403_forbidden":
            endpoint_status[endpoint]["forbidden"] += 1
        else:
            endpoint_status[endpoint]["failed"] += 1
    
    for endpoint, status in endpoint_status.items():
        total = status["success"] + status["forbidden"] + status["failed"]
        print(f"\n   {endpoint}:")
        print(f"      - Success: {status['success']}/{total}")
        if status["success"] > 0:
            print(f"      - bizNo Match: {status['biz_no_match']}/{status['success']}")
        print(f"      - 403 Forbidden: {status['forbidden']}/{total}")
        print(f"      - Other Failures: {status['failed']}/{total}")
    
    # Final conclusion
    print_section("Test Conclusion", "=")
    
    print("✅ OAuth Token Retrieval: Normal")
    print("✅ Token Usage: Normal")
    
    # Check if any endpoint returns real data
    has_real_data = any(
        r.get("biz_no_match", False) 
        for r in results_summary 
        if r["status"] == "success"
    )
    
    if has_real_data:
        print("✅ Found endpoint that returns real data")
    else:
        print("⚠️  All available endpoints return fixed test data")
        print("   Recommendations:")
        print("   1. Contact Nice D&B support to confirm the correct query endpoint")
        print("   2. Check API Key permission level, may need to upgrade plan")
        print("   3. Verify if there are other query endpoints available")
    
    print(f"\n{'=' * 80}")


if __name__ == "__main__":
    asyncio.run(test_all_endpoints())

