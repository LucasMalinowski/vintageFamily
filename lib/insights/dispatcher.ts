import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { sendInsightsEmail } from '@/lib/mailer'

export async function dispatchInsights(
  familyId: string,
  insights: string[],
  period: string,
  type: 'proactive' | 'on_demand' = 'proactive',
  question?: string
): Promise<void> {
  if (insights.length === 0) return

  // Fetch family members with their notification preferences
  const { data: members } = await supabaseAdmin
    .from('users')
    .select('id, name, email, phone_number, insights_enabled, insight_channels')
    .eq('family_id', familyId)

  if (!members?.length) return

  const content = insights.join('\n\n')

  // Persist insight rows (one per member so user_id is set)
  for (const member of members) {
    if (!member.insights_enabled) continue

    await supabaseAdmin.from('insights').insert({
      family_id: familyId,
      user_id: member.id,
      period,
      type,
      prompt_question: question ?? null,
      content,
      sent_channels: [],
    })

    const channels: string[] = member.insight_channels ?? ['whatsapp', 'email']
    const sentChannels: string[] = []

    if (channels.includes('whatsapp') && member.phone_number) {
      try {
        const header = type === 'proactive' ? '💡 *Insights do mês — Florim*\n\n' : '💡 *Insight sob demanda — Florim*\n\n'
        await whatsAppService.sendTextMessage(member.phone_number, header + content)
        sentChannels.push('whatsapp')
      } catch { /* non-critical */ }
    }

    if (channels.includes('email') && member.email) {
      try {
        await sendInsightsEmail({ to: member.email, name: member.name ?? '', insights, period })
        sentChannels.push('email')
      } catch { /* non-critical */ }
    }

    if (sentChannels.length > 0) {
      // Update sent_channels on the last inserted row
      const { data: rows } = await supabaseAdmin
        .from('insights')
        .select('id')
        .eq('family_id', familyId)
        .eq('user_id', member.id)
        .eq('type', type)
        .order('created_at', { ascending: false })
        .limit(1)

      if (rows?.[0]?.id) {
        await supabaseAdmin
          .from('insights')
          .update({ sent_channels: sentChannels })
          .eq('id', rows[0].id)
      }
    }
  }
}
