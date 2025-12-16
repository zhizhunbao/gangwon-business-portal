"""
检查 member_profiles 表中的 representative 和 address 字段
"""
import asyncio
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from src.common.modules.supabase.service import supabase_service


async def check_member_profiles():
    """检查 member_profiles 表中的数据"""
    print("正在查询 member_profiles 表...")
    
    # 获取所有 member_profiles
    result = supabase_service.client.table('member_profiles')\
        .select('member_id, representative, address, industry, region')\
        .limit(20)\
        .execute()
    
    profiles = result.data or []
    
    if not profiles:
        print("❌ member_profiles 表中没有数据")
        return
    
    print(f"\n找到 {len(profiles)} 条记录（显示前20条）:\n")
    print("-" * 100)
    print(f"{'Member ID':<40} {'Representative':<20} {'Address':<30} {'Industry':<15} {'Region':<15}")
    print("-" * 100)
    
    null_representative_count = 0
    null_address_count = 0
    has_data_count = 0
    
    for profile in profiles:
        member_id = str(profile.get('member_id', ''))[:36]
        representative = profile.get('representative') or 'NULL'
        address = profile.get('address') or 'NULL'
        industry = profile.get('industry') or 'NULL'
        region = profile.get('region') or 'NULL'
        
        if representative == 'NULL':
            null_representative_count += 1
        if address == 'NULL':
            null_address_count += 1
        if representative != 'NULL' and address != 'NULL':
            has_data_count += 1
        
        # 截断长字符串以便显示
        representative_display = representative[:18] if representative != 'NULL' else 'NULL'
        address_display = address[:28] if address != 'NULL' else 'NULL'
        industry_display = (industry or 'NULL')[:13]
        region_display = (region or 'NULL')[:13]
        
        print(f"{member_id:<40} {representative_display:<20} {address_display:<30} {industry_display:<15} {region_display:<15}")
    
    print("-" * 100)
    print(f"\n统计:")
    print(f"  总记录数: {len(profiles)}")
    print(f"  representative 为 NULL: {null_representative_count} ({null_representative_count/len(profiles)*100:.1f}%)")
    print(f"  address 为 NULL: {null_address_count} ({null_address_count/len(profiles)*100:.1f}%)")
    print(f"  两者都有数据: {has_data_count} ({has_data_count/len(profiles)*100:.1f}%)")
    
    # 检查是否有 member 没有对应的 profile
    members_result = supabase_service.client.table('members')\
        .select('id')\
        .limit(100)\
        .execute()
    
    members = members_result.data or []
    member_ids_with_profile = {str(p.get('member_id')) for p in profiles}
    member_ids = {str(m.get('id')) for m in members}
    members_without_profile = member_ids - member_ids_with_profile
    
    if members_without_profile:
        print(f"\n⚠️  有 {len(members_without_profile)} 个会员没有对应的 member_profiles 记录")
        print(f"   前5个会员ID: {list(members_without_profile)[:5]}")


if __name__ == "__main__":
    asyncio.run(check_member_profiles())

