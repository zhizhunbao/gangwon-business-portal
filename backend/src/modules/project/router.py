"""
Project router.

API endpoints for project and application management.
"""
from fastapi import APIRouter, Depends, status
from sqlalchemy.ext.asyncio import AsyncSession
from uuid import UUID
from typing import Annotated, Optional
from math import ceil

from ...common.modules.db.session import get_db
from ...common.modules.db.models import Member
from ..user.dependencies import get_current_active_user, get_current_admin_user
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
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List all projects with pagination and filtering (public access).

    - **status**: Filter by status (active, inactive, archived)
    - **search**: Search in title and description
    - **page**: Page number (default: 1)
    - **page_size**: Items per page (default: 20, max: 100)
    """
    projects, total = await service.list_projects(query, db)

    return ProjectListResponsePaginated(
        items=[ProjectListItem.model_validate(p) for p in projects],
        total=total,
        page=query.page,
        page_size=query.page_size,
        total_pages=ceil(total / query.page_size) if total > 0 else 0,
    )


@router.get(
    "/api/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["projects"],
    summary="Get project details",
)
async def get_project(
    project_id: UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get detailed information about a specific project (public access).
    """
    project = await service.get_project_by_id(project_id, db)
    return ProjectResponse.model_validate(project)


@router.post(
    "/api/projects/{project_id}/apply",
    response_model=ProjectApplicationResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["projects"],
    summary="Apply to project",
)
async def apply_to_project(
    project_id: UUID,
    data: ProjectApplicationCreate,
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Apply to a project (member only).

    Requires authentication. Member must not have already applied to this project.
    """
    application = await service.apply_to_project(
        current_user.id, project_id, data, db
    )
    # NOTE:
    # Avoid letting Pydantic introspect SQLAlchemy relationships on async
    # models (which can trigger lazy-loading errors). We construct the
    # response explicitly from scalar fields without loading nested
    # project details, which is sufficient for current API consumers
    # and keeps the endpoint stable.
    return ProjectApplicationResponse(
        id=application.id,
        member_id=application.member_id,
        project_id=application.project_id,
        project=None,
        status=application.status,
        application_reason=application.application_reason,
        submitted_at=application.submitted_at,
        reviewed_at=application.reviewed_at,
    )


@router.get(
    "/api/my-applications",
    response_model=ApplicationListResponsePaginated,
    tags=["projects"],
    summary="Get my project applications",
)
async def get_my_applications(
    query: Annotated[ApplicationListQuery, Depends()],
    current_user: Annotated[Member, Depends(get_current_active_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Get member's own project applications with pagination (member only).

    - **status**: Filter by status (submitted, under_review, approved, rejected)
    - **page**: Page number
    - **page_size**: Items per page
    """
    applications, total = await service.get_my_applications(
        current_user.id, query, db
    )

    return ApplicationListResponsePaginated(
        items=[ProjectApplicationListItem.model_validate(a) for a in applications],
        total=total,
        page=query.page,
        page_size=query.page_size,
        total_pages=ceil(total / query.page_size) if total > 0 else 0,
    )


# Admin endpoints


@router.post(
    "/api/admin/projects",
    response_model=ProjectResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["admin-projects"],
    summary="Create project (Admin)",
)
async def create_project(
    data: ProjectCreate,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Create a new project (admin only).
    """
    project = await service.create_project(data, db)
    return ProjectResponse.model_validate(project)


@router.put(
    "/api/admin/projects/{project_id}",
    response_model=ProjectResponse,
    tags=["admin-projects"],
    summary="Update project (Admin)",
)
async def update_project(
    project_id: UUID,
    data: ProjectUpdate,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update project details (admin only).
    """
    project = await service.update_project(project_id, data, db)
    return ProjectResponse.model_validate(project)


@router.delete(
    "/api/admin/projects/{project_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    tags=["admin-projects"],
    summary="Delete project (Admin)",
)
async def delete_project(
    project_id: UUID,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Delete a project (admin only).

    WARNING: This will cascade delete all applications related to this project.
    """
    await service.delete_project(project_id, db)


@router.get(
    "/api/admin/projects/{project_id}/applications",
    response_model=ApplicationListResponsePaginated,
    tags=["admin-projects"],
    summary="List project applications (Admin)",
)
async def list_project_applications(
    project_id: UUID,
    query: Annotated[ApplicationListQuery, Depends()],
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    List all applications for a specific project (admin only).

    - **status**: Filter by application status
    - **page**: Page number
    - **page_size**: Items per page
    """
    applications, total = await service.list_project_applications(
        project_id, query, db
    )

    return ApplicationListResponsePaginated(
        items=[ProjectApplicationListItem.model_validate(a) for a in applications],
        total=total,
        page=query.page,
        page_size=query.page_size,
        total_pages=ceil(total / query.page_size) if total > 0 else 0,
    )


@router.put(
    "/api/admin/applications/{application_id}/status",
    response_model=ProjectApplicationResponse,
    tags=["admin-projects"],
    summary="Update application status (Admin)",
)
async def update_application_status(
    application_id: UUID,
    data: ApplicationStatusUpdate,
    current_admin: Annotated[Member, Depends(get_current_admin_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
):
    """
    Update application status (admin only).

    Change application status to: submitted, under_review, approved, or rejected.
    """
    application = await service.update_application_status(
        application_id, data.status, db
    )
    # See note in apply_to_project: build response explicitly to avoid
    # async lazy-loading of relationships during serialization.
    return ProjectApplicationResponse(
        id=application.id,
        member_id=application.member_id,
        project_id=application.project_id,
        project=None,
        status=application.status,
        application_reason=application.application_reason,
        submitted_at=application.submitted_at,
        reviewed_at=application.reviewed_at,
    )
