import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { sendInsightsEmail } from '@/lib/mailer'
import { posthogLogs } from '@/lib/posthog-logs'

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
        const templateName = process.env.WHATSAPP_INSIGHTS_TEMPLATE_NAME
        const result = templateName
          ? await whatsAppService.sendTemplateMessage(member.phone_number, templateName, [period, content])
          : await whatsAppService.sendTextMessage(member.phone_number, header + content)
        sentChannels.push('whatsapp')
        await posthogLogs.info('Insights WhatsApp message accepted by Meta', {
          family_id: familyId,
          user_id: member.id,
          type,
          whatsapp_message_kind: templateName ? 'template' : 'text',
          whatsapp_template_name: templateName ?? 'none',
          meta_message_id: result.messageId ?? 'unknown',
          recipient_last4: member.phone_number.replace(/\D/g, '').slice(-4),
        })
      } catch (err) {
        console.warn('[insights-dispatch] whatsapp delivery failed', member.id, err)
        await posthogLogs.warn(
          'Insights WhatsApp delivery failed',
          {
            family_id: familyId,
            user_id: member.id,
            type,
            recipient_last4: member.phone_number.replace(/\D/g, '').slice(-4),
          },
          err
        )
      }
    }

    if (channels.includes('email') && member.email) {
      try {
        await sendInsightsEmail({ to: member.email, name: member.name ?? '', insights, period })
        sentChannels.push('email')
        await posthogLogs.info('Insights email accepted by provider', {
          family_id: familyId,
          user_id: member.id,
          type,
        })
      } catch (err) {
        console.warn('[insights-dispatch] email delivery failed', member.id, err)
        await posthogLogs.warn(
          'Insights email delivery failed',
          {
            family_id: familyId,
            user_id: member.id,
            type,
          },
          err
        )
      }
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
