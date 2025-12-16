"""
测试 API 返回的 JSON 格式，验证字段名是否正确
"""
import asyncio
import sys
import os
import json

# 添加项目根目录到路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.modules.member.service import MemberService
from src.modules.member.schemas import MemberListQuery
from src.modules.member.router import list_members
from fastapi import Request
from unittest.mock import MagicMock


async def test_json_response():
    """测试 JSON 响应格式"""
    print("=" * 60)
    print("测试 API JSON 响应格式")
    print("=" * 60)
    
    try:
        member_service = MemberService()
        
        # 1. 测试 service 层返回的数据
        print("\n1. 测试 service 层返回的数据...")
        query = MemberListQuery(page=1, page_size=3)
        members, total = await member_service.list_members(query)
        
        if members:
            print(f"   返回 {len(members)} 个会员")
            first_member = members[0]
            print(f"\n   第一个会员的字段:")
            print(f"     id: {first_member.get('id')}")
            print(f"     company_name: {first_member.get('company_name')}")
            print(f"     representative: {first_member.get('representative')} (类型: {type(first_member.get('representative'))})")
            print(f"     address: {first_member.get('address')} (类型: {type(first_member.get('address'))})")
            print(f"     所有字段: {list(first_member.keys())}")
        
        # 2. 测试 router 返回的 Pydantic 模型
        print("\n2. 测试 router 返回的 Pydantic 模型...")
        from src.modules.member.router import router
        from src.modules.user.dependencies import get_current_admin_user
        
        # 模拟请求和用户
        mock_request = MagicMock(spec=Request)
        mock_user = {
            "id": "test-admin-id",
            "email": "admin@test.com",
            "role": "admin"
        }
        
        # 模拟依赖
        async def mock_admin_user():
            return mock_user
        
        # 直接调用 service 然后构造响应
        from uuid import UUID
        from math import ceil
        
        members, total = await member_service.list_members(query)
        
        response_items = []
        for m in members[:3]:
            from src.modules.member.schemas import MemberListResponse
            item = MemberListResponse(
                id=UUID(m["id"]),
                business_number=m["business_number"],
                company_name=m["company_name"],
                email=m["email"],
                status=m["status"],
                approval_status=m["approval_status"],
                industry=m.get("industry") or (m.get("profile", {}).get("industry") if m.get("profile") else None),
                representative=m.get("representative"),
                address=m.get("address"),
                created_at=m.get("created_at"),
            )
            response_items.append(item)
        
        # 转换为字典（模拟 FastAPI 的序列化）
        for i, item in enumerate(response_items[:1], 1):
            item_dict = item.model_dump()
            print(f"\n   Item {i} (model_dump):")
            print(f"     representative: {item_dict.get('representative')} (类型: {type(item_dict.get('representative'))})")
            print(f"     address: {item_dict.get('address')} (类型: {type(item_dict.get('address'))})")
            print(f"     所有字段: {list(item_dict.keys())}")
            
            # JSON 序列化测试
            json_str = json.dumps(item_dict, default=str, ensure_ascii=False)
            print(f"\n   JSON 字符串:")
            print(f"     {json_str[:200]}...")
            
            # 反序列化测试
            parsed = json.loads(json_str)
            print(f"\n   解析后的 JSON:")
            print(f"     representative: {parsed.get('representative')} (类型: {type(parsed.get('representative'))})")
            print(f"     address: {parsed.get('address')} (类型: {type(parsed.get('address'))})")
        
        print("\n" + "=" * 60)
        print("测试完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_json_response())

