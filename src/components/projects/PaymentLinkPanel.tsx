'use client'

import { useState, useTransition } from 'react'
import { toast } from 'sonner'
import { updateMilestonePayment, confirmMilestonePayment, type PaymentMethod } from '@/actions/payments'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Copy, CreditCard, ExternalLink, QrCode, CheckCircle2, Link } from 'lucide-react'

interface Milestone {
  id: string
  description: string
  amount: number
  status: string
  payment_method?: string | null
  payment_link?: string | null
  payment_instructions?: string | null
  paid_at?: string | null
}

interface PaymentLinkPanelProps {
  milestone: Milestone
  projectId: string
}

const METHOD_LABELS: Record<string, string> = {
  pix: 'Pix',
  boleto: 'Boleto',
  credit_card: 'Cartão de crédito',
  transfer: 'Transferência',
  other: 'Outro',
}

const METHOD_ICONS: Record<string, React.ReactNode> = {
  pix: <QrCode className="h-4 w-4" />,
  boleto: <CreditCard className="h-4 w-4" />,
  credit_card: <CreditCard className="h-4 w-4" />,
  transfer: <CreditCard className="h-4 w-4" />,
  other: <CreditCard className="h-4 w-4" />,
}

export function PaymentLinkPanel({ milestone, projectId }: PaymentLinkPanelProps) {
  const [isPending, startTransition] = useTransition()
  const [open, setOpen] = useState(false)
  const [method, setMethod] = useState<PaymentMethod>(
    (milestone.payment_method as PaymentMethod) ?? 'pix'
  )
  const [link, setLink] = useState(milestone.payment_link ?? '')
  const [instructions, setInstructions] = useState(milestone.payment_instructions ?? '')

  const isPaid = milestone.status === 'paid' || !!milestone.paid_at

  function handleSave() {
    startTransition(async () => {
      const result = await updateMilestonePayment(milestone.id, projectId, {
        paymentMethod: method,
        paymentLink: link || undefined,
        paymentInstructions: instructions || undefined,
      })
      if (result.error) { toast.error(result.error); return }
      toast.success('Informações de pagamento salvas.')
      setOpen(false)
    })
  }

  function handleConfirmPayment() {
    startTransition(async () => {
      const result = await confirmMilestonePayment(milestone.id, projectId)
      if (result.error) { toast.error(result.error); return }
      toast.success('Pagamento confirmado!')
    })
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {isPaid ? (
        <Badge className="bg-green-500/10 text-green-600 gap-1">
          <CheckCircle2 className="h-3 w-3" />Pago
        </Badge>
      ) : (
        <>
          {milestone.payment_method && (
            <Badge variant="outline" className="gap-1 text-xs">
              {METHOD_ICONS[milestone.payment_method]}
              {METHOD_LABELS[milestone.payment_method] ?? milestone.payment_method}
            </Badge>
          )}
          {milestone.payment_link && (
            <div className="flex items-center gap-1">
              <a
                href={milestone.payment_link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline flex items-center gap-1"
              >
                <ExternalLink className="h-3 w-3" />Link
              </a>
              <button
                onClick={() => { navigator.clipboard.writeText(milestone.payment_link!); toast.success('Link copiado!') }}
                className="text-muted-foreground hover:text-foreground"
              >
                <Copy className="h-3 w-3" />
              </button>
            </div>
          )}
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" size="sm" className="h-7 text-xs gap-1">
                <Link className="h-3 w-3" />
                {milestone.payment_method ? 'Editar pagamento' : 'Configurar pagamento'}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Configurar Pagamento</DialogTitle></DialogHeader>
              <div className="space-y-4 mt-2">
                <div className="space-y-2">
                  <Label>Método de pagamento</Label>
                  <div className="flex flex-wrap gap-2">
                    {Object.entries(METHOD_LABELS).map(([k, v]) => (
                      <button
                        key={k}
                        onClick={() => setMethod(k as PaymentMethod)}
                        className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-sm transition-colors ${method === k ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:border-primary/50'}`}
                      >
                        {METHOD_ICONS[k]}{v}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Link de pagamento (opcional)</Label>
                  <Input
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
                    placeholder="https://asaas.com/c/... ou link do Stripe"
                  />
                  <p className="text-xs text-muted-foreground">Cole o link gerado na plataforma de pagamento (Asaas, Stripe, PagSeguro, etc.)</p>
                </div>
                <div className="space-y-2">
                  <Label>Instruções para o cliente (opcional)</Label>
                  <Textarea
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="Ex: Chave Pix: empresa@reobot.com.br — Banco: Nubank"
                    rows={3}
                  />
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleSave} disabled={isPending} className="flex-1">Salvar</Button>
                  <Button variant="outline" disabled={isPending} onClick={handleConfirmPayment}>Confirmar pago</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </>
      )}
    </div>
  )
}
