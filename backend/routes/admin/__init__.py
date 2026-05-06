from fastapi import APIRouter

from routes.admin.stock import router as stock_router
from routes.admin.orders import router as orders_router
from routes.admin.upload import router as upload_router

router = APIRouter()
router.include_router(stock_router)
router.include_router(orders_router)
router.include_router(upload_router)
