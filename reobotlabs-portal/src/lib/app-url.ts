function normalizeUrl(value: string) {
  return value.startsWith('http://') || value.startsWith('https://')
    ? value
    : `https://${value}`
}

export function getAppUrl() {
  const raw =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_APP_URL ||
    process.env.VERCEL_PROJECT_PRODUCTION_URL ||
    process.env.VERCEL_URL ||
    'http://localhost:3000'

  return normalizeUrl(raw).replace(/\/$/, '')
}
