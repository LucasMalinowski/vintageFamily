type OtlpValue = { stringValue: string } | { intValue: string } | { boolValue: boolean }

type OtlpAttribute = {
  key: string
  value: OtlpValue
}

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const severityByLevel: Record<LogLevel, number> = {
  debug: 5,
  info: 9,
  warn: 13,
  error: 17,
}

function toOtlpValue(value: string | number | boolean): OtlpValue {
  if (typeof value === 'boolean') return { boolValue: value }
  if (typeof value === 'number') return { intValue: String(Math.trunc(value)) }
  return { stringValue: value }
}

function toOtlpAttributes(attributes: Record<string, string | number | boolean>): OtlpAttribute[] {
  return Object.entries(attributes).map(([key, value]) => ({
    key,
    value: toOtlpValue(value),
  }))
}

export async function sendPostHogOtlpLog(
  level: LogLevel,
  message: string,
  attributes: Record<string, string | number | boolean> = {}
) {
  const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_KEY
  if (!posthogToken) return

  const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
  const url = `${posthogHost.replace(/\/$/, '')}/i/v1/logs`
  const now = Date.now()

  await fetch(url, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${posthogToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      resourceLogs: [
        {
          resource: {
            attributes: toOtlpAttributes({
              'service.name': 'florim',
              'deployment.environment': process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
            }),
          },
          scopeLogs: [
            {
              scope: { name: 'florim-middleware' },
              logRecords: [
                {
                  timeUnixNano: String(now * 1_000_000),
                  observedTimeUnixNano: String(now * 1_000_000),
                  severityNumber: severityByLevel[level],
                  severityText: level.toUpperCase(),
                  body: { stringValue: message },
                  attributes: toOtlpAttributes(attributes),
                },
              ],
            },
          ],
        },
      ],
    }),
  })
}
