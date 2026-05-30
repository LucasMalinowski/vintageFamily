import { supabaseAdmin } from '@/lib/supabaseAdmin'
import { whatsAppService } from '@/lib/whatsapp/WhatsAppService'
import { sendInsightsEmail } from '@/lib/mailer'
import { posthogLogs } from '@/lib/posthog-logs'

export async function dispatchInsights(
  familyId: string,
  insights: string[],
  period: string,
  type: 'proactive' | 'on_demand' | 'limit_alert' = 'proactive',
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
      const header = type === 'proactive' ? '💡 *Insights do mês - Florim*\n\n' : type === 'on_demand' ? '💡 *Insight sob demanda - Florim*\n\n' : ''
      const templateName = process.env.WHATSAPP_INSIGHTS_TEMPLATE_NAME
      const headerImageId = process.env.WHATSAPP_INSIGHTS_IMAGE_ID
      const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://florim.app'
      const headerImageUrl = headerImageId ? undefined : `${appUrl}/insights_whatsapp.png`
      let result: { messageId: string | null } | null = null
      let messageKind = 'none'

      try {
        if (type === 'limit_alert') {
          // Use a dedicated text-only template (no image header = no 131053 errors,
          // always works outside the 24h window).
          // Set WHATSAPP_LIMIT_ALERT_TEMPLATE_NAME in env after approval.
          const limitTemplateName = process.env.WHATSAPP_LIMIT_ALERT_TEMPLATE_NAME
          if (limitTemplateName) {
            result = await whatsAppService.sendTemplateMessage(member.phone_number, limitTemplateName, [content])
            messageKind = 'limit-template'
          } else {
            // No template yet — try plain text (works within 24h window)
            result = await whatsAppService.sendTextMessage(member.phone_number, content)
            messageKind = 'text'
          }
        } else {
          // Proactive / on-demand insights always use the template when configured
          result = templateName
            ? await whatsAppService.sendTemplateMessage(member.phone_number, templateName, [period, content], 'pt_BR', [], headerImageUrl, headerImageId)
            : await whatsAppService.sendTextMessage(member.phone_number, header + content)
          messageKind = templateName ? 'template' : 'text'
        }

        sentChannels.push('whatsapp')
        console.log(`[insights-dispatch] WhatsApp ${messageKind} sent to ...${member.phone_number.replace(/\D/g, '').slice(-4)} msgId=${result?.messageId}`)
        await posthogLogs.info('Insights WhatsApp message accepted by Meta', {
          family_id: familyId,
          user_id: member.id,
          type,
          whatsapp_message_kind: messageKind,
          whatsapp_template_name: templateName ?? 'none',
          meta_message_id: result?.messageId ?? 'unknown',
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

    // limit_alert never sends email — spending warnings would spam the user every time
    // they add any expense in a category that's already over budget
    if (type !== 'limit_alert' && channels.includes('email') && member.email) {
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
