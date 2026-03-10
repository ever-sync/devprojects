/**
 * Sends an event to n8n outbound webhook so n8n can trigger WhatsApp/email notifications.
 * Fails silently — never blocks the main operation.
 */
export async function triggerN8nEvent(payload: {
  event: string
  projectId?: string
  taskId?: string
  userId?: string
  data?: Record<string, unknown>
}) {
  const webhookUrl = process.env.N8N_OUTBOUND_WEBHOOK_URL
  if (!webhookUrl) return

  try {
    await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(process.env.N8N_WEBHOOK_SECRET
          ? { Authorization: `Bearer ${process.env.N8N_WEBHOOK_SECRET}` }
          : {}),
      },
      body: JSON.stringify(payload),
    })
  } catch {
    // Silent fail — notification is non-critical
  }
}
