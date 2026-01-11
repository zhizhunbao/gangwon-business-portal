"""测试会员资料字段保存和读取"""
import asyncio
import os
import sys

# 添加项目路径
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from dotenv import load_dotenv
load_dotenv(os.path.join(os.path.dirname(__file__), '..', '.env.local'))

from src.common.modules.supabase.service import supabase_service


async def test_member_profile():
    # 获取一个测试会员
    result = supabase_service.client.table('members').select('*').limit(1).execute()
    
    if not result.data:
        print("❌ 没有找到会员数据")
        return
    
    member = result.data[0]
    member_id = member['id']
    
    print(f"📋 测试会员: {member['company_name']} (ID: {member_id})")
    print("\n--- 当前字段值 ---")
    
    test_fields = [
        'startup_type', 'ksic_major', 'ksic_sub', 'category',
        'participation_programs', 'investment_status',
        'cooperation_fields', 'representative_birth_date', 'representative_gender'
    ]
    
    for field in test_fields:
        value = member.get(field)
        print(f"  {field}: {value}")
    
    # 测试更新
    print("\n--- 测试更新 ---")
    test_data = {
        'startup_type': 'startup_under_3years',
        'ksic_major': 'C',
        'ksic_sub': '26',
        'category': 'tech',
        'participation_programs': '["startup_center_university", "global_business"]',
        'investment_status': '{"hasInvestment": true, "amount": "5000", "institution": "Test VC"}'
    }
    
    print(f"更新数据: {test_data}")
    
    updated = await supabase_service.update_member_profile(member_id, test_data)
    
    if updated:
        print("\n✅ 更新成功!")
        print("\n--- 更新后字段值 ---")
        for field in test_fields:
            value = updated.get(field)
            print(f"  {field}: {value}")
    else:
        print("❌ 更新失败")
    
    # 重新读取验证
    print("\n--- 重新读取验证 ---")
    member_after, profile_after = await supabase_service.get_member_profile(member_id)
    
    if profile_after:
        for field in test_fields:
            value = profile_after.get(field)
            print(f"  {field}: {value}")
    else:
        print("❌ 读取 profile 失败")


if __name__ == '__main__':
    asyncio.run(test_member_profile())
