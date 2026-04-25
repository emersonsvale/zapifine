import { useSupabaseAdmin } from './supabase-admin'

export type NotificationKind =
  | 'mensagem'
  | 'lead'
  | 'agenda'
  | 'alerta'
  | 'atencao'
  | 'pagamento'
  | 'transferencia'

export async function createInAppNotification(opts: {
  userId: string
  companyId: string
  title: string
  message: string
  tipo?: NotificationKind
  referenceId?: string | null
  referenceType?: string | null
}): Promise<void> {
  const admin = useSupabaseAdmin()
  const { error } = await admin.from('notifications').insert({
    user_id: opts.userId,
    company_id: opts.companyId,
    title: opts.title,
    message: opts.message,
    tipo: opts.tipo ?? 'agenda',
    reference_id: opts.referenceId ?? null,
    reference_type: opts.referenceType ?? null,
    read: false,
  })
  if (error) {
    throw new Error(`Falha ao criar notificação: ${error.message}`)
  }
}
