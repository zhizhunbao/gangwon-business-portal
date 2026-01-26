"""
{{FeatureName}} SQLAlchemy Model

@description {{description}}
@author {{author}}
@created {{date}}
"""

from sqlalchemy import Column, Integer, String, Text, DateTime, Boolean, ForeignKey, JSON
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from datetime import datetime

from src.core.database import Base


class {{FeatureName}}(Base):
    """
    {{FeatureName}} 模型
    
    描述: {{description}}
    """
    __tablename__ = "{{feature_name}}"

    # 主键
    id = Column(Integer, primary_key=True, index=True, comment="主键ID")
    
    # 基本字段
    name = Column(String(255), nullable=False, index=True, comment="名称")
    description = Column(Text, nullable=True, comment="描述")
    code = Column(String(100), unique=True, nullable=False, index=True, comment="编码")
    
    # 状态字段
    status = Column(
        String(20), 
        default="active", 
        nullable=False, 
        index=True,
        comment="状态: active, inactive, pending, completed, cancelled"
    )
    
    # 排序和显示
    sort_order = Column(Integer, default=0, nullable=False, comment="排序顺序")
    is_featured = Column(Boolean, default=False, nullable=False, comment="是否推荐")
    
    # 配置和元数据
    config = Column(JSON, nullable=True, comment="配置信息")
    metadata = Column(JSON, nullable=True, comment="元数据")
    
    # 外键关联
    created_by = Column(
        Integer, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True,
        index=True,
        comment="创建者ID"
    )
    updated_by = Column(
        Integer, 
        ForeignKey("users.id", ondelete="SET NULL"), 
        nullable=True,
        index=True,
        comment="更新者ID"
    )
    
    # 时间戳
    created_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(),
        nullable=False,
        index=True,
        comment="创建时间"
    )
    updated_at = Column(
        DateTime(timezone=True), 
        server_default=func.now(),
        onupdate=func.now(),
        nullable=False,
        comment="更新时间"
    )
    deleted_at = Column(
        DateTime(timezone=True), 
        nullable=True,
        index=True,
        comment="删除时间"
    )

    # 关系定义
    creator = relationship("User", foreign_keys=[created_by], back_populates="created_{{feature_name}}")
    updater = relationship("User", foreign_keys=[updated_by], back_populates="updated_{{feature_name}}")
    
    # 如果有其他关联关系，在这里添加
    # 例如: items = relationship("{{RelatedModel}}", back_populates="{{feature_name}}")

    def __repr__(self):
        return f"<{{FeatureName}}(id={self.id}, name='{self.name}', status='{self.status}')>"

    def to_dict(self):
        """转换为字典"""
        return {
            'id': self.id,
            'name': self.name,
            'description': self.description,
            'code': self.code,
            'status': self.status,
            'sort_order': self.sort_order,
            'is_featured': self.is_featured,
            'config': self.config,
            'metadata': self.metadata,
            'created_by': self.created_by,
            'updated_by': self.updated_by,
            'created_at': self.created_at.isoformat() if self.created_at else None,
            'updated_at': self.updated_at.isoformat() if self.updated_at else None,
            'deleted_at': self.deleted_at.isoformat() if self.deleted_at else None,
        }

    @property
    def is_active(self):
        """是否活跃"""
        return self.status == "active"

    @property
    def is_deleted(self):
        """是否已删除"""
        return self.deleted_at is not None

    def soft_delete(self):
        """软删除"""
        self.deleted_at = datetime.utcnow()
        self.status = "inactive"

    def restore(self):
        """恢复"""
        self.deleted_at = None
        self.status = "active"

    class Meta:
        # SQLAlchemy 配置
        ordering = ['-created_at']
        indexes = [
            ('name',),
            ('status', 'created_at'),
            ('code',),
            ('created_by',),
        ]
