# 🚀 SETUP RÁPIDO - Fintech Vintage

## Passo 1: Instalar Dependências

```bash
npm install
```

## Passo 2: Configurar Supabase

1. Acesse https://supabase.com e crie uma conta
2. Crie um novo projeto
3. Vá em **SQL Editor** e execute:
   - Primeiro: `supabase/schema.sql` (cria as tabelas)
   - Depois: `supabase/seed.sql` (adiciona dados de teste)

## Passo 3: Configurar Variáveis de Ambiente

```bash
cp .env.local.example .env.local
```

Edite `.env.local` e adicione:
```
NEXT_PUBLIC_SUPABASE_URL=seu_url_aqui
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_aqui
```

**Onde encontrar:**
- No Supabase: Project Settings → API
- Copie "Project URL" e "anon public"

## Passo 4: Rodar o Projeto

```bash
npm run dev
```

Acesse: http://localhost:3000

## Usuários de Teste

```
Email: joao@oliveira.com
Senha: senha123

Email: maria@oliveira.com  
Senha: senha123
```

## Passo 5: Deploy na Vercel

1. Push para GitHub
2. Conecte no Vercel
3. Adicione as env vars
4. Deploy!

## Status da Implementação

### ✅ Completo
- Estrutura do projeto
- Design System (CSS + Tokens)
- Autenticação (Login/Cadastro)
- Dashboard com Lembretes
- Contas a Pagar (exemplo completo)
- Componentes UI base (Modal, Select, FAB, etc)
- Schema e Seeds do banco
- PWA (manifest + service worker)
- Layout responsivo

### 📝 Para Implementar (seguir o exemplo de Payables)
- Contas a Receber (similar a Payables, sem status)
- Poupança/Sonhos (grid de cards + aportes)
- Saldo (cards + gráficos simples)
- Comparativos (gráficos Recharts)

### Guia de Implementação
Veja `IMPLEMENTATION_GUIDE.md` com instruções detalhadas para cada página restante.

## Estrutura de Pastas Criada

```
fintech-vintage/
├── app/                    
│   ├── globals.css        ✅
│   ├── layout.tsx         ✅
│   ├── page.tsx           ✅ (Dashboard)
│   ├── login/page.tsx     ✅
│   ├── signup/page.tsx    ✅
│   └── payables/page.tsx  ✅
├── components/
│   ├── AuthProvider.tsx   ✅
│   ├── layout/
│   │   ├── AppLayout.tsx  ✅
│   │   ├── Sidebar.tsx    ✅
│   │   └── Topbar.tsx     ✅
│   ├── pages/
│   │   ├── Dashboard.tsx  ✅
│   │   └── Payables.tsx   ✅ (exemplo completo)
│   └── ui/
│       ├── VintageCard.tsx    ✅
│       ├── Modal.tsx          ✅
│       ├── Select.tsx         ✅
│       ├── FabButton.tsx      ✅
│       ├── StatCard.tsx       ✅
│       └── EmptyState.tsx     ✅
├── lib/
│   ├── supabase.ts        ✅
│   ├── money.ts           ✅
│   └── dates.ts           ✅
├── types/
│   └── database.ts        ✅
├── supabase/
│   ├── schema.sql         ✅
│   └── seed.sql           ✅
├── public/
│   ├── manifest.json      ✅
│   └── sw.js              ✅
├── package.json           ✅
├── tsconfig.json          ✅
├── tailwind.config.ts     ✅
├── README.md              ✅
└── IMPLEMENTATION_GUIDE.md ✅
```

## Próximos Passos

1. ✅ Rodar `npm install`
2. ✅ Configurar Supabase (SQL + env vars)
3. ✅ Testar login com usuários seed
4. ✅ Explorar Dashboard e Contas a Pagar
5. 📝 Implementar páginas restantes seguindo o padrão
6. 🚀 Deploy na Vercel

## Ícones PWA (opcional)

Para gerar os ícones:
1. Crie um ícone 512x512 com o símbolo 💰 ou tema vintage
2. Use https://realfavicongenerator.net
3. Salve como `icon-192.png` e `icon-512.png` em `/public`

## Suporte

Todas as instruções detalhadas estão em:
- `README.md` - Documentação completa
- `IMPLEMENTATION_GUIDE.md` - Guia de implementação das páginas restantes

---

**Importante**: O código está pronto para rodar. As páginas restantes seguem o mesmo padrão de Payables - apenas copie e adapte!

Boa sorte! 🚀
