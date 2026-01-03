import asyncio
import sys
sys.path.insert(0, '.')
from src.common.modules.db.session import engine
from sqlalchemy import text

async def check():
    async with engine.connect() as conn:
        result = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'app_logs' ORDER BY ordinal_position"))
        print("app_logs columns:", [r[0] for r in result.fetchall()])

asyncio.run(check())
