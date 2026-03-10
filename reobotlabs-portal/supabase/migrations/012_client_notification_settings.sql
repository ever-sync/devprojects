-- Add notification settings to clients table
ALTER TABLE public.clients
ADD COLUMN notification_settings JSONB NOT NULL DEFAULT '{
  "delivery_date_email": true,
  "delivery_date_whatsapp": false,
  "status_change_email": true,
  "status_change_whatsapp": false
}'::jsonb;

-- Comment for clarity
COMMENT ON COLUMN public.clients.notification_settings IS 'Settings for client notifications (email, whatsapp, etc.)';
