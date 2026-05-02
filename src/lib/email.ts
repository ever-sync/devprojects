import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

const FROM_EMAIL = process.env.RESEND_FROM_EMAIL ?? 'noreply@reobotlabs.com.br'

export interface SendEmailOptions {
  to: string | string[]
  subject: string
  html: string
  text?: string
  attachments?: Array<{
    filename: string
    content: Buffer | string
    contentType?: string
  }>
}

export async function sendEmail({ to, subject, html, text, attachments }: SendEmailOptions) {
  if (!process.env.RESEND_API_KEY) {
    console.error('[email] RESEND_API_KEY não configurada')
    return { error: 'Serviço de email não configurado' }
  }

  const { data, error } = await resend.emails.send({
    from: FROM_EMAIL,
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    attachments,
  })

  if (error) {
    console.error('[email] Erro ao enviar:', error)
    return { error: error.message }
  }

  return { data, error: null }
}

export function buildStatusReportEmail(params: {
  clientName: string
  projectName: string
  periodStart: string
  periodEnd: string
  contentMarkdown: string
  highlights: string[]
  nextSteps: string[]
  portalUrl?: string
}) {
  const { clientName, projectName, periodStart, periodEnd, contentMarkdown, highlights, nextSteps, portalUrl } = params

  const highlightItems = highlights.map((h) => `<li style="margin-bottom:6px">${h}</li>`).join('')
  const nextStepItems = nextSteps.map((s) => `<li style="margin-bottom:6px">${s}</li>`).join('')

  const html = `
<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="font-family:sans-serif;color:#1a1a1a;background:#f9f9f9;margin:0;padding:0">
  <div style="max-width:600px;margin:32px auto;background:#fff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,.08)">
    <div style="background:#0f172a;padding:32px 40px">
      <p style="color:#94a3b8;margin:0 0 4px;font-size:13px">Relatório de Status</p>
      <h1 style="color:#fff;margin:0;font-size:24px">${projectName}</h1>
      <p style="color:#64748b;margin:8px 0 0;font-size:13px">Período: ${periodStart} — ${periodEnd}</p>
    </div>

    <div style="padding:32px 40px">
      <p style="margin:0 0 24px">Olá <strong>${clientName}</strong>,</p>
      <p style="margin:0 0 24px;color:#475569">Segue abaixo o relatório de status do período.</p>

      ${highlights.length > 0 ? `
      <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a">✅ Destaques do Período</h2>
      <ul style="margin:0 0 24px;padding-left:20px;color:#475569">${highlightItems}</ul>
      ` : ''}

      <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a">📋 Resumo Detalhado</h2>
      <div style="background:#f8fafc;border-radius:8px;padding:20px;margin-bottom:24px;color:#334155;font-size:14px;line-height:1.7;white-space:pre-wrap">${contentMarkdown}</div>

      ${nextSteps.length > 0 ? `
      <h2 style="font-size:16px;margin:0 0 12px;color:#0f172a">🎯 Próximos Passos</h2>
      <ul style="margin:0 0 24px;padding-left:20px;color:#475569">${nextStepItems}</ul>
      ` : ''}

      ${portalUrl ? `
      <div style="text-align:center;margin:32px 0">
        <a href="${portalUrl}" style="background:#0f172a;color:#fff;text-decoration:none;padding:12px 28px;border-radius:8px;font-size:14px;font-weight:600">
          Ver no Portal do Cliente
        </a>
      </div>
      ` : ''}
    </div>

    <div style="background:#f1f5f9;padding:20px 40px;text-align:center;color:#94a3b8;font-size:12px">
      <p style="margin:0">ReobotLabs · Este é um email automático, não responda diretamente.</p>
    </div>
  </div>
</body>
</html>`

  return { html }
}
