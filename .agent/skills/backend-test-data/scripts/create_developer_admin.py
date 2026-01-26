"""
Create developer admin account script.

Usage:
    cd backend
    python -m scripts.create_developer_admin
"""

import asyncio
import sys
import os
import uuid

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from passlib.context import CryptContext

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str) -> str:
    """Hash a password."""
    return pwd_context.hash(password)


async def create_developer_admin():
    """Create a developer admin account."""
    from src.common.modules.supabase import supabase_service
    
    # Developer account details
    developer_data = {
        "id": str(uuid.uuid4()),
        "username": "developer",
        "email": "developer@gangwon.kr",
        "password_hash": hash_password("Dev@2026!"),
        "full_name": "Developer",
        "admin_type": "developer",
        "is_active": "true",
    }
    
    # Check if developer already exists
    result = supabase_service.client.table("admins").select("*").eq("email", developer_data["email"]).execute()
    existing = result.data[0] if result.data else None
    if existing:
        print(f"Developer admin already exists: {existing['email']}")
        # Update to developer type if needed
        if existing.get("admin_type") != "developer":
            supabase_service.client.table("admins").update({
                "admin_type": "developer"
            }).eq("id", str(existing["id"])).execute()
            print(f"Updated admin_type to 'developer'")
        return existing
    
    # Create developer admin
    result = supabase_service.client.table("admins").insert(developer_data).execute()
    
    if result.data:
        print(f"Developer admin created successfully!")
        print(f"  Email: {developer_data['email']}")
        print(f"  Password: Dev@2026!")
        print(f"  Admin Type: developer")
        return result.data[0]
    else:
        print("Failed to create developer admin")
        return None


if __name__ == "__main__":
    asyncio.run(create_developer_admin())
