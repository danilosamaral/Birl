import type { Sessao } from "./types";

/**
 * Quando o registro das séries fica liberado.
 *
 * Marcar série, digitar carga/reps, mudar a quantidade de séries e mexer em
 * exercícios extras só valem com o treino em andamento — assim a duração do
 * treino sempre corresponde ao que foi registrado. Preparo, avaliação e
 * observações ficam sempre livres.
 *
 * - "liberado": treino em andamento (Iniciar treino) ou registro sem cronômetro
 * - "nao-iniciado": hoje (ou futuro), ainda sem tocar em Iniciar treino
 * - "encerrado": hoje, depois de Encerrar treino (corrige com Retomar)
 * - "passado": dia anterior a hoje; libera com "Registrar sem cronômetro",
 *   que não grava uma duração falsa
 */
export type EstadoRegistro = "liberado" | "nao-iniciado" | "encerrado" | "passado";

export function estadoRegistro(sess: Sessao, hoje: string): EstadoRegistro {
  if (sess.manual) return "liberado";
  if (sess.inicio && !sess.fim) return "liberado";
  if (sess.data < hoje) return "passado";
  if (sess.fim) return "encerrado";
  return "nao-iniciado";
}

/** Faixa de séries que dá para escolher com − e + numa linha. */
export const MIN_SERIES = 1;
export const MAX_SERIES = 12;
