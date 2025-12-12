"""
Email service implementation built on top of SMTP + Jinja templates.
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timezone
from email.message import EmailMessage
from email.utils import formataddr
from pathlib import Path
from typing import Any, Dict

import aiosmtplib
from jinja2 import Environment, FileSystemLoader, TemplateNotFound, select_autoescape

from ..config.settings import settings

TEMPLATE_DIR = Path(__file__).parent / "templates"


@dataclass(slots=True)
class EmailContext:
    """Wrapper to keep track of template context + plain text fallback."""

    html: Dict[str, Any]
    plain_text: str | None = None


class EmailService:
    """Provides high-level helpers for sending transactional emails."""

    def __init__(self) -> None:
        TEMPLATE_DIR.mkdir(parents=True, exist_ok=True)
        self._env = Environment(
            loader=FileSystemLoader(str(TEMPLATE_DIR)),
            autoescape=select_autoescape(["html", "xml"]),
            enable_async=True,
            trim_blocks=True,
            lstrip_blocks=True,
        )
        self._settings = settings

    async def _render_template(self, template_name: str, context: Dict[str, Any]) -> str:
        """Render HTML template, raising a helpful error when missing."""
        try:
            template = self._env.get_template(template_name)
        except TemplateNotFound as exc:
            raise TemplateNotFound(
                f"Email template '{template_name}' not found in {TEMPLATE_DIR}"
            ) from exc

        return await template.render_async(**context)

    def _build_plain_text(self, default_message: str, context: Dict[str, Any]) -> str:
        lines = [default_message, ""]
        for key, value in context.items():
            if isinstance(value, str) and value.strip():
                lines.append(f"{key.replace('_', ' ').title()}: {value}")
        lines.append("")
        lines.append(self._settings.EMAIL_FROM_NAME)
        return "\n".join(lines)

    async def _send_email(
        self,
        *,
        to_email: str,
        subject: str,
        template_name: str,
        context: Dict[str, Any],
        plain_text: str | None = None,
    ) -> bool:
        html_body = await self._render_template(template_name, context)
        text_body = plain_text or self._build_plain_text(subject, context)

        message = EmailMessage()
        message["From"] = formataddr(
            (self._settings.EMAIL_FROM_NAME, self._settings.EMAIL_FROM)
        )
        message["To"] = to_email
        message["Subject"] = subject
        message.set_content(text_body)
        message.add_alternative(html_body, subtype="html")

        # 检查邮件配置是否完整
        if not self._settings.EMAIL_SMTP_USER or not self._settings.EMAIL_SMTP_PASSWORD:
            return False
        
        try:
            smtp = aiosmtplib.SMTP(
                hostname=self._settings.EMAIL_SMTP_HOST,
                port=self._settings.EMAIL_SMTP_PORT,
                use_tls=bool(self._settings.EMAIL_SMTP_USE_TLS),
            )
            await smtp.connect()
            if self._settings.EMAIL_SMTP_USER:
                await smtp.login(
                    self._settings.EMAIL_SMTP_USER,
                    self._settings.EMAIL_SMTP_PASSWORD,
                )
            await smtp.send_message(message)
            await smtp.quit()
            return True
        except aiosmtplib.SMTPAuthenticationError:
            return False
        except aiosmtplib.SMTPConnectError:
            return False
        except Exception:  # pragma: no cover - covered via unit tests
            return False

    async def send_registration_confirmation_email(
        self, *, to_email: str, company_name: str, business_number: str
    ) -> bool:
        dashboard_url = f"{self._settings.FRONTEND_URL.rstrip('/')}/member/login"
        subject = "강원 비즈니스 포털 회원가입 신청이 접수되었습니다"
        context = {
            "title": subject,
            "company_name": company_name,
            "business_number": business_number,
            "dashboard_url": dashboard_url,
            "year": datetime.now(timezone.utc).year,
        }
        plain_text = (
            f"{company_name} 담당자님,\n\n"
            "회원가입 신청이 접수되었습니다. 관리자의 승인 후 별도 안내 메일을 드립니다.\n"
            f"사업자등록번호: {business_number}\n"
            f"대시보드 바로가기: {dashboard_url}\n\n"
            "강원 비즈니스 포털 운영팀"
        )
        return await self._send_email(
            to_email=to_email,
            subject=subject,
            template_name="registration_confirmation.html",
            context=context,
            plain_text=plain_text,
        )

    async def send_approval_notification_email(
        self,
        *,
        to_email: str,
        company_name: str,
        approval_type: str,
        status: str,
        comments: str | None = None,
    ) -> bool:
        normalized_status = status.lower()
        status_label = "승인" if normalized_status == "approved" else "반려"
        subject = f"[{approval_type}] 요청이 {status_label}되었습니다"
        context = {
            "title": subject,
            "company_name": company_name,
            "approval_type": approval_type,
            "status": status_label,
            "comments": comments,
            "year": datetime.now(timezone.utc).year,
        }
        plain_text = (
            f"{company_name} 담당자님,\n\n"
            f"{approval_type} 요청이 {status_label}되었습니다.\n"
        )
        if comments:
            plain_text += f"검토 의견: {comments}\n"
        plain_text += "\n강원 비즈니스 포털 운영팀"

        return await self._send_email(
            to_email=to_email,
            subject=subject,
            template_name="approval_notification.html",
            context=context,
            plain_text=plain_text,
        )

    async def send_revision_request_email(
        self,
        *,
        to_email: str,
        company_name: str,
        record_title: str,
        comments: str | None = None,
    ) -> bool:
        subject = "등록하신 실적에 대한 추가 수정 요청이 있습니다"
        context = {
            "title": subject,
            "company_name": company_name,
            "record_title": record_title,
            "comments": comments,
            "year": datetime.now(timezone.utc).year,
        }
        plain_text = (
            f"{company_name} 담당자님,\n\n"
            f"'{record_title}' 등록 건에 대한 추가 정보가 필요합니다.\n"
        )
        if comments:
            plain_text += f"요청 내용: {comments}\n"
        plain_text += "\n강원 비즈니스 포털 운영팀"

        return await self._send_email(
            to_email=to_email,
            subject=subject,
            template_name="revision_request.html",
            context=context,
            plain_text=plain_text,
        )

    async def send_password_reset_email(
        self, *, to_email: str, reset_token: str, business_number: str
    ) -> bool:
        reset_url = (
            f"{self._settings.FRONTEND_URL.rstrip('/')}/reset-password?"
            f"token={reset_token}&businessNumber={business_number}"
        )
        subject = "비밀번호 재설정 안내"
        context = {
            "title": subject,
            "reset_url": reset_url,
            "business_number": business_number,
            "request_time": datetime.now(timezone.utc).strftime("%Y-%m-%d %H:%M"),
            "year": datetime.now(timezone.utc).year,
        }
        plain_text = (
            "아래 링크를 클릭하여 비밀번호를 재설정하세요.\n"
            f"{reset_url}\n\n"
            "이 링크는 일정 시간 후 만료됩니다."
        )
        return await self._send_email(
            to_email=to_email,
            subject=subject,
            template_name="password_reset.html",
            context=context,
            plain_text=plain_text,
        )


# Shared singleton used across the application
email_service = EmailService()


