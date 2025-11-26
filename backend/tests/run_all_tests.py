"""
Integration Test Runner

Runs all integration tests and generates a summary report.
"""

import os
import sys
import json
from datetime import datetime
import importlib.util

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

# Test modules
TEST_MODULES = [
    ("authentication", "integration.test_auth_api"),
    ("member_management", "integration.test_member_api"),
    ("performance_management", "integration.test_performance_api"),
    ("project_management", "integration.test_project_api"),
    ("content_management", "integration.test_content_api"),
    ("support", "integration.test_support_api"),
]


def load_and_run_test(module_name: str, module_path: str) -> dict:
    """Load and run a test module"""
    print(f"\n{'='*60}")
    print(f"Running: {module_name}")
    print(f"{'='*60}\n")
    
    try:
        # Import the module
        spec = importlib.util.spec_from_file_location(
            module_path,
            os.path.join(os.path.dirname(__file__), module_path.replace(".", "/") + ".py")
        )
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        
        # Run main function
        if hasattr(module, "main"):
            result = module.main()
            return result
        else:
            return {"error": "No main function found", "module": module_name}
    except Exception as e:
        print(f"❌ Failed to run {module_name}: {str(e)}")
        return {
            "module": module_name,
            "error": str(e),
            "total_tests": 0,
            "passed": 0,
            "failed": 0,
            "success_rate": 0
        }


def generate_summary_report(results: list) -> dict:
    """Generate a summary report from all test results"""
    total_tests = 0
    total_passed = 0
    total_failed = 0
    module_summaries = []
    
    for result in results:
        if "error" not in result or result.get("total_tests", 0) > 0:
            total_tests += result.get("total_tests", 0)
            total_passed += result.get("passed", 0)
            total_failed += result.get("failed", 0)
        
        module_summaries.append({
            "module": result.get("module", "unknown"),
            "total_tests": result.get("total_tests", 0),
            "passed": result.get("passed", 0),
            "failed": result.get("failed", 0),
            "success_rate": result.get("success_rate", 0),
            "error": result.get("error")
        })
    
    overall_success_rate = (total_passed / total_tests * 100) if total_tests > 0 else 0
    
    summary = {
        "title": "Gangwon Business Portal - Integration Test Summary",
        "timestamp": datetime.now().isoformat(),
        "overall": {
            "total_tests": total_tests,
            "passed": total_passed,
            "failed": total_failed,
            "success_rate": overall_success_rate
        },
        "modules": module_summaries
    }
    
    return summary


def print_final_report(summary: dict):
    """Print the final test report"""
    print("\n" + "=" * 70)
    print("INTEGRATION TEST SUMMARY REPORT")
    print("=" * 70)
    print(f"Timestamp: {summary['timestamp']}")
    print("-" * 70)
    
    # Overall results
    overall = summary["overall"]
    print(f"\n📊 OVERALL RESULTS:")
    print(f"   Total Tests: {overall['total_tests']}")
    print(f"   Passed: {overall['passed']} ✅")
    print(f"   Failed: {overall['failed']} ❌")
    print(f"   Success Rate: {overall['success_rate']:.1f}%")
    
    # Module breakdown
    print(f"\n📋 MODULE BREAKDOWN:")
    print("-" * 70)
    print(f"{'Module':<25} {'Tests':>8} {'Passed':>8} {'Failed':>8} {'Rate':>10}")
    print("-" * 70)
    
    for module in summary["modules"]:
        name = module["module"]
        tests = module["total_tests"]
        passed = module["passed"]
        failed = module["failed"]
        rate = module["success_rate"]
        error = module.get("error")
        
        if error and tests == 0:
            status = "❌ ERROR"
        elif failed == 0:
            status = f"{rate:.1f}% ✅"
        else:
            status = f"{rate:.1f}%"
        
        print(f"{name:<25} {tests:>8} {passed:>8} {failed:>8} {status:>10}")
    
    print("-" * 70)
    
    # Final status
    if overall["failed"] == 0 and overall["total_tests"] > 0:
        print("\n✅ ALL TESTS PASSED!")
    elif overall["total_tests"] == 0:
        print("\n⚠️ NO TESTS WERE RUN - Check server connection")
    else:
        print(f"\n⚠️ {overall['failed']} TEST(S) FAILED - Review failed tests above")
    
    print("=" * 70)


def main():
    """Main entry point"""
    print("=" * 70)
    print("Gangwon Business Portal - Integration Test Suite")
    print("=" * 70)
    print(f"Start Time: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    print(f"Base URL: {os.environ.get('TEST_BASE_URL', 'http://127.0.0.1:8000')}")
    print("=" * 70)
    
    # Check if server is running
    import requests
    base_url = os.environ.get("TEST_BASE_URL", "http://127.0.0.1:8000")
    try:
        response = requests.get(f"{base_url}/healthz", timeout=5)
        if response.status_code != 200:
            print(f"\n❌ Server health check failed: {response.status_code}")
            print("Please ensure the backend server is running.")
            sys.exit(1)
        print(f"\n✓ Server health check passed")
    except requests.exceptions.ConnectionError:
        print(f"\n❌ Cannot connect to server at {base_url}")
        print("Please start the backend server:")
        print("  cd backend")
        print("  python -m uvicorn src.main:app --reload")
        sys.exit(1)
    except Exception as e:
        print(f"\n⚠️ Server check warning: {e}")
    
    # Run all tests
    results = []
    for module_name, module_path in TEST_MODULES:
        result = load_and_run_test(module_name, module_path)
        results.append(result)
    
    # Generate and save summary
    summary = generate_summary_report(results)
    
    # Save summary to file
    results_dir = os.path.join(os.path.dirname(__file__), "test_results")
    os.makedirs(results_dir, exist_ok=True)
    
    summary_file = os.path.join(results_dir, "integration_test_summary.json")
    with open(summary_file, "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)
    
    # Print final report
    print_final_report(summary)
    
    print(f"\n📁 Detailed results saved to: {results_dir}/")
    print(f"   - integration_test_summary.json")
    for module_name, _ in TEST_MODULES:
        print(f"   - {module_name.replace('_management', '')}_test_results.json")
    
    # Return exit code
    if summary["overall"]["failed"] > 0:
        sys.exit(1)
    elif summary["overall"]["total_tests"] == 0:
        sys.exit(2)
    else:
        sys.exit(0)


if __name__ == "__main__":
    main()

