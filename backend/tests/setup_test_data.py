"""
Database test data setup script.

This script checks if test users exist in the database and creates them if needed.

This script creates minimal test users for integration tests and development.

Test credentials (must match test_auth_api.py):
- Member: 123-45-67890 / Member123!
- Admin: 000-00-00000 / Admin123!
"""

import asyncio
import sys
from pathlib import Path

# Add src to path
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from sqlalchemy import select
from passlib.context import CryptContext

from common.modules.db.session import AsyncSessionLocal
from common.modules.db.models import Member, MemberProfile

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def check_and_create_test_users():
    """Check if test users exist and create them if not."""
    
    print("=" * 60)
    print("Checking Test Users in Database")
    print("=" * 60)
    
    async with AsyncSessionLocal() as db:
        # Check for member test user
        print("\n1. Checking member test user (123-45-67890)...")
        result = await db.execute(
            select(Member).where(Member.business_number == "123-45-67890")
        )
        member_user = result.scalar_one_or_none()
        
        if member_user:
            print(f"   ✅ Found: {member_user.company_name} (Status: {member_user.approval_status})")
        else:
            print("   ❌ Not found. Creating test member user...")
            
            # Create member user
            # NOTE: Password must match test_auth_api.py: "Member123!"
            member_user = Member(
                business_number="123-45-67890",
                company_name="Test Company Co., Ltd.",
                email="test@example.com",
                password_hash=pwd_context.hash("Member123!"),
                status="active",
                approval_status="approved"
            )
            db.add(member_user)
            await db.flush()
            
            # Create member profile
            profile = MemberProfile(
                member_id=member_user.id,
                industry="Technology",
                revenue=1000000000,
                employee_count=50,
                region="Seoul",
                address="123 Test Street, Seoul, Korea"
            )
            db.add(profile)
            await db.commit()
            
            print(f"   ✅ Created: {member_user.company_name}")
        
        # Check for admin user
        print("\n2. Checking admin user (000-00-00000)...")
        result = await db.execute(
            select(Member).where(Member.business_number == "000-00-00000")
        )
        admin_user = result.scalar_one_or_none()
        
        if admin_user:
            print(f"   ✅ Found: {admin_user.company_name} (Status: {admin_user.approval_status})")
        else:
            print("   ❌ Not found. Creating admin user...")
            
            # Create admin user
            # NOTE: Password must match test_auth_api.py: "Admin123!"
            admin_user = Member(
                business_number="000-00-00000",
                company_name="System Administrator",
                email="admin@gangwon.go.kr",
                password_hash=pwd_context.hash("Admin123!"),
                status="active",
                approval_status="approved"
            )
            db.add(admin_user)
            await db.flush()
            
            # Create admin profile
            profile = MemberProfile(
                member_id=admin_user.id,
                industry="Government",
                region="Gangwon-do"
            )
            db.add(profile)
            await db.commit()
            
            print(f"   ✅ Created: {admin_user.company_name}")
        
        print("\n" + "=" * 60)
        print("Test Users Check Complete")
        print("=" * 60)
        
        # Summary
        print("\nTest Credentials:")
        print("-" * 60)
        print("Member Account:")
        print("  Business Number: 123-45-67890")
        print("  Password: Member123!")
        print(f"  Status: {member_user.approval_status}")
        print()
        print("Admin Account:")
        print("  Business Number: 000-00-00000")
        print("  Password: Admin123!")
        print(f"  Status: {admin_user.approval_status}")
        print("=" * 60)


if __name__ == "__main__":
    asyncio.run(check_and_create_test_users())
