"""
Project service.

Business logic for project and application management operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from uuid import UUID
from typing import Optional
from datetime import datetime

from ...common.modules.db.models import Project, ProjectApplication
from ...common.modules.exception import NotFoundError, ValidationError
from .schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectListQuery,
    ProjectApplicationCreate,
    ApplicationListQuery,
    ApplicationStatus,
)


class ProjectService:
    """Project service class."""

    # Public/Member operations

    async def list_projects(
        self, query: ProjectListQuery, db: AsyncSession
    ) -> tuple[list[Project], int]:
        """
        List all projects with pagination and filtering (public access).

        Args:
            query: Query parameters
            db: Database session

        Returns:
            Tuple of (projects list, total count)
        """
        # Build base query
        stmt = select(Project)

        # Apply filters
        if query.status:
            stmt = stmt.where(Project.status == query.status.value)
        else:
            # By default, only show active projects to public
            stmt = stmt.where(Project.status == "active")

        if query.search:
            stmt = stmt.where(
                or_(
                    Project.title.ilike(f"%{query.search}%"),
                    Project.description.ilike(f"%{query.search}%"),
                )
            )

        # Get total count  
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(Project.created_at.desc())
        stmt = stmt.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(stmt)
        projects = result.scalars().all()

        return list(projects), total

    async def get_project_by_id(
        self, project_id: UUID, db: AsyncSession
    ) -> Project:
        """
        Get project by ID (public access).

        Args:
            project_id: Project UUID
            db: Database session

        Returns:
            Project

        Raises:
            NotFoundError: If project not found
        """
        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()

        if not project:
            raise NotFoundError("Project")

        return project

    async def apply_to_project(
        self,
        member_id: UUID,
        project_id: UUID,
        data: ProjectApplicationCreate,
        db: AsyncSession,
    ) -> ProjectApplication:
        """
        Apply to a project (member only).

        Args:
            member_id: Member UUID
            project_id: Project UUID
            data: Application data
            db: Database session

        Returns:
            Created application

        Raises:
            NotFoundError: If project not found
            ValidationError: If project inactive or duplicate application
        """
        # Check if project exists and is active
        project = await self.get_project_by_id(project_id, db)

        if project.status != "active":
            raise ValidationError(
                f"Cannot apply to project with status '{project.status}'. "
                "Only active projects accept applications."
            )

        # Check for duplicate application
        existing = await db.execute(
            select(ProjectApplication).where(
                and_(
                    ProjectApplication.member_id == member_id,
                    ProjectApplication.project_id == project_id,
                )
            )
        )
        if existing.scalar_one_or_none():
            raise ValidationError(
                "You have already applied to this project. "
                "Duplicate applications are not allowed."
            )

        # Create application
        application = ProjectApplication(
            member_id=member_id,
            project_id=project_id,
            application_reason=data.application_reason,
            status="submitted",
        )

        db.add(application)
        await db.commit()
        await db.refresh(application)

        return application

    async def get_my_applications(
        self, member_id: UUID, query: ApplicationListQuery, db: AsyncSession
    ) -> tuple[list[ProjectApplication], int]:
        """
        Get member's own applications.

        Args:
            member_id: Member UUID
            query: Query parameters
            db: Database session

        Returns:
            Tuple of (applications list, total count)
        """
        # Build base query
        stmt = select(ProjectApplication).where(
            ProjectApplication.member_id == member_id
        )

        # Apply filters
        if query.status:
            stmt = stmt.where(ProjectApplication.status == query.status.value)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(ProjectApplication.submitted_at.desc())
        stmt = stmt.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(stmt)
        applications = result.scalars().all()

        return list(applications), total

    # Admin operations

    async def create_project(
        self, data: ProjectCreate, db: AsyncSession
    ) -> Project:
        """
        Create new project (admin only).

        Args:
            data: Project data
            db: Database session

        Returns:
            Created project
        """
        project = Project(
            title=data.title,
            description=data.description,
            target_audience=data.target_audience,
            start_date=data.start_date,
            end_date=data.end_date,
            image_url=data.image_url,
            status=data.status.value if data.status else "active",
        )

        db.add(project)
        await db.commit()
        await db.refresh(project)

        return project

    async def update_project(
        self, project_id: UUID, data: ProjectUpdate, db: AsyncSession
    ) -> Project:
        """
        Update project (admin only).

        Args:
            project_id: Project UUID
            data: Update data
            db: Database session

        Returns:
            Updated project

        Raises:
            NotFoundError: If project not found
        """
        project = await self.get_project_by_id(project_id, db)

        # Update fields
        if data.title is not None:
            project.title = data.title
        if data.description is not None:
            project.description = data.description
        if data.target_audience is not None:
            project.target_audience = data.target_audience
        if data.start_date is not None:
            project.start_date = data.start_date
        if data.end_date is not None:
            project.end_date = data.end_date
        if data.image_url is not None:
            project.image_url = data.image_url
        if data.status is not None:
            project.status = data.status.value

        await db.commit()
        await db.refresh(project)

        return project

    async def delete_project(
        self, project_id: UUID, db: AsyncSession
    ) -> None:
        """
        Delete project (admin only).

        Args:
            project_id: Project UUID
            db: Database session

        Raises:
            NotFoundError: If project not found
        """
        project = await self.get_project_by_id(project_id, db)

        await db.delete(project)
        await db.commit()

    async def list_project_applications(
        self, project_id: UUID, query: ApplicationListQuery, db: AsyncSession
    ) -> tuple[list[ProjectApplication], int]:
        """
        List all applications for a project (admin only).

        Args:
            project_id: Project UUID
            query: Query parameters
            db: Database session

        Returns:
            Tuple of (applications list, total count)

        Raises:
            NotFoundError: If project not found
        """
        # Verify project exists
        await self.get_project_by_id(project_id, db)

        # Build query
        stmt = select(ProjectApplication).where(
            ProjectApplication.project_id == project_id
        )

        # Apply filters
        if query.status:
            stmt = stmt.where(ProjectApplication.status == query.status.value)

        # Get total count
        count_stmt = select(func.count()).select_from(stmt.subquery())
        total_result = await db.execute(count_stmt)
        total = total_result.scalar() or 0

        # Apply pagination
        offset = (query.page - 1) * query.page_size
        stmt = stmt.order_by(ProjectApplication.submitted_at.desc())
        stmt = stmt.offset(offset).limit(query.page_size)

        # Execute query
        result = await db.execute(stmt)
        applications = result.scalars().all()

        return list(applications), total

    async def update_application_status(
        self,
        application_id: UUID,
        status: ApplicationStatus,
        db: AsyncSession,
    ) -> ProjectApplication:
        """
        Update application status (admin only).

        Args:
            application_id: Application UUID
            status: New status
            db: Database session

        Returns:
            Updated application

        Raises:
            NotFoundError: If application not found
        """
        result = await db.execute(
            select(ProjectApplication).where(ProjectApplication.id == application_id)
        )
        application = result.scalar_one_or_none()

        if not application:
            raise NotFoundError("Project application")

        # Update status
        application.status = status.value
        if status in [ApplicationStatus.approved, ApplicationStatus.rejected]:
            application.reviewed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(application)

        return application

    async def export_projects_data(
        self, query: ProjectListQuery, db: AsyncSession
    ) -> list[dict]:
        """
        Export projects data for download (admin only).

        Args:
            query: Filter parameters
            db: Database session

        Returns:
            List of project records as dictionaries
        """
        # Build query directly without pagination for export
        stmt = select(Project)
        
        # Apply filters
        if query.status:
            stmt = stmt.where(Project.status == query.status.value)
        if query.search:
            stmt = stmt.where(
                or_(
                    Project.title.ilike(f"%{query.search}%"),
                    Project.description.ilike(f"%{query.search}%"),
                )
            )
        
        stmt = stmt.order_by(Project.created_at.desc())
        
        # Execute query to get all matching projects
        result = await db.execute(stmt)
        projects = result.scalars().all()

        # Get all application counts in one query using GROUP BY
        app_counts_stmt = select(
            ProjectApplication.project_id,
            func.count(ProjectApplication.id).label('count')
        ).group_by(ProjectApplication.project_id)
        app_counts_result = await db.execute(app_counts_stmt)
        app_counts = {row.project_id: row.count for row in app_counts_result.all()}

        # Convert to dict format for export
        export_data = []
        for project in projects:
            app_count = app_counts.get(project.id, 0)

            export_data.append({
                "id": str(project.id),
                "title": project.title,
                "description": project.description,
                "target_audience": project.target_audience,
                "start_date": project.start_date.isoformat() if project.start_date else None,
                "end_date": project.end_date.isoformat() if project.end_date else None,
                "image_url": project.image_url,
                "status": project.status,
                "applications_count": app_count,
                "created_at": project.created_at.isoformat() if project.created_at else None,
                "updated_at": project.updated_at.isoformat() if project.updated_at else None,
            })

        return export_data

    async def export_applications_data(
        self, project_id: Optional[UUID], query: ApplicationListQuery, db: AsyncSession
    ) -> list[dict]:
        """
        Export project applications data for download (admin only).

        Args:
            project_id: Optional project ID to filter by
            query: Filter parameters
            db: Database session

        Returns:
            List of application records as dictionaries
        """
        # Build query for all applications
        stmt = select(ProjectApplication)
        
        if project_id:
            stmt = stmt.where(ProjectApplication.project_id == project_id)
        
        if query.status:
            stmt = stmt.where(ProjectApplication.status == query.status.value)

        # Execute query
        result = await db.execute(stmt)
        applications = result.scalars().all()

        # Convert to dict format for export
        export_data = []
        for application in applications:
            # Get project and member info
            project_result = await db.execute(
                select(Project).where(Project.id == application.project_id)
            )
            project = project_result.scalar_one_or_none()

            from ...common.modules.db.models import Member
            member_result = await db.execute(
                select(Member).where(Member.id == application.member_id)
            )
            member = member_result.scalar_one_or_none()

            export_data.append({
                "id": str(application.id),
                "project_id": str(application.project_id),
                "project_title": project.title if project else None,
                "member_id": str(application.member_id),
                "company_name": member.company_name if member else None,
                "business_number": member.business_number if member else None,
                "status": application.status,
                "application_reason": application.application_reason,
                "submitted_at": application.submitted_at.isoformat() if application.submitted_at else None,
                "reviewed_at": application.reviewed_at.isoformat() if application.reviewed_at else None,
            })

        return export_data
