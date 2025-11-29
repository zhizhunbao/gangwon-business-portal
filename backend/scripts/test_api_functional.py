#!/usr/bin/env python3
"""
API Functional Integration Test Script

This script performs actual API calls to test the integration between
frontend and backend. It verifies:
1. API endpoints are accessible
2. Request/response data formats are correct
3. Error handling works properly
4. Authentication and authorization work

Usage:
    # Make sure backend server is running on http://localhost:8000
    python backend/scripts/test_api_functional.py
    
    # Test specific module
    python backend/scripts/test_api_functional.py --module auth
    
    # Test with verbose output
    python backend/scripts/test_api_functional.py --verbose
"""
import argparse
import asyncio
import sys
from typing import Optional
from datetime import datetime

from test_base import BaseAPITester, Fore, Style, BASE_URL

# Import module tests
from test_auth import test_auth_module
from test_content import test_content_module
from test_member import test_member_module
from test_support import test_support_module
from test_performance import test_performance_module
from test_project import test_project_module
from test_admin import test_admin_module
from test_remaining import test_remaining_endpoints


class APIFunctionalTester(BaseAPITester):
    """Main test coordinator."""
    
    async def run_all_tests(self, module: Optional[str] = None):
        """Run all tests or tests for a specific module."""
        print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}API Functional Integration Test{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        print(f"Base URL: {self.base_url}")
        print(f"Timestamp: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")
        
        # Check server health
        if not await self.check_server_health():
            print(f"\n{Fore.RED}Server is not available. Please start the backend server first.{Style.RESET_ALL}")
            return
        
        # Run tests
        if module is None or module == "auth":
            await test_auth_module(self)
        if module is None or module == "content":
            await test_content_module(self)
        if module is None or module == "member":
            await test_member_module(self)
        if module is None or module == "support":
            await test_support_module(self)
        if module is None or module == "performance":
            await test_performance_module(self)
        if module is None or module == "project":
            await test_project_module(self)
        if module is None or module == "admin":
            await test_admin_module(self)
        if module is None or module == "remaining":
            await test_remaining_endpoints(self)
        
        # Print summary
        self.print_summary()
    
    def print_summary(self):
        """Print test summary."""
        print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        print(f"{Fore.CYAN}Test Summary{Style.RESET_ALL}")
        print(f"{Fore.CYAN}{'='*80}{Style.RESET_ALL}")
        
        total = len(self.results)
        passed = sum(1 for r in self.results if r.status == "passed")
        failed = sum(1 for r in self.results if r.status == "failed")
        skipped = sum(1 for r in self.results if r.status == "skipped")
        
        print(f"Total tests: {total}")
        print(f"{Fore.GREEN}Passed: {passed}{Style.RESET_ALL}")
        print(f"{Fore.RED}Failed: {failed}{Style.RESET_ALL}")
        print(f"{Fore.YELLOW}Skipped: {skipped}{Style.RESET_ALL}")
        
        if failed > 0:
            print(f"\n{Fore.RED}Failed Tests:{Style.RESET_ALL}")
            for result in self.results:
                if result.status == "failed":
                    print(f"  ✗ {result.name}")
                    if result.error_message:
                        print(f"    {Fore.YELLOW}{result.error_message}{Style.RESET_ALL}")
        
        # Calculate average response time
        response_times = [r.response_time_ms for r in self.results if r.response_time_ms]
        if response_times:
            avg_time = sum(response_times) / len(response_times)
            print(f"\nAverage response time: {avg_time:.0f}ms")
        
        print(f"\n{Fore.CYAN}{'='*80}{Style.RESET_ALL}")


async def main():
    """Main function."""
    parser = argparse.ArgumentParser(description="API Functional Integration Test")
    parser.add_argument("--base-url", default=BASE_URL, help="Base URL of the API server")
    parser.add_argument("--module", choices=["auth", "content", "member", "support", "performance", "project", "admin", "remaining"],
                       help="Test specific module only")
    parser.add_argument("--verbose", "-v", action="store_true", help="Verbose output")
    
    args = parser.parse_args()
    
    tester = APIFunctionalTester(base_url=args.base_url, verbose=args.verbose)
    await tester.run_all_tests(module=args.module)
    
    # Return exit code based on results
    failed = sum(1 for r in tester.results if r.status == "failed")
    return 1 if failed > 0 else 0


if __name__ == "__main__":
    try:
        exit_code = asyncio.run(main())
        sys.exit(exit_code)
    except KeyboardInterrupt:
        print(f"\n{Fore.YELLOW}Test interrupted by user{Style.RESET_ALL}")
        sys.exit(130)
    except Exception as e:
        print(f"\n{Fore.RED}Unexpected error: {str(e)}{Style.RESET_ALL}")
        import traceback
        traceback.print_exc()
        sys.exit(1)
