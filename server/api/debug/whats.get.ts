export default defineEventHandler(async () => {
  const config = useRuntimeConfig()
  const base = (config.whatsApiInternalUrl as string).replace(/\/+$/, '')
  const secret = config.whatsApiInternalSecret as string

  const out: Record<string, unknown> = {
    base,
    secretLen: secret?.length ?? 0,
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
