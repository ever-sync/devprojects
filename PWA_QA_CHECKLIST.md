# PWA QA Checklist — ReobotLabs Portal

Data: 2026-05-02

## Pré-condições
- Build de produção concluído.
- App rodando em modo produção (`npm run build && npm run start`).
- Acesso via navegador compatível (Chrome/Edge/Safari).

## Instalação
1. Abrir `/dashboard`.
2. Verificar se aparece o card "Instalar app".
3. Clicar em `Instalar`.
4. Confirmar que o app abre em janela standalone.

## Manifest
1. DevTools > Application > Manifest.
2. Validar:
- Name: `ReobotLabs Portal`
- Short name: `Reobot`
- Start URL: `/dashboard`
- Display: `standalone`
- Ícones 192 e 512 carregados

## Service Worker
1. DevTools > Application > Service Workers.
2. Confirmar `sw.js` ativo e escopo `/`.
3. Confirmar que cache `reobot-pwa-v1` foi criado.

## Offline fallback
1. Com app aberto, desligar rede em DevTools (Offline).
2. Recarregar rota (ex.: `/dashboard`).
3. Confirmar render da página `/offline`.
4. Voltar rede e validar retorno ao fluxo normal.

## Regressão rápida
1. Login continua funcionando.
2. Navegação interna continua funcionando.
3. Toasts e comandos principais sem erro no console.

## Critério de aceite
- Instalação funcional
- SW registrado em produção
- Fallback offline funcional
- Sem regressão visível no login e dashboard
