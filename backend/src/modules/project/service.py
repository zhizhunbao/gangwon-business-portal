"""
Project service.

Business logic for project and application management operations.
"""
from uuid import UUID, uuid4
from typing import Optional
from datetime import datetime

from ...common.modules.db.models import Project, ProjectApplication  # 保留用于类型提示和文档
from ...common.modules.supabase.service import supabase_service
from ...common.modules.exception import NotFoundError, ValidationError
from ...common.modules.exception.codes import ErrorCode
from .schemas import (
    ProjectCreate,
    ProjectUpdate,
    ProjectListQuery,
    ProjectApplicationCreate,
    ApplicationListQuery,
    ApplicationStatus,
)


class ProjectService:
    """Project service class - using supabase_service helper methods and direct client."""

    # Public/Member operations

    async def list_projects(
        self, query: ProjectListQuery
    ) -> tuple[list[dict], int]:
        """
        List all projects with pagination and filtering (public access).

        Args:
            query: Query parameters

        Returns:
            Tuple of (projects list, total count)
        """
        projects, total = await supabase_service.list_projects_with_filters(
            sort_by="created_at",
            sort_order="desc",
        )
        return projects, total
    
    async def list_projects_admin(
        self, query: ProjectListQuery
    ) -> tuple[list[dict], int]:
        """
        List all projects with pagination and filtering (admin access).
        Admin can see all projects including drafts and inactive ones.

        Args:
            query: Query parameters

        Returns:
            Tuple of (projects list, total count)
        """
        projects, total = await supabase_service.list_projects_with_filters(
            sort_by="created_at",
            sort_order="desc",
        )
        return projects, total

    async def get_project_by_id(
        self, project_id: UUID
    ) -> dict:
        """
        Get project by ID (public access).

        Args:
            project_id: Project UUID

        Returns:
            Project dict

        Raises:
            NotFoundError: If project not found
        """
        # Use helper method
        project = await supabase_service.get_by_id('projects', str(project_id))

        if not project:
            raise NotFoundError("Project")

        return project

    async def apply_to_project(
        self,
        member_id: UUID,
        project_id: UUID,
        data: ProjectApplicationCreate,
    ) -> dict:
        """
        Apply to a project (member only).

        Args:
            member_id: Member UUID
            project_id: Project UUID
            data: Application data

        Returns:
            Created application dict

        Raises:
            NotFoundError: If project not found
            ValidationError: If project inactive or duplicate application
        """
        # Check if project exists and is active
        project = await self.get_project_by_id(project_id)

        if project["status"] != "active":
            raise ValidationError(
                f"Cannot apply to project with status '{project['status']}'. "
                "Only active projects accept applications."
            )

        # Check for duplicate application - use direct client for complex query
        existing_app = supabase_service.client.table('project_applications')\
            .select('id')\
            .eq('member_id', str(member_id))\
            .eq('project_id', str(project_id))\
            .is_('deleted_at', 'null')\
            .limit(1)\
            .execute()
        
        if existing_app.data:
            raise ValidationError(
                "Project already applied",
                context={"error_code": ErrorCode.PROJECT_ALREADY_APPLIED}
            )

        # Create application - use helper method
        application_data = {
            "member_id": str(member_id),
            "project_id": str(project_id),
            "application_reason": data.application_reason,
            "status": "submitted",
        }
        return await supabase_service.create_record('project_applications', application_data)

    async def get_my_applications(
        self, member_id: UUID, query: ApplicationListQuery
    ) -> tuple[list[dict], int]:
        """
        Get member's own applications.

        Args:
            member_id: Member UUID
            query: Query parameters

        Returns:
            Tuple of (applications list, total count)
        """
        applications, total = await supabase_service.list_project_applications_with_filters(
            sort_by="submitted_at",
            sort_order="desc",
        )
        return applications, total

    # Admin operations

    async def create_project(
        self, data: ProjectCreate
    ) -> dict:
        """
        Create new project (admin only).

        Args:
            data: Project data

        Returns:
            Created project dict
        """
        project_data = {
            "id": str(uuid4()),
            "title": data.title,
            "description": data.description,
            "target_company_name": data.target_company_name,
            "target_business_number": data.target_business_number,
            "start_date": data.start_date.isoformat() if data.start_date else None,
            "end_date": data.end_date.isoformat() if data.end_date else None,
            "image_url": data.image_url,
            "status": data.status.value if data.status else "active",
        }
        # Use helper method
        return await supabase_service.create_record('projects', project_data)

    async def update_project(
        self, project_id: UUID, data: ProjectUpdate
    ) -> dict:
        """
        Update project (admin only).

        Args:
            project_id: Project UUID
            data: Update data

        Returns:
            Updated project dict

        Raises:
            NotFoundError: If project not found
        """
        await self.get_project_by_id(project_id)  # Verify exists

        # Build update data
        update_data = {}
        if data.title is not None:
            update_data["title"] = data.title
        if data.description is not None:
            update_data["description"] = data.description
        if data.target_company_name is not None:
            update_data["target_company_name"] = data.target_company_name
        if data.target_business_number is not None:
            update_data["target_business_number"] = data.target_business_number
        if data.start_date is not None:
            update_data["start_date"] = data.start_date.isoformat()
        if data.end_date is not None:
            update_data["end_date"] = data.end_date.isoformat()
        if data.image_url is not None:
            update_data["image_url"] = data.image_url
        if data.status is not None:
            update_data["status"] = data.status.value

        # Use helper method
        return await supabase_service.update_record('projects', str(project_id), update_data)

    async def delete_project(
        self, project_id: UUID
    ) -> None:
        """
        Delete project (admin only).

        Args:
            project_id: Project UUID

        Raises:
            NotFoundError: If project not found
        """
        await self.get_project_by_id(project_id)  # Verify exists
        # Use helper method for soft delete
        await supabase_service.delete_record('projects', str(project_id))

    async def list_project_applications(
        self, project_id: UUID, query: ApplicationListQuery
    ) -> tuple[list[dict], int]:
        """
        List all applications for a project (admin only).

        Args:
            project_id: Project UUID
            query: Query parameters

        Returns:
            Tuple of (applications list, total count)

        Raises:
            NotFoundError: If project not found
        """
        # Verify project exists
        project = await self.get_project_by_id(project_id)

        applications, total = await supabase_service.list_project_applications_with_filters(
            project_id=str(project_id),
            sort_by="submitted_at",
            sort_order="desc",
        )
        
        # Flatten nested data for schema compatibility
        flattened = []
        for app in applications:
            flat_app = {**app}
            # Extract project_title from nested projects object
            if 'projects' in flat_app and flat_app['projects']:
                flat_app['project_title'] = flat_app['projects'].get('title', '')
                del flat_app['projects']
            else:
                flat_app['project_title'] = project.get('title', '') if project else ''
            # Extract company_name from nested members object
            if 'members' in flat_app and flat_app['members']:
                flat_app['company_name'] = flat_app['members'].get('company_name', '')
                flat_app['business_number'] = flat_app['members'].get('business_number', '')
                del flat_app['members']
            else:
                flat_app['company_name'] = ''
                flat_app['business_number'] = ''
            # Ensure application_reason has a default value
            if not flat_app.get('application_reason'):
                flat_app['application_reason'] = ''
            flattened.append(flat_app)
        
        return flattened, total

    async def list_all_applications(
        self, query: ApplicationListQuery, project_id: Optional[UUID] = None
    ) -> tuple[list[dict], int]:
        """
        List all applications across all projects (admin only).

        Args:
            query: Query parameters for filtering and pagination
            project_id: Optional project ID to filter by

        Returns:
            Tuple of (applications list, total count)
        """
        applications, total = await supabase_service.list_project_applications_with_filters(
            sort_by="submitted_at",
            sort_order="desc",
        )
        return applications, total

    async def update_application_status(
        self,
        application_id: UUID,
        status: ApplicationStatus,
    ) -> dict:
        """
        Update application status (admin only).

        Args:
            application_id: Application UUID
            status: New status

        Returns:
            Updated application dict

        Raises:
            NotFoundError: If application not found
        """
        # Use helper method to get application
        application = await supabase_service.get_by_id('project_applications', str(application_id))

        if not application:
            raise NotFoundError("Project application")

        # Build update data
        update_data = {"status": status.value}
        if status in [ApplicationStatus.approved, ApplicationStatus.rejected]:
            update_data["reviewed_at"] = datetime.utcnow().isoformat()

        # Use helper method
        return await supabase_service.update_record('project_applications', str(application_id), update_data)

    async def export_projects_data(
        self, query: ProjectListQuery
    ) -> list[dict]:
        """
        Export projects data for download (admin only).

        Args:
            query: Filter parameters

        Returns:
            List of project records as dictionaries
        """
        projects = await supabase_service.export_projects(
            status=query.status.value if query.status else None,
            search=query.search,
        )

        # Get application counts for each project - use direct client for complex query
        export_data = []
        for project in projects:
            # Get application count for this project
            app_count_result = supabase_service.client.table('project_applications')\
                .select('*', count='exact')\
                .eq('project_id', str(project["id"]))\
                .is_('deleted_at', 'null')\
                .execute()
            app_count = app_count_result.count or 0

            export_data.append({
                "id": str(project["id"]),
                "title": project["title"],
                "description": project["description"],
                "target_company_name": project["target_company_name"],
                "target_business_number": project["target_business_number"],
                "start_date": project.get("start_date"),
                "end_date": project.get("end_date"),
                "image_url": project.get("image_url"),
                "status": project["status"],
                "applications_count": app_count,
                "created_at": project.get("created_at"),
                "updated_at": project.get("updated_at"),
            })

        return export_data

    async def export_applications_data(
        self, project_id: Optional[UUID], query: ApplicationListQuery
    ) -> list[dict]:
        """
        Export project applications data for download (admin only).

        Args:
            project_id: Optional project ID to filter by
            query: Filter parameters

        Returns:
            List of application records as dictionaries
        """
        applications = await supabase_service.export_project_applications(
            project_id=str(project_id) if project_id else None,
            status=query.status.value if query.status else None,
        )

        # Convert to dict format for export
        export_data = []
        for application in applications:
            # Get project and member info - use helper methods
            project = await supabase_service.get_by_id('projects', str(application["project_id"]))
            member = await supabase_service.get_by_id('members', str(application["member_id"]))

            export_data.append({
                "id": str(application["id"]),
                "project_id": str(application["project_id"]),
                "project_title": project["title"] if project else None,
                "member_id": str(application["member_id"]),
                "company_name": member["company_name"] if member else None,
                "business_number": member["business_number"] if member else None,
                "status": application["status"],
                "application_reason": application.get("application_reason"),
                "submitted_at": application.get("submitted_at"),
                "reviewed_at": application.get("reviewed_at"),
            })

        return export_data

# Service instance
service = ProjectService()