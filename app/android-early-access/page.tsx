import type { Metadata } from 'next'
import PublicNavbar from '@/components/layout/PublicNavbar'
import PublicFooter from '@/components/layout/PublicFooter'
import AndroidEarlyAccessForm from './AndroidEarlyAccessForm'
import Image from 'next/image'

export const metadata: Metadata = {
  title: 'Florim para Android — Acesso Antecipado',
  description: 'O Florim está chegando ao Android. Cadastre seu e-mail e seja um dos primeiros a receber o acesso.',
  robots: { index: false },
}

export default function AndroidEarlyAccessPage() {
  return (
    <>
      <PublicNavbar />
      <main className="bg-paper min-h-screen">
        <div className="max-w-lg mx-auto px-5 pb-20 pt-24 md:pt-36 flex flex-col items-center text-center">

          <div className="flex items-center justify-center gap-3 mb-8">
            <Image src="/logo.png" alt="Florim" width={52} height={52} className="w-13 h-13 object-contain" />
            <div className="w-px h-10 bg-border" />
            <svg viewBox="0 0 24 24" fill="currentColor" className="w-9 h-9 text-[#3DDC84]" aria-hidden>
              <path d="M17.523 15.341 14.56 10.5l2.963-4.841a.5.5 0 0 0-.855-.524l-2.916 4.764H10.25L7.334 5.135a.5.5 0 1 0-.855.524L9.44 10.5l-2.961 4.841a.5.5 0 1 0 .855.524L10.25 11.5h3.5l2.918 4.365a.5.5 0 0 0 .855-.524ZM8.5 17a1 1 0 1 1 0 2 1 1 0 0 1 0-2Zm7 0a1 1 0 1 1 0 2 1 1 0 0 1 0-2Z" />
            </svg>
          </div>

          <h1 className="font-serif text-3xl md:text-4xl text-coffee mb-3 leading-tight">
            Florim para Android
          </h1>
          <p className="font-serif text-xl text-gold italic mb-2">Em breve</p>
          <p className="font-body text-ink/70 text-[15px] leading-relaxed mb-10 max-w-sm">
            Estamos finalizando o app para Android e queremos que você seja um dos primeiros a ter acesso.
            Deixe seu e-mail e avisaremos assim que estiver pronto.
          </p>

          <AndroidEarlyAccessForm />

          <p className="mt-8 font-body text-[12px] text-ink/40 max-w-xs">
            Sem spam. Só um aviso quando o app estiver disponível na Play Store.
          </p>
        </div>
      </main>
      <PublicFooter />
    </>
  )
}
