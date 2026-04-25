import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

export const GOOGLE_OAUTH_SCOPES = [
  'https://www.googleapis.com/auth/calendar',
  'https://www.googleapis.com/auth/calendar.calendars',
  'https://www.googleapis.com/auth/calendar.events',
  'https://www.googleapis.com/auth/userinfo.email',
  'https://www.googleapis.com/auth/userinfo.profile',
]

export type OAuthState = {
  user_id: string
  companie_id: string
  nonce: string
  iat: number
  redirect_to?: string
}

function b64url(buf: Buffer | string) {
  const b = typeof buf === 'string' ? Buffer.from(buf) : buf
  return b.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function fromB64url(s: string): Buffer {
  s = s.replace(/-/g, '+').replace(/_/g, '/')
  while (s.length % 4) s += '='
  return Buffer.from(s, 'base64')
}

function getStateSecret(): string {
  const s = process.env.GOOGLE_OAUTH_STATE_SECRET
  if (!s || s.length < 32) {
    throw createError({
      statusCode: 500,
      statusMessage: 'GOOGLE_OAUTH_STATE_SECRET ausente ou muito curto (>=32 chars).',
    })
  }
  return s
}

export function signState(payload: Omit<OAuthState, 'nonce' | 'iat'>): string {
  const full: OAuthState = {
    ...payload,
    nonce: randomBytes(8).toString('hex'),
    iat: Math.floor(Date.now() / 1000),
  }
  const body = b64url(JSON.stringify(full))
  const sig = b64url(
    createHmac('sha256', getStateSecret()).update(body).digest(),
  )
  return `${body}.${sig}`
}

export function verifyState(state: string, maxAgeSec = 600): OAuthState {
  const [body, sig] = state.split('.')
  if (!body || !sig) {
    throw createError({ statusCode: 400, statusMessage: 'state inválido.' })
  }
  const expected = createHmac('sha256', getStateSecret()).update(body).digest()
  const got = fromB64url(sig)
  if (expected.length !== got.length || !timingSafeEqual(expected, got)) {
    throw createError({ statusCode: 400, statusMessage: 'Assinatura state inválida.' })
  }
  const parsed = JSON.parse(fromB64url(body).toString('utf8')) as OAuthState
  if (Math.floor(Date.now() / 1000) - parsed.iat > maxAgeSec) {
    throw createError({ statusCode: 400, statusMessage: 'state expirado.' })
  }
  return parsed
}

export function buildAuthUrl(opts: {
  clientId: string
  redirectUri: string
  state: string
  loginHint?: string
}): string {
  const params = new URLSearchParams({
    client_id: opts.clientId,
    redirect_uri: opts.redirectUri,
    response_type: 'code',
    scope: GOOGLE_OAUTH_SCOPES.join(' '),
    access_type: 'offline',
    prompt: 'consent', // força refresh_token sempre
    include_granted_scopes: 'true',
    state: opts.state,
  })
  if (opts.loginHint) params.set('login_hint', opts.loginHint)
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
}

export type TokenResponse = {
  access_token: string
  expires_in: number
  refresh_token?: string
  scope: string
  token_type: string
  id_token?: string
}

export async function exchangeCode(opts: {
  clientId: string
  clientSecret: string
  redirectUri: string
  code: string
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    redirect_uri: opts.redirectUri,
    code: opts.code,
    grant_type: 'authorization_code',
  })
  return await $fetch<TokenResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: body.toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
}

export async function refreshAccessToken(opts: {
  clientId: string
  clientSecret: string
  refreshToken: string
}): Promise<TokenResponse> {
  const body = new URLSearchParams({
    client_id: opts.clientId,
    client_secret: opts.clientSecret,
    refresh_token: opts.refreshToken,
    grant_type: 'refresh_token',
  })
  return await $fetch<TokenResponse>('https://oauth2.googleapis.com/token', {
    method: 'POST',
    body: body.toString(),
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
  })
}

export async function revokeToken(token: string): Promise<void> {
  try {
    await $fetch('https://oauth2.googleapis.com/revoke', {
      method: 'POST',
      body: new URLSearchParams({ token }).toString(),
      headers: { 'content-type': 'application/x-www-form-urlencoded' },
    })
  } catch {
    // Ignora: token pode já estar revogado/expirado
  }
}

export type GoogleUserInfo = {
  sub: string
  email: string
  email_verified: boolean
  name?: string
  picture?: string
}

export async function fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
  return await $fetch<GoogleUserInfo>(
    'https://openidconnect.googleapis.com/v1/userinfo',
    { headers: { Authorization: `Bearer ${accessToken}` } },
  )
}
