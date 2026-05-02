-- Permite WhatsApp Business (Evolution API) como tipo oficial de integracao externa
ALTER TABLE external_integrations
  DROP CONSTRAINT IF EXISTS external_integrations_service_type_check;

ALTER TABLE external_integrations
  ADD CONSTRAINT external_integrations_service_type_check
  CHECK (service_type IN ('zapier', 'n8n', 'make', 'slack', 'discord', 'whatsapp', 'email', 'custom'));
