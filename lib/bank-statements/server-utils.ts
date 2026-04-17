import { createHash } from 'crypto'
import type { BankId, ParsedTransactionType } from '@/lib/bank-statements/types'
import { normalizeDescriptionForHash } from '@/lib/bank-statements/utils'

export const buildTransactionHash = (params: {
  familyId: string
  date: string
  description: string
  amountCents: number
  type: ParsedTransactionType
  sourceBank: BankId
}) => {
  const stable = [
    params.familyId,
    params.date,
    normalizeDescriptionForHash(params.description),
    String(params.amountCents),
    params.type,
    params.sourceBank,
  ].join('|')

  return createHash('sha256').update(stable).digest('hex')
}

export const buildFileHash = (buffer: Buffer) => createHash('sha256').update(buffer).digest('hex')
