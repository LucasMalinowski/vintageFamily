import { sendPostHogOtlpLog, type PostHogLogAttributes } from '@/lib/posthog-otlp'

function serializeError(error: unknown): PostHogLogAttributes {
  if (!(error instanceof Error)) return {}

  const attributes: PostHogLogAttributes = {
    'error.name': error.name,
    'error.message': error.message,
  }

  if (error.stack) attributes['error.stack'] = error.stack

  return attributes
}

export function posthogLog(
  level: 'debug' | 'info' | 'warn' | 'error',
  message: string,
  attributes: PostHogLogAttributes = {},
  error?: unknown
) {
  return sendPostHogOtlpLog(
    level,
    message,
    {
      ...attributes,
      ...serializeError(error),
    },
    'florim-route-handlers'
  )
}

export const posthogLogs = {
  debug: (message: string, attributes?: PostHogLogAttributes) => posthogLog('debug', message, attributes),
  info: (message: string, attributes?: PostHogLogAttributes) => posthogLog('info', message, attributes),
  warn: (message: string, attributes?: PostHogLogAttributes, error?: unknown) => posthogLog('warn', message, attributes, error),
  error: (message: string, attributes?: PostHogLogAttributes, error?: unknown) => posthogLog('error', message, attributes, error),
}

export async function flushPostHogLogs() {
  // Logs are sent immediately by sendPostHogOtlpLog. Keep this as a stable route-handler API.
}
