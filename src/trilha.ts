import { CATALOGO, TRILHAS_EXTRAS, templateDoPrograma, type CatalogoPrograma } from "./catalogo";
import type { Programa, Sessao } from "./types";
import { semanaDoPrograma } from "./utils";

/**
 * A trilha do curso: Começando → Intermediário → Avançado. Aqui ficam as
 * regras de "em que etapa você está" e "quando sugerir a próxima".
 */

/**
 * Programas de uma trilha, em ordem. Sem `trilha`: a do curso. Programas de
 * outra trilha (ex.: Rugby) nunca entram na fila do curso, e vice-versa.
 */
export function trilhaOrdenada(trilha?: string): CatalogoPrograma[] {
  return CATALOGO.filter((t) => t.trilha === trilha).sort((a, b) => a.nivel - b.nivel || a.ordem - b.ordem);
}

export function proximoDaTrilha(tpl: CatalogoPrograma): CatalogoPrograma | null {
  const t = trilhaOrdenada(tpl.trilha);
  const i = t.findIndex((x) => x.id === tpl.id);
  return i >= 0 && i < t.length - 1 ? t[i + 1] : null;
}

/** Sessões feitas (com algo registrado) nos treinos de um programa. */
export function treinosFeitos(programa: Programa, sessoes: Record<string, Sessao>): Sessao[] {
  const ids = new Set(programa.treinoIds);
  return Object.values(sessoes).filter(
    (s) => !s.deleted && ids.has(s.treinoId) && (!!s.inicio || Object.values(s.registros).some((r) => r.done || r.feitos?.some(Boolean)))
  );
}

/**
 * Aviso de próxima etapa (só nas etapas com duração recomendada): depois das
 * semanas indicadas, com pelo menos 3/4 dos treinos previstos feitos, sugere o
 * próximo programa da trilha — se você ainda não o tiver adicionado. No fim de
 * uma trilha extra cuja próxima fase ainda não existe (Rugby), avisa que é
 * hora da reavaliação.
 */
export function proximaEtapa(
  programa: Programa,
  programas: Record<string, Programa>,
  sessoes: Record<string, Sessao>,
  data: string
): { texto: string; proxima: CatalogoPrograma | null; reavaliar?: string } | null {
  const tpl = templateDoPrograma(programa);
  if (!tpl?.semanas) return null;
  const proxima = proximoDaTrilha(tpl);
  // fim de uma trilha extra cuja próxima fase ainda não existe: hora da reavaliação
  const futura = proxima ? undefined : TRILHAS_EXTRAS.find((x) => x.id === tpl.trilha)?.fasesFuturas[0];
  if (!proxima && !futura) return null;
  const semana = semanaDoPrograma(programa, sessoes, data);
  if (semana <= tpl.semanas) return null;
  const porSemana = Object.values(tpl.divisaoSemana).filter((x) => x != null).length;
  const feitos = treinosFeitos(programa, sessoes).length;
  if (feitos < Math.ceil(porSemana * tpl.semanas * 0.75)) return null;
  const texto = `Você completou ${tpl.semanas} semanas de ${tpl.nome} (${feitos} treinos).`;
  if (!proxima) return { texto, proxima: null, reavaliar: futura!.nome };
  const jaTem = Object.values(programas).some((p) => !p.deleted && templateDoPrograma(p)?.id === proxima.id);
  if (jaTem) return null;
  return { texto, proxima };
}
