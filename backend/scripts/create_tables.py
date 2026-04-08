"""
Script to create PostgreSQL tables.
Run from the backend directory:
    python scripts/create_tables.py

This will create all tables defined in the ORM models.
Currently: users table for registration/auth.
"""

import asyncio
import sys
import os

# Add parent directory to path so imports work
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import pg_engine
from models.user_table import Base


async def create_all():
    print("Connecting to PostgreSQL...")
    async with pg_engine.begin() as conn:
        print("Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
    print("Done. Tables created:")
    for table_name in Base.metadata.tables:
        print(f"  - {table_name}")
    await pg_engine.dispose()


if __name__ == "__main__":
    asyncio.run(create_all())
