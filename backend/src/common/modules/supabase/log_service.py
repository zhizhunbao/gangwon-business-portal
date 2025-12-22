"""
Log management service.

Handles all log-related database operations including audit logs, app logs,
error logs, system logs, and performance logs.
"""
from typing import Dict, Any, List, Optional, Tuple
from datetime import datetime, timezone, timedelta
from .base_service import BaseSupabaseService


class LogService(BaseSupabaseService):
    """Service for log management operations."""
    
    # ============================================================================
    # Audit Log Operations
    # ============================================================================
    
    async def create_audit_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建审计日志"""
        result = self.client.table('audit_logs')\
            .insert(log_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create audit log: no data returned")
        return result.data[0]
    
    async def get_audit_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        user_id: Optional[str] = None,
        action: Optional[str] = None,
        resource_type: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取审计日志"""
        filters = {}
        if user_id:
            filters['user_id'] = user_id
        if action:
            filters['action'] = action
        if resource_type:
            filters['resource_type'] = resource_type
        
        total = await self.count_records('audit_logs', filters)
        
        query = self.client.table('audit_logs').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        if start_date:
            query = query.gte('created_at', start_date)
        if end_date:
            query = query.lte('created_at', end_date)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # App Log Operations
    # ============================================================================
    
    async def create_app_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建应用日志"""
        result = self.client.table('app_logs')\
            .insert(log_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create app log: no data returned")
        return result.data[0]
    
    async def get_app_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        source: Optional[str] = None,
        level: Optional[str] = None,
        layer: Optional[str] = None,
        trace_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取应用日志"""
        filters = {}
        if source:
            filters['source'] = source
        if level:
            filters['level'] = level
        if layer:
            filters['layer'] = layer
        if trace_id:
            filters['trace_id'] = trace_id
        
        total = await self.count_records('app_logs', filters)
        
        query = self.client.table('app_logs').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        if start_date:
            query = query.gte('created_at', start_date)
        if end_date:
            query = query.lte('created_at', end_date)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # Error Log Operations
    # ============================================================================
    
    async def create_error_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建错误日志"""
        result = self.client.table('error_logs')\
            .insert(log_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create error log: no data returned")
        return result.data[0]
    
    async def get_error_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        source: Optional[str] = None,
        error_type: Optional[str] = None,
        status_code: Optional[int] = None,
        trace_id: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取错误日志"""
        filters = {}
        if source:
            filters['source'] = source
        if error_type:
            filters['error_type'] = error_type
        if status_code:
            filters['status_code'] = status_code
        if trace_id:
            filters['trace_id'] = trace_id
        
        total = await self.count_records('error_logs', filters)
        
        query = self.client.table('error_logs').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        if start_date:
            query = query.gte('created_at', start_date)
        if end_date:
            query = query.lte('created_at', end_date)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # System Log Operations
    # ============================================================================
    
    async def create_system_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建系统日志"""
        result = self.client.table('system_logs')\
            .insert(log_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create system log: no data returned")
        return result.data[0]
    
    async def get_system_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        level: Optional[str] = None,
        logger_name: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取系统日志"""
        filters = {}
        if level:
            filters['level'] = level
        if logger_name:
            filters['logger_name'] = logger_name
        
        total = await self.count_records('system_logs', filters)
        
        query = self.client.table('system_logs').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        if start_date:
            query = query.gte('created_at', start_date)
        if end_date:
            query = query.lte('created_at', end_date)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # Performance Log Operations
    # ============================================================================
    
    async def create_performance_log(self, log_data: Dict[str, Any]) -> Dict[str, Any]:
        """创建性能日志"""
        result = self.client.table('performance_logs')\
            .insert(log_data)\
            .execute()
        if not result.data:
            raise ValueError("Failed to create performance log: no data returned")
        return result.data[0]
    
    async def get_performance_logs(
        self,
        limit: int = 100,
        offset: int = 0,
        source: Optional[str] = None,
        metric_name: Optional[str] = None,
        component_name: Optional[str] = None,
        performance_issue: Optional[str] = None,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None
    ) -> Tuple[List[Dict[str, Any]], int]:
        """获取性能日志"""
        filters = {}
        if source:
            filters['source'] = source
        if metric_name:
            filters['metric_name'] = metric_name
        if component_name:
            filters['component_name'] = component_name
        if performance_issue:
            filters['performance_issue'] = performance_issue
        
        total = await self.count_records('performance_logs', filters)
        
        query = self.client.table('performance_logs').select('*')
        
        for key, value in filters.items():
            query = query.eq(key, value)
        
        if start_date:
            query = query.gte('created_at', start_date)
        if end_date:
            query = query.lte('created_at', end_date)
        
        query = query.order('created_at', desc=True)\
                    .range(offset, offset + limit - 1)
        
        result = query.execute()
        return result.data or [], total
    
    # ============================================================================
    # Log Analytics and Statistics
    # ============================================================================
    
    async def get_error_statistics(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        group_by: str = 'error_type'
    ) -> List[Dict[str, Any]]:
        """获取错误统计信息"""
        # This would typically use a more complex query or aggregation
        # For now, we'll use a simple approach
        query = self.client.table('error_logs').select('error_type, source')
        
        if start_date:
            query = query.gte('created_at', start_date)
        if end_date:
            query = query.lte('created_at', end_date)
        
        result = query.execute()
        
        # Simple client-side aggregation
        stats = {}
        for log in result.data or []:
            key = log.get(group_by, 'unknown')
            if key not in stats:
                stats[key] = {'count': 0, 'type': key}
            stats[key]['count'] += 1
        
        return list(stats.values())
    
    async def get_performance_metrics_summary(
        self,
        start_date: Optional[str] = None,
        end_date: Optional[str] = None,
        metric_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """获取性能指标摘要"""
        query = self.client.table('performance_logs').select('metric_name, metric_value, metric_unit')
        
        if start_date:
            query = query.gte('created_at', start_date)
        if end_date:
            query = query.lte('created_at', end_date)
        if metric_name:
            query = query.eq('metric_name', metric_name)
        
        result = query.execute()
        
        # Simple client-side aggregation
        metrics = {}
        for log in result.data or []:
            name = log.get('metric_name', 'unknown')
            value = log.get('metric_value', 0)
            
            if name not in metrics:
                metrics[name] = {
                    'name': name,
                    'unit': log.get('metric_unit', 'ms'),
                    'count': 0,
                    'total': 0,
                    'min': float('inf'),
                    'max': 0
                }
            
            metrics[name]['count'] += 1
            metrics[name]['total'] += value
            metrics[name]['min'] = min(metrics[name]['min'], value)
            metrics[name]['max'] = max(metrics[name]['max'], value)
        
        # Calculate averages
        for metric in metrics.values():
            if metric['count'] > 0:
                metric['average'] = metric['total'] / metric['count']
            else:
                metric['average'] = 0
        
        return {
            'metrics': list(metrics.values()),
            'summary': {
                'total_records': len(result.data or []),
                'unique_metrics': len(metrics)
            }
        }
    
    # ============================================================================
    # Log Cleanup Operations
    # ============================================================================
    
    async def cleanup_old_logs(
        self,
        table_name: str,
        days_to_keep: int = 30
    ) -> int:
        """清理旧日志记录"""
        cutoff_date = datetime.now(timezone.utc) - timedelta(days=days_to_keep)
        cutoff_str = cutoff_date.isoformat()
        
        # Count records to be deleted
        count_result = self.client.table(table_name)\
            .select('*', count='exact')\
            .lt('created_at', cutoff_str)\
            .execute()
        
        deleted_count = count_result.count or 0
        
        # Delete old records
        if deleted_count > 0:
            self.client.table(table_name)\
                .delete()\
                .lt('created_at', cutoff_str)\
                .execute()
        
        return deleted_count