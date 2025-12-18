"""
Project router.

API endpoints for project and application management.
"""
from fastapi import APIRouter, Depends, status, Query, Response
from uuid import UUID
from typing import Annotated, Optional
from math import ceil
from datetime import datetime

from fastapi import Request

from ...common.modules.db.models import Member
from ...common.modules.audit import audit_log
from ...common.modules.logger import auto_log
from ..user.dependencies import get_current_active_user_compat as get_current_active_user, get_current_admin_user
from .service import ProjectService
from .schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListItem,
    ProjectListQuery,
    ProjectListResponsePaginated,
    ProjectApplicationCreate,
    ProjectApplicationResponse,
    ProjectApplicationListItem,
    ApplicationListQuery,
    ApplicationListResponsePaginated,
    ApplicationStatusUpdate,
)


router = APIRouter()
service = ProjectService()


# Public/Member endpoints


@router.get(
    "/api/projects",
    response_model=ProjectListResponsePaginated,
    tags=["projects"],
    summary="List all projects",
)
@auto_log("list_projects", log_result_count=True)
async def list_projects(
    query: Annotated[ProjectListQuery, Depends()],
    request: Request,
):
    """
    List all projects with pagination and filtering (public access).

    - **status**: Filter by status (active, inactive, archived)
    - **search**: Search in title and description
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    projects, total = await service.list_projects(query)

    return ProjectListResponsePaginated(
        items=[ProjectListItem.model_validate(p) for p in projects],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


@router.get(
    "/api/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["projects"],
    summary="Get project details",
)
@auto_log("get_project", log_resource_id=True)
async def get_project(
    project_id: UUID,
    request: Request,
):
    """
    Get detailed information about a specific project (public access).
    """
    project = await service.get_project_by_id(project_id)
    return ProjectResponse.model_validate(project)


@router.post(
    "/api/projects/{project_id}/apply",
    response_model=ProjectApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["projects"],
    summary="Apply to project",
)
@auto_log("apply_to_project", log_resource_id=True)
@audit_log(action="apply", resource_type="project_application")
async def apply_to_project(
    project_id: UUID,
    data: ProjectApplicationCreate,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Apply to a project (member only).

    Requires authentication. Member must not have already applied to this project.
    """
    application = await service.apply_to_project(
        current_user.id, project_id, data
    )
    return ProjectApplicationResponse.model_validate(application)


@router.get(
    "/api/my-applications",
    response_model=ApplicationListResponsePaginated,
    tags=["projects"],
    summary="Get my project applications",
)
@auto_log("get_my_applications", log_result_count=True)
async def get_my_applications(
    query: Annotated[ApplicationListQuery, Depends()],
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Get member's own project applications with pagination (member only).

    - **status**: Filter by status (submitted, under_review, approved, rejected)
    - **page**: Page number
    - **page_size**: Items per page
    """
    applications, total = await service.get_my_applications(
        current_user.id, query
    )

    return ApplicationListResponsePaginated(
        items=[ProjectApplicationListItem.model_validate(a) for a in applications],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


# Admin endpoints


@router.get(
    "/api/admin/projects",
    response_model=ProjectListResponsePaginated,
    tags=["admin-projects"],
    summary="List all projects (Admin)",
)
@auto_log("list_projects_admin", log_result_count=True)
async def list_projects_admin(
    query: Annotated[ProjectListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    List all projects with pagination and filtering (admin only).
    
    Admin can see all projects including drafts and inactive ones.
    
    - **status**: Filter by status (active, inactive, archived)
    - **search**: Search in title and description
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    projects, total = await service.list_projects_admin(query)

    return ProjectListResponsePaginated(
        items=[ProjectListItem.model_validate(p) for p in projects],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


@router.get(
    "/api/admin/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["admin-projects"],
    summary="Get project details (Admin)",
)
@auto_log("get_project_admin", log_resource_id=True)
async def get_project_admin(
    project_id: UUID,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Get detailed information about a specific project (admin only).
    Admin can see all project details including drafts and inactive ones.
    """
    project = await service.get_project_by_id(project_id)
    return ProjectResponse.model_validate(project)


@router.post(
    "/api/admin/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["admin-projects"],
    summary="Create project (Admin)",
)
@auto_log("create_project", log_resource_id=True)
@audit_log(action="create", resource_type="project")
async def create_project(
    data: ProjectCreate,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Create a new project (admin only).
    """
    project = await service.create_project(data)
    return ProjectResponse.model_validate(project)


@router.put(
    "/api/admin/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["admin-projects"],
    summary="Update project (Admin)",
)
@auto_log("update_project", log_resource_id=True)
@audit_log(action="update", resource_type="project")
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Update project details (admin only).
    """
    project = await service.update_project(project_id, data)
    return ProjectResponse.model_validate(project)


@router.delete(
    "/api/admin/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["admin-projects"],
    summary="Delete project (Admin)",
)
@auto_log("delete_project", log_resource_id=True)
@audit_log(action="delete", resource_type="project")
async def delete_project(
    project_id: UUID,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Delete a project (admin only).

    WARNING: This will cascade delete all applications related to this project.
    """
    await service.delete_project(project_id)


@router.get(
    "/api/admin/projects/applications",
    response_model=ApplicationListResponsePaginated,
    tags=["admin-projects"],
    summary="List all applications (Admin)",
)
@auto_log("list_all_applications", log_result_count=True)
async def list_all_applications(
    query: Annotated[ApplicationListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    project_id: Optional[UUID] = Query(None, description="Filter by project ID"),
):
    """
    List all applications across all projects (admin only).

    - **project_id**: Filter by specific project ID (optional)
    - **status**: Filter by application status
    - **page**: Page number
    - **page_size**: Items per page
    """
    applications, total = await service.list_all_applications(query, project_id)

    return ApplicationListResponsePaginated(
        items=[ProjectApplicationListItem.model_validate(a) for a in applications],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


@router.get(
    "/api/admin/projects/{project_id}/applications",
    response_model=ApplicationListResponsePaginated,
    tags=["admin-projects"],
    summary="List project applications (Admin)",
)
@auto_log("list_project_applications", log_result_count=True)
async def list_project_applications(
    project_id: UUID,
    query: Annotated[ApplicationListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    List all applications for a specific project (admin only).

    - **status**: Filter by application status
    - **page**: Page number
    - **page_size**: Items per page
    """
    applications, total = await service.list_project_applications(
        project_id, query
    )

    return ApplicationListResponsePaginated(
        items=[ProjectApplicationListItem.model_validate(a) for a in applications],
        total=total,
        page=1,
        page_size=total if total > 0 else 1,
        total_pages=1,
    )


@router.put(
    "/api/admin/applications/{application_id}/status",
    response_model=ProjectApplicationResponse,
    tags=["admin-projects"],
    summary="Update application status (Admin)",
)
@auto_log("update_application_status", log_resource_id=True)
@audit_log(action="update_status", resource_type="project_application")
async def update_application_status(
    application_id: UUID,
    data: ApplicationStatusUpdate,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Update application status (admin only).

    Change application status to: submitted, under_review, approved, or rejected.
    """
    application = await service.update_application_status(
        application_id, data.status
    )
    return ProjectApplicationResponse.model_validate(application)


@router.get(
    "/api/admin/projects/export",
    tags=["admin-projects"],
    summary="Export projects data (Admin)",
)
@auto_log("export_projects", log_result_count=True)
@audit_log(action="export", resource_type="project")
async def export_projects(
    query: Annotated[ProjectListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
):
    """
    Export projects data to Excel or CSV (admin only).

    Supports the same filtering options as the list endpoint.
    """
    from ...common.modules.export import ExportService
    
    # Get export data
    export_data = await service.export_projects_data(query)
    
    # Generate export file
    if format == "excel":
        excel_bytes = ExportService.export_to_excel(
            data=export_data,
            sheet_name="Projects",
            title=f"Projects Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="projects_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
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
                "Content-Disposition": f'attachment; filename="projects_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            },
        )


@router.get(
    "/api/admin/applications/export",
    tags=["admin-projects"],
    summary="Export project applications data (Admin)",
)
@auto_log("export_applications", log_result_count=True)
@audit_log(action="export", resource_type="project_application")
async def export_applications(
    query: Annotated[ApplicationListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
    project_id: Optional[UUID] = Query(None, description="Filter by project ID"),
):
    """
    Export project applications data to Excel or CSV (admin only).

    Supports filtering by project ID and application status.
    """
    from ...common.modules.export import ExportService
    
    # Get export data
    export_data = await service.export_applications_data(project_id, query)
    
    # Generate export file
    if format == "excel":
        excel_bytes = ExportService.export_to_excel(
            data=export_data,
            sheet_name="Applications",
            title=f"Project Applications Export - {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        )
        return Response(
            content=excel_bytes,
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={
                "Content-Disposition": f'attachment; filename="applications_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.xlsx"'
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
                "Content-Disposition": f'attachment; filename="applications_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            },
        )
