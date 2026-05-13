/* add plus column to order_products */
ALTER TABLE order_products
ADD COLUMN IF NOT EXISTS price NUMERIC(10,2) NOT NULL DEFAULT 0;