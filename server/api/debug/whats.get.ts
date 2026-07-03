export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const baseRuntime = (config.whatsApiInternalUrl as string ?? '').replace(/\/+$/, '')
  const secretRuntime = (config.whatsApiInternalSecret as string) ?? ''
  const base = (
    process.env.WHATS_API_INTERNAL_URL
    ?? process.env.WHATS_API_URL
    ?? ''
  ).replace(/\/+$/, '')
  const secret = process.env.WHATS_API_INTERNAL_SECRET ?? ''

  const out: Record<string, unknown> = {
    base,
    baseRuntime,
    secretLen: secret?.length ?? 0,
    secretLenRuntime: secretRuntime?.length ?? 0,
  }

  try {
    const health = await $fetch(`${base}/health`, { method: 'GET' })
    out.health = health
  } catch (err) {
    out.healthError = err instanceof Error ? err.message : String(err)
  }

  try {
    const agents = await $fetch(`${base}/ai-agents`, {
      method: 'GET',
      headers: { 'x-internal-secret': secret },
      query: { company_id: 'a5e5bd2b-0435-4845-8a62-48d3fff52eb8' },
    })
    out.agents = agents
  } catch (err) {
    out.agentsError = err instanceof Error ? err.message : String(err)
    if (err && typeof err === 'object' && 'data' in err) {
      out.agentsErrorData = (err as { data: unknown }).data
    }
    if (err && typeof err === 'object' && 'status' in err) {
      out.agentsStatus = (err as { status: unknown }).status
    }
  }

  return out
})
