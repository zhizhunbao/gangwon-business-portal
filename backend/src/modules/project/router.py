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
async def list_projects(
    query: Annotated[ProjectListQuery, Depends()],
    request: Request,
):
    """
    List all projects with pagination and filtering (public access).
    Data formatting is handled by schemas.
    """
    projects, total = await service.list_projects(query)

    # Use schema to format data - no manual conversion needed
    return ProjectListResponsePaginated(
        items=[ProjectListItem.from_db_dict(p, include_admin_fields=False) for p in projects],
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
@audit_log(action="apply", resource_type="project_application")
async def apply_to_project(
    project_id: UUID,
    data: ProjectApplicationCreate,
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Apply to a project (member only).
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
async def get_my_applications(
    query: Annotated[ApplicationListQuery, Depends()],
    request: Request,
    current_user: Annotated[Member, Depends(get_current_active_user)],
):
    """
    Get member's own project applications with pagination (member only).
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
async def list_projects_admin(
    query: Annotated[ProjectListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    List all projects with pagination and filtering (admin only).
    Data formatting is handled by schemas with admin-specific fields.
    """
    projects, total = await service.list_projects_admin(query)

    # Use schema to format data with admin fields
    return ProjectListResponsePaginated(
        items=[ProjectListItem.from_db_dict(p, include_admin_fields=True) for p in projects],
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
async def get_project_admin(
    project_id: UUID,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Get detailed information about a specific project (admin only).
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
@audit_log(action="delete", resource_type="project")
async def delete_project(
    project_id: UUID,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Delete a project (admin only).
    """
    await service.delete_project(project_id)


@router.get(
    "/api/admin/projects/applications",
    response_model=ApplicationListResponsePaginated,
    tags=["admin-projects"],
    summary="List all applications (Admin)",
)
async def list_all_applications(
    query: Annotated[ApplicationListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    project_id: Optional[UUID] = Query(None, description="Filter by project ID"),
):
    """
    List all applications across all projects (admin only).
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
async def list_project_applications(
    project_id: UUID,
    query: Annotated[ApplicationListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    List all applications for a specific project (admin only).
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
@audit_log(action="update_status", resource_type="project_application")
async def update_application_status(
    application_id: UUID,
    data: ApplicationStatusUpdate,
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
):
    """
    Update application status (admin only).
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
@audit_log(action="export", resource_type="project")
async def export_projects(
    query: Annotated[ProjectListQuery, Depends()],
    request: Request,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    format: str = Query("excel", regex="^(excel|csv)$", description="Export format: excel or csv"),
):
    """
    Export projects data to Excel or CSV (admin only).
    """
    from ...common.modules.export import ExportService
    
    export_data = await service.export_projects_data(query)
    
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
    else:
        csv_content = ExportService.export_to_csv(data=export_data)
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
    """
    from ...common.modules.export import ExportService
    
    export_data = await service.export_applications_data(project_id, query)
    
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
    else:
        csv_content = ExportService.export_to_csv(data=export_data)
        return Response(
            content=csv_content,
            media_type="text/csv",
            headers={
                "Content-Disposition": f'attachment; filename="applications_export_{datetime.now().strftime("%Y%m%d_%H%M%S")}.csv"'
            },
        )
