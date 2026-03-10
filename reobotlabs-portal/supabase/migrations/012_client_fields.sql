-- ============================================================
-- 012_client_fields.sql
-- Campos adicionais para a tabela de clientes
-- ============================================================

ALTER TABLE public.clients
  ADD COLUMN IF NOT EXISTS cnpj                TEXT,
  ADD COLUMN IF NOT EXISTS contact_email       TEXT,
  ADD COLUMN IF NOT EXISTS contact_phone       TEXT,
  ADD COLUMN IF NOT EXISTS address             TEXT,
  ADD COLUMN IF NOT EXISTS address_number      TEXT,
  ADD COLUMN IF NOT EXISTS address_complement  TEXT,
  ADD COLUMN IF NOT EXISTS address_neighborhood TEXT,
  ADD COLUMN IF NOT EXISTS address_city        TEXT,
  ADD COLUMN IF NOT EXISTS address_state       TEXT,
  ADD COLUMN IF NOT EXISTS address_zip         TEXT,
  ADD COLUMN IF NOT EXISTS entry_date          DATE;
