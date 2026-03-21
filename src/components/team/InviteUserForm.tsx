'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { inviteUserSchema, type InviteUserInput } from '@/lib/validations'
import { inviteClientUser } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import type { Client } from '@/types'

interface InviteUserFormProps {
  clients: Pick<Client, 'id' | 'name'>[]
}

export function InviteUserForm({ clients }: InviteUserFormProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<InviteUserInput>({
    resolver: zodResolver(inviteUserSchema),
  })

  async function onSubmit(data: InviteUserInput) {
    setIsLoading(true)
    setMessage(null)
    const result = await inviteClientUser(data)
    if (result?.error) {
      setMessage({ type: 'error', text: result.error })
    } else {
      setMessage({ type: 'success', text: 'Convite enviado com sucesso!' })
      reset()
    }
    setIsLoading(false)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nome Completo *</Label>
        <Input id="full_name" placeholder="João Silva" {...register('full_name')} />
        {errors.full_name && <p className="text-sm text-red-400">{errors.full_name.message}</p>}
      </div>

      <div className="space-y-2">
        <Label htmlFor="email">Email *</Label>
        <Input id="email" type="email" placeholder="joao@empresa.com" {...register('email')} />
        {errors.email && <p className="text-sm text-red-400">{errors.email.message}</p>}
      </div>

      <div className="space-y-2">
        <Label>Empresa Cliente *</Label>
        <Select onValueChange={(v) => setValue('client_id', v)}>
          <SelectTrigger>
            <SelectValue placeholder="Selecione o cliente" />
          </SelectTrigger>
          <SelectContent>
            {clients.map((client) => (
              <SelectItem key={client.id} value={client.id}>
                {client.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.client_id && <p className="text-sm text-red-400">{errors.client_id.message}</p>}
        <p className="text-xs text-muted-foreground">
          O convite vincula o usuario ao workspace do cliente selecionado.
        </p>
      </div>

      {message && (
        <div
          className={`rounded-md border px-4 py-3 text-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-400'
              : 'bg-red-500/10 border-red-500/20 text-red-400'
          }`}
        >
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isLoading} className="w-full">
        {isLoading ? 'Enviando convite...' : 'Enviar convite e vincular ao workspace'}
      </Button>
    </form>
  )
}
