import { db, getMeta, setMeta } from "./db";
import { supa, usuarioAtual, enfileirar } from "./sync";
import { seedTreinoId, seedTreinoExercicioId } from "./seeds";
import type { Sessao, RegistroSerie, Aval } from "./types";
import { regKey, sessaoId } from "./types";

/**
 * Migra o histórico do formato antigo (chaves posicionais tipo "A-0-2",
 * em localStorage "adg_registros_v1" e na tabela Supabase "adg_registros")
 * para as sessões novas com IDs estáveis. Os dados antigos ficam intactos
 * como backup. Idempotente: só grava se não houver versão mais nova.
 */

interface SessaoAntiga {
  series?: Record<string, Partial<RegistroSerie>>;
  obs?: string;
  aval?: Aval;
  _updated?: string;
}

const EPOCH_MIGRACAO = "2020-01-01T00:00:00.000Z";

function converter(data: string, letra: string, antiga: SessaoAntiga, updatedAt?: string): Sessao | null {
  if (!/^[A-D]$/.test(letra)) return null;
  const treinoId = seedTreinoId(letra);
  const registros: Record<string, RegistroSerie> = {};
  for (const [chave, v] of Object.entries(antiga.series ?? {})) {
    const m = chave.match(/^([A-D])-(\d+)-(\d+)$/);
    if (!m) continue;
    registros[regKey(seedTreinoExercicioId(m[1], Number(m[2])), Number(m[3]))] = {
      sets: v.sets ?? "",
      kg: v.kg ?? "",
      reps: v.reps ?? "",
      rir: v.rir ?? "",
      done: !!v.done,
    };
  }
  return {
    id: sessaoId(data, treinoId),
    data,
    treinoId,
    registros,
    obs: antiga.obs ?? "",
    aval: antiga.aval ?? {},
    updated_at: antiga._updated ?? updatedAt ?? EPOCH_MIGRACAO,
  };
}

async function mesclarSessao(nova: Sessao, subir: boolean) {
  const existente = await db.sessoes.get(nova.id);
  const tNova = Date.parse(nova.updated_at) || 0;
  const tExist = existente ? Date.parse(existente.updated_at) || 0 : -1;
  if (tNova > tExist) {
    await db.sessoes.put(nova);
    if (subir) enfileirar("sessoes", nova.id);
    return true;
  }
  return false;
}

/** Migra o localStorage antigo. Roda uma vez (flag em meta). */
export async function migrarLocal(): Promise<number> {
  if (await getMeta<boolean>("migracao_local_v1")) return 0;
  let migradas = 0;
  try {
    const raw = localStorage.getItem("adg_registros_v1");
    if (raw) {
      const dados = JSON.parse(raw) as Record<string, SessaoAntiga>;
      for (const [k, antiga] of Object.entries(dados)) {
        const [data, letra] = k.split("|");
        const nova = converter(data, letra, antiga);
        if (nova && (await mesclarSessao(nova, true))) migradas++;
      }
    }
  } catch {
    // localStorage indisponível ou backup corrompido: segue sem migrar
  }
  await setMeta("migracao_local_v1", true);
  return migradas;
}

/** Migra a tabela remota antiga após login. Idempotente por LWW. */
export async function migrarRemoto(): Promise<number> {
  const c = supa();
  const user = await usuarioAtual();
  if (!c || !user) return 0;
  let migradas = 0;
  try {
    const { data, error } = await c.from("adg_registros").select("data,treino,payload,updated_at");
    if (error) throw error;
    for (const r of data ?? []) {
      const nova = converter(r.data, r.treino, (r.payload ?? {}) as SessaoAntiga, r.updated_at);
      if (nova && (await mesclarSessao(nova, true))) migradas++;
    }
  } catch {
    return migradas;
  }
  return migradas;
}
