import type { Exercicio, SeriePlano } from "./types";
import { agora } from "./types";
import { idDoExercicio, canonicoPorNome } from "./canonicos";
import { MIDIA_CDN } from "./biblioteca";

/**
 * Catálogo de programas prontos (templates), organizado como a trilha do
 * curso Além da Genética 2.0: Começando → Intermediário → Avançado.
 *
 * Ao adicionar, o programa é instanciado como um programa próprio (treinos com
 * UUIDs novos), reaproveitando os exercícios já existentes pelo nome unificado
 * (src/canonicos.ts) — assim o histórico de um exercício continua o mesmo de
 * um programa para outro — e criando os que faltarem.
 */

const AQ = (presc = "1-2 × 10 a 15", int = "1 min"): SeriePlano => ({ tipo: "aquecimento", presc, int });
const AJ = (presc = "1-2 × 4 a 6", int = "1 a 2 min"): SeriePlano => ({ tipo: "ajuste", presc, int });
const TR = (presc: string, int: string, nota?: string): SeriePlano =>
  nota ? { tipo: "trabalho", presc, int, nota } : { tipo: "trabalho", presc, int };

const RP = "+ 2 rest pause de 10s na última série";
const DS = "+ 1 drop set na última série";
const PARC = "+ 10 reps parciais após a falha em todas as séries";

export interface CatExercicio {
  nome: string;
  grupo: string;
  /** libId da free-exercise-db, só para exercícios novos (sem match nos seeds) */
  libId?: string;
  /** técnicas do exercício inteiro (ex.: "pico2s") */
  tecnicas?: string[];
  series: SeriePlano[];
  aviso?: string;
}

export interface CatTreino {
  nome: string;
  foco: string;
  /** mobilidade/alongamento do dia, como no PDF */
  preparo?: string[];
  exercicios: CatExercicio[];
}

export type Nivel = 1 | 2 | 3;

export const NIVEIS: Record<Nivel, string> = {
  1: "Começando",
  2: "Intermediário",
  3: "Avançado · 5 dias",
};

export interface CatalogoPrograma {
  id: string;
  nome: string;
  /** nomes que este template já teve (para reconhecer programas adicionados antes) */
  nomesAntigos?: string[];
  descricao: string;
  /** para quem é, em uma frase */
  paraQuem: string;
  origem: string;
  nivel: Nivel;
  /** posição dentro do nível (a ordem da trilha) */
  ordem: number;
  /** semanas recomendadas antes de passar para a próxima etapa */
  semanas?: number;
  /** lembrete do objetivo da etapa (vai para o topo da tela Hoje) */
  lembrete?: string;
  /** oferece a opção "estou sedentário" (1 → 2 → 3 séries por semana) */
  opcaoSedentario?: boolean;
  /** dia da semana (0=domingo) -> índice do treino (0-based) ou null (descanso) */
  divisaoSemana: Record<number, number | null>;
  treinos: CatTreino[];
}

export function imagensCat(libId: string): string[] {
  return [`${MIDIA_CDN}${libId}/0.jpg`, `${MIDIA_CDN}${libId}/1.jpg`];
}

const ORIGEM = "Além da Genética 2.0";
const PICO = ["pico2s"];
const MOB_PERNAS = "Mobilidade e alongamento: posteriores de coxa, glúteos, quadríceps e íliopsoas";
const MOB_OMBROS = "Mobilidade de ombros";
const ALONG_PEITO = "Alongamento de peito";

// exercício "limpo" (3 × 10 a 15, sem técnica) das etapas de iniciante
const TRi = (): SeriePlano[] => [TR("3 × 10 a 15", "1 min")];

/** Treinos A/B dos iniciantes (iguais no 2x e no 4x). */
const INICIANTES_AB = (): CatTreino[] => [
  {
    nome: "Treino A",
    foco: "Peito · Costas · Ombro · Braços",
    exercicios: [
      { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: TRi() },
      { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: TRi() },
      { nome: "Pulley frente aberto", grupo: "Costas", libId: "Wide-Grip_Lat_Pulldown", series: TRi() },
      { nome: "Remada baixa triângulo", grupo: "Costas", series: TRi() },
      { nome: "Desenvolvimento com halteres ou máquina", grupo: "Ombro", series: TRi() },
      { nome: "Elevação lateral", grupo: "Ombro", series: TRi() },
      { nome: "Tríceps na corda", grupo: "Tríceps", series: TRi() },
      { nome: "Rosca direta com barra ou cabo", grupo: "Bíceps", series: TRi() },
    ],
  },
  {
    nome: "Treino B",
    foco: "Pernas · Glúteos · Abdômen",
    exercicios: [
      { nome: "Leg 45", grupo: "Quadríceps", series: TRi() },
      { nome: "Cadeira extensora", grupo: "Quadríceps", series: TRi() },
      { nome: "Flexor sentado", grupo: "Posterior", libId: "Seated_Leg_Curl", series: TRi() },
      { nome: "Mesa flexora deitado", grupo: "Posterior", series: TRi() },
      { nome: "Abdutor", grupo: "Glúteos", libId: "Thigh_Abductor", series: TRi() },
      { nome: "Panturrilha em pé (máquina ou smith)", grupo: "Panturrilha", series: TRi() },
      { nome: "Abdominal supra no solo", grupo: "Abdômen", libId: "Crunches", series: TRi() },
    ],
  },
];

export const CATALOGO: CatalogoPrograma[] = [
  // ---------------- 1 · Começando ----------------
  {
    id: "cat_adaptacao",
    nome: "Adaptação muscular",
    descricao: "Primeira etapa: um treino de corpo inteiro, 2 vezes na semana, 3 × 10 a 15.",
    paraQuem: "Quem está começando ou voltando depois de muito tempo parado.",
    origem: ORIGEM,
    nivel: 1,
    ordem: 1,
    semanas: 4,
    lembrete:
      "Etapa de adaptação: o objetivo é coordenação e consciência muscular. Não vá até a falha e não busque ficar dolorido.",
    opcaoSedentario: true,
    divisaoSemana: { 1: 0, 2: null, 3: null, 4: 0, 5: null, 6: null, 0: null },
    treinos: [
      {
        nome: "Corpo inteiro",
        foco: "Peito · Pernas · Costas · Ombro · Braços",
        exercicios: [
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: TRi() },
          { nome: "Leg 45", grupo: "Quadríceps", series: TRi() },
          { nome: "Pulley frente triângulo", grupo: "Costas", series: TRi() },
          { nome: "Mesa flexora deitado", grupo: "Posterior", series: TRi() },
          { nome: "Elevação lateral", grupo: "Ombro", series: TRi() },
          { nome: "Tríceps na corda", grupo: "Tríceps", series: TRi() },
          { nome: "Panturrilha em pé (máquina ou smith)", grupo: "Panturrilha", series: TRi() },
          { nome: "Rosca direta sentado com halteres", grupo: "Bíceps", libId: "Dumbbell_Bicep_Curl", series: TRi() },
        ],
      },
    ],
  },
  {
    id: "cat_2x_iniciantes",
    nome: "Iniciantes 2x · A/B",
    descricao: "Segunda etapa: A superiores e B inferiores, 3 × 10 a 15. Seg + Qui (ou Ter + Sex).",
    paraQuem: "Quem já fez as ~4 semanas de adaptação.",
    origem: ORIGEM,
    nivel: 1,
    ordem: 2,
    semanas: 4,
    divisaoSemana: { 1: 0, 2: null, 3: null, 4: 1, 5: null, 6: null, 0: null },
    treinos: INICIANTES_AB(),
  },
  {
    id: "cat_4x_iniciantes",
    nome: "Iniciantes 4x · A/B",
    nomesAntigos: ["Treino 4x na Semana (Iniciantes)"],
    descricao: "Terceira etapa: os mesmos A/B, agora 4 vezes na semana (Seg A · Ter B · Qui A · Sex B).",
    paraQuem: "Quem completou o A/B 2x e quer aumentar a frequência.",
    origem: ORIGEM,
    nivel: 1,
    ordem: 3,
    divisaoSemana: { 1: 0, 2: 1, 3: null, 4: 0, 5: 1, 6: null, 0: null },
    treinos: INICIANTES_AB(),
  },

  // ---------------- 2 · Intermediário ----------------
  {
    id: "cat_ppl_3x",
    nome: "PPL 3x · puxar, empurrar, pernas",
    descricao: "A puxar (costas, bíceps, abdômen), B empurrar (peito, ombro, tríceps), C pernas. Seg · Qua · Sex.",
    paraQuem: "Intermediário com 3 dias por semana.",
    origem: ORIGEM,
    nivel: 2,
    ordem: 1,
    divisaoSemana: { 1: 0, 2: null, 3: 1, 4: null, 5: 2, 6: null, 0: null },
    treinos: [
      {
        nome: "Treino A",
        foco: "Puxar · Costas · Bíceps · Abdômen",
        exercicios: [
          { nome: "Remada curvada com barra", grupo: "Costas", tecnicas: PICO, series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Remada baixa triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Remada baixa pegada aberta ou máquina", grupo: "Costas", tecnicas: PICO, series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Pulley frente triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ("1-2 × 4 a 6", "1 min"), TR("1 × 10 a 15", "2 min", DS)] },
          { nome: "Meio terra", grupo: "Posterior", series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Rosca Scott (máquina ou cabo)", grupo: "Bíceps", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 min", RP)] },
          { nome: "Abdominal infra na torre", grupo: "Abdômen", tecnicas: PICO, series: [TR("3 × RM", "45 s")] },
        ],
      },
      {
        nome: "Treino B",
        foco: "Empurrar · Peito · Ombro · Tríceps · Panturrilha",
        exercicios: [
          { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [AJ(), TR("1 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Supino declinado com barra ou máquina", grupo: "Peito", series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Voador", grupo: "Peito", tecnicas: PICO, series: [AJ("1-2 × 4 a 6", "1 min"), TR("1 × 10 a 15", "1 min", DS)] },
          { nome: "Elevação frontal (corda ou halteres)", grupo: "Ombro", series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Elevação lateral", grupo: "Ombro", series: [AJ("1-2 × 4 a 6", "1 min"), TR("1 × 8 a 12", "1 min", DS)] },
          { nome: "Tríceps na corda", grupo: "Tríceps", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Panturrilha em pé (máquina ou smith)", grupo: "Panturrilha", tecnicas: PICO, series: [AQ(), AJ(), TR("3 × 8 a 12", "2 a 3 min")] },
        ],
      },
      {
        nome: "Treino C",
        foco: "Pernas · Quadríceps · Posterior · Glúteos",
        exercicios: [
          { nome: "Cadeira extensora", grupo: "Quadríceps", tecnicas: PICO, series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Hack machine", grupo: "Quadríceps", libId: "Hack_Squat", series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Leg 45", grupo: "Quadríceps", series: [AJ(), TR("1 × 6 a 10", "2 a 3 min", PARC)] },
          { nome: "Mesa flexora deitado", grupo: "Posterior", tecnicas: PICO, series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Stiff", grupo: "Posterior", series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Elevação de quadril", grupo: "Glúteos", tecnicas: PICO, series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
        ],
      },
    ],
  },
  {
    id: "cat_abcd",
    nome: "ABCD intermediário",
    nomesAntigos: ["Intermediário 4x na Semana"],
    descricao: "A peito/bíceps, B costas/posterior, C ombro/tríceps, D pernas. Seg · Ter · Qui · Sex.",
    paraQuem: "Intermediário com 4 dias por semana. É a ficha original do app.",
    origem: ORIGEM,
    nivel: 2,
    ordem: 2,
    divisaoSemana: { 1: 0, 2: 1, 3: null, 4: 2, 5: 3, 6: null, 0: null },
    treinos: [
      {
        nome: "Treino A",
        foco: "Peito · Bíceps · Abdômen",
        exercicios: [
          { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [AJ(), TR("1 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Supino declinado com barra ou máquina", grupo: "Peito", series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "2 min")] },
          { nome: "Voador", grupo: "Peito", tecnicas: PICO, series: [AJ("1-2 × 4 a 6", "1 min"), TR("1 × 10 a 15", "1 min", "+ 1 drop set")] },
          { nome: "Rosca direta com barra ou cabo", grupo: "Bíceps", series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Rosca Scott (máquina ou cabo)", grupo: "Bíceps", series: [AJ(), TR("1 × 6 a 10", "2 min", RP)] },
          { nome: "Rosca direta na corda", grupo: "Bíceps", series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "1 min", "+ 1 drop set")] },
          { nome: "Abdominal supra na prancha declinada", grupo: "Abdômen", series: [TR("3 × 15 a 20", "1 min")] },
        ],
      },
      {
        nome: "Treino B",
        foco: "Costas · Posterior · Panturrilha",
        exercicios: [
          { nome: "Remada curvada com barra", grupo: "Costas", tecnicas: PICO, series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Remada baixa triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("1 × 6 a 10", "2 a 3 min", "+ 2 rest pause de 10s")] },
          { nome: "Remada baixa pegada aberta ou máquina", grupo: "Costas", tecnicas: PICO, series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Pulley frente triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("1 × 6 a 10", "2 min", "+ 1 drop set")] },
          { nome: "Meio terra", grupo: "Posterior", series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          {
            nome: "Panturrilha em pé (máquina ou smith)",
            grupo: "Panturrilha",
            aviso: "No material original só constam aquecimento e ajuste — confirme a série de trabalho com seu treinador.",
            series: [AQ("1 × 10 a 15"), AJ()],
          },
        ],
      },
      {
        nome: "Treino C",
        foco: "Ombro · Tríceps · Abdômen",
        exercicios: [
          { nome: "Desenvolvimento com halteres ou máquina", grupo: "Ombro", series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Elevação frontal (corda ou halteres)", grupo: "Ombro", series: [AJ(), TR("1 × 6 a 10", "2 min", "+ 2 rest pause de 10s")] },
          { nome: "Elevação lateral", grupo: "Ombro", series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "1 min")] },
          { nome: "Elevação lateral unilateral no cabo", grupo: "Ombro", series: [AJ("1-2 × 4 a 6", "1 min"), TR("1 × 10 a 15", "1 min", "+ 1 drop set")] },
          { nome: "Tríceps testa na corda", grupo: "Tríceps", series: [AQ(), AJ(), TR("1 × 6 a 10", "2 min")] },
          { nome: "Tríceps na corda", grupo: "Tríceps", series: [AJ(), TR("1 × 6 a 10", "2 min", "+ 2 rest pause de 10s")] },
          { nome: "Tríceps francês", grupo: "Tríceps", series: [AJ("1 × 4 a 6"), TR("1 × 6 a 10", "2 min", "+ 1 drop set")] },
          { nome: "Abdominal infra na torre", grupo: "Abdômen", series: [TR("3 × 15 a 20", "1 min")] },
        ],
      },
      {
        nome: "Treino D",
        foco: "Pernas · Glúteos · Posterior",
        exercicios: [
          { nome: "Panturrilha sentada", grupo: "Panturrilha", series: [AQ("1 × 10 a 15"), AJ(), TR("3 × 6 a 10", "2 a 3 min")] },
          { nome: "Agachamento livre", grupo: "Quadríceps", series: [AQ(), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Leg 45", grupo: "Quadríceps", series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Cadeira extensora", grupo: "Quadríceps", series: [AJ(), TR("1 × 6 a 10", "2 min", "+ drop set")] },
          { nome: "Mesa flexora deitado", grupo: "Posterior", tecnicas: PICO, series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Stiff", grupo: "Posterior", series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
          { nome: "Elevação de quadril", grupo: "Glúteos", tecnicas: PICO, series: [AQ("1 × 10 a 15"), AJ(), TR("1 × 6 a 10", "2 a 3 min")] },
        ],
      },
    ],
  },

  // ---------------- 3 · Avançado (5 dias) ----------------
  {
    id: "cat_abcde_superiores",
    nome: "ABCDE · ênfase em membros superiores",
    descricao: "5 dias: A peito/ombro/tríceps, B costas/bíceps, C pernas, D ombros, E bíceps/costas/abdômen. Folga qui e dom.",
    paraQuem: "Avançado, 5 dias por semana, com prioridade em tronco e braços.",
    origem: ORIGEM,
    nivel: 3,
    ordem: 1,
    divisaoSemana: { 1: 0, 2: 1, 3: 2, 4: null, 5: 3, 6: 4, 0: null },
    treinos: [
      {
        nome: "Treino A",
        foco: "Peito · Ombros · Tríceps",
        preparo: [MOB_OMBROS],
        exercicios: [
          { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Supino declinado com barra ou máquina", grupo: "Peito", series: [AJ("1 × 4 a 6"), TR("2 × 6 a 10", "2 min")] },
          { nome: "Voador", grupo: "Peito", tecnicas: PICO, series: [AJ(), TR("2 × 10 a 15", "1 min", DS)] },
          { nome: "Elevação frontal (corda ou halteres)", grupo: "Ombro", series: [AJ("1 × 4 a 6"), TR("2 × 6 a 10", "2 min")] },
          { nome: "Elevação lateral", grupo: "Ombro", series: [AJ("1-2 × 4 a 6", "1 min"), TR("2 × 8 a 12", "1 min", DS)] },
          { nome: "Tríceps francês", grupo: "Tríceps", series: [AJ("1 × 4 a 6"), TR("3 × 6 a 10", "2 min")] },
        ],
      },
      {
        nome: "Treino B",
        foco: "Costas · Bíceps",
        preparo: [MOB_OMBROS, ALONG_PEITO],
        exercicios: [
          { nome: "Remada curvada com barra", grupo: "Costas", tecnicas: PICO, series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Remada baixa triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Remada baixa pegada aberta ou máquina", grupo: "Costas", tecnicas: PICO, series: [AJ("1 × 4 a 6"), TR("2 × 6 a 10", "2 min")] },
          { nome: "Pulley frente triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("2 × 8 a 12", "2 min", DS)] },
          { nome: "Meio terra", grupo: "Posterior", series: [AQ("1 × 10 a 15"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Hiperextensão no banco romano", grupo: "Lombar", libId: "Hyperextensions_Back_Extensions", series: [TR("3 × 10 a 15", "90 s")] },
          { nome: "Rosca Scott (máquina ou cabo)", grupo: "Bíceps", tecnicas: PICO, series: [AJ("1 × 4 a 6"), TR("3 × 6 a 10", "2 min")] },
        ],
      },
      {
        nome: "Treino C",
        foco: "Membros inferiores",
        preparo: [MOB_PERNAS],
        exercicios: [
          { nome: "Agachamento livre", grupo: "Quadríceps", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Leg 45", grupo: "Quadríceps", series: [AJ("1 × 4 a 6"), TR("2 × 8 a 12", "2 a 3 min", RP)] },
          { nome: "Cadeira extensora", grupo: "Quadríceps", tecnicas: PICO, series: [AJ(), TR("2 × 10 a 15", "1 min")] },
          { nome: "Mesa flexora deitado", grupo: "Posterior", tecnicas: PICO, series: [AQ("1 × 10 a 15"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Stiff", grupo: "Posterior", series: [AQ("1 × 10 a 15"), AJ(), TR("2 × 8 a 10", "2 a 3 min")] },
          { nome: "Elevação de quadril", grupo: "Glúteos", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", DS)] },
          { nome: "Panturrilha em pé (máquina ou smith)", grupo: "Panturrilha", tecnicas: PICO, series: [AQ(), AJ(), TR("3 × 10 a 15", "2 min")] },
        ],
      },
      {
        nome: "Treino D",
        foco: "Ombros · Peito · Tríceps",
        preparo: ["Mobilidade e alongamento de ombros e tríceps"],
        exercicios: [
          { nome: "Desenvolvimento com halteres ou máquina", grupo: "Ombro", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Elevação frontal (corda ou halteres)", grupo: "Ombro", series: [AJ("1-2 × 4 a 6", "1 min"), TR("2 × 10 a 15", "1 min", RP)] },
          { nome: "Elevação lateral", grupo: "Ombro", series: [AJ("1-2 × 4 a 6", "1 min"), TR("2 × 8 a 12", "1 min")] },
          { nome: "Elevação lateral unilateral no cabo", grupo: "Ombro", series: [AJ("1 × 4 a 6", "1 min"), TR("2 × 8 a 12", "1 min", DS)] },
          { nome: "Voador", grupo: "Peito", tecnicas: PICO, series: [AQ(), AJ(), TR("3 × 6 a 10", "2 a 3 min")] },
          { nome: "Tríceps na corda", grupo: "Tríceps", tecnicas: PICO, series: [AJ(), TR("3 × 6 a 10", "2 min")] },
          { nome: "Tríceps testa na corda", grupo: "Tríceps", series: [AJ(), TR("3 × 8 a 12", "2 min", "+ 2 rest pause de 10s (banco a 35°)")] },
        ],
      },
      {
        nome: "Treino E",
        foco: "Bíceps · Costas · Abdômen",
        preparo: [MOB_OMBROS, ALONG_PEITO],
        exercicios: [
          { nome: "Rosca direta com barra ou cabo", grupo: "Bíceps", tecnicas: PICO, series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Rosca Scott (máquina ou cabo)", grupo: "Bíceps", tecnicas: PICO, series: [AJ(), TR("2 × 8 a 12", "2 min", RP)] },
          { nome: "Rosca direta na corda", grupo: "Bíceps", series: [AJ(), TR("2 × 10 a 15", "1 min", DS)] },
          { nome: "Pulley frente aberto", grupo: "Costas", libId: "Wide-Grip_Lat_Pulldown", tecnicas: PICO, series: [AQ(), AJ(), TR("3 × 8 a 12", "2 min")] },
          { nome: "Pulley frente triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("3 × 8 a 12", "2 min", DS)] },
          { nome: "Serrote", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 min")] },
          { nome: "Abdominal infra na torre", grupo: "Abdômen", tecnicas: PICO, series: [TR("3 × RM", "45 s")] },
          { nome: "Abdominal supra na prancha declinada", grupo: "Abdômen", series: [TR("3 × RM", "45 s")] },
        ],
      },
    ],
  },
  {
    id: "cat_5x",
    nome: "ABCDE · ênfase em membros inferiores",
    nomesAntigos: ["Treino 5x na Semana"],
    descricao: "5 dias: A quadríceps, B peito/ombro/tríceps, C costas/bíceps, D posteriores/glúteos, E upper body. Folga qui e dom.",
    paraQuem: "Avançado, 5 dias por semana, com prioridade em pernas e glúteos.",
    origem: ORIGEM,
    nivel: 3,
    ordem: 2,
    divisaoSemana: { 1: 0, 2: 1, 3: 2, 4: null, 5: 3, 6: 4, 0: null },
    treinos: [
      {
        nome: "Treino A",
        foco: "Quadríceps · Posterior · Glúteos",
        preparo: [MOB_PERNAS],
        exercicios: [
          { nome: "Agachamento livre", grupo: "Quadríceps", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Hack machine", grupo: "Quadríceps", libId: "Hack_Squat", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Leg 45", grupo: "Quadríceps", series: [AJ(), TR("2 × 10 a 15", "2 a 3 min", PARC)] },
          { nome: "Cadeira extensora", grupo: "Quadríceps", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 min", "+ 2 drops na última série")] },
          { nome: "Mesa flexora deitado", grupo: "Posterior", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Abdutor", grupo: "Glúteos", libId: "Thigh_Abductor", tecnicas: PICO, series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
        ],
      },
      {
        nome: "Treino B",
        foco: "Peito · Ombros · Tríceps",
        preparo: [MOB_OMBROS],
        exercicios: [
          { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Supino declinado com barra ou máquina", grupo: "Peito", series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("2 × 6 a 10", "2 min")] },
          { nome: "Voador", grupo: "Peito", tecnicas: PICO, series: [AJ(), TR("2 × 10 a 15", "1 min", DS)] },
          { nome: "Elevação frontal (corda ou halteres)", grupo: "Ombro", series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("2 × 6 a 10", "2 min")] },
          { nome: "Elevação lateral", grupo: "Ombro", series: [AJ("1-2 × 4 a 6", "1 min"), TR("2 × 8 a 12", "1 min", DS)] },
          { nome: "Tríceps na corda", grupo: "Tríceps", tecnicas: PICO, series: [AJ(), TR("3 × 6 a 10", "2 a 3 min", RP)] },
        ],
      },
      {
        nome: "Treino C",
        foco: "Costas · Bíceps · Panturrilhas",
        preparo: [MOB_OMBROS, ALONG_PEITO],
        exercicios: [
          { nome: "Remada curvada com barra", grupo: "Costas", tecnicas: PICO, series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Remada baixa triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Remada baixa pegada aberta ou máquina", grupo: "Costas", tecnicas: PICO, series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Pulley frente triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("2 × 8 a 12", "2 min", DS)] },
          { nome: "Meio terra", grupo: "Posterior", series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Hiperextensão no banco romano", grupo: "Lombar", libId: "Hyperextensions_Back_Extensions", series: [TR("3 × 10 a 15", "90 s")] },
          { nome: "Rosca Scott (máquina ou cabo)", grupo: "Bíceps", tecnicas: PICO, series: [AJ("1 × 4 a 6", "1 a 2 min"), TR("3 × 6 a 10", "2 min")] },
          { nome: "Panturrilha em pé (máquina ou smith)", grupo: "Panturrilha", series: [AQ(), AJ(), TR("3 × 8 a 12", "2 a 3 min")] },
        ],
      },
      {
        nome: "Treino D",
        foco: "Posteriores · Glúteos · Quadríceps",
        preparo: [MOB_PERNAS],
        exercicios: [
          { nome: "Mesa flexora deitado", grupo: "Posterior", tecnicas: PICO, series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Flexor sentado", grupo: "Posterior", libId: "Seated_Leg_Curl", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Stiff", grupo: "Posterior", series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Elevação de quadril", grupo: "Glúteos", tecnicas: PICO, series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Abdutor", grupo: "Glúteos", libId: "Thigh_Abductor", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Cadeira extensora", grupo: "Quadríceps", tecnicas: PICO, series: [AQ("1 × 10 a 15", "1 min"), AJ(), TR("2 × 6 a 10", "2 a 3 min", DS)] },
        ],
      },
      {
        nome: "Treino E",
        foco: "Upper body · Panturrilhas",
        exercicios: [
          { nome: "Supino inclinado com halteres ou máquina", grupo: "Peito", series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Supino reto com halteres ou máquina", grupo: "Peito", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Remada baixa pegada aberta ou máquina", grupo: "Costas", tecnicas: PICO, series: [AQ(), AJ(), TR("2 × 6 a 10", "2 a 3 min")] },
          { nome: "Pulley frente triângulo", grupo: "Costas", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Desenvolvimento com halteres ou máquina", grupo: "Ombro", series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Rosca Scott (máquina ou cabo)", grupo: "Bíceps", tecnicas: PICO, series: [AJ(), TR("2 × 6 a 10", "2 a 3 min", RP)] },
          { nome: "Tríceps francês", grupo: "Tríceps", series: [AJ(), TR("2 × 6 a 10", "2 min", "+ 1 drop na última série")] },
          { nome: "Panturrilha em pé (máquina ou smith)", grupo: "Panturrilha", series: [AQ(), AJ(), TR("3 × 8 a 12", "2 a 3 min")] },
        ],
      },
    ],
  },
];

/** Template de um programa (pelo id de catálogo guardado ou pelo nome, para os antigos). */
export function templateDoPrograma(p: { id: string; nome: string; catalogoId?: string }): CatalogoPrograma | undefined {
  if (p.catalogoId) return CATALOGO.find((t) => t.id === p.catalogoId);
  if (p.id === "sd_prog_intermediario") return CATALOGO.find((t) => t.id === "cat_abcd");
  return CATALOGO.find((t) => t.nome === p.nome || t.nomesAntigos?.includes(p.nome));
}

/** Id do exercício de um item do catálogo: o "Serrote" é a remada unilateral da biblioteca. */
export function idDoItemCatalogo(def: CatExercicio): string {
  if (def.nome === "Serrote") return "sd_lib_One-Arm_Dumbbell_Row";
  return idDoExercicio(def.nome);
}

/** Exercício novo (não existente nos seeds) a partir de uma definição do catálogo. */
export function exercicioNovoDoCatalogo(def: CatExercicio): Exercicio {
  const c = canonicoPorNome(def.nome);
  return {
    id: idDoItemCatalogo(def),
    nome: c?.nome ?? def.nome,
    grupo: def.grupo,
    origem: "seed",
    updated_at: agora(),
    ...(def.libId ? { midia: { imagens: imagensCat(def.libId) } } : {}),
  };
}
