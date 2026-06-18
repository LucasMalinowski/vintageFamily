import { NextResponse } from 'next/server'
import { getTranslations } from 'next-intl/server'
import { billingErrorMessage } from '@/lib/billing/stripe-error'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
import { getUserLocale } from '@/lib/i18n/getLocale'
import { stripe } from '@/lib/billing/stripe'
import { supabaseService } from '@/lib/billing/supabase-service'

function sanitizeFilenamePart(value: string) {
  return value.replace(/[^a-zA-Z0-9-_]/g, '-')
}

export async function GET(
  request: Request,
  { params }: { params: { invoiceId: string } },
) {
  try {
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken, locale)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: t('billing.profileNotFound') }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: t('billing.adminOnly') }, { status: 403 })
    }

    const { data: stripeCustomer } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!stripeCustomer?.stripe_customer_id) {
      return NextResponse.json({ error: t('billing.stripeCustomerNotFoundForFamily') }, { status: 404 })
    }

    const invoice = await stripe.invoices.retrieve(params.invoiceId)
    const invoiceCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

    if (!invoiceCustomerId || invoiceCustomerId !== stripeCustomer.stripe_customer_id) {
      return NextResponse.json({ error: t('billing.invoiceNotFoundForFamily') }, { status: 404 })
    }

    if (!invoice.invoice_pdf) {
      return NextResponse.json({ error: t('billing.invoicePdfUnavailable') }, { status: 404 })
    }

	    const pdfResponse = await fetch(invoice.invoice_pdf, { cache: 'no-store' })

    if (!pdfResponse.ok) {
      return NextResponse.json({ error: t('billing.invoicePdfDownloadFailed') }, { status: 502 })
    }

    const pdfBuffer = await pdfResponse.arrayBuffer()
    const invoiceNumber = sanitizeFilenamePart(invoice.number || params.invoiceId)
    const filename = `florim-fatura-${invoiceNumber}.pdf`

    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'private, no-store',
      },
    })
  } catch (error: any) {
    console.error('invoice-pdf failed', error)
    const locale = await getUserLocale()
    const t = await getTranslations({ locale, namespace: 'apiErrors' })
    return NextResponse.json({ error: billingErrorMessage(error, t('billing.downloadPdfUnexpectedError')) }, { status: 500 })
  }
}
