/* add plus column to products */

ALTER TABLE products
ADD COLUMN IF NOT EXISTS thumbnail TEXT,
ADD COLUMN IF NOT EXISTS description TEXT;