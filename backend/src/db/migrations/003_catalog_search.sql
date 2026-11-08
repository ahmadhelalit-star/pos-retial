CREATE EXTENSION IF NOT EXISTS pg_trgm WITH SCHEMA public;
CREATE INDEX products_name_trigram ON products USING gin(name public.gin_trgm_ops);
CREATE INDEX products_sku_trigram ON products USING gin(sku public.gin_trgm_ops);
CREATE INDEX barcodes_search_trigram ON product_barcodes USING gin(barcode public.gin_trgm_ops);
