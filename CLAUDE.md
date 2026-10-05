# BIRL! — guia para o Claude Code

Plataforma pessoal de treinos (Vite + React + TypeScript, PWA, dados no aparelho com Dexie e
sincronização no Supabase). Usada **no celular, em pé na academia, entre uma série e outra**.

## Como trabalhar com o dono do projeto

- Ele está aprendendo ciência de dados e programa pouco: responda **em português**, de forma
  didática, explicando o porquê das escolhas (termo técnico = uma frase dizendo o que é).
- **Redesign ou programa novo: nunca altere o app antes de aprovação.** Fluxo combinado:
  1. Ele manda prints, PDFs de treino ou descreve o problema.
  2. Você analisa (e procura bugs no código daquela tela).
  3. Publica a proposta no design system (abaixo): maquete antes × proposta e uma seção
     markdown com itens numerados (**Hoje / Proposta / Por quê**) e perguntas no fim.
  4. Espera a resposta; só então implementa, verifica e abre a PR em rascunho.

## Design system (fonte da verdade visual)

**Artifact:** https://claude.ai/artifact/Uy7sqFAAnu2gKNjyHSUZfE (tipo "Design System").

- **Cores só por token** (`src/styles.css`): `--bg/--surface/--surface-2`, `--line/--line-strong`,
  `--ink/--ink-2/--ink-3`, `--brand` + `--on-brand`, `--brand-ink`, séries
  `--serie-aquec/-ajuste/-trabalho` (+ `-bg`), `--success`, `--info`, `--danger`. Nunca hex solto.
- **3 paletas × 2 modos** (Ferro & Brasa, Anilha, Clássica; escuro/claro) em
  `<html data-tema="paleta-modo">`, escolhidas em Ajustes › Aparência (`src/aparencia.ts`,
  guardado no aparelho). Teste pelo menos Brasa escuro e Brasa claro.
- **Vermelho (`danger`) só para erro/excluir.** Carga que caiu não é erro.
- **Tipografia:** Anton só no título e nas letras A/B/C/D; Barlow no resto, caixa normal;
  nada abaixo de 12px; campos com 16px+; números com `tabular-nums`.
- **Toque:** ≥ 48px (`--tap-min`); botão de série feita 56px.
- **Tipo de série = palavra + ícone de barras (`IconeTipo`) + cor.**
- **Sem emoji na interface:** ícones de traço em `src/icones.tsx`.
- **Confirmação destrutiva:** `confirmar()` / `ConfirmSheet` (`src/folha.tsx`), nunca `confirm()`.
  Formulários e menus: `<Folha>` (sobe de baixo).

## Programas e exercícios

- Catálogo/trilha em `src/catalogo.ts` (nível, ordem, semanas, preparo, técnicas). Fonte:
  PDFs do curso "Além da Genética 2.0".
- **Nomes unificados** em `src/canonicos.ts`: um movimento = um id (o que já existia) + apelidos.
  Programa novo deve usar o nome canônico; nome novo de PDF que é o mesmo movimento vira
  apelido. A migração (`src/unificacao.ts`) é idempotente e roda no login e após cada sync.
- Técnica que vale para o exercício todo ("2s de pico") vai em `tecnicas`, não no nome.
- Toda série precisa de descanso que o timer entenda (`parseIntervalo`); os testes do catálogo
  garantem isso.
- Sugestão de carga (`src/progressao.ts`) só **mostra**, nunca preenche.
- Vídeos: só busca pública no YouTube (sem links de área de membros/conteúdo pago).

## Verificação (antes de todo commit de código)

```bash
npx tsc -b
npm test          # vitest
npm run build
```

Depois rode o app (`npx vite preview`) e capture as telas em 390px com Playwright
(`/opt/pw-browsers/chromium`), com uma sessão falsa do Supabase no localStorage
(`sb-eskmvqphpllietgiqnbi-auth-token`) e as requisições ao Supabase interceptadas.
Mostre as capturas para ele.

## Git e PRs

- Base: `main`. PR em **rascunho**, descrição em português (o que muda / como foi verificado /
  observações). Commits no estilo `feat(area): …` / `fix(area): …`, em português.
- A Vercel publica uma prévia por PR; ele testa no iPhone por lá.
