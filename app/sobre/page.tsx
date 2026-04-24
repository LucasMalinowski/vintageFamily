'use client'

import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import { Users } from 'lucide-react'

export default function InternalAboutPage() {
  return (
    <AppLayout>
      <div className="flex flex-col min-h-screen bg-paper">
        <Topbar
          title="Sobre o Florim"
          subtitle="Feito por uma família, para familias."
          showBackButton
          variant="textured"
        />

        <div className="flex-1 px-6 py-8 max-w-2xl mx-auto w-full">
          {/* Placeholder avatar */}
          <div className="flex justify-center mb-8">
            <div className="w-28 h-28 rounded-full bg-ink/10 flex items-center justify-center">
              <Users className="w-12 h-12 text-ink/30" />
            </div>
          </div>

          <article className="font-body text-[16px] font-light leading-[1.75] text-sidebar/90 tracking-wide space-y-4">
            <p>
              O nome <strong>Florim</strong> carrega raízes profundas na história econômica da Europa. Ele nasce do{' '}
              <span className="italic text-petrol">fiorino d'oro</span>, moeda de ouro cunhada em Florença no século XIII.
            </p>

            <p>
              Foi a partir dessa realidade que o Florim nasceu, dentro da família Malinowski, compreendendo
              que dinheiro não é apenas número. É <span className="text-gold italic">emoção</span>, escolha, projeto de vida.
            </p>

            <p>
              <strong>Florim</strong> é valor que permanece.<br />
              <span className="text-petrol"><strong>Feito por uma família</strong>, para famílias.</span>
            </p>
          </article>
        </div>

        <div className="py-8 text-center">
          <p className="font-ptSerif text-xl font-light italic text-gold/80">Histórias que inspiram</p>
        </div>
      </div>
    </AppLayout>
  )
}
