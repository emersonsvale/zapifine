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

/** Só dígitos, limitado a `max` caracteres. */
function onlyDigits(v: string | null | undefined, max: number): string {
  return String(v ?? '').replace(/\D/g, '').slice(0, max)
}

/** Máscara CPF: 000.000.000-00 (progressiva, para digitação). */
export function maskCPF(v: string | null | undefined): string {
  const d = onlyDigits(v, 11)
  let out = d.slice(0, 3)
  if (d.length > 3) out += '.' + d.slice(3, 6)
  if (d.length > 6) out += '.' + d.slice(6, 9)
  if (d.length > 9) out += '-' + d.slice(9, 11)
  return out
}

/** Máscara CNPJ: 00.000.000/0000-00. */
export function maskCNPJ(v: string | null | undefined): string {
  const d = onlyDigits(v, 14)
  let out = d.slice(0, 2)
  if (d.length > 2) out += '.' + d.slice(2, 5)
  if (d.length > 5) out += '.' + d.slice(5, 8)
  if (d.length > 8) out += '/' + d.slice(8, 12)
  if (d.length > 12) out += '-' + d.slice(12, 14)
  return out
}

/** Máscara CEP: 00000-000. */
export function maskCEP(v: string | null | undefined): string {
  const d = onlyDigits(v, 8)
  return d.length > 5 ? `${d.slice(0, 5)}-${d.slice(5)}` : d
}

/** Máscara telefone BR (aceita com/sem DDI 55). */
export function maskPhoneBR(v: string | null | undefined): string {
  const d = onlyDigits(v, 13)
  if (!d) return ''
  if (d.length >= 12 && d.startsWith('55')) {
    const ddd = d.slice(2, 4)
    const rest = d.slice(4)
    const p1 = rest.slice(0, rest.length > 8 ? 5 : 4)
    const p2 = rest.slice(p1.length)
    return `+55 (${ddd}) ${p1}${p2 ? '-' + p2 : ''}`
  }
  const ddd = d.slice(0, 2)
  if (d.length <= 2) return `(${ddd}`
  const rest = d.slice(2, 11)
  const p1 = rest.slice(0, rest.length > 8 ? 5 : 4)
  const p2 = rest.slice(p1.length)
  return `(${ddd}) ${p1}${p2 ? '-' + p2 : ''}`
}

/** Máscara monetária BR a partir da digitação (trata dígitos como centavos): 1.234,56. */
export function maskMoneyBR(v: string | null | undefined): string {
  const d = String(v ?? '').replace(/\D/g, '')
  if (!d) return ''
  return (Number(d) / 100).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Formata um número (reais) para BR: 1.234,56. */
export function formatMoneyBR(n: number | null | undefined): string {
  if (n == null || Number.isNaN(Number(n))) return ''
  return Number(n).toLocaleString('pt-BR', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

/** Converte "1.234,56" -> 1234.56 (ou null se vazio). */
export function parseMoneyBR(v: string | null | undefined): number | null {
  const d = String(v ?? '').replace(/\D/g, '')
  if (!d) return null
  return Number(d) / 100
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
