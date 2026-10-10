# Manual para criar um programa de treino novo no BIRL!

> **Para quem é este documento:** para o Claude (ou qualquer pessoa) que vai **montar um programa
> de treino novo** que depois será colocado no app BIRL!. Leia tudo antes de começar e entregue a
> resposta **exatamente no formato da seção 7**. Assim o programa entra no app sem retrabalho e
> sem perder nada no caminho.

---

## 1. O que é o BIRL!

O BIRL! é um app pessoal de treino de musculação. Ele é usado **no celular, em pé na academia,
entre uma série e outra**. Por isso tudo precisa ser curto, claro e rápido de ler.

O app já tem 7 programas prontos, tirados dos PDFs do curso **"Além da Genética 2.0"**,
organizados numa **trilha** (uma sequência de etapas):

| Nível | Programas que já existem |
|---|---|
| 1 · Começando | Adaptação muscular (corpo inteiro 2x) → Iniciantes 2x A/B → Iniciantes 4x A/B |
| 2 · Intermediário | PPL 3x (puxar/empurrar/pernas) → ABCD intermediário (4x) |
| 3 · Avançado · 5 dias | ABCDE ênfase em superiores → ABCDE ênfase em inferiores |

O programa novo vai entrar **junto com esses**, então ele deve "falar a mesma língua": mesma
forma de escrever séries, descansos, técnicas e nomes de exercícios.

## 2. O método que o app segue (importante para a lógica do plano)

- **Três tipos de série** em cada exercício:
  - **Aquecimento** — leve (~30% da carga), bem longe da falha. Ex.: `1-2 × 10 a 15`.
  - **Ajuste** (preparatória) — carga considerável, ainda longe da falha; serve para "sentir o dia".
    Ex.: `1-2 × 4 a 6`.
  - **Trabalho** — a série que conta: vai até a falha (ou quase) **dentro da faixa de repetições**.
    Ex.: `2 × 6 a 10`.
  - Normalmente o **1º exercício de um grupo muscular** tem aquecimento + ajuste + trabalho; os
    seguintes do mesmo grupo têm só ajuste + trabalho (o músculo já está aquecido). Exercícios de
    abdômen e lombar costumam ter só trabalho.
- **Dupla progressão:** o app olha a última série de trabalho e **sugere** subir a carga (passou do
  máximo da faixa), manter ou baixar (não chegou no mínimo). Por isso **toda série de trabalho
  precisa de uma faixa de repetições** (ex.: `6 a 10`) — ou `RM` quando é "o máximo que conseguir".
- **Você não prescreve carga em kg.** O app não guarda carga no plano; quem decide é o usuário, com a
  ajuda da sugestão.
- **RIR** (repetições em reserva) é anotado pelo usuário; não precisa vir no plano.

## 3. Como um programa é organizado no app

```
Programa
 ├─ informações gerais (nome, descrição, para quem, nível, dias da semana…)
 └─ Treinos (A, B, C…)
     ├─ nome + foco (ex.: "Treino A" · "Peito · Ombros · Tríceps")
     ├─ preparo do dia (opcional: mobilidade/alongamento, vira uma lista de ticar)
     └─ Exercícios (em ordem)
         ├─ nome (de preferência um nome da lista da seção 5)
         ├─ grupo muscular
         ├─ técnicas do exercício inteiro (opcional, hoje só "pico2s")
         ├─ aviso (opcional, frase curta)
         └─ Linhas de série (uma por tipo)
             ├─ tipo: aquecimento | ajuste | trabalho
             ├─ prescrição: "2 × 6 a 10"
             ├─ descanso: "2 a 3 min"
             └─ nota de técnica (opcional): "+ 1 drop set na última série"
```

### O que o app **não** consegue representar (avise se o seu plano precisar disso)

- **Periodização semana a semana** (ex.: "semana 1: 3×12, semana 2: 4×10"). O plano é o mesmo
  todas as semanas. Existe só: duração recomendada em semanas + um lembrete de objetivo.
- **Bi-set / super-set / circuito como estrutura.** Dá para escrever como nota ("+ bi-set com…"),
  mas o timer trata cada exercício separado.
- **Cardio por tempo/distância**, isometria por segundos (prancha 30 s) ou exercícios sem
  repetições. Se precisar, descreva — eu adapto ou crio a função antes.
- **Carga em kg ou % de 1RM** no plano.
- **Mais de 12 séries** numa mesma linha, ou **descanso maior que 3 min**.

Se o plano precisar de alguma dessas coisas, **não force**: coloque na seção "Pontos fora do
modelo" da entrega (seção 7).

## 4. Regras de escrita (o app lê esses textos automaticamente)

### 4.1 Prescrição (`presc`)
Formato: **`[séries] × [repetições]`**, com o sinal **×** (multiplicação, não a letra x).

| Certo | Significa |
|---|---|
| `1 × 6 a 10` | 1 série de 6 a 10 repetições |
| `2 × 8 a 12` | 2 séries de 8 a 12 |
| `1-2 × 4 a 6` | de 1 a 2 séries de 4 a 6 |
| `3 × RM` | 3 séries com o máximo de repetições |
| `3 × 12` | 3 séries de exatamente 12 |

Evite: `3x10-12`, `3 séries de 10`, `até a falha`, `10/8/6` (pirâmide — se quiser pirâmide, use
linhas separadas ou explique em "Pontos fora do modelo").

### 4.2 Descanso (`int`)
O timer converte o texto em segundos. **Todas as linhas precisam de descanso**, inclusive
aquecimento e ajuste. Máximo 3 min.

| Certo | Vira |
|---|---|
| `1 min` | 60 s |
| `1 a 2 min` | 90 s (a média) |
| `2 a 3 min` | 150 s |
| `90 s` | 90 s |
| `45 s` | 45 s |

Evite: `—`, `livre`, `o necessário`, `1'30"`.

### 4.3 Notas de técnica (`nota`, na linha de trabalho)
Use **exatamente** uma destas frases (o app transforma em etiqueta curta e liga ao glossário):

- `+ 1 drop set na última série`  (ou `+ 1 drop set`)
- `+ 2 drops na última série`
- `+ 2 rest pause de 10s na última série`  (ou `+ 2 rest pause de 10s`)
- `+ 10 reps parciais após a falha em todas as séries`

Outra técnica (cluster, tempo 3-1-1, negativa…) pode ser escrita como nota livre começando com
`+ `, mas avise em "Pontos fora do modelo" para eu criar a etiqueta e o glossário.

### 4.4 Técnica do exercício inteiro (`tecnicas`)
Hoje só existe **`pico2s`** = segurar 2 segundos no pico da contração em todas as repetições.
**Nunca coloque a técnica no nome do exercício** (errado: "Remada baixa com 2s de pico").

### 4.5 Divisão da semana
Diga qual treino cai em cada dia. Domingo = 0, segunda = 1 … sábado = 6. Dia sem treino = descanso.
Ex.: `seg A · ter B · qua descanso · qui C · sex D · sáb descanso · dom descanso`.

### 4.6 Preparo do dia (opcional)
Frases curtas, uma por item. As que já existem (prefira reaproveitar):
- `Mobilidade de ombros`
- `Alongamento de peito`
- `Mobilidade e alongamento: posteriores de coxa, glúteos, quadríceps e íliopsoas`
- `Mobilidade e alongamento de ombros e tríceps`

## 5. Nomes de exercícios (use estes sempre que for o mesmo movimento)

Cada movimento tem **um nome único** no app, para o histórico de cargas continuar o mesmo de um
programa para outro. **Use o nome da coluna da esquerda, escrito igualzinho.** Se o seu exercício é
o mesmo movimento com outro nome, use o nome da lista. Só invente nome se for um movimento que
realmente não está aqui (e marque como **NOVO** na entrega).

| Grupo | Nome no app |
|---|---|
| Peito | Supino inclinado com halteres ou máquina |
| Peito | Supino reto com halteres ou máquina |
| Peito | Supino declinado com barra ou máquina |
| Peito | Voador |
| Costas | Remada curvada com barra |
| Costas | Remada baixa triângulo |
| Costas | Remada baixa pegada aberta ou máquina |
| Costas | Pulley frente triângulo |
| Costas | Pulley frente aberto |
| Costas | Serrote |
| Posterior | Meio terra |
| Lombar | Hiperextensão no banco romano |
| Ombro | Desenvolvimento com halteres ou máquina |
| Ombro | Elevação frontal (corda ou halteres) |
| Ombro | Elevação lateral |
| Ombro | Elevação lateral unilateral no cabo |
| Bíceps | Rosca direta com barra ou cabo |
| Bíceps | Rosca direta sentado com halteres |
| Bíceps | Rosca Scott (máquina ou cabo) |
| Bíceps | Rosca direta na corda |
| Tríceps | Tríceps testa na corda |
| Tríceps | Tríceps na corda |
| Tríceps | Tríceps francês |
| Quadríceps | Agachamento livre |
| Quadríceps | Leg 45 |
| Quadríceps | Hack machine |
| Quadríceps | Cadeira extensora |
| Posterior | Mesa flexora deitado |
| Posterior | Cadeira flexora (sentado) |
| Posterior | Stiff |
| Glúteos | Elevação de quadril |
| Glúteos | Abdutor |
| Panturrilha | Panturrilha em pé (máquina ou smith) |
| Panturrilha | Panturrilha sentada |
| Abdômen | Abdominal supra na prancha declinada |
| Abdômen | Abdominal infra na torre |
| Abdômen | Abdominal supra no solo |

**Grupos musculares válidos:** Peito, Costas, Ombro, Bíceps, Tríceps, Quadríceps, Posterior,
Glúteos, Panturrilha, Abdômen, Lombar. (Grupo novo → avise.)

**Exercício NOVO:** informe nome claro em português, grupo, equipamento e uma descrição de 1–2
frases da execução. Não mande links de vídeo de área de membros ou conteúdo pago (o app só usa
busca pública no YouTube).

## 6. Boas práticas de conteúdo

- Nome do programa curto (cabe numa linha do celular). Ex.: "Full body 3x · força".
- `foco` de cada treino: grupos separados por ` · `. Ex.: "Peito · Ombros · Tríceps".
- Descrição em **uma frase**; "para quem" em **uma frase**.
- Treinos com **6 a 8 exercícios** (a sessão precisa caber em ~60–75 min).
- Escreva para quem está cansado entre séries: frases curtas, sem jargão sem explicação.
- Sem emoji.
- Diga em qual **nível** (1, 2 ou 3) o programa se encaixa e se ele deve entrar na **trilha** (a
  sequência de etapas) ou ficar como programa avulso.

## 7. FORMATO DA ENTREGA (copie esta estrutura)

A resposta deve ter **quatro partes, nesta ordem**:

### Parte A — Resumo para o usuário
Até 10 linhas: objetivo do programa, para quem é, quantos dias, duração sugerida em semanas,
e a lógica da divisão. Em seguida, **uma tabela por treino** (exercício · aquec · ajuste ·
trabalho · descanso · técnica) para ele conferir com os olhos.

### Parte B — Bloco de dados (o que eu vou importar)
Um único bloco ` ```json ` seguindo **exatamente** este molde (apague os comentários `//`):

```json
{
  "id": "cat_nome_curto_sem_acento",          // ex.: "cat_fullbody_3x"
  "nome": "Nome curto do programa",
  "descricao": "Uma frase sobre o que é e quais dias.",
  "paraQuem": "Uma frase sobre para quem é.",
  "origem": "Plano próprio (Claude)",          // não use "Além da Genética 2.0"
  "nivel": 2,                                  // 1 Começando · 2 Intermediário · 3 Avançado
  "naTrilha": true,                            // true = entra na sequência; false = avulso
  "ordemSugerida": "depois do PPL 3x",         // onde encaixar na trilha (texto livre)
  "semanas": 8,                                // opcional: semanas antes de passar adiante
  "lembrete": "Frase curta mostrada no topo da tela Hoje.",   // opcional
  "divisaoSemana": { "0": null, "1": 0, "2": 1, "3": null, "4": 2, "5": 3, "6": null },
  "treinos": [
    {
      "nome": "Treino A",
      "foco": "Peito · Ombros · Tríceps",
      "preparo": ["Mobilidade de ombros"],
      "exercicios": [
        {
          "nome": "Supino inclinado com halteres ou máquina",
          "grupo": "Peito",
          "novo": false,
          "tecnicas": [],
          "series": [
            { "tipo": "aquecimento", "presc": "1-2 × 10 a 15", "int": "1 min" },
            { "tipo": "ajuste",      "presc": "1-2 × 4 a 6",   "int": "1 a 2 min" },
            { "tipo": "trabalho",    "presc": "2 × 6 a 10",    "int": "2 a 3 min" }
          ]
        },
        {
          "nome": "Voador",
          "grupo": "Peito",
          "novo": false,
          "tecnicas": ["pico2s"],
          "series": [
            { "tipo": "ajuste",   "presc": "1-2 × 4 a 6", "int": "1 min" },
            { "tipo": "trabalho", "presc": "2 × 10 a 15", "int": "1 min",
              "nota": "+ 1 drop set na última série" }
          ]
        }
      ]
    }
  ]
}
```

Observações sobre o bloco:
- `divisaoSemana`: a chave é o dia (0 = domingo … 6 = sábado); o valor é a **posição do treino na
  lista `treinos`, começando em 0** (0 = Treino A, 1 = Treino B…), ou `null` para descanso.
- `novo: true` só para exercício que não está na seção 5. Nesse caso acrescente
  `"equipamento"` e `"instrucoes"` (1–2 frases).
- `aviso` (opcional, por exercício): frase curta mostrada junto ao exercício.

### Parte C — Checklist (marque cada item)
- [ ] Todo exercício usa um nome da seção 5 ou está marcado `novo: true`.
- [ ] Nenhum nome de exercício contém técnica ("pico", "drop", "2s"…).
- [ ] Toda prescrição usa `×` e tem faixa de reps ou `RM`.
- [ ] Toda linha (inclusive aquecimento e ajuste) tem descanso no formato da seção 4.2, ≤ 3 min.
- [ ] Notas de técnica usam as frases da seção 4.3 (ou estão listadas na Parte D).
- [ ] `divisaoSemana` tem os 7 dias e só aponta para treinos que existem.
- [ ] Nenhuma linha passa de 12 séries.

### Parte D — Pontos fora do modelo e dúvidas
Liste aqui tudo que o app talvez não represente (periodização, bi-set, cardio, técnica nova,
grupo novo…) e qualquer decisão que o usuário precise tomar. Se não houver nada, escreva
"Nenhum".

---

## 8. O que acontece depois

1. O usuário cola a sua entrega numa conversa com o Claude Code do projeto.
2. O Claude Code confere o bloco, monta uma proposta visual e **espera a aprovação** do usuário.
3. Aprovado, o programa entra em `src/catalogo.ts`; apelidos e exercícios novos entram em
   `src/canonicos.ts`; os testes automáticos verificam nomes, séries e descansos.
4. Abre-se uma PR em rascunho; a Vercel publica uma prévia e o usuário testa no iPhone.
