from fastapi import APIRouter, HTTPException, Depends
from datetime import datetime, timedelta, timezone

from sqlalchemy import select, func, case
from sqlalchemy.orm import selectinload

from config import PgSession
from dependencies import get_current_user
from models.ecommerce import Product, Category, Order, OrderItem

router = APIRouter(prefix="/api/admin/stock", tags=["admin-stock"])


@router.get("/summary")
async def get_stock_summary(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        # Total stock, total products, out of stock count
        summary_stmt = select(
            func.coalesce(func.sum(Product.stock), 0).label("total_stock"),
            func.count(Product.id).label("total_products"),
            func.count(case((Product.stock == 0, 1))).label("out_of_stock_count"),
        )
        result = await session.execute(summary_stmt)
        row = result.one()
        total_stock = int(row.total_stock)
        total_products = int(row.total_products)
        out_of_stock_count = int(row.out_of_stock_count)

        # Dead stock: products not ordered in last 30 days
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)
        ordered_stmt = (
            select(OrderItem.product_id)
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                Order.created_at >= thirty_days_ago,
                Order.status != "cancelled",
            )
            .distinct()
        )
        ordered_result = await session.execute(ordered_stmt)
        ordered_product_ids = {r[0] for r in ordered_result.all()}

        all_products_stmt = select(Product.id)
        all_result = await session.execute(all_products_stmt)
        all_product_ids = {r[0] for r in all_result.all()}

        dead_stock_count = len(all_product_ids - ordered_product_ids)

        return {
            "total_stock": total_stock,
            "total_products": total_products,
            "dead_stock_count": dead_stock_count,
            "out_of_stock_count": out_of_stock_count,
        }


@router.get("/by-product")
async def get_stock_by_product(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        stmt = (
            select(Product)
            .options(selectinload(Product.category_rel))
            .order_by(Product.stock.desc())
        )
        result = await session.execute(stmt)
        products = result.scalars().all()
        return [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category_rel.name if p.category_rel else None,
                "stock": p.stock,
                "price": float(p.price),
            }
            for p in products
        ]


@router.get("/by-category")
async def get_stock_by_category(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        stmt = (
            select(
                Category.name.label("category"),
                func.coalesce(func.sum(Product.stock), 0).label("total_stock"),
            )
            .join(Product, Product.category_id == Category.id)
            .group_by(Category.name)
        )
        result = await session.execute(stmt)
        rows = result.all()
        return [{"category": row.category, "total_stock": int(row.total_stock)} for row in rows]


@router.get("/dead-stock")
async def get_dead_stock(current_user=Depends(get_current_user)):
    if not current_user.get("is_admin"):
        raise HTTPException(status_code=403, detail="Admin access required")

    async with PgSession() as session:
        thirty_days_ago = datetime.now(timezone.utc) - timedelta(days=30)

        # Get product IDs that have been ordered in last 30 days
        ordered_stmt = (
            select(OrderItem.product_id)
            .join(Order, OrderItem.order_id == Order.id)
            .where(
                Order.created_at >= thirty_days_ago,
                Order.status != "cancelled",
            )
            .distinct()
        )
        ordered_result = await session.execute(ordered_stmt)
        ordered_product_ids = [r[0] for r in ordered_result.all()]

        # Get products NOT in that list
        if ordered_product_ids:
            stmt = (
                select(Product)
                .options(selectinload(Product.category_rel))
                .where(Product.id.notin_(ordered_product_ids))
            )
        else:
            stmt = select(Product).options(selectinload(Product.category_rel))

        result = await session.execute(stmt)
        products = result.scalars().all()
        return [
            {
                "id": p.id,
                "name": p.name,
                "category": p.category_rel.name if p.category_rel else None,
                "stock": p.stock,
                "price": float(p.price),
            }
            for p in products
        ]
