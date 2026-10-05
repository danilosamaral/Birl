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
  /** técnicas do exercício inteiro (ex.: "pico2s"), mostradas como etiquetas */
  tecnicas?: string[];
  series: SeriePlano[];
}

export interface Treino {
  id: string;
  nome: string;
  foco: string;
  ordem: number;
  arquivado?: boolean;
  /** preparo do dia (mobilidade/alongamento), mostrado em Hoje como lista de ticar */
  preparo?: string[];
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
  /**
   * Exercícios feitos no dia fora do plano do treino (ex.: a academia estava
   * cheia e você trocou/acrescentou algo). Cada extra carrega o próprio plano
   * de séries e é registrado com as mesmas chaves de `registros`.
   */
  extras?: TreinoExercicio[];
  /**
   * Ordem em que os exercícios foram de fato feitos no dia: ids de
   * `TreinoExercicio` (do plano ou extras) na sequência em que cada um
   * recebeu o primeiro ajuste ao vivo — mexeu nos números ou marcou uma série,
   * entrou na fila. É a ordem real do dia, que não precisa bater com a do
   * plano: dá pra pular, voltar depois e trocar por um extra.
   */
  ordemExecucao?: string[];
  /** itens do preparo do dia já ticados (0 = aquecimento geral, 1… = os do treino) */
  preparo?: number[];
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
  /** template do catálogo de onde veio (liga o programa à trilha) */
  catalogoId?: string;
  /** lembrete do objetivo da etapa, mostrado no topo de Hoje */
  lembrete?: string;
  /** adaptação para sedentários: 1 série na semana 1, 2 na semana 2, normal depois */
  sedentario?: boolean;
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

/** Volta da chave de registro para o id do exercício (`"abc:2"` -> `"abc"`). */
export function teIdDaChave(chave: string): string {
  const i = chave.lastIndexOf(":");
  return i < 0 ? chave : chave.slice(0, i);
}

/**
 * Id de um exercício extra numa sessão. É derivado do exercício (e não
 * sorteado) para que o mesmo extra feito em dias diferentes compartilhe o
 * histórico: sugestão da última vez, gráficos e PRs.
 */
export function extraId(exercicioId: string) {
  return `extra_${exercicioId}`;
}

/** Plano de séries de um extra quando o exercício não está em nenhum treino. */
export function seriesExtraPadrao(): SeriePlano[] {
  return [
    { tipo: "ajuste", presc: "1 × 4 a 6", int: "1 a 2 min" },
    { tipo: "trabalho", presc: "1 × 6 a 10", int: "2 a 3 min" },
  ];
}

/** Técnicas que valem para o exercício todo (etiquetas). */
export const TECNICAS: Record<string, { rotulo: string; glos: string }> = {
  pico2s: { rotulo: "Pico 2s", glos: "pico" },
};

/** Etiqueta curta para a nota de técnica de uma série ("+ 1 drop set" → "Drop set"). */
export function rotuloDaNota(nota: string): string {
  let n = nota.replace(/^\+\s*/, "").trim();
  if (/rest pause/i.test(n)) n = n.replace(/^(\d+)\s*rest pause de 10\s*s(egundos)?/i, "Rest pause $1×10s");
  else if (/drop/i.test(n)) n = n.replace(/^(\d+)\s*drops?( set)?/i, (_m, q) => (q === "1" ? "Drop set" : `${q} drops`)).replace(/^drop[- ]set/i, "Drop set");
  else if (/parcia/i.test(n)) n = "Parciais +10 após a falha";
  return n.charAt(0).toUpperCase() + n.slice(1);
}

export function agora() {
  return new Date().toISOString();
}

export function novoId() {
  return crypto.randomUUID();
}
