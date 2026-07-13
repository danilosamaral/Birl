export type TipoSerie = "aquecimento" | "ajuste" | "trabalho";

export interface SeriePlano {
  tipo: TipoSerie;
  /** prescrição, ex.: "1-2 × 10 a 15" */
  presc: string;
  /** intervalo, ex.: "1 min" */
  int: string;
  nota?: string;
}

export interface Midia {
  imagens?: string[];
  video?: string;
}

export interface Exercicio {
  id: string;
  nome: string;
  grupo: string;
  equipamento?: string;
  instrucoes?: string;
  midia?: Midia;
  origem: "seed" | "proprio";
  arquivado?: boolean;
  updated_at: string;
  deleted?: boolean;
}

export interface TreinoExercicio {
  id: string;
  exercicioId: string;
  aviso?: string;
  series: SeriePlano[];
}

export interface Treino {
  id: string;
  nome: string;
  foco: string;
  ordem: number;
  arquivado?: boolean;
  exercicios: TreinoExercicio[];
  updated_at: string;
  deleted?: boolean;
}

export interface RegistroSerie {
  sets: string;
  kg: string;
  reps: string;
  rir: string;
  done: boolean;
}

export interface Aval {
  motivacao?: number;
  energia?: number;
  sono?: number;
}

export interface Sessao {
  /** id = `${data}|${treinoId}` */
  id: string;
  data: string;
  treinoId: string;
  /** chave: `${treinoExercicioId}:${serieIdx}` */
  registros: Record<string, RegistroSerie>;
  obs: string;
  aval: Aval;
  updated_at: string;
  deleted?: boolean;
}

export interface Programa {
  id: string;
  nome: string;
  descricao?: string;
  /** treinos que compõem o programa, em ordem */
  treinoIds: string[];
  /** dia da semana (0=domingo) -> treinoId ou null (descanso) */
  divisaoSemana: Record<number, string | null>;
  arquivado?: boolean;
  updated_at: string;
  deleted?: boolean;
}

export interface Prefs {
  id: "prefs";
  /** legado (pré-programas): divisão global, migrada para o programa inicial */
  divisaoSemana: Record<number, string | null>;
  programaAtivoId?: string | null;
  /** timer de descanso automático ao marcar série feita (padrão: ligado) */
  timerDescanso?: boolean;
  updated_at: string;
  deleted?: boolean;
}

export const ROTULO_TIPO: Record<TipoSerie, string> = {
  aquecimento: "Aquecimento",
  ajuste: "Ajuste",
  trabalho: "Trabalho",
};

export const ATRIBUTOS: Array<[keyof Aval, string]> = [
  ["motivacao", "Motivação"],
  ["energia", "Energia"],
  ["sono", "Sono"],
];

export function sessaoId(data: string, treinoId: string) {
  return `${data}|${treinoId}`;
}

export function regKey(treinoExercicioId: string, serieIdx: number) {
  return `${treinoExercicioId}:${serieIdx}`;
}

export function agora() {
  return new Date().toISOString();
}

export function novoId() {
  return crypto.randomUUID();
}
