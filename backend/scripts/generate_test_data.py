#!/usr/bin/env python3
"""
Test data generation script.

Generates test data for the Gangwon Business Portal application.
"""
import asyncio
from datetime import datetime, timedelta
from decimal import Decimal
from typing import List
from uuid import uuid4
import random

from faker import Faker
from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, delete

import sys
from pathlib import Path

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

sys.path.insert(0, str(Path(__file__).parent.parent))

from src.common.modules.db.session import AsyncSessionLocal
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
)

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
fake = Faker("ko_KR")
fake_en = Faker("en_US")


async def create_test_account(session: AsyncSession) -> Member:
    """Create a test account that is approved and active for testing purposes."""
    industries = [
        "IT/소프트웨어", "제조업", "건설업", "유통/물류", "서비스업",
        "금융업", "의료/바이오", "교육", "문화/예술", "농업/수산업"
    ]
    regions = [
        "서울", "부산", "대구", "인천", "광주", "대전", "울산",
        "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    ]
    
    # Use a fixed business number for the test account
    test_business_number = "999-99-99999"
    test_email = "test@example.com"
    
    # Check if test account already exists
    result = await session.execute(
        select(Member).where(Member.business_number == test_business_number)
    )
    existing_member = result.scalar_one_or_none()
    
    if existing_member:
        # Update existing member to be approved and active
        existing_member.status = "active"
        existing_member.approval_status = "approved"
        existing_member.password_hash = pwd_context.hash("password123")
        member = existing_member
        print(f"Updated existing test account: {test_business_number}")
    else:
        # Create new test member
        member = Member(
            id=uuid4(),
            business_number=test_business_number,
            company_name="테스트 회사 (Test Company)",
            email=test_email,
            password_hash=pwd_context.hash("password123"),
            status="active",
            approval_status="approved",
            created_at=datetime.utcnow(),
        )
        session.add(member)
        await session.flush()
        
        # Create profile for test member
        profile = MemberProfile(
            id=uuid4(),
            member_id=member.id,
            industry=random.choice(industries),
            revenue=Decimal(random.randint(10000000, 100000000)),
            employee_count=random.randint(10, 100),
            founding_date=fake.date_between(start_date="-10y", end_date="today"),
            region=random.choice(regions),
            address=fake.address(),
            website="https://test-company.example.com",
            logo_url=None,
        )
        session.add(profile)
        print(f"Created new test account: {test_business_number}")
    
    await session.flush()
    return member


async def create_admin_account(session: AsyncSession) -> Member:
    """Create an admin account for testing purposes."""
    # Admin business number is fixed
    admin_business_number = "000-00-00000"
    admin_email = "admin@example.com"
    
    # Check if admin account already exists
    result = await session.execute(
        select(Member).where(Member.business_number == admin_business_number)
    )
    existing_admin = result.scalar_one_or_none()
    
    if existing_admin:
        # Update existing admin to be active
        existing_admin.status = "active"
        existing_admin.approval_status = "approved"
        existing_admin.password_hash = pwd_context.hash("password123")
        existing_admin.email = admin_email
        admin = existing_admin
        print(f"Updated existing admin account: {admin_business_number}")
    else:
        # Create new admin member
        admin = Member(
            id=uuid4(),
            business_number=admin_business_number,
            company_name="관리자 (Administrator)",
            email=admin_email,
            password_hash=pwd_context.hash("password123"),
            status="active",
            approval_status="approved",
            created_at=datetime.utcnow(),
        )
        session.add(admin)
        await session.flush()
        
        # Create profile for admin
        profile = MemberProfile(
            id=uuid4(),
            member_id=admin.id,
            industry="IT/소프트웨어",
            revenue=Decimal(0),
            employee_count=1,
            founding_date=datetime.utcnow().date(),
            region="서울",
            address="서울시 강남구",
            website=None,
            logo_url=None,
        )
        session.add(profile)
        print(f"Created new admin account: {admin_business_number}")
    
    await session.flush()
    return admin


async def generate_members(session: AsyncSession, count: int = 75) -> List[Member]:
    """Generate member test data."""
    members = []
    statuses = ["pending", "active", "suspended"]
    approval_statuses = ["pending", "approved", "rejected"]
    
    industries = [
        "IT/소프트웨어", "제조업", "건설업", "유통/물류", "서비스업",
        "금융업", "의료/바이오", "교육", "문화/예술", "농업/수산업"
    ]
    regions = [
        "서울", "부산", "대구", "인천", "광주", "대전", "울산",
        "경기", "강원", "충북", "충남", "전북", "전남", "경북", "경남", "제주"
    ]
    
    # First, create admin account
    admin_member = await create_admin_account(session)
    members.append(admin_member)
    print(f"Admin account created: business_number={admin_member.business_number}, password=password123")
    
    # Then, create a test account that is approved and active
    test_member = await create_test_account(session)
    members.append(test_member)
    print(f"Test account created: business_number={test_member.business_number}, password=password123")
    
    # Generate other members
    for i in range(count - 2):  # -2 because we already created admin and test accounts
        business_number = f"{random.randint(1000000000, 9999999999)}"
        # Make sure we don't duplicate the test account business number
        while business_number == "9999999999" or business_number.replace("-", "") == "9999999999":
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
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 365)),
        )
        members.append(member)
        
        profile = MemberProfile(
            id=uuid4(),
            member_id=member.id,
            industry=random.choice(industries) if random.random() > 0.1 else None,
            revenue=Decimal(random.randint(1000000, 1000000000)) if random.random() > 0.2 else None,
            employee_count=random.randint(1, 500) if random.random() > 0.2 else None,
            founding_date=fake.date_between(start_date="-20y", end_date="today") if random.random() > 0.2 else None,
            region=random.choice(regions) if random.random() > 0.1 else None,
            address=fake.address() if random.random() > 0.1 else None,
            website=f"https://{fake.domain_name()}" if random.random() > 0.3 else None,
            logo_url=None,
        )
        session.add(member)
        session.add(profile)
    
    await session.flush()
    return members


async def generate_performance_records(
    session: AsyncSession, members: List[Member], count: int = 350
) -> List[PerformanceRecord]:
    """Generate performance record test data."""
    records = []
    types = ["sales", "support", "ip"]
    statuses = ["draft", "submitted", "approved", "rejected", "revision_requested"]
    current_year = datetime.now().year
    
    for i in range(count):
        member = random.choice(members)
        year = random.randint(current_year - 2, current_year)
        quarter = random.choice([1, 2, 3, 4, None])
        type_ = random.choice(types)
        status = random.choice(statuses)
        
        if type_ == "sales":
            data_json = {
                "revenue": random.randint(1000000, 100000000),
                "employees": random.randint(10, 500),
                "new_contracts": random.randint(0, 50),
            }
        elif type_ == "support":
            data_json = {
                "support_amount": random.randint(500000, 50000000),
                "programs": random.randint(1, 10),
                "beneficiaries": random.randint(5, 200),
            }
        else:  # ip
            data_json = {
                "patents": random.randint(0, 20),
                "trademarks": random.randint(0, 15),
                "copyrights": random.randint(0, 10),
            }
        
        submitted_at = None
        if status in ["submitted", "approved", "rejected", "revision_requested"]:
            submitted_at = datetime.utcnow() - timedelta(days=random.randint(0, 180))
        
        record = PerformanceRecord(
            id=uuid4(),
            member_id=member.id,
            year=year,
            quarter=quarter,
            type=type_,
            status=status,
            data_json=data_json,
            submitted_at=submitted_at,
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 365)),
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
                    comments=fake.text(max_nb_chars=200) if random.random() > 0.3 else None,
                    reviewed_at=submitted_at + timedelta(days=random.randint(1, 30)) if submitted_at else datetime.utcnow(),
                )
                session.add(review)
    
    await session.flush()
    return records


async def generate_projects(session: AsyncSession, count: int = 35) -> List[Project]:
    """Generate project test data."""
    projects = []
    statuses = ["active", "inactive", "archived"]
    
    for i in range(count):
        start_date = fake.date_between(start_date="-1y", end_date="+1y")
        end_date = start_date + timedelta(days=random.randint(30, 365))
        
        project = Project(
            id=uuid4(),
            title=fake.sentence(nb_words=4),
            description=fake.text(max_nb_chars=500),
            target_audience=fake.text(max_nb_chars=200),
            start_date=start_date,
            end_date=end_date,
            image_url=f"https://example.com/images/project_{i+1}.jpg",
            status=random.choice(statuses),
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)),
        )
        projects.append(project)
        session.add(project)
    
    await session.flush()
    return projects


async def generate_project_applications(
    session: AsyncSession, members: List[Member], projects: List[Project], count: int = 150
) -> List[ProjectApplication]:
    """Generate project application test data."""
    applications = []
    statuses = ["submitted", "under_review", "approved", "rejected"]
    
    for i in range(count):
        member = random.choice(members)
        project = random.choice(projects)
        status = random.choice(statuses)
        
        submitted_at = datetime.utcnow() - timedelta(days=random.randint(0, 90))
        reviewed_at = None
        if status in ["approved", "rejected"]:
            reviewed_at = submitted_at + timedelta(days=random.randint(1, 30))
        
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


async def generate_content(session: AsyncSession, members: List[Member]):
    """Generate content test data (notices, press releases, banners, FAQs)."""
    approved_members = [m for m in members if m.approval_status == "approved"]
    if not approved_members:
        return
    
    admin_member = approved_members[0]
    
    for i in range(20):
        notice = Notice(
            id=uuid4(),
            board_type="notice",
            title=fake.sentence(nb_words=5),
            content_html=f"<p>{fake.text(max_nb_chars=1000)}</p>",
            author_id=admin_member.id,
            view_count=random.randint(0, 1000),
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)),
        )
        session.add(notice)
    
    for i in range(15):
        press = PressRelease(
            id=uuid4(),
            title=fake.sentence(nb_words=4),
            image_url=f"https://example.com/images/news_{i+1}.jpg",
            author_id=admin_member.id,
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)),
        )
        session.add(press)
    
    banner_types = ["MAIN", "INTRO", "PROGRAM", "PERFORMANCE", "SUPPORT"]
    for banner_type in banner_types:
        for i in range(2):
            banner = Banner(
                id=uuid4(),
                banner_type=banner_type,
                image_url=f"https://example.com/images/banner_{banner_type.lower()}_{i+1}.jpg",
                link_url=f"https://example.com/{banner_type.lower()}" if random.random() > 0.3 else None,
                is_active="true" if random.random() > 0.2 else "false",
                display_order=i,
                created_at=datetime.utcnow() - timedelta(days=random.randint(0, 90)),
            )
            session.add(banner)
    
    categories = ["회원가입", "성과관리", "프로젝트", "기타"]
    for i in range(25):
        faq = FAQ(
            id=uuid4(),
            category=random.choice(categories),
            question=fake.sentence(nb_words=8),
            answer=fake.text(max_nb_chars=500),
            display_order=i,
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)),
        )
        session.add(faq)
    
    await session.flush()


async def generate_inquiries(session: AsyncSession, members: List[Member], count: int = 30):
    """Generate inquiry test data."""
    statuses = ["pending", "replied", "closed"]
    
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
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 90)),
            replied_at=datetime.utcnow() - timedelta(days=random.randint(0, 30)) if status in ["replied", "closed"] else None,
        )
        session.add(inquiry)
    
    await session.flush()


async def generate_attachments(
    session: AsyncSession,
    performance_records: List[PerformanceRecord],
    projects: List[Project],
    applications: List[ProjectApplication],
    count: int = 100,
):
    """Generate attachment test data."""
    file_types = ["image", "document"]
    mime_types = {
        "image": ["image/jpeg", "image/png", "image/gif"],
        "document": ["application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"],
    }
    
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
            file_size=random.randint(10000, 5000000),
            mime_type=mime_type,
            uploaded_at=datetime.utcnow() - timedelta(days=random.randint(0, 180)),
        )
        session.add(attachment)
    
    await session.flush()


async def generate_audit_logs(session: AsyncSession, members: List[Member], count: int = 1000):
    """Generate audit log test data."""
    actions = ["login", "logout", "create", "update", "delete", "view", "approve", "reject"]
    resource_types = ["member", "performance", "project", "project_application", "notice", "press_release", "faq", "inquiry"]
    user_agents = [
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
    ]
    
    for i in range(count):
        member = random.choice(members) if random.random() > 0.1 else None
        action = random.choice(actions)
        resource_type = random.choice(resource_types) if random.random() > 0.3 else None
        resource_id = uuid4() if resource_type else None
        
        log = AuditLog(
            id=uuid4(),
            user_id=member.id if member else None,
            action=action,
            resource_type=resource_type,
            resource_id=resource_id,
            ip_address=fake.ipv4(),
            user_agent=random.choice(user_agents),
            created_at=datetime.utcnow() - timedelta(days=random.randint(0, 365)),
        )
        session.add(log)
    
    await session.flush()


async def clear_test_data(session: AsyncSession):
    """Clear all test data from database."""
    await session.execute(delete(AuditLog))
    await session.execute(delete(Inquiry))
    await session.execute(delete(FAQ))
    await session.execute(delete(Banner))
    await session.execute(delete(SystemInfo))
    await session.execute(delete(PressRelease))
    await session.execute(delete(Notice))
    await session.execute(delete(Attachment))
    await session.execute(delete(ProjectApplication))
    await session.execute(delete(Project))
    await session.execute(delete(PerformanceReview))
    await session.execute(delete(PerformanceRecord))
    await session.execute(delete(MemberProfile))
    await session.execute(delete(Member))
    await session.commit()
    print("All test data cleared.")


async def generate_all(
    session: AsyncSession,
    members_count: int = 75,
    performance_count: int = 350,
    projects_count: int = 35,
    applications_count: int = 150,
    attachments_count: int = 100,
    audit_logs_count: int = 1000,
):
    """Generate all test data."""
    print("Generating members...")
    members = await generate_members(session, members_count)
    print(f"Generated {len(members)} members")
    print(f"\n{Fore.GREEN if HAS_COLORAMA else ''}=== Test Accounts Info ==={Style.RESET_ALL if HAS_COLORAMA else ''}")
    
    # Admin account info
    admin_member = next((m for m in members if m.business_number == "000-00-00000"), None)
    if admin_member:
        print(f"\n{Fore.CYAN if HAS_COLORAMA else ''}Admin Account:{Style.RESET_ALL if HAS_COLORAMA else ''}")
        print(f"Business Number: {admin_member.business_number}")
        print(f"Email: {admin_member.email}")
        print("Password: password123")
        print(f"Status: {admin_member.status}")
        print(f"Approval Status: {admin_member.approval_status}")
        print(f"{Fore.GREEN if HAS_COLORAMA else ''}Use this account for admin API testing!{Style.RESET_ALL if HAS_COLORAMA else ''}")
    
    # Test member account info
    test_member = next((m for m in members if m.business_number == "999-99-99999"), None)
    if test_member:
        print(f"\n{Fore.CYAN if HAS_COLORAMA else ''}Test Member Account:{Style.RESET_ALL if HAS_COLORAMA else ''}")
        print(f"Business Number: {test_member.business_number}")
        print(f"Email: {test_member.email}")
        print("Password: password123")
        print(f"Status: {test_member.status}")
        print(f"Approval Status: {test_member.approval_status}")
        print(f"{Fore.GREEN if HAS_COLORAMA else ''}You can use this account for API testing!{Style.RESET_ALL if HAS_COLORAMA else ''}\n")
    
    print("Generating performance records...")
    performance_records = await generate_performance_records(session, members, performance_count)
    print(f"Generated {len(performance_records)} performance records")
    
    print("Generating projects...")
    projects = await generate_projects(session, projects_count)
    print(f"Generated {len(projects)} projects")
    
    print("Generating project applications...")
    applications = await generate_project_applications(session, members, projects, applications_count)
    print(f"Generated {len(applications)} project applications")
    
    print("Generating content (notices, press releases, banners, FAQs)...")
    await generate_content(session, members)
    print("Generated content")
    
    print("Generating inquiries...")
    await generate_inquiries(session, members, 30)
    print("Generated inquiries")
    
    print("Generating attachments...")
    await generate_attachments(session, performance_records, projects, applications, attachments_count)
    print("Generated attachments")
    
    print("Generating audit logs...")
    await generate_audit_logs(session, members, audit_logs_count)
    print(f"Generated {audit_logs_count} audit logs")
    
    await session.commit()
    print("\nAll test data generated successfully!")


async def check_existing_data(session: AsyncSession) -> bool:
    """Check if test data already exists in the database."""
    result = await session.execute(select(Member).limit(1))
    return result.scalar_one_or_none() is not None


async def main():
    """Main entry point."""
    # Default values
    members_count = 75
    performance_count = 350
    projects_count = 35
    applications_count = 150
    attachments_count = 100
    audit_logs_count = 1000
    
    # Import engine here for cleanup
    from src.common.modules.db.session import engine
    
    session = None
    try:
        async with AsyncSessionLocal() as session:
            # Check if data exists
            has_existing_data = await check_existing_data(session)
            
            # Default behavior: clear if data exists (atomic operation)
            should_clear = has_existing_data
            if should_clear:
                print("Existing test data detected. Clearing before generating new data...")
                print("Clearing existing test data...")
                await clear_test_data(session)
            
            await generate_all(
                session,
                members_count=members_count,
                performance_count=performance_count,
                projects_count=projects_count,
                applications_count=applications_count,
                attachments_count=attachments_count,
                audit_logs_count=audit_logs_count,
            )
    except Exception as e:
        if session:
            try:
                await session.rollback()
            except Exception:
                pass
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

