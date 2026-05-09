'use client'

import { useRouter, usePathname, useSearchParams } from 'next/navigation'

interface PeriodSelectorProps {
  options: Array<{ value: string; label: string }>
  paramName?: string
  value: string
}

export function PeriodSelector({ options, paramName = 'period', value }: PeriodSelectorProps) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const params = new URLSearchParams(searchParams.toString())
    params.set(paramName, e.target.value)
    router.push(`${pathname}?${params.toString()}`)
  }

  return (
    <select
      value={value}
      onChange={handleChange}
      className="h-9 rounded-md border border-input bg-background px-3 text-sm"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}
