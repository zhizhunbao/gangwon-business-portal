#!/usr/bin/env python3
"""
Performance module tests.
"""
from test_base import BaseAPITester, Fore, Style


async def test_performance_module(tester: BaseAPITester):
    """Test performance module."""
    print(f"\n{Fore.CYAN}=== Testing Performance Module ==={Style.RESET_ALL}")
    
    if tester.auth_token:
        await tester.make_request("GET", "/api/performance", expected_status=200, name="Get performance records")
        
        # Test create performance record (sales type)
        perf_data_sales = {
            "year": 2024,
            "quarter": 1,
            "type": "sales",
            "data_json": {
                "revenue": 1000000,
                "employees": 50,
                "new_contracts": 10
            }
        }
        result = await tester.make_request("POST", "/api/performance", data=perf_data_sales,
                                       expected_status=[201, 400], name="Create performance record (sales)")
        
        # Test create performance record (support type)
        if result.status == "passed":
            perf_data_support = {
                "year": 2024,
                "quarter": 2,
                "type": "support",
                "data_json": {
                    "support_amount": 500000,
                    "programs": 5,
                    "beneficiaries": 100
                }
            }
            await tester.make_request("POST", "/api/performance", data=perf_data_support,
                                   expected_status=[201, 400], name="Create performance record (support)")
        
        # Test create performance record (IP type)
        if result.status == "passed":
            perf_data_ip = {
                "year": 2024,
                "quarter": None,  # Annual record
                "type": "ip",
                "data_json": {
                    "patents": 5,
                    "trademarks": 3,
                    "copyrights": 2
                }
            }
            await tester.make_request("POST", "/api/performance", data=perf_data_ip,
                                   expected_status=[201, 400], name="Create performance record (IP)")

