-- ============================================================
-- 013_meeting_minutes.sql
-- Ata e resumo IA para reuniões
-- ============================================================

ALTER TABLE public.meetings
  ADD COLUMN IF NOT EXISTS minutes           TEXT,      -- Ata da reunião
  ADD COLUMN IF NOT EXISTS minutes_summary   TEXT;      -- Resumo gerado por IA
