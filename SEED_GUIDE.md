# 🗑️ LIMPAR E POPULAR BANCO - GUIA RÁPIDO

## 1️⃣ LIMPAR TUDO

No Supabase SQL Editor, execute:
```sql
-- supabase/cleanup.sql
```

Isso vai deletar:
- ✅ Todas as famílias
- ✅ Todos os usuários da tabela
- ✅ Todas as despesas/receitas/sonhos
- ✅ Todos os lembretes
- ⚠️ NÃO deleta usuários do Auth (comente a última linha se quiser deletar)

## 2️⃣ CRIAR NOVO USUÁRIO

### Opção A: Via Interface (Recomendado)
1. Acesse: http://localhost:3000/signup
2. Preencha:
   - Nome: `João Silva`
   - Família: `Família Silva`
   - Email: `teste@exemplo.com`
   - Senha: `senha123`
3. Clique em "Criar família"

### Opção B: Via Supabase Dashboard
1. Authentication → Users → Add user
2. Email: `teste@exemplo.com`
3. Password: `senha123`
4. Create user
5. Faça login no app para criar a família automaticamente

## 3️⃣ POPULAR COM DADOS DE TESTE

### Passo 1: Pegar seus IDs

**User ID:**
1. Supabase → Authentication → Users
2. Clique no seu usuário
3. Copie o **ID** (ex: `a1b2c3d4-e5f6-7890-abcd-ef1234567890`)

**Family ID:**
1. Supabase → Table Editor → `families`
2. Encontre sua família
3. Copie o **id** (ex: `f1e2d3c4-b5a6-7890-cdef-123456789abc`)

### Passo 2: Editar o seed-dynamic.sql

Abra `supabase/seed-dynamic.sql` e substitua:

```sql
v_user_id UUID := 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'; -- SEU ID AQUI
v_family_id UUID := 'f1e2d3c4-b5a6-7890-cdef-123456789abc'; -- SEU ID AQUI
```

### Passo 3: Executar

No Supabase SQL Editor:
```sql
-- supabase/seed-dynamic.sql (depois de editar os IDs)
```

## 4️⃣ VERIFICAR

Atualize a página do app: http://localhost:3000

Você deve ver:
- ✅ Dashboard com lembretes
- ✅ Contas a Pagar com várias despesas
- ✅ Dados de Março e Abril (para comparativos)

## 📊 O Que Foi Criado

### Despesas (Abril 2026)
- Aluguel: R$ 2.000,00 (pago)
- Energia: R$ 189,90 (pago)
- Água: R$ 85,00 (pago)
- Mercado: R$ 651,40 (pago)
- Lazer: R$ 96,00 (pago)
- Saúde: R$ 154,30 (pago)
- Educação: R$ 235,00 (em aberto)
- Hobbie: R$ 89,00 (em aberto)

**Total:** R$ 3.500,60

### Receitas (Abril 2026)
- Salário: R$ 8.500,00
- Freela: R$ 1.200,00

**Total:** R$ 9.700,00

### Poupança (Abril 2026)
- Casa: R$ 250,00
- Viagem: R$ 550,00

**Total:** R$ 800,00

### Saldo de Abril
R$ 9.700,00 - R$ 3.500,60 - R$ 800,00 = **R$ 5.399,40**

### Lembretes
- 2 concluídos (água, mercado)
- 3 pendentes (viagem, aluguel, doação)

## 🔄 Resetar Novamente

Se quiser começar do zero:
1. Execute `cleanup.sql`
2. Delete o usuário em Authentication → Users
3. Crie novo usuário via signup
4. Repita o processo

## ⚠️ Dicas

- Use emails diferentes para cada teste (ex: `teste1@exemplo.com`, `teste2@exemplo.com`)
- O seed cria dados de Março e Abril para testar comparativos
- Lembretes são criados com datas relativas (hoje + X dias)
- Todas as despesas de Abril estão pagas, exceto Educação e Hobbie
