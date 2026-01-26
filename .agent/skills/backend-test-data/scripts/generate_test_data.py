#!/usr/bin/env python3
"""测试数据生成脚本 - Supabase API"""
from __future__ import annotations
import json, os, random, sys, subprocess
from datetime import datetime, timedelta, timezone
from pathlib import Path
from uuid import uuid4
import bcrypt

try:
    from supabase import create_client, Client
except ImportError:
    print("错误: pip install supabase")
    sys.exit(1)

from dotenv import load_dotenv
backend_dir = Path(__file__).parent.parent.parent
load_dotenv(backend_dir / ".env.local")

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_SERVICE_KEY") or os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("错误: 缺少 SUPABASE_URL 或 SUPABASE_SERVICE_KEY")
    sys.exit(1)

def load_config():
    with open(Path(__file__).parent / "test_data_config.json", 'r', encoding='utf-8') as f:
        return json.load(f)

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def weighted_choice(dist):
    return random.choices(list(dist.keys()), weights=list(dist.values()), k=1)[0]

def rand_dt(days_ago_max: int) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=random.randint(0, days_ago_max))).isoformat()

def rand_date(days_ago=0, days_ahead=0) -> str:
    start = datetime.now(timezone.utc) - timedelta(days=days_ago)
    end = datetime.now(timezone.utc) + timedelta(days=days_ahead)
    return (start + timedelta(days=random.randint(0, max((end-start).days, 1)))).strftime("%Y-%m-%d")

class Generator:
    def __init__(self):
        self.db: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
        self.cfg = load_config()
        self.counts = self.cfg["generation_counts"]
        self.korean = self.cfg["korean_data"]
        self.defs = self.cfg["data_definitions"]
        self.ranges = self.cfg["data_ranges"]
        self.admin_id = None
        self.member_ids = []
        self.project_ids = []
        self.perf_ids = []
        self.msg_ids = []
        self.bucket = "public-files"
        self.prefix = "gangwon-portal"
        self.project_root = backend_dir.parent

    def upload_file(self, local_path: Path, storage_path: str) -> str | None:
        """上传本地文件到 Supabase Storage，返回公开 URL"""
        if not local_path.exists():
            print(f"    文件不存在: {local_path}")
            return None
        try:
            # 先尝试删除已存在的文件
            try:
                self.db.storage.from_(self.bucket).remove([storage_path])
            except:
                pass
            
            with open(local_path, 'rb') as f:
                file_data = f.read()
            
            content_type = "image/png" if local_path.suffix == ".png" else "image/jpeg"
            self.db.storage.from_(self.bucket).upload(
                storage_path,
                file_data,
                {"content-type": content_type}
            )
            return self.db.storage.from_(self.bucket).get_public_url(storage_path)
        except Exception as e:
            print(f"    上传失败: {e}")
            return None

    def clear_storage_folder(self, folder: str):
        """清空 Storage 文件夹"""
        try:
            path = f"{self.prefix}/{folder}"
            files = self.db.storage.from_(self.bucket).list(path)
            if files:
                for f in files:
                    try:
                        self.db.storage.from_(self.bucket).remove([f"{path}/{f['name']}"])
                    except:
                        pass
        except:
            pass

    def generate_local_images(self):
        """调用本地脚本生成图片"""
        scripts_dir = self.project_root / "scripts"
        
        # 生成横幅图片
        banner_script = scripts_dir / "generate_banners.py"
        if banner_script.exists():
            print("  生成横幅图片...")
            subprocess.run([sys.executable, str(banner_script)], cwd=str(scripts_dir), capture_output=True)
        
        # 生成新闻图片
        news_script = scripts_dir / "generate_news_images.py"
        if news_script.exists():
            print("  生成新闻图片...")
            subprocess.run([sys.executable, str(news_script)], cwd=str(scripts_dir), capture_output=True)
        
        # 生成项目图片
        project_script = scripts_dir / "generate_project_images.py"
        if project_script.exists():
            print("  生成项目图片...")
            subprocess.run([sys.executable, str(project_script)], cwd=str(scripts_dir), capture_output=True)

    def clear(self, table: str, pk_column: str = "id") -> int:
        """清空表数据 - 使用 neq 条件批量删除"""
        try:
            # 先查询记录数
            r = self.db.table(table).select(pk_column, count="exact").execute()
            count = r.count or 0
            if count == 0:
                return 0
            
            # 使用 neq 条件删除所有记录（Supabase delete 必须带条件）
            if pk_column == "id":
                # UUID 类型主键
                self.db.table(table).delete().neq("id", "00000000-0000-0000-0000-000000000000").execute()
            else:
                # 字符串类型主键
                self.db.table(table).delete().neq(pk_column, "").execute()
            return count
        except Exception as e:
            print(f"    清空 {table} 失败: {e}")
            return 0

    def clear_all(self):
        # 表名和主键列的映射
        tables = [
            ("project_applications", "id"),
            ("performance_records", "id"),
            ("messages", "id"),
            ("projects", "id"),
            ("members", "id"),
            ("admins", "id"),
            ("notices", "id"),
            ("press_releases", "id"),
            ("banners", "id"),
            ("faqs", "id"),
            ("system_info", "id"),
            ("legal_content", "id"),
            ("app_logs", "id"),
            ("error_logs", "id"),
            ("audit_logs", "id"),
            ("system_logs", "id"),
            ("performance_logs", "id"),
            ("nice_dnb_company_info", "biz_no"),
        ]
        total = 0
        for table, pk in tables:
            count = self.clear(table, pk)
            if count > 0:
                print(f"  - {table}: {count}")
            total += count
        print(f"  共清空: {total} 条")

    def gen_admin(self):
        cfg = self.cfg["accounts"]["admin"]
        self.admin_id = str(uuid4())
        self.db.table("admins").insert({
            "id": self.admin_id, "username": cfg["username"], "email": cfg["email"],
            "password_hash": hash_password(cfg["password"]), "full_name": cfg["full_name"], "is_active": "true"
        }).execute()

    def gen_members(self):
        for key in ["member_1", "member_2"]:
            cfg = self.cfg["accounts"][key]
            mid = str(uuid4())
            p = cfg.get("profile", {})
            self.db.table("members").insert({
                "id": mid, "business_number": cfg["business_number"], "company_name": cfg["company_name"],
                "email": cfg["email"], "password_hash": hash_password(cfg["password"]),
                "status": "active", "approval_status": "approved",
                "industry": p.get("industry"), "revenue": p.get("revenue"), "employee_count": p.get("employee_count"),
                "region": p.get("region"), "address": p.get("address"), "representative": p.get("representative"),
                "phone": p.get("phone"), "website": p.get("website"),
                "contact_person_name": p.get("contact_person_name"),
                "contact_person_department": p.get("contact_person_department"),
                "contact_person_position": p.get("contact_person_position"),
                "main_business": p.get("main_business"),
                "description": p.get("description")
            }).execute()
            self.member_ids.append(mid)

    def gen_projects(self):
        titles = self.korean["project_titles"]
        r = self.ranges["project"]
        uploads_dir = self.project_root / "frontend" / "public" / "uploads" / "projects"
        
        # 获取会员信息用于关联
        m1 = self.cfg["accounts"]["member_1"]
        m2 = self.cfg["accounts"]["member_2"]
        members_info = [
            {"name": m1["company_name"], "biz_no": m1["business_number"]},
            {"name": m2["company_name"], "biz_no": m2["business_number"]},
        ]
        for i in range(self.counts["projects"]):
            pid = str(uuid4())
            start = rand_date(r["start_date_days_ago"], r["start_date_days_ahead"])
            end = (datetime.strptime(start, "%Y-%m-%d") + timedelta(days=random.randint(r["duration_days_min"], r["duration_days_max"]))).strftime("%Y-%m-%d")
            # 随机关联一个企业
            member_info = random.choice(members_info) if random.random() > 0.3 else None
            
            # 尝试上传本地生成的项目图片
            local_path = uploads_dir / f"project_{i}.jpg"
            image_url = None
            if local_path.exists():
                storage_path = f"{self.prefix}/projects/project_{i}.jpg"
                image_url = self.upload_file(local_path, storage_path)
            if not image_url:
                image_url = f"https://picsum.photos/seed/project{i}/800/400"
            
            project = {
                "id": pid, "title": titles[i % len(titles)],
                "description": f"{titles[i % len(titles)]}에 대한 상세 설명입니다. 강원도 소재 중소기업을 대상으로 하는 지원 프로그램입니다.",
                "start_date": start, "end_date": end,
                "image_url": image_url,
                "status": weighted_choice({"active": 0.6, "inactive": 0.3, "archived": 0.1}),
                "created_at": rand_dt(r["created_days_ago_max"])
            }
            if member_info:
                project["target_company_name"] = member_info["name"]
                project["target_business_number"] = member_info["biz_no"]
            self.db.table("projects").insert(project).execute()
            self.project_ids.append(pid)

    def gen_performance(self):
        r = self.ranges["performance"]
        types = self.defs["performance_types"]
        year = datetime.now().year
        for _ in range(self.counts["performance_records"]):
            pid = str(uuid4())
            t = random.choice(types)
            tr = r["sales"]
            
            prev_sales = random.randint(tr["revenue_min"], tr["revenue_max"])
            curr_sales = int(prev_sales * random.uniform(0.9, 1.3))
            prev_export = random.randint(tr["revenue_min"] // 3, tr["revenue_max"] // 3)
            curr_export = int(prev_export * random.uniform(0.85, 1.4))
            prev_emp = random.randint(tr["employees_min"], tr["employees_max"])
            curr_emp = prev_emp + random.randint(-5, 10)
            new_emp_prev = random.randint(0, 15)
            new_emp_curr = random.randint(0, 20)
            
            num_gov_support = random.randint(1, 3)
            gov_support_list = []
            for i in range(num_gov_support):
                gov_support_list.append({
                    "projectName": random.choice(["기술개발지원", "수출지원", "인력양성", "R&D지원", "마케팅지원"]),
                    "startupProjectName": random.choice(["창업지원프로그램", "스타트업육성", "기업성장지원", ""]),
                    "supportOrganization": random.choice(["강원도청", "중소벤처기업부", "산업통상자원부", "강원테크노파크"]),
                    "supportAmount": random.randint(5000, 50000),
                    "startDate": f"{year - random.randint(0, 2)}-{random.randint(1, 12):02d}-01",
                    "endDate": f"{year + random.randint(0, 1)}-{random.randint(1, 12):02d}-28"
                })
            
            num_ip = random.randint(2, 5)
            ip_list = []
            for i in range(num_ip):
                ip_list.append({
                    "name": f"특허{i+1}호" if random.random() > 0.5 else f"상표{i+1}호",
                    "number": f"{random.randint(10, 99)}-{random.randint(1000000, 9999999)}",
                    "type": random.choice(["patent", "trademark", "utility", "design"]),
                    "registrationType": random.choice(["application", "registered"]),
                    "country": random.choice(["korea", "usa", "china", "japan"]),
                    "overseasType": random.choice(["domestic", "pct", "general"]),
                    "registrationDate": f"{year - random.randint(0, 3)}-{random.randint(1, 12):02d}-{random.randint(1, 28):02d}",
                    "publicDisclosure": random.choice([True, False])
                })
            
            data = {
                "salesEmployment": {
                    "sales": {
                        "previousYear": prev_sales,
                        "currentYear": curr_sales,
                        "reportingDate": f"{year}-12-31"
                    },
                    "export": {
                        "previousYear": prev_export,
                        "currentYear": curr_export,
                        "reportingDate": f"{year}-12-31",
                        "hskCode": f"{random.randint(1000000000, 9999999999)}",
                        "exportCountry1": random.choice(["중국", "일본", "미국", "베트남", "독일"]),
                        "exportCountry2": random.choice(["한국", "싱가포르", "태국", "말레이시아", ""])
                    },
                    "employment": {
                        "currentEmployees": {
                            "previousYear": prev_emp,
                            "currentYear": curr_emp
                        },
                        "newEmployees": {
                            "previousYear": new_emp_prev,
                            "currentYear": new_emp_curr
                        },
                        "totalEmployees": {
                            "previousYear": prev_emp + new_emp_prev,
                            "currentYear": curr_emp + new_emp_curr
                        }
                    }
                },
                "governmentSupport": gov_support_list,
                "intellectualProperty": ip_list
            }
            
            self.db.table("performance_records").insert({
                "id": pid, "member_id": random.choice(self.member_ids),
                "year": random.randint(year - r["year_range"], year), "quarter": random.randint(1, 4),
                "type": t, "status": weighted_choice({"approved": 0.5, "submitted": 0.25, "draft": 0.15, "rejected": 0.1}),
                "data_json": data, "submitted_at": rand_dt(r["submitted_days_ago_max"]), "created_at": rand_dt(r["created_days_ago_max"])
            }).execute()
            self.perf_ids.append(pid)

    def gen_applications(self):
        r = self.ranges["application"]
        rejection_reasons = [
            "제출 서류가 불충분합니다. 사업계획서와 재무제표를 다시 확인해 주세요.",
            "신청 자격 요건을 충족하지 않습니다.",
            "사업 내용이 지원 대상과 맞지 않습니다.",
            "예산 계획이 적절하지 않습니다.",
            "기존 지원 사업과 중복됩니다."
        ]
        for _ in range(self.counts["project_applications"]):
            status = weighted_choice({"approved": 0.25, "under_review": 0.2, "submitted": 0.15, "rejected": 0.15, "needs_supplement": 0.15, "cancelled": 0.1})
            app_data = {
                "id": str(uuid4()), 
                "member_id": random.choice(self.member_ids), 
                "project_id": random.choice(self.project_ids),
                "status": status,
                "application_reason": "기업 성장을 위한 지원이 필요합니다.", 
                "submitted_at": rand_dt(r["submitted_days_ago_max"])
            }
            # Set reviewed_at for processed applications
            if status in ["approved", "rejected", "needs_supplement", "cancelled"]:
                app_data["reviewed_at"] = rand_dt(r["submitted_days_ago_max"] // 2)
            # Add review_note (rejection reason) for rejected status
            if status == "rejected":
                app_data["review_note"] = random.choice(rejection_reasons)
            # Add material_request for needs_supplement status
            if status == "needs_supplement":
                app_data["material_request"] = "추가 서류가 필요합니다. 사업자등록증 사본과 재무제표를 제출해 주세요."
            self.db.table("project_applications").insert(app_data).execute()

    def gen_notices(self):
        titles = self.korean["notice_titles"]
        for i in range(self.counts["notices"]):
            self.db.table("notices").insert({
                "id": str(uuid4()), "board_type": "notice", "title": titles[i % len(titles)],
                "content_html": f"<p>{titles[i % len(titles)]}에 대한 상세 내용입니다.</p>",
                "view_count": random.randint(0, 500), "created_at": rand_dt(120)
            }).execute()

    def gen_press(self):
        titles = self.korean["press_release_titles"]
        uploads_dir = self.project_root / "frontend" / "public" / "uploads" / "news"
        
        for i in range(self.counts["press_releases"]):
            # 尝试上传本地生成的新闻图片（图片目录是 0-7）
            local_main = uploads_dir / str(i) / "main.jpg"
            
            image_url = None
            if local_main.exists():
                storage_path = f"{self.prefix}/news/news_{i}_main.jpg"
                image_url = self.upload_file(local_main, storage_path)
            
            if not image_url:
                image_url = f"https://picsum.photos/seed/news{i}/1200/675"
            
            self.db.table("press_releases").insert({
                "id": str(uuid4()), "title": titles[i % len(titles)],
                "image_url": image_url, "created_at": rand_dt(120)
            }).execute()

    def gen_banners(self):
        # 横幅类型：使用前端定义的 banner_type 值
        uploads_dir = self.project_root / "frontend" / "public" / "uploads" / "banners"
        
        data = [
            {"type": "main_primary", "local_file": "main_primary", "title_ko": "강원 기업 포털", "title_zh": "江原企业门户", "subtitle_ko": "기업 성장을 위한 원스톱 지원 플랫폼", "subtitle_zh": "企业成长一站式支援平台"},
            {"type": "main_secondary", "local_file": "main_secondary", "title_ko": "2025년 강원도 창업기업 지원 가이드", "title_zh": "2025年江原道创业企业支援指南", "subtitle_ko": "전방위 지원으로 기업 성장을 돕습니다", "subtitle_zh": "全方位支援助力企业成长"},
            {"type": "about", "local_file": "about", "title_ko": "소개", "title_zh": "简介", "subtitle_ko": "강원 기업 포털에 오신 것을 환영합니다", "subtitle_zh": "欢迎来到江原企业门户"},
            {"type": "projects", "local_file": "projects", "title_ko": "지원 사업", "title_zh": "支援项目", "subtitle_ko": "다양한 기업 지원 프로그램", "subtitle_zh": "多样化企业支援计划"},
            {"type": "performance", "local_file": "performance", "title_ko": "실적 관리", "title_zh": "业绩管理", "subtitle_ko": "기업 실적 현황 및 분석", "subtitle_zh": "企业业绩现状及分析"},
            {"type": "support", "local_file": "support", "title_ko": "지원 센터", "title_zh": "支援中心", "subtitle_ko": "기업 지원 서비스 안내", "subtitle_zh": "企业支援服务指南"},
            {"type": "profile", "local_file": "profile", "title_ko": "기업 프로필", "title_zh": "企业资料", "subtitle_ko": "기업 정보 관리", "subtitle_zh": "企业信息管理"},
        ]
        
        for i, d in enumerate(data):
            # 尝试上传本地生成的横幅图片
            local_path = uploads_dir / f"{d['local_file']}.png"
            
            image_url = None
            if local_path.exists():
                storage_path = f"{self.prefix}/banners/{d['type']}.png"
                image_url = self.upload_file(local_path, storage_path)
            
            if not image_url:
                image_url = f"https://picsum.photos/seed/banner{d['type']}/1920/400"
            
            self.db.table("banners").insert({
                "id": str(uuid4()), "banner_type": d["type"], 
                "image_url": image_url,
                "title_ko": d["title_ko"], "title_zh": d["title_zh"],
                "subtitle_ko": d["subtitle_ko"], "subtitle_zh": d["subtitle_zh"],
                "is_active": "true", "display_order": i
            }).execute()

    def gen_faqs(self):
        items = self.korean["faq_items"]
        for i, item in enumerate(items[:self.counts["faqs"]]):
            self.db.table("faqs").insert({
                "id": str(uuid4()), "category": item["category"], "question": item["question"],
                "answer": item["answer"], "display_order": i
            }).execute()

    def gen_system_info(self):
        # 尝试上传本地生成的系统介绍图片
        uploads_dir = self.project_root / "frontend" / "public" / "uploads" / "banners"
        local_path = uploads_dir / "about.png"
        
        image_url = None
        if local_path.exists():
            storage_path = f"{self.prefix}/system/intro.png"
            image_url = self.upload_file(local_path, storage_path)
        
        if not image_url:
            image_url = "https://picsum.photos/seed/systeminfo/1200/600"
        
        self.db.table("system_info").insert({
            "id": str(uuid4()), 
            "content_html": """<h2>강원 기업 포털 소개</h2>
<p>강원 기업 포털은 강원도 소재 중소기업을 위한 종합 지원 플랫폼입니다.</p>
<h3>주요 서비스</h3>
<ul>
    <li>기업 지원 사업 안내 및 신청</li>
    <li>기업 실적 관리 및 분석</li>
    <li>1:1 상담 서비스</li>
    <li>공지사항 및 보도자료</li>
</ul>
<p>문의사항은 고객센터(033-123-4567)로 연락해 주세요.</p>""",
            "image_url": image_url
        }).execute()

    def gen_messages(self):
        """生成消息数据：1对1咨询(thread) + 系统通知(direct)"""
        
        # 示例附件数据（使用已上传的项目图片）
        sample_attachments = [
            [{
                "file_name": "사업계획서.pdf",
                "file_url": f"{self.prefix}/projects/project_0.jpg",
                "file_size": 245760,
                "mime_type": "application/pdf"
            }],
            [{
                "file_name": "재무제표_2023.xlsx",
                "file_url": f"{self.prefix}/projects/project_1.jpg",
                "file_size": 102400,
                "mime_type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            }],
            [{
                "file_name": "스크린샷.png",
                "file_url": f"{self.prefix}/projects/project_2.jpg",
                "file_size": 156800,
                "mime_type": "image/png"
            }],
        ]
        
        # ========== 1. 生成1对1咨询 (Thread) ==========
        # 会员发起的咨询对话，包含多条来回消息
        thread_subjects = [
            ("사업 신청 관련 문의", "general", [
                ("member", "안녕하세요. 2024년 중소기업 디지털 전환 지원사업에 신청하고 싶은데, 필요한 서류가 무엇인지 알려주실 수 있을까요?", None),
                ("admin", "안녕하세요. 해당 사업 신청에는 사업자등록증, 재무제표, 사업계획서가 필요합니다. 자세한 내용은 공지사항을 참고해 주세요.", None),
                ("member", "감사합니다. 재무제표는 최근 몇 년치가 필요한가요?", sample_attachments[0]),
                ("admin", "최근 2년치 재무제표를 제출해 주시면 됩니다.", None),
            ]),
            ("성과 제출 방법 문의", "performance", [
                ("member", "분기별 성과 제출 시 매출액은 어떤 기준으로 입력해야 하나요?", None),
                ("admin", "매출액은 해당 분기의 세금계산서 발행 기준 금액을 입력해 주시면 됩니다.", None),
            ]),
            ("회원 정보 수정 요청", "general", [
                ("member", "회사 주소가 변경되었는데 어떻게 수정하나요?", None),
                ("admin", "마이페이지 > 기업 프로필에서 직접 수정하실 수 있습니다. 사업자등록증 변경이 필요한 경우 별도 문의 부탁드립니다.", None),
                ("member", "확인했습니다. 감사합니다!", None),
            ]),
            ("지원 프로그램 자격 문의", "general", [
                ("member", "저희 회사가 스타트업 창업 지원 프로그램에 신청 가능한지 확인 부탁드립니다.", sample_attachments[1]),
            ]),
            ("기술 지원 요청", "technical", [
                ("member", "시스템 로그인이 안 됩니다. 비밀번호를 여러 번 입력했는데 계속 실패합니다.", sample_attachments[2]),
                ("admin", "계정을 확인해 보겠습니다. 잠시만 기다려 주세요.", None),
                ("admin", "비밀번호를 초기화했습니다. 등록된 이메일로 재설정 링크를 보내드렸습니다.", None),
                ("member", "해결되었습니다. 감사합니다.", None),
            ]),
        ]
        
        thread_statuses = ["open", "open", "resolved", "open", "closed"]
        
        for i, (subject, category, conversations) in enumerate(thread_subjects):
            member_id = self.member_ids[i % len(self.member_ids)]
            thread_id = str(uuid4())
            base_time = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 30))
            status = thread_statuses[i % len(thread_statuses)]
            
            # 创建 thread 主记录
            self.db.table("messages").insert({
                "id": thread_id,
                "message_type": "thread",
                "sender_id": member_id,
                "sender_type": "member",
                "recipient_id": member_id,
                "subject": subject,
                "content": f"Thread: {subject}",
                "category": category,
                "status": status,
                "is_read": status != "open",
                "is_important": False,
                "is_broadcast": False,
                "created_at": base_time.isoformat(),
                "updated_at": (base_time + timedelta(hours=len(conversations))).isoformat(),
            }).execute()
            
            # 创建 thread 内的消息
            for j, (sender_type, content, attachments) in enumerate(conversations):
                msg_time = base_time + timedelta(hours=j+1, minutes=random.randint(0, 30))
                sender_id = member_id if sender_type == "member" else self.admin_id
                is_read = j < len(conversations) - 1 or status != "open"
                
                self.db.table("messages").insert({
                    "id": str(uuid4()),
                    "message_type": "thread",
                    "thread_id": thread_id,
                    "sender_id": sender_id,
                    "sender_type": sender_type,
                    "recipient_id": member_id,
                    "subject": subject,
                    "content": content,
                    "category": category,
                    "status": "sent",
                    "is_read": is_read,
                    "is_important": False,
                    "is_broadcast": False,
                    "created_at": msg_time.isoformat(),
                }).execute()
            
            self.msg_ids.append(thread_id)
        
        # ========== 2. 生成系统通知 (Direct) ==========
        # 系统发送给会员的通知（审批结果、公告等）
        notification_templates = [
            ("회원가입 승인 완료", "회원가입이 승인되었습니다. 이제 모든 서비스를 이용하실 수 있습니다.", "notice", False),
            ("2024년 4분기 성과 제출 안내", "2024년 4분기 성과 제출 기한이 다가왔습니다. 1월 15일까지 제출해 주세요.", "notice", True),
            ("[실적 관리] 2024년 3분기 실적이 승인되었습니다", "2024년 3분기 실적 데이터가 승인되었습니다.\n\n관리자 의견: 제출해 주신 자료가 정확합니다. 감사합니다.", "performance", False),
            ("[실적 관리] 2024년 2분기 실적이 보완 요청되었습니다", "2024년 2분기 실적 데이터가 보완 요청되었습니다.\n\n관리자 의견: 매출액 증빙 서류를 추가로 제출해 주세요.", "performance", True),
            ("지원사업 신청 결과 안내", "신청하신 '중소기업 디지털 전환 지원사업'이 승인되었습니다. 축하드립니다!", "notice", False),
            ("시스템 정기 점검 안내", "12월 20일 02:00~06:00 시스템 정기 점검이 예정되어 있습니다.", "notice", False),
        ]
        
        for member_id in self.member_ids:
            # 每个会员收到 3-4 条系统通知
            for template in random.sample(notification_templates, random.randint(3, 4)):
                subject, content, category, is_important = template
                self.db.table("messages").insert({
                    "id": str(uuid4()),
                    "message_type": "direct",
                    "sender_id": None,  # 系统消息
                    "sender_type": "system",
                    "recipient_id": member_id,
                    "subject": subject,
                    "content": content,
                    "category": category,
                    "status": "sent",
                    "priority": "high" if is_important else "normal",
                    "is_read": random.choice([True, False]),
                    "is_important": is_important,
                    "is_broadcast": False,
                    "created_at": rand_dt(60),
                }).execute()

    def gen_attachments(self):
        """
        Generate attachments as JSONB data.
        Note: Attachments are now stored in JSONB fields, not in a separate table.
        This method is kept for reference but does nothing.
        """
        # Attachments are now generated inline when creating records
        # (e.g., notices, projects, performance_records, etc.)
        pass

    def gen_legal_content(self):
        """生成法律条款（服务条款、隐私政策、第三方信息提供同意、营销信息接收同意）"""
        legal_data = self.korean.get("legal_content", {})
        content_types = [
            "terms_of_service",
            "privacy_policy", 
            "third_party_sharing",
            "marketing_consent"
        ]
        for content_type in content_types:
            content_html = legal_data.get(content_type, f"<p>{content_type} content</p>")
            self.db.table("legal_content").insert({
                "id": str(uuid4()),
                "content_type": content_type,
                "content_html": content_html,
                "updated_by": self.admin_id
            }).execute()

    def run(self):
        print("测试数据生成...")
        
        print("1. 生成本地图片...")
        self.generate_local_images()
        print("完成")
        
        print("2. 清空数据...")
        self.clear_all()
        
        print("3. 生成管理员...", end=" ")
        self.gen_admin()
        print("完成")
        
        print("4. 生成会员...", end=" ")
        self.gen_members()
        print("完成")
        
        print("5. 生成项目...", end=" ")
        self.gen_projects()
        print("完成")
        
        print("6. 生成成果记录...", end=" ")
        self.gen_performance()
        print("完成")
        
        print("7. 生成项目申请...", end=" ")
        self.gen_applications()
        print("完成")
        
        print("8. 生成公告...", end=" ")
        self.gen_notices()
        print("完成")
        
        print("9. 生成新闻（含图片上传）...", end=" ")
        self.gen_press()
        print("完成")
        
        print("10. 生成横幅（含图片上传）...", end=" ")
        self.gen_banners()
        print("完成")
        
        print("11. 生成FAQ...", end=" ")
        self.gen_faqs()
        print("完成")
        
        print("12. 生成系统信息（含图片上传）...", end=" ")
        self.gen_system_info()
        print("完成")
        
        print("13. 生成消息...", end=" ")
        self.gen_messages()
        print("完成")
        
        print("14. 生成附件...", end=" ")
        self.gen_attachments()
        print("完成")
        
        print("15. 生成法律条款...", end=" ")
        self.gen_legal_content()
        print("完成")
        
        admin = self.cfg["accounts"]["admin"]
        m1 = self.cfg["accounts"]["member_1"]
        m2 = self.cfg["accounts"]["member_2"]
        print(f"\n全部完成!")
        print(f"管理员: {admin['username']} / {admin['password']}")
        print(f"会员1: {m1['business_number']} / {m1['password']}")
        print(f"会员2: {m2['business_number']} / {m2['password']}")

if __name__ == "__main__":
    Generator().run()
