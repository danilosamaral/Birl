import type { Exercicio, Sessao, Treino } from "./types";
import { CANONICOS, mapaDeApelidos, nomeTinhaPico } from "./canonicos";
import { CATALOGO } from "./catalogo";
import { seedTreinoId } from "./seeds";

/**
 * Unificação dos exercícios (nomes iguais para o mesmo movimento).
 *
 * Função pura: recebe os dados e devolve SÓ o que precisa ser gravado. É
 * idempotente — rodar de novo não muda nada — e por isso roda a cada login e
 * depois de cada sincronização, pegando também dados que chegaram de um
 * aparelho com a versão antiga do app.
 *
 * Nada é apagado: o histórico das sessões é indexado pelo exercício do treino
 * (não pelo exercício da biblioteca), então trocar o `exercicioId` de um
 * exercício do treino não perde nenhum registro. Os exercícios-apelido viram
 * "excluídos" (tombstone), o mesmo que já acontece ao excluir na Biblioteca.
 */

export interface Mudancas {
  exercicios: Exercicio[];
  treinos: Treino[];
  sessoes: Sessao[];
}

/** Descanso das séries de trabalho que o PDF do ABCD não informa (vem do catálogo). */
function intervalosDoAbcd(): Map<string, string> {
  const m = new Map<string, string>();
  const abcd = CATALOGO.find((t) => t.id === "cat_abcd");
  abcd?.treinos.forEach((ct, ti) => {
    const letra = "ABCD"[ti];
    ct.exercicios.forEach((ce, ei) => {
      const tr = ce.series.find((s) => s.tipo === "trabalho");
      if (tr) m.set(`${seedTreinoId(letra)}_e${ei}`, tr.int);
    });
  });
  return m;
}

export function unificarExercicios(
  exercicios: Record<string, Exercicio>,
  treinos: Record<string, Treino>,
  sessoes: Record<string, Sessao>,
  quando: string
): Mudancas {
  const apelidos = mapaDeApelidos();
  const out: Mudancas = { exercicios: [], treinos: [], sessoes: [] };

  // 0) quem só tem o apelido (ex.: veio do programa 5x) ganha o canônico,
  //    copiado do apelido — nunca apontamos um treino para um id inexistente
  exercicios = { ...exercicios };
  for (const [idApelido, alvo] of apelidos) {
    const ap = exercicios[idApelido];
    const atual = exercicios[alvo.id];
    if (!ap || ap.deleted || (atual && !atual.deleted)) continue;
    const criado: Exercicio = { ...ap, id: alvo.id, nome: alvo.nome, deleted: undefined, updated_at: quando };
    delete criado.deleted;
    exercicios[alvo.id] = criado;
    out.exercicios.push(criado);
  }
  const nomeOriginalPico = (id: string) => {
    const ex = exercicios[id];
    return ex ? nomeTinhaPico(ex.nome) : false;
  };

  // 1) exercícios dos treinos: apelido → canônico; técnica do nome → etiqueta;
  //    descanso "—" do ABCD original → o dos outros programas do curso
  const intervalos = intervalosDoAbcd();
  for (const t of Object.values(treinos)) {
    if (t.deleted) continue;
    let mudou = false;
    const exs = t.exercicios.map((te) => {
      let novo = te;
      const alvo = apelidos.get(te.exercicioId);
      const tinhaPico = nomeOriginalPico(te.exercicioId);
      if (alvo) {
        novo = { ...novo, exercicioId: alvo.id };
        mudou = true;
      }
      if (tinhaPico && !novo.tecnicas?.includes("pico2s")) {
        novo = { ...novo, tecnicas: [...(novo.tecnicas ?? []), "pico2s"] };
        mudou = true;
      }
      const int = intervalos.get(te.id);
      if (int && novo.series.some((s) => s.tipo === "trabalho" && s.int.trim() === "—")) {
        novo = { ...novo, series: novo.series.map((s) => (s.tipo === "trabalho" && s.int.trim() === "—" ? { ...s, int } : s)) };
        mudou = true;
      }
      return novo;
    });
    if (mudou) out.treinos.push({ ...t, exercicios: exs, updated_at: quando });
  }

  // 2) exercícios feitos como extra nas sessões
  for (const s of Object.values(sessoes)) {
    if (s.deleted || !s.extras?.length) continue;
    if (!s.extras.some((te) => apelidos.has(te.exercicioId))) continue;
    out.sessoes.push({
      ...s,
      extras: s.extras.map((te) => {
        const alvo = apelidos.get(te.exercicioId);
        return alvo ? { ...te, exercicioId: alvo.id } : te;
      }),
      updated_at: quando,
    });
  }

  // 3) o exercício canônico ganha o nome limpo (só se você não renomeou) e
  //    herda foto/instruções de um apelido quando não tiver as próprias
  const nomesConhecidos = new Map(CANONICOS.map((c) => [c.id, new Set([c.nome, ...c.apelidos])]));
  for (const c of CANONICOS) {
    const ex = exercicios[c.id];
    if (!ex || ex.deleted) continue;
    let novo = ex;
    if (ex.nome !== c.nome && nomesConhecidos.get(c.id)!.has(ex.nome)) novo = { ...novo, nome: c.nome };
    for (const [idApelido, alvo] of apelidos) {
      if (alvo.id !== c.id) continue;
      const ap = exercicios[idApelido];
      if (!ap || ap.deleted) continue;
      if (!novo.midia && ap.midia) novo = { ...novo, midia: ap.midia };
      if (!novo.instrucoes && ap.instrucoes) novo = { ...novo, instrucoes: ap.instrucoes };
    }
    if (novo !== ex) {
      const i = out.exercicios.findIndex((e) => e.id === c.id);
      if (i >= 0) out.exercicios[i] = { ...novo, updated_at: quando };
      else out.exercicios.push({ ...novo, updated_at: quando });
    }
  }

  // 4) apelidos com id próprio saem da biblioteca (só os que vieram de programa)
  for (const [idApelido, alvo] of apelidos) {
    const ap = exercicios[idApelido];
    if (!ap || ap.deleted || ap.origem !== "seed" || !exercicios[alvo.id]) continue;
    out.exercicios.push({ ...ap, deleted: true, updated_at: quando });
  }

  return out;
}
