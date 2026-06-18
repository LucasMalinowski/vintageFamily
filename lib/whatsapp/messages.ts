import type { AppLocale } from '@/lib/i18n/getLocale'

export const WHATSAPP_DEFAULT_LOCALE: AppLocale = 'pt-BR'

export const WHATSAPP_MONTH_NAMES: Record<AppLocale, string[]> = {
  'pt-BR': ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'],
  en: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  es: ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'],
}

type WhatsAppMessages = {
  notRegistered: string
  privacyNotice: (appUrl: string) => string
  usageHint: string
  feedbackLine: string
  forecastConfidence: { high: string; medium: string; low: string }
  forecastInsufficientData: string
  forecastError: string
  otpFallback: (code: string) => string

  forecast: {
    header: (month: string) => string
    spendingEstimate: (amount: string) => string
    breakdownHeader: string
    fixedLabel: string
    installmentsLabel: string
    variableLabel: string
    annualLabel: string
    anomalyNote: (category: string, month: string, amount: string) => string
  }

  usage: {
    proPlan: string
    trialPlan: string
    freePlan: string
    recordings: (used: number, limit: number) => string
    aiQueries: (used: number, limit: number) => string
    audioMessages: (used: number, limit: number) => string
    nearLimit: string
    upgradeHint: string
  }

  query: {
    intentFallback: string
    noRecords: (period: string) => string
    noFocusRecords: (label: string, period: string) => string
    periodInMonth: (month: string) => string
    periodInYear: (year: string) => string
    periodLastDays: string
    periodNextDays: string
    pendingPrefix: string
    expensesLabel: string
    incomesLabel: string
    relatedContext: (label: string, amount: string) => string
    editHint: string
    moreItems: (count: number) => string
    viewAll: string
    sumSentence: (amount: string, label: string, period: string, isIncome: boolean) => string
    maxSingle: (period: string, desc: string, date: string, amount: string) => string
    maxCategoryHeader: (period: string, cat: string, total: string) => string
    maxCategoryItems: (count: number) => string
    maxRunnerUp: (cat: string, total: string) => string
    countSentence: (count: number, label: string, period: string) => string
    listHeader: (label: string, period: string) => string
    savingsHeader: string
    savingsTarget: (amount: string) => string
    savingsContributed: (period: string, amount: string) => string
    savingsNoContributions: (period: string) => string
    remindersHeader: (period: string) => string
    remindersPending: string
    remindersDone: string
    reminderDue: (date: string) => string
  }

  save: {
    created: string
    failed: string
    reminderLine: (desc: string, date: string) => string
    reminderToday: string
    expensePaid: string
    expensePending: string
    expenseInstallment: (perAmount: string, count: number) => string
    incomeReceived: string
    incomePending: string
    createdViaWhatsApp: string
    goalNotFound: (name: string) => string
    invalidAmount: (desc: string) => string
    unknownType: (desc: string) => string
  }

  mutation: {
    noRecentList: string
    itemNotFound: (idx: number) => string
    cannotDelete: string
    cannotEdit: string
    deleteError: string
    deleteSuccess: (desc: string, amountStr: string) => string
    editNoField: (idx: number) => string
    editMultipleFields: (idx: number) => string
    editAmountInvalid: (idx: number) => string
    editAmountError: string
    editAmountSuccess: (desc: string, amount: string) => string
    editCategoryNotFound: (cat: string) => string
    editCategoryNotAllowed: string
    editCategoryError: string
    editCategorySuccess: (desc: string, cat: string) => string
    editPaymentNotExpense: string
    editPaymentInvalid: (method: string) => string
    editPaymentError: string
    editPaymentSuccess: (desc: string, method: string) => string
  }

  button: {
    unknownReply: string
    noConfirmationPending: string
    confirmationExpired: string
    rejected: string
    alreadyProcessed: string
    pendingActionError: string
    audioConfirmFallback: (summaryText: string) => string
  }

  errors: {
    usageFetchError: string
    queryFetchError: string
    extractionRateLimit: string
    extractionError: string
    queryLimitReached: string
    recordingLimitReached: string
    audioTranscriptNote: (text: string) => string
  }
}

const WHATSAPP_MESSAGES: Record<AppLocale, WhatsAppMessages> = {
  'pt-BR': {
    notRegistered: 'Número não cadastrado no Florim. Acesse o app para vincular seu WhatsApp.',
    privacyNotice: (appUrl) =>
      `> 🔒 Em conformidade com a *LGPD*, seus dados são tratados com total segurança pelo *Florim*. Nenhuma informação é compartilhada com terceiros.\n` +
      `> 📄 Termos e Política de Privacidade: ${appUrl}/termos-e-servicos`,
    usageHint: `Olá! 👋 Para registrar suas finanças, envie mensagens como:

💸 *Despesa:* "Gastei 50 reais no mercado no pix"
💸 *Parcelado:* "Comprei um tênis de 150 em 3x"
💰 *Receita:* "Recebi 1500 de salário"
⭐ *Objetivo:* "Guardei 200 para a viagem"
📝 *Lembrete:* "Me lembre de pagar o aluguel"

Você também pode combinar: "Gastei 30 na farmácia e 55 de gasolina"

🔍 *Consultar:* "Quanto gastei esse mês?" ou "Quais minhas contas a pagar?"
✏️ *Editar/Apagar:* depois de uma lista, "apaga o 2", "edita o 1 para 60" ou "muda a categoria do 3 para Lazer"
📊 *Seu plano:* envie "meu plano" ou "meus limites" para ver seu uso do mês`,
    feedbackLine: '\n\n_Algo deu errado? Nos conte: https://florim.app/feedback_',
    forecastConfidence: {
      high: 'Previsão com boa confiança, baseada no seu histórico recente.',
      medium: 'Previsão com confiança média - ainda temos poucos meses de histórico.',
      low: 'Previsão com baixa confiança - poucos dados disponíveis ainda.',
    },
    forecastInsufficientData: 'Ainda não tenho dados suficientes para estimar seus gastos do mês que vem. Continue registrando suas despesas que em breve eu consigo te ajudar com isso! 📊',
    forecastError: 'Não consegui calcular sua previsão agora. Tente novamente em instantes. 🔄',
    otpFallback: (code) => `Seu código de verificação do Florim é: *${code}*\nVálido por 10 minutos. Não compartilhe este código.`,

    forecast: {
      header: (month) => `📊 *Previsão para ${month}*`,
      spendingEstimate: (amount) => `Você deve gastar aproximadamente *${amount}* no total.`,
      breakdownHeader: '*Detalhamento:*',
      fixedLabel: 'Fixos recorrentes',
      installmentsLabel: 'Parcelas em curso',
      variableLabel: 'Variáveis (estimado)',
      annualLabel: 'Eventos sazonais',
      anomalyNote: (category, month, amount) =>
        `💡 Notei que *${category}* teve um pico em ${month} (${amount} acima do normal). Se isso se repete todo ano, confirme pelo app para eu considerar nas próximas previsões.`,
    },

    usage: {
      proPlan: '✅ *Plano Pro* — uso ilimitado de mensagens, consultas e áudios. Aproveite! 🚀',
      trialPlan: '🎁 *Período de teste ativo*',
      freePlan: '📊 *Plano gratuito*',
      recordings: (used, limit) => `💬 Mensagens no WhatsApp: ${used}/${limit}`,
      aiQueries: (used, limit) => `🔍 Consultas (IA): ${used}/${limit}`,
      audioMessages: (used, limit) => `🎙️ Áudios: ${used}/${limit}`,
      nearLimit: '🎯 Você está no limite do plano gratuito. Assine o Florim Pro para uso ilimitado: florim.app/pricing',
      upgradeHint: '💡 Quer mais? Assine o Florim Pro para uso ilimitado: florim.app/pricing',
    },

    query: {
      intentFallback: 'Não entendi o que você quer consultar. Tente perguntar como: "Quanto gastei esse mês?" 😊',
      noRecords: (period) => `Não encontrei registros${period}. 📊`,
      noFocusRecords: (label, period) => `Não encontrei ${label}${period}. 📊`,
      periodInMonth: (month) => ` em ${month}`,
      periodInYear: (year) => ` em ${year}`,
      periodLastDays: ' nos últimos 7 dias',
      periodNextDays: ' nos próximos 7 dias',
      pendingPrefix: 'pendentes',
      expensesLabel: 'gastos',
      incomesLabel: 'receitas',
      relatedContext: (label, amount) => `_Relacionado - ${label}: *${amount}*_`,
      editHint: '_Para editar ou apagar: "edita o 2 para 60" ou "apaga o 1"_',
      moreItems: (count) => `_...e mais ${count} lançamentos_`,
      viewAll: 'Ver todos:',
      sumSentence: (amount, label, period, isIncome) =>
        `Você ${isIncome ? 'recebeu' : 'gastou'} *${amount}* em ${label}${period}:\n`,
      maxSingle: (period, desc, date, amount) =>
        `Seu maior gasto${period}: *${desc}* em ${date} - *${amount}*`,
      maxCategoryHeader: (period, cat, total) =>
        `Seu maior gasto${period} foi em *${cat}* (*${total}* no total):`,
      maxCategoryItems: (count) => `_${count} lançamentos:_`,
      maxRunnerUp: (cat, total) => `\n2º lugar: *${cat}* - *${total}*`,
      countSentence: (count, label, period) =>
        `Você teve *${count}* lançamento${count !== 1 ? 's' : ''} em ${label}${period}:\n`,
      listHeader: (label, period) => `Seus ${label}${period}:\n`,
      savingsHeader: 'Seus objetivos:\n',
      savingsTarget: (amount) => ` | Meta: *${amount}*`,
      savingsContributed: (period, amount) => ` | Guardado${period}: *${amount}*`,
      savingsNoContributions: (period) => ` | _sem contribuições${period}_`,
      remindersHeader: (period) => `Lembretes${period}:\n`,
      remindersPending: '_Pendentes:_',
      remindersDone: '_Concluídos:_',
      reminderDue: (date) => ` - vence ${date}`,
    },

    save: {
      created: '✅ Criados:',
      failed: '⚠️ Não foi possível criar:',
      reminderLine: (desc, date) => `📝 ${desc} _(lembrete para ${date})_`,
      reminderToday: 'hoje',
      expensePaid: '_(pago)_',
      expensePending: '_(pendente)_',
      expenseInstallment: (perAmount, count) => `_(${perAmount} × ${count} - 1ª parcela paga)_`,
      incomeReceived: '_(recebido)_',
      incomePending: '_(a receber)_',
      createdViaWhatsApp: 'Criado via WhatsApp',
      goalNotFound: (name) => `⭐ Objetivo "${name}" não encontrado no Florim`,
      invalidAmount: (desc) => `❌ Valor inválido: ${desc}`,
      unknownType: (desc) => `❌ Tipo desconhecido: ${desc}`,
    },

    mutation: {
      noRecentList: 'Não encontrei uma lista recente. Primeiro me peça uma lista para poder editar ou apagar itens.',
      itemNotFound: (idx) => `Item ${idx} não encontrado na última lista.`,
      cannotDelete: 'Não foi possível apagar esse tipo de registro.',
      cannotEdit: 'Não foi possível editar esse tipo de registro.',
      deleteError: 'Não foi possível apagar o item. Tente novamente.',
      deleteSuccess: (desc, amountStr) => `✅ Removido: ${desc}${amountStr}`,
      editNoField: (idx) => `Não entendi o que editar no item ${idx}. Tente: "edita o ${idx} para 60", "muda a categoria do ${idx} para Lazer" ou "o ${idx} foi no pix".`,
      editMultipleFields: (idx) => `Por agora só consigo editar uma coisa por vez. Envie um pedido para o valor, outro para a categoria, ou outro para a forma de pagamento do item ${idx}.`,
      editAmountInvalid: (idx) => `Valor inválido. Tente: "edita o ${idx} para 60"`,
      editAmountError: 'Não foi possível editar o item. Tente novamente.',
      editAmountSuccess: (desc, amount) => `✅ Atualizado: ${desc} - ${amount}`,
      editCategoryNotFound: (cat) => `Não encontrei a categoria "${cat}". Verifique o nome e tente de novo.`,
      editCategoryNotAllowed: 'Não é possível editar a categoria desse tipo de registro.',
      editCategoryError: 'Não foi possível editar a categoria. Tente novamente.',
      editCategorySuccess: (desc, cat) => `✅ Categoria atualizada: ${desc} → ${cat}`,
      editPaymentNotExpense: 'Receitas não têm forma de pagamento registrada — apenas despesas. Não há nada para editar aqui.',
      editPaymentInvalid: (method) => `Não reconheci a forma de pagamento "${method}". Tente: pix, débito, crédito, dinheiro, vale alimentação, vale refeição, cheque ou transferência.`,
      editPaymentError: 'Não foi possível editar a forma de pagamento. Tente novamente.',
      editPaymentSuccess: (desc, method) => `✅ Forma de pagamento atualizada: ${desc} → ${method}`,
    },

    button: {
      unknownReply: 'Não reconheci essa resposta. Envie uma mensagem de texto ou áudio para continuar.',
      noConfirmationPending: 'Não encontrei uma confirmação pendente. Envie um novo áudio ou mensagem de texto.',
      confirmationExpired: 'Essa confirmação expirou. Envie o áudio ou mensagem novamente para eu processar com segurança.',
      rejected: 'Tudo bem, estarei aguardando seu novo áudio ou mensagem de texto.',
      alreadyProcessed: 'Essa confirmação já foi processada. Envie um novo áudio ou mensagem se precisar registrar outra coisa.',
      pendingActionError: 'Não consegui preparar a confirmação do áudio. Tente novamente. 🔄',
      audioConfirmFallback: (summaryText) =>
        `Confirmando o que você disse:\n\n${summaryText}\n\nResponda "Sim, criar" para confirmar ou envie outro áudio/texto para corrigir.`,
    },

    errors: {
      usageFetchError: 'Não consegui buscar seu uso agora. Tente novamente em instantes. 🔄',
      queryFetchError: 'Não consegui buscar seus dados agora. Tente novamente em instantes. 🔄',
      extractionRateLimit: 'O Florim está sobrecarregado no momento. Tente novamente em instantes. ⏳',
      extractionError: 'Erro ao processar sua mensagem. Tente novamente. 🔄',
      queryLimitReached: 'Você usou todas as 7 consultas gratuitas deste mês. 🎯\n\nAssine o Florim Pro para consultas ilimitadas: florim.app/pricing\n\nCancele quando quiser. Seus dados ficam para sempre.',
      recordingLimitReached: 'Você usou todas as 25 mensagens gratuitas deste mês. 🎯\n\nAssine o Florim Pro para mensagens ilimitadas: florim.app/pricing\n\nCancele quando quiser. Seus dados ficam para sempre.',
      audioTranscriptNote: (text) => `Transcrevi seu áudio como: "${text}"\n\nSe eu entendi errado, tente enviar de novo.\n\n`,
    },
  },

  en: {
    notRegistered: 'This number is not registered with Florim. Open the app to link your WhatsApp.',
    privacyNotice: (appUrl) =>
      `> 🔒 In compliance with data protection regulations, your data is handled securely by *Florim*. No information is shared with third parties.\n` +
      `> 📄 Terms and Privacy Policy: ${appUrl}/termos-e-servicos`,
    usageHint: `Hi! 👋 To track your finances, send messages like:

💸 *Expense:* "Spent 50 on groceries with debit card"
💸 *Installments:* "Bought sneakers for 150 in 3x"
💰 *Income:* "Received 1500 salary"
⭐ *Goal:* "Saved 200 for the trip"
📝 *Reminder:* "Remind me to pay the rent"

You can also combine them: "Spent 30 at the pharmacy and 55 on gas"

🔍 *Query:* "How much did I spend this month?" or "What bills do I have to pay?"
✏️ *Edit/Delete:* after a list, "delete item 2", "edit item 1 to 60" or "change item 3's category to Leisure"
📊 *Your plan:* send "my plan" or "my limits" to see your usage this month`,
    feedbackLine: '\n\n_Something wrong? Let us know: https://florim.app/feedback_',
    forecastConfidence: {
      high: 'High-confidence forecast, based on your recent history.',
      medium: 'Medium-confidence forecast - we still have only a few months of history.',
      low: 'Low-confidence forecast - little data available yet.',
    },
    forecastInsufficientData: "I don't have enough data yet to estimate next month's spending. Keep recording your expenses and I'll be able to help with this soon! 📊",
    forecastError: "I couldn't calculate your forecast right now. Please try again in a moment. 🔄",
    otpFallback: (code) => `Your Florim verification code is: *${code}*\nValid for 10 minutes. Do not share this code.`,

    forecast: {
      header: (month) => `📊 *Forecast for ${month}*`,
      spendingEstimate: (amount) => `You should spend approximately *${amount}* in total.`,
      breakdownHeader: '*Breakdown:*',
      fixedLabel: 'Recurring fixed',
      installmentsLabel: 'Ongoing installments',
      variableLabel: 'Variable (estimated)',
      annualLabel: 'Seasonal events',
      anomalyNote: (category, month, amount) =>
        `💡 I noticed *${category}* had a spike in ${month} (${amount} above normal). If this happens every year, confirm it in the app so I can factor it into future forecasts.`,
    },

    usage: {
      proPlan: '✅ *Pro Plan* — unlimited messages, queries and audio. Enjoy! 🚀',
      trialPlan: '🎁 *Active trial period*',
      freePlan: '📊 *Free plan*',
      recordings: (used, limit) => `💬 WhatsApp messages: ${used}/${limit}`,
      aiQueries: (used, limit) => `🔍 AI queries: ${used}/${limit}`,
      audioMessages: (used, limit) => `🎙️ Audio messages: ${used}/${limit}`,
      nearLimit: "🎯 You've reached the free plan limit. Subscribe to Florim Pro for unlimited use: florim.app/pricing",
      upgradeHint: '💡 Want more? Subscribe to Florim Pro for unlimited use: florim.app/pricing',
    },

    query: {
      intentFallback: 'I didn\'t understand what you want to look up. Try asking: "How much did I spend this month?" 😊',
      noRecords: (period) => `No records found${period}. 📊`,
      noFocusRecords: (label, period) => `No ${label} found${period}. 📊`,
      periodInMonth: (month) => ` in ${month}`,
      periodInYear: (year) => ` in ${year}`,
      periodLastDays: ' in the last 7 days',
      periodNextDays: ' in the next 7 days',
      pendingPrefix: 'pending',
      expensesLabel: 'expenses',
      incomesLabel: 'income',
      relatedContext: (label, amount) => `_Related - ${label}: *${amount}*_`,
      editHint: '_To edit or delete: "edit item 2 to 60" or "delete item 1"_',
      moreItems: (count) => `_...and ${count} more entries_`,
      viewAll: 'View all:',
      sumSentence: (amount, label, period, isIncome) =>
        `You ${isIncome ? 'received' : 'spent'} *${amount}* in ${label}${period}:\n`,
      maxSingle: (period, desc, date, amount) =>
        `Your biggest expense${period}: *${desc}* on ${date} - *${amount}*`,
      maxCategoryHeader: (period, cat, total) =>
        `Your biggest expense${period} was in *${cat}* (*${total}* total):`,
      maxCategoryItems: (count) => `_${count} ${count !== 1 ? 'entries' : 'entry'}:_`,
      maxRunnerUp: (cat, total) => `\n2nd place: *${cat}* - *${total}*`,
      countSentence: (count, label, period) =>
        `You had *${count}* ${count !== 1 ? 'entries' : 'entry'} in ${label}${period}:\n`,
      listHeader: (label, period) => `Your ${label}${period}:\n`,
      savingsHeader: 'Your goals:\n',
      savingsTarget: (amount) => ` | Goal: *${amount}*`,
      savingsContributed: (period, amount) => ` | Saved${period}: *${amount}*`,
      savingsNoContributions: (period) => ` | _no contributions${period}_`,
      remindersHeader: (period) => `Reminders${period}:\n`,
      remindersPending: '_Pending:_',
      remindersDone: '_Done:_',
      reminderDue: (date) => ` - due ${date}`,
    },

    save: {
      created: '✅ Created:',
      failed: '⚠️ Could not create:',
      reminderLine: (desc, date) => `📝 ${desc} _(reminder for ${date})_`,
      reminderToday: 'today',
      expensePaid: '_(paid)_',
      expensePending: '_(pending)_',
      expenseInstallment: (perAmount, count) => `_(${perAmount} × ${count} - 1st installment paid)_`,
      incomeReceived: '_(received)_',
      incomePending: '_(to receive)_',
      createdViaWhatsApp: 'Created via WhatsApp',
      goalNotFound: (name) => `⭐ Goal "${name}" not found in Florim`,
      invalidAmount: (desc) => `❌ Invalid amount: ${desc}`,
      unknownType: (desc) => `❌ Unknown type: ${desc}`,
    },

    mutation: {
      noRecentList: "I didn't find a recent list. First ask me for a list so I can edit or delete items.",
      itemNotFound: (idx) => `Item ${idx} not found in the last list.`,
      cannotDelete: 'Cannot delete this record type.',
      cannotEdit: 'Cannot edit this record type.',
      deleteError: 'Could not delete the item. Please try again.',
      deleteSuccess: (desc, amountStr) => `✅ Removed: ${desc}${amountStr}`,
      editNoField: (idx) => `I didn't understand what to edit in item ${idx}. Try: "edit item ${idx} to 60", "change category of ${idx} to Leisure" or "item ${idx} was paid by pix".`,
      editMultipleFields: (idx) => `I can only edit one thing at a time for now. Send one request for the amount, another for the category, or another for the payment method of item ${idx}.`,
      editAmountInvalid: (idx) => `Invalid amount. Try: "edit item ${idx} to 60"`,
      editAmountError: 'Could not update the item. Please try again.',
      editAmountSuccess: (desc, amount) => `✅ Updated: ${desc} - ${amount}`,
      editCategoryNotFound: (cat) => `Category "${cat}" not found. Check the name and try again.`,
      editCategoryNotAllowed: 'Cannot edit the category of this record type.',
      editCategoryError: 'Could not update the category. Please try again.',
      editCategorySuccess: (desc, cat) => `✅ Category updated: ${desc} → ${cat}`,
      editPaymentNotExpense: "Income records don't have a payment method — only expenses do. Nothing to edit here.",
      editPaymentInvalid: (method) => `I didn't recognize the payment method "${method}". Try: pix, debit, credit, cash, meal voucher, food voucher, check or transfer.`,
      editPaymentError: 'Could not update the payment method. Please try again.',
      editPaymentSuccess: (desc, method) => `✅ Payment method updated: ${desc} → ${method}`,
    },

    button: {
      unknownReply: "I didn't recognize that reply. Send a text message or audio to continue.",
      noConfirmationPending: "I didn't find a pending confirmation. Send a new audio or text message.",
      confirmationExpired: 'This confirmation has expired. Send the audio or message again for me to process safely.',
      rejected: "No problem, I'll be waiting for your new audio or text message.",
      alreadyProcessed: 'This confirmation was already processed. Send a new audio or message if you need to record something else.',
      pendingActionError: "I couldn't prepare the audio confirmation. Please try again. 🔄",
      audioConfirmFallback: (summaryText) =>
        `Confirming what you said:\n\n${summaryText}\n\nReply "Yes, create" to confirm or send another audio/text to correct.`,
    },

    errors: {
      usageFetchError: "I couldn't fetch your usage right now. Try again in a moment. 🔄",
      queryFetchError: "I couldn't fetch your data right now. Try again in a moment. 🔄",
      extractionRateLimit: 'Florim is overloaded right now. Try again in a moment. ⏳',
      extractionError: 'Error processing your message. Please try again. 🔄',
      queryLimitReached: "You've used all 7 free queries this month. 🎯\n\nSubscribe to Florim Pro for unlimited queries: florim.app/pricing\n\nCancel anytime. Your data is kept forever.",
      recordingLimitReached: "You've used all 25 free messages this month. 🎯\n\nSubscribe to Florim Pro for unlimited messages: florim.app/pricing\n\nCancel anytime. Your data is kept forever.",
      audioTranscriptNote: (text) => `I transcribed your audio as: "${text}"\n\nIf I got it wrong, try sending it again.\n\n`,
    },
  },

  es: {
    notRegistered: 'Este número no está registrado en Florim. Abre la app para vincular tu WhatsApp.',
    privacyNotice: (appUrl) =>
      `> 🔒 De acuerdo con la normativa de protección de datos, tus datos son tratados con total seguridad por *Florim*. Ninguna información se comparte con terceros.\n` +
      `> 📄 Términos y Política de Privacidad: ${appUrl}/termos-e-servicos`,
    usageHint: `¡Hola! 👋 Para registrar tus finanzas, envía mensajes como:

💸 *Gasto:* "Gasté 50 en el supermercado con débito"
💸 *En cuotas:* "Compré unas zapatillas de 150 en 3 cuotas"
💰 *Ingreso:* "Recibí 1500 de salario"
⭐ *Meta:* "Guardé 200 para el viaje"
📝 *Recordatorio:* "Recuérdame pagar el alquiler"

También puedes combinar: "Gasté 30 en la farmacia y 55 en gasolina"

🔍 *Consultar:* "¿Cuánto gasté este mes?" o "¿Qué cuentas tengo por pagar?"
✏️ *Editar/Borrar:* después de una lista, "borra el 2", "edita el 1 a 60" o "cambia la categoría del 3 a Ocio"
📊 *Tu plan:* envía "mi plan" o "mis límites" para ver tu uso del mes`,
    feedbackLine: '\n\n_¿Algo salió mal? Cuéntanos: https://florim.app/feedback_',
    forecastConfidence: {
      high: 'Previsión con buena confianza, basada en tu historial reciente.',
      medium: 'Previsión con confianza media - todavía tenemos pocos meses de historial.',
      low: 'Previsión con baja confianza - todavía hay pocos datos disponibles.',
    },
    forecastInsufficientData: 'Todavía no tengo suficientes datos para estimar tus gastos del próximo mes. ¡Sigue registrando tus gastos y pronto podré ayudarte con esto! 📊',
    forecastError: 'No pude calcular tu previsión ahora. Inténtalo de nuevo en un momento. 🔄',
    otpFallback: (code) => `Tu código de verificación de Florim es: *${code}*\nVálido por 10 minutos. No compartas este código.`,

    forecast: {
      header: (month) => `📊 *Previsión para ${month}*`,
      spendingEstimate: (amount) => `Deberías gastar aproximadamente *${amount}* en total.`,
      breakdownHeader: '*Desglose:*',
      fixedLabel: 'Fijos recurrentes',
      installmentsLabel: 'Cuotas en curso',
      variableLabel: 'Variables (estimado)',
      annualLabel: 'Eventos estacionales',
      anomalyNote: (category, month, amount) =>
        `💡 Noté que *${category}* tuvo un pico en ${month} (${amount} por encima de lo normal). Si esto ocurre cada año, confírmalo en la app para considerarlo en futuras previsiones.`,
    },

    usage: {
      proPlan: '✅ *Plan Pro* — mensajes, consultas y audios ilimitados. ¡Disfrútalo! 🚀',
      trialPlan: '🎁 *Período de prueba activo*',
      freePlan: '📊 *Plan gratuito*',
      recordings: (used, limit) => `💬 Mensajes de WhatsApp: ${used}/${limit}`,
      aiQueries: (used, limit) => `🔍 Consultas (IA): ${used}/${limit}`,
      audioMessages: (used, limit) => `🎙️ Audios: ${used}/${limit}`,
      nearLimit: '🎯 Alcanzaste el límite del plan gratuito. Suscríbete a Florim Pro para uso ilimitado: florim.app/pricing',
      upgradeHint: '💡 ¿Quieres más? Suscríbete a Florim Pro para uso ilimitado: florim.app/pricing',
    },

    query: {
      intentFallback: 'No entendí qué quieres consultar. Prueba preguntando: "¿Cuánto gasté este mes?" 😊',
      noRecords: (period) => `No encontré registros${period}. 📊`,
      noFocusRecords: (label, period) => `No encontré ${label}${period}. 📊`,
      periodInMonth: (month) => ` en ${month}`,
      periodInYear: (year) => ` en ${year}`,
      periodLastDays: ' en los últimos 7 días',
      periodNextDays: ' en los próximos 7 días',
      pendingPrefix: 'pendientes',
      expensesLabel: 'gastos',
      incomesLabel: 'ingresos',
      relatedContext: (label, amount) => `_Relacionado - ${label}: *${amount}*_`,
      editHint: '_Para editar o borrar: "edita el 2 a 60" o "borra el 1"_',
      moreItems: (count) => `_...y ${count} lanzamientos más_`,
      viewAll: 'Ver todos:',
      sumSentence: (amount, label, period, isIncome) =>
        `${isIncome ? 'Recibiste' : 'Gastaste'} *${amount}* en ${label}${period}:\n`,
      maxSingle: (period, desc, date, amount) =>
        `Tu mayor gasto${period}: *${desc}* el ${date} - *${amount}*`,
      maxCategoryHeader: (period, cat, total) =>
        `Tu mayor gasto${period} fue en *${cat}* (*${total}* en total):`,
      maxCategoryItems: (count) => `_${count} lanzamiento${count !== 1 ? 's' : ''}:_`,
      maxRunnerUp: (cat, total) => `\n2º lugar: *${cat}* - *${total}*`,
      countSentence: (count, label, period) =>
        `Tuviste *${count}* lanzamiento${count !== 1 ? 's' : ''} en ${label}${period}:\n`,
      listHeader: (label, period) => `Tus ${label}${period}:\n`,
      savingsHeader: 'Tus objetivos:\n',
      savingsTarget: (amount) => ` | Meta: *${amount}*`,
      savingsContributed: (period, amount) => ` | Guardado${period}: *${amount}*`,
      savingsNoContributions: (period) => ` | _sin contribuciones${period}_`,
      remindersHeader: (period) => `Recordatorios${period}:\n`,
      remindersPending: '_Pendientes:_',
      remindersDone: '_Completados:_',
      reminderDue: (date) => ` - vence ${date}`,
    },

    save: {
      created: '✅ Creados:',
      failed: '⚠️ No se pudo crear:',
      reminderLine: (desc, date) => `📝 ${desc} _(recordatorio para ${date})_`,
      reminderToday: 'hoy',
      expensePaid: '_(pagado)_',
      expensePending: '_(pendiente)_',
      expenseInstallment: (perAmount, count) => `_(${perAmount} × ${count} - 1ª cuota pagada)_`,
      incomeReceived: '_(recibido)_',
      incomePending: '_(por recibir)_',
      createdViaWhatsApp: 'Creado via WhatsApp',
      goalNotFound: (name) => `⭐ Objetivo "${name}" no encontrado en Florim`,
      invalidAmount: (desc) => `❌ Valor inválido: ${desc}`,
      unknownType: (desc) => `❌ Tipo desconocido: ${desc}`,
    },

    mutation: {
      noRecentList: 'No encontré una lista reciente. Primero pídeme una lista para poder editar o borrar elementos.',
      itemNotFound: (idx) => `Elemento ${idx} no encontrado en la última lista.`,
      cannotDelete: 'No se puede borrar este tipo de registro.',
      cannotEdit: 'No se puede editar este tipo de registro.',
      deleteError: 'No se pudo borrar el elemento. Inténtalo de nuevo.',
      deleteSuccess: (desc, amountStr) => `✅ Eliminado: ${desc}${amountStr}`,
      editNoField: (idx) => `No entendí qué editar del elemento ${idx}. Prueba: "edita el ${idx} a 60", "cambia la categoría del ${idx} a Ocio" o "el ${idx} fue en pix".`,
      editMultipleFields: (idx) => `Por ahora solo puedo editar una cosa a la vez. Envía una solicitud para el valor, otra para la categoría, o bien para el método de pago del elemento ${idx}.`,
      editAmountInvalid: (idx) => `Valor inválido. Prueba: "edita el ${idx} a 60"`,
      editAmountError: 'No se pudo actualizar el elemento. Inténtalo de nuevo.',
      editAmountSuccess: (desc, amount) => `✅ Actualizado: ${desc} - ${amount}`,
      editCategoryNotFound: (cat) => `No encontré la categoría "${cat}". Verifica el nombre e inténtalo de nuevo.`,
      editCategoryNotAllowed: 'No es posible editar la categoría de este tipo de registro.',
      editCategoryError: 'No se pudo actualizar la categoría. Inténtalo de nuevo.',
      editCategorySuccess: (desc, cat) => `✅ Categoría actualizada: ${desc} → ${cat}`,
      editPaymentNotExpense: 'Los ingresos no tienen método de pago registrado — solo los gastos. No hay nada que editar aquí.',
      editPaymentInvalid: (method) => `No reconocí el método de pago "${method}". Prueba: pix, débito, crédito, efectivo, vale de comida, vale de alimentación, cheque o transferencia.`,
      editPaymentError: 'No se pudo actualizar el método de pago. Inténtalo de nuevo.',
      editPaymentSuccess: (desc, method) => `✅ Método de pago actualizado: ${desc} → ${method}`,
    },

    button: {
      unknownReply: 'No reconocí esa respuesta. Envía un mensaje de texto o audio para continuar.',
      noConfirmationPending: 'No encontré una confirmación pendiente. Envía un nuevo audio o mensaje de texto.',
      confirmationExpired: 'Esta confirmación expiró. Envía el audio o mensaje nuevamente para que pueda procesarlo con seguridad.',
      rejected: 'Está bien, estaré esperando tu nuevo audio o mensaje de texto.',
      alreadyProcessed: 'Esta confirmación ya fue procesada. Envía un nuevo audio o mensaje si necesitas registrar algo más.',
      pendingActionError: 'No pude preparar la confirmación de audio. Inténtalo de nuevo. 🔄',
      audioConfirmFallback: (summaryText) =>
        `Confirmando lo que dijiste:\n\n${summaryText}\n\nResponde "Sí, crear" para confirmar o envía otro audio/texto para corregir.`,
    },

    errors: {
      usageFetchError: 'No pude obtener tu uso ahora. Inténtalo de nuevo en un momento. 🔄',
      queryFetchError: 'No pude obtener tus datos ahora. Inténtalo de nuevo en un momento. 🔄',
      extractionRateLimit: 'Florim está sobrecargado ahora mismo. Inténtalo de nuevo en un momento. ⏳',
      extractionError: 'Error al procesar tu mensaje. Inténtalo de nuevo. 🔄',
      queryLimitReached: 'Usaste todas las 7 consultas gratuitas de este mes. 🎯\n\nSuscríbete a Florim Pro para consultas ilimitadas: florim.app/pricing\n\nCancela cuando quieras. Tus datos se conservan siempre.',
      recordingLimitReached: 'Usaste todos los 25 mensajes gratuitos de este mes. 🎯\n\nSuscríbete a Florim Pro para mensajes ilimitados: florim.app/pricing\n\nCancela cuando quieras. Tus datos se conservan siempre.',
      audioTranscriptNote: (text) => `Transcribí tu audio como: "${text}"\n\nSi entendí mal, intenta enviarlo de nuevo.\n\n`,
    },
  },
}

export function getWhatsAppMessages(locale: string | null | undefined): WhatsAppMessages {
  if (locale === 'en' || locale === 'es') return WHATSAPP_MESSAGES[locale]
  return WHATSAPP_MESSAGES[WHATSAPP_DEFAULT_LOCALE]
}

export function getWhatsAppMonthName(locale: string | null | undefined, yyyyMM: string): string {
  const names = locale === 'en' || locale === 'es' ? WHATSAPP_MONTH_NAMES[locale] : WHATSAPP_MONTH_NAMES[WHATSAPP_DEFAULT_LOCALE]
  const m = parseInt(yyyyMM.split('-')[1], 10)
  return names[m - 1] ?? yyyyMM
}
