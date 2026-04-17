# Importação de Extrato Bancário em PDF e OFX

## Como funciona

1. O usuário abre o modal `Importar extrato bancário`.
2. Seleciona o banco e lê o tutorial dinâmico vindo de `lib/bank-statements/tutorials.ts`.
3. Faz upload do arquivo do extrato.
4. A rota `app/api/bank-statements/import/route.ts` valida autenticação, formato, tamanho e compatibilidade com o banco.
5. Se o arquivo for OFX, `OfxStatementParser` lê os lançamentos estruturados.
6. Se o arquivo for PDF, `PdfTextExtractor` extrai texto nativo com `pdf-parse` e `StatementParserFactory` cria o parser heurístico.
7. O serviço normaliza, classifica, deduplica e persiste em `incomes` e `expenses`.

## Bibliotecas usadas

- `pdf-parse`: extração de texto nativa do PDF em Node, sem serviço pago.
- `vitest`: testes automatizados do parser e do serviço.

## Limitações

- OFX é o formato preferencial quando o banco oferece suporte confirmado.
- O parser de PDF é heurístico e otimizado para layouts textuais comuns de extrato brasileiro.
- PDFs escaneados sem camada de texto retornam erro; OCR não é ativado por padrão.
- Alguns tutoriais seguem como `validation` porque a fonte pública oficial encontrada não detalha claramente a exportação em PDF no app.

## Como adicionar suporte a um novo banco

1. Adicione o `id` em `BANK_IDS`, em [types.ts](/home/lucas/Documentos/ruby/fintech-vintage/lib/bank-statements/types.ts).
2. Inclua o tutorial em [tutorials.ts](/home/lucas/Documentos/ruby/fintech-vintage/lib/bank-statements/tutorials.ts).
3. Se o layout exigir heurística própria, crie um parser dedicado e registre na factory.

## Como atualizar os tutoriais

1. Edite [tutorials.ts](/home/lucas/Documentos/ruby/fintech-vintage/lib/bank-statements/tutorials.ts).
2. Atualize `referenceLinks`, `steps`, `observations` e `lastVerifiedAt`.
3. Se houver screenshots oficiais reutilizáveis, preencha `images`. O modal já faz fallback quando estiver vazio.

## OCR fallback

Não implementado por padrão. Se for necessário no futuro:

1. Adicione uma feature flag explícita.
2. Encaminhe apenas PDFs sem texto extraível para OCR.
3. Use Tesseract open source de forma opcional e documentada.
