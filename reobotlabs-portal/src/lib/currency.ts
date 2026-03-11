export function formatBRLValue(value: number | null | undefined) {
  if (value == null || Number.isNaN(value)) return ''

  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)
}

export function formatBRLInput(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return ''

  const amount = Number(digits) / 100
  return formatBRLValue(amount)
}

export function parseBRLInput(value: string) {
  const digits = value.replace(/\D/g, '')
  if (!digits) return 0

  return Number(digits) / 100
}
