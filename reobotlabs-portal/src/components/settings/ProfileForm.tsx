'use client'

import { useState, useRef } from 'react'
import { updateProfile, uploadAvatar } from '@/actions/profile'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Avatar } from '@/components/shared/Avatar'
import { Camera } from 'lucide-react'
import type { Profile } from '@/types'

interface ProfileFormProps {
  profile: Profile
}

export function ProfileForm({ profile }: ProfileFormProps) {
  const [fullName, setFullName] = useState(profile.full_name ?? '')
  const [phone, setPhone] = useState(profile.phone ?? '')
  const [company, setCompany] = useState(profile.company ?? '')
  const [avatarUrl, setAvatarUrl] = useState(profile.avatar_url ?? '')
  const [isSaving, setIsSaving] = useState(false)
  const [isUploading, setIsUploading] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    setIsSaving(true)
    setMessage(null)
    const result = await updateProfile({ full_name: fullName, phone, company })
    setIsSaving(false)
    setMessage(result.error
      ? { type: 'error', text: result.error }
      : { type: 'success', text: 'Perfil atualizado com sucesso.' }
    )
  }

  async function handleAvatarChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setIsUploading(true)
    setMessage(null)
    const fd = new FormData()
    fd.append('avatar', file)
    const result = await uploadAvatar(fd)
    setIsUploading(false)
    if (result.error) {
      setMessage({ type: 'error', text: result.error })
    } else if (result.avatarUrl) {
      setAvatarUrl(result.avatarUrl)
      setMessage({ type: 'success', text: 'Foto atualizada.' })
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Avatar upload */}
      <div className="flex items-center gap-4">
        <div className="relative group">
          <Avatar name={fullName} avatarUrl={avatarUrl} size="lg" />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="absolute inset-0 flex items-center justify-center bg-black/50 rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Camera className="w-5 h-5 text-white" />
          </button>
        </div>
        <div>
          <p className="text-sm font-medium text-foreground">{fullName || '—'}</p>
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={isUploading}
            className="text-xs text-primary hover:underline mt-0.5"
          >
            {isUploading ? 'Enviando...' : 'Alterar foto'}
          </button>
        </div>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleAvatarChange}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="full_name">Nome completo</Label>
        <Input
          id="full_name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="company">Empresa</Label>
        <Input
          id="company"
          value={company}
          onChange={(e) => setCompany(e.target.value)}
          placeholder="Nome da empresa"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Telefone / WhatsApp</Label>
        <Input
          id="phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          placeholder="+55 11 99999-9999"
        />
      </div>

      {message && (
        <div className={`rounded-md px-4 py-3 text-sm ${
          message.type === 'success'
            ? 'bg-green-500/10 border border-green-500/20 text-green-400'
            : 'bg-red-500/10 border border-red-500/20 text-red-400'
        }`}>
          {message.text}
        </div>
      )}

      <Button type="submit" disabled={isSaving}>
        {isSaving ? 'Salvando...' : 'Salvar alterações'}
      </Button>
    </form>
  )
}
