import { logs } from '@opentelemetry/api-logs'
import { OTLPLogExporter } from '@opentelemetry/exporter-logs-otlp-http'
import { resourceFromAttributes } from '@opentelemetry/resources'
import { BatchLogRecordProcessor, LoggerProvider } from '@opentelemetry/sdk-logs'

const posthogToken = process.env.NEXT_PUBLIC_POSTHOG_KEY
const posthogHost = process.env.NEXT_PUBLIC_POSTHOG_HOST ?? 'https://us.i.posthog.com'
const posthogLogsUrl = `${posthogHost.replace(/\/$/, '')}/i/v1/logs`

export const loggerProvider = new LoggerProvider({
  resource: resourceFromAttributes({
    'service.name': 'florim',
    'deployment.environment': process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? 'development',
  }),
  processors: posthogToken
    ? [
        new BatchLogRecordProcessor(
          new OTLPLogExporter({
            url: posthogLogsUrl,
            headers: {
              Authorization: `Bearer ${posthogToken}`,
              'Content-Type': 'application/json',
            },
          })
        ),
      ]
    : [],
})

export function register() {
  if (process.env.NEXT_RUNTIME === 'nodejs') {
    logs.setGlobalLoggerProvider(loggerProvider)
  }
}
