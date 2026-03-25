# Florim

Aplicativo de gestão financeira familiar com design vintage e alma moderna.

## 🎨 Características

- ✨ Identidade Florim com estética clássica e UX moderna
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
cd florim
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

## 📱 Instalação como PWA

### Android/Chrome:
1. Acesse o app no Chrome
2. Menu → "Adicionar à tela inicial"

### iOS/Safari:
1. Acesse o app no Safari
2. Botão compartilhar → "Adicionar à Tela de Início"

## 🗂️ Estrutura do Projeto

---

Feito com ❤️ por Familia Malinowski
