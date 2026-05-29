from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
import os

from routes.auth import router as auth_router
from routes.products import router as products_router
from routes.cart import router as cart_router
from routes.wishlist import router as wishlist_router
from routes.orders import router as orders_router
from routes.reviews import router as reviews_router
from routes.payments import router as payments_router
from routes.admin import router as admin_router

app = FastAPI()

# Create uploads directory if it doesn't exist (local dev fallback)
if not os.path.exists("uploads"):
    os.makedirs("uploads")

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:3001",
        "https://aksou.in",
        "https://www.aksou.in",
        "https://admin.aksou.in",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Root health check
@app.get("/api/")
async def root():
    return {"message": "NOIR API is running"}


# Mount routers
app.include_router(auth_router)
app.include_router(products_router)
app.include_router(cart_router)
app.include_router(wishlist_router)
app.include_router(orders_router)
app.include_router(reviews_router)
app.include_router(payments_router)
app.include_router(admin_router)

if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
