import type { Sessao, Treino, TreinoExercicio } from "./types";
import { regKey } from "./types";

/**
 * Sugestão de carga (dupla progressão), a regra central do método:
 * "busque a falha dentro do intervalo de repetições; se não chegar nas
 * repetições mínimas, baixe a carga; se ultrapassar, suba a carga".
 *
 * O app só MOSTRA a sugestão — quem digita a carga é você.
 */

export interface UltimoTrabalho {
  data: string;
  kg: number;
  reps: number;
}

/** Faixa de reps de uma prescrição ("2 × 6 a 10" → [6, 10]); null para "RM" ou sem faixa. */
export function faixaDeReps(presc: string): [number, number] | null {
  const depois = presc.split("×")[1] ?? "";
  const m = depois.match(/(\d+)\s*(?:a|-|–)\s*(\d+)/);
  if (m) return [Number(m[1]), Number(m[2])];
  const um = depois.match(/^\s*(\d+)\s*$/);
  return um ? [Number(um[1]), Number(um[1])] : null;
}

/** Exercícios em que o passo de carga é maior (anilhas de 2,5 kg de cada lado / pinos de 5 kg). */
const PASSO_GRANDE = /leg|agachamento|hack|stiff|meio terra|terra|quadril|panturrilha/i;

export function passoDeCarga(nomeExercicio: string): number {
  return PASSO_GRANDE.test(nomeExercicio) ? 5 : 2.5;
}

export type Direcao = "subir" | "baixar" | "manter";

export interface SugestaoCarga {
  direcao: Direcao;
  /** carga sugerida em kg (igual à última quando "manter") */
  kg: number;
  ultimo: UltimoTrabalho;
  faixa: [number, number];
}

export function sugerirCarga(presc: string, ultimo: UltimoTrabalho | null, nomeExercicio: string): SugestaoCarga | null {
  const faixa = faixaDeReps(presc);
  if (!faixa || !ultimo || !(ultimo.kg > 0) || !(ultimo.reps > 0)) return null;
  const passo = passoDeCarga(nomeExercicio);
  const arred = (v: number) => Math.round(v * 2) / 2;
  if (ultimo.reps > faixa[1]) return { direcao: "subir", kg: arred(ultimo.kg + passo), ultimo, faixa };
  if (ultimo.reps < faixa[0]) return { direcao: "baixar", kg: Math.max(0, arred(ultimo.kg - passo)), ultimo, faixa };
  return { direcao: "manter", kg: ultimo.kg, ultimo, faixa };
}

export function formatarKg(kg: number): string {
  return kg.toLocaleString("pt-BR", { maximumFractionDigits: 1 });
}

/**
 * Última série de trabalho registrada de um exercício antes de uma data, em
 * QUALQUER treino ou programa (os nomes são unificados, então trocar de
 * programa não zera a referência). Pega a de maior carga daquele dia.
 */
export function ultimoTrabalho(
  exercicioId: string,
  sessoesAsc: Sessao[],
  treinos: Record<string, Treino>,
  dataLimite: string
): UltimoTrabalho | null {
  for (let i = sessoesAsc.length - 1; i >= 0; i--) {
    const s = sessoesAsc[i];
    if (s.data >= dataLimite || s.deleted) continue;
    const plano: TreinoExercicio[] = [...(treinos[s.treinoId]?.exercicios ?? []), ...(s.extras ?? [])];
    let melhor: UltimoTrabalho | null = null;
    for (const te of plano) {
      if (te.exercicioId !== exercicioId) continue;
      te.series.forEach((serie, si) => {
        if (serie.tipo !== "trabalho") return;
        const r = s.registros[regKey(te.id, si)];
        if (!r) return;
        const kg = parseFloat(String(r.kg).replace(",", "."));
        const reps = parseInt(r.reps, 10);
        if (!(kg > 0) || !(reps > 0)) return;
        if (!melhor || kg > melhor.kg) melhor = { data: s.data, kg, reps };
      });
    }
    if (melhor) return melhor;
  }
  return null;
}
