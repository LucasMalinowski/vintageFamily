import type { AppLocale } from '@/lib/i18n/getLocale'

export type ComparisonRow = { label: string; free: string | boolean; pro: string | boolean }
export type FaqItem = { q: string; a: string }

type PlansContentData = {
  comparisonRows: ComparisonRow[]
  faqItems: FaqItem[]
  freeBullets: string[]
  monthlyProBullets: string[]
  annualProBullets: string[]
}

export const PLANS_CONTENT: Record<AppLocale, PlansContentData> = {
  'pt-BR': {
    comparisonRows: [
      { label: 'Despesas c/ parcelamento', free: true, pro: true },
      { label: 'Receitas', free: true, pro: true },
      { label: 'Objetivos e sonhos', free: true, pro: true },
      { label: 'Lembretes e vencimento', free: true, pro: true },
      { label: 'Família compartilhada', free: true, pro: true },
      { label: 'WhatsApp para registrar lançamentos', free: '25/mês', pro: 'Ilimitado' },
      { label: 'Consultas com IA pelo WhatsApp', free: '7/mês', pro: 'Ilimitado' },
      { label: 'Insights sob demanda', free: '3/mês', pro: 'Ilimitado' },
      { label: 'Insights automáticos', free: '1/mês + previsão', pro: 'Semanal, quinzenal ou mensal' },
      { label: 'Sugestão de categorias com IA', free: true, pro: true },
      { label: 'Detecção de registros recorrentes', free: true, pro: true },
      { label: 'Importação e exportação', free: '3/mês', pro: 'Ilimitado' },
      { label: 'Histórico nos comparativos', free: '2 meses', pro: 'Completo' },
      { label: 'Prioridade em novidades', free: false, pro: true },
    ],
    faqItems: [
      { q: 'Existe plano gratuito?', a: 'Sim. O plano gratuito continua disponível depois do cadastro, com limites mensais para WhatsApp, consultas com IA, insights e importações/exportações. Você pode assinar o Pro quando precisar de uso ilimitado.' },
      { q: 'Quantas pessoas podem usar a mesma conta?', a: 'Você pode convidar membros da sua família. Todos compartilham os mesmos dados em tempo real, tanto no gratuito quanto no Pro.' },
      { q: 'Posso cancelar a qualquer momento?', a: 'Sim. No Pro mensal, você cancela quando quiser e o acesso continua até o fim do período pago. No Pro anual, o cancelamento encerra a renovação automática no próximo ciclo anual.' },
      { q: 'Meus dados financeiros estão seguros?', a: 'Sim. Os dados são armazenados com criptografia em repouso e em trânsito. Nunca vendemos ou compartilhamos informações da sua família com terceiros.' },
      { q: 'Posso trocar do plano mensal para o anual depois?', a: 'Sim. Você pode migrar do Pro mensal para o Pro anual a qualquer momento pela área de configurações da sua conta, sem perder nenhum dado.' },
      { q: 'O que muda do gratuito para o Pro?', a: 'O Pro remove os limites mensais das rotinas principais, libera histórico comparativo completo, importação/exportação ilimitada, WhatsApp e IA para uso contínuo, além de configuração avançada de insights.' },
    ],
    freeBullets: ['Registro ilimitado de contas, receitas, objetivos e lembretes', 'Família compartilhada', '25 registros por WhatsApp/mês', '7 consultas com IA/mês', '3 insights sob demanda/mês', '3 importações/exportações/mês', 'Histórico comparativo de 2 meses'],
    monthlyProBullets: ['Tudo do gratuito', 'WhatsApp e consultas com IA ilimitadas', 'Insights sob demanda ilimitados', 'Importação e exportação ilimitadas', 'Histórico comparativo completo', 'Frequência de insights ajustável', 'Prioridade em novas funcionalidades'],
    annualProBullets: ['Tudo do Pro mensal', 'Economia de R$ 49,80 no ano', 'Preço fixo durante o contrato', 'Prioridade em novas funcionalidades'],
  },
  en: {
    comparisonRows: [
      { label: 'Expenses w/ installments', free: true, pro: true },
      { label: 'Income', free: true, pro: true },
      { label: 'Goals and dreams', free: true, pro: true },
      { label: 'Reminders and due dates', free: true, pro: true },
      { label: 'Shared family', free: true, pro: true },
      { label: 'WhatsApp to record entries', free: '25/month', pro: 'Unlimited' },
      { label: 'AI queries via WhatsApp', free: '7/month', pro: 'Unlimited' },
      { label: 'On-demand insights', free: '3/month', pro: 'Unlimited' },
      { label: 'Automatic insights', free: '1/month + forecast', pro: 'Weekly, biweekly, or monthly' },
      { label: 'AI category suggestions', free: true, pro: true },
      { label: 'Recurring entry detection', free: true, pro: true },
      { label: 'Import and export', free: '3/month', pro: 'Unlimited' },
      { label: 'Comparatives history', free: '2 months', pro: 'Full' },
      { label: 'Priority on new features', free: false, pro: true },
    ],
    faqItems: [
      { q: 'Is there a free plan?', a: "Yes. The free plan stays available after signup, with monthly limits for WhatsApp, AI queries, insights, and imports/exports. You can subscribe to Pro whenever you need unlimited use." },
      { q: 'How many people can use the same account?', a: 'You can invite members of your family. Everyone shares the same data in real time, on both the free plan and Pro.' },
      { q: 'Can I cancel anytime?', a: 'Yes. On Monthly Pro, you can cancel whenever you want and access continues until the end of the paid period. On Annual Pro, canceling stops the automatic renewal at the next annual cycle.' },
      { q: 'Is my financial data secure?', a: "Yes. Data is stored encrypted at rest and in transit. We never sell or share your family's information with third parties." },
      { q: 'Can I switch from monthly to annual later?', a: 'Yes. You can move from Monthly Pro to Annual Pro at any time from your account settings, without losing any data.' },
      { q: 'What changes from free to Pro?', a: 'Pro removes the monthly limits on core routines, unlocks full comparatives history, unlimited import/export, continuous WhatsApp and AI use, plus advanced insight settings.' },
    ],
    freeBullets: ['Unlimited expenses, income, goals, and reminders', 'Shared family', '25 WhatsApp entries/month', '7 AI queries/month', '3 on-demand insights/month', '3 imports/exports per month', '2-month comparatives history'],
    monthlyProBullets: ['Everything in Free', 'Unlimited WhatsApp and AI queries', 'Unlimited on-demand insights', 'Unlimited import and export', 'Full comparatives history', 'Adjustable insight frequency', 'Priority on new features'],
    annualProBullets: ['Everything in Monthly Pro', 'Save R$ 49.80 per year', 'Fixed price for the term', 'Priority on new features'],
  },
  es: {
    comparisonRows: [
      { label: 'Gastos con cuotas', free: true, pro: true },
      { label: 'Ingresos', free: true, pro: true },
      { label: 'Objetivos y sueños', free: true, pro: true },
      { label: 'Recordatorios y vencimientos', free: true, pro: true },
      { label: 'Familia compartida', free: true, pro: true },
      { label: 'WhatsApp para registrar movimientos', free: '25/mes', pro: 'Ilimitado' },
      { label: 'Consultas con IA por WhatsApp', free: '7/mes', pro: 'Ilimitado' },
      { label: 'Insights a pedido', free: '3/mes', pro: 'Ilimitado' },
      { label: 'Insights automáticos', free: '1/mes + previsión', pro: 'Semanal, quincenal o mensual' },
      { label: 'Sugerencia de categorías con IA', free: true, pro: true },
      { label: 'Detección de movimientos recurrentes', free: true, pro: true },
      { label: 'Importación y exportación', free: '3/mes', pro: 'Ilimitado' },
      { label: 'Historial en comparativos', free: '2 meses', pro: 'Completo' },
      { label: 'Prioridad en novedades', free: false, pro: true },
    ],
    faqItems: [
      { q: '¿Existe un plan gratuito?', a: 'Sí. El plan gratuito sigue disponible después del registro, con límites mensuales para WhatsApp, consultas con IA, insights e importaciones/exportaciones. Puedes suscribirte a Pro cuando necesites uso ilimitado.' },
      { q: '¿Cuántas personas pueden usar la misma cuenta?', a: 'Puedes invitar a miembros de tu familia. Todos comparten los mismos datos en tiempo real, tanto en el gratuito como en el Pro.' },
      { q: '¿Puedo cancelar en cualquier momento?', a: 'Sí. En el Pro mensual, cancelas cuando quieras y el acceso continúa hasta el final del período pagado. En el Pro anual, la cancelación detiene la renovación automática en el próximo ciclo anual.' },
      { q: '¿Mis datos financieros están seguros?', a: 'Sí. Los datos se almacenan con cifrado en reposo y en tránsito. Nunca vendemos ni compartimos la información de tu familia con terceros.' },
      { q: '¿Puedo cambiar del plan mensual al anual después?', a: 'Sí. Puedes migrar del Pro mensual al Pro anual en cualquier momento desde la configuración de tu cuenta, sin perder ningún dato.' },
      { q: '¿Qué cambia del gratuito al Pro?', a: 'El Pro elimina los límites mensuales de las rutinas principales, libera el historial comparativo completo, importación/exportación ilimitada, WhatsApp e IA para uso continuo, además de configuración avanzada de insights.' },
    ],
    freeBullets: ['Registro ilimitado de cuentas, ingresos, objetivos y recordatorios', 'Familia compartida', '25 registros por WhatsApp/mes', '7 consultas con IA/mes', '3 insights a pedido/mes', '3 importaciones/exportaciones/mes', 'Historial comparativo de 2 meses'],
    monthlyProBullets: ['Todo lo del gratuito', 'WhatsApp y consultas con IA ilimitadas', 'Insights a pedido ilimitados', 'Importación y exportación ilimitadas', 'Historial comparativo completo', 'Frecuencia de insights ajustable', 'Prioridad en nuevas funcionalidades'],
    annualProBullets: ['Todo lo del Pro mensual', 'Ahorro de R$ 49,80 al año', 'Precio fijo durante el contrato', 'Prioridad en nuevas funcionalidades'],
  },
}
