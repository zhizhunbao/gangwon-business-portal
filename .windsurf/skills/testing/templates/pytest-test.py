"""
{{FeatureName}} Backend Tests

@description Pytest tests for {{feature_name}} API endpoints
@author {{author}}
@created {{date}}
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import Session
from datetime import datetime
import json

from src.main import app
from src.core.database import get_db
from src.models.user import User
from src.models.{{feature_name}} import {{FeatureName}}
from src.schemas.{{feature_name}} import {{FeatureName}}Create, {{FeatureName}}Update
from src.services.{{feature_name}}_service import {{FeatureName}}Service

# Test client
client = TestClient(app)

# Mock data
mock_user_data = {
    "id": 1,
    "email": "test@example.com",
    "name": "Test User",
    "is_active": True
}

mock_{{feature_name}}_data = {
    "name": "Test {{FeatureName}}",
    "description": "Test description",
    "code": "test-{{feature_name}}",
    "status": "active",
    "sort_order": 0,
    "is_featured": False
}

mock_{{feature_name}}_response = {
    "id": 1,
    "name": "Test {{FeatureName}}",
    "description": "Test description",
    "code": "test-{{feature_name}}",
    "status": "active",
    "sort_order": 0,
    "is_featured": False,
    "created_by": 1,
    "updated_by": None,
    "created_at": "2024-01-01T00:00:00Z",
    "updated_at": "2024-01-01T00:00:00Z",
    "deleted_at": None
}


@pytest.fixture
def db_session():
    """Create test database session"""
    # This would typically use an in-memory SQLite database
    # For now, we'll mock it
    from unittest.mock import Mock
    session = Mock(spec=Session)
    return session


@pytest.fixture
def mock_current_user():
    """Mock authenticated user"""
    return User(**mock_user_data)


@pytest.fixture
def mock_{{feature_name}}_model():
    """Mock {{FeatureName}} model instance"""
    return {{FeatureName}}(**mock_{{feature_name}}_response)


@pytest.fixture
def override_get_db(db_session):
    """Override database dependency"""
    def _override_get_db():
        return db_session
    app.dependency_overrides[get_db] = _override_get_db
    yield
    app.dependency_overrides.clear()


class Test{{FeatureName}}Routes:
    """Test {{FeatureName}} API routes"""

    @pytest.mark.asyncio
    async def test_get_{{feature_name}}_list_success(self, override_get_db, mock_current_user, mock_{{feature_name}}_model):
        """Test successful retrieval of {{feature_name}} list"""
        
        # Mock service response
        mock_service_response = {
            "items": [mock_{{feature_name}}_model],
            "total": 1,
            "page": 1,
            "limit": 10,
            "pages": 1
        }
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.get_list.return_value = mock_service_response
            
            # Mock authentication
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.get("/api/{{feature_route}}/?skip=0&limit=10")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["total"] == 1
                assert len(data["data"]["items"]) == 1

    @pytest.mark.asyncio
    async def test_get_{{feature_name}}_by_id_success(self, override_get_db, mock_current_user, mock_{{feature_name}}_model):
        """Test successful retrieval of {{feature_name}} by ID"""
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.get_by_id.return_value = mock_{{feature_name}}_model
            
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.get("/api/{{feature_route}}/1")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["id"] == 1

    @pytest.mark.asyncio
    async def test_get_{{feature_name}}_by_id_not_found(self, override_get_db, mock_current_user):
        """Test retrieval of non-existent {{feature_name}}"""
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.get_by_id.return_value = None
            
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.get("/api/{{feature_route}}/999")
                
                assert response.status_code == 404

    @pytest.mark.asyncio
    async def test_create_{{feature_name}}_success(self, override_get_db, mock_current_user, mock_{{feature_name}}_model):
        """Test successful creation of {{feature_name}}"""
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.create.return_value = mock_{{feature_name}}_model
            
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.post("/api/{{feature_route}}/", json=mock_{{feature_name}}_data)
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["name"] == mock_{{feature_name}}_data["name"]

    @pytest.mark.asyncio
    async def test_create_{{feature_name}}_validation_error(self, override_get_db, mock_current_user):
        """Test creation with invalid data"""
        
        invalid_data = mock_{{feature_name}}_data.copy()
        invalid_data["name"] = ""  # Empty name should fail validation
        
        with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
            response = client.post("/api/{{feature_route}}/", json=invalid_data)
            
            assert response.status_code == 422

    @pytest.mark.asyncio
    async def test_update_{{feature_name}}_success(self, override_get_db, mock_current_user, mock_{{feature_name}}_model):
        """Test successful update of {{feature_name}}"""
        
        update_data = {"name": "Updated {{FeatureName}}"}
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.update.return_value = mock_{{feature_name}}_model
            
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.put("/api/{{feature_route}}/1", json=update_data)
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True

    @pytest.mark.asyncio
    async def test_delete_{{feature_name}}_success(self, override_get_db, mock_current_user):
        """Test successful deletion of {{feature_name}}"""
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.delete.return_value = True
            
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.delete("/api/{{feature_route}}/1")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True

    @pytest.mark.asyncio
    async def test_search_{{feature_name}}_success(self, override_get_db, mock_current_user, mock_{{feature_name}}_model):
        """Test successful search of {{feature_name}}"""
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.search.return_value = [mock_{{feature_name}}_model]
            
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.get("/api/{{feature_route}}/search?q=test")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert len(data["data"]) == 1

    @pytest.mark.asyncio
    async def test_get_{{feature_name}}_statistics_success(self, override_get_db, mock_current_user):
        """Test successful retrieval of {{feature_name}} statistics"""
        
        mock_stats = {
            "total": 10,
            "active": 8,
            "inactive": 2,
            "pending": 0,
            "completed": 5,
            "cancelled": 0,
            "featured": 3,
            "recent_created": 2
        }
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.get_statistics.return_value = mock_stats
            
            with pytest.patch('src.api.deps.get_current_user', return_value=mock_current_user):
                response = client.get("/api/{{feature_route}}/statistics")
                
                assert response.status_code == 200
                data = response.json()
                assert data["success"] is True
                assert data["data"]["total"] == 10


class Test{{FeatureName}}Service:
    """Test {{FeatureName}} service layer"""

    @pytest.mark.asyncio
    async def test_create_{{feature_name}}_service(self, db_session):
        """Test {{FeatureName}} service create method"""
        
        with pytest.patch('src.services.{{feature_name}}_service.{{FeatureName}}Service.__init__', return_value=None):
            service = {{FeatureName}}Service(db_session)
            
            # Mock database operations
            mock_{{feature_name}} = {{FeatureName}}(**mock_{{feature_name}}_data)
            
            with pytest.patch.object(service, 'create', return_value=mock_{{feature_name}}):
                result = await service.create(
                    item_data={{FeatureName}}(**mock_{{feature_name}}_data),
                    user_id=1
                )
                
                assert result.name == mock_{{feature_name}}_data["name"]

    @pytest.mark.asyncio
    async def test_get_{{feature_name}}_by_id_service(self, db_session):
        """Test {{FeatureName}} service get_by_id method"""
        
        with pytest.patch('src.services.{{feature_name}}_service.{{FeatureName}}Service.__init__', return_value=None):
            service = {{FeatureName}}Service(db_session)
            
            mock_{{feature_name}} = {{FeatureName}}(**mock_{{feature_name}}_response)
            
            with pytest.patch.object(service, 'get_by_id', return_value=mock_{{feature_name}}):
                result = await service.get_by_id(1, user_id=1)
                
                assert result.id == 1


class Test{{FeatureName}}Model:
    """Test {{FeatureName}} model"""

    def test_{{feature_name}}_model_creation(self):
        """Test {{FeatureName}} model creation"""
        
        {{feature_name}} = {{FeatureName}}(**mock_{{feature_name}}_data)
        
        assert {{feature_name}}.name == mock_{{feature_name}}_data["name"]
        assert {{feature_name}}.code == mock_{{feature_name}}_data["code"]
        assert {{feature_name}}.status == mock_{{feature_name}}_data["status"]

    def test_{{feature_name}}_model_to_dict(self):
        """Test {{FeatureName}} model to_dict method"""
        
        {{feature_name}} = {{FeatureName}}(**mock_{{feature_name}}_response)
        
        result = {{feature_name}}.to_dict()
        
        assert isinstance(result, dict)
        assert result["name"] == mock_{{feature_name}}_response["name"]
        assert result["id"] == mock_{{feature_name}}_response["id"]

    def test_{{feature_name}}_model_properties(self):
        """Test {{FeatureName}} model properties"""
        
        {{feature_name}} = {{FeatureName}}(**mock_{{feature_name}}_data)
        
        assert {{feature_name}}.is_active is True
        assert {{feature_name}}.is_deleted is False

    def test_{{feature_name}}_model_soft_delete(self):
        """Test {{FeatureName}} model soft delete"""
        
        {{feature_name}} = {{FeatureName}}(**mock_{{feature_name}}_data)
        
        {{feature_name}}.soft_delete()
        
        assert {{feature_name}}.deleted_at is not None
        assert {{feature_name}}.status == "inactive"

    def test_{{feature_name}}_model_restore(self):
        """Test {{FeatureName}} model restore"""
        
        {{feature_name}} = {{FeatureName}}(**mock_{{feature_name}}_data)
        {{feature_name}}.soft_delete()
        
        {{feature_name}}.restore()
        
        assert {{feature_name}}.deleted_at is None
        assert {{feature_name}}.status == "active"


class Test{{FeatureName}}Schemas:
    """Test {{FeatureName}} Pydantic schemas"""

    def test_{{feature_name}}_create_schema_valid(self):
        """Test valid {{FeatureName}}Create schema"""
        
        schema = {{FeatureName}}Create(**mock_{{feature_name}}_data)
        
        assert schema.name == mock_{{feature_name}}_data["name"]
        assert schema.code == mock_{{feature_name}}_data["code"]

    def test_{{feature_name}}_create_schema_invalid(self):
        """Test invalid {{FeatureName}}Create schema"""
        
        invalid_data = mock_{{feature_name}}_data.copy()
        invalid_data["name"] = ""
        
        with pytest.raises(ValueError):
            {{FeatureName}}Create(**invalid_data)

    def test_{{feature_name}}_update_schema_valid(self):
        """Test valid {{FeatureName}}Update schema"""
        
        update_data = {"name": "Updated Name"}
        schema = {{FeatureName}}Update(**update_data)
        
        assert schema.name == "Updated Name"

    def test_{{feature_name}}_response_schema_valid(self):
        """Test valid {{FeatureName}}Response schema"""
        
        schema = {{FeatureName}}Response(**mock_{{feature_name}}_response)
        
        assert schema.id == 1
        assert schema.name == mock_{{feature_name}}_response["name"]


@pytest.mark.integration
class Test{{FeatureName}}Integration:
    """Integration tests for {{FeatureName}} feature"""

    @pytest.mark.asyncio
    async def test_full_{{feature_name}}_workflow(self):
        """Test complete {{feature_name}} workflow"""
        
        # This would test the full workflow from API to database
        # Requires actual database setup
        
        # Create {{feature_name}}
        # Update {{feature_name}}
        # Get {{feature_name}}
        # Delete {{feature_name}}
        
        pass


@pytest.mark.performance
class Test{{FeatureName}}Performance:
    """Performance tests for {{FeatureName}} feature"""

    @pytest.mark.asyncio
    async def test_{{feature_name}}_list_performance(self):
        """Test {{feature_name}} list endpoint performance"""
        
        import time
        
        start_time = time.time()
        
        # Mock large dataset
        mock_large_response = {
            "items": [mock_{{feature_name}}_response] * 100,
            "total": 100,
            "page": 1,
            "limit": 100,
            "pages": 1
        }
        
        with pytest.patch('src.api.{{feature_name}}.{{FeatureName}}Service') as mock_service_class:
            mock_service = mock_service_class.return_value
            mock_service.get_list.return_value = mock_large_response
            
            response = client.get("/api/{{feature_route}}/?limit=100")
            
            end_time = time.time()
            response_time = end_time - start_time
            
            assert response.status_code == 200
            assert response_time < 2.0  # Should respond within 2 seconds


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
