# 🎨 Criar Ícones PWA

## Opção 1: Usar Gerador Online (Mais Fácil)

1. Acesse: https://realfavicongenerator.net
2. Faça upload de uma imagem 512x512 (pode ser o emoji 💰)
3. Baixe o pacote
4. Copie `icon-192.png` e `icon-512.png` para `/public`

## Opção 2: Usar o HTML Generator

1. Abra `public/create-icons.html` no navegador
2. Dois arquivos serão baixados automaticamente
3. Mova-os para a pasta `/public` do projeto

## Opção 3: Criar Manualmente

Use qualquer editor de imagens e crie:
- `icon-192.png` (192x192px)
- `icon-512.png` (512x512px)

Sugestão de design:
- Fundo: #3E5F4B (verde vintage)
- Ícone: 💰 ou símbolo de livro/casa
- Estilo: minimalista vintage

## Temporariamente (para testar sem ícones)

Comente as linhas no `manifest.json`:

```json
{
  "name": "Livro de Finanças da Família",
  "short_name": "Finanças",
  // Comente a seção icons:
  // "icons": [...]
}
```

E no `layout.tsx`:

```tsx
// <link rel="apple-touch-icon" href="/icon-192.png" />
```
