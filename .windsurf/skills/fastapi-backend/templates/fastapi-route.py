"""
{{FeatureName}} API Routes

@description {{description}}
@author {{author}}
@created {{date}}
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime

from src.api.deps import get_current_user, get_db
from src.models.user import User
from src.models.{{feature_name}} import {{FeatureName}}
from src.schemas.{{feature_name}} import (
    {{FeatureName}}Create,
    {{FeatureName}}Update,
    {{FeatureName}}Response,
    {{FeatureName}}ListResponse,
    {{FeatureName}}Statistics
)
from src.services.{{feature_name}}_service import {{FeatureName}}Service
from src.utils.responses import success_response, error_response
from src.utils.exceptions import ValidationError, NotFoundError

router = APIRouter(prefix="/{{feature_route}}", tags=["{{feature_name}}"])


@router.get("/", response_model={{FeatureName}}ListResponse)
async def get_{{feature_name}}_list(
    skip: int = Query(0, ge=0, description="跳过的记录数"),
    limit: int = Query(10, ge=1, le=100, description="返回的记录数"),
    search: Optional[str] = Query(None, description="搜索关键词"),
    status: Optional[str] = Query(None, description="状态筛选"),
    sort_by: Optional[str] = Query("created_at", description="排序字段"),
    sort_order: Optional[str] = Query("desc", description="排序顺序"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取{{feature_name}}列表
    
    - **skip**: 跳过的记录数
    - **limit**: 返回的记录数
    - **search**: 搜索关键词
    - **status**: 状态筛选
    - **sort_by**: 排序字段
    - **sort_order**: 排序顺序 (asc/desc)
    """
    try:
        service = {{FeatureName}}Service(db)
        result = await service.get_list(
            skip=skip,
            limit=limit,
            search=search,
            status=status,
            sort_by=sort_by,
            sort_order=sort_order,
            user_id=current_user.id
        )
        return success_response(data=result)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/statistics", response_model={{FeatureName}}Statistics)
async def get_{{feature_name}}_statistics(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    获取{{feature_name}}统计信息
    """
    try:
        service = {{FeatureName}}Service(db)
        statistics = await service.get_statistics(user_id=current_user.id)
        return success_response(data=statistics)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/search", response_model=List[{{FeatureName}}Response])
async def search_{{feature_name}}(
    q: str = Query(..., min_length=1, description="搜索关键词"),
    limit: int = Query(10, ge=1, le=50, description="返回结果数量"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    搜索{{feature_name}}
    
    - **q**: 搜索关键词
    - **limit**: 返回结果数量
    """
    try:
        service = {{FeatureName}}Service(db)
        results = await service.search(
            query=q,
            limit=limit,
            user_id=current_user.id
        )
        return success_response(data=results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{item_id}", response_model={{FeatureName}}Response)
async def get_{{feature_name}}_by_id(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    根据 ID 获取{{feature_name}}详情
    
    - **item_id**: {{feature_name}} ID
    """
    try:
        service = {{FeatureName}}Service(db)
        item = await service.get_by_id(item_id, user_id=current_user.id)
        if not item:
            raise HTTPException(status_code=404, detail="{{FeatureName}} not found")
        return success_response(data=item)
    except NotFoundError:
        raise HTTPException(status_code=404, detail="{{FeatureName}} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model={{FeatureName}}Response)
async def create_{{feature_name}}(
    item_data: {{FeatureName}}Create,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    创建新的{{feature_name}}
    
    - **item_data**: {{feature_name}}数据
    """
    try:
        service = {{FeatureName}}Service(db)
        item = await service.create(
            item_data=item_data,
            user_id=current_user.id
        )
        return success_response(data=item, message="{{FeatureName}} created successfully")
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{item_id}", response_model={{FeatureName}}Response)
async def update_{{feature_name}}(
    item_id: int,
    item_data: {{FeatureName}}Update,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    更新{{feature_name}}
    
    - **item_id**: {{feature_name}} ID
    - **item_data**: 更新数据
    """
    try:
        service = {{FeatureName}}Service(db)
        item = await service.update(
            item_id=item_id,
            item_data=item_data,
            user_id=current_user.id
        )
        if not item:
            raise HTTPException(status_code=404, detail="{{FeatureName}} not found")
        return success_response(data=item, message="{{FeatureName}} updated successfully")
    except NotFoundError:
        raise HTTPException(status_code=404, detail="{{FeatureName}} not found")
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{item_id}")
async def delete_{{feature_name}}(
    item_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    删除{{feature_name}}
    
    - **item_id**: {{feature_name}} ID
    """
    try:
        service = {{FeatureName}}Service(db)
        success = await service.delete(item_id, user_id=current_user.id)
        if not success:
            raise HTTPException(status_code=404, detail="{{FeatureName}} not found")
        return success_response(message="{{FeatureName}} deleted successfully")
    except NotFoundError:
        raise HTTPException(status_code=404, detail="{{FeatureName}} not found")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/bulk")
async def bulk_operation_{{feature_name}}(
    operation_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    批量操作{{feature_name}}
    
    - **operation_data**: 批量操作数据
    """
    try:
        service = {{FeatureName}}Service(db)
        result = await service.bulk_operation(
            operation_data=operation_data,
            user_id=current_user.id
        )
        return success_response(data=result, message="Bulk operation completed")
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/export")
async def export_{{feature_name}}(
    export_params: dict = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    导出{{feature_name}}数据
    
    - **export_params**: 导出参数
    """
    try:
        service = {{FeatureName}}Service(db)
        file_content = await service.export_data(
            export_params=export_params or {},
            user_id=current_user.id
        )
        
        from fastapi.responses import StreamingResponse
        import io
        
        # 返回 Excel 文件
        output = io.BytesIO(file_content)
        return StreamingResponse(
            io.BytesIO(file_content),
            media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            headers={"Content-Disposition": "attachment; filename={{feature_name}}_export.xlsx"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/import")
async def import_{{feature_name}}(
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    导入{{feature_name}}数据
    
    - **file**: 上传的文件
    """
    try:
        service = {{FeatureName}}Service(db)
        result = await service.import_data(
            file=file,
            user_id=current_user.id
        )
        return success_response(data=result, message="Data imported successfully")
    except ValidationError as e:
        raise HTTPException(status_code=422, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
