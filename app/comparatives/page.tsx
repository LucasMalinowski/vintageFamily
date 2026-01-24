'use client'

import AppLayout from '@/components/layout/AppLayout'
import Topbar from '@/components/layout/Topbar'
import VintageCard from '@/components/ui/VintageCard'
import { TrendingUp } from 'lucide-react'

export default function ComparativesPage() {
  return (
    <AppLayout>
      <Topbar 
        title="Comparativos" 
        subtitle="Entender o passado nos ajuda a construir o futuro."
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <VintageCard className="text-center py-12">
          <TrendingUp className="w-16 h-16 mx-auto mb-4 text-olive" />
          <h3 className="text-2xl font-serif text-coffee mb-2">Em breve</h3>
          <p className="text-ink/60 italic">Esta página está sendo construída.</p>
        </VintageCard>
      </div>
    </AppLayout>
  )
}
