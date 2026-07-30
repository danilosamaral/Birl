import type { Exercicio, Treino, SeriePlano } from "./types";

/**
 * Treinos padrão (a antiga ficha A/B/C/D hardcoded), agora como dados
 * editáveis. Os IDs são determinísticos ("sd_*") para que a migração do
 * histórico antigo (indexado por posição, ex. "A-0-2") sempre aponte para
 * o mesmo registro, em qualquer aparelho.
 */

const SEED_EPOCH = "2026-01-01T00:00:00.000Z";

export function slug(nome: string) {
  return nome
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

export function seedExercicioId(nome: string) {
  return `sd_ex_${slug(nome)}`;
}

type SeedEx = { nome: string; grupo: string; aviso?: string; series: SeriePlano[] };

const S = (tipo: SeriePlano["tipo"], presc: string, int: string, nota?: string): SeriePlano =>
  nota ? { tipo, presc, int, nota } : { tipo, presc, int };

export const SEED_TREINOS: Array<{ letra: string; foco: string; exercicios: SeedEx[] }> = [
  {
    letra: "A",
    foco: "Peito · Bíceps · Abdômen",
    exercicios: [
      { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [S("aquecimento", "1-2 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 2 rest pause de 10s na última série")] },
      { nome: "Supino declinado barra ou máquina", grupo: "Peito", series: [S("ajuste", "1 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Voador com 2s de pico de contração", grupo: "Peito", series: [S("ajuste", "1-2 × 4 a 6", "1 min"), S("trabalho", "1 × 10 a 15", "—", "+ 1 drop set")] },
      { nome: "Rosca direta barra livre ou cabo com barra", grupo: "Bíceps", series: [S("aquecimento", "1-2 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Rosca Scott na máquina", grupo: "Bíceps", series: [S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 2 rest pause de 10s na última série")] },
      { nome: "Rosca direta na corda", grupo: "Bíceps", series: [S("ajuste", "1 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 1 drop set")] },
      { nome: "Abdominal supra na prancha declinada", grupo: "Abdômen", series: [S("trabalho", "3 × 15 a 20", "1 min")] },
    ],
  },
  {
    letra: "B",
    foco: "Costas · Posterior · Panturrilha",
    exercicios: [
      { nome: "Remada curvada com barra (2s de pico de contração)", grupo: "Costas", series: [S("aquecimento", "1-2 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Remada baixa triângulo (2s de pico de contração)", grupo: "Costas", series: [S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 2 rest pause de 10s")] },
      { nome: "Remada baixa pegada aberta ou máquina pegada aberta (2s de pico)", grupo: "Costas", series: [S("ajuste", "1 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Pulley frente triângulo (2s de pico de contração)", grupo: "Costas", series: [S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 1 drop set")] },
      { nome: "Meio Terra", grupo: "Posterior", series: [S("aquecimento", "1 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Panturrilha na máquina ou em pé no smith", grupo: "Panturrilha", aviso: "No material original só constam aquecimento e ajuste — confirme a série de trabalho com seu treinador.", series: [S("aquecimento", "1 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min")] },
    ],
  },
  {
    letra: "C",
    foco: "Ombro · Tríceps · Abdômen",
    exercicios: [
      { nome: "Desenvolvimento halteres ou máquina", grupo: "Ombro", series: [S("aquecimento", "1-2 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Elevação frontal na corda ou halteres", grupo: "Ombro", series: [S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 2 rest pause de 10s")] },
      { nome: "Elevação lateral", grupo: "Ombro", series: [S("ajuste", "1 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Elevação lateral unilateral no cabo", grupo: "Ombro", series: [S("ajuste", "1-2 × 4 a 6", "1 min"), S("trabalho", "1 × 10 a 15", "—", "+ 1 drop set")] },
      { nome: "Tríceps testa na corda", grupo: "Tríceps", series: [S("aquecimento", "1-2 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Tríceps na corda", grupo: "Tríceps", series: [S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 2 rest pause de 10s")] },
      { nome: "Tríceps francês", grupo: "Tríceps", series: [S("ajuste", "1 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 1 drop set")] },
      { nome: "Abdominal infra na torre", grupo: "Abdômen", series: [S("trabalho", "3 × 15 a 20", "1 min")] },
    ],
  },
  {
    letra: "D",
    foco: "Pernas · Glúteos · Posterior",
    exercicios: [
      { nome: "Panturrilha sentada", grupo: "Panturrilha", series: [S("aquecimento", "1 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "3 × 6 a 10", "—")] },
      { nome: "Agachamento livre", grupo: "Quadríceps", series: [S("aquecimento", "1-2 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Leg 45", grupo: "Quadríceps", series: [S("aquecimento", "1 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 2 rest pause de 10s na última série")] },
      { nome: "Cadeira extensora", grupo: "Quadríceps", series: [S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ drop-set")] },
      { nome: "Mesa flexora deitado (2s de pico de contração)", grupo: "Posterior", series: [S("aquecimento", "1 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—", "+ 2 rest pause de 10s na última")] },
      { nome: "Stiff", grupo: "Posterior", series: [S("aquecimento", "1 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
      { nome: "Elevação de quadril (2s de pico de contração)", grupo: "Glúteos", series: [S("aquecimento", "1 × 10 a 15", "1 min"), S("ajuste", "1-2 × 4 a 6", "1 a 2 min"), S("trabalho", "1 × 6 a 10", "—")] },
    ],
  },
];

export function seedTreinoId(letra: string) {
  return `sd_${letra}`;
}

export function seedTreinoExercicioId(letra: string, index: number) {
  return `sd_${letra}_e${index}`;
}

export function gerarSeeds(): { treinos: Treino[]; exercicios: Exercicio[] } {
  const exMap = new Map<string, Exercicio>();
  const treinos: Treino[] = SEED_TREINOS.map((t, ti) => ({
    id: seedTreinoId(t.letra),
    nome: `Treino ${t.letra}`,
    foco: t.foco,
    ordem: ti,
    exercicios: t.exercicios.map((ex, ei) => {
      const exId = seedExercicioId(ex.nome);
      if (!exMap.has(exId)) {
        exMap.set(exId, {
          id: exId,
          nome: ex.nome,
          grupo: ex.grupo,
          origem: "seed",
          updated_at: SEED_EPOCH,
        });
      }
      return {
        id: seedTreinoExercicioId(t.letra, ei),
        exercicioId: exId,
        ...(ex.aviso ? { aviso: ex.aviso } : {}),
        series: ex.series,
      };
    }),
    updated_at: SEED_EPOCH,
  }));
  return { treinos, exercicios: [...exMap.values()] };
}

export const GRUPOS_MUSCULARES = [
  "Peito", "Costas", "Ombro", "Bíceps", "Tríceps", "Punho / Antebraço",
  "Quadríceps", "Posterior", "Glúteos", "Panturrilha", "Abdômen",
  "Lombar", "Trapézio", "Cardio", "Outro",
];
