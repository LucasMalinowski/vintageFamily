# 📖 Livro de Finanças da Família

Aplicativo de gestão financeira familiar com design vintage e alma moderna.

## 🎨 Características

- ✨ Design "Fintech Vintage" - estética clássica com UX moderna
- 📱 PWA (Progressive Web App) - instalável em dispositivos móveis
- 🔐 Autenticação multi-usuário por família
- 📊 Controle completo de receitas, despesas e sonhos
- 📈 Relatórios e comparativos visuais
- 🔔 Sistema de lembretes com recorrência
- 🎯 Gestão de metas e poupança

## 🚀 Stack Tecnológica

- **Frontend**: Next.js 14 (App Router) + TypeScript
- **Styling**: Tailwind CSS com design tokens vintage
- **Database**: Supabase (PostgreSQL)
- **Auth**: Supabase Auth
- **Charts**: Recharts
- **Deploy**: Vercel
- **PWA**: Service Worker + Manifest

## 📦 Instalação

### 1. Clone o repositório

```bash
git clone <seu-repo>
cd fintech-vintage
```

### 2. Instale as dependências

```bash
npm install
```

### 3. Configure o Supabase

1. Crie uma conta em [supabase.com](https://supabase.com)
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute o arquivo `supabase/schema.sql`
4. Depois execute o arquivo `supabase/seed.sql` para dados de exemplo

### 4. Configure as variáveis de ambiente

Copie o arquivo `.env.local.example` para `.env.local`:

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e adicione suas credenciais do Supabase:

```env
NEXT_PUBLIC_SUPABASE_URL=sua_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

Você encontra essas informações em:
**Project Settings → API** no dashboard do Supabase

### 5. Execute o projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## 🎯 Usuários de Teste (após rodar seed)

```
Email: joao@oliveira.com
Senha: senha123

Email: maria@oliveira.com
Senha: senha123
```

## 📱 Instalação como PWA

### Android/Chrome:
1. Acesse o app no Chrome
2. Menu → "Adicionar à tela inicial"

### iOS/Safari:
1. Acesse o app no Safari
2. Botão compartilhar → "Adicionar à Tela de Início"

## 🗂️ Estrutura do Projeto

```
fintech-vintage/
├── app/                    # Páginas Next.js (App Router)
│   ├── globals.css        # Estilos globais + fontes
│   ├── layout.tsx         # Layout raiz
│   ├── page.tsx           # Dashboard (capa)
│   ├── login/             # Página de login
│   ├── signup/            # Página de cadastro
│   ├── payables/          # Contas a pagar
│   ├── receivables/       # Contas a receber
│   ├── dreams/            # Poupança/Sonhos
│   ├── balance/           # Saldo
│   └── comparatives/      # Comparativos
├── components/
│   ├── AuthProvider.tsx   # Contexto de autenticação
│   ├── layout/            # Sidebar, Topbar
│   └── ui/                # Componentes reutilizáveis
├── lib/
│   ├── supabase.ts        # Cliente Supabase
│   ├── money.ts           # Formatação de moeda
│   └── dates.ts           # Utilitários de data
├── types/
│   └── database.ts        # Tipos TypeScript do banco
├── supabase/
│   ├── schema.sql         # Schema do banco
│   └── seed.sql           # Dados de exemplo
└── public/
    ├── manifest.json      # PWA manifest
    └── sw.js              # Service Worker
```

## 🎨 Design Tokens

### Cores
```css
--paper: #F4EFE6          /* Fundo papel */
--paper-2: #EFE7DA        /* Cards */
--ink: #2E2A24            /* Texto principal */
--coffee: #5A4633         /* Títulos/menus */
--petrol: #3A5A6A         /* Links/gráficos */
--olive: #7A8F6B          /* Positivo */
--terracotta: #B5654D     /* Alertas/despesas */
--border: #D9CFBF         /* Bordas */
--sidebar: #3E5F4B        /* Sidebar verde */
--fab-green: #6F8B5A      /* Botão FAB */
```

### Tipografia
- **Títulos**: Playfair Display (serif elegante)
- **Texto**: Lora (serif legível)
- **Números**: Source Serif 4 (opcional)

## 📊 Funcionalidades

### ✅ Implementado
- [x] Autenticação (login/cadastro)
- [x] Criação de família
- [x] Dashboard com capa poética
- [x] Sistema de lembretes
- [x] Contas a Pagar
- [x] Contas a Receber
- [x] Poupança/Sonhos
- [x] Saldo
- [x] Comparativos
- [x] Filtros por mês/ano/categoria
- [x] Modals para criar/editar
- [x] PWA (instalável)
- [x] Responsive (mobile-first)

### 🔜 Próximas Features
- [ ] Sistema de convites (convidar membros da família)
- [ ] Notificações push
- [ ] Exportar relatórios (PDF/Excel)
- [ ] Anexar comprovantes
- [ ] Tags personalizadas
- [ ] Dark mode (vintage night)

## 🚢 Deploy na Vercel

1. Faça push do código para o GitHub
2. Acesse [vercel.com](https://vercel.com)
3. Importe seu repositório
4. Configure as variáveis de ambiente:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. Deploy!

## 🔒 Segurança

- Row Level Security (RLS) ativado no Supabase
- Todas as queries são scoped por `family_id`
- Autenticação JWT via Supabase Auth
- Senhas hasheadas com bcrypt

## 📝 Textos Poéticos por Página

- **Dashboard**: "Organizar o dinheiro é cuidar do tempo que ainda vamos viver."
- **Pagar**: "Compromissos honrados constroem segurança."
- **Receber**: "Tudo que entra sustenta o que somos."
- **Sonhos**: "Sonhos bem cuidados também rendem."
- **Saldo**: "Saldo é o espaço onde a casa respira."
- **Comparativos**: "Comparar não é julgar: é entender o caminho."

## 🤝 Contribuindo

1. Fork o projeto
2. Crie uma branch (`git checkout -b feature/NovaFeature`)
3. Commit suas mudanças (`git commit -m 'Add: Nova feature'`)
4. Push para a branch (`git push origin feature/NovaFeature`)
5. Abra um Pull Request

## 📄 Licença

MIT

## 💬 Suporte

Para dúvidas ou problemas, abra uma issue no GitHub.

---

Feito com ❤️ e ☕ - Família Oliveira
