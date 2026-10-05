import { CATALOGO, templateDoPrograma, type CatalogoPrograma } from "./catalogo";
import type { Programa, Sessao } from "./types";
import { semanaDoPrograma } from "./utils";

/**
 * A trilha do curso: Começando → Intermediário → Avançado. Aqui ficam as
 * regras de "em que etapa você está" e "quando sugerir a próxima".
 */

/** Programas do catálogo na ordem da trilha. */
export function trilhaOrdenada(): CatalogoPrograma[] {
  return [...CATALOGO].sort((a, b) => a.nivel - b.nivel || a.ordem - b.ordem);
}

export function proximoDaTrilha(tpl: CatalogoPrograma): CatalogoPrograma | null {
  const t = trilhaOrdenada();
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
 * Aviso de próxima etapa (só nas etapas com duração recomendada, as de
 * iniciante): depois das semanas indicadas, com pelo menos 3/4 dos treinos
 * previstos feitos, sugere o próximo programa da trilha — se você ainda não
 * o tiver adicionado.
 */
export function proximaEtapa(
  programa: Programa,
  programas: Record<string, Programa>,
  sessoes: Record<string, Sessao>,
  data: string
): { texto: string; proxima: CatalogoPrograma } | null {
  const tpl = templateDoPrograma(programa);
  if (!tpl?.semanas) return null;
  const proxima = proximoDaTrilha(tpl);
  if (!proxima) return null;
  const semana = semanaDoPrograma(programa, sessoes, data);
  if (semana <= tpl.semanas) return null;
  const porSemana = Object.values(tpl.divisaoSemana).filter((x) => x != null).length;
  const feitos = treinosFeitos(programa, sessoes).length;
  if (feitos < Math.ceil(porSemana * tpl.semanas * 0.75)) return null;
  const jaTem = Object.values(programas).some((p) => !p.deleted && templateDoPrograma(p)?.id === proxima.id);
  if (jaTem) return null;
  return { texto: `Você completou ${tpl.semanas} semanas de ${tpl.nome} (${feitos} treinos).`, proxima };
}
