# ⚙️ SETUP SUPABASE - GUIA ATUALIZADO

## 🚀 Ordem Correta de Execução

### 1️⃣ Criar Projeto
- Acesse https://supabase.com
- Crie novo projeto
- Anote URL e anon key

### 2️⃣ Configurar Authentication
**IMPORTANTE**: Desabilite confirmação de email
1. Authentication → Providers → Email
2. Desmarque "Confirm email"
3. Salvar

### 3️⃣ Executar SQL (NA ORDEM)

**a) Schema (estrutura das tabelas)**
```sql
-- Execute: supabase/schema.sql
```

**b) Políticas RLS Corrigidas**
```sql
-- Execute: supabase/rls-policies.sql
```

**c) Seed (OPCIONAL - apenas para dados de teste)**
```sql
-- Execute: supabase/seed.sql
-- ATENÇÃO: Os usuários do seed NÃO funcionam para login!
-- Use apenas para ter dados de exemplo
```

### 4️⃣ Configurar .env.local
```bash
NEXT_PUBLIC_SUPABASE_URL=https://seuprojetoid.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua_chave_anon_aqui
```

### 5️⃣ Criar Primeiro Usuário
1. Acesse: http://localhost:3000/signup
2. Preencha o formulário
3. Crie sua conta

## ❌ Erros Comuns

### "Invalid credentials" (400)
- **Causa**: Tentando usar usuários do seed.sql
- **Solução**: Use a página de Signup para criar usuário real

### "Permission denied" durante signup
- **Causa**: RLS não configurado corretamente
- **Solução**: Execute `rls-policies.sql`

### "Email not confirmed"
- **Causa**: Confirmação de email está ativa
- **Solução**: Desabilite em Authentication → Providers

### "User already registered"
- **Causa**: Email já cadastrado
- **Solução**: Use outro email OU faça login

## 🔐 Como Funciona o Signup

1. Cria usuário no Supabase Auth
2. Espera 1 segundo (Auth processar)
3. Cria família na tabela `families`
4. Cria perfil na tabela `users`
5. Cria categorias e sonhos padrão
6. Redireciona para dashboard

## 🧪 Testar a Configuração

Após criar sua conta:
```javascript
// No console do navegador:
console.log(await supabase.auth.getUser())
// Deve mostrar seu usuário
```

## 📊 Verificar Dados

No Supabase:
1. Table Editor → families (deve ter sua família)
2. Table Editor → users (deve ter seu perfil)
3. Authentication → Users (deve ter seu email)
4. Table Editor → categories (deve ter 11 categorias)
5. Table Editor → dreams (deve ter 3 sonhos)

## 🆘 Se Nada Funcionar

Execute este SQL para DESABILITAR RLS temporariamente:
```sql
ALTER TABLE families DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE categories DISABLE ROW LEVEL SECURITY;
```

Depois de testar, REABILITE:
```sql
ALTER TABLE families ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE categories ENABLE ROW LEVEL SECURITY;
```

## ✅ Checklist Final

- [ ] Projeto criado no Supabase
- [ ] Confirmação de email DESABILITADA
- [ ] schema.sql executado
- [ ] rls-policies.sql executado
- [ ] .env.local configurado
- [ ] Servidor reiniciado (`npm run dev`)
- [ ] Usuário criado via /signup
- [ ] Login funciona
- [ ] Dashboard carrega
