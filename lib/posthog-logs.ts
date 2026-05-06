import { SeverityNumber, type LogAttributes } from '@opentelemetry/api-logs'
import { loggerProvider } from '@/instrumentation'

const logger = loggerProvider.getLogger('florim')

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

const severityByLevel: Record<LogLevel, SeverityNumber> = {
  debug: SeverityNumber.DEBUG,
  info: SeverityNumber.INFO,
  warn: SeverityNumber.WARN,
  error: SeverityNumber.ERROR,
}

function serializeError(error: unknown): LogAttributes {
  if (!(error instanceof Error)) return {}

  return {
    'error.name': error.name,
    'error.message': error.message,
    'error.stack': error.stack,
  }
}

export function posthogLog(
  level: LogLevel,
  message: string,
  attributes: LogAttributes = {},
  error?: unknown
) {
  logger.emit({
    body: message,
    severityNumber: severityByLevel[level],
    severityText: level.toUpperCase(),
    attributes: {
      ...attributes,
      ...serializeError(error),
    },
  })
}

export const posthogLogs = {
  debug: (message: string, attributes?: LogAttributes) => posthogLog('debug', message, attributes),
  info: (message: string, attributes?: LogAttributes) => posthogLog('info', message, attributes),
  warn: (message: string, attributes?: LogAttributes, error?: unknown) => posthogLog('warn', message, attributes, error),
  error: (message: string, attributes?: LogAttributes, error?: unknown) => posthogLog('error', message, attributes, error),
}

export async function flushPostHogLogs() {
  try {
    await loggerProvider.forceFlush()
  } catch (error) {
    console.error('[posthog-logs] forceFlush failed:', error)
  }
}
