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


# Banner configuration - gradient colors only, text stored in DB
BANNER_CONFIGS = {
    'main_primary': {
        'size': (1920, 600),
        'color': (30, 64, 175),
        'color2': (59, 130, 246),
        'title_ko': '강원 기업 포털',
        'title_zh': '江原企业门户',
        'subtitle_ko': '기업 성장을 위한 원스톱 지원 플랫폼',
        'subtitle_zh': '企业成长一站式支援平台',
    },
    'main_secondary': {
        'size': (800, 300),
        'color': (59, 130, 246),
        'color2': (96, 165, 250),
        'title_ko': '기업 지원',
        'title_zh': '企业支援',
        'subtitle_ko': '',
        'subtitle_zh': '',
    },
    'about': {
        'size': (1920, 400),
        'color': (5, 150, 105),
        'color2': (16, 185, 129),
        'title_ko': '소개',
        'title_zh': '简介',
        'subtitle_ko': '강원 기업 포털에 오신 것을 환영합니다',
        'subtitle_zh': '欢迎来到江原企业门户',
    },
    'projects': {
        'size': (1920, 400),
        'color': (220, 38, 38),
        'color2': (248, 113, 113),
        'title_ko': '지원 사업',
        'title_zh': '支援项目',
        'subtitle_ko': '다양한 기업 지원 프로그램',
        'subtitle_zh': '多样化企业支援计划',
    },
    'performance': {
        'size': (1920, 400),
        'color': (124, 58, 237),
        'color2': (167, 139, 250),
        'title_ko': '실적 관리',
        'title_zh': '业绩管理',
        'subtitle_ko': '기업 실적 현황 및 분석',
        'subtitle_zh': '企业业绩现状及分析',
    },
    'support': {
        'size': (1920, 400),
        'color': (234, 88, 12),
        'color2': (251, 146, 60),
        'title_ko': '지원 센터',
        'title_zh': '支援中心',
        'subtitle_ko': '기업 지원 서비스 안내',
        'subtitle_zh': '企业支援服务指南',
    },
    'notices': {
        'size': (1920, 400),
        'color': (190, 24, 93),
        'color2': (236, 72, 153),
        'title_ko': '공지사항',
        'title_zh': '公告',
        'subtitle_ko': '최신 소식 및 안내',
        'subtitle_zh': '最新消息及通知',
    },
    'news': {
        'size': (1920, 400),
        'color': (180, 83, 9),
        'color2': (217, 119, 6),
        'title_ko': '보도자료',
        'title_zh': '新闻报道',
        'subtitle_ko': '언론 보도 및 뉴스',
        'subtitle_zh': '媒体报道及新闻',
    },
    'scroll': {
        'size': (1920, 150),
        'color': (71, 85, 105),
        'color2': (100, 116, 139),
        'title_ko': '',
        'title_zh': '',
        'subtitle_ko': '',
        'subtitle_zh': '',
    },
    'profile': {
        'size': (1920, 400),
        'color': (79, 70, 229),
        'color2': (99, 102, 241),
        'title_ko': '기업 프로필',
        'title_zh': '企业资料',
        'subtitle_ko': '기업 정보 관리',
        'subtitle_zh': '企业信息管理',
    }
}


def create_gradient_background(size: tuple, color1: tuple, color2: tuple) -> Image.Image:
    """Create a diagonal gradient background."""
    width, height = size
    img = Image.new('RGB', size, color1)
    draw = ImageDraw.Draw(img)
    
    # Diagonal gradient
    for y in range(height):
        for x in range(0, width, 4):  # Step by 4 for performance
            ratio = (x + y) / (width + height)
            r = int(color1[0] * (1 - ratio) + color2[0] * ratio)
            g = int(color1[1] * (1 - ratio) + color2[1] * ratio)
            b = int(color1[2] * (1 - ratio) + color2[2] * ratio)
            draw.rectangle([x, y, x + 4, y + 1], fill=(r, g, b))
    
    return img


def create_banner_image(config_name: str) -> bytes:
    """
    Create a banner image with gradient background (no text - text is stored in DB).
    
    Args:
        config_name: Banner configuration name (e.g., 'main_primary', 'about')
    
    Returns:
        bytes: PNG image data
    """
    if not HAS_PIL:
        raise ImportError("PIL/Pillow is required for banner generation. Install with: pip install pillow")
    
    config = BANNER_CONFIGS.get(config_name, BANNER_CONFIGS['about'])
    size = config['size']
    color1 = config['color']
    color2 = config.get('color2', color1)
    
    # Create gradient background (no text - text is rendered by frontend using DB data)
    img = create_gradient_background(size, color1, color2)
    draw = ImageDraw.Draw(img)
    
    # Draw decorative circles for visual interest
    accent_color = tuple(min(c + 40, 255) for c in color1)
    draw.ellipse([-100, -100, 300, 300], fill=accent_color)
    draw.ellipse([size[0] - 200, size[1] - 200, size[0] + 100, size[1] + 100], fill=accent_color)
    
    # Save to bytes
    buffer = BytesIO()
    img.save(buffer, format='PNG', quality=95)
    buffer.seek(0)
    return buffer.getvalue()


def create_news_image() -> bytes:
    """
    Create a news article image with gradient background (no text - text rendered by frontend).
    
    Returns:
        bytes: JPEG image data
    """
    if not HAS_PIL:
        raise ImportError("PIL/Pillow is required for news image generation. Install with: pip install pillow")
    
    # News themes - random colors
    themes = [
        {'primary': (75, 130, 180), 'secondary': (135, 206, 250)},   # Blue
        {'primary': (220, 20, 60), 'secondary': (255, 99, 71)},      # Red
        {'primary': (72, 61, 139), 'secondary': (138, 43, 226)},     # Purple
        {'primary': (34, 139, 34), 'secondary': (50, 205, 50)},      # Green
        {'primary': (46, 125, 50), 'secondary': (76, 175, 80)},      # Dark Green
        {'primary': (180, 83, 9), 'secondary': (217, 119, 6)},       # Orange
    ]
    theme = random.choice(themes)
    
    size = (1200, 675)
    
    # Create gradient background
    img = create_gradient_background(size, theme['primary'], theme['secondary'])
    draw = ImageDraw.Draw(img)
    
    # Draw decorative circles
    accent = tuple(min(c + 50, 255) for c in theme['primary'])
    draw.ellipse([-80, -80, 250, 250], fill=accent)
    draw.ellipse([size[0] - 180, size[1] - 180, size[0] + 80, size[1] + 80], fill=accent)
    
    # Save to bytes
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


async def clear_storage_folder(storage_service: Any, subfolder: str) -> int:
    """
    Clear all files in a Supabase Storage subfolder.
    
    Args:
        storage_service: Storage service instance
        subfolder: Subfolder to clear (e.g., "banners", "news")
    
    Returns:
        int: Number of files deleted
    """
    client = storage_service.client
    bucket = "public-files"
    path = f"gangwon-portal/{subfolder}"
    
    try:
        # List all files in the folder
        files = client.storage.from_(bucket).list(path)
        if not files:
            return 0
        
        # Delete each file
        deleted_count = 0
        for file_info in files:
            if file_info.get("name"):
                file_path = f"{path}/{file_info['name']}"
                try:
                    client.storage.from_(bucket).remove([file_path])
                    deleted_count += 1
                except Exception as e:
                    print(f"  Warning: Failed to delete {file_path}: {e}")
        
        return deleted_count
    except Exception as e:
        print(f"  Warning: Failed to list files in {path}: {e}")
        return 0


async def generate_content(session: AsyncSession, members: List['Member'], config: Dict[str, Any], storage_service: Any = None):
    """Generate content test data (notices, press releases, banners, FAQs).
    
    Raises:
        RuntimeError: If storage_service is not available or PIL is not installed
    """
    from src.common.modules.db.models import Notice, PressRelease, Banner, FAQ
    
    # Check prerequisites - fail fast if not available
    if not storage_service:
        raise RuntimeError(
            "Storage service is not available. Cannot generate banners and news images.\n"
            "Please check your Supabase configuration in .env.local"
        )
    
    if not HAS_PIL:
        raise RuntimeError(
            "PIL/Pillow is not installed. Cannot generate images.\n"
            "Please install with: pip install pillow"
        )
    
    approved_members = [m for m in members if m.approval_status == "approved"]
    if not approved_members:
        return
    
    admin_member = approved_members[0]
    data_defs = config["data_definitions"]
    data_ranges = config["data_ranges"]["content"]
    probs = config["probabilities"]
    
    # Clear old images from Supabase Storage before generating new ones
    print("  Clearing old banner images from Supabase Storage...")
    deleted_banners = await clear_storage_folder(storage_service, "banners")
    print(f"  Deleted {deleted_banners} old banner images")
    
    print("  Clearing old news images from Supabase Storage...")
    deleted_news = await clear_storage_folder(storage_service, "news")
    print(f"  Deleted {deleted_news} old news images")
    
    # Mapping from banner_type to banner config names
    banner_type_to_config = {
        "MAIN": ["main_primary", "main_secondary"],
        "INTRO": ["about"],
        "PROGRAM": ["projects"],
        "PERFORMANCE": ["performance"],
        "PROGRAM": ["projects"],
        "PERFORMANCE": ["performance"],
        "SUPPORT": ["support"],
        "PROFILE": ["profile"],
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
        # Generate news title
        news_title = fake.sentence(nb_words=4)
        
        # Generate news image (gradient color block) and upload to Supabase Storage
        try:
            image_data = create_news_image()
            news_filename = f"news_{uuid4().hex[:8]}.jpg"
            
            image_url = await upload_image_to_supabase(
                image_data,
                news_filename,
                storage_service,
                "image/jpeg",
                "news"
            )
            print(f"  Uploaded news image: {news_filename}")
        except Exception as e:
            raise RuntimeError(f"Failed to upload news image to Supabase: {e}")
        
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
                print(f"  Uploaded banner: {banner_type} -> {banner_filename}")
            except Exception as e:
                raise RuntimeError(f"Failed to upload banner to Supabase: {e}")
            
            # Get multilingual text from config
            banner_config = BANNER_CONFIGS.get(banner_config_name, {})
            
            banner = Banner(
                id=uuid4(),
                banner_type=banner_config_name,
                image_url=image_url,
                link_url=f"https://example.com/{banner_type.lower()}" if random.random() > probs["banner_link_url_null"] else None,
                title_ko=banner_config.get('title_ko', ''),
                title_zh=banner_config.get('title_zh', ''),
                subtitle_ko=banner_config.get('subtitle_ko', ''),
                subtitle_zh=banner_config.get('subtitle_zh', ''),
                is_active="true",  # 所有 banner 默认激活
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


async def generate_system_info(session: AsyncSession, members: List['Member']):
    """Generate system info test data."""
    from src.common.modules.db.models import SystemInfo
    
    # Check if system info already exists
    result = await session.execute(select(SystemInfo))
    if result.scalar_one_or_none():
        return

    approved_members = [m for m in members if m.approval_status == "approved"]
    updater = approved_members[0] if approved_members else None

    content_html = """
    <div class="system-info">
        <h2>강원 기업 포털 소개</h2>
        <p>강원 기업 포털은 강원도 내 기업들의 성장과 발전을 지원하기 위한 종합 플랫폼입니다.</p>
        
        <h3>주요 서비스</h3>
        <ul>
            <li><strong>기업 지원 사업:</strong> 다양한 지원 사업 정보를 제공하고 온라인 신청을 지원합니다.</li>
            <li><strong>성과 관리:</strong> 기업의 성과를 체계적으로 관리하고 분석할 수 있습니다.</li>
            <li><strong>기업 프로필:</strong> 기업 정보를 등록하고 홍보할 수 있습니다.</li>
        </ul>
        
        <h3>문의처</h3>
        <p>전화: 033-000-0000<br>이메일: support@gangwon.kr</p>
    </div>
    """

    system_info = SystemInfo(
        id=uuid4(),
        content_html=content_html,
        image_url=None,
        updated_by=updater.id if updater else None,
        updated_at=datetime.now(timezone.utc)
    )
    session.add(system_info)
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
    
    Raises:
        RuntimeError: If storage service or PIL is not available
    """
    # Check prerequisites FIRST before any data generation
    print("Checking prerequisites...")
    
    if not HAS_PIL:
        raise RuntimeError(
            "PIL/Pillow is not installed. Cannot generate images.\n"
            "Please install with: pip install pillow"
        )
    print("  ✓ PIL/Pillow is available")
    
    # Initialize storage service
    storage_service = None
    try:
        from src.common.modules.storage import storage_service as storage_svc
        storage_service = storage_svc
        # Test connection by trying to access the client
        _ = storage_service.client
        print("  ✓ Supabase Storage service is available")
    except Exception as e:
        raise RuntimeError(
            f"Storage service is not available: {e}\n"
            "Cannot generate banners and news images.\n"
            "Please check your Supabase configuration in .env.local"
        )
    
    counts = config["generation_counts"]
    members_count = members_count or counts["members"]
    admins_count = admins_count or counts.get("admins", 5)
    performance_count = performance_count or counts["performance_records"]
    projects_count = projects_count or counts["projects"]
    applications_count = applications_count or counts["project_applications"]
    attachments_count = attachments_count or counts["attachments"]
    audit_logs_count = audit_logs_count or counts["audit_logs"]
    
    print("\nGenerating system info...")
    await generate_system_info(session, [])
    print("Generated system info")

    print("\nGenerating admins...")
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

    print("\nGenerating system info...")
    await generate_system_info(session, members)
    print("Generated system info")

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

