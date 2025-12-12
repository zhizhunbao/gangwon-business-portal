#!/usr/bin/env python3
"""
Test data generation script.

Generates test data for the Gangwon Business Portal application.
Data definitions are loaded from test_data_config.json for separation of concerns.
All database operations are executed atomically within a single transaction.

Note: UserInfo schema (used in /api/auth/me and /api/auth/profile endpoints) 
no longer includes a 'role' field, as these endpoints are member-only and 
the role is always 'member'. Admin endpoints use different response models.

Image Generation:
    This script will automatically generate images and upload them to Supabase Storage:
    - Banner images: Generated on-the-fly during test data generation
    - News images: Generated using generate_news_images.py functions for each press release
    
    The script imports and uses functions from scripts/generate_news_images.py to ensure
    consistent, high-quality news images. All images are created in memory and uploaded
    directly to Supabase Storage.
"""
from __future__ import annotations

import asyncio
import json
from datetime import datetime, timedelta, timezone
from decimal import Decimal
from typing import List, Dict, Any
from uuid import uuid4
import random

from faker import Faker
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete, text

import sys
import importlib
from pathlib import Path
from io import BytesIO

# Try to import colorama for colored output
try:
    from colorama import init, Fore, Style
    init(autoreset=True)
    HAS_COLORAMA = True
except ImportError:
    class Fore:
        GREEN = '\033[92m'
        RED = '\033[91m'
        YELLOW = '\033[93m'
        CYAN = '\033[96m'
    class Style:
        RESET_ALL = '\033[0m'
    HAS_COLORAMA = False

# Try to import PIL for image generation
try:
    from PIL import Image, ImageDraw, ImageFilter
    HAS_PIL = True
except ImportError:
    HAS_PIL = False
    Image = None
    ImageDraw = None

# Add parent directory to path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Add project root to path to import generate_news_images
project_root = backend_dir.parent
sys.path.insert(0, str(project_root))

# Models and session will be imported in main() to avoid circular import issues

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
fake = Faker("ko_KR")
fake_en = Faker("en_US")


def load_config(config_path: Path = None) -> Dict[str, Any]:
    """Load test data configuration from JSON file."""
    if config_path is None:
        config_path = Path(__file__).parent / "test_data_config.json"
    
    if not config_path.exists():
        raise FileNotFoundError(f"Configuration file not found: {config_path}")
    
    with open(config_path, 'r', encoding='utf-8') as f:
        config = json.load(f)
    
    return config


async def create_test_account(session: AsyncSession, config: Dict[str, Any], account_key: str = "test"):
    """Create a test account that is approved and active for testing purposes."""
    from src.common.modules.db.models import Member, MemberProfile
    test_config = config["accounts"][account_key]
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["test_account"]
    
    test_business_number = test_config["business_number"]
    test_email = test_config["email"]
    test_password = test_config["password"]
    
    # Check if test account already exists
    result = await session.execute(
        select(Member).where(Member.business_number == test_business_number)
    )
    existing_member = result.scalar_one_or_none()
    
    if existing_member:
        # Update existing member to be approved and active
        existing_member.status = "active"
        existing_member.approval_status = "approved"
        existing_member.password_hash = pwd_context.hash(test_password)
        member = existing_member
        print(f"Updated existing test account: {test_business_number}")
    else:
        # Create new test member
        member = Member(
            id=uuid4(),
            business_number=test_business_number,
            company_name=test_config["company_name"],
            email=test_email,
            password_hash=pwd_context.hash(test_password),
            status="active",
            approval_status="approved",
            created_at=datetime.now(timezone.utc),
        )
        session.add(member)
        await session.flush()
        
        # Create profile for test member
        profile = MemberProfile(
            id=uuid4(),
            member_id=member.id,
            industry=random.choice(data_defs["industries"]),
            revenue=Decimal(random.randint(data_ranges["revenue_min"], data_ranges["revenue_max"])),
            employee_count=random.randint(data_ranges["employee_count_min"], data_ranges["employee_count_max"]),
            founding_date=fake.date_between(start_date=f"-{data_ranges['founding_date_years_ago']}y", end_date="today"),
            region=random.choice(data_defs["regions"]),
            address=fake.address(),
            website=test_config["profile"].get("website"),
            logo_url=None,
        )
        session.add(profile)
        print(f"Created new test account: {test_business_number}")
    
    await session.flush()
    return member


async def generate_members(session: AsyncSession, config: Dict[str, Any], count: int = 75) -> List['Member']:
    """Generate member test data."""
    from src.common.modules.db.models import Member, MemberProfile
    
    members = []
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["member"]
    probs = config["probabilities"]
    
    statuses = data_defs["member_statuses"]
    approval_statuses = data_defs["approval_statuses"]
    industries = data_defs["industries"]
    regions = data_defs["regions"]
    # Get test business numbers to avoid duplicates
    test_business_number = config["accounts"]["test"]["business_number"]
    test_modify_business_number = config["accounts"].get("test_modify", {}).get("business_number", "")
    
    # Create test accounts that are approved and active
    test_member = await create_test_account(session, config, "test")
    members.append(test_member)
    test_password = config["accounts"]["test"]["password"]
    print(f"Test account created: business_number={test_member.business_number}, password={test_password}")
    
    # Create second test account for modification tests (if configured)
    if "test_modify" in config["accounts"]:
        test_modify_member = await create_test_account(session, config, "test_modify")
        members.append(test_modify_member)
        test_modify_password = config["accounts"]["test_modify"]["password"]
        print(f"Test modify account created: business_number={test_modify_member.business_number}, password={test_modify_password}")
        # Adjust count to account for both test accounts
        count_adjustment = 2
    else:
        count_adjustment = 1
    
    # Generate other members
    for i in range(count - count_adjustment):  # Subtract test accounts from count
        business_number = f"{random.randint(1000000000, 9999999999)}"
        # Make sure we don't duplicate the test account business numbers
        normalized_test = test_business_number.replace("-", "").replace(" ", "")
        normalized_modify = test_modify_business_number.replace("-", "").replace(" ", "") if test_modify_business_number else ""
        while (business_number == normalized_test or 
               business_number == normalized_modify or
               business_number.replace("-", "") == normalized_test or
               business_number.replace("-", "") == normalized_modify):
            business_number = f"{random.randint(1000000000, 9999999999)}"
        
        company_name = fake.company()
        email = fake.unique.email()
        password_hash = pwd_context.hash("password123")
        
        status = random.choice(statuses)
        approval_status = random.choice(approval_statuses)
        
        member = Member(
            id=uuid4(),
            business_number=business_number,
            company_name=company_name,
            email=email,
            password_hash=password_hash,
            status=status,
            approval_status=approval_status,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 365)),
        )
        members.append(member)
        
        profile = MemberProfile(
            id=uuid4(),
            member_id=member.id,
            industry=random.choice(industries) if random.random() > probs["member_profile_industry_null"] else None,
            revenue=Decimal(random.randint(data_ranges["revenue_min"], data_ranges["revenue_max"])) if random.random() > probs["member_profile_revenue_null"] else None,
            employee_count=random.randint(data_ranges["employee_count_min"], data_ranges["employee_count_max"]) if random.random() > probs["member_profile_employee_count_null"] else None,
            founding_date=fake.date_between(start_date=f"-{data_ranges['founding_date_years_ago']}y", end_date="today") if random.random() > probs["member_profile_founding_date_null"] else None,
            region=random.choice(regions) if random.random() > probs["member_profile_region_null"] else None,
            address=fake.address() if random.random() > probs["member_profile_address_null"] else None,
            website=f"https://{fake.domain_name()}" if random.random() > probs["member_profile_website_null"] else None,
            logo_url=None,
        )
        session.add(member)
        session.add(profile)
    
    await session.flush()
    return members


async def generate_performance_records(
    session: AsyncSession, members: List['Member'], config: Dict[str, Any], count: int = 350
) -> List['PerformanceRecord']:
    """Generate performance record test data."""
    from src.common.modules.db.models import PerformanceRecord, PerformanceReview
    
    records = []
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["performance"]
    probs = config["probabilities"]
    
    types = data_defs["performance_types"]
    statuses = data_defs["performance_statuses"]
    current_year = datetime.now(timezone.utc).year
    year_range = data_ranges["year_range"]
    
    for i in range(count):
        member = random.choice(members)
        year = random.randint(current_year - year_range, current_year)
        quarter = random.choice([1, 2, 3, 4, None])
        type_ = random.choice(types)
        status = random.choice(statuses)
        
        type_ranges = data_ranges[type_]
        if type_ == "sales":
            data_json = {
                "revenue": random.randint(type_ranges["revenue_min"], type_ranges["revenue_max"]),
                "employees": random.randint(type_ranges["employees_min"], type_ranges["employees_max"]),
                "new_contracts": random.randint(type_ranges["new_contracts_min"], type_ranges["new_contracts_max"]),
            }
        elif type_ == "support":
            data_json = {
                "support_amount": random.randint(type_ranges["support_amount_min"], type_ranges["support_amount_max"]),
                "programs": random.randint(type_ranges["programs_min"], type_ranges["programs_max"]),
                "beneficiaries": random.randint(type_ranges["beneficiaries_min"], type_ranges["beneficiaries_max"]),
            }
        else:  # ip
            data_json = {
                "patents": random.randint(type_ranges["patents_min"], type_ranges["patents_max"]),
                "trademarks": random.randint(type_ranges["trademarks_min"], type_ranges["trademarks_max"]),
                "copyrights": random.randint(type_ranges["copyrights_min"], type_ranges["copyrights_max"]),
            }
        
        submitted_at = None
        if status in ["submitted", "approved", "rejected", "revision_requested"]:
            submitted_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["submitted_days_ago_max"]))
        
        record = PerformanceRecord(
            id=uuid4(),
            member_id=member.id,
            year=year,
            quarter=quarter,
            type=type_,
            status=status,
            data_json=data_json,
            submitted_at=submitted_at,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        records.append(record)
        session.add(record)
        
        if status in ["approved", "rejected", "revision_requested"]:
            approved_members = [m for m in members if m.approval_status == "approved"]
            if approved_members:
                admin_member = random.choice(approved_members)
                review = PerformanceReview(
                    id=uuid4(),
                    performance_id=record.id,
                    reviewer_id=admin_member.id,
                    status=status,
                    comments=fake.text(max_nb_chars=200) if random.random() > probs["performance_review_comments_null"] else None,
                    reviewed_at=submitted_at + timedelta(days=random.randint(data_ranges["review_days_min"], data_ranges["review_days_max"])) if submitted_at else datetime.now(timezone.utc),
                )
                session.add(review)
    
    await session.flush()
    return records


async def generate_projects(session: AsyncSession, config: Dict[str, Any], count: int = 35) -> List['Project']:
    """Generate project test data."""
    from src.common.modules.db.models import Project
    
    projects = []
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["project"]
    
    statuses = data_defs["project_statuses"]
    
    for i in range(count):
        start_date = fake.date_between(
            start_date=f"-{data_ranges['start_date_days_ago']}d",
            end_date=f"+{data_ranges['start_date_days_ahead']}d"
        )
        end_date = start_date + timedelta(days=random.randint(data_ranges["duration_days_min"], data_ranges["duration_days_max"]))
        
        project = Project(
            id=uuid4(),
            title=fake.sentence(nb_words=4),
            description=fake.text(max_nb_chars=500),
            target_audience=fake.text(max_nb_chars=200),
            start_date=start_date,
            end_date=end_date,
            image_url=f"https://example.com/images/project_{i+1}.jpg",
            status=random.choice(statuses),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        projects.append(project)
        session.add(project)
    
    await session.flush()
    return projects


async def generate_project_applications(
    session: AsyncSession, members: List['Member'], projects: List['Project'], config: Dict[str, Any], count: int = 150
) -> List['ProjectApplication']:
    """Generate project application test data."""
    from src.common.modules.db.models import ProjectApplication
    
    applications = []
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["application"]
    
    statuses = data_defs["application_statuses"]
    
    for i in range(count):
        member = random.choice(members)
        project = random.choice(projects)
        status = random.choice(statuses)
        
        submitted_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["submitted_days_ago_max"]))
        reviewed_at = None
        if status in ["approved", "rejected"]:
            reviewed_at = submitted_at + timedelta(days=random.randint(data_ranges["review_days_min"], data_ranges["review_days_max"]))
        
        application = ProjectApplication(
            id=uuid4(),
            member_id=member.id,
            project_id=project.id,
            status=status,
            application_reason=fake.text(max_nb_chars=500),
            submitted_at=submitted_at,
            reviewed_at=reviewed_at,
        )
        applications.append(application)
        session.add(application)
    
    await session.flush()
    return applications


# Banner configuration - matches generate_banners.py
BANNER_CONFIGS = {
    'main_primary': {
        'size': (1920, 600),
        'color': (30, 64, 175),
    },
    'main_secondary': {
        'size': (800, 300),
        'color': (59, 130, 246),
    },
    'about': {
        'size': (1920, 400),
        'color': (5, 150, 105),
    },
    'projects': {
        'size': (1920, 400),
        'color': (220, 38, 38),
    },
    'performance': {
        'size': (1920, 400),
        'color': (124, 58, 237),
    },
    'support': {
        'size': (1920, 400),
        'color': (234, 88, 12),
    },
    'notices': {
        'size': (1920, 400),
        'color': (190, 24, 93),
    },
    'news': {
        'size': (1920, 400),
        'color': (180, 83, 9),
        'decorated': True,
    },
    'scroll': {
        'size': (1920, 150),
        'color': (71, 85, 105),
    }
}


def create_banner_image(config_name: str) -> bytes:
    """
    Create a banner image in memory.
    
    Args:
        config_name: Banner configuration name (e.g., 'main_primary', 'about')
    
    Returns:
        bytes: PNG image data
    """
    if not HAS_PIL:
        raise ImportError("PIL/Pillow is required for banner generation. Install with: pip install pillow")
    
    config = BANNER_CONFIGS.get(config_name, BANNER_CONFIGS['about'])
    size = config['size']
    color = config['color']
    
    # Create image
    img = Image.new('RGB', size, color)
    
    # Save to bytes
    buffer = BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)
    return buffer.getvalue()


def create_news_image(title: str, content: str = "") -> bytes:
    """
    Create a news article image in memory using generate_news_images.py functions.
    
    Args:
        title: News article title
        content: News article content (optional, for preview text)
    
    Returns:
        bytes: JPEG image data
    """
    if not HAS_PIL:
        raise ImportError("PIL/Pillow is required for news image generation. Install with: pip install pillow")
    
    try:
        # Import functions from generate_news_images.py
        from scripts.generate_news_images import (
            generate_main_image,
            get_font_path,
            NEWS_THEMES
        )
        
        # Get font path
        font_path = get_font_path()
        
        # Select a random theme (use news_id as index, but we'll use random)
        theme_ids = list(NEWS_THEMES.keys())
        news_id = random.choice(theme_ids)
        theme = NEWS_THEMES[news_id]
        
        # Generate main image using the script's function
        img = generate_main_image(news_id, title, content, theme, font_path)
        
        # Convert PIL Image to bytes
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=90)
        buffer.seek(0)
        return buffer.getvalue()
        
    except ImportError as e:
        # Fallback if generate_news_images.py is not available
        print(f"  Warning: Could not import generate_news_images.py: {e}")
        print("  Falling back to simple image generation")
        
        # Simple fallback: create a basic colored image
        img = Image.new('RGB', (1200, 675), (75, 130, 180))
        buffer = BytesIO()
        img.save(buffer, format='JPEG', quality=90)
        buffer.seek(0)
        return buffer.getvalue()


async def upload_image_to_supabase(
    image_data: bytes,
    filename: str,
    storage_service: Any,
    content_type: str = "image/png",
    subfolder: str = "banners",
) -> str:
    """
    Upload image to Supabase Storage.
    
    Args:
        image_data: Image bytes data
        filename: Filename for the image
        storage_service: Storage service instance
        content_type: MIME type (default: "image/png")
        subfolder: Subfolder in storage (default: "banners")
    
    Returns:
        str: Public URL of the uploaded image
    """
    # Use Supabase client directly to upload bytes
    client = storage_service.client
    bucket = "public-files"
    path = f"gangwon-portal/{subfolder}/{filename}"
    
    # Upload to Supabase
    client.storage.from_(bucket).upload(
        path,
        image_data,
        file_options={"content-type": content_type},
    )
    
    # Get public URL
    file_url = client.storage.from_(bucket).get_public_url(path)
    return file_url


async def upload_banner_to_supabase(
    image_data: bytes,
    filename: str,
    storage_service: Any,
) -> str:
    """
    Upload banner image to Supabase Storage (convenience wrapper).
    
    Args:
        image_data: Image bytes data
        filename: Filename for the banner
        storage_service: Storage service instance
    
    Returns:
        str: Public URL of the uploaded image
    """
    return await upload_image_to_supabase(image_data, filename, storage_service, "image/png", "banners")


async def generate_content(session: AsyncSession, members: List['Member'], config: Dict[str, Any], storage_service: Any = None):
    """Generate content test data (notices, press releases, banners, FAQs)."""
    from src.common.modules.db.models import Notice, PressRelease, Banner, FAQ
    
    approved_members = [m for m in members if m.approval_status == "approved"]
    if not approved_members:
        return
    
    admin_member = approved_members[0]
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["content"]
    probs = config["probabilities"]
    
    # Mapping from banner_type to banner config names
    banner_type_to_config = {
        "MAIN": ["main_primary", "main_secondary"],
        "INTRO": ["about"],
        "PROGRAM": ["projects"],
        "PERFORMANCE": ["performance"],
        "SUPPORT": ["support"],
    }
    
    for i in range(data_ranges["notices_count"]):
        notice = Notice(
            id=uuid4(),
            board_type="notice",
            title=fake.sentence(nb_words=5),
            content_html=f"<p>{fake.text(max_nb_chars=1000)}</p>",
            author_id=admin_member.id,
            view_count=random.randint(0, 1000),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        session.add(notice)
    
    for i in range(data_ranges["press_releases_count"]):
        # Generate news title and content
        news_title = fake.sentence(nb_words=4)
        news_content = fake.text(max_nb_chars=200)  # Generate some content for the image
        
        # Generate news image and upload to Supabase Storage
        image_url = None
        if storage_service and HAS_PIL:
            try:
                # Generate news image using generate_news_images.py
                image_data = create_news_image(news_title, news_content)
                
                # Create unique filename
                news_filename = f"news_{uuid4().hex[:8]}.jpg"
                
                # Upload to Supabase Storage
                image_url = await upload_image_to_supabase(
                    image_data,
                    news_filename,
                    storage_service,
                    "image/jpeg",
                    "news"
                )
                print(f"  Uploaded news image to Supabase: {news_title[:30]}... -> {news_filename}")
            except Exception as e:
                print(f"  Warning: Failed to upload news image to Supabase: {e}")
                import traceback
                traceback.print_exc()
                # Fallback to placeholder data URI if upload fails
                image_url = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2NzUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5ld3M8L3RleHQ+PC9zdmc+"
        else:
            # Fallback to placeholder if storage service not available or PIL not installed
            if not storage_service:
                print(f"  Warning: Storage service not available, using placeholder for news image")
            if not HAS_PIL:
                print(f"  Warning: PIL not installed, using placeholder for news image")
            image_url = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTIwMCIgaGVpZ2h0PSI2NzUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPk5ld3M8L3RleHQ+PC9zdmc+"
        
        press = PressRelease(
            id=uuid4(),
            title=news_title,
            image_url=image_url,
            author_id=admin_member.id,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        session.add(press)
    
    banner_types = data_defs["banner_types"]
    for banner_type in banner_types:
        # Get available banner configs for this type
        available_configs = banner_type_to_config.get(banner_type, [f"{banner_type.lower()}"])
        
        for i in range(data_ranges["banners_per_type"]):
            # Use available configs, or fallback to a pattern
            if i < len(available_configs):
                banner_config_name = available_configs[i]
            else:
                # If we need more banners than available configs, use a numbered pattern
                banner_config_name = f"{banner_type.lower()}_{i+1}"
            
            # Generate banner image and upload to Supabase Storage
            image_url = None
            if storage_service and HAS_PIL:
                try:
                    # Generate banner image
                    image_data = create_banner_image(banner_config_name)
                    
                    # Create unique filename
                    banner_filename = f"{banner_config_name}_{uuid4().hex[:8]}.png"
                    
                    # Upload to Supabase Storage
                    image_url = await upload_banner_to_supabase(
                        image_data,
                        banner_filename,
                        storage_service
                    )
                    print(f"  Uploaded banner to Supabase: {banner_type} -> {banner_filename}")
                except Exception as e:
                    print(f"  Warning: Failed to upload banner to Supabase: {e}")
                    # Fallback to placeholder data URI if upload fails
                    image_url = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSI0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkJhbm5lcjwvdGV4dD48L3N2Zz4="
            else:
                # Fallback to placeholder if storage service not available or PIL not installed
                if not storage_service:
                    print(f"  Warning: Storage service not available, using placeholder for banner")
                if not HAS_PIL:
                    print(f"  Warning: PIL not installed, using placeholder for banner")
                image_url = "data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTkyMCIgaGVpZ2h0PSI0MDAiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjEwMCUiIGhlaWdodD0iMTAwJSIgZmlsbD0iI2U1ZTdlYiIvPjx0ZXh0IHg9IjUwJSIgeT0iNTAlIiBmb250LWZhbWlseT0iQXJpYWwiIGZvbnQtc2l6ZT0iMjQiIGZpbGw9IiM5Y2EzYWYiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGRvbWluYW50LWJhc2VsaW5lPSJtaWRkbGUiPkJhbm5lcjwvdGV4dD48L3N2Zz4="
            
            banner = Banner(
                id=uuid4(),
                banner_type=banner_type,
                image_url=image_url,
                link_url=f"https://example.com/{banner_type.lower()}" if random.random() > probs["banner_link_url_null"] else None,
                is_active="true" if random.random() < probs["banner_is_active"] else "false",
                display_order=i,
                created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 90)),
            )
            session.add(banner)
    
    categories = data_defs["faq_categories"]
    for i in range(data_ranges["faqs_count"]):
        faq = FAQ(
            id=uuid4(),
            category=random.choice(categories),
            question=fake.sentence(nb_words=8),
            answer=fake.text(max_nb_chars=500),
            display_order=i,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        session.add(faq)
    
    await session.flush()


async def generate_inquiries(session: AsyncSession, members: List['Member'], config: Dict[str, Any], count: int = 30):
    """Generate inquiry test data."""
    from src.common.modules.db.models import Inquiry
    
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["inquiry"]
    
    statuses = data_defs["inquiry_statuses"]
    
    for i in range(count):
        member = random.choice(members)
        status = random.choice(statuses)
        
        inquiry = Inquiry(
            id=uuid4(),
            member_id=member.id,
            subject=fake.sentence(nb_words=5),
            content=fake.text(max_nb_chars=500),
            status=status,
            admin_reply=fake.text(max_nb_chars=300) if status in ["replied", "closed"] else None,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
            replied_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["replied_days_ago_max"])) if status in ["replied", "closed"] else None,
        )
        session.add(inquiry)
    
    await session.flush()


async def generate_attachments(
    session: AsyncSession,
    performance_records: List['PerformanceRecord'],
    projects: List['Project'],
    applications: List['ProjectApplication'],
    config: Dict[str, Any],
    count: int = 100,
):
    """Generate attachment test data."""
    from src.common.modules.db.models import Attachment
    
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["attachment"]
    
    file_types = data_defs["file_types"]
    mime_types = data_defs["mime_types"]
    
    resources = []
    for record in performance_records[:len(performance_records)//3]:
        resources.append(("performance", record.id))
    for project in projects[:len(projects)//2]:
        resources.append(("project", project.id))
    for app in applications[:len(applications)//3]:
        resources.append(("project_application", app.id))
    
    for i in range(min(count, len(resources))):
        resource_type, resource_id = random.choice(resources)
        file_type = random.choice(file_types)
        mime_type = random.choice(mime_types[file_type])
        
        attachment = Attachment(
            id=uuid4(),
            resource_type=resource_type,
            resource_id=resource_id,
            file_type=file_type,
            file_url=f"https://example.com/uploads/{resource_type}/{resource_id}/{uuid4()}.{mime_type.split('/')[-1]}",
            original_name=f"{fake.word()}.{mime_type.split('/')[-1]}",
            stored_name=f"{uuid4()}.{mime_type.split('/')[-1]}",
            file_size=random.randint(data_ranges["file_size_min"], data_ranges["file_size_max"]),
            mime_type=mime_type,
            uploaded_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["uploaded_days_ago_max"])),
        )
        session.add(attachment)
    
    await session.flush()


async def generate_admins(session: AsyncSession, config: Dict[str, Any], count: int = 5) -> List['Admin']:
    """Generate admin test data."""
    from src.common.modules.db.models import Admin
    
    admins = []
    admin_user_config = config["accounts"].get("admin_user", {})
    
    # Create the main admin account from config
    main_admin = Admin(
        id=uuid4(),
        username=admin_user_config.get("username", "admin"),
        email=admin_user_config.get("email", "admin@k-talk.kr"),
        password_hash=pwd_context.hash(admin_user_config.get("password", "password123")),
        full_name=admin_user_config.get("full_name", "시스템 관리자"),
        is_active="true",
        created_at=datetime.now(timezone.utc),
    )
    admins.append(main_admin)
    session.add(main_admin)
    print(f"Created main admin account: username={main_admin.username}, password={admin_user_config.get('password', 'password123')}")
    
    # Generate additional admin accounts
    for i in range(count - 1):
        username = f"admin{i+1}"
        email = f"admin{i+1}@k-talk.kr"
        # Make sure username and email are unique
        while any(a.username == username or a.email == email for a in admins):
            username = f"admin{random.randint(1000, 9999)}"
            email = f"admin{random.randint(1000, 9999)}@k-talk.kr"
        
        admin = Admin(
            id=uuid4(),
            username=username,
            email=email,
            password_hash=pwd_context.hash("password123"),
            full_name=fake.name(),
            is_active="true" if random.random() > 0.1 else "false",  # 90% active
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, 365)),
        )
        admins.append(admin)
        session.add(admin)
    
    await session.flush()
    return admins


async def generate_audit_logs(session: AsyncSession, members: List['Member'], config: Dict[str, Any], count: int = 1000):
    """Generate audit log test data."""
    from src.common.modules.db.models import AuditLog
    
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["audit_log"]
    probs = config["probabilities"]
    
    actions = data_defs["audit_actions"]
    resource_types = data_defs["audit_resource_types"]
    user_agents = data_defs["user_agents"]
    
    for i in range(count):
        member = random.choice(members) if random.random() > probs["audit_log_member_null"] else None
        action = random.choice(actions)
        resource_type = random.choice(resource_types) if random.random() > probs["audit_log_resource_type_null"] else None
        resource_id = uuid4() if resource_type else None
        
        log = AuditLog(
            id=uuid4(),
            user_id=member.id if member else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=fake.ipv4(),
            user_agent=random.choice(user_agents),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        session.add(log)
    
    await session.flush()


async def clear_test_data(session: AsyncSession):
    """Clear all test data from database using TRUNCATE.
    
    Note: This does NOT commit the transaction. The caller is responsible
    for committing or rolling back the transaction to ensure atomicity.
    
    Uses TRUNCATE CASCADE to handle foreign key constraints automatically.
    This is faster than DELETE for clearing all data.
    """
    # List of all tables to truncate
    # Using TRUNCATE CASCADE to automatically handle foreign key dependencies
    tables = [
        "application_exceptions",
        "application_logs",
        "audit_logs",
        "inquiries",
        "faqs",
        "banners",
        "system_info",
        "press_releases",
        "notices",
        "attachments",
        "project_applications",
        "projects",
        "performance_reviews",
        "performance_records",
        "member_profiles",
        "members",
        "admins",
    ]
    
    # Truncate all tables with CASCADE to handle foreign key constraints automatically
    # CASCADE will automatically truncate dependent tables
    tables_str = ", ".join(tables)
    await session.execute(text(f"TRUNCATE TABLE {tables_str} CASCADE;"))
    
    print("All test data cleared.")


async def generate_all(
    session: AsyncSession,
    config: Dict[str, Any],
    members_count: int = None,
    admins_count: int = None,
    performance_count: int = None,
    projects_count: int = None,
    applications_count: int = None,
    attachments_count: int = None,
    audit_logs_count: int = None,
):
    """Generate all test data.
    
    Note: This does NOT commit the transaction. The caller is responsible
    for committing or rolling back the transaction to ensure atomicity.
    """
    counts = config["generation_counts"]
    members_count = members_count or counts["members"]
    admins_count = admins_count or counts.get("admins", 5)
    performance_count = performance_count or counts["performance_records"]
    projects_count = projects_count or counts["projects"]
    applications_count = applications_count or counts["project_applications"]
    attachments_count = attachments_count or counts["attachments"]
    audit_logs_count = audit_logs_count or counts["audit_logs"]
    
    print("Generating admins...")
    admins = await generate_admins(session, config, admins_count)
    print(f"Generated {len(admins)} admins")
    admin_user_config = config["accounts"].get("admin_user", {})
    if admins:
        main_admin = admins[0]
        print(f"\n{Fore.CYAN if HAS_COLORAMA else ''}Main Admin Account:{Style.RESET_ALL if HAS_COLORAMA else ''}")
        print(f"Username: {main_admin.username}")
        print(f"Email: {main_admin.email}")
        print(f"Password: {admin_user_config.get('password', 'password123')}")
        print(f"Full Name: {main_admin.full_name}")
        print(f"Is Active: {main_admin.is_active}")
        print(f"{Fore.GREEN if HAS_COLORAMA else ''}Use this account for admin API testing!{Style.RESET_ALL if HAS_COLORAMA else ''}\n")
    
    print("Generating members...")
    members = await generate_members(session, config, members_count)
    print(f"Generated {len(members)} members")
    print(f"\n{Fore.GREEN if HAS_COLORAMA else ''}=== Test Accounts Info ==={Style.RESET_ALL if HAS_COLORAMA else ''}")
    
    # Test member account info
    test_config = config["accounts"]["test"]
    test_member = next((m for m in members if m.business_number == test_config["business_number"]), None)
    if test_member:
        print(f"\n{Fore.CYAN if HAS_COLORAMA else ''}Test Member Account:{Style.RESET_ALL if HAS_COLORAMA else ''}")
        print(f"Business Number: {test_member.business_number}")
        print(f"Email: {test_member.email}")
        print(f"Password: {test_config['password']}")
        print(f"Status: {test_member.status}")
        print(f"Approval Status: {test_member.approval_status}")
        print(f"{Fore.GREEN if HAS_COLORAMA else ''}You can use this account for API testing!{Style.RESET_ALL if HAS_COLORAMA else ''}\n")
    
    print("Generating performance records...")
    performance_records = await generate_performance_records(session, members, config, performance_count)
    print(f"Generated {len(performance_records)} performance records")
    
    print("Generating projects...")
    projects = await generate_projects(session, config, projects_count)
    print(f"Generated {len(projects)} projects")
    
    print("Generating project applications...")
    applications = await generate_project_applications(session, members, projects, config, applications_count)
    print(f"Generated {len(applications)} project applications")
    
    print("Generating content (notices, press releases, banners, FAQs)...")
    # Try to get storage service for banner uploads
    storage_service = None
    try:
        from src.common.modules.storage import storage_service as storage_svc
        storage_service = storage_svc
    except Exception as e:
        print(f"  Warning: Could not initialize storage service: {e}")
        print("  Banners will use local file paths instead of Supabase Storage")
    
    await generate_content(session, members, config, storage_service)
    print("Generated content")
    
    print("Generating inquiries...")
    inquiry_count = config["data_ranges"]["inquiry"]["count"]
    await generate_inquiries(session, members, config, inquiry_count)
    print("Generated inquiries")
    
    print("Generating attachments...")
    await generate_attachments(session, performance_records, projects, applications, config, attachments_count)
    print("Generated attachments")
    
    print("Generating audit logs...")
    await generate_audit_logs(session, members, config, audit_logs_count)
    print(f"Generated {audit_logs_count} audit logs")
    
    print("\nAll test data generated successfully!")


async def main():
    """Main entry point.
    
    All database operations are executed atomically within a single transaction.
    If any step fails, the entire transaction is rolled back.
    """
    # Import all modules here to avoid circular import issues
    from src.common.modules.db.session import AsyncSessionLocal, engine
    from src.common.modules.db.models import (
        Member,
        MemberProfile,
        PerformanceRecord,
        PerformanceReview,
        Project,
        ProjectApplication,
        Attachment,
        Notice,
        PressRelease,
        Banner,
        SystemInfo,
        FAQ,
        Inquiry,
        AuditLog,
        Admin,
    )
    
    # Load configuration from JSON file
    config_path = Path(__file__).parent / "test_data_config.json"
    try:
        config = load_config(config_path)
        print(f"Configuration loaded from: {config_path}")
    except FileNotFoundError as e:
        print(f"Error: {e}")
        print("Please ensure test_data_config.json exists in the scripts directory.")
        return
    except json.JSONDecodeError as e:
        print(f"Error: Invalid JSON in configuration file: {e}")
        return
    
    session = None
    try:
        # Start a transaction - all operations will be atomic
        async with AsyncSessionLocal() as session:
            # Always clear all existing test data before generating new data
            print("Clearing all existing test data...")
            await clear_test_data(session)
            
            # Generate all test data within the same transaction
            await generate_all(session, config)
            
            # Commit the transaction atomically
            # If any error occurs before this point, the transaction will be rolled back
            await session.commit()
            print(f"\n{Fore.GREEN if HAS_COLORAMA else ''}✓ Transaction committed successfully - all data is now in the database{Style.RESET_ALL if HAS_COLORAMA else ''}")
            
    except Exception as e:
        # Rollback the transaction on any error
        if session:
            try:
                await session.rollback()
                print(f"\n{Fore.RED if HAS_COLORAMA else ''}✗ Transaction rolled back due to error{Style.RESET_ALL if HAS_COLORAMA else ''}")
            except Exception as rollback_error:
                print(f"Error during rollback: {rollback_error}")
        print(f"Error: {e}")
        import traceback
        traceback.print_exc()
        raise
    finally:
        # Explicitly close all database connections before event loop closes
        # This prevents SSL transport errors on Windows
        try:
            # Close all connections in the pool
            await engine.dispose(close=True)
            # Give a small delay to ensure all connections are properly closed
            # This is especially important on Windows with SSL connections
            await asyncio.sleep(0.3)
        except (AttributeError, RuntimeError) as e:
            # Ignore errors that occur when event loop is already closing
            # These are harmless and don't affect the data generation
            if "Event loop is closed" not in str(e) and "'NoneType' object has no attribute 'send'" not in str(e):
                # Only log if it's a different error
                print(f"Warning during cleanup: {e}")
        except Exception:
            # Ignore all other errors during cleanup
            pass


def suppress_ssl_cleanup_errors():
    """Suppress SSL transport errors that occur during cleanup on Windows."""
    import sys
    import logging
    
    if sys.platform == "win32":
        # Suppress asyncio SSL warnings/errors on Windows
        # These occur during event loop cleanup and don't affect functionality
        logging.getLogger('asyncio').setLevel(logging.CRITICAL)
        
        # Also suppress stderr output for SSL cleanup errors
        original_stderr = sys.stderr
        
        class FilteredStderr:
            """Filter stderr to suppress SSL cleanup errors."""
            def __init__(self, original):
                self.original = original
                self.suppress = False
            
            def write(self, text):
                if "Fatal error on SSL transport" in text or "AttributeError: 'NoneType' object has no attribute 'send'" in text:
                    # Suppress these specific errors
                    return
                self.original.write(text)
            
            def flush(self):
                self.original.flush()
            
            def __getattr__(self, name):
                return getattr(self.original, name)
        
        sys.stderr = FilteredStderr(original_stderr)


if __name__ == "__main__":
    # Suppress SSL transport errors on Windows (they occur during cleanup and don't affect functionality)
    suppress_ssl_cleanup_errors()
    
    # Use asyncio.run() which properly handles event loop cleanup
    try:
        asyncio.run(main())
        print("\nScript completed successfully!")
    except KeyboardInterrupt:
        print("\nScript interrupted by user")
    except Exception as e:
        print(f"\nFatal error: {e}")
        import traceback
        traceback.print_exc()
        exit(1)

