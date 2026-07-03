import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

const SUPABASE_PUBLIC_HOST = 'https://wpyxqtqlppsvuiwquigu.supabase.co'

/**
 * CF Worker rejects unauthenticated GETs on storage paths, so we rewrite
 * public storage URLs to point at the Supabase project host directly.
 * Anything that isn't a storage URL is returned untouched.
 */
/**
 * Formata número de WhatsApp para exibição.
 * BR (13 dígitos, 55 + DDD + 9 + 8 dígitos): +55 (11) 9 8765-4321
 * BR (12 dígitos, 55 + DDD + 8 dígitos):   +55 (11) 8765-4321
 * Outros: +CC XXXXXXX...
 */
export function formatPhone(raw: string | null | undefined): string {
  if (!raw) return ''
  const digits = String(raw).replace(/\D/g, '')
  if (!digits) return ''
  if (digits.startsWith('55') && (digits.length === 13 || digits.length === 12)) {
    const ddd = digits.slice(2, 4)
    const rest = digits.slice(4)
    if (rest.length === 9) {
      return `+55 (${ddd}) ${rest[0]} ${rest.slice(1, 5)}-${rest.slice(5)}`
    }
    return `+55 (${ddd}) ${rest.slice(0, 4)}-${rest.slice(4)}`
  }
  if (digits.length <= 3) return `+${digits}`
  const cc = digits.slice(0, digits.length - 10 > 0 ? digits.length - 10 : 2)
  const local = digits.slice(cc.length)
  const chunks: string[] = []
  let i = 0
  while (i < local.length) {
    chunks.push(local.slice(i, i + 4))
    i += 4
  }
  return `+${cc} ${chunks.join(' ')}`.trim()
}

export function publicAssetUrl(url: string | null | undefined): string | null {
  if (!url) return null
  try {
    const u = new URL(url)
    if (u.pathname.startsWith('/storage/v1/object/public/')) {
      u.protocol = 'https:'
      u.host = new URL(SUPABASE_PUBLIC_HOST).host
      return u.toString()
    }
    return url
  } catch {
    return url
  }
}
