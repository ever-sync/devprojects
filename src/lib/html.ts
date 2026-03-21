export function looksLikeHtml(content: string | null | undefined) {
  if (!content) return false
  return /<\/?[a-z][\s\S]*>/i.test(content)
}

export function sanitizeHtml(content: string | null | undefined) {
  if (!content) return ''

  return content
    .replace(/<script[\s\S]*?>[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?>[\s\S]*?<\/style>/gi, '')
    .replace(/<(iframe|object|embed|link|meta)[\s\S]*?>[\s\S]*?<\/\1>/gi, '')
    .replace(/<(iframe|object|embed|link|meta)([^>]*)\/?>/gi, '')
    .replace(/\son[a-z]+\s*=\s*(['"]).*?\1/gi, '')
    .replace(/\son[a-z]+\s*=\s*[^\s>]+/gi, '')
    .replace(/javascript:/gi, '')
}
