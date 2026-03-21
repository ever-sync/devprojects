'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Keyboard, Monitor, Type, LayoutDashboard, Clock, Globe } from 'lucide-react'
import {
  getUserKeyboardShortcuts,
  saveKeyboardShortcuts,
  getUserUIPreferences,
  saveUIPreferences,
} from '@/actions/collaboration-ux'

interface ShortcutConfig {
  key: string
  description: string
  defaultKey: string
}

const SHORTCUT_CONFIGS: ShortcutConfig[] = [
  { key: 'newTask', description: 'Nova tarefa', defaultKey: 'n' },
  { key: 'search', description: 'Buscar', defaultKey: 'ctrl+k' },
  { key: 'toggleSidebar', description: 'Alternar sidebar', defaultKey: 'ctrl+b' },
  { key: 'toggleTheme', description: 'Alternar tema', defaultKey: 'ctrl+t' },
  { key: 'save', description: 'Salvar', defaultKey: 'ctrl+s' },
  { key: 'undo', description: 'Desfazer', defaultKey: 'ctrl+z' },
  { key: 'redo', description: 'Refazer', defaultKey: 'ctrl+y' },
  { key: 'comment', description: 'Adicionar comentário', defaultKey: 'c' },
  { key: 'assign', description: 'Atribuir tarefa', defaultKey: 'a' },
  { key: 'dueDate', description: 'Definir data de vencimento', defaultKey: 'd' },
]

export function UserPreferencesDialog() {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  
  // Keyboard shortcuts
  const [shortcuts, setShortcuts] = useState<Record<string, string>>({})
  
  // UI Preferences
  const [preferences, setPreferences] = useState({
    theme: 'system' as 'light' | 'dark' | 'system',
    compactMode: false,
    fontSize: 'medium' as 'small' | 'medium' | 'large',
    sidebarCollapsed: false,
    defaultView: 'kanban',
    timezone: 'UTC',
    dateFormat: 'DD/MM/YYYY',
  })

  useEffect(() => {
    if (open) {
      loadPreferences()
    }
  }, [open])

  async function loadPreferences() {
    setLoading(true)
    
    const [shortcutsResult, prefsResult] = await Promise.all([
      getUserKeyboardShortcuts(),
      getUserUIPreferences(),
    ])

    if (shortcutsResult.success && shortcutsResult.data) {
      setShortcuts(shortcutsResult.data.shortcuts || {})
    }

    if (prefsResult.success && prefsResult.data) {
      const prefs = prefsResult.data
      setPreferences({
        theme: (prefs.theme as 'light' | 'dark' | 'system') || 'system',
        compactMode: prefs.compact_mode || false,
        fontSize: (prefs.font_size as 'small' | 'medium' | 'large') || 'medium',
        sidebarCollapsed: prefs.sidebar_collapsed || false,
        defaultView: prefs.default_view || 'kanban',
        timezone: prefs.timezone || 'UTC',
        dateFormat: prefs.date_format || 'DD/MM/YYYY',
      })
    }
    
    setLoading(false)
  }

  async function handleSaveShortcuts() {
    const result = await saveKeyboardShortcuts({ shortcuts })
    if (result.success) {
      // Could show toast here
    }
  }

  async function handleSavePreferences() {
    const result = await saveUIPreferences({
      theme: preferences.theme,
      compactMode: preferences.compactMode,
      fontSize: preferences.fontSize,
      sidebarCollapsed: preferences.sidebarCollapsed,
      defaultView: preferences.defaultView,
      timezone: preferences.timezone,
      dateFormat: preferences.dateFormat,
    })
    if (result.success) {
      // Apply theme immediately
      if (preferences.theme !== 'system') {
        document.documentElement.classList.remove('light', 'dark')
        document.documentElement.classList.add(preferences.theme)
      }
      setOpen(false)
    }
  }

  function handleShortcutChange(key: string, value: string) {
    setShortcuts((prev) => ({ ...prev, [key]: value }))
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <LayoutDashboard className="h-4 w-4 mr-2" />
          Preferências
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Preferências do Usuário</DialogTitle>
          <DialogDescription>
            Personalize sua experiência no ReobotLabs Portal
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-8 text-center text-muted-foreground">
            Carregando preferências...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Appearance Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Monitor className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Aparência</h3>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="theme">Tema</Label>
                  <Select
                    value={preferences.theme}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({
                        ...prev,
                        theme: value as 'light' | 'dark' | 'system',
                      }))
                    }
                  >
                    <SelectTrigger id="theme">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="system">Sistema</SelectItem>
                      <SelectItem value="light">Claro</SelectItem>
                      <SelectItem value="dark">Escuro</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="compactMode">Modo compacto</Label>
                  <Switch
                    id="compactMode"
                    checked={preferences.compactMode}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, compactMode: checked }))
                    }
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="fontSize">Tamanho da fonte</Label>
                  <Select
                    value={preferences.fontSize}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({
                        ...prev,
                        fontSize: value as 'small' | 'medium' | 'large',
                      }))
                    }
                  >
                    <SelectTrigger id="fontSize">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="small">Pequeno</SelectItem>
                      <SelectItem value="medium">Médio</SelectItem>
                      <SelectItem value="large">Grande</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center justify-between">
                  <Label htmlFor="sidebarCollapsed">Sidebar recolhida por padrão</Label>
                  <Switch
                    id="sidebarCollapsed"
                    checked={preferences.sidebarCollapsed}
                    onCheckedChange={(checked) =>
                      setPreferences((prev) => ({ ...prev, sidebarCollapsed: checked }))
                    }
                  />
                </div>
              </div>
            </section>

            {/* Defaults Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <LayoutDashboard className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Padrões</h3>
              </div>

              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="defaultView">Visualização padrão de projetos</Label>
                  <Select
                    value={preferences.defaultView}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, defaultView: value }))
                    }
                  >
                    <SelectTrigger id="defaultView">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="kanban">Kanban</SelectItem>
                      <SelectItem value="list">Lista</SelectItem>
                      <SelectItem value="timeline">Timeline</SelectItem>
                      <SelectItem value="calendar">Calendário</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="timezone">Fuso horário</Label>
                  <Select
                    value={preferences.timezone}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, timezone: value }))
                    }
                  >
                    <SelectTrigger id="timezone">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTC">UTC</SelectItem>
                      <SelectItem value="America/Sao_Paulo">Brasília (UTC-3)</SelectItem>
                      <SelectItem value="America/New_York">New York (UTC-5)</SelectItem>
                      <SelectItem value="Europe/London">London (UTC+0)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="dateFormat">Formato de data</Label>
                  <Select
                    value={preferences.dateFormat}
                    onValueChange={(value) =>
                      setPreferences((prev) => ({ ...prev, dateFormat: value }))
                    }
                  >
                    <SelectTrigger id="dateFormat">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                      <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                      <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </section>

            {/* Keyboard Shortcuts Section */}
            <section className="space-y-4">
              <div className="flex items-center gap-2">
                <Keyboard className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Atalhos de Teclado</h3>
              </div>

              <div className="grid gap-3">
                {SHORTCUT_CONFIGS.map((config) => (
                  <div
                    key={config.key}
                    className="grid grid-cols-2 items-center gap-4"
                  >
                    <Label htmlFor={`shortcut-${config.key}`}>
                      {config.description}
                    </Label>
                    <Input
                      id={`shortcut-${config.key}`}
                      value={shortcuts[config.key] || config.defaultKey}
                      onChange={(e) =>
                        handleShortcutChange(config.key, e.target.value)
                      }
                      placeholder={config.defaultKey}
                      className="font-mono text-sm"
                    />
                  </div>
                ))}
              </div>
            </section>

            {/* Actions */}
            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSavePreferences}>
                Salvar Preferências
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
