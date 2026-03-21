'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import {
  Search, RefreshCw, Eye, EyeOff, KeyRound, Building2,
  MapPin, Phone, Globe, FileText, User, ChevronDown, ChevronUp, Loader2,
} from 'lucide-react'
import { toast } from 'sonner'
import { clientSchema, type ClientInput } from '@/lib/validations'
import { createClientRecord, updateClientRecord } from '@/actions/clients'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { DatePicker } from '@/components/ui/date-picker'
import type { Client } from '@/types'

// ── helpers ───────────────────────────────────────────────────────────────────

function formatCNPJ(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 14)
  return d
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
}

function formatPhone(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 10) return d.replace(/^(\d{2})(\d{4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
  return d.replace(/^(\d{2})(\d{5})(\d{0,4})/, '($1) $2-$3').replace(/-$/, '')
}

function formatZip(v: string) {
  const d = v.replace(/\D/g, '').slice(0, 8)
  return d.replace(/^(\d{5})(\d)/, '$1-$2')
}

function generatePassword(len = 12) {
  const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789@#$!'
  return Array.from({ length: len }, () => chars[Math.floor(Math.random() * chars.length)]).join('')
}

function SectionHeading({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
      <span className="text-primary">{icon}</span>
      <h3 className="text-sm font-semibold text-foreground">{label}</h3>
    </div>
  )
}

// ── component ─────────────────────────────────────────────────────────────────

interface ClientFormProps { client?: Client }

export function ClientForm({ client }: ClientFormProps) {
  const isEditing = Boolean(client)
  const [isLoading, setIsLoading] = useState(false)
  const [isCnpjLoading, setIsCnpjLoading] = useState(false)
  const [isCepLoading, setIsCepLoading] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  // Portal access (create only)
  const [portalEnabled, setPortalEnabled] = useState(false)
  const [portalName, setPortalName] = useState('')
  const [portalEmail, setPortalEmail] = useState('')
  const [portalPassword, setPortalPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [portalErrors, setPortalErrors] = useState<Record<string, string>>({})

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<ClientInput>({
    resolver: zodResolver(clientSchema),
    defaultValues: client ? {
      name: client.name,
      cnpj: client.cnpj ?? undefined,
      website: client.website ?? undefined,
      industry: client.industry ?? undefined,
      notes: client.notes ?? undefined,
      contact_email: client.contact_email ?? undefined,
      contact_phone: client.contact_phone ?? undefined,
      address: client.address ?? undefined,
      address_number: client.address_number ?? undefined,
      address_complement: client.address_complement ?? undefined,
      address_neighborhood: client.address_neighborhood ?? undefined,
      address_city: client.address_city ?? undefined,
      address_state: client.address_state ?? undefined,
      address_zip: client.address_zip ?? undefined,
      entry_date: client.entry_date ?? undefined,
    } : {},
  })

  // ── CNPJ lookup ──────────────────────────────────────────────────────────────
  async function handleCnpjLookup() {
    const raw = (watch('cnpj') ?? '').replace(/\D/g, '')
    if (raw.length !== 14) { toast.error('Digite um CNPJ completo (14 digitos)'); return }
    setIsCnpjLoading(true)
    try {
      const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${raw}`)
      if (!res.ok) throw new Error()
      const d = await res.json()
      if (d.razao_social || d.nome_fantasia) setValue('name', d.razao_social || d.nome_fantasia)
      if (d.email) setValue('contact_email', d.email)
      if (d.ddd_telefone_1 && d.telefone_1)
        setValue('contact_phone', formatPhone(d.ddd_telefone_1 + d.telefone_1.replace(/\D/g, '')))
      if (d.logradouro) setValue('address', d.logradouro)
      if (d.numero) setValue('address_number', d.numero)
      if (d.complemento) setValue('address_complement', d.complemento)
      if (d.bairro) setValue('address_neighborhood', d.bairro)
      if (d.municipio) setValue('address_city', d.municipio)
      if (d.uf) setValue('address_state', d.uf)
      if (d.cep) setValue('address_zip', formatZip(d.cep))
      if (d.cnae_fiscal_descricao) setValue('industry', d.cnae_fiscal_descricao.slice(0, 100))
      toast.success('Dados preenchidos automaticamente!')
    } catch {
      toast.error('CNPJ nao encontrado ou invalido')
    } finally {
      setIsCnpjLoading(false)
    }
  }

  // ── CEP lookup ───────────────────────────────────────────────────────────────
  async function handleCepLookup() {
    const raw = (watch('address_zip') ?? '').replace(/\D/g, '')
    if (raw.length !== 8) { toast.error('Digite um CEP completo (8 digitos)'); return }
    setIsCepLoading(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${raw}/json/`)
      const d = await res.json()
      if (d.erro) throw new Error()
      if (d.logradouro) setValue('address', d.logradouro)
      if (d.bairro) setValue('address_neighborhood', d.bairro)
      if (d.localidade) setValue('address_city', d.localidade)
      if (d.uf) setValue('address_state', d.uf)
      toast.success('Endereco preenchido!')
    } catch {
      toast.error('CEP nao encontrado')
    } finally {
      setIsCepLoading(false)
    }
  }

  // ── submit ────────────────────────────────────────────────────────────────────
  async function onSubmit(data: ClientInput) {
    setFormError(null)
    if (!isEditing && portalEnabled) {
      const errs: Record<string, string> = {}
      if (!portalName.trim()) errs.full_name = 'Nome obrigatorio'
      if (!portalEmail.trim()) errs.email = 'E-mail obrigatorio'
      if (portalPassword.length < 8) errs.password = 'Minimo 8 caracteres'
      if (Object.keys(errs).length > 0) { setPortalErrors(errs); return }
      setPortalErrors({})
    }
    setIsLoading(true)
    const result = isEditing
      ? await updateClientRecord(client!.id, data)
      : await createClientRecord(
          data,
          portalEnabled ? { full_name: portalName, email: portalEmail, password: portalPassword } : null,
        )
    if (result?.error) { setFormError(result.error); setIsLoading(false); return }
    if (isEditing && result && 'success' in result) {
      toast.success('Cliente atualizado com sucesso!')
      setIsLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8 max-w-2xl">

      {/* 1 ── CNPJ */}
      <section>
        <SectionHeading icon={<Search className="w-4 h-4" />} label="CNPJ" />
        <div className="flex gap-2">
          <Input
            placeholder="00.000.000/0000-00"
            className="flex-1"
            {...register('cnpj')}
            onChange={(e) => setValue('cnpj', formatCNPJ(e.target.value))}
          />
          <Button type="button" variant="outline" onClick={handleCnpjLookup} disabled={isCnpjLoading} className="shrink-0">
            {isCnpjLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
            {isCnpjLoading ? 'Buscando...' : 'Buscar'}
          </Button>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Ao buscar, os campos serao preenchidos automaticamente via Receita Federal.
        </p>
      </section>

      {/* 2 ── Dados da empresa */}
      <section>
        <SectionHeading icon={<Building2 className="w-4 h-4" />} label="Dados da Empresa" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="name">Nome da Empresa <span className="text-red-400">*</span></Label>
            <Input id="name" placeholder="Ex: Empresa Exemplo Ltda" {...register('name')} />
            {errors.name && <p className="text-xs text-red-400">{errors.name.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="industry">Setor / Industria</Label>
            <Input id="industry" placeholder="Ex: E-commerce, Fintech, Saude" {...register('industry')} />
          </div>
          <div className="space-y-1.5">
            <Label>Data de Entrada</Label>
            <DatePicker
              value={watch('entry_date') ?? undefined}
              onChange={(v) => setValue('entry_date', v ?? null)}
              placeholder="Selecionar data"
            />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="website">Website</Label>
            <div className="relative">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
              <Input id="website" type="url" placeholder="https://empresa.com" className="pl-8" {...register('website')} />
            </div>
            {errors.website && <p className="text-xs text-red-400">{errors.website.message}</p>}
          </div>
        </div>
      </section>

      {/* 3 ── Contato */}
      <section>
        <SectionHeading icon={<Phone className="w-4 h-4" />} label="Contato" />
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label htmlFor="contact_email">E-mail de Contato</Label>
            <Input id="contact_email" type="email" placeholder="contato@empresa.com" {...register('contact_email')} />
            {errors.contact_email && <p className="text-xs text-red-400">{errors.contact_email.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="contact_phone">Telefone de Contato</Label>
            <Input
              id="contact_phone"
              placeholder="(11) 99999-9999"
              {...register('contact_phone')}
              onChange={(e) => setValue('contact_phone', formatPhone(e.target.value))}
            />
          </div>
        </div>
      </section>

      {/* 4 ── Endereco */}
      <section>
        <SectionHeading icon={<MapPin className="w-4 h-4" />} label="Endereco" />
        <div className="grid grid-cols-1 sm:grid-cols-6 gap-4">
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address_zip">CEP</Label>
            <div className="flex gap-2">
              <Input
                id="address_zip"
                placeholder="00000-000"
                className="flex-1"
                {...register('address_zip')}
                onChange={(e) => setValue('address_zip', formatZip(e.target.value))}
              />
              <Button type="button" variant="outline" size="sm" title="Buscar CEP" onClick={handleCepLookup} disabled={isCepLoading} className="shrink-0 px-2.5">
                {isCepLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Search className="w-3.5 h-3.5" />}
              </Button>
            </div>
          </div>
          <div className="sm:col-span-3 space-y-1.5">
            <Label htmlFor="address">Logradouro</Label>
            <Input id="address" placeholder="Rua, Avenida..." {...register('address')} />
          </div>
          <div className="sm:col-span-1 space-y-1.5">
            <Label htmlFor="address_number">N</Label>
            <Input id="address_number" placeholder="123" {...register('address_number')} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address_complement">Complemento</Label>
            <Input id="address_complement" placeholder="Sala, Andar..." {...register('address_complement')} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address_neighborhood">Bairro</Label>
            <Input id="address_neighborhood" placeholder="Bairro" {...register('address_neighborhood')} />
          </div>
          <div className="sm:col-span-2 space-y-1.5">
            <Label htmlFor="address_city">Cidade</Label>
            <Input id="address_city" placeholder="Cidade" {...register('address_city')} />
          </div>
          <div className="sm:col-span-1 space-y-1.5">
            <Label htmlFor="address_state">UF</Label>
            <Input
              id="address_state"
              placeholder="SP"
              maxLength={2}
              {...register('address_state')}
              onChange={(e) => setValue('address_state', e.target.value.toUpperCase().slice(0, 2))}
            />
          </div>
        </div>
      </section>

      {/* 5 ── Notas */}
      <section>
        <SectionHeading icon={<FileText className="w-4 h-4" />} label="Notas Internas" />
        <Textarea id="notes" rows={3} placeholder="Informacoes importantes sobre o cliente, contexto, historico..." {...register('notes')} />
      </section>

      {/* 6 ── Acesso ao Portal (create only) */}
      {!isEditing && (
        <section className="rounded-xl border border-border overflow-hidden">
          <button
            type="button"
            onClick={() => setPortalEnabled((v) => !v)}
            className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
          >
            <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <KeyRound className="w-4 h-4 text-primary" />
              Acesso ao Portal
              <span className="text-xs font-normal text-muted-foreground ml-1">(opcional)</span>
            </span>
            {portalEnabled ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
          </button>

          {portalEnabled && (
            <div className="px-4 py-4 space-y-4 border-t border-border">
              <p className="text-xs text-muted-foreground">
                Crie o login e senha para o cliente acessar o portal. O usuario sera vinculado automaticamente a este cliente.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="portal_name">
                    <User className="w-3.5 h-3.5 inline mr-1" />
                    Nome do Usuario
                  </Label>
                  <Input id="portal_name" placeholder="Nome Sobrenome" value={portalName} onChange={(e) => setPortalName(e.target.value)} />
                  {portalErrors.full_name && <p className="text-xs text-red-400">{portalErrors.full_name}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal_email">E-mail de Login</Label>
                  <Input id="portal_email" type="email" placeholder="usuario@empresa.com" value={portalEmail} onChange={(e) => setPortalEmail(e.target.value)} />
                  {portalErrors.email && <p className="text-xs text-red-400">{portalErrors.email}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="portal_password">Senha</Label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Input
                        id="portal_password"
                        type={showPassword ? 'text' : 'password'}
                        placeholder="Minimo 8 caracteres"
                        value={portalPassword}
                        onChange={(e) => setPortalPassword(e.target.value)}
                        className="pr-9"
                      />
                      <button
                        type="button"
                        title={showPassword ? 'Ocultar' : 'Mostrar'}
                        onClick={() => setShowPassword((v) => !v)}
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPassword ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      title="Gerar senha aleatoria"
                      onClick={() => { setPortalPassword(generatePassword()); setShowPassword(true) }}
                      className="shrink-0 px-2.5"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                  {portalErrors.password && <p className="text-xs text-red-400">{portalErrors.password}</p>}
                  {portalPassword && showPassword && (
                    <p className="text-xs font-mono bg-muted/50 rounded px-2 py-1 mt-1 break-all select-all border border-border">
                      {portalPassword}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {formError && (
        <div className="rounded-lg bg-red-500/10 border border-red-500/20 px-4 py-3 text-sm text-red-400">
          {formError}
        </div>
      )}

      <div className="flex gap-3">
        <Button type="submit" disabled={isLoading}>
          {isLoading
            ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Salvando...</>
            : isEditing ? 'Salvar Alteracoes' : 'Cadastrar Cliente'}
        </Button>
        <Button type="button" variant="outline" onClick={() => history.back()}>Cancelar</Button>
      </div>
    </form>
  )
}
