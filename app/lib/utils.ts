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
