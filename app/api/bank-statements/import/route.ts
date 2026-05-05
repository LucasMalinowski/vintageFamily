import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { hasBillingAccess } from '@/lib/billing/access'
import { checkAndIncrementExportImport } from '@/lib/billing/free-tier'
import { BANK_TUTORIALS_BY_ID } from '@/lib/bank-statements/tutorials'
import { BANK_IDS, type BankId, type ReviewedImportItem, type StatementFileFormat } from '@/lib/bank-statements/types'
import { BankStatementImportError, BankStatementImportService, buildImportPreview } from '@/lib/bank-statements/BankStatementImportService'
import { MAX_CSV_SIZE_BYTES, MAX_OFX_SIZE_BYTES } from '@/lib/bank-statements/constants'

export const runtime = 'nodejs'

const detectFormat = (fileName: string, mimeType: string): StatementFileFormat | null => {
  const name = fileName.toLowerCase()
  const mime = mimeType.toLowerCase()

  if (name.endsWith('.ofx')) return 'ofx'
  if (['application/x-ofx', 'application/ofx'].includes(mime) && !name.endsWith('.csv')) return 'ofx'

  if (name.endsWith('.csv')) return 'csv'
  if (['text/csv', 'application/csv', 'text/comma-separated-values'].includes(mime)) return 'csv'

  return null
}

function detectFormatFromBuffer(buf: Buffer): StatementFileFormat | null {
  const head = buf.slice(0, 128).toString('utf8', 0, 128)
  if (head.startsWith('OFXHEADER') || head.startsWith('<OFX')) return 'ofx'
  // CSV: must be printable text — reject if high-density non-printable bytes found
  const nonPrintable = buf.slice(0, 512).filter((b) => b < 9 || (b > 13 && b < 32)).length
  if (nonPrintable > 2) return null
  return 'csv'
}

export async function POST(request: Request) {
  try {
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)
    if (auth.error || !auth.user) {
      return NextResponse.json({ error: auth.error || 'Não autorizado.' }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile?.family_id) {
      return NextResponse.json({ error: 'Família não encontrada para o usuário autenticado.' }, { status: 403 })
    }

    const formData = await request.formData()
    const action = String(formData.get('action') || 'preview')

    // Only check limit on commit (not preview), so the user can still review before hitting a wall
    if (action === 'commit') {
      const access = await hasBillingAccess({ familyId: profile.family_id })
      if (access.isFreeTier) {
        const usage = await checkAndIncrementExportImport(profile.family_id)
        if (!usage.allowed) {
          return NextResponse.json(
            { error: 'Você atingiu o limite de 3 importações/exportações gratuitas este mês. Assine o Pro para continuar.' },
            { status: 403 }
          )
        }
      }
    }
    const bank = String(formData.get('bank') || '') as BankId
    const file = formData.get('file')

    if (!BANK_IDS.includes(bank)) {
      return NextResponse.json({ error: 'Banco não suportado para esta importação.' }, { status: 422 })
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: 'Arquivo não enviado.' }, { status: 400 })
    }

    const format = detectFormat(file.name, file.type)
    if (!format) {
      return NextResponse.json({ error: 'Envie um arquivo CSV ou OFX válido.' }, { status: 422 })
    }

    const selectedBank = BANK_TUTORIALS_BY_ID[bank]
    if (!selectedBank.supportedImportFormats.includes(format)) {
      const preferred = selectedBank.preferredImportFormat.toUpperCase()
      return NextResponse.json(
        { error: `Este banco não suporta ${format.toUpperCase()} neste fluxo. Use ${preferred}.` },
        { status: 422 }
      )
    }

    if (format === 'csv' && file.size > MAX_CSV_SIZE_BYTES) {
      return NextResponse.json({ error: 'O CSV excede o tamanho máximo permitido de 5 MB.' }, { status: 422 })
    }

    if (format === 'ofx' && file.size > MAX_OFX_SIZE_BYTES) {
      return NextResponse.json({ error: 'O OFX excede o tamanho máximo permitido de 5 MB.' }, { status: 422 })
    }

    const fileBuffer = Buffer.from(await file.arrayBuffer())
    const detectedFormat = detectFormatFromBuffer(fileBuffer)
    if (!detectedFormat || detectedFormat !== format) {
      return NextResponse.json({ error: 'O conteúdo do arquivo não corresponde ao formato declarado.' }, { status: 422 })
    }

    const service = new BankStatementImportService()
    const baseRequest = {
      bank,
      format,
      file: fileBuffer,
      fileName: file.name,
      familyId: profile.family_id,
      userId: auth.user.id,
    }

    if (action === 'commit') {
      const reviewPayload = formData.get('reviewPayload')
      if (typeof reviewPayload !== 'string') {
        return NextResponse.json({ error: 'A revisão da importação não foi enviada.' }, { status: 422 })
      }

      let reviewedItems: ReviewedImportItem[]
      try {
        const parsed = JSON.parse(reviewPayload)
        if (!Array.isArray(parsed)) {
          return NextResponse.json({ error: 'A revisão da importação está inválida.' }, { status: 422 })
        }
        reviewedItems = parsed as ReviewedImportItem[]
      } catch {
        return NextResponse.json({ error: 'A revisão da importação está inválida.' }, { status: 422 })
      }

      const result = await service.commit({
        ...baseRequest,
        reviewedItems,
      })

      return NextResponse.json({
        batchId: result.batchId,
        bank: result.bank,
        format: result.format,
        fileHash: result.fileHash,
        pageCount: result.pageCount,
        summary: result.summary,
        warnings: result.warnings,
        preview: buildImportPreview(
          result.items.map((item, index) => ({
            previewKey: `${index}:committed`,
            amountCents: Math.round(item.amount * 100),
            importHash: '',
            duplicateInFile: false,
            duplicateInDatabase: false,
            item,
          }))
        ),
      })
    }

    const preview = await service.preview(baseRequest)

    return NextResponse.json(preview)
  } catch (error) {
    if (error instanceof BankStatementImportError) {
      return NextResponse.json(
        {
          error: error.message,
          code: error.code,
          details: error.details ?? null,
        },
        { status: error.status }
      )
    }

    return NextResponse.json({ error: 'Falha ao importar o extrato bancário.' }, { status: 500 })
  }
}
