"""
Project service.

Business logic for project and application management operations.
"""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, or_, and_
from uuid import UUID
from datetime import datetime

from ...common.modules.db.models import Project, ProjectApplication
from ...common.modules.exception import NotFoundError, ValidationError
from ...common.modules.logger import logger
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
        logger.debug(
            "List projects",
            extra={
                "module": __name__,
                "status": query.status.value if query.status else None,
                "search": query.search,
                "page": query.page,
                "page_size": query.page_size,
            },
        )

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

        logger.debug(
            "List projects result",
            extra={
                "module": __name__,
                "total": total,
                "returned": len(projects),
            },
        )

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
        logger.debug(
            "Get project by id",
            extra={
                "module": __name__,
                "project_id": str(project_id),
            },
        )

        result = await db.execute(
            select(Project).where(Project.id == project_id)
        )
        project = result.scalar_one_or_none()

        if not project:
            logger.warning(
                "Project not found",
                extra={
                    "module": __name__,
                    "project_id": str(project_id),
                },
            )
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
        logger.info(
            "Apply to project request",
            extra={
                "module": __name__,
                "member_id": str(member_id),
                "project_id": str(project_id),
            },
        )

        # Check if project exists and is active
        project = await self.get_project_by_id(project_id, db)

        if project.status != "active":
            logger.warning(
                "Project application failed: project not active",
                extra={
                    "module": __name__,
                    "member_id": str(member_id),
                    "project_id": str(project_id),
                    "status": project.status,
                },
            )
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
            logger.warning(
                "Project application failed: duplicate application",
                extra={
                    "module": __name__,
                    "member_id": str(member_id),
                    "project_id": str(project_id),
                },
            )
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

        logger.info(
            "Project application created",
            extra={
                "module": __name__,
                "application_id": str(application.id),
                "member_id": str(member_id),
                "project_id": str(project_id),
            },
        )

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
        logger.debug(
            "Get my project applications",
            extra={
                "module": __name__,
                "member_id": str(member_id),
                "status": query.status.value if query.status else None,
                "page": query.page,
                "page_size": query.page_size,
            },
        )

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

        logger.debug(
            "Get my applications result",
            extra={
                "module": __name__,
                "member_id": str(member_id),
                "total": total,
                "returned": len(applications),
            },
        )

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
        logger.info(
            "Create project request",
            extra={
                "module": __name__,
                "title": data.title,
                "status": data.status.value if data.status else "active",
            },
        )

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

        logger.info(
            "Project created",
            extra={
                "module": __name__,
                "project_id": str(project.id),
                "title": project.title,
            },
        )

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
        logger.info(
            "Update project request",
            extra={
                "module": __name__,
                "project_id": str(project_id),
            },
        )

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

        logger.info(
            "Project updated",
            extra={
                "module": __name__,
                "project_id": str(project.id),
                "title": project.title,
            },
        )

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
        logger.info(
            "Delete project request",
            extra={
                "module": __name__,
                "project_id": str(project_id),
            },
        )

        project = await self.get_project_by_id(project_id, db)

        await db.delete(project)
        await db.commit()

        logger.info(
            "Project deleted",
            extra={
                "module": __name__,
                "project_id": str(project_id),
            },
        )

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
        logger.debug(
            "List project applications",
            extra={
                "module": __name__,
                "project_id": str(project_id),
                "status": query.status.value if query.status else None,
                "page": query.page,
                "page_size": query.page_size,
            },
        )

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

        logger.debug(
            "List project applications result",
            extra={
                "module": __name__,
                "project_id": str(project_id),
                "total": total,
                "returned": len(applications),
            },
        )

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
        logger.info(
            "Update application status request",
            extra={
                "module": __name__,
                "application_id": str(application_id),
                "new_status": status.value,
            },
        )

        result = await db.execute(
            select(ProjectApplication).where(ProjectApplication.id == application_id)
        )
        application = result.scalar_one_or_none()

        if not application:
            logger.warning(
                "Update application status failed: application not found",
                extra={
                    "module": __name__,
                    "application_id": str(application_id),
                },
            )
            raise NotFoundError("Project application")

        # Update status
        application.status = status.value
        if status in [ApplicationStatus.approved, ApplicationStatus.rejected]:
            application.reviewed_at = datetime.utcnow()

        await db.commit()
        await db.refresh(application)

        logger.info(
            "Application status updated",
            extra={
                "module": __name__,
                "application_id": str(application.id),
                "status": application.status,
            },
        )

        return application
