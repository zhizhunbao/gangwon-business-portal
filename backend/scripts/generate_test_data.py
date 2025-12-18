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


def weighted_random_choice(distribution: Dict[str, float]) -> str:
    """
    根据权重分布随机选择一个值
    
    Args:
        distribution: 字典，键为选项，值为权重（0-1之间的浮点数）
    
    Returns:
        随机选择的键
    """
    choices = list(distribution.keys())
    weights = list(distribution.values())
    return random.choices(choices, weights=weights, k=1)[0]

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
        await session.flush()
        
        # Check if profile exists, if not create one
        profile_result = await session.execute(
            select(MemberProfile).where(MemberProfile.member_id == member.id)
        )
        existing_profile = profile_result.scalar_one_or_none()
        
        if not existing_profile:
            # Create profile for existing member
            profile = MemberProfile(
                id=uuid4(),
                member_id=member.id,
                industry=random.choice(data_defs["industries"]),
                revenue=Decimal(random.randint(data_ranges["revenue_min"], data_ranges["revenue_max"])),
                employee_count=random.randint(data_ranges["employee_count_min"], data_ranges["employee_count_max"]),
                founding_date=fake.date_between(start_date=f"-{data_ranges['founding_date_years_ago']}y", end_date="today"),
                region=random.choice(data_defs["regions"]),
                address=fake.address(),
                representative="김대표",
                legal_number=f"{random.randint(100, 999)}-{random.randint(10, 99)}-{random.randint(10000, 99999)}",
                phone=f"0{random.randint(2, 9)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}",
                website=test_config["profile"].get("website"),
                logo_url=None,
            )
            session.add(profile)
            print(f"Created profile for existing test account: {test_business_number}")
        else:
            print(f"Profile already exists for test account: {test_business_number}")
        
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
    
    # Track how many fixed test accounts we create (besides the base 'test')
    extra_account_keys = []
    
    # Create second test account for modification tests (if configured)
    if "test_modify" in config["accounts"]:
        test_modify_member = await create_test_account(session, config, "test_modify")
        members.append(test_modify_member)
        test_modify_password = config["accounts"]["test_modify"]["password"]
        print(f"Test modify account created: business_number={test_modify_member.business_number}, password={test_modify_password}")
        extra_account_keys.append("test_modify")
    
    # Optional: create Nice DNB-linked member accounts if configured
    for key in ("nice_1", "nice_2"):
        if key in config["accounts"]:
            nice_member = await create_test_account(session, config, key)
            members.append(nice_member)
            nice_password = config["accounts"][key]["password"]
            print(f"Nice DNB test account created: business_number={nice_member.business_number}, password={nice_password}")
            extra_account_keys.append(key)
    
    # Base 'test' account + all extra fixed accounts
    count_adjustment = 1 + len(extra_account_keys)
    
    # Get status distributions if available
    status_dist = data_defs.get("member_status_distribution", {})
    approval_dist = data_defs.get("approval_status_distribution", {})
    
    # Helper function to select based on distribution
    def select_by_distribution(distribution, default_choices):
        if not distribution:
            return random.choice(default_choices)
        rand = random.random()
        cumulative = 0.0
        for key, prob in distribution.items():
            cumulative += prob
            if rand <= cumulative:
                return key
        return random.choice(default_choices)
    
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
        
        # 使用配置文件中的江原道企业名称，如果没有则使用默认列表
        gangwon_company_names = config.get("gangwon_company_names", [
            "강원테크솔루션주식회사", "춘천바이오주식회사", "원주정밀기계주식회사",
            "강릉수산식품주식회사", "속초관광개발주식회사", "평창친환경농업주식회사"
        ])
        
        company_name = random.choice(gangwon_company_names)
        email = fake.unique.email()
        password_hash = pwd_context.hash("password123")
        
        # Use distribution if available, otherwise random choice
        # Ensure status and approval_status are properly set
        status = select_by_distribution(status_dist, statuses)
        approval_status = select_by_distribution(approval_dist, approval_statuses)
        
        # Ensure logical consistency: if approved, status should be active
        if approval_status == "approved" and status == "pending":
            status = "active"
        # If rejected, status can be pending or suspended
        elif approval_status == "rejected" and status == "active":
            status = random.choice(["pending", "suspended"])
        
        # Determine company size based on distribution
        company_size_rand = random.random()
        company_size_config = None
        if company_size_rand < data_ranges.get("small_company_ratio", 0.4):
            company_size_config = data_ranges.get("small_company", {})
        elif company_size_rand < (data_ranges.get("small_company_ratio", 0.4) + data_ranges.get("medium_company_ratio", 0.45)):
            company_size_config = data_ranges.get("medium_company", {})
        else:
            company_size_config = data_ranges.get("large_company", {})
        
        # Use company size specific ranges if available, otherwise use general ranges
        revenue_min = company_size_config.get("revenue_min", data_ranges["revenue_min"]) if company_size_config else data_ranges["revenue_min"]
        revenue_max = company_size_config.get("revenue_max", data_ranges["revenue_max"]) if company_size_config else data_ranges["revenue_max"]
        employee_min = company_size_config.get("employee_count_min", data_ranges["employee_count_min"]) if company_size_config else data_ranges["employee_count_min"]
        employee_max = company_size_config.get("employee_count_max", data_ranges["employee_count_max"]) if company_size_config else data_ranges["employee_count_max"]
        
        created_days_ago_max = data_ranges.get("created_days_ago_max", 365)
        
        member = Member(
            id=uuid4(),
            business_number=business_number,
            company_name=company_name,
            email=email,
            password_hash=password_hash,
            status=status,
            approval_status=approval_status,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, created_days_ago_max)),
        )
        members.append(member)
        
        # Generate proper Gangwon address using config
        gangwon_regions = data_defs.get("gangwon_regions", ["춘천시", "원주시", "강릉시"])
        gangwon_addresses = config.get("gangwon_addresses", {})
        
        # 所有企业都在江原道
        selected_region = "강원"
        selected_city = random.choice(gangwon_regions)
        address = None
        
        # 使用配置文件中的地址，如果没有则生成
        if random.random() > probs["member_profile_address_null"]:
            if selected_city in gangwon_addresses and gangwon_addresses[selected_city]:
                address = random.choice(gangwon_addresses[selected_city])
            else:
                # 生成江原道格式的地址
                address = f"강원특별자치도 {selected_city} {fake.street_name()} {random.randint(1, 500)}"
        
        # Generate representative name (Korean name)
        # 真实的韩国人名列表
        korean_names = [
            # 男性姓名
            "김민수", "이준호", "박성민", "최동현", "정우진", "강태현", "조현우", "윤상호",
            "임재현", "한동욱", "오세훈", "신민철", "배준영", "송현수", "노태우", "홍길동",
            "김철수", "이영수", "박영호", "최민호", "정성훈", "강민수", "조성민", "윤태영",
            
            # 여성姓名  
            "김민정", "이수진", "박지영", "최은영", "정미경", "강혜진", "조윤아", "윤서연",
            "임소영", "한지민", "오혜원", "신예진", "배수정", "송미나", "노은주", "홍수민",
            "김영희", "이미영", "박선영", "최정아", "정은정", "강미선", "조은희", "윤정숙"
        ]
        
        # Ensure most members have representative (95% instead of 90%)
        representative = random.choice(korean_names) if random.random() > 0.05 else None
        
        # Generate legal number (법인번호) - 13 digits format: XXX-XX-XXXXX
        legal_number = None
        if random.random() > 0.2:  # 80% have legal number
            legal_number = f"{random.randint(100, 999)}-{random.randint(10, 99)}-{random.randint(10000, 99999)}"
        
        # Generate phone number (Korean format)
        phone = None
        if random.random() > 0.15:  # 85% have phone
            phone = f"0{random.randint(2, 9)}-{random.randint(1000, 9999)}-{random.randint(1000, 9999)}"
        
        profile = MemberProfile(
            id=uuid4(),
            member_id=member.id,
            industry=random.choice(industries) if random.random() > probs["member_profile_industry_null"] else None,
            revenue=Decimal(random.randint(revenue_min, revenue_max)) if random.random() > probs["member_profile_revenue_null"] else None,
            employee_count=random.randint(employee_min, employee_max) if random.random() > probs["member_profile_employee_count_null"] else None,
            founding_date=fake.date_between(start_date=f"-{data_ranges['founding_date_years_ago']}y", end_date="today") if random.random() > probs["member_profile_founding_date_null"] else None,
            region=selected_region,
            address=address,
            representative=representative,
            legal_number=legal_number,
            phone=phone,
            website=f"https://www.{company_name.replace('주식회사', '').replace(' ', '-').lower()}.kr" if random.random() > probs["member_profile_website_null"] else None,
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
    
    # Get status distribution if available
    status_dist = data_defs.get("performance_status_distribution", {})
    
    # Helper function to select status based on distribution
    def select_status_by_distribution():
        if not status_dist:
            return random.choice(statuses)
        rand = random.random()
        cumulative = 0.0
        for key, prob in status_dist.items():
            cumulative += prob
            if rand <= cumulative:
                return key
        return random.choice(statuses)
    
    for i in range(count):
        member = random.choice(members)
        year = random.randint(current_year - year_range, current_year)
        quarter = random.choice([1, 2, 3, 4, None])
        type_ = random.choice(types)
        status = select_status_by_distribution()
        
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
        
        # 所有状态都需要有提交时间（不能为空）
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
                    reviewed_at=submitted_at + timedelta(days=random.randint(data_ranges["review_days_min"], data_ranges["review_days_max"])),
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
    status_distribution = data_defs.get("project_status_distribution", {
        "active": 0.6,
        "inactive": 0.3,
        "archived": 0.1
    })
    
    # 项目标题模板
    project_titles = [
        "2024년 중소기업 디지털 전환 지원사업",
        "스타트업 창업 지원 프로그램",
        "제조업 혁신 기술 개발 지원",
        "수출기업 해외진출 지원사업",
        "청년창업 인큐베이팅 프로그램",
        "여성기업 성장 지원사업",
        "사회적 기업 육성 프로그램",
        "IT 기업 기술혁신 지원",
        "농업 스마트팜 구축 지원",
        "친환경 에너지 기업 지원사업",
        "바이오 의료기기 개발 지원",
        "문화콘텐츠 기업 육성",
        "건설업 안전기술 개발 지원",
        "서비스업 디지털화 지원",
        "지역 특화산업 육성사업"
    ]
    
    for i in range(count):
        start_date = fake.date_between(
            start_date=f"-{data_ranges['start_date_days_ago']}d",
            end_date=f"+{data_ranges['start_date_days_ahead']}d"
        )
        end_date = start_date + timedelta(days=random.randint(data_ranges["duration_days_min"], data_ranges["duration_days_max"]))
        
        # 选择项目标题（如果有预定义的，否则生成随机的）
        if i < len(project_titles):
            title = project_titles[i]
        else:
            title = f"{random.choice(['기업', '스타트업', '중소기업'])} {random.choice(['지원', '육성', '개발'])} 프로그램 {i+1}"
        
        # 随机选择一个会员作为受理对象（如果有会员的话）
        target_company_name = None
        target_business_number = None
        
        # 真实的韩国企业名称列表
        real_korean_companies = [
            # 大企业
            "삼성전자주식회사",
            "현대자동차주식회사", 
            "LG전자주식회사",
            "SK하이닉스주식회사",
            "포스코홀딩스주식회사",
            "네이버주식회사",
            "카카오주식회사",
            "쿠팡주식회사",
            "배달의민족주식회사",
            "우아한형제들주식회사",
            # 중견기업
            "한화시스템주식회사",
            "두산중공업주식회사",
            "롯데케미칼주식회사",
            "GS칼텍스주식회사",
            "현대건설주식회사",
            "대우건설주식회사",
            "삼성물산주식회사",
            "현대중공업주식회사",
            "한국전력공사",
            "KT주식회사",
            # 중소기업 (실제 존재하는 형태)
            "테크노밸리주식회사",
            "이노베이션테크주식회사",
            "스마트솔루션주식회사",
            "그린에너지주식회사",
            "바이오메드주식회사",
            "디지털웨이브주식회사",
            "퓨처테크주식회사",
            "글로벌시스템주식회사",
            "어드밴스드머티리얼주식회사",
            "프리미엄소프트주식회사"
        ]
        
        # 30% 의 프로젝트는 특정 기업을 대상으로 함
        if random.random() < 0.3:
            target_company_name = random.choice(real_korean_companies)
            # 실제 사업자등록번호 형식 생성 (XXX-XX-XXXXX)
            target_business_number = f"{random.randint(100, 999)}-{random.randint(10, 99)}-{random.randint(10000, 99999)}"
        
        # 根据项目日期逻辑设置状态
        current_date = datetime.now(timezone.utc).date()
        
        # 根据项目时间线确定状态
        if end_date < current_date:
            # 项目已结束
            if random.random() < 0.8:  # 80%的已结束项目为inactive
                status = "inactive"
            else:  # 20%为archived（归档）
                status = "archived"
        elif start_date > current_date:
            # 项目还未开始，但已发布
            status = "active"  # 可以申请的状态
        else:
            # 项目正在进行中
            status = "active"
        
        project = Project(
            id=uuid4(),
            title=title,
            description=fake.text(max_nb_chars=500),
            target_company_name=target_company_name,
            target_business_number=target_business_number,
            start_date=start_date,
            end_date=end_date,
            image_url=None,
            status=status,
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
        "SUPPORT": ["support"],
        "PROFILE": ["profile"],
    }
    
    # 逼真的韩语公告数据
    notice_data = [
        {
            "title": "2024년 강원도 중소기업 지원사업 신청 안내",
            "content": """
            <h3>2024년 강원도 중소기업 지원사업 신청을 안내드립니다.</h3>
            <p><strong>신청 기간:</strong> 2024년 3월 1일 ~ 4월 30일</p>
            <p><strong>지원 대상:</strong> 강원도 소재 중소기업 (업력 3년 이상)</p>
            <p><strong>지원 내용:</strong></p>
            <ul>
                <li>기술개발 자금 지원: 최대 5,000만원</li>
                <li>마케팅 지원: 최대 2,000만원</li>
                <li>인력 채용 지원: 최대 1,000만원</li>
            </ul>
            <p><strong>신청 방법:</strong> 온라인 신청 (강원도 기업지원포털)</p>
            <p>자세한 내용은 첨부된 공고문을 참조하시기 바랍니다.</p>
            """
        },
        {
            "title": "디지털 전환 지원 프로그램 참가기업 모집",
            "content": """
            <h3>디지털 전환 지원 프로그램 참가기업을 모집합니다.</h3>
            <p><strong>프로그램 개요:</strong> 중소기업의 디지털 전환을 위한 맞춤형 컨설팅 및 기술 지원</p>
            <p><strong>모집 대상:</strong></p>
            <ul>
                <li>제조업, 서비스업 중소기업</li>
                <li>연매출 10억원 이상 100억원 이하</li>
                <li>임직원 10명 이상</li>
            </ul>
            <p><strong>지원 내용:</strong></p>
            <ul>
                <li>디지털 전환 진단 및 컨설팅</li>
                <li>IT 시스템 구축 비용 지원 (최대 70%)</li>
                <li>직원 교육 프로그램 제공</li>
            </ul>
            <p>신청 문의: 033-123-4567</p>
            """
        },
        {
            "title": "2024년 상반기 성과보고서 제출 안내",
            "content": """
            <h3>2024년 상반기 성과보고서 제출을 안내드립니다.</h3>
            <p><strong>제출 기한:</strong> 2024년 7월 31일까지</p>
            <p><strong>제출 대상:</strong> 2023년 지원사업 참여기업</p>
            <p><strong>제출 서류:</strong></p>
            <ol>
                <li>성과보고서 (양식 다운로드)</li>
                <li>재무제표 (손익계산서, 대차대조표)</li>
                <li>고용현황 증명서</li>
                <li>사업실적 증빙자료</li>
            </ol>
            <p><strong>제출 방법:</strong> 온라인 제출 (기업지원포털 > 성과관리)</p>
            <p>미제출 시 향후 지원사업 참여에 제한이 있을 수 있으니 기한 내 제출 바랍니다.</p>
            """
        },
        {
            "title": "강원도 기업 해외진출 지원사업 설명회 개최",
            "content": """
            <h3>강원도 기업 해외진출 지원사업 설명회를 개최합니다.</h3>
            <p><strong>일시:</strong> 2024년 5월 15일 (수) 14:00~17:00</p>
            <p><strong>장소:</strong> 춘천시 중소기업지원센터 대회의실</p>
            <p><strong>대상:</strong> 해외진출을 희망하는 강원도 소재 기업</p>
            <p><strong>프로그램:</strong></p>
            <ul>
                <li>14:00~14:30 등록 및 접수</li>
                <li>14:30~15:30 해외진출 지원사업 소개</li>
                <li>15:30~16:00 성공사례 발표</li>
                <li>16:00~17:00 개별 상담</li>
            </ul>
            <p><strong>신청:</strong> 5월 10일까지 온라인 신청</p>
            <p>참가비는 무료이며, 참가자 전원에게 해외진출 가이드북을 제공합니다.</p>
            """
        },
        {
            "title": "시스템 정기점검 안내 (서비스 일시 중단)",
            "content": """
            <h3>시스템 정기점검으로 인한 서비스 일시 중단을 안내드립니다.</h3>
            <p><strong>점검 일시:</strong> 2024년 6월 1일 (토) 02:00~06:00 (4시간)</p>
            <p><strong>점검 내용:</strong></p>
            <ul>
                <li>서버 하드웨어 점검 및 업그레이드</li>
                <li>데이터베이스 최적화</li>
                <li>보안 패치 적용</li>
                <li>시스템 성능 개선</li>
            </ul>
            <p><strong>영향 범위:</strong> 전체 서비스 (로그인, 신청, 조회 등)</p>
            <p>점검 시간 중에는 모든 서비스 이용이 불가하오니 양해 부탁드립니다.</p>
            <p>점검 완료 후 더욱 안정적인 서비스를 제공하겠습니다.</p>
            """
        }
    ]
    
    for i in range(data_ranges["notices_count"]):
        if i < len(notice_data):
            notice_info = notice_data[i]
            title = notice_info["title"]
            content_html = notice_info["content"]
        else:
            # 추가 공고는 패턴을 반복
            base_idx = i % len(notice_data)
            notice_info = notice_data[base_idx]
            title = f"{notice_info['title']} ({i+1}차)"
            content_html = notice_info["content"]
        
        notice = Notice(
            id=uuid4(),
            board_type="notice",
            title=title,
            content_html=content_html,
            author_id=admin_member.id,
            view_count=random.randint(50, 1500),
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        session.add(notice)
    
    # 逼真的韩语 보도자료 데이터
    press_data = [
        "강원도, 2024년 스타트업 육성 프로그램 성과 발표",
        "춘천시 소재 AI 기업, 글로벌 시장 진출 성공",
        "강원도 중소기업, 친환경 기술 개발로 수출 증대",
        "평창 동계올림픽 레거시 활용한 관광산업 활성화",
        "강릉 커피산업 클러스터, 국내 최대 규모로 확장",
        "원주 의료기기 기업, FDA 승인 획득으로 미국 진출",
        "태백 에너지 기업, 신재생에너지 분야 혁신상 수상",
        "삼척 해양바이오 기업, 국제 바이오 박람회 참가",
        "홍천 농업기술 기업, 스마트팜 솔루션 개발 완료",
        "횡성 축산업체, 프리미엄 한우 브랜드 해외 수출",
        "영월 문화콘텐츠 기업, K-컬처 글로벌 확산 기여",
        "정선 관광기업, 지속가능한 생태관광 모델 구축",
        "철원 농식품 기업, 유기농 제품 유럽 수출 확대",
        "화천 IT 기업, 블록체인 기반 물류 시스템 개발",
        "양구 바이오 기업, 천연 화장품 원료 특허 등록"
    ]
    
    for i in range(data_ranges["press_releases_count"]):
        if i < len(press_data):
            news_title = press_data[i]
        else:
            # 추가 뉴스는 패턴을 반복하며 번호 추가
            base_idx = i % len(press_data)
            news_title = f"{press_data[base_idx]} - 후속 보도"
        
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
                link_url=None,
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
    
    # 真实的FAQ数据
    faq_data = [
        {"category": "회원가입", "question": "회원가입은 어떻게 하나요?", "answer": "홈페이지 상단의 '회원가입' 버튼을 클릭하여 사업자등록번호와 기업 정보를 입력하시면 됩니다. 승인까지 1-2일 소요됩니다."},
        {"category": "회원가입", "question": "사업자등록증이 없어도 가입할 수 있나요?", "answer": "아니요. 기업회원 가입을 위해서는 유효한 사업자등록증이 필요합니다."},
        {"category": "회원가입", "question": "개인사업자도 가입 가능한가요?", "answer": "네, 개인사업자도 사업자등록증이 있으시면 가입 가능합니다."},
        
        {"category": "성과관리", "question": "성과 제출은 언제까지 해야 하나요?", "answer": "분기별 성과는 해당 분기 종료 후 1개월 이내에 제출하셔야 합니다."},
        {"category": "성과관리", "question": "성과 데이터를 수정할 수 있나요?", "answer": "제출 전까지는 수정 가능하며, 제출 후에는 관리자 승인을 받아 수정할 수 있습니다."},
        {"category": "성과관리", "question": "성과 제출 시 필요한 서류는 무엇인가요?", "answer": "매출 증빙서류, 고용 현황 자료, 사업 실적 보고서 등이 필요합니다."},
        
        {"category": "프로젝트", "question": "프로젝트 신청은 어떻게 하나요?", "answer": "프로젝트 목록에서 원하는 프로젝트를 선택하고 '신청하기' 버튼을 클릭하여 신청서를 작성하시면 됩니다."},
        {"category": "프로젝트", "question": "프로젝트 신청 후 결과는 언제 알 수 있나요?", "answer": "신청 후 2주 이내에 심사 결과를 개별 통보해 드립니다."},
        {"category": "프로젝트", "question": "한 번에 여러 프로젝트에 신청할 수 있나요?", "answer": "네, 자격 요건을 만족하는 프로젝트에는 모두 신청 가능합니다."},
        
        {"category": "기업프로필", "question": "기업 정보를 수정하려면 어떻게 해야 하나요?", "answer": "마이페이지 > 기업정보 관리에서 수정할 수 있습니다. 중요 정보 변경 시 관리자 승인이 필요할 수 있습니다."},
        {"category": "기업프로필", "question": "로고 이미지는 어떤 형식으로 업로드해야 하나요?", "answer": "JPG, PNG 형식의 이미지 파일을 업로드하실 수 있으며, 파일 크기는 5MB 이하로 제한됩니다."},
        
        {"category": "문의/지원", "question": "기술적인 문제가 발생했을 때 어디에 문의하나요?", "answer": "고객지원 > 1:1 문의 또는 전화(033-000-0000)로 문의하시면 됩니다."},
        {"category": "문의/지원", "question": "비밀번호를 잊어버렸어요.", "answer": "로그인 페이지의 '비밀번호 찾기'를 이용하시거나 고객지원에 문의하시기 바랍니다."},
        
        {"category": "기타", "question": "서비스 이용료가 있나요?", "answer": "아니요. 모든 서비스는 무료로 제공됩니다."},
        {"category": "기타", "question": "모바일에서도 이용할 수 있나요?", "answer": "네, 모바일 브라우저에서도 이용 가능하며, 향후 모바일 앱도 출시 예정입니다."},
    ]
    
    for i in range(min(data_ranges["faqs_count"], len(faq_data))):
        faq_item = faq_data[i]
        faq = FAQ(
            id=uuid4(),
            category=faq_item["category"],
            question=faq_item["question"],
            answer=faq_item["answer"],
            display_order=i,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
        )
        session.add(faq)
    
    # 如果需要更多FAQ，使用随机生成
    for i in range(len(faq_data), data_ranges["faqs_count"]):
        faq = FAQ(
            id=uuid4(),
            category=random.choice(categories),
            question=f"자주 묻는 질문 {i+1}",
            answer=f"이것은 {i+1}번째 자주 묻는 질문에 대한 답변입니다.",
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
        
        # 真实的询问主题和内容
        inquiry_subjects = [
            "회원가입 승인 문의", "성과 제출 방법 문의", "프로젝트 신청 관련 문의",
            "기업정보 수정 요청", "비밀번호 재설정 요청", "서류 제출 방법 문의",
            "지원사업 자격 요건 문의", "시스템 오류 신고", "첨부파일 업로드 문제",
            "결과 통보 일정 문의", "추가 서류 제출 문의", "사업자등록증 변경 신고"
        ]
        
        inquiry_contents = [
            f"{member.company_name}입니다. 회원가입 신청 후 승인이 지연되고 있어 문의드립니다.",
            f"성과 제출 시 필요한 서류와 제출 방법에 대해 자세히 안내 부탁드립니다.",
            f"현재 진행 중인 프로젝트에 신청하고 싶은데, 자격 요건을 확인해 주세요.",
            f"기업 정보 중 대표자명이 변경되었습니다. 수정 방법을 안내해 주세요.",
            f"비밀번호를 분실하여 로그인할 수 없습니다. 재설정 방법을 알려주세요.",
            f"서류 제출 시 파일 형식과 크기 제한에 대해 문의드립니다.",
            f"저희 회사가 현재 공고된 지원사업 대상에 해당하는지 확인 부탁드립니다.",
            f"시스템 이용 중 오류가 발생했습니다. 확인 부탁드립니다.",
            f"첨부파일 업로드가 되지 않습니다. 해결 방법을 알려주세요.",
            f"프로젝트 신청 결과는 언제쯤 통보되는지 문의드립니다."
        ]
        
        subject = random.choice(inquiry_subjects)
        content = random.choice(inquiry_contents)
        
        admin_replies = [
            "문의해 주신 내용을 확인했습니다. 관련 부서에서 검토 후 답변드리겠습니다.",
            "안내해 주신 정보를 바탕으로 처리해 드렸습니다. 확인 부탁드립니다.",
            "요청하신 사항이 완료되었습니다. 추가 문의사항이 있으시면 언제든 연락 주세요.",
            "관련 서류를 이메일로 발송해 드렸습니다. 확인 후 진행 부탁드립니다.",
            "시스템 오류가 수정되었습니다. 다시 이용해 보시고 문제가 지속되면 연락 주세요."
        ]
        
        inquiry = Inquiry(
            id=uuid4(),
            member_id=member.id,
            subject=subject,
            content=content,
            status=status,
            admin_reply=random.choice(admin_replies) if status in ["replied", "closed"] else None,
            created_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"])),
            replied_at=datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["replied_days_ago_max"])) if status in ["replied", "closed"] else None,
        )
        session.add(inquiry)
    
    await session.flush()


async def generate_messages(
    session: AsyncSession,
    members: List['Member'],
    admins: List['Admin'],
    config: Dict[str, Any],
    count: int = 100,
):
    """Generate message test data."""
    from src.common.modules.db.models import Message
    
    data_ranges = config["data_ranges"]["message"]
    data_defs = config["data_definitions"]
    
    # Message subjects and content templates - use from config if available
    message_subjects = data_defs.get("message_subjects", [
        "회원가입 승인 완료",
        "성과 제출 안내",
        "프로젝트 신청 결과",
        "시스템 점검 안내",
        "새로운 지원 사업 안내",
        "프로필 정보 업데이트 요청",
        "문의사항 답변",
        "중요 공지사항",
        "이벤트 안내",
        "정기 보고서 제출 요청",
    ])
    
    for i in range(count):
        recipient = random.choice(members)
        # Messages can be sent by admins or system (sender_id can be None)
        sender = random.choice(admins) if admins and random.random() > 0.3 else None
        
        is_read = random.random() < data_ranges["is_read_probability"]
        is_important = random.random() < data_ranges["is_important_probability"]
        
        subject = random.choice(message_subjects)
        
        # 根据主题生成相应的消息内容
        content_templates = {
            "회원가입 승인 완료": f"안녕하세요. {recipient.company_name}의 회원가입이 승인되었습니다. 이제 모든 서비스를 이용하실 수 있습니다.",
            "성과 제출 안내": f"{recipient.company_name}님, {datetime.now().year}년 {random.randint(1,4)}분기 성과 제출 기한이 다가왔습니다. 기한 내 제출 부탁드립니다.",
            "프로젝트 신청 결과": f"{recipient.company_name}님이 신청하신 프로젝트의 심사 결과를 안내드립니다.",
            "시스템 점검 안내": "시스템 정기점검으로 인해 서비스가 일시 중단됩니다. 이용에 불편을 드려 죄송합니다.",
            "새로운 지원 사업 안내": f"{recipient.company_name}님께 적합한 새로운 지원 사업이 공고되었습니다. 확인해 보시기 바랍니다.",
            "프로필 정보 업데이트 요청": f"{recipient.company_name}님의 기업 정보 업데이트가 필요합니다. 마이페이지에서 확인 부탁드립니다.",
            "문의사항 답변": f"{recipient.company_name}님이 문의하신 내용에 대한 답변을 드립니다.",
            "중요 공지사항": "중요한 공지사항이 있어 안내드립니다. 공지사항 게시판을 확인해 주세요.",
            "이벤트 안내": f"{recipient.company_name}님을 위한 특별 이벤트가 진행 중입니다.",
            "정기 보고서 제출 요청": f"{recipient.company_name}님, 정기 보고서 제출 기한이 임박했습니다."
        }
        
        content = content_templates.get(subject, f"{recipient.company_name}님께 안내드릴 사항이 있습니다.")
        
        created_at = datetime.now(timezone.utc) - timedelta(days=random.randint(0, data_ranges["created_days_ago_max"]))
        read_at = None
        if is_read:
            days_since_created = (datetime.now(timezone.utc) - created_at).days
            max_read_days = min(data_ranges["read_days_ago_max"], days_since_created)
            if max_read_days > 0:
                read_at = created_at + timedelta(days=random.randint(1, max_read_days))
            else:
                read_at = created_at + timedelta(days=1)
        
        message = Message(
            id=uuid4(),
            sender_id=sender.id if sender else None,
            recipient_id=recipient.id,
            subject=subject,
            content=content,
            is_read="true" if is_read else "false",
            is_important="true" if is_important else "false",
            read_at=read_at,
            created_at=created_at,
        )
        session.add(message)
    
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
            full_name=random.choice(korean_names),
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
        "messages",
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
    print("  [OK] PIL/Pillow is available")
    
    # Initialize storage service
    storage_service = None
    try:
        from src.common.modules.storage import storage_service as storage_svc
        storage_service = storage_svc
        # Test connection by trying to access the client
        _ = storage_service.client
        print("  [OK] Supabase Storage service is available")
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
    
    print("Generating messages...")
    messages_count = config["generation_counts"]["messages"]
    await generate_messages(session, members, admins, config, messages_count)
    print(f"Generated {messages_count} messages")
    
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
        Message,
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
            print(f"\n{Fore.GREEN if HAS_COLORAMA else ''}[SUCCESS] Transaction committed successfully - all data is now in the database{Style.RESET_ALL if HAS_COLORAMA else ''}")
            
    except Exception as e:
        # Rollback the transaction on any error
        if session:
            try:
                await session.rollback()
                print(f"\n{Fore.RED if HAS_COLORAMA else ''}[ERROR] Transaction rolled back due to error{Style.RESET_ALL if HAS_COLORAMA else ''}")
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
    # Fix Windows console encoding for Unicode characters
    import sys
    import io
    if sys.platform == "win32":
        # Set UTF-8 encoding for stdout and stderr
        sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')
        sys.stderr = io.TextIOWrapper(sys.stderr.buffer, encoding='utf-8', errors='replace')
    
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

