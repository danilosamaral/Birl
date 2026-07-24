import type { Programa, RegistroSerie, Sessao, Treino, TreinoExercicio } from "./types";

export function dataHoje(): string {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function formatarData(iso: string): string {
  const [a, m, d] = iso.split("-");
  return `${d}/${m}/${a}`;
}

export function formatarDataCurta(iso: string): string {
  const [, m, d] = iso.split("-");
  return `${d}/${m}`;
}

export function diaDaSemana(iso: string): number {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(a, m - 1, d).getDay();
}

export const DIAS_SEMANA = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];

/** Sessões de um treino, ordenadas por data. */
export function sessoesDoTreino(sessoes: Record<string, Sessao>, treinoId: string): Sessao[] {
  return Object.values(sessoes)
    .filter((s) => s.treinoId === treinoId && !s.deleted)
    .sort((a, b) => (a.data < b.data ? -1 : 1));
}

export interface PontoCarga {
  date: string;
  v: number;
}

export interface UltimaCarga {
  kg: string;
  reps: string;
  rir: string;
  sets: string;
  date: string;
}

/**
 * Pontos de carga de um exercício do treino: maior kg registrado na sessão
 * entre as linhas de série daquele exercício (robusto a edições do plano).
 */
export function pontosCarga(
  sessoes: Sessao[],
  te: TreinoExercicio
): { pts: PontoCarga[]; ultimo: UltimaCarga | null } {
  const pts: PontoCarga[] = [];
  let ultimo: UltimaCarga | null = null;
  const prefixo = `${te.id}:`;
  for (const s of sessoes) {
    let melhor: { kg: number; reg: UltimaCarga } | null = null;
    for (const [chave, r] of Object.entries(s.registros)) {
      if (!chave.startsWith(prefixo)) continue;
      const kg = parseFloat(r.kg);
      if (isNaN(kg)) continue;
      if (!melhor || kg > melhor.kg) {
        melhor = { kg, reg: { kg: r.kg, reps: r.reps, rir: r.rir, sets: r.sets, date: s.data } };
      }
    }
    if (melhor) {
      pts.push({ date: s.data, v: melhor.kg });
      ultimo = melhor.reg;
    }
  }
  return { pts, ultimo };
}

export function pontosAval(sessoes: Sessao[], attr: "motivacao" | "energia" | "sono"): PontoCarga[] {
  const pts: PontoCarga[] = [];
  for (const s of sessoes) {
    const v = s.aval?.[attr];
    if (v != null && !isNaN(Number(v))) pts.push({ date: s.data, v: Number(v) });
  }
  return pts;
}

/**
 * Último registro daquela linha de série (mesma posição) em sessões
 * anteriores à data — usado para pré-carregar os campos como sugestão.
 */
export function ultimoRegistroDaSerie(
  sessoes: Sessao[],
  chave: string,
  dataLimite: string
): { sets: string; kg: string; reps: string; rir: string } | null {
  for (let i = sessoes.length - 1; i >= 0; i--) {
    const s = sessoes[i];
    if (s.data >= dataLimite) continue;
    const r = s.registros[chave];
    if (r && (r.sets || r.kg || r.reps || r.rir)) {
      return { sets: r.sets, kg: r.kg, reps: r.reps, rir: r.rir };
    }
  }
  return null;
}

/** Última carga registrada de um exercício do treino antes de uma data. */
export function ultimaCargaAntes(
  sessoes: Sessao[],
  te: TreinoExercicio,
  dataLimite: string
): UltimaCarga | null {
  const anteriores = sessoes.filter((s) => s.data < dataLimite);
  const { ultimo } = pontosCarga(anteriores, te);
  return ultimo;
}

export function programasVisiveis(programas: Record<string, Programa>): Programa[] {
  return Object.values(programas)
    .filter((p) => !p.deleted && !p.arquivado)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
}

/** Paleta qualitativa para diferenciar programas (calendário, volume, legenda). */
export const CORES_PROGRAMA = ["#f15a22", "#1aa15a", "#3b82f6", "#a855f7", "#f0a93b", "#14b8a6", "#ec4899", "#84cc16"];
export const COR_SEM_PROGRAMA = "#6b6b70";

/** Mapa treinoId -> programaId (primeiro programa não-excluído que contém o treino). */
export function mapaTreinoPrograma(programas: Record<string, Programa>): Record<string, string> {
  const map: Record<string, string> = {};
  for (const p of Object.values(programas)) {
    if (p.deleted) continue;
    for (const tid of p.treinoIds) if (!map[tid]) map[tid] = p.id;
  }
  return map;
}

/** Cor estável por programa: índice na lista de programas não-excluídos, ordenada por nome. */
export function coresDosProgramas(programas: Record<string, Programa>): Record<string, string> {
  const ordenados = Object.values(programas)
    .filter((p) => !p.deleted)
    .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  const out: Record<string, string> = {};
  ordenados.forEach((p, i) => (out[p.id] = CORES_PROGRAMA[i % CORES_PROGRAMA.length]));
  return out;
}

/** Treinos de um programa, na ordem do programa, ignorando excluídos/arquivados. */
export function treinosDoPrograma(programa: Programa, treinos: Record<string, Treino>): Treino[] {
  return programa.treinoIds
    .map((id) => treinos[id])
    .filter((t): t is Treino => !!t && !t.deleted && !t.arquivado);
}

export function treinosVisiveis(treinos: Record<string, Treino>): Treino[] {
  return Object.values(treinos)
    .filter((t) => !t.deleted && !t.arquivado)
    .sort((a, b) => a.ordem - b.ordem);
}

/**
 * Quantas séries individuais uma linha prescreve: o valor digitado em
 * "Séries" quando houver, senão o máximo da prescrição ("1-2 × 10 a 15" → 2).
 */
export function seriesDaLinha(presc: string, sets: string): number {
  const digitado = parseInt(sets, 10);
  if (digitado > 0) return Math.min(digitado, 12);
  const m = presc.match(/^\s*(\d+)\s*(?:-\s*(\d+))?/);
  const n = m ? Number(m[2] ?? m[1]) : 1;
  return Math.min(Math.max(n, 1), 12);
}

/** Conclusão de cada série individual da linha (registros antigos: done vale para todas). */
export function feitosDaLinha(r: RegistroSerie | undefined, n: number): boolean[] {
  const base = r?.feitos ?? (r?.done ? Array<boolean>(n).fill(true) : []);
  return Array.from({ length: n }, (_, i) => !!base[i]);
}

/** Séries individuais feitas/total de um exercício numa sessão. */
export function contarSeriesExercicio(te: TreinoExercicio, sessao: Sessao): { feitas: number; total: number } {
  let total = 0;
  let feitas = 0;
  te.series.forEach((s, si) => {
    const r = sessao.registros[`${te.id}:${si}`];
    const n = seriesDaLinha(s.presc, r?.sets ?? "");
    total += n;
    feitas += feitosDaLinha(r, n).filter(Boolean).length;
  });
  return { feitas, total };
}

/** Séries individuais feitas/total de um treino numa sessão. */
export function contarSeries(treino: Treino, sessao: Sessao): { feitas: number; total: number } {
  let total = 0;
  let feitas = 0;
  for (const te of treino.exercicios) {
    const c = contarSeriesExercicio(te, sessao);
    total += c.total;
    feitas += c.feitas;
  }
  return { feitas, total };
}

/** Duração da sessão em minutos (null se não iniciada/encerrada). */
export function duracaoMin(sessao: Sessao): number | null {
  if (!sessao.inicio || !sessao.fim) return null;
  const ms = Date.parse(sessao.fim) - Date.parse(sessao.inicio);
  if (isNaN(ms) || ms <= 0) return null;
  return Math.max(1, Math.round(ms / 60000));
}

export function formatarDuracao(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${String(m).padStart(2, "0")}min` : `${h}h`;
}

export function formatarDelta(delta: number): string {
  const s = delta > 0 ? "+" : "";
  return `${s}${delta.toFixed(delta % 1 ? 1 : 0)}`;
}
