-- ============================================================
-- seed.sql - Dados iniciais para desenvolvimento
-- IMPORTANTE: Rodar apenas no ambiente local/dev
-- ============================================================

-- PASSO 1: Criar usuário admin via Supabase Auth Dashboard ou:
-- curl -X POST 'https://SEU-PROJETO.supabase.co/auth/v1/admin/users' \
--   -H 'apikey: SERVICE_ROLE_KEY' \
--   -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
--   -d '{"email":"admin@reobotlabs.com","password":"Admin@123","user_metadata":{"full_name":"Admin ReobotLabs","role":"admin"}}'

-- Após criar o usuário admin, inserir um cliente de demonstração:
-- (Substitua 'UUID_DO_ADMIN' pelo ID real do usuário admin criado)

-- INSERT INTO public.clients (id, name, industry, notes, created_by) VALUES
--   ('11111111-1111-1111-1111-111111111111', 'Empresa Demo Ltda', 'E-commerce', 'Cliente de demonstração para testes', 'UUID_DO_ADMIN');

-- Criar usuário cliente via invite:
-- curl -X POST 'https://SEU-PROJETO.supabase.co/auth/v1/admin/invite' \
--   -H 'apikey: SERVICE_ROLE_KEY' \
--   -H 'Authorization: Bearer SERVICE_ROLE_KEY' \
--   -d '{"email":"cliente@empresademo.com","data":{"full_name":"João Cliente","role":"client"}}'

-- Após criar o usuário cliente e obter seu UUID:
-- INSERT INTO public.client_users (user_id, client_id) VALUES
--   ('UUID_DO_CLIENTE', '11111111-1111-1111-1111-111111111111');

-- Criar projeto de demonstração:
-- INSERT INTO public.projects (client_id, name, type, status, health, progress_percent,
--   next_steps, scope_definition, created_by) VALUES
--   ('11111111-1111-1111-1111-111111111111',
--    'Portal E-commerce',
--    'saas',
--    'active',
--    'green',
--    35,
--    'Finalizar desenvolvimento do módulo de carrinho esta semana.',
--    'O escopo inclui: homepage, catálogo de produtos, carrinho, checkout e área do cliente. NÃO inclui: integrações com marketplaces, app mobile.',
--    'UUID_DO_ADMIN');

-- As fases serão criadas automaticamente pela aplicação com base no PHASE_TEMPLATES
-- quando o projeto for criado pela interface.
