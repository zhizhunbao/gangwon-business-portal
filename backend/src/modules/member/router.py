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

from ...common.modules.audit import audit_log

from ...common.modules.integrations.nice_dnb import nice_dnb_client
from .schemas import (
    MemberProfileResponse,
    MemberProfileUpdate,
    MemberListResponse,
    MemberListItem,
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
async def get_my_profile(
    request: Request,
    current_user: dict = Depends(get_current_active_user),
):
    """Get current member's profile."""
    return await member_service.get_member_profile_response(UUID(str(current_user["id"])))


@router.put("/api/member/profile", response_model=MemberProfileResponse)
@audit_log(action="update", resource_type="member")
async def update_my_profile(
    data: MemberProfileUpdate,
    request: Request,
    current_user: dict = Depends(get_current_active_user),
):
    """Update current member's profile."""
    return await member_service.update_member_profile_response(
        UUID(str(current_user["id"])), data
    )


# Admin endpoints
@router.get("/api/admin/members", response_model=MemberListResponsePaginated)
async def list_members(
    request: Request,
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_admin_user),
):
    """
    List members (admin only).
    Data formatting is handled by schemas.
    """
    query = MemberListQuery(
        search=search,
        industry=industry,
        region=region,
        approval_status=approval_status,
        status=status,
    )

    members, total = await member_service.list_members(query)

    # Use schema to format data - no manual conversion needed
    return MemberListResponsePaginated(
        items=[MemberListItem.from_db_dict(m, include_admin_fields=True) for m in members],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


@router.get("/api/admin/members/{member_id:uuid}", response_model=MemberProfileResponse)
async def get_member(
    member_id: UUID,
    request: Request,
    current_user: dict = Depends(get_current_admin_user),
):
    """Get member details (admin only)."""
    return await member_service.get_member_profile_response(member_id)


@router.put("/api/admin/members/{member_id:uuid}/approve", response_model=dict)
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
                            "creditGrade": "A+"
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


@router.get(
    "/api/admin/members/nice-dnb",
    status_code=status.HTTP_200_OK,
    summary="Search Company Information (Admin)",
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
    tags=["Admin", "Nice D&B"],
)
async def search_nice_dnb(
    request: Request,
    business_number: str = Query(
        ...,
        description="Business registration number (사업자등록번호)",
        min_length=10,
        max_length=20,
        example="123-45-67890"
    ),
    current_user: dict = Depends(get_current_admin_user),
):
    """
    Search company information from Nice D&B API (admin only).
    
    This endpoint queries the Nice D&B API and stores the result in the database
    for future reference and audit purposes.
    
    Args:
        business_number: Business registration number (사업자등록번호)
        current_user: Current admin user (from dependency)
    
    Returns:
        Nice D&B company information including financials and insights
    
    Raises:
        HTTPException: If API is not configured or request fails
    """
    # Check if API is configured
    if not nice_dnb_client._is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nice D&B API is not configured. Please set NICE_DNB_API_KEY and NICE_DNB_API_SECRET_KEY environment variables.",
        )
    
    # Clean business number (remove hyphens)
    clean_business_number = business_number.replace("-", "").strip()
    
    # Call Nice D&B API
    response = await nice_dnb_client.search_company(clean_business_number)
    
    if not response:
        # API request failed (network error, authentication error, etc.)
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Nice D&B API request failed. Please check the API configuration, network connection, or try again later.",
        )
    
    # Prepare response data for frontend
    response_data = {
        "success": response.success,
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
            # Additional fields
            "legalNumber": response.data.legal_number,
            "companyNameEn": response.data.company_name_en,
            "phone": response.data.phone,
            "fax": response.data.fax,
            "email": response.data.email,
            "zipCode": response.data.zip_code,
            "companyScale": response.data.company_scale,
            "companyType": response.data.company_type,
            "mainBusiness": response.data.main_business,
            "industryCode": response.data.industry_code,
            "employeeCount": response.data.employee_count,
            "employeeCountDate": response.data.employee_count_date,
            "creditDate": response.data.credit_date,
            "salesAmount": response.data.sales_amount,
            "operatingProfit": response.data.operating_profit,
            "shareholderEquity": response.data.shareholder_equity,
            "debtAmount": response.data.debt_amount,
            "assetAmount": response.data.asset_amount,
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
    }
    
    # Store the result in database (don't fail request if storage fails)
    try:
        await member_service.save_nice_dnb_data(
            business_number=clean_business_number,
            response=response,
            queried_by=current_user.get("id"),
        )
    except Exception as e:
        # Log error but don't fail the request
        from ...common.modules.logger import logger
        logger.error(
            f"Failed to save Nice D&B data to database: {str(e)}",
            extra={
                "business_number": clean_business_number,
                "error_type": type(e).__name__,
            },
            exc_info=True,
        )
        # Continue to return API response even if storage fails
    
    return response_data


@router.get("/api/admin/members/export")
@audit_log(action="export", resource_type="member")
async def export_members(
    request: Request,
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
    search: Optional[str] = Query(None),
    industry: Optional[str] = Query(None),
    region: Optional[str] = Query(None),
    approval_status: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    language: Optional[str] = Query("ko", description="Language for column headers: 'ko' or 'zh'"),
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
    
    # Define column headers based on language
    column_mapping = {
        "ko": {
            "id": "ID",
            "business_number": "사업자번호",
            "company_name": "기업명",
            "email": "이메일",
            "status": "상태",
            "approval_status": "승인상태",
            "industry": "업종",
            "revenue": "매출액",
            "employee_count": "직원수",
            "founding_date": "설립일",
            "region": "지역",
            "address": "주소",
            "website": "웹사이트",
            "logo_url": "로고 URL",
            "created_at": "가입일",
            "updated_at": "수정일",
        },
        "zh": {
            "id": "ID",
            "business_number": "营业执照号",
            "company_name": "企业名称",
            "email": "邮箱",
            "status": "状态",
            "approval_status": "审批状态",
            "industry": "行业",
            "revenue": "营业收入",
            "employee_count": "员工数",
            "founding_date": "成立日期",
            "region": "地区",
            "address": "地址",
            "website": "网站",
            "logo_url": "标志 URL",
            "created_at": "注册时间",
            "updated_at": "更新时间",
        },
    }
    
    # Get headers based on language (default to Korean)
    lang = language if language in column_mapping else "ko"
    header_labels = column_mapping[lang]
    
    # Reorganize data with internationalized column names
    if export_data:
        # Get the keys from the first data row
        data_keys = list(export_data[0].keys())
        # Create header list in the same order as data keys
        header_list = [header_labels.get(key, key) for key in data_keys]
        
        # Reorganize data: map field keys to header labels
        reorganized_data = []
        for row in export_data:
            reorganized_row = {}
            for key in data_keys:
                header_label = header_labels.get(key, key)
                reorganized_row[header_label] = row.get(key, "")
            reorganized_data.append(reorganized_row)
    else:
        header_list = list(header_labels.values())
        reorganized_data = []
    
    # Generate export file
    if format == "excel":
        excel_bytes = ExportService.export_to_excel(
            data=reorganized_data,
            sheet_name="Members",
            headers=header_list if reorganized_data else None,
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
            data=reorganized_data,
            headers=header_list if reorganized_data else None,
        )
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="members_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            },
        )

