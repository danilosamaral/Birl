# BIRL! — Plano de expansão: de ficha fixa para plataforma completa de treinos

> Documento para aprovação. Depois do OK, a implementação segue fase a fase,
> cada fase entregando algo utilizável.

## 1. Visão

Hoje o BIRL! é uma ficha digital de um treino específico: os treinos A/B/C/D
estão fixos no código (`index.html`, constante `TREINOS`) e o app só permite
registrar a execução deles. A mudança transforma o app numa **plataforma
pessoal de treinos**:

- **Treinos são dados, não código** — criar, editar, duplicar, reordenar e
  arquivar treinos, exercícios e séries livremente.
- **Biblioteca de exercícios** — base pronta com imagens de execução/postura,
  buscável por grupo muscular, mais exercícios próprios com upload de
  fotos/GIFs e links de vídeo.
- **Evolução em todos os aspectos** — carga, volume, PRs, 1RM estimado,
  frequência/calendário e medidas corporais.
- **Nada se perde** — as 11 sessões já registradas (local e Supabase) são
  migradas automaticamente.

## 2. Decisões já alinhadas

| Decisão | Escolha |
|---|---|
| Arquitetura | Projeto estruturado (Vite + framework), PWA, deploy estático na Vercel |
| Imagens de exercícios | Biblioteca pronta **+** upload próprio e links de vídeo |
| Evolução | Volume/PRs/1RM estimado + frequência/calendário + peso e medidas corporais |
| Condução | Plano aprovado antes, implementação em fases |

## 3. Stack proposta

- **Vite + React + TypeScript** — ecossistema maduro, componentes para tudo
  (drag-and-drop do editor, virtualização de listas), fácil de manter.
- **PWA** (`vite-plugin-pwa`) — instala na tela inicial do iPhone/iPad como
  hoje, funciona offline na academia; substitui as meta tags manuais atuais.
- **Local-first**: os dados vivem no aparelho (IndexedDB via Dexie — mais
  capacidade e robustez que o `localStorage` atual) e sincronizam com o
  Supabase quando logado, mantendo a estratégia atual de "funciona sem conta,
  melhora com conta".
- **Gráficos**: evolução do componente SVG próprio atual (leve, já no visual
  do app) — sem biblioteca pesada de charts.
- **Identidade visual preservada**: mesmo dark theme laranja/verde, fontes
  Anton/Oswald, mesma linguagem BIRL!.
- **Vercel**: o build do Vite gera `dist/` estático; o `index.html` atual
  permanece publicado até a virada de chave (a nova versão só substitui a
  antiga quando a migração estiver pronta e testada).

## 4. Modelo de dados (Supabase)

O projeto Supabase é compartilhado com outros apps (`households`, `merc_*`,
`sb_*`...), então **todas as tabelas novas usam o prefixo `birl_`** e RLS por
`auth.uid()`, como a `adg_registros` atual. A `adg_registros` **não é
alterada nem apagada** — vira fonte de migração e backup.

```
birl_exercicios          — biblioteca pessoal de exercícios
  id uuid PK, user_id, nome, grupo_muscular, equipamento,
  instrucoes text, midia jsonb (imagens do storage + links de vídeo),
  origem ('biblioteca' | 'proprio'), external_id (id na base pública),
  arquivado bool, criado_em

birl_treinos             — modelos de treino (os "A/B/C/D" e os novos)
  id uuid PK, user_id, nome, foco, cor, ordem, arquivado, criado_em

birl_treino_exercicios   — exercícios dentro de um treino
  id uuid PK, treino_id FK, exercicio_id FK, ordem, aviso,
  series jsonb  — [{tipo, series, reps_min, reps_max, intervalo, tecnica, nota}]

birl_sessoes             — uma sessão realizada (data + treino)
  id uuid PK, user_id, data date, treino_id FK, obs text,
  aval jsonb ({motivacao, energia, sono}), updated_at

birl_registros_serie     — o que foi feito em cada linha de série
  id uuid PK, sessao_id FK, treino_exercicio_id FK, exercicio_id FK,
  serie_idx, sets, kg numeric, reps, rir, done bool

birl_medidas             — peso e medidas corporais
  id uuid PK, user_id, data date, peso numeric,
  medidas jsonb ({braco_d, braco_e, peito, cintura, quadril, coxa_d, ...})

Storage: bucket `birl-midia` (privado, pasta por user_id) para fotos/GIFs
de postura enviados pelo usuário.
```

**Por que IDs estáveis importam**: hoje o registro usa índices posicionais
(`"A-0-2"` = treino A, exercício 0, série 2). Se você reordenasse um
exercício, o histórico apontaria para o exercício errado. Com UUIDs, editar
o treino nunca corrompe o histórico; registros de exercícios removidos
continuam contando na evolução daquele exercício.

## 5. Migração dos dados existentes

Automática e idempotente, na primeira abertura da versão nova:

1. Cria os 4 treinos padrão (A/B/C/D) a partir da constante `TREINOS` atual,
   já como dados editáveis, com os exercícios cadastrados na biblioteca.
2. Lê `localStorage["adg_registros_v1"]` e, se logado, a tabela
   `adg_registros`; converte cada chave `data|treino` + `"A-0-2"` para
   sessões e registros de série com os novos UUIDs (o mapeamento
   índice → UUID é determinístico porque os treinos padrão são criados a
   partir da mesma constante).
3. Marca a migração como concluída; os dados antigos ficam intactos como
   backup. O backup/restauração por texto continua existindo (agora
   exportando o formato novo).

## 6. Telas da plataforma

1. **Hoje / Registro** — evolução da tela atual: escolhe o treino do dia
   (sugerido pela divisão da semana, agora configurável), registra séries
   com os mesmos campos (sets/kg/reps/RIR + feito), avaliação de bem-estar e
   observações. Novidades: última carga registrada exibida ao lado de cada
   exercício ("da última vez: 30 kg × 8") e **timer de descanso** opcional
   acionado ao marcar uma série.
2. **Meus Treinos** — lista de treinos com criar/duplicar/arquivar; editor
   com reordenação por arrastar, adição de exercícios vindos da biblioteca e
   configuração de séries (tipo aquecimento/ajuste/trabalho, faixa de reps,
   intervalo, técnica drop set/rest pause, notas). Divisão da semana
   configurável (que dia é qual treino).
3. **Biblioteca de exercícios** — busca por nome/grupo muscular/equipamento;
   detalhe com imagens de execução, instruções passo a passo e glossário
   (mantido). Base pública pré-carregada (free-exercise-db, domínio público,
   ~870 exercícios com imagens de execução — nomes traduzidos para PT-BR nos
   mais comuns) + exercícios próprios com upload de imagem/GIF e link de
   vídeo (YouTube etc.).
4. **Evolução** — por exercício: gráfico de carga (atual), volume por sessão,
   1RM estimado (fórmula de Epley) e PRs (maior carga, melhor e1RM, mais
   reps); por treino: volume semanal e bem-estar (atual); geral:
   **calendário/heatmap** de treinos, sequência (streak) e aderência à
   divisão da semana. Relatório para impressão/PDF mantido e expandido.
5. **Medidas** — registro de peso corporal e medidas (braços, peito,
   cintura, quadril, coxas...) com gráficos de evolução e deltas.
6. **Conta / Ajustes** — login/sync (fluxo atual), backup/exportação,
   preferências (timer, unidades, divisão da semana).

## 7. Fases de implementação

Cada fase termina com deploy funcional e dados preservados.

- **Fase 0 — Fundação** ✅ *(estrutura)*: scaffolding Vite+React+TS, PWA,
  port do visual atual, Dexie + camada de sync, pipeline Vercel. O app
  continua funcionando exatamente como hoje, só que sobre a base nova.
- **Fase 1 — Treinos editáveis + migração** ✅ *(o coração da mudança)*:
  schema `birl_*`, migração automática do histórico, telas Meus Treinos e
  editor, registro apontando para treinos do usuário, última carga no
  registro. → **A partir daqui você já monta seus próprios treinos.**
- **Fase 2 — Biblioteca de exercícios** ✅: base pública com imagens,
  busca/filtros, detalhe com instruções, upload próprio e links
  de vídeo, glossário integrado.
- **Fase 3 — Evolução completa** ✅: volume, PRs, e1RM, calendário/heatmap,
  streak, aderência, timer de descanso, relatório expandido.
- **Fase 4 — Medidas corporais** ✅: peso + circunferências com gráficos,
  entrada rápida por data, integração no relatório.

**Extras entregues além do plano**: programas de treino com divisão da
semana própria, pré-carga dos números da última sessão, barra de progresso
fixa no cabeçalho, iniciar/encerrar treino com duração, e rótulos de dia/mês
no calendário.

- **Fase 5 — Multiusuário** ✅: login obrigatório com tela própria (entrar,
  criar conta e recuperar senha), banco local separado por usuário
  (`birl_u_<id>` no IndexedDB) para histórico/evolução individuais mesmo em
  aparelho compartilhado, seeds (ficha A/B/C/D, biblioteca e programas) para
  cada conta nova, e adoção dos dados pré-login pelo primeiro usuário que
  logar no aparelho. Cada pessoa customiza os próprios treinos e programas
  sem afetar as demais; o isolamento no Supabase segue por RLS/`user_id`.

- **Fase 6 — Registro por série e exercícios retráteis** ✅: cada linha de
  série passou a ter um botão de "feito" por série individual prescrita
  (ex.: aquecimento "1-2 ×" gera dois botões 1ª/2ª), disparando o timer de
  descanso a cada marcação — não só na transição aquecimento→ajuste→trabalho.
  O `RegistroSerie` ganhou o campo `feitos: boolean[]` (retrocompatível: o
  `done` antigo vale como "todas feitas"); os contadores de progresso passam
  a somar séries individuais. Na tela Hoje, os exercícios ficam recolhidos
  por padrão, deixando aberto apenas o "da vez" (primeiro com séries
  pendentes); o cabeçalho recolhido mostra nome, progresso (feitas/total) e
  atalho de detalhe, e um toque abre/fecha manualmente.

## 8. Pontos de atenção

- **Chave Supabase no código**: a chave atual é a *publishable* (própria
  para uso em cliente, protegida por RLS) — sem problema, permanece assim.
- **Constraint da tabela antiga**: `adg_registros.treino` só aceita
  A/B/C/D; por isso a tabela nova de sessões referencia `treino_id` (uuid),
  sem limite de treinos.
- **Imagens da base pública**: servidas via CDN (jsDelivr) com cache do
  service worker; exercícios próprios ficam no Storage privado.
- **Virada de chave**: a versão antiga (`index.html`) só sai do ar quando a
  Fase 1 estiver validada por você com seus dados reais migrados.
