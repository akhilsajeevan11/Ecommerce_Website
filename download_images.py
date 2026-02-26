import asyncio
import os
import shutil
import re
import httpx
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv("backend/.env")

MONGO_URL = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
DB_NAME = os.getenv("DATABASE_NAME", "noir_db")
IMAGES_DIR = "images"
LOCAL_UPLOADS = "backend/uploads"


def slugify(name):
    """Convert product name to a filename-friendly slug."""
    return re.sub(r'[^a-z0-9]+', '_', name.lower()).strip('_')


async def main():
    client = AsyncIOMotorClient(MONGO_URL)
    db = client[DB_NAME]

    products = await db.products.find().to_list(1000)
    print(f"Found {len(products)} products in MongoDB\n")

    async with httpx.AsyncClient(follow_redirects=True, timeout=30) as http:
        for product in products:
            name = product.get("name", "unknown")
            category = product.get("category", "Uncategorized")
            images = product.get("images", [])

            # Create category folder
            category_dir = os.path.join(IMAGES_DIR, category)
            os.makedirs(category_dir, exist_ok=True)

            for i, img_url in enumerate(images):
                slug = slugify(name)
                ext = ".jpg"
                suffix = f"_{i+1}" if i > 0 else ""
                filename = f"{slug}{suffix}{ext}"
                dest_path = os.path.join(category_dir, filename)

                if os.path.exists(dest_path):
                    print(f"  ✓ Already exists: {dest_path}")
                    continue

                # Check if it's a local URL (localhost) — copy from uploads
                if "localhost" in img_url:
                    # Extract filename from URL like http://localhost:8000/uploads/classic_black_tee.jpg
                    url_filename = img_url.split("/")[-1]
                    local_path = os.path.join(LOCAL_UPLOADS, url_filename)
                    if os.path.exists(local_path):
                        shutil.copy2(local_path, dest_path)
                        print(f"  ✓ Copied local: {dest_path}")
                    else:
                        print(f"  ✗ Local file not found: {local_path}")
                else:
                    # Download from remote URL (Unsplash etc.)
                    try:
                        resp = await http.get(img_url)
                        if resp.status_code == 200:
                            with open(dest_path, "wb") as f:
                                f.write(resp.content)
                            print(f"  ✓ Downloaded: {dest_path}")
                        else:
                            print(f"  ✗ HTTP {resp.status_code}: {img_url}")
                    except Exception as e:
                        print(f"  ✗ Error downloading {img_url}: {e}")

    client.close()
    print(f"\nDone! Images organized in ./{IMAGES_DIR}/")


if __name__ == "__main__":
    asyncio.run(main())
