"""
Member service.

Business logic for member management operations.
"""
from typing import Optional
from uuid import UUID
from datetime import datetime, date

from ...common.modules.db.models import Member, MemberProfile  # 保留用于类型提示和文档
from ...common.modules.exception import NotFoundError, ValidationError, ConflictError
from ...common.modules.supabase.service import supabase_service
from ...common.modules.integrations.nice_dnb.schemas import NiceDnBResponse
from .schemas import MemberProfileUpdate, MemberListQuery, MemberProfileResponse


class MemberService:
    """Member service class."""

    async def get_member_profile(
        self, member_id: UUID
    ) -> tuple[dict, Optional[dict]]:
        """
        Get member profile with extended information.

        Args:
            member_id: Member UUID

        Returns:
            Tuple of (Member dict, MemberProfile dict)

        Raises:
            NotFoundError: If member not found
        """
        member, profile = await supabase_service.get_member_profile(str(member_id))
        if not member:
            raise NotFoundError("Member")

        return member, profile

    async def get_member_profile_response(
        self, member_id: UUID
    ) -> MemberProfileResponse:
        """
        Get member profile as response object.

        Args:
            member_id: Member UUID

        Returns:
            MemberProfileResponse

        Raises:
            NotFoundError: If member not found
        """
        member, profile = await self.get_member_profile(member_id)
        return MemberProfileResponse(
            id=UUID(str(member["id"])),
            business_number=member["business_number"],
            company_name=member["company_name"],
            email=member["email"],
            status=member["status"],
            approval_status=member["approval_status"],
            industry=profile.get("industry") if profile else None,
            revenue=profile.get("revenue") if profile else None,
            employee_count=profile.get("employee_count") if profile else None,
            founding_date=profile.get("founding_date") if profile and profile.get("founding_date") else None,
            region=profile.get("region") if profile else None,
            address=profile.get("address") if profile else None,
            representative=profile.get("representative") if profile else None,
            legal_number=profile.get("legal_number") if profile else None,
            phone=profile.get("phone") if profile else None,
            website=profile.get("website") if profile else None,
            logo_url=profile.get("logo_url") if profile else None,
            created_at=member.get("created_at"),
            updated_at=profile.get("updated_at") if profile and profile.get("updated_at") else member.get("updated_at"),
        )

    async def update_member_profile_response(
        self, member_id: UUID, data: MemberProfileUpdate
    ) -> MemberProfileResponse:
        """
        Update member profile and return as response object.

        Args:
            member_id: Member UUID
            data: Update data

        Returns:
            MemberProfileResponse

        Raises:
            NotFoundError: If member not found
            ValidationError: If email already in use
        """
        member, profile = await self.update_member_profile(member_id, data)
        return MemberProfileResponse(
            id=UUID(str(member["id"])),
            business_number=member["business_number"],
            company_name=member["company_name"],
            email=member["email"],
            status=member["status"],
            approval_status=member["approval_status"],
            industry=profile.get("industry") if profile else None,
            revenue=profile.get("revenue") if profile else None,
            employee_count=profile.get("employee_count") if profile else None,
            founding_date=profile.get("founding_date") if profile and profile.get("founding_date") else None,
            region=profile.get("region") if profile else None,
            address=profile.get("address") if profile else None,
            representative=profile.get("representative") if profile else None,
            legal_number=profile.get("legal_number") if profile else None,
            phone=profile.get("phone") if profile else None,
            website=profile.get("website") if profile else None,
            logo_url=profile.get("logo_url") if profile else None,
            created_at=member.get("created_at"),
            updated_at=profile.get("updated_at") if profile and profile.get("updated_at") else member.get("updated_at"),
        )

    async def update_member_profile(
        self, member_id: UUID, data: MemberProfileUpdate
    ) -> tuple[dict, Optional[dict]]:
        """
        Update member profile.

        Args:
            member_id: Member UUID
            data: Update data

        Returns:
            Updated (Member dict, MemberProfile dict)

        Raises:
            NotFoundError: If member not found
            ValidationError: If email already in use
        """
        member, profile = await self.get_member_profile(member_id)

        # Prepare member update data
        member_update = {}
        if data.company_name is not None:
            member_update['company_name'] = data.company_name
        if data.email is not None:
            # Check email uniqueness
            is_unique = await supabase_service.check_email_uniqueness(
                data.email, exclude_member_id=str(member_id)
            )
            if not is_unique:
                raise ValidationError("Email already in use")
            member_update['email'] = data.email

        # Update member if needed
        if member_update:
            updated_member = await supabase_service.update_member(
                str(member_id), member_update
            )
            if updated_member:
                member = updated_member

        # Prepare profile update data
        profile_update = {}
        if data.industry is not None:
            profile_update['industry'] = data.industry
        if data.revenue is not None:
            profile_update['revenue'] = data.revenue
        if data.employee_count is not None:
            profile_update['employee_count'] = data.employee_count
        if data.founding_date is not None:
            # Convert date to ISO format string if it's a date object
            if isinstance(data.founding_date, datetime):
                profile_update['founding_date'] = data.founding_date.date().isoformat()
            elif hasattr(data.founding_date, 'isoformat'):
                profile_update['founding_date'] = data.founding_date.isoformat()
            else:
                profile_update['founding_date'] = data.founding_date
        if data.region is not None:
            profile_update['region'] = data.region
        if data.address is not None:
            profile_update['address'] = data.address
        if data.representative_name is not None:
            profile_update['representative'] = data.representative_name
        if data.corporation_number is not None:
            profile_update['legal_number'] = data.corporation_number
        if data.phone is not None:
            profile_update['phone'] = data.phone
        if data.website is not None:
            profile_update['website'] = data.website
        if data.logo_url is not None:
            profile_update['logo_url'] = data.logo_url

        # Update or create profile
        if profile_update:
            updated_profile = await supabase_service.update_member_profile(
                str(member_id), profile_update
            )
            if updated_profile:
                profile = updated_profile

        return member, profile

    async def list_members(
        self, query: MemberListQuery
    ) -> tuple[list[dict], int]:
        """
        List members with pagination and filtering.

        Args:
            query: Query parameters

        Returns:
            Tuple of (members list, total count)
        """
        members, total = await supabase_service.list_members_with_filters(
            order_by="created_at",
            order_desc=True,
        )
        
        return members, total

    async def approve_member(self, member_id: UUID) -> dict:
        """
        Approve a member registration.

        Args:
            member_id: Member UUID

        Returns:
            Updated member dict

        Raises:
            NotFoundError: If member not found
        """
        member = await supabase_service.get_member_by_id(str(member_id))
        if not member:
            raise NotFoundError("Member")

        updated_member = await supabase_service.update_member(
            str(member_id),
            {
                'approval_status': 'approved',
                'status': 'active'
            }
        )
        if not updated_member:
            raise NotFoundError("Member")

        # Send approval notification email
        try:
            from ...common.modules.email import email_service
            await email_service.send_approval_notification_email(
                to_email=updated_member['email'],
                company_name=updated_member['company_name'],
                approval_type="회원가입",
                status="approved",
            )
        except Exception:
            # Ignore errors - don't fail approval if email fails
            pass

        return updated_member

    async def reject_member(
        self, member_id: UUID, reason: Optional[str]
    ) -> dict:
        """
        Reject a member registration.

        Args:
            member_id: Member UUID
            reason: Rejection reason

        Returns:
            Updated member dict

        Raises:
            NotFoundError: If member not found
        """
        member = await supabase_service.get_member_by_id(str(member_id))
        if not member:
            raise NotFoundError("Member")

        updated_member = await supabase_service.update_member(
            str(member_id),
            {
                'approval_status': 'rejected',
                'status': 'suspended'
            }
        )
        if not updated_member:
            raise NotFoundError("Member")

        # Send rejection notification email
        try:
            from ...common.modules.email import email_service
            await email_service.send_approval_notification_email(
                to_email=updated_member['email'],
                company_name=updated_member['company_name'],
                approval_type="회원가입",
                status="rejected",
                comments=reason,
            )
        except Exception:
            # Ignore errors - don't fail rejection if email fails
            pass

        return updated_member

    async def export_members_data(
        self, query: MemberListQuery
    ) -> list[dict]:
        """
        Export members data for download (admin only).

        Args:
            query: Filter parameters

        Returns:
            List of member records as dictionaries
        """
        # Get all members (without pagination or filtering)
        members, _ = await supabase_service.list_members_with_filters(
            order_by="created_at",
            order_desc=True,
        )

        # Convert to dict format for export
        export_data = []
        for member in members:
            profile = member.get('profile')
            export_data.append({
                "id": str(member.get('id')),
                "business_number": member.get('business_number'),
                "company_name": member.get('company_name'),
                "email": member.get('email'),
                "status": member.get('status'),
                "approval_status": member.get('approval_status'),
                "industry": profile.get('industry') if profile else None,
                "revenue": float(profile.get('revenue')) if profile and profile.get('revenue') else None,
                "employee_count": profile.get('employee_count') if profile else None,
                "founding_date": profile.get('founding_date') if profile and profile.get('founding_date') else None,
                "region": profile.get('region') if profile else None,
                "address": profile.get('address') if profile else None,
                "website": profile.get('website') if profile else None,
                "logo_url": profile.get('logo_url') if profile else None,
                "created_at": member.get('created_at') if member.get('created_at') else None,
                "updated_at": member.get('updated_at') if member.get('updated_at') else None,
            })

        return export_data

    async def save_nice_dnb_data(
        self,
        business_number: str,
        response: NiceDnBResponse,
        queried_by: Optional[str] = None,
    ) -> None:
        """
        Save Nice D&B API response to database.
        
        Args:
            business_number: Business registration number (cleaned, without hyphens)
            response: NiceDnBResponse object from API
            queried_by: User ID who made the query (optional)
        
        Raises:
            Exception: If database operation fails
        """
        # Format established_date to YYYYMMDD if available
        estb_date_str = None
        if response.data.established_date:
            estb_date_str = response.data.established_date.strftime("%Y%m%d")
        
        # Get latest financial data (most recent year) for single record storage
        latest_financial = None
        if response.financials:
            latest_financial = max(response.financials, key=lambda f: f.year)
        
        # Prepare raw JSON for full response storage
        raw_json_data = {
            "data": {
                "businessNumber": response.data.business_number,
                "companyName": response.data.company_name,
                "representative": response.data.representative,
                "address": response.data.address,
                "industry": response.data.industry,
                "establishedDate": (
                    response.data.established_date.isoformat()
                    if response.data.established_date
                    else None
                ),
                "creditGrade": response.data.credit_grade,
            },
            "financials": [
                {
                    "year": f.year,
                    "revenue": f.revenue,
                    "profit": f.profit,
                    "employees": f.employees,
                }
                for f in response.financials
            ],
            "queried_at": datetime.now().isoformat(),
            "queried_by": queried_by,
        }
        
        # Prepare data for database
        db_data = {
            "biz_no": business_number,
            "cmp_nm": response.data.company_name,
            "ceo_nm": response.data.representative,
            "ind_nm": response.data.industry,
            "estb_date": estb_date_str,
            "cri_grd": response.data.credit_grade,
            "bzcnd_nm": response.data.main_business,
            "raw_json": raw_json_data,
        }
        
        # Address handling (split if needed)
        if response.data.address:
            addr_parts = response.data.address.split(" ", 1)
            db_data["addr1"] = addr_parts[0] if len(addr_parts) > 0 else response.data.address
            db_data["addr2"] = addr_parts[1] if len(addr_parts) > 1 else None
        
        # Financial data from latest year
        if latest_financial:
            db_data["sales_amt"] = float(latest_financial.revenue)
            db_data["emp_cnt"] = latest_financial.employees
        
        # Check if record exists
        existing = supabase_service.client.table("nice_dnb_company_info")\
            .select("biz_no")\
            .eq("biz_no", business_number)\
            .limit(1)\
            .execute()
        
        if existing.data:
            # Update existing record
            supabase_service.client.table("nice_dnb_company_info")\
                .update(db_data)\
                .eq("biz_no", business_number)\
                .execute()
        else:
            # Insert new record
            supabase_service.client.table("nice_dnb_company_info")\
                .insert(db_data)\
                .execute()

