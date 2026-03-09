#!/usr/bin/env python3
"""
Backend API Testing for DeliviO-S Rider Mobile App
Tests external API connectivity at sales-dashboard-320.preview.emergentagent.com
"""

import requests
import json
import sys
from typing import Dict, Any, Optional

# API Configuration
API_BASE_URL = "https://sales-dashboard-320.preview.emergentagent.com/api"
RIDER_CREDENTIALS = {
    "email": "rider@delivio.fi",
    "password": "password"
}

class DeliviOAPITester:
    def __init__(self):
        self.base_url = API_BASE_URL
        self.token = None
        self.session = requests.Session()
        self.session.headers.update({
            'Content-Type': 'application/json',
            'User-Agent': 'DeliviO-Rider-Mobile-App/1.0'
        })
    
    def print_test_result(self, test_name: str, success: bool, details: str = "", response_data: Any = None):
        """Print formatted test results"""
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"\n{status} {test_name}")
        if details:
            print(f"   Details: {details}")
        if response_data and isinstance(response_data, dict):
            print(f"   Response: {json.dumps(response_data, indent=2)}")
        elif response_data:
            print(f"   Response: {response_data}")
    
    def test_authentication(self) -> bool:
        """Test POST /api/auth/login with rider credentials"""
        print("\n" + "="*50)
        print("TESTING AUTHENTICATION")
        print("="*50)
        
        try:
            response = self.session.post(
                f"{self.base_url}/auth/login",
                json=RIDER_CREDENTIALS,
                timeout=30
            )
            
            if response.status_code == 200:
                data = response.json()
                
                # Check expected fields
                required_fields = ['token', 'user_type', 'user_id', 'email', 'name']
                missing_fields = [field for field in required_fields if field not in data]
                
                if missing_fields:
                    self.print_test_result(
                        "Authentication", 
                        False, 
                        f"Missing required fields: {missing_fields}",
                        data
                    )
                    return False
                
                if data.get('user_type') != 'rider':
                    self.print_test_result(
                        "Authentication", 
                        False, 
                        f"Expected user_type='rider', got '{data.get('user_type')}'",
                        data
                    )
                    return False
                
                # Store token for authenticated requests
                self.token = data['token']
                self.session.headers.update({'Authorization': f'Bearer {self.token}'})
                
                self.print_test_result(
                    "Authentication", 
                    True, 
                    f"Successfully authenticated as rider: {data.get('name')} ({data.get('email')})",
                    {k: v for k, v in data.items() if k != 'token'}  # Hide token in output
                )
                return True
            else:
                self.print_test_result(
                    "Authentication", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                return False
                
        except Exception as e:
            self.print_test_result("Authentication", False, f"Exception: {str(e)}")
            return False
    
    def test_work_status(self) -> bool:
        """Test work status endpoints"""
        print("\n" + "="*50)
        print("TESTING WORK STATUS")
        print("="*50)
        
        if not self.token:
            self.print_test_result("Work Status", False, "No authentication token available")
            return False
        
        success = True
        
        # Test GET work-status
        try:
            response = self.session.get(f"{self.base_url}/rider/work-status", timeout=30)
            if response.status_code == 200:
                self.print_test_result(
                    "GET /rider/work-status", 
                    True, 
                    "Work status retrieved successfully",
                    response.json()
                )
            else:
                self.print_test_result(
                    "GET /rider/work-status", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                success = False
        except Exception as e:
            self.print_test_result("GET /rider/work-status", False, f"Exception: {str(e)}")
            success = False
        
        # Test POST go-online
        try:
            response = self.session.post(f"{self.base_url}/rider/go-online", timeout=30)
            if response.status_code == 200:
                self.print_test_result(
                    "POST /rider/go-online", 
                    True, 
                    "Successfully went online",
                    response.json()
                )
            else:
                self.print_test_result(
                    "POST /rider/go-online", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                success = False
        except Exception as e:
            self.print_test_result("POST /rider/go-online", False, f"Exception: {str(e)}")
            success = False
        
        # Test POST go-offline
        try:
            response = self.session.post(f"{self.base_url}/rider/go-offline", timeout=30)
            if response.status_code == 200:
                self.print_test_result(
                    "POST /rider/go-offline", 
                    True, 
                    "Successfully went offline",
                    response.json()
                )
            else:
                self.print_test_result(
                    "POST /rider/go-offline", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                success = False
        except Exception as e:
            self.print_test_result("POST /rider/go-offline", False, f"Exception: {str(e)}")
            success = False
        
        return success
    
    def test_tasks_orders(self) -> bool:
        """Test tasks and orders endpoints"""
        print("\n" + "="*50)
        print("TESTING TASKS & ORDERS")
        print("="*50)
        
        if not self.token:
            self.print_test_result("Tasks & Orders", False, "No authentication token available")
            return False
        
        success = True
        
        # Test GET tasks
        try:
            response = self.session.get(f"{self.base_url}/rider/tasks", timeout=30)
            if response.status_code == 200:
                data = response.json()
                self.print_test_result(
                    "GET /rider/tasks", 
                    True, 
                    f"Retrieved {len(data) if isinstance(data, list) else 'N/A'} tasks",
                    data
                )
            else:
                self.print_test_result(
                    "GET /rider/tasks", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                success = False
        except Exception as e:
            self.print_test_result("GET /rider/tasks", False, f"Exception: {str(e)}")
            success = False
        
        # Test GET pending-orders
        try:
            response = self.session.get(f"{self.base_url}/rider/pending-orders", timeout=30)
            if response.status_code == 200:
                data = response.json()
                self.print_test_result(
                    "GET /rider/pending-orders", 
                    True, 
                    f"Retrieved pending orders data",
                    data
                )
            else:
                self.print_test_result(
                    "GET /rider/pending-orders", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                success = False
        except Exception as e:
            self.print_test_result("GET /rider/pending-orders", False, f"Exception: {str(e)}")
            success = False
        
        return success
    
    def test_profile_endpoints(self) -> bool:
        """Test profile and earnings endpoints"""
        print("\n" + "="*50)
        print("TESTING PROFILE & EARNINGS")
        print("="*50)
        
        if not self.token:
            self.print_test_result("Profile & Earnings", False, "No authentication token available")
            return False
        
        success = True
        
        # Test GET profile
        try:
            response = self.session.get(f"{self.base_url}/rider/profile", timeout=30)
            if response.status_code == 200:
                self.print_test_result(
                    "GET /rider/profile", 
                    True, 
                    "Profile data retrieved successfully",
                    response.json()
                )
            else:
                self.print_test_result(
                    "GET /rider/profile", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                success = False
        except Exception as e:
            self.print_test_result("GET /rider/profile", False, f"Exception: {str(e)}")
            success = False
        
        # Test GET earnings
        try:
            response = self.session.get(f"{self.base_url}/rider/earnings", timeout=30)
            if response.status_code == 200:
                self.print_test_result(
                    "GET /rider/earnings", 
                    True, 
                    "Earnings data retrieved successfully",
                    response.json()
                )
            else:
                self.print_test_result(
                    "GET /rider/earnings", 
                    False, 
                    f"HTTP {response.status_code}: {response.text}"
                )
                success = False
        except Exception as e:
            self.print_test_result("GET /rider/earnings", False, f"Exception: {str(e)}")
            success = False
        
        return success
    
    def run_all_tests(self) -> Dict[str, bool]:
        """Run all API tests and return results"""
        print("🚀 Starting DeliviO-S Rider API Testing")
        print(f"🎯 Target API: {self.base_url}")
        print(f"👤 Test Rider: {RIDER_CREDENTIALS['email']}")
        
        results = {}
        
        # Test authentication first (required for other tests)
        results['authentication'] = self.test_authentication()
        
        # Only proceed with other tests if authentication succeeded
        if results['authentication']:
            results['work_status'] = self.test_work_status()
            results['tasks_orders'] = self.test_tasks_orders() 
            results['profile_earnings'] = self.test_profile_endpoints()
        else:
            print("\n⚠️  Skipping authenticated endpoint tests due to authentication failure")
            results['work_status'] = False
            results['tasks_orders'] = False
            results['profile_earnings'] = False
        
        return results


def main():
    """Main test execution"""
    tester = DeliviOAPITester()
    results = tester.run_all_tests()
    
    # Print summary
    print("\n" + "="*60)
    print("TEST SUMMARY")
    print("="*60)
    
    passed = sum(1 for success in results.values() if success)
    total = len(results)
    
    for test_name, success in results.items():
        status = "✅ PASS" if success else "❌ FAIL"
        print(f"{status} {test_name.replace('_', ' ').title()}")
    
    print(f"\n📊 Overall: {passed}/{total} tests passed")
    
    if passed == total:
        print("🎉 All API tests successful! DeliviO-S API is fully accessible.")
        return 0
    else:
        print("⚠️  Some API tests failed. Check the details above.")
        return 1


if __name__ == "__main__":
    sys.exit(main())