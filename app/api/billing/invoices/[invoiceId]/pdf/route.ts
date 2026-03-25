import { NextResponse } from 'next/server'
import { getAccessTokenFromAuthHeader, getProfileByUserId, requireUserByAccessToken } from '@/lib/billing/auth'
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
    const accessToken = getAccessTokenFromAuthHeader(request)
    const auth = await requireUserByAccessToken(accessToken)

    if (!auth.user) {
      return NextResponse.json({ error: auth.error }, { status: auth.status })
    }

    const profile = await getProfileByUserId(auth.user.id)
    if (!profile) {
      return NextResponse.json({ error: 'Perfil não encontrado.' }, { status: 404 })
    }

    if (profile.role !== 'admin') {
      return NextResponse.json({ error: 'Apenas administradores da família podem gerenciar cobrança.' }, { status: 403 })
    }

    const { data: stripeCustomer } = await supabaseService
      .from('stripe_customers')
      .select('stripe_customer_id')
      .eq('family_id', profile.family_id)
      .maybeSingle()

    if (!stripeCustomer?.stripe_customer_id) {
      return NextResponse.json({ error: 'Cliente Stripe não encontrado para esta família.' }, { status: 404 })
    }

    const invoice = await stripe.invoices.retrieve(params.invoiceId)
    const invoiceCustomerId = typeof invoice.customer === 'string' ? invoice.customer : invoice.customer?.id

    if (!invoiceCustomerId || invoiceCustomerId !== stripeCustomer.stripe_customer_id) {
      return NextResponse.json({ error: 'Fatura não encontrada para esta família.' }, { status: 404 })
    }

    if (!invoice.invoice_pdf) {
      return NextResponse.json({ error: 'PDF da fatura indisponível.' }, { status: 404 })
    }

    const pdfResponse = await fetch(invoice.invoice_pdf)

    if (!pdfResponse.ok) {
      return NextResponse.json({ error: 'Não foi possível baixar o PDF da fatura.' }, { status: 502 })
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
    return NextResponse.json({ error: error?.message || 'Erro inesperado ao baixar PDF.' }, { status: 500 })
  }
}
