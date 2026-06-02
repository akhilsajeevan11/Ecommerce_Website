-- ============================================================
-- Migration: 20250409_extend_products_querying
-- Spec: storefront-experience-redesign (Task 4.1)
-- Requirement: 7.12 — Categories_API exposes a nullable image_url
--
-- Adds an optional `image_url` column to `categories` so the
-- Shop_By_Category tile section can show a CMS-curated image
-- per category (with a fallback to the first product image
-- when this column is NULL).
--
-- Idempotent: safe to re-run.
-- ============================================================

ALTER TABLE categories
    ADD COLUMN IF NOT EXISTS image_url TEXT NULL;
