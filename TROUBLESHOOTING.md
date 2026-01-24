# 🔧 Troubleshooting Guide

## Problema: "Páginas não funcionam"

### Sintomas:
- Páginas mostram erro 404
- Páginas não carregam

### Solução:
1. Verifique se o servidor está rodando: `npm run dev`
2. Verifique se os arquivos existem:
   ```bash
   ls -la app/dreams/page.tsx
   ls -la app/balance/page.tsx
   ls -la app/comparatives/page.tsx
   ls -la app/receivables/page.tsx
   ```
3. Reinicie o servidor Next.js (Ctrl+C e `npm run dev` novamente)

---

## Problema: "Estilo está quebrado"

### Sintomas:
- Sidebar sobrepõe o conteúdo
- Cores não aparecem
- Fontes não carregam

### Soluções:

#### 1. Sidebar sobrepõe conteúdo
**Causa**: Main não tem margem esquerda  
**Solução**: Verificar `components/layout/AppLayout.tsx`:
```tsx
<main className="flex-1 overflow-auto ml-0 md:ml-72">
```

#### 2. Cores não aparecem
**Causa**: Tailwind não está compilando  
**Solução**: 
```bash
# Deletar cache
rm -rf .next
# Reinstalar
npm install
# Rodar novamente
npm run dev
```

#### 3. Fontes não carregam
**Causa**: Google Fonts bloqueado  
**Solução**: Verificar `app/globals.css` tem o import:
```css
@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700&family=Lora:wght@400;500;600&family=Source+Serif+4:wght@500;600&display=swap');
```

---

## Problema: "Erro de autenticação"

### Sintomas:
- Não consegue fazer login
- Redireciona para /login constantemente

### Soluções:

#### 1. Verificar Supabase
```bash
# Ver .env.local
cat .env.local
```
Deve conter:
```
NEXT_PUBLIC_SUPABASE_URL=sua-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=sua-key
```

#### 2. Limpar cookies/cache do navegador
- Ctrl+Shift+Delete
- Limpar cookies do localhost
- Recarregar página

#### 3. Criar novo usuário
- Ir para `/signup`
- Criar conta nova
- RLS está desabilitado, deve funcionar

---

## Problema: "Dados não aparecem"

### Sintomas:
- Dashboard vazio
- Listas vazias

### Soluções:

#### 1. Executar seed
```sql
-- No Supabase SQL Editor
-- Cole o conteúdo de supabase/seed-dynamic.sql
-- (Lembre de substituir os IDs)
```

#### 2. Verificar familyId
```javascript
// No console do navegador
console.log(familyId)
```
Se for `null`, o problema está no `AuthProvider.tsx`

#### 3. Verificar RLS
RLS deve estar **desabilitado** para desenvolvimento:
```sql
-- Execute no Supabase
SELECT * FROM pg_policies WHERE tablename IN ('expenses', 'incomes', 'reminders');
-- Deve retornar vazio (RLS desabilitado)
```

---

## Problema: "Build falha"

### Sintomas:
- `npm run build` dá erro
- Erro de tipos TypeScript

### Soluções:

#### 1. Verificar imports
Todos os imports devem usar `@/`:
```tsx
import Topbar from '@/components/layout/Topbar'
import { useAuth } from '@/components/AuthProvider'
```

#### 2. Verificar tipos
```bash
# Rodar type check
npx tsc --noEmit
```

#### 3. Limpar e rebuildar
```bash
rm -rf .next node_modules
npm install
npm run build
```

---

## Problema: "PWA não instala"

### Sintomas:
- Botão de instalar não aparece
- Service worker falha

### Soluções:

#### 1. HTTPS necessário
PWA só funciona em:
- localhost (desenvolvimento)
- HTTPS (produção)

#### 2. Verificar manifest
```bash
# Acessar no navegador
http://localhost:3000/manifest.json
```

#### 3. Verificar service worker
```javascript
// No console
navigator.serviceWorker.getRegistrations()
```

---

## Contatos de Suporte

- **Documentação Next.js**: https://nextjs.org/docs
- **Documentação Supabase**: https://supabase.com/docs
- **Documentação Tailwind**: https://tailwindcss.com/docs

---

**Dica**: Sempre verifique o console do navegador (F12) para ver erros detalhados!
