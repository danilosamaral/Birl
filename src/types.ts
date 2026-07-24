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
  /** linha inteira concluída (todas as séries individuais feitas) */
  done: boolean;
  /** conclusão de cada série individual da linha (índice = série) */
  feitos?: boolean[];
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
  /** timestamps de iniciar/encerrar treino (duração da sessão) */
  inicio?: string;
  fim?: string;
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

/** Peso corporal (kg) e circunferências (cm) numa data. */
export interface Medida {
  /** id = a própria data (YYYY-MM-DD): uma medição por dia */
  id: string;
  data: string;
  /** peso em kg e circunferências em cm; chaves de CAMPOS_MEDIDA */
  valores: Record<string, number>;
  obs?: string;
  updated_at: string;
  deleted?: boolean;
}

/** Campos de medida, na ordem de exibição. peso em kg, o resto em cm. */
export const CAMPOS_MEDIDA: Array<{ chave: string; rotulo: string; unidade: string }> = [
  { chave: "peso", rotulo: "Peso", unidade: "kg" },
  { chave: "gordura", rotulo: "% Gordura", unidade: "%" },
  { chave: "pescoco", rotulo: "Pescoço", unidade: "cm" },
  { chave: "ombro", rotulo: "Ombros", unidade: "cm" },
  { chave: "peito", rotulo: "Peito", unidade: "cm" },
  { chave: "cintura", rotulo: "Cintura", unidade: "cm" },
  { chave: "quadril", rotulo: "Quadril", unidade: "cm" },
  { chave: "braco_d", rotulo: "Braço dir.", unidade: "cm" },
  { chave: "braco_e", rotulo: "Braço esq.", unidade: "cm" },
  { chave: "antebraco_d", rotulo: "Antebraço dir.", unidade: "cm" },
  { chave: "antebraco_e", rotulo: "Antebraço esq.", unidade: "cm" },
  { chave: "coxa_d", rotulo: "Coxa dir.", unidade: "cm" },
  { chave: "coxa_e", rotulo: "Coxa esq.", unidade: "cm" },
  { chave: "panturrilha_d", rotulo: "Panturrilha dir.", unidade: "cm" },
  { chave: "panturrilha_e", rotulo: "Panturrilha esq.", unidade: "cm" },
];

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
