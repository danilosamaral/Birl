import type { Programa, RegistroSerie, Sessao, TreinoExercicio } from "./types";
import type { PontoCarga } from "./utils";

/* ============================================================
   Fase 3 — volume, e1RM, PRs, frequência e timer
   ============================================================ */

function num(v: string): number {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? 0 : n;
}

/** Volume de uma linha registrada: séries × reps × kg (séries vazio conta 1). */
export function volumeDoRegistro(r: RegistroSerie): number {
  const kg = num(r.kg);
  const reps = num(r.reps);
  if (kg <= 0 || reps <= 0) return 0;
  const sets = num(r.sets) || 1;
  return sets * reps * kg;
}

/** 1RM estimado (fórmula de Epley). Confiável até ~12 reps. */
export function epley(kg: number, reps: number): number {
  if (kg <= 0 || reps <= 0) return 0;
  if (reps === 1) return kg;
  return kg * (1 + reps / 30);
}

/** Volume por sessão de um exercício do treino. */
export function pontosVolume(sessoes: Sessao[], te: TreinoExercicio): PontoCarga[] {
  const pts: PontoCarga[] = [];
  const prefixo = `${te.id}:`;
  for (const s of sessoes) {
    let vol = 0;
    for (const [chave, r] of Object.entries(s.registros)) {
      if (chave.startsWith(prefixo)) vol += volumeDoRegistro(r);
    }
    if (vol > 0) pts.push({ date: s.data, v: Math.round(vol) });
  }
  return pts;
}

/** Melhor e1RM por sessão de um exercício do treino. */
export function pontosE1RM(sessoes: Sessao[], te: TreinoExercicio): PontoCarga[] {
  const pts: PontoCarga[] = [];
  const prefixo = `${te.id}:`;
  for (const s of sessoes) {
    let melhor = 0;
    for (const [chave, r] of Object.entries(s.registros)) {
      if (!chave.startsWith(prefixo)) continue;
      melhor = Math.max(melhor, epley(num(r.kg), num(r.reps)));
    }
    if (melhor > 0) pts.push({ date: s.data, v: Math.round(melhor * 10) / 10 });
  }
  return pts;
}

export interface PRs {
  kg: { v: number; date: string } | null;
  e1rm: { v: number; date: string } | null;
  reps: { v: number; date: string } | null;
}

/** Recordes pessoais de um exercício do treino: maior carga, melhor e1RM, mais reps. */
export function prsDoExercicio(sessoes: Sessao[], te: TreinoExercicio): PRs {
  const prefixo = `${te.id}:`;
  const prs: PRs = { kg: null, e1rm: null, reps: null };
  for (const s of sessoes) {
    for (const [chave, r] of Object.entries(s.registros)) {
      if (!chave.startsWith(prefixo)) continue;
      const kg = num(r.kg);
      const reps = num(r.reps);
      if (kg > 0 && (!prs.kg || kg > prs.kg.v)) prs.kg = { v: kg, date: s.data };
      if (reps > 0 && (!prs.reps || reps > prs.reps.v)) prs.reps = { v: reps, date: s.data };
      const e = epley(kg, reps);
      if (e > 0 && (!prs.e1rm || e > prs.e1rm.v)) prs.e1rm = { v: Math.round(e * 10) / 10, date: s.data };
    }
  }
  return prs;
}

/* ---------- frequência / calendário ---------- */

function dataLocal(d: Date): string {
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Segunda-feira da semana da data. */
export function inicioDaSemana(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const dt = new Date(a, m - 1, d);
  const dow = (dt.getDay() + 6) % 7; // 0 = segunda
  dt.setDate(dt.getDate() - dow);
  return dataLocal(dt);
}

export interface CelulaHeatmap {
  date: string;
  count: number;
  futuro: boolean;
}

/** Grade de calendário (colunas = semanas, linhas = seg..dom), semanas mais recentes à direita. */
export function gradeHeatmap(sessoes: Sessao[], hoje: string, semanas = 16): CelulaHeatmap[][] {
  const porDia = new Map<string, number>();
  for (const s of sessoes) porDia.set(s.data, (porDia.get(s.data) ?? 0) + 1);
  const colunas: CelulaHeatmap[][] = [];
  const inicioAtual = inicioDaSemana(hoje);
  const [a, m, d] = inicioAtual.split("-").map(Number);
  for (let w = semanas - 1; w >= 0; w--) {
    const col: CelulaHeatmap[] = [];
    for (let dia = 0; dia < 7; dia++) {
      const dt = new Date(a, m - 1, d - w * 7 + dia);
      const iso = dataLocal(dt);
      col.push({ date: iso, count: porDia.get(iso) ?? 0, futuro: iso > hoje });
    }
    colunas.push(col);
  }
  return colunas;
}

/** Semanas consecutivas (terminando nesta ou na anterior) com pelo menos 1 sessão. */
export function streakSemanas(sessoes: Sessao[], hoje: string): number {
  const semanas = new Set(sessoes.map((s) => inicioDaSemana(s.data)));
  let cursor = inicioDaSemana(hoje);
  const volta = (iso: string) => {
    const [a, m, d] = iso.split("-").map(Number);
    return dataLocal(new Date(a, m - 1, d - 7));
  };
  let streak = 0;
  if (!semanas.has(cursor)) cursor = volta(cursor); // semana atual ainda sem treino não quebra a sequência
  while (semanas.has(cursor)) {
    streak++;
    cursor = volta(cursor);
  }
  return streak;
}

export interface Aderencia {
  feitas: number;
  previstas: number;
  pct: number;
}

/** Sessões dos últimos 28 dias vs. o previsto na divisão do programa ativo. */
export function aderencia(programa: Programa, sessoes: Sessao[], hoje: string): Aderencia | null {
  const porSemana = Object.values(programa.divisaoSemana).filter(Boolean).length;
  if (porSemana === 0) return null;
  const [a, m, d] = hoje.split("-").map(Number);
  const inicio = dataLocal(new Date(a, m - 1, d - 27));
  const feitas = sessoes.filter((s) => s.data >= inicio && s.data <= hoje).length;
  const previstas = porSemana * 4;
  return { feitas, previstas, pct: Math.min(100, Math.round((feitas / previstas) * 100)) };
}

/** Volume total por semana (todas as sessões), últimas N semanas com dados. */
export function volumeSemanal(sessoes: Sessao[], semanas = 8): PontoCarga[] {
  const porSemana = new Map<string, number>();
  for (const s of sessoes) {
    let vol = 0;
    for (const r of Object.values(s.registros)) vol += volumeDoRegistro(r);
    if (vol <= 0) continue;
    const semana = inicioDaSemana(s.data);
    porSemana.set(semana, (porSemana.get(semana) ?? 0) + vol);
  }
  return [...porSemana.entries()]
    .sort((x, y) => (x[0] < y[0] ? -1 : 1))
    .slice(-semanas)
    .map(([date, v]) => ({ date, v: Math.round(v) }));
}

/* ---------- timer de descanso ---------- */

/** Converte o intervalo prescrito em segundos ("1 min" → 60; "1 a 2 min" → 90; "—" → 0). */
export function parseIntervalo(int: string): number {
  const nums = (int.match(/\d+(?:[.,]\d+)?/g) ?? []).map((n) => parseFloat(n.replace(",", ".")));
  if (nums.length === 0) return 0;
  const media = nums.reduce((a, b) => a + b, 0) / nums.length;
  const emSegundos = /\bs(eg)?\b/i.test(int) && !/min/i.test(int);
  return Math.round(emSegundos ? media : media * 60);
}
