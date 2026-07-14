import type { Exercicio, SeriePlano } from "./types";
import { agora } from "./types";
import { seedExercicioId } from "./seeds";
import { MIDIA_CDN } from "./biblioteca";

/**
 * Catálogo de programas prontos (templates). O usuário adiciona um quando
 * quiser variar; ao adicionar, ele é instanciado como um programa próprio
 * (treinos com UUIDs novos), reaproveitando os exercícios já existentes
 * pelo nome (para unificar o histórico) e criando os que faltarem.
 */

const AQ = (presc = "1-2 × 10 a 15", int = "1 min"): SeriePlano => ({ tipo: "aquecimento", presc, int });
const AJ = (presc = "1-2 × 4 a 6", int = "1 a 2 min"): SeriePlano => ({ tipo: "ajuste", presc, int });
const TR = (presc: string, int: string, nota?: string): SeriePlano =>
  nota ? { tipo: "trabalho", presc, int, nota } : { tipo: "trabalho", presc, int };

export interface CatExercicio {
  nome: string;
  grupo: string;
  /** libId da free-exercise-db, só para exercícios novos (sem match nos seeds) */
  libId?: string;
  series: SeriePlano[];
  aviso?: string;
}

export interface CatTreino {
  nome: string;
  foco: string;
  exercicios: CatExercicio[];
}

export interface CatalogoPrograma {
  id: string;
  nome: string;
  descricao: string;
  origem: string;
  /** dia da semana (0=domingo) -> índice do treino (0-based) ou null (descanso) */
  divisaoSemana: Record<number, number | null>;
  treinos: CatTreino[];
}

export function imagensCat(libId: string): string[] {
  return [`${MIDIA_CDN}${libId}/0.jpg`, `${MIDIA_CDN}${libId}/1.jpg`];
}

export const CATALOGO: CatalogoPrograma[] = [
  {
    id: "cat_5x",
    nome: "Treino 5x na Semana",
    descricao: "Além da Genética 2.0 — divisão A/B/C/D/E, 5 dias de treino.",
    origem: "Além da Genética 2.0",
    divisaoSemana: { 1: 0, 2: 1, 3: 2, 4: null, 5: 3, 6: 4, 0: null },
    treinos: [
      {
        nome: "Treino A",
        foco: "Quadríceps · Posterior · Glúteos",
        exercicios: [
          { nome: "Agachamento livre", grupo: "Quadríceps", series: [AQ(), AJ(), TR("2 × 6 a 10", "—")] },
          { nome: "Hack machine", grupo: "Quadríceps", libId: "Hack_Squat", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Leg 45", grupo: "Quadríceps", series: [AJ(), TR("2 × 10 a 15", "2 a 3 min", "+ 10 reps parciais após a falha em todas as séries")] },
          { nome: "Cadeira extensora", grupo: "Quadríceps", series: [AJ(), TR("2 × 6 a 10", "2 min", "+ 2 drops na última série")] },
          { nome: "Mesa flexora deitado (2s de pico de contração)", grupo: "Posterior", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Abdutor (2s de pico de contração)", grupo: "Glúteos", libId: "Thigh_Abductor", series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
        ],
      },
      {
        nome: "Treino B",
        foco: "Peito · Ombros · Tríceps",
        exercicios: [
          { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Supino declinado barra ou máquina", grupo: "Peito", series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("2 × 6 a 10", "2 min")] },
          { nome: "Voador com 2s de pico de contração", grupo: "Peito", series: [AJ(), TR("2 × 10 a 15", "1 min", "+ 1 drop set na última série")] },
          { nome: "Elevação frontal na corda ou halteres", grupo: "Ombro", series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("2 × 6 a 10", "2 min")] },
          { nome: "Elevação lateral", grupo: "Ombro", series: [AJ("1-2 × 4 a 6", "1 min"), TR("2 × 8 a 12", "1 min", "+ 1 drop set na última série")] },
          { nome: "Tríceps na corda", grupo: "Tríceps", series: [AJ(), TR("3 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
        ],
      },
      {
        nome: "Treino C",
        foco: "Costas · Bíceps · Panturrilhas",
        exercicios: [
          { nome: "Remada curvada com barra (2s de pico de contração)", grupo: "Costas", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Remada baixa triângulo (2s de pico de contração)", grupo: "Costas", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Remada baixa pegada aberta ou máquina pegada aberta (2s de pico)", grupo: "Costas", series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Pulley frente triângulo (2s de pico de contração)", grupo: "Costas", series: [AJ(), TR("2 × 8 a 12", "2 min", "+ 1 drop set na última série")] },
          { nome: "Meio Terra", grupo: "Posterior", series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Hiper extensão no banco romano", grupo: "Lombar", libId: "Hyperextensions_Back_Extensions", series: [TR("3 × 10 a 15", "90 s")] },
          { nome: "Rosca Scott na máquina", grupo: "Bíceps", series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("3 × 6 a 10", "2 min")] },
          { nome: "Panturrilha na máquina ou em pé no smith", grupo: "Panturrilha", series: [AQ(), AJ(), TR("3 × 8 a 12", "2 a 3 min")] },
        ],
      },
      {
        nome: "Treino D",
        foco: "Posteriores · Glúteos · Quadríceps",
        exercicios: [
          { nome: "Mesa flexora deitado (2s de pico de contração)", grupo: "Posterior", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Flexor sentado (2s de pico de contração)", grupo: "Posterior", libId: "Seated_Leg_Curl", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Stiff", grupo: "Posterior", series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Elevação de quadril (2s de pico de contração)", grupo: "Glúteos", series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Abdutor (2s de pico de contração)", grupo: "Glúteos", libId: "Thigh_Abductor", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Cadeira extensora", grupo: "Quadríceps", series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 1 drop set na última série")] },
        ],
      },
      {
        nome: "Treino E",
        foco: "Upper body · Panturrilhas",
        exercicios: [
          { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Remada baixa pegada aberta ou máquina pegada aberta (2s de pico)", grupo: "Costas", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Pulley frente triângulo (2s de pico de contração)", grupo: "Costas", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Desenvolvimento halteres ou máquina", grupo: "Ombro", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Rosca Scott na máquina", grupo: "Bíceps", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s na última série")] },
          { nome: "Tríceps francês", grupo: "Tríceps", series: [AJ(), TR("2 × 6 a 10", "2 min", "+ 1 drop na última série")] },
          { nome: "Panturrilha na máquina ou em pé no smith", grupo: "Panturrilha", series: [AQ(), AJ(), TR("3 × 8 a 12", "2 a 3 min")] },
        ],
      },
    ],
  },
];

/** Exercício novo (não existente nos seeds) a partir de uma definição do catálogo. */
export function exercicioNovoDoCatalogo(def: CatExercicio): Exercicio {
  return {
    id: seedExercicioId(def.nome),
    nome: def.nome,
    grupo: def.grupo,
    origem: "seed",
    updated_at: agora(),
    ...(def.libId ? { midia: { imagens: imagensCat(def.libId) } } : {}),
  };
}
