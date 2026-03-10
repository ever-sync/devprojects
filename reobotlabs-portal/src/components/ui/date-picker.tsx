"use client"

import * as React from "react"
import { format, parseISO } from "date-fns"
import { ptBR } from "date-fns/locale"
import { CalendarIcon, X } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

interface DatePickerProps {
  value?: string        // ISO date string YYYY-MM-DD
  onChange: (value: string | undefined) => void
  placeholder?: string
  className?: string
}

export function DatePicker({ value, onChange, placeholder = "Selecionar data", className }: DatePickerProps) {
  const [open, setOpen] = React.useState(false)

  const selected = value ? parseISO(value) : undefined

  function handleSelect(date: Date | undefined) {
    if (date) {
      // Format as YYYY-MM-DD to stay compatible with the form schema
      const iso = format(date, "yyyy-MM-dd")
      onChange(iso)
    } else {
      onChange(undefined)
    }
    setOpen(false)
  }

  function handleClear(e: React.MouseEvent) {
    e.stopPropagation()
    onChange(undefined)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal h-9 px-3 text-sm",
            !selected && "text-muted-foreground",
            className
          )}
        >
          <CalendarIcon className="mr-2 h-3.5 w-3.5 shrink-0 opacity-50" />
          <span className="flex-1 truncate">
            {selected
              ? format(selected, "d 'de' MMMM 'de' yyyy", { locale: ptBR })
              : placeholder}
          </span>
          {selected && (
            <X
              className="ml-1 h-3.5 w-3.5 shrink-0 opacity-50 hover:opacity-100"
              onClick={handleClear}
            />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="dashboard-surface w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={selected}
          onSelect={handleSelect}
          initialFocus
        />
      </PopoverContent>
    </Popover>
  )
}
