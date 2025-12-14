"""
Member router.

API endpoints for member management.
"""
from fastapi import APIRouter, Depends, HTTPException, status, Query, Response
from typing import Optional
from math import ceil
from datetime import datetime, date
from uuid import UUID

from fastapi import Request

from ...common.modules.db.models import Member  # 保留用于类型提示
from ...common.modules.audit import audit_log
from ...common.modules.logger import auto_log
from ...common.modules.integrations.nice_dnb import nice_dnb_client
from .schemas import (
    MemberProfileResponse,
    MemberProfileUpdate,
    MemberListResponse,
    MemberListQuery,
    MemberListResponsePaginated,
    CompanyVerifyRequest,
    CompanyVerifyResponse,
)
from .service import MemberService
from ..user.dependencies import get_current_active_user, get_current_admin_user

router = APIRouter()
member_service = MemberService()


# Member self-service endpoints
@router.get("/api/member/profile", response_model=MemberProfileResponse)
@auto_log("get_my_profile")
async def get_my_profile(
    request: Request,
    current_user: dict = Depends(get_current_active_user),
):
    """Get current member's profile."""
    return await member_service.get_member_profile_response(UUID(current_user["id"]))


@router.put("/api/member/profile", response_model=MemberProfileResponse)
@auto_log("update_my_profile", log_resource_id=True)
@audit_log(action="update", resource_type="member")
async def update_my_profile(
    data: MemberProfileUpdate,
    request: Request,
    current_user: dict = Depends(get_current_active_user),
):
    """Update current member's profile."""
    return await member_service.update_member_profile_response(
        UUID(current_user["id"]), data
    )


# Admin endpoints
@router.get("/api/admin/members", response_model=MemberListResponsePaginated)
@auto_log("list_members", log_result_count=True)
async def list_members(
    request: Request,
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin_user),
):
    """List members with pagination and filtering (admin only)."""
    query = MemberListQuery(
        page=page,
        page_size=page_size,
        search=search,
        industry=industry,
        region=region,
        approval_status=approval_status,
        status=status,
    )

    members, total = await member_service.list_members(query)

    return MemberListResponsePaginated(
        items=[
            MemberListResponse(
                id=UUID(m["id"]),
                business_number=m["business_number"],
                company_name=m["company_name"],
                email=m["email"],
                status=m["status"],
                approval_status=m["approval_status"],
                industry=m.get("profile", {}).get("industry") if m.get("profile") else None,
                created_at=m.get("created_at"),
            )
            for m in members
        ],
        total=total,
        page=page,
        page_size=page_size,
        total_pages=ceil(total / page_size) if total > 0 else 0,
    )




@router.get("/api/admin/members/{member_id:uuid}", response_model=MemberProfileResponse)
@auto_log("get_member", log_resource_id=True)
async def get_member(
    member_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_admin_user),
):
    """Get member details (admin only)."""
    return await member_service.get_member_profile_response(member_id)


@router.put("/api/admin/members/{member_id:uuid}/approve", response_model=dict)
@auto_log("approve_member", log_resource_id=True)
@audit_log(action="approve", resource_type="member")
async def approve_member(
    member_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_admin_user),
):
    """Approve a member registration (admin only)."""
    member = await member_service.approve_member(member_id)
    
    return {
        "message": "Member approved successfully",
        "member_id": str(member["id"]),
    }


@router.put("/api/admin/members/{member_id:uuid}/reject", response_model=dict)
@auto_log("reject_member", log_resource_id=True)
@audit_log(action="reject", resource_type="member")
async def reject_member(
    member_id: UUID,
    request: Request,
    reason: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin_user),
):
    """Reject a member registration (admin only)."""
    member = await member_service.reject_member(member_id, reason)
    
    return {
        "message": "Member rejected",
        "member_id": str(member["id"]),
    }


@router.post(
    "/api/members/verify-company",
    response_model=CompanyVerifyResponse,
    status_code=status.HTTP_200_OK,
    summary="Verify Company Information",
    description="""
    Verify company information using Nice D&B API.
    
    This endpoint is used during registration to verify that the business
    registration number and company name match official records from the
    Nice D&B (나이스디앤비) database.
    
    **Features:**
    - Verifies business registration number (사업자등록번호)
    - Optionally verifies company name matches official records
    - Returns company information if verification succeeds
    - Non-blocking: Registration can proceed even if API is unavailable
    
    **Usage:**
    - During member registration to validate business information
    - Can be called before or during registration process
    - Does not require authentication (public endpoint)
    
    **Response:**
    - `verified: true` - Company found and verified
    - `verified: false` - Company not found or verification failed
    - `data` - Additional company information (if available)
    """,
    responses={
        200: {
            "description": "Verification completed (success or failure)",
            "content": {
                "application/json": {
                    "example": {
                        "verified": True,
                        "business_number": "123-45-67890",
                        "company_name": "Example Corp",
                        "message": "Company verified successfully",
                        "data": {
                            "representative": "홍길동",
                            "address": "강원특별자치도 춘천시 중앙로 1",
                            "industry": "제조업",
                            "establishedDate": "2018-05-10",
                            "creditGrade": "A+",
                            "riskLevel": "low"
                        }
                    }
                }
            }
        },
        503: {
            "description": "Nice D&B API service unavailable",
            "content": {
                "application/json": {
                    "example": {
                        "verified": False,
                        "business_number": "123-45-67890",
                        "company_name": None,
                        "message": "Company verification service is temporarily unavailable. You can still proceed with registration.",
                        "data": None
                    }
                }
            }
        }
    },
    tags=["Member", "Nice D&B"],
)
@auto_log("verify_company")
@audit_log(action="verify_company", resource_type="member")
async def verify_company(
    data: CompanyVerifyRequest,
    request: Request,
):
    """
    Verify company information using Nice D&B API.
    
    This endpoint is used during registration to verify that the business
    registration number and company name match official records.
    
    Args:
        data: Company verification request (business_number, optional company_name)
        request: FastAPI Request object (for audit logging)
    
    Returns:
        Company verification result with verification status and company data
    """
    
    try:
        # Call Nice D&B API to verify company
        if data.company_name:
            # Verify with company name
            verified = await nice_dnb_client.verify_company(
                data.business_number, data.company_name
            )
        else:
            # Just check if business number exists
            response = await nice_dnb_client.search_company(data.business_number)
            verified = response is not None and response.success
        
        if verified:
            # Get full company data if verification succeeded
            response = await nice_dnb_client.search_company(data.business_number)
            
            if response and response.success:
                return CompanyVerifyResponse(
                    verified=True,
                    business_number=data.business_number,
                    company_name=response.data.company_name,
                    message="Company verified successfully",
                    data={
                        "representative": response.data.representative,
                        "address": response.data.address,
                        "industry": response.data.industry,
                        "establishedDate": (
                            response.data.established_date.isoformat()
                            if response.data.established_date
                            else None
                        ),
                        "creditGrade": response.data.credit_grade,
                        "riskLevel": response.data.risk_level,
                    },
                )
            else:
                return CompanyVerifyResponse(
                    verified=False,
                    business_number=data.business_number,
                    company_name=None,
                    message="Company not found in Nice D&B database",
                    data=None,
                )
        else:
            return CompanyVerifyResponse(
                verified=False,
                business_number=data.business_number,
                company_name=None,
                message="Company verification failed. Please check your business number and company name.",
                data=None,
            )
            
    except Exception:
        # If API is not configured or fails, return a warning but don't block registration
        # This allows registration to proceed even if Nice D&B is unavailable
        return CompanyVerifyResponse(
            verified=False,
            business_number=data.business_number,
            company_name=None,
            message="Company verification service is temporarily unavailable. You can still proceed with registration.",
            data=None,
        )


# TODO: Re-enable after Nice D&B API endpoint is confirmed
# @router.get(
#     "/api/admin/members/nice-dnb",
#     status_code=status.HTTP_200_OK,
#     summary="Search Company Information (Admin)",
#     description="""
#     Search company information from Nice D&B API (admin only).
#     
#     This endpoint allows administrators to query detailed company information
#     from the Nice D&B database, including:
#     - Basic company information (name, address, representative, etc.)
#     - Financial data (revenue, profit, employees by year)
#     - Business insights and metrics
#     - Credit grade and risk assessment
#     
#     **Authentication:**
#     - Requires admin role
#     - Bearer token authentication required
#     
#     **Usage:**
#     - Use during member approval process to verify company details
#     - Research company information for business intelligence
#     - Validate company information before making decisions
#     
#     **Parameters:**
#     - `business_number`: Business registration number (사업자등록번호)
#       - Format: 10 digits (e.g., "1234567890" or "123-45-67890")
#       - Required: Yes
#     """,
#     responses={
#         200: {
#             "description": "Company information retrieved successfully",
#             "content": {
#                 "application/json": {
#                     "example": {
#                         "success": True,
#                         "data": {
#                             "businessNumber": "1234567890",
#                             "companyName": "Example Corp",
#                             "representative": "홍길동",
#                             "address": "강원특별자치도 춘천시 중앙로 1",
#                             "industry": "제조업",
#                             "establishedDate": "2018-05-10",
#                             "creditGrade": "A+",
#                             "riskLevel": "low",
#                             "summary": "Established company with good credit rating"
#                         },
#                         "financials": [
#                             {
#                                 "year": 2024,
#                                 "revenue": 4500000000,
#                                 "profit": 540000000,
#                                 "employees": 220
#                             }
#                         ],
#                         "insights": [
#                             {
#                                 "label": "수출 비중",
#                                 "value": "45%",
#                                 "trend": "up"
#                             }
#                         ]
#                     }
#                 }
#             }
#         },
#         401: {
#             "description": "Unauthorized - Admin authentication required"
#         },
#         403: {
#             "description": "Forbidden - Admin role required"
#         },
#         503: {
#             "description": "Nice D&B API service unavailable",
#             "content": {
#                 "application/json": {
#                     "example": {
#                         "detail": "Nice D&B API is not available. Please check configuration or try again later."
#                     }
#                 }
#             }
#         }
#     },
#     tags=["Admin", "Nice D&B"],
# )
# @auto_log("search_nice_dnb")
# async def search_nice_dnb(
#     request: Request,
#     business_number: str = Query(
#         ...,
#         description="Business registration number (사업자등록번호)",
#         min_length=10,
#         max_length=20,
#         example="123-45-67890"
#     ),
#     current_user: Member = Depends(get_current_admin_user),
#     db: AsyncSession = Depends(get_db),
# ):
#     """
#     Search company information from Nice D&B API (admin only).
#     
#     Args:
#         business_number: Business registration number (사업자등록번호)
#         current_user: Current admin user (from dependency)
#         db: Database session (from dependency)
#     
#     Returns:
#         Nice D&B company information including financials and insights
#     
#     Raises:
#         HTTPException: If API is not configured or request fails
#     """
#     # Check if API is configured
#     if not nice_dnb_client._is_configured():
#         raise HTTPException(
#             status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
#             detail="Nice D&B API is not configured. Please set NICE_DNB_API_KEY and NICE_DNB_API_SECRET_KEY environment variables.",
#         )
#     
#     # Call Nice D&B API
#     response = await nice_dnb_client.search_company(business_number)
#     
#     if not response:
#         # API request failed (network error, authentication error, etc.)
#         raise HTTPException(
#             status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
#             detail="Nice D&B API request failed. Please check the API configuration, network connection, or try again later.",
#         )
#     
#     # Convert response to dict format expected by frontend
#     return {
#             "success": response.success,
#             "data": {
#                 "businessNumber": response.data.business_number,
#                 "companyName": response.data.company_name,
#                 "representative": response.data.representative,
#                 "address": response.data.address,
#                 "industry": response.data.industry,
#                 "establishedDate": (
#                     response.data.established_date.isoformat()
#                     if response.data.established_date
#                     else None
#                 ),
#                 "creditGrade": response.data.credit_grade,
#                 "riskLevel": response.data.risk_level,
#                 "summary": response.data.summary,
#             },
#             "financials": [
#                 {
#                     "year": f.year,
#                     "revenue": f.revenue,
#                     "profit": f.profit,
#                     "employees": f.employees,
#                 }
#                 for f in response.financials
#             ],
#             "insights": [
#                 {
#                     "label": i.label,
#                     "value": i.value,
#                     "trend": i.trend,
#                 }
#                 for i in response.insights
#             ],
#         }


@router.get("/api/admin/members/export")
@auto_log("export_members", log_result_count=True)
@audit_log(action="export", resource_type="member")
async def export_members(
    request: Request,
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin_user),
):
    """
    Export members data to Excel or CSV (admin only).
    
    Supports the same filtering options as the list endpoint.
    """
    from ...common.modules.export import ExportService
    
    query = MemberListQuery(
        page=1,
        page_size=100,
        search=search,
        industry=industry,
        region=region,
        approval_status=approval_status,
        status=status,
    )
    
    # Get export data
    export_data = await member_service.export_members_data(query)
    
    # Generate export file
    if format == "excel":
        excel_bytes = ExportService.export_to_excel(
            data=export_data,
            sheet_name="Members",
            title=f"Members Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="members_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
            },
        )
    else:  # CSV
        csv_content = ExportService.export_to_csv(
            data=export_data,
        )
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="members_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            },
        )

