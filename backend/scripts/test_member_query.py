"""
测试会员查询功能，验证 UUID 关联是否正确
"""
import asyncio
import sys
import os

# 添加项目根目录到路径
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from src.common.modules.supabase.service import supabase_service


async def test_member_query():
    """测试会员查询"""
    print("=" * 60)
    print("测试会员查询功能")
    print("=" * 60)
    
    try:
        # 1. 测试获取会员列表（带分页）
        print("\n1. 测试获取会员列表（前5条）...")
        members, total = await supabase_service.list_members_with_filters(
            page=1,
            page_size=5
        )
        print(f"   总数: {total}")
        print(f"   返回数量: {len(members)}")
        
        if members:
            print("\n   会员信息（所有返回的会员）:")
            for i, member in enumerate(members, 1):
                member_id = member.get('id')
                print(f"\n   会员 {i}:")
                print(f"     ID: {member_id}")
                print(f"     公司名: {member.get('company_name')}")
                print(f"     邮箱: {member.get('email')}")
                
                # 检查是否有 profile
                profile = member.get('profile')
                if profile:
                    print(f"     ✓ 找到档案")
                    representative = profile.get('representative')
                    address = profile.get('address')
                    print(f"       代表: {representative if representative else '(空)'}")
                    print(f"       地址: {address if address else '(空)'}")
                    print(f"       行业: {profile.get('industry')}")
                    print(f"       地区: {profile.get('region')}")
                else:
                    print(f"     ✗ 未找到档案")
                
                # 检查提升到顶层的字段
                print(f"     顶层字段:")
                print(f"       代表: {member.get('representative') if member.get('representative') else '(空)'}")
                print(f"       地址: {member.get('address') if member.get('address') else '(空)'}")
        
        # 2. 测试批量查询 member_profiles
        if members:
            print("\n2. 测试批量查询 member_profiles...")
            member_ids = [str(m['id']) for m in members]
            print(f"   查询的 member_ids: {member_ids[:3]}...")
            
            profiles_result = supabase_service.client.table('member_profiles')\
                .select('*')\
                .in_('member_id', member_ids)\
                .execute()
            
            profiles = profiles_result.data or []
            print(f"   找到 {len(profiles)} 个档案")
            
            if profiles:
                print("\n   档案信息:")
                for i, profile in enumerate(profiles[:3], 1):
                    profile_member_id = profile.get('member_id')
                    print(f"\n   档案 {i}:")
                    print(f"     member_id: {profile_member_id} (类型: {type(profile_member_id)})")
                    print(f"     代表: {profile.get('representative')}")
                    print(f"     地址: {profile.get('address')}")
                    
                    # 检查是否能匹配
                    matching_member = next((m for m in members if str(m['id']) == str(profile_member_id)), None)
                    if matching_member:
                        print(f"     ✓ 成功匹配到会员: {matching_member.get('company_name')}")
                    else:
                        print(f"     ✗ 未能匹配到会员")
                        print(f"       尝试匹配的 IDs:")
                        for m in members[:3]:
                            print(f"         - {m['id']} (类型: {type(m['id'])})")
        
        # 3. 测试单个会员查询
        if members:
            print("\n3. 测试单个会员查询...")
            test_member_id = str(members[0]['id'])
            print(f"   查询 member_id: {test_member_id}")
            
            member, profile = await supabase_service.get_member_profile(test_member_id)
            
            if member:
                print(f"   ✓ 找到会员: {member.get('company_name')}")
                if profile:
                    print(f"   ✓ 找到档案: {profile.get('representative')}")
                else:
                    print(f"   ✗ 未找到档案")
            else:
                print(f"   ✗ 未找到会员")
        
        print("\n" + "=" * 60)
        print("测试完成")
        print("=" * 60)
        
    except Exception as e:
        print(f"\n❌ 测试失败: {e}")
        import traceback
        traceback.print_exc()


if __name__ == "__main__":
    asyncio.run(test_member_query())

