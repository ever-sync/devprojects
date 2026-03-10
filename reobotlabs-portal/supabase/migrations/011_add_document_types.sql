-- ============================================================
-- 011_add_document_types.sql
-- Add invoice and boleto to the document_type enum.
-- ============================================================

ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'invoice';
ALTER TYPE public.document_type ADD VALUE IF NOT EXISTS 'boleto';
