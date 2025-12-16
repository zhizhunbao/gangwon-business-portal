"""
测试 API 返回的数据格式，验证 representative 和 address 字段
"""
import asyncio
import sys
import os
import json

# 添加项目根目录到路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.modules.member.service import MemberService
from src.modules.member.schemas import MemberListQuery


async def test_api_response():
    """测试 API 返回的数据格式"""
    print("=" * 60)
    print("测试 API 返回的数据格式")
    print("=" * 60)
    
    try:
        member_service = MemberService()
        
        # 1. 测试 list_members 方法
        print("\n1. 测试 list_members 方法...")
        query = MemberListQuery(
            page=1,
            page_size=5
        )
        
        members, total = await member_service.list_members(query)
        
        print(f"   总数: {total}")
        print(f"   返回数量: {len(members)}")
        
        if members:
            print("\n   会员数据（原始格式）:")
            for i, member in enumerate(members[:3], 1):
                print(f"\n   会员 {i}:")
                print(f"     ID: {member.get('id')}")
                print(f"     公司名: {member.get('company_name')}")
                print(f"     representative (原始): {member.get('representative')}")
                print(f"     address (原始): {member.get('address')}")
                print(f"     profile (原始): {member.get('profile')}")
                
                # 检查字段是否存在
                has_representative = 'representative' in member
                has_address = 'address' in member
                print(f"     ✓ representative 字段存在: {has_representative}")
                print(f"     ✓ address 字段存在: {has_address}")
                
                if member.get('representative'):
                    print(f"     ✓ representative 有值: {member.get('representative')}")
                else:
                    print(f"     ✗ representative 为空或 None")
                
                if member.get('address'):
                    print(f"     ✓ address 有值: {member.get('address')}")
                else:
                    print(f"     ✗ address 为空或 None")
        
        # 2. 测试 router 返回的格式（模拟）
        print("\n2. 模拟 router 返回格式...")
        if members:
            from uuid import UUID
            from math import ceil
            
            # 模拟 router.py 中的处理
            items = []
            for m in members[:3]:
                item = {
                    "id": str(UUID(m["id"])),
                    "business_number": m["business_number"],
                    "company_name": m["company_name"],
                    "email": m["email"],
                    "status": m["status"],
                    "approval_status": m["approval_status"],
                    "industry": m.get("industry") or (m.get("profile", {}).get("industry") if m.get("profile") else None),
                    "representative": m.get("representative"),
                    "address": m.get("address"),
                    "created_at": m.get("created_at"),
                }
                items.append(item)
            
            print(f"   返回的 items 数量: {len(items)}")
            for i, item in enumerate(items, 1):
                print(f"\n   Item {i}:")
                print(f"     id: {item.get('id')}")
                print(f"     company_name: {item.get('company_name')}")
                print(f"     representative: {item.get('representative')}")
                print(f"     address: {item.get('address')}")
                print(f"     industry: {item.get('industry')}")
                
                # JSON 序列化测试
                try:
                    json_str = json.dumps(item, default=str, ensure_ascii=False)
                    print(f"     ✓ JSON 序列化成功")
                except Exception as e:
                    print(f"     ✗ JSON 序列化失败: {e}")
        
        print("\n" + "=" * 60)
        print("测试完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_api_response())

