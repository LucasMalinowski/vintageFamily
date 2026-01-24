# ⚙️ Configuração do Supabase

## Erro 400 no Login - SOLUÇÃO

O erro `POST /auth/v1/token 400` acontece porque o Supabase Auth está tentando validar usuários que foram criados manualmente no banco.

### SOLUÇÃO 1: Desabilitar confirmação de email (Recomendado para dev)

1. Acesse seu projeto no Supabase
2. Vá em **Authentication** → **Providers** → **Email**
3. Desabilite "Confirm email"
4. Salve

### SOLUÇÃO 2: Criar usuários via interface do Supabase

Em vez de usar o seed.sql para criar usuários, faça assim:

1. Acesse **Authentication** → **Users**
2. Clique em "Add user"
3. Email: `joao@oliveira.com`
4. Password: `senha123`
5. Clique em "Create user"
6. Repita para `maria@oliveira.com`

Depois, você precisa atualizar a tabela `users` com esses IDs:

```sql
-- Pegue o ID do usuário criado no Auth
SELECT id, email FROM auth.users;

-- Atualize a tabela users com o ID correto
UPDATE users 
SET id = 'ID_DO_AUTH_AQUI'
WHERE email = 'joao@oliveira.com';

UPDATE users 
SET id = 'ID_DO_AUTH_AQUI'
WHERE email = 'maria@oliveira.com';
```

### SOLUÇÃO 3: Usar apenas o Signup (Mais simples)

1. Delete os usuários do seed.sql
2. Use a página de Cadastro do app para criar novos usuários
3. O sistema vai criar automaticamente no Auth + tabela users

## ⚠️ IMPORTANTE: Row Level Security

Se você ainda tiver erro, pode ser RLS. Execute:

```sql
-- Desabilitar RLS temporariamente para testar
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE incomes DISABLE ROW LEVEL SECURITY;
ALTER TABLE dreams DISABLE ROW LEVEL SECURITY;
ALTER TABLE dream_contributions DISABLE ROW LEVEL SECURITY;
ALTER TABLE reminders DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;

-- Depois de testar, habilite novamente
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
-- etc...
```

## 📝 Ordem Recomendada de Setup

1. ✅ Criar projeto no Supabase
2. ✅ Executar `schema.sql` (apenas estrutura)
3. ✅ NÃO executar seed.sql ainda
4. ✅ Desabilitar confirmação de email
5. ✅ Configurar .env.local
6. ✅ Usar a página de Cadastro do app
7. ✅ Criar sua primeira família
8. ✅ (Opcional) Criar dados de teste depois

## 🔑 Onde pegar as credenciais

1. Project Settings → API
2. Copiar:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **anon public** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## ✅ Testar a conexão

No console do navegador:

```javascript
console.log(process.env.NEXT_PUBLIC_SUPABASE_URL)
// Deve mostrar sua URL
```

Se mostrar `undefined`, suas variáveis não estão carregando:
- Reinicie o servidor (`npm run dev`)
- Verifique se o arquivo é `.env.local` (não `.env`)
- Verifique se não tem espaços antes/depois do `=`
