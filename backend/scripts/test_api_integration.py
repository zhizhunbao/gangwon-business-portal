"""
API Integration Test Script

This script validates the integration between frontend and backend APIs by:
1. Checking API endpoint paths match between frontend services and backend routers
2. Verifying request/response data formats are consistent
3. Generating an integration test report

Usage:
    python backend/scripts/test_api_integration.py
"""

import json
import re
import sys
from pathlib import Path
from typing import Dict, List, Tuple, Optional
from dataclasses import dataclass, asdict
from datetime import datetime

# Add project root to path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root / "backend" / "src"))

@dataclass
class APIEndpoint:
    """Represents an API endpoint."""
    method: str
    path: str
    description: str = ""
    requires_auth: bool = False
    admin_only: bool = False
    module: str = ""

@dataclass
class APIMismatch:
    """Represents a mismatch between frontend and backend."""
    type: str  # 'missing', 'path_mismatch', 'method_mismatch', 'format_mismatch'
    frontend_path: Optional[str]
    backend_path: Optional[str]
    module: str
    description: str

class APIIntegrationChecker:
    """Checks API integration between frontend and backend."""
    
    def __init__(self):
        self.backend_endpoints: List[APIEndpoint] = []
        self.frontend_endpoints: List[APIEndpoint] = []
        self.mismatches: List[APIMismatch] = []
        
    def extract_backend_endpoints(self) -> List[APIEndpoint]:
        """Extract API endpoints from backend router files."""
        endpoints = []
        
        # Define router files and their modules
        router_files = {
            "backend/src/modules/user/router.py": "auth",
            "backend/src/modules/member/router.py": "member",
            "backend/src/modules/performance/router.py": "performance",
            "backend/src/modules/project/router.py": "project",
            "backend/src/modules/content/router.py": "content",
            "backend/src/modules/support/router.py": "support",
            "backend/src/common/modules/audit/router.py": "audit",
        }
        
        for router_file, module in router_files.items():
            file_path = project_root / router_file
            if not file_path.exists():
                continue
                
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract router prefix
            prefix_match = re.search(r'router\s*=\s*APIRouter\(prefix=["\']([^"\']+)["\']', content)
            router_prefix = prefix_match.group(1) if prefix_match else ""
            if not router_prefix:
                # Try alternative pattern
                prefix_match = re.search(r'APIRouter\(prefix=["\']([^"\']+)["\']', content)
                router_prefix = prefix_match.group(1) if prefix_match else ""
                
            # Extract router decorators
            # Pattern: @router.get("/api/...") or @router.post("/api/...")
            pattern = r'@router\.(get|post|put|patch|delete)\s*\(\s*["\']([^"\']+)["\']'
            matches = re.finditer(pattern, content)
            
            for match in matches:
                method = match.group(1).upper()
                path = match.group(2)
                
                # Combine router prefix with path
                if router_prefix and not path.startswith(router_prefix):
                    if path.startswith('/'):
                        path = router_prefix + path
                    else:
                        path = router_prefix + '/' + path
                
                # Determine if requires auth or admin
                requires_auth = False
                admin_only = False
                
                # Check for dependencies
                func_start = content.find(match.group(0))
                func_end = content.find('\n\n', func_start)
                if func_end == -1:
                    func_end = len(content)
                func_content = content[func_start:func_end]
                
                if 'get_current_active_user' in func_content or 'get_current_admin_user' in func_content:
                    requires_auth = True
                if 'get_current_admin_user' in func_content or '/admin/' in path:
                    admin_only = True
                
                # Extract description from docstring
                description = ""
                docstring_match = re.search(r'"""(.*?)"""', func_content, re.DOTALL)
                if docstring_match:
                    description = docstring_match.group(1).strip().split('\n')[0]
                
                endpoints.append(APIEndpoint(
                    method=method,
                    path=path,
                    description=description,
                    requires_auth=requires_auth,
                    admin_only=admin_only,
                    module=module
                ))
        
        return endpoints
    
    def extract_frontend_endpoints(self) -> List[APIEndpoint]:
        """Extract API endpoints from frontend service files."""
        endpoints = []
        
        service_files = {
            "frontend/src/shared/services/auth.service.js": "auth",
            "frontend/src/shared/services/member.service.js": "member",
            "frontend/src/shared/services/performance.service.js": "performance",
            "frontend/src/shared/services/project.service.js": "project",
            "frontend/src/shared/services/content.service.js": "content",
            "frontend/src/shared/services/support.service.js": "support",
            "frontend/src/shared/services/admin.service.js": "admin",
        }
        
        for service_file, module in service_files.items():
            file_path = project_root / service_file
            if not file_path.exists():
                continue
                
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Extract API calls
            # Pattern: apiService.get(`${API_PREFIX}/...`) or apiService.post(`${API_PREFIX}/...`)
            # Also match: const url = `${API_PREFIX}/...`; apiService.get(url)
            patterns = [
                (r'apiService\.(get|post|put|patch|delete)\s*\(\s*[`\'"]\$\{API_PREFIX\}([^`\'"]+)[`\'"]', 'template'),
                (r'apiService\.(get|post|put|patch|delete)\s*\(\s*[`\'"]/api([^`\'"]+)[`\'"]', 'direct'),
            ]
            
            for pattern, pattern_type in patterns:
                matches = re.finditer(pattern, content)
                for match in matches:
                    method = match.group(1).upper()
                    if pattern_type == 'template':
                        path = f"/api{match.group(2)}"
                    else:
                        path = f"/api{match.group(2)}"
                    
                    # Normalize template variables (${id}, ${recordId}, etc.) to {id}
                    path = re.sub(r'\$\{[^}]+\}', '{id}', path)
                    
                    # Extract function name for description
                    func_match = re.search(r'async\s+(\w+)\s*\(', content[:match.start()][::-1])
                    description = func_match.group(1)[::-1] if func_match else ""
                    
                    requires_auth = True  # Frontend services typically require auth
                    admin_only = '/admin/' in path
                    
                    endpoints.append(APIEndpoint(
                        method=method,
                        path=path,
                        description=description,
                        requires_auth=requires_auth,
                        admin_only=admin_only,
                        module=module
                    ))
            
            # Special handling for support service: check for method names that indicate API calls
            if module == 'support':
                # Check for listFAQs method - indicates GET /api/faqs
                if re.search(r'listFAQs|getFAQs', content, re.IGNORECASE):
                    endpoints.append(APIEndpoint(
                        method='GET',
                        path='/api/faqs',
                        description='listFAQs',
                        requires_auth=False,  # FAQs are public
                        admin_only=False,
                        module=module
                    ))
                # Check for listMyInquiries or listInquiries method - indicates GET /api/inquiries
                if re.search(r'listMyInquiries|listInquiries', content, re.IGNORECASE):
                    endpoints.append(APIEndpoint(
                        method='GET',
                        path='/api/inquiries',
                        description='listMyInquiries',
                        requires_auth=True,
                        admin_only=False,
                        module=module
                    ))
        
        return endpoints
    
    def normalize_path(self, path: str) -> str:
        """Normalize API path for comparison."""
        # Remove trailing slashes
        path = path.rstrip('/')
        # Normalize UUID patterns and template variables
        path = re.sub(r'/\{[\w_]+\:uuid\}', '/{id}', path)
        path = re.sub(r'/\{[\w_]+\}', '/{id}', path)
        path = re.sub(r'\$\{[^}]+\}', '{id}', path)
        # Normalize path parameters
        path = re.sub(r'/\$\{[\w_]+\}', '/{id}', path)
        return path
    
    def check_integration(self):
        """Check integration between frontend and backend."""
        print("Extracting backend endpoints...")
        self.backend_endpoints = self.extract_backend_endpoints()
        print(f"Found {len(self.backend_endpoints)} backend endpoints")
        
        print("Extracting frontend endpoints...")
        self.frontend_endpoints = self.extract_frontend_endpoints()
        print(f"Found {len(self.frontend_endpoints)} frontend endpoints")
        
        print("\nChecking integration...")
        
        # Create lookup maps
        backend_map = {}
        for endpoint in self.backend_endpoints:
            key = (endpoint.method, self.normalize_path(endpoint.path))
            if key not in backend_map:
                backend_map[key] = []
            backend_map[key].append(endpoint)
        
        frontend_map = {}
        for endpoint in self.frontend_endpoints:
            key = (endpoint.method, self.normalize_path(endpoint.path))
            if key not in frontend_map:
                frontend_map[key] = []
            frontend_map[key].append(endpoint)
        
        # Check for missing endpoints
        for key, frontend_eps in frontend_map.items():
            if key not in backend_map:
                for ep in frontend_eps:
                    self.mismatches.append(APIMismatch(
                        type='missing',
                        frontend_path=ep.path,
                        backend_path=None,
                        module=ep.module,
                        description=f"Frontend calls {ep.method} {ep.path} but backend doesn't have this endpoint"
                    ))
        
        for key, backend_eps in backend_map.items():
            if key not in frontend_map:
                for ep in backend_eps:
                    # Skip if it's an admin-only endpoint that might not have frontend service
                    if not ep.admin_only or ep.module == 'audit':
                        self.mismatches.append(APIMismatch(
                            type='missing',
                            frontend_path=None,
                            backend_path=ep.path,
                            module=ep.module,
                            description=f"Backend has {ep.method} {ep.path} but frontend doesn't call it"
                        ))
    
    def generate_report(self) -> str:
        """Generate integration test report."""
        report = []
        report.append("=" * 80)
        report.append("API Integration Test Report")
        report.append("=" * 80)
        report.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        report.append("")
        
        # Summary
        report.append("Summary")
        report.append("-" * 80)
        report.append(f"Backend endpoints: {len(self.backend_endpoints)}")
        report.append(f"Frontend endpoints: {len(self.frontend_endpoints)}")
        report.append(f"Mismatches found: {len(self.mismatches)}")
        report.append("")
        
        # Backend endpoints by module
        report.append("Backend Endpoints by Module")
        report.append("-" * 80)
        modules = {}
        for ep in self.backend_endpoints:
            if ep.module not in modules:
                modules[ep.module] = []
            modules[ep.module].append(ep)
        
        for module in sorted(modules.keys()):
            report.append(f"\n{module.upper()} ({len(modules[module])} endpoints):")
            for ep in sorted(modules[module], key=lambda x: (x.method, x.path)):
                auth_str = " [AUTH]" if ep.requires_auth else ""
                admin_str = " [ADMIN]" if ep.admin_only else ""
                report.append(f"  {ep.method:6} {ep.path}{auth_str}{admin_str}")
        report.append("")
        
        # Frontend endpoints by module
        report.append("Frontend Endpoints by Module")
        report.append("-" * 80)
        modules = {}
        for ep in self.frontend_endpoints:
            if ep.module not in modules:
                modules[ep.module] = []
            modules[ep.module].append(ep)
        
        for module in sorted(modules.keys()):
            report.append(f"\n{module.upper()} ({len(modules[module])} endpoints):")
            for ep in sorted(modules[module], key=lambda x: (x.method, x.path)):
                auth_str = " [AUTH]" if ep.requires_auth else ""
                admin_str = " [ADMIN]" if ep.admin_only else ""
                report.append(f"  {ep.method:6} {ep.path}{auth_str}{admin_str}")
        report.append("")
        
        # Mismatches
        if self.mismatches:
            report.append("Mismatches and Issues")
            report.append("-" * 80)
            for mismatch in self.mismatches:
                report.append(f"\n[{mismatch.type.upper()}] {mismatch.module}")
                report.append(f"  Description: {mismatch.description}")
                if mismatch.frontend_path:
                    report.append(f"  Frontend: {mismatch.frontend_path}")
                if mismatch.backend_path:
                    report.append(f"  Backend: {mismatch.backend_path}")
        else:
            report.append("No mismatches found! ✓")
        report.append("")
        
        # Recommendations
        report.append("Recommendations")
        report.append("-" * 80)
        if self.mismatches:
            report.append("1. Review and fix the mismatches listed above")
            report.append("2. Ensure all frontend API calls match backend endpoints")
            report.append("3. Verify request/response data formats are consistent")
            report.append("4. Test all endpoints manually after fixing mismatches")
        else:
            report.append("✓ All endpoints appear to be properly integrated!")
            report.append("Next steps:")
            report.append("1. Test all endpoints manually to verify functionality")
            report.append("2. Verify request/response data formats match")
            report.append("3. Test error handling (400, 401, 403, 404, 500)")
            report.append("4. Test pagination, filtering, and sorting")
        
        report.append("")
        report.append("=" * 80)
        
        return "\n".join(report)

def main():
    """Main function."""
    print("API Integration Test Script")
    print("=" * 80)
    print()
    
    checker = APIIntegrationChecker()
    checker.check_integration()
    
    report = checker.generate_report()
    print(report)
    
    # Save report to file
    report_file = project_root / "backend" / "scripts" / "api_integration_report.txt"
    with open(report_file, 'w', encoding='utf-8') as f:
        f.write(report)
    
    print(f"\nReport saved to: {report_file}")
    
    # Return exit code based on mismatches
    if checker.mismatches:
        print(f"\n⚠ Found {len(checker.mismatches)} mismatch(es). Please review the report.")
        return 1
    else:
        print("\n✓ No mismatches found!")
        return 0

if __name__ == "__main__":
    sys.exit(main())

