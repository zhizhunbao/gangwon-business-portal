#!/usr/bin/env python3
"""
Base test utilities and classes.

Shared functionality for all API functional tests.
"""
import json
import time
from dataclasses import dataclass
from typing import List, Optional
import httpx

# Try to import colorama for colored output
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLORAMA = True
except ImportError:
    # Fallback to simple ANSI codes or no color
    class Fore:
        GREEN = '\033[92m'
        RED = '\033[91m'
        YELLOW = '\033[93m'
        CYAN = '\033[96m'
    class Style:
        RESET_ALL = '\033[0m'
    HAS_COLORAMA = False

BASE_URL = "http://localhost:8000"
TIMEOUT = 30.0


@dataclass
class TestResult:
    """Represents a test result."""
    name: str
    endpoint: str
    method: str
    status: str  # 'passed', 'failed', 'skipped'
    status_code: Optional[int] = None
    error_message: Optional[str] = None
    response_time_ms: Optional[float] = None
    response_data: Optional[dict] = None


class BaseAPITester:
    """Base class for API functional tests."""
    
    def __init__(self, base_url: str = BASE_URL, verbose: bool = False):
        self.base_url = base_url
        self.verbose = verbose
        self.results: List[TestResult] = []
        self.auth_token: Optional[str] = None
        self.admin_token: Optional[str] = None
        self.test_member_id: Optional[str] = None
        self.pending_member_id: Optional[str] = None
        self.test_performance_id: Optional[str] = None
        self.test_project_id: Optional[str] = None
        self.test_inquiry_id: Optional[str] = None
        
    async def check_server_health(self) -> bool:
        """Check if the server is running and healthy."""
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                response = await client.get(f"{self.base_url}/healthz")
                if response.status_code == 200:
                    print(f"{Fore.GREEN}✓ Server is healthy{Style.RESET_ALL}")
                    return True
                else:
                    print(f"{Fore.RED}✗ Server health check failed: {response.status_code}{Style.RESET_ALL}")
                    return False
        except Exception as e:
            print(f"{Fore.RED}✗ Cannot connect to server: {str(e)}{Style.RESET_ALL}")
            print(f"{Fore.YELLOW}Make sure the backend server is running on {self.base_url}{Style.RESET_ALL}")
            return False
    
    async def make_request(
        self,
        method: str,
        endpoint: str,
        data: Optional[dict] = None,
        headers: Optional[dict] = None,
        expected_status: int = 200,
        name: str = ""
    ) -> TestResult:
        """Make an HTTP request and return test result."""
        url = f"{self.base_url}{endpoint}"
        if headers is None:
            headers = {}
        if self.auth_token and "Authorization" not in headers:
            headers["Authorization"] = f"Bearer {self.auth_token}"
        
        start_time = time.time()
        try:
            async with httpx.AsyncClient(timeout=TIMEOUT) as client:
                if method.upper() == "GET":
                    response = await client.get(url, headers=headers)
                elif method.upper() == "POST":
                    response = await client.post(url, json=data, headers=headers)
                elif method.upper() == "PUT":
                    response = await client.put(url, json=data, headers=headers)
                elif method.upper() == "PATCH":
                    response = await client.patch(url, json=data, headers=headers)
                elif method.upper() == "DELETE":
                    response = await client.delete(url, headers=headers)
                else:
                    raise ValueError(f"Unsupported method: {method}")
                
                response_time_ms = (time.time() - start_time) * 1000
                
                try:
                    response_data = response.json() if response.content else None
                except:
                    response_data = {"raw": response.text[:200]}
                
                # Handle expected_status as int or list
                if isinstance(expected_status, list):
                    status = "passed" if response.status_code in expected_status else "failed"
                else:
                    status = "passed" if response.status_code == expected_status else "failed"
                
                error_message = None
                
                if status == "failed":
                    error_message = f"Expected {expected_status}, got {response.status_code}"
                    if response_data:
                        error_message += f": {json.dumps(response_data, ensure_ascii=False)[:200]}"
                
                result = TestResult(
                    name=name or f"{method} {endpoint}",
                    endpoint=endpoint,
                    method=method,
                    status=status,
                    status_code=response.status_code,
                    error_message=error_message,
                    response_time_ms=response_time_ms,
                    response_data=response_data
                )
                
                # Store result
                self.results.append(result)
                
                if self.verbose or status == "failed":
                    status_color = Fore.GREEN if status == "passed" else Fore.RED
                    print(f"{status_color}{'✓' if status == 'passed' else '✗'} {result.name} "
                          f"({response.status_code}) - {response_time_ms:.0f}ms{Style.RESET_ALL}")
                    if status == "failed" and error_message:
                        print(f"  {Fore.YELLOW}{error_message}{Style.RESET_ALL}")
                
                return result
                
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            result = TestResult(
                name=name or f"{method} {endpoint}",
                endpoint=endpoint,
                method=method,
                status="failed",
                error_message=str(e),
                response_time_ms=response_time_ms
            )
            # Store result
            self.results.append(result)
            if self.verbose:
                print(f"{Fore.RED}✗ {result.name} - Error: {str(e)}{Style.RESET_ALL}")
            return result

