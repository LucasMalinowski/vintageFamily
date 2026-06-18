import type { AppLocale } from '@/lib/i18n/getLocale'
import type { BankTutorial, BankTutorialStep } from '@/lib/bank-statements/types'

// ─── Non-translatable per-bank data ───────────────────────────────────────────
// id, name, shortName, accent, icon URLs, supported formats, OFX availability,
// reference URLs, images, lastVerifiedAt and status never change with locale.
// Only the human-readable instructional text (translated below) does.

interface BankTutorialBase {
  id: BankTutorial['id']
  name: string
  shortName: string
  accent: string
  iconUrl: string
  iconSourceUrl: string
  supportedImportFormats: BankTutorial['supportedImportFormats']
  preferredImportFormat: BankTutorial['preferredImportFormat']
  ofxAvailability: BankTutorial['ofxAvailability']
  ofxReferenceUrl?: string
  referenceUrl: string
  images: BankTutorial['images']
  lastVerifiedAt: string
  status: BankTutorial['status']
}

const BANK_TUTORIAL_BASE: BankTutorialBase[] = [
  {
    id: 'itau',
    name: 'Itaú',
    shortName: 'Itaú',
    accent: '#ff7a00',
    iconUrl: 'https://play-lh.googleusercontent.com/gRcutACE4XkEHmxcbUdOehxpTbp_LjmwJ6qIEbqfD34oh9feTNhTnlDgf97HEZ9eGKY=w240-h480',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=com.itau',
    supportedImportFormats: ['ofx', 'csv'],
    preferredImportFormat: 'ofx',
    ofxAvailability: 'secondary',
    ofxReferenceUrl: 'https://ajuda.bling.com.br/hc/pt-br/articles/360051603794',
    referenceUrl: 'https://www.itau.com.br/atendimento-itau/para-voce/conta-corrente/como-consultar-o-meu-extrato-itau-e-o-que-significam-as-siglas-do-extrato',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validated',
  },
  {
    id: 'c6',
    name: 'C6 Bank',
    shortName: 'C6',
    accent: '#111111',
    iconUrl: 'https://play-lh.googleusercontent.com/qYXhGgBxFLr5xgnv0AGhqW9v7tyedb_i5AVoebI6pow5pWPNZH1qEHnslmSHNkVpB-g=w240-h480',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=com.c6bank.app',
    supportedImportFormats: ['csv'],
    preferredImportFormat: 'csv',
    ofxAvailability: 'not_confirmed',
    referenceUrl: 'https://www.c6bank.com.br/blog/como-receber-o-extrato-da-sua-conta-do-c6-bank-por-e-mail',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validated',
  },
  {
    id: 'santander',
    name: 'Santander',
    shortName: 'Santander',
    accent: '#ec0000',
    iconUrl: 'https://play-lh.googleusercontent.com/hgvUAnSp2_To8Zd64zQ6Luk73tsBU1MyDKpXkN-y7f_jKG0K3HMBufan_oBSVDLWidKv=w240-h480',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=com.santander.app',
    supportedImportFormats: ['ofx', 'csv'],
    preferredImportFormat: 'ofx',
    ofxAvailability: 'secondary',
    ofxReferenceUrl: 'https://ajuda.bling.com.br/hc/pt-br/articles/360051603794',
    referenceUrl: 'https://www.santander.com.br/blog/consulta-saldo-extrato-santander',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validated',
  },
  {
    id: 'banco_do_brasil',
    name: 'Banco do Brasil',
    shortName: 'BB',
    accent: '#f6c400',
    iconUrl: 'https://play-lh.googleusercontent.com/1-aNhsSPNqiVluwNGZar_7F5PbQ4u1zteuJ1jumnArhe8bfYHHaVwu4aVOF5-NAmLaA=w240-h480',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=br.com.bb.android',
    supportedImportFormats: ['ofx', 'csv'],
    preferredImportFormat: 'ofx',
    ofxAvailability: 'secondary',
    ofxReferenceUrl: 'https://ajuda.bling.com.br/hc/pt-br/articles/360051603794',
    referenceUrl: 'https://ajuda.contaazul.com/hc/pt-br/articles/37835476984973-Banco-do-Brasil-como-exportar-o-extrato-em-CSV',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validation',
  },
  {
    id: 'caixa',
    name: 'CAIXA',
    shortName: 'CAIXA',
    accent: '#0066b3',
    iconUrl: 'https://play-lh.googleusercontent.com/ubV0x2kGJIEe10shxuFnH9Cy21OgHARwVUZ89nyE0YOZN9c25ov_dyHdk1rMgbPvoDI=w240-h480-rw',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=br.com.gabba.Caixa&hl=pt_BR',
    supportedImportFormats: ['ofx', 'csv'],
    preferredImportFormat: 'ofx',
    ofxAvailability: 'secondary',
    ofxReferenceUrl: 'https://ajuda.bling.com.br/hc/pt-br/articles/360051603794',
    referenceUrl: 'https://www.caixa.gov.br/',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validation',
  },
  {
    id: 'nubank',
    name: 'Nubank',
    shortName: 'Nu',
    accent: '#820ad1',
    iconUrl: 'https://play-lh.googleusercontent.com/NPkx0aiwABB31gBw_CuZO9Rwukhir-BwemxfNlAVjT6smwk6QgUbb3XrmsSSClfzk0dY=w240-h480',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=com.nu.production&hl=pt_BR',
    supportedImportFormats: ['ofx', 'csv'],
    preferredImportFormat: 'ofx',
    ofxAvailability: 'official',
    ofxReferenceUrl: 'https://comunidade.nubank.com.br/novidades/post/exporte-extratos-diretamente-de-sua-conta-nubank-pelo-app-rbRYnw8qndyPd2S',
    referenceUrl: 'https://comunidade.nubank.com.br/novidades/post/exporte-extratos-diretamente-de-sua-conta-nubank-pelo-app-rbRYnw8qndyPd2S',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validated',
  },
  {
    id: 'bradesco',
    name: 'Bradesco',
    shortName: 'Bradesco',
    accent: '#c41230',
    iconUrl: 'https://play-lh.googleusercontent.com/ReQEaxm44OuduIlJEVO_-xs9iZXSyRNdzGKrONYoLSgAdOzyhPKTb1xuuoPXK6tABm0=w240-h480',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=com.bradesco',
    supportedImportFormats: ['ofx', 'csv'],
    preferredImportFormat: 'ofx',
    ofxAvailability: 'official',
    ofxReferenceUrl: 'https://www.institucional.bradesco.com.br/simulador_bradesco_net_empresa/conteudo/perfil_corporate/extrato/conta-corrente_extrato-de-cheque-empresarial.asp',
    referenceUrl: 'https://institucional.bradesco.com.br/simulador_bradesco_net_empresa/conteudo/perfil_corporate/extrato/exportar_extrato_arquivo.asp',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validation',
  },
  {
    id: 'inter',
    name: 'Inter',
    shortName: 'Inter',
    accent: '#ff7a00',
    iconUrl: 'https://play-lh.googleusercontent.com/GvBsmvf0foXr0_IF7nC7yxime14I1_Mq3AEZcTa2d-SYB-dqHNfB5YbFN9TC5fydIvs=w240-h480',
    iconSourceUrl: 'https://play.google.com/store/apps/details?id=br.com.intermedium',
    supportedImportFormats: ['ofx', 'csv'],
    preferredImportFormat: 'ofx',
    ofxAvailability: 'official',
    ofxReferenceUrl: 'https://ajuda.inter.co/conta-digital-pessoa-fisica-e-mei/como-acessar-o-extrato-da-conta-digital-pf-ou-mei/',
    referenceUrl: 'https://ajuda.inter.co/conta-digital-pessoa-fisica-e-mei/como-acessar-o-extrato-da-conta-digital-pf-ou-mei/',
    images: [],
    lastVerifiedAt: '2026-04-16',
    status: 'validated',
  },
]

// ─── Translatable per-bank text ───────────────────────────────────────────────

interface BankTutorialTranslation {
  ofxReferenceLabel?: string
  ofxIntro?: string
  ofxSteps?: BankTutorialStep[]
  tutorialTitle: string
  intro: string
  steps: BankTutorialStep[]
  observations: string[]
  referenceLinkLabel: string
}

const BANK_TUTORIAL_TRANSLATIONS: Record<BankTutorial['id'], Record<AppLocale, BankTutorialTranslation>> = {
  itau: {
    'pt-BR': {
      ofxReferenceLabel: 'Bling: passo a passo OFX',
      ofxIntro: 'Como referência secundária, o artigo do Bling descreve um fluxo possível de OFX pelo internet banking do Itaú.',
      ofxSteps: [
        { title: 'Entre no internet banking do Itaú', detail: 'Acesse com agência, conta e senha pelo site.' },
        { title: 'Abra o menu e clique em Extrato', detail: 'No ambiente web, vá para a área de extrato da conta.' },
        { title: 'Escolha o período e salve em OFX', detail: 'Selecione o intervalo desejado, clique em "Salvar" e escolha "Salvar em OFX".' },
      ],
      tutorialTitle: 'Baixar o extrato no app Itaú',
      intro: 'Prefira o OFX pelo internet banking. Para CSV, exporte o extrato pelo internet banking e salve como arquivo CSV.',
      steps: [
        { title: 'Acesse o internet banking do Itaú', detail: 'Entre com agência, conta e senha pelo site.' },
        { title: 'Abra Conta Corrente > Extrato', detail: 'Acesse a área de extrato da conta corrente.' },
        { title: 'Selecione o período e exporte', detail: 'Escolha o intervalo desejado e use a opção de salvar/exportar o extrato. Prefira OFX; se disponível, CSV também é aceito.' },
      ],
      observations: [
        'Prefira OFX para maior confiabilidade na leitura dos lançamentos.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'Itaú: como consultar meu extrato',
    },
    en: {
      ofxReferenceLabel: 'Bling: step-by-step OFX',
      ofxIntro: 'As a secondary reference, Bling\'s article describes a possible OFX flow through Itaú\'s online banking.',
      ofxSteps: [
        { title: 'Log into Itaú online banking', detail: 'Sign in with branch, account and password on the website.' },
        { title: 'Open the menu and click Statement', detail: 'In the web environment, go to the account statement area.' },
        { title: 'Choose the period and save as OFX', detail: 'Select the desired range, click "Save" and choose "Save as OFX".' },
      ],
      tutorialTitle: 'Download the statement in the Itaú app',
      intro: 'Prefer OFX through online banking. For CSV, export the statement through online banking and save it as a CSV file.',
      steps: [
        { title: 'Access Itaú online banking', detail: 'Sign in with branch, account and password on the website.' },
        { title: 'Open Checking Account > Statement', detail: 'Go to the checking account statement area.' },
        { title: 'Select the period and export', detail: 'Choose the desired range and use the save/export statement option. Prefer OFX; CSV is also accepted if available.' },
      ],
      observations: [
        'Prefer OFX for more reliable transaction reading.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'Itaú: how to check my statement',
    },
    es: {
      ofxReferenceLabel: 'Bling: guía paso a paso de OFX',
      ofxIntro: 'Como referencia secundaria, el artículo de Bling describe un posible flujo de OFX a través de la banca en línea de Itaú.',
      ofxSteps: [
        { title: 'Ingresa a la banca en línea de Itaú', detail: 'Accede con agencia, cuenta y contraseña en el sitio.' },
        { title: 'Abre el menú y haz clic en Extracto', detail: 'En el entorno web, ve al área de extracto de la cuenta.' },
        { title: 'Elige el período y guarda en OFX', detail: 'Selecciona el rango deseado, haz clic en "Guardar" y elige "Guardar en OFX".' },
      ],
      tutorialTitle: 'Descargar el extracto en la app Itaú',
      intro: 'Prefiere el OFX por la banca en línea. Para CSV, exporta el extracto por la banca en línea y guárdalo como archivo CSV.',
      steps: [
        { title: 'Accede a la banca en línea de Itaú', detail: 'Ingresa con agencia, cuenta y contraseña en el sitio.' },
        { title: 'Abre Cuenta Corriente > Extracto', detail: 'Accede al área de extracto de la cuenta corriente.' },
        { title: 'Selecciona el período y exporta', detail: 'Elige el rango deseado y usa la opción de guardar/exportar el extracto. Prefiere OFX; si está disponible, también se acepta CSV.' },
      ],
      observations: [
        'Prefiere OFX para una lectura más confiable de los movimientos.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'Itaú: cómo consultar mi extracto',
    },
  },
  c6: {
    'pt-BR': {
      tutorialTitle: 'Baixar o extrato CSV no app C6 Bank',
      intro: 'O C6 Bank envia o extrato por e-mail em PDF protegido por senha. Para importar aqui, use a exportação em CSV disponível no app.',
      steps: [
        { title: 'Abra o app C6 e clique em "Ver Extrato"', detail: 'Acesse o app do C6 Bank e na tela inicial, toque em "Ver extrato".' },
        { title: 'Exporte em CSV', detail: 'Toque em "Exportar extrato", escolha o período desejado e selecione o formato CSV (não PDF).' },
        { title: 'Salve o arquivo e importe aqui', detail: 'Aguarde o arquivo CSV ser gerado e use-o nesta tela.' },
      ],
      observations: [
        'O C6 envia PDFs protegidos por senha que não podem ser lidos automaticamente, use CSV.',
        'O limite máximo do C6 é de 180 dias por exportação.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'C6 Bank: como exportar o extrato',
    },
    en: {
      tutorialTitle: 'Download the CSV statement in the C6 Bank app',
      intro: 'C6 Bank sends the statement by email as a password-protected PDF. To import here, use the CSV export available in the app.',
      steps: [
        { title: 'Open the C6 app and tap "View Statement"', detail: 'Open the C6 Bank app and on the home screen, tap "View statement".' },
        { title: 'Export as CSV', detail: 'Tap "Export statement", choose the desired period and select the CSV format (not PDF).' },
        { title: 'Save the file and import it here', detail: 'Wait for the CSV file to be generated and use it on this screen.' },
      ],
      observations: [
        'C6 sends password-protected PDFs that can\'t be read automatically, use CSV instead.',
        'C6\'s maximum limit is 180 days per export.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'C6 Bank: how to export the statement',
    },
    es: {
      tutorialTitle: 'Descargar el extracto CSV en la app C6 Bank',
      intro: 'C6 Bank envía el extracto por correo en PDF protegido con contraseña. Para importar aquí, usa la exportación en CSV disponible en la app.',
      steps: [
        { title: 'Abre la app C6 y toca "Ver Extracto"', detail: 'Accede a la app de C6 Bank y en la pantalla inicial, toca "Ver extracto".' },
        { title: 'Exporta en CSV', detail: 'Toca "Exportar extracto", elige el período deseado y selecciona el formato CSV (no PDF).' },
        { title: 'Guarda el archivo e impórtalo aquí', detail: 'Espera a que se genere el archivo CSV y úsalo en esta pantalla.' },
      ],
      observations: [
        'C6 envía PDFs protegidos con contraseña que no se pueden leer automáticamente, usa CSV.',
        'El límite máximo de C6 es de 180 días por exportación.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'C6 Bank: cómo exportar el extracto',
    },
  },
  santander: {
    'pt-BR': {
      ofxReferenceLabel: 'Bling: passo a passo OFX',
      ofxIntro: 'Como referência secundária, o Bling documenta um caminho possível para exportar OFX pelo internet banking do Santander.',
      ofxSteps: [
        { title: 'Entre no Internet Banking do Santander', detail: 'Acesse o site com seu login e senha.' },
        { title: 'Abra Conta Corrente > Extrato Conta Corrente', detail: 'Entre na área de extrato da conta corrente.' },
        { title: 'Escolha o período e selecione "Money 2000 ou Superior"', detail: 'Esse caminho gera o arquivo OFX para download.' },
      ],
      tutorialTitle: 'Baixar o extrato no app Santander',
      intro: 'Prefira OFX pelo internet banking. Para CSV, exporte o extrato na área de conta corrente.',
      steps: [
        { title: 'Acesse o internet banking do Santander', detail: 'Entre com login e senha pelo site.' },
        { title: 'Abra Conta Corrente > Extrato', detail: 'Acesse a área de extrato e selecione o período desejado.' },
        { title: 'Exporte o arquivo', detail: 'Escolha OFX (preferencial) ou CSV para importar aqui.' },
      ],
      observations: [
        'Prefira OFX para maior confiabilidade.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'Santander: Consultar Extrato',
    },
    en: {
      ofxReferenceLabel: 'Bling: step-by-step OFX',
      ofxIntro: 'As a secondary reference, Bling documents a possible path to export OFX through Santander\'s online banking.',
      ofxSteps: [
        { title: 'Log into Santander Online Banking', detail: 'Access the website with your login and password.' },
        { title: 'Open Checking Account > Checking Account Statement', detail: 'Go to the checking account statement area.' },
        { title: 'Choose the period and select "Money 2000 or Higher"', detail: 'This path generates the OFX file for download.' },
      ],
      tutorialTitle: 'Download the statement in the Santander app',
      intro: 'Prefer OFX through online banking. For CSV, export the statement in the checking account area.',
      steps: [
        { title: 'Access Santander online banking', detail: 'Sign in with your login and password on the website.' },
        { title: 'Open Checking Account > Statement', detail: 'Go to the statement area and select the desired period.' },
        { title: 'Export the file', detail: 'Choose OFX (preferred) or CSV to import here.' },
      ],
      observations: [
        'Prefer OFX for more reliability.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'Santander: Check Statement',
    },
    es: {
      ofxReferenceLabel: 'Bling: guía paso a paso de OFX',
      ofxIntro: 'Como referencia secundaria, Bling documenta una posible ruta para exportar OFX a través de la banca en línea de Santander.',
      ofxSteps: [
        { title: 'Ingresa a la Banca en Línea de Santander', detail: 'Accede al sitio con tu usuario y contraseña.' },
        { title: 'Abre Cuenta Corriente > Extracto Cuenta Corriente', detail: 'Entra al área de extracto de la cuenta corriente.' },
        { title: 'Elige el período y selecciona "Money 2000 o Superior"', detail: 'Esta ruta genera el archivo OFX para descargar.' },
      ],
      tutorialTitle: 'Descargar el extracto en la app Santander',
      intro: 'Prefiere OFX por la banca en línea. Para CSV, exporta el extracto en el área de cuenta corriente.',
      steps: [
        { title: 'Accede a la banca en línea de Santander', detail: 'Ingresa con usuario y contraseña en el sitio.' },
        { title: 'Abre Cuenta Corriente > Extracto', detail: 'Accede al área de extracto y selecciona el período deseado.' },
        { title: 'Exporta el archivo', detail: 'Elige OFX (preferido) o CSV para importar aquí.' },
      ],
      observations: [
        'Prefiere OFX para mayor confiabilidad.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'Santander: Consultar Extracto',
    },
  },
  banco_do_brasil: {
    'pt-BR': {
      ofxReferenceLabel: 'Bling: passo a passo OFX',
      ofxIntro: 'Como referência secundária, o artigo do Bling descreve exportação OFX pelo internet banking do Banco do Brasil.',
      ofxSteps: [
        { title: 'Entre no internet banking do Banco do Brasil', detail: 'Acesse o site com seu login e senha.' },
        { title: 'Abra Conta Corrente > Conta Corrente', detail: 'Entre na área de extrato da conta.' },
        { title: 'Escolha o período e clique em "Money 2000+ (ofx)"', detail: 'Esse caminho baixa o arquivo OFX.' },
      ],
      tutorialTitle: 'Baixar o extrato no internet banking do Banco do Brasil',
      intro: 'Prefira OFX. Para CSV, o Banco do Brasil oferece exportação em CSV pelo internet banking.',
      steps: [
        { title: 'Acesse o Internet Banking', detail: 'Acesse o internet banking do Banco do Brasil com seu login e senha.' },
        { title: 'Acesse o menu do extrato', detail: 'Clique em Conta Corrente > Conta Corrente > Consultar > Extrato.' },
        { title: 'Selecione o período e exporte', detail: 'Escolha o intervalo, selecione OFX ou CSV e confirme o download.' },
      ],
      observations: [
        'Prefira OFX para maior confiabilidade.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'Banco do Brasil: como exportar o extrato',
    },
    en: {
      ofxReferenceLabel: 'Bling: step-by-step OFX',
      ofxIntro: 'As a secondary reference, Bling\'s article describes OFX export through Banco do Brasil\'s online banking.',
      ofxSteps: [
        { title: 'Log into Banco do Brasil online banking', detail: 'Access the website with your login and password.' },
        { title: 'Open Checking Account > Checking Account', detail: 'Go to the account statement area.' },
        { title: 'Choose the period and click "Money 2000+ (ofx)"', detail: 'This path downloads the OFX file.' },
      ],
      tutorialTitle: 'Download the statement in Banco do Brasil online banking',
      intro: 'Prefer OFX. For CSV, Banco do Brasil offers CSV export through online banking.',
      steps: [
        { title: 'Access Online Banking', detail: 'Access Banco do Brasil online banking with your login and password.' },
        { title: 'Go to the statement menu', detail: 'Click Checking Account > Checking Account > Check > Statement.' },
        { title: 'Select the period and export', detail: 'Choose the range, select OFX or CSV and confirm the download.' },
      ],
      observations: [
        'Prefer OFX for more reliability.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'Banco do Brasil: how to export the statement',
    },
    es: {
      ofxReferenceLabel: 'Bling: guía paso a paso de OFX',
      ofxIntro: 'Como referencia secundaria, el artículo de Bling describe la exportación de OFX por la banca en línea de Banco do Brasil.',
      ofxSteps: [
        { title: 'Ingresa a la banca en línea de Banco do Brasil', detail: 'Accede al sitio con tu usuario y contraseña.' },
        { title: 'Abre Cuenta Corriente > Cuenta Corriente', detail: 'Entra al área de extracto de la cuenta.' },
        { title: 'Elige el período y haz clic en "Money 2000+ (ofx)"', detail: 'Esta ruta descarga el archivo OFX.' },
      ],
      tutorialTitle: 'Descargar el extracto en la banca en línea de Banco do Brasil',
      intro: 'Prefiere OFX. Para CSV, Banco do Brasil ofrece exportación en CSV por la banca en línea.',
      steps: [
        { title: 'Accede a la Banca en Línea', detail: 'Accede a la banca en línea de Banco do Brasil con tu usuario y contraseña.' },
        { title: 'Ve al menú del extracto', detail: 'Haz clic en Cuenta Corriente > Cuenta Corriente > Consultar > Extracto.' },
        { title: 'Selecciona el período y exporta', detail: 'Elige el rango, selecciona OFX o CSV y confirma la descarga.' },
      ],
      observations: [
        'Prefiere OFX para mayor confiabilidad.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'Banco do Brasil: cómo exportar el extracto',
    },
  },
  caixa: {
    'pt-BR': {
      ofxReferenceLabel: 'Bling: passo a passo OFX',
      ofxIntro: 'Como referência secundária, o Bling mostra um fluxo de OFX no internet banking da CAIXA.',
      ofxSteps: [
        { title: 'Entre no internet banking da CAIXA', detail: 'Acesse o site com seu login e senha.' },
        { title: 'Abra Contas da empresa > Extrato por período', detail: 'No ambiente web, vá até a opção de extrato por período.' },
        { title: 'Escolha o período, selecione OFX e clique em Continuar', detail: 'Esse caminho baixa o arquivo OFX.' },
      ],
      tutorialTitle: 'Baixar o extrato no internet banking da CAIXA',
      intro: 'Prefira OFX. Para CSV, acesse o internet banking da CAIXA e exporte o extrato no formato CSV.',
      steps: [
        { title: 'Acesse o internet banking da CAIXA', detail: 'Entre com seu login e senha pelo site.' },
        { title: 'Abra a área de extratos', detail: 'Acesse Conta Corrente > Extrato ou caminho equivalente.' },
        { title: 'Selecione o período e exporte', detail: 'Escolha OFX (preferencial) ou CSV para usar nesta tela.' },
      ],
      observations: [
        'Tutorial em validação: o fluxo exato de CSV não foi confirmado por fonte pública oficial.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'CAIXA: portal oficial',
    },
    en: {
      ofxReferenceLabel: 'Bling: step-by-step OFX',
      ofxIntro: 'As a secondary reference, Bling shows an OFX flow in CAIXA\'s online banking.',
      ofxSteps: [
        { title: 'Log into CAIXA online banking', detail: 'Access the website with your login and password.' },
        { title: 'Open Business Accounts > Statement by period', detail: 'In the web environment, go to the statement by period option.' },
        { title: 'Choose the period, select OFX and click Continue', detail: 'This path downloads the OFX file.' },
      ],
      tutorialTitle: 'Download the statement in CAIXA online banking',
      intro: 'Prefer OFX. For CSV, access CAIXA online banking and export the statement in CSV format.',
      steps: [
        { title: 'Access CAIXA online banking', detail: 'Sign in with your login and password on the website.' },
        { title: 'Open the statements area', detail: 'Go to Checking Account > Statement or equivalent path.' },
        { title: 'Select the period and export', detail: 'Choose OFX (preferred) or CSV to use on this screen.' },
      ],
      observations: [
        'Tutorial under validation: the exact CSV flow hasn\'t been confirmed by an official public source.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'CAIXA: official portal',
    },
    es: {
      ofxReferenceLabel: 'Bling: guía paso a paso de OFX',
      ofxIntro: 'Como referencia secundaria, Bling muestra un flujo de OFX en la banca en línea de CAIXA.',
      ofxSteps: [
        { title: 'Ingresa a la banca en línea de CAIXA', detail: 'Accede al sitio con tu usuario y contraseña.' },
        { title: 'Abre Cuentas de la empresa > Extracto por período', detail: 'En el entorno web, ve a la opción de extracto por período.' },
        { title: 'Elige el período, selecciona OFX y haz clic en Continuar', detail: 'Esta ruta descarga el archivo OFX.' },
      ],
      tutorialTitle: 'Descargar el extracto en la banca en línea de CAIXA',
      intro: 'Prefiere OFX. Para CSV, accede a la banca en línea de CAIXA y exporta el extracto en formato CSV.',
      steps: [
        { title: 'Accede a la banca en línea de CAIXA', detail: 'Ingresa con tu usuario y contraseña en el sitio.' },
        { title: 'Abre el área de extractos', detail: 'Accede a Cuenta Corriente > Extracto o ruta equivalente.' },
        { title: 'Selecciona el período y exporta', detail: 'Elige OFX (preferido) o CSV para usar en esta pantalla.' },
      ],
      observations: [
        'Tutorial en validación: el flujo exacto de CSV no ha sido confirmado por una fuente pública oficial.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'CAIXA: portal oficial',
    },
  },
  nubank: {
    'pt-BR': {
      ofxReferenceLabel: 'Nubank: OFX no app',
      ofxIntro: 'A comunidade oficial do Nubank confirma exportação de extrato em OFX pelo próprio app.',
      ofxSteps: [
        { title: 'Abra o app Nubank e entre na área da conta', detail: 'Na tela inicial, acesse a conta do Nubank.' },
        { title: 'Abra "Exportar extrato"', detail: 'No menu de ações, arraste para a esquerda e toque em "Exportar extrato".' },
        { title: 'Escolha o mês e exporte em OFX', detail: 'Selecione o período desejado e exporte o arquivo no formato OFX.' },
      ],
      tutorialTitle: 'Exportar extrato no app Nubank',
      intro: 'O Nubank permite exportar o extrato diretamente pelo app em OFX (preferencial) ou CSV.',
      steps: [
        { title: 'Abra o app Nubank e acesse a conta', detail: 'Na página inicial, entre na área da conta do Nubank.' },
        { title: 'Selecione "Exportar Extrato"', detail: 'No menu de ações, arraste para a esquerda e vá em "Exportar Extrato".' },
        { title: 'Selecione o mês e o formato', detail: 'Escolha OFX para maior confiabilidade, ou CSV se preferir. O arquivo será enviado para o seu e-mail.' },
      ],
      observations: [
        'Prefira OFX para maior confiabilidade na leitura dos lançamentos.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'Nubank: exportar extratos pelo app',
    },
    en: {
      ofxReferenceLabel: 'Nubank: OFX in the app',
      ofxIntro: 'Nubank\'s official community confirms statement export in OFX directly through the app.',
      ofxSteps: [
        { title: 'Open the Nubank app and go to the account area', detail: 'On the home screen, access the Nubank account.' },
        { title: 'Open "Export statement"', detail: 'In the actions menu, swipe left and tap "Export statement".' },
        { title: 'Choose the month and export as OFX', detail: 'Select the desired period and export the file in OFX format.' },
      ],
      tutorialTitle: 'Export statement in the Nubank app',
      intro: 'Nubank lets you export the statement directly through the app in OFX (preferred) or CSV.',
      steps: [
        { title: 'Open the Nubank app and access the account', detail: 'On the home page, go to the Nubank account area.' },
        { title: 'Select "Export Statement"', detail: 'In the actions menu, swipe left and go to "Export Statement".' },
        { title: 'Select the month and format', detail: 'Choose OFX for more reliability, or CSV if you prefer. The file will be sent to your email.' },
      ],
      observations: [
        'Prefer OFX for more reliable transaction reading.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'Nubank: export statements through the app',
    },
    es: {
      ofxReferenceLabel: 'Nubank: OFX en la app',
      ofxIntro: 'La comunidad oficial de Nubank confirma la exportación del extracto en OFX directamente desde la app.',
      ofxSteps: [
        { title: 'Abre la app Nubank y entra al área de la cuenta', detail: 'En la pantalla inicial, accede a la cuenta de Nubank.' },
        { title: 'Abre "Exportar extracto"', detail: 'En el menú de acciones, deslízate hacia la izquierda y toca "Exportar extracto".' },
        { title: 'Elige el mes y exporta en OFX', detail: 'Selecciona el período deseado y exporta el archivo en formato OFX.' },
      ],
      tutorialTitle: 'Exportar el extracto en la app Nubank',
      intro: 'Nubank permite exportar el extracto directamente desde la app en OFX (preferido) o CSV.',
      steps: [
        { title: 'Abre la app Nubank y accede a la cuenta', detail: 'En la página inicial, entra al área de la cuenta de Nubank.' },
        { title: 'Selecciona "Exportar Extracto"', detail: 'En el menú de acciones, deslízate hacia la izquierda y ve a "Exportar Extracto".' },
        { title: 'Selecciona el mes y el formato', detail: 'Elige OFX para mayor confiabilidad, o CSV si prefieres. El archivo se enviará a tu correo.' },
      ],
      observations: [
        'Prefiere OFX para una lectura más confiable de los movimientos.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'Nubank: exportar extractos desde la app',
    },
  },
  bradesco: {
    'pt-BR': {
      ofxReferenceLabel: 'Bradesco: OFX no ambiente web',
      ofxIntro: 'O domínio institucional do Bradesco expõe o fluxo de exportação OFX no ambiente web.',
      ofxSteps: [
        { title: 'Entre no internet banking do Bradesco', detail: 'Acesse o site com seu login e senha.' },
        { title: 'Abra Saldos e Extratos > Extrato Mensal / Por Período', detail: 'Entre na consulta do extrato do período desejado.' },
        { title: 'Busque o extrato e salve como OFX', detail: 'Depois de carregar o extrato, clique em "Salvar como arquivo" e escolha "OFX (Money 2000 em diante)".' },
      ],
      tutorialTitle: 'Exportar extrato no internet banking Bradesco',
      intro: 'O Bradesco oferece exportação OFX e CSV pelo internet banking. Prefira OFX.',
      steps: [
        { title: 'Entre no internet banking do Bradesco', detail: 'Acesse o site com seu login e senha.' },
        { title: 'Abra Saldos e Extratos > Extrato', detail: 'Selecione o período desejado.' },
        { title: 'Exporte o arquivo', detail: 'Salve como OFX (preferencial) ou CSV para importar aqui.' },
      ],
      observations: [
        'Prefira OFX para maior confiabilidade.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'Bradesco: exportação de extrato',
    },
    en: {
      ofxReferenceLabel: 'Bradesco: OFX in the web environment',
      ofxIntro: 'Bradesco\'s institutional domain shows the OFX export flow in the web environment.',
      ofxSteps: [
        { title: 'Log into Bradesco online banking', detail: 'Access the website with your login and password.' },
        { title: 'Open Balances and Statements > Monthly / By Period Statement', detail: 'Go to the statement query for the desired period.' },
        { title: 'Find the statement and save as OFX', detail: 'After loading the statement, click "Save as file" and choose "OFX (Money 2000 onward)".' },
      ],
      tutorialTitle: 'Export statement in Bradesco online banking',
      intro: 'Bradesco offers OFX and CSV export through online banking. Prefer OFX.',
      steps: [
        { title: 'Log into Bradesco online banking', detail: 'Access the website with your login and password.' },
        { title: 'Open Balances and Statements > Statement', detail: 'Select the desired period.' },
        { title: 'Export the file', detail: 'Save as OFX (preferred) or CSV to import here.' },
      ],
      observations: [
        'Prefer OFX for more reliability.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'Bradesco: statement export',
    },
    es: {
      ofxReferenceLabel: 'Bradesco: OFX en el entorno web',
      ofxIntro: 'El dominio institucional de Bradesco muestra el flujo de exportación de OFX en el entorno web.',
      ofxSteps: [
        { title: 'Ingresa a la banca en línea de Bradesco', detail: 'Accede al sitio con tu usuario y contraseña.' },
        { title: 'Abre Saldos y Extractos > Extracto Mensual / Por Período', detail: 'Entra a la consulta del extracto del período deseado.' },
        { title: 'Busca el extracto y guárdalo como OFX', detail: 'Después de cargar el extracto, haz clic en "Guardar como archivo" y elige "OFX (Money 2000 en adelante)".' },
      ],
      tutorialTitle: 'Exportar el extracto en la banca en línea de Bradesco',
      intro: 'Bradesco ofrece exportación OFX y CSV por la banca en línea. Prefiere OFX.',
      steps: [
        { title: 'Ingresa a la banca en línea de Bradesco', detail: 'Accede al sitio con tu usuario y contraseña.' },
        { title: 'Abre Saldos y Extractos > Extracto', detail: 'Selecciona el período deseado.' },
        { title: 'Exporta el archivo', detail: 'Guarda como OFX (preferido) o CSV para importar aquí.' },
      ],
      observations: [
        'Prefiere OFX para mayor confiabilidad.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'Bradesco: exportación de extracto',
    },
  },
  inter: {
    'pt-BR': {
      ofxReferenceLabel: 'Inter: OFX oficial',
      ofxIntro: 'A central oficial do Inter confirma exportação do extrato em CSV e OFX.',
      ofxSteps: [
        { title: 'Abra o Super App Inter e toque em Saldo', detail: 'Acesse a área principal da conta.' },
        { title: 'Toque em Mostrar extrato', detail: 'Se necessário, aplique os filtros do período desejado.' },
        { title: 'Use a seta para baixo e envie em OFX', detail: 'Escolha OFX para receber o arquivo por e-mail.' },
      ],
      tutorialTitle: 'Baixar o extrato no Super App Inter',
      intro: 'A central de ajuda do Inter descreve o caminho para enviar o extrato em OFX ou CSV por e-mail.',
      steps: [
        { title: 'Abra o Super App Inter e toque em Saldo', detail: 'Acesse a área principal da conta.' },
        { title: 'Toque em Mostrar extrato', detail: 'Se desejar, aplique filtros de período, categoria e tipo de transação.' },
        { title: 'Use a seta para baixo no canto superior direito', detail: 'Selecione "Enviar por e-mail" e escolha OFX (preferencial) ou CSV.' },
      ],
      observations: [
        'Prefira OFX para maior confiabilidade.',
        'As telas do banco podem mudar com o tempo.',
      ],
      referenceLinkLabel: 'Inter: como acessar e exportar o extrato',
    },
    en: {
      ofxReferenceLabel: 'Inter: official OFX',
      ofxIntro: 'Inter\'s official help center confirms statement export in CSV and OFX.',
      ofxSteps: [
        { title: 'Open the Inter Super App and tap Balance', detail: 'Access the main account area.' },
        { title: 'Tap Show statement', detail: 'If needed, apply filters for the desired period.' },
        { title: 'Use the down arrow and send as OFX', detail: 'Choose OFX to receive the file by email.' },
      ],
      tutorialTitle: 'Download the statement in the Inter Super App',
      intro: 'Inter\'s help center describes the path to send the statement in OFX or CSV by email.',
      steps: [
        { title: 'Open the Inter Super App and tap Balance', detail: 'Access the main account area.' },
        { title: 'Tap Show statement', detail: 'If you want, apply period, category and transaction type filters.' },
        { title: 'Use the down arrow in the top-right corner', detail: 'Select "Send by email" and choose OFX (preferred) or CSV.' },
      ],
      observations: [
        'Prefer OFX for more reliability.',
        'The bank\'s screens may change over time.',
      ],
      referenceLinkLabel: 'Inter: how to access and export the statement',
    },
    es: {
      ofxReferenceLabel: 'Inter: OFX oficial',
      ofxIntro: 'El centro de ayuda oficial de Inter confirma la exportación del extracto en CSV y OFX.',
      ofxSteps: [
        { title: 'Abre el Super App Inter y toca Saldo', detail: 'Accede al área principal de la cuenta.' },
        { title: 'Toca Mostrar extracto', detail: 'Si es necesario, aplica los filtros del período deseado.' },
        { title: 'Usa la flecha hacia abajo y envía en OFX', detail: 'Elige OFX para recibir el archivo por correo.' },
      ],
      tutorialTitle: 'Descargar el extracto en el Super App Inter',
      intro: 'El centro de ayuda de Inter describe la ruta para enviar el extracto en OFX o CSV por correo.',
      steps: [
        { title: 'Abre el Super App Inter y toca Saldo', detail: 'Accede al área principal de la cuenta.' },
        { title: 'Toca Mostrar extracto', detail: 'Si lo deseas, aplica filtros de período, categoría y tipo de transacción.' },
        { title: 'Usa la flecha hacia abajo en la esquina superior derecha', detail: 'Selecciona "Enviar por correo" y elige OFX (preferido) o CSV.' },
      ],
      observations: [
        'Prefiere OFX para mayor confiabilidad.',
        'Las pantallas del banco pueden cambiar con el tiempo.',
      ],
      referenceLinkLabel: 'Inter: cómo acceder y exportar el extracto',
    },
  },
}

function buildTutorial(base: BankTutorialBase, locale: AppLocale): BankTutorial {
  const tr = BANK_TUTORIAL_TRANSLATIONS[base.id][locale]
  return {
    id: base.id,
    name: base.name,
    shortName: base.shortName,
    accent: base.accent,
    iconUrl: base.iconUrl,
    iconSourceUrl: base.iconSourceUrl,
    supportedImportFormats: base.supportedImportFormats,
    preferredImportFormat: base.preferredImportFormat,
    ofxAvailability: base.ofxAvailability,
    ofxReferenceUrl: base.ofxReferenceUrl,
    ofxReferenceLabel: tr.ofxReferenceLabel,
    ofxIntro: tr.ofxIntro,
    ofxSteps: tr.ofxSteps,
    tutorialTitle: tr.tutorialTitle,
    intro: tr.intro,
    steps: tr.steps,
    observations: tr.observations,
    referenceLinks: [{ label: tr.referenceLinkLabel, url: base.referenceUrl }],
    images: base.images,
    lastVerifiedAt: base.lastVerifiedAt,
    status: base.status,
  }
}

/** Returns the bank tutorial list translated for the given locale (defaults to pt-BR). */
export function getBankTutorials(locale: AppLocale = 'pt-BR'): BankTutorial[] {
  return BANK_TUTORIAL_BASE.map((base) => buildTutorial(base, locale))
}

/** Returns a single bank's tutorial translated for the given locale (defaults to pt-BR). */
export function getBankTutorialById(id: BankTutorial['id'], locale: AppLocale = 'pt-BR'): BankTutorial {
  const base = BANK_TUTORIAL_BASE.find((item) => item.id === id)
  if (!base) throw new Error(`Unknown bank tutorial id: ${id}`)
  return buildTutorial(base, locale)
}

/** Returns the full bank tutorial map (by id) translated for the given locale (defaults to pt-BR). */
export function getBankTutorialsById(locale: AppLocale = 'pt-BR'): Record<BankTutorial['id'], BankTutorial> {
  return Object.fromEntries(getBankTutorials(locale).map((item) => [item.id, item])) as Record<
    BankTutorial['id'],
    BankTutorial
  >
}

// ─── Backward-compatible pt-BR exports ────────────────────────────────────────
// Some call sites (e.g. the API route validating supported formats) only need
// locale-independent fields (ids, supported formats, etc.), so a pt-BR snapshot
// is fine there. Prefer `getBankTutorials`/`getBankTutorialById` wherever the
// translated text is actually rendered to a user.
export const BANK_TUTORIALS: BankTutorial[] = getBankTutorials('pt-BR')
export const BANK_TUTORIALS_BY_ID = getBankTutorialsById('pt-BR')
