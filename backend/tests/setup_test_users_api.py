"""
Setup test users via API endpoints.

This script creates test users by calling the registration API endpoints.
"""

import requests
import json

BASE_URL = "http://127.0.0.1:8000"

def create_test_member():
    """Create test member user via registration API"""
    print("Creating test member user...")
    
    data = {
        "business_number": "123-45-67890",
        "company_name": "Test Company Co., Ltd.",
        "password": "password123",
        "email": "test@example.com",
        "region": "Seoul",
        "company_type": "Corporation",
        "corporate_number": "110111-1234567",
        "address": "123 Test Street, Seoul, Korea",
        "contact_person": "Test Manager",
        "industry": "Technology",
        "revenue": 1000000000,
        "employee_count": 50,
        "founding_date": "2020-01-01",
        "website": "https://test-company.com",
        "main_business": "Software Development",
        "logo_file_id": None,
        "certificate_file_id": None,
        "terms_agreed": True
    }
    
    try:
        response = requests.post(f"{BASE_URL}/api/auth/register", json=data)
        if response.status_code == 201:
            print("✅ Test member created successfully")
            print(f"   Business Number: {data['business_number']}")
            print(f"   Password: {data['password']}")
            return True
        elif response.status_code == 400 and "already" in response.text.lower():
            print("ℹ️  Test member already exists")
            print(f"   Business Number: {data['business_number']}")
            print(f"   Password: {data['password']}")
            return True
        else:
            print(f"❌ Failed to create: {response.status_code}")
            print(f"   Error: {response.text}")
            return False
    except Exception as e:
        print(f"❌ Exception: {str(e)}")
        return False

def approve_test_member():
    """Approve the test member (requires admin login or direct DB update)"""
    print("\n⚠️  Note: Test member needs to be approved manually:")
    print("   Option 1: Use admin panel to approve business number: 123-45-67890")
    print("   Option 2: Run SQL: UPDATE members SET approval_status='approved', status='active' WHERE business_number='123-45-67890'")

def create_admin_user_note():
    """Note about creating admin user"""
    print("\n⚠️  Admin user must be created directly in database:")
    print("   Run this SQL:")
    print("""
   INSERT INTO members (id, business_number, company_name, email, password_hash, status, approval_status, created_at, updated_at)
   VALUES (
       gen_random_uuid(),
       '000-00-00000',
       'System Administrator',
       'admin@gangwon.go.kr',
       '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5QkKu9A7d9S8u',  -- password: admin123
       'active',
       'approved',
       NOW(),
       NOW()
   );
   
   INSERT INTO member_profiles (id, member_id, industry, region, created_at, updated_at)
   SELECT gen_random_uuid(), m.id, 'Government', 'Gangwon-do', NOW(), NOW()
   FROM members m WHERE m.business_number = '000-00-00000';
   """)

def main():
    print("=" * 60)
    print("Test Users Setup (via API)")
    print("=" * 60)
    
    # Try to create member via API
    member_created = create_test_member()
    
    if member_created:
        approve_test_member()
    
    create_admin_user_note()
    
    print("\n" + "=" * 60)
    print("Setup Instructions Complete")
    print("=" * 60)
    print("\nTest Credentials:")
    print("  Member - Business Number: 123-45-67890, Password: password123")
    print("  Admin  - Business Number: 000-00-00000, Password: admin123")
    print("=" * 60)

if __name__ == "__main__":
    main()
