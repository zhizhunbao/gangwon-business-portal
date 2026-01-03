"""
检查数据库日志的脚本
"""
from sqlalchemy import create_engine, text

engine = create_engine('postgresql://postgres.qxvqnrdhxfseywznqjjr:b7QhGDTHyyFQ%25As@aws-1-ca-central-1.pooler.supabase.com:5432/postgres')

with engine.connect() as conn:
    result = conn.execute(text("""
        SELECT created_at, source, module, file_path, message
        FROM app_logs 
        WHERE source = 'frontend'
        ORDER BY created_at DESC
        LIMIT 10
    """))
    print('最近的前端日志:')
    for row in result:
        fp = row[3] if row[3] else 'NULL'
        print(f'{row[0]} | {row[2]} | {fp} | {row[4][:40]}')
