import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";
import { db } from "./db";
import type { Exercicio, Treino, Sessao, Prefs, Programa, Medida } from "./types";

const SUPA_URL = "https://eskmvqphpllietgiqnbi.supabase.co";
const SUPA_KEY = "sb_publishable_sTX3lxzeUT-liEHT8_FdNA_AVJpJyQF";

export type Entidade = Exercicio | Treino | Sessao | Prefs | Programa | Medida;
export type Tabela = "exercicios" | "treinos" | "sessoes" | "programas" | "medidas" | "prefs";

const TABELA_REMOTA: Record<Tabela, string> = {
  exercicios: "birl_exercicios",
  treinos: "birl_treinos",
  sessoes: "birl_sessoes",
  programas: "birl_programas",
  medidas: "birl_medidas",
  prefs: "birl_prefs",
};

let sb: SupabaseClient | null = null;

export function supa(): SupabaseClient | null {
  if (!sb) {
    try {
      sb = createClient(SUPA_URL, SUPA_KEY);
    } catch {
      sb = null;
    }
  }
  return sb;
}

export function usuarioAtual(): Promise<User | null> {
  const c = supa();
  if (!c) return Promise.resolve(null);
  return c.auth.getSession().then(({ data }) => data.session?.user ?? null);
}

/* ---------- fila de subida (debounce, igual ao app antigo) ---------- */

const fila = new Map<Tabela, Set<string>>();
let timer: ReturnType<typeof setTimeout> | undefined;
let logado = false;

export function setLogado(v: boolean) {
  logado = v;
}

export function enfileirar(tabela: Tabela, id: string) {
  if (!fila.has(tabela)) fila.set(tabela, new Set());
  fila.get(tabela)!.add(id);
  clearTimeout(timer);
  timer = setTimeout(descarregarFila, 1200);
}

async function descarregarFila() {
  if (!logado) return;
  const pendentes = [...fila.entries()];
  fila.clear();
  for (const [tabela, ids] of pendentes) {
    for (const id of ids) await subir(tabela, id);
  }
}

async function subir(tabela: Tabela, id: string): Promise<boolean> {
  const c = supa();
  const user = await usuarioAtual();
  if (!c || !user) return false;
  const ent = (await db[tabela].get(id)) as Entidade | undefined;
  if (!ent) return false;
  const { error } = await c.from(TABELA_REMOTA[tabela]).upsert(
    {
      user_id: user.id,
      id: ent.id,
      payload: ent,
      updated_at: ent.updated_at,
      deleted: !!ent.deleted,
    },
    { onConflict: "user_id,id" }
  );
  return !error;
}

/* ---------- sincronização completa (pull + push, LWW) ---------- */

export interface ResultadoSync {
  ok: boolean;
  baixados: number;
  enviados: number;
  erro?: string;
}

export async function sincronizarTudo(): Promise<ResultadoSync> {
  const c = supa();
  const user = await usuarioAtual();
  if (!c || !user) return { ok: false, baixados: 0, enviados: 0, erro: "Não autenticado" };
  let baixados = 0;
  let enviados = 0;
  let erro: string | undefined;
  for (const tabela of Object.keys(TABELA_REMOTA) as Tabela[]) {
    try {
      const { data, error } = await c
        .from(TABELA_REMOTA[tabela])
        .select("id,payload,updated_at,deleted");
      if (error) throw new Error(error.message);
      const remoto = new Map<string, { payload: Entidade; updated_at: string }>();
      (data ?? []).forEach((r) =>
        remoto.set(r.id, {
          payload: { ...(r.payload as Entidade), deleted: !!r.deleted },
          updated_at: r.updated_at,
        })
      );
      const locais = (await db[tabela].toArray()) as Entidade[];
      const locaisMap = new Map(locais.map((e) => [e.id, e]));
      const paraSubir: string[] = [];
      const paraSalvar: Entidade[] = [];

      for (const [id, rem] of remoto) {
        const loc = locaisMap.get(id);
        const tRem = Date.parse(rem.payload.updated_at ?? rem.updated_at) || 0;
        const tLoc = loc ? Date.parse(loc.updated_at) || 0 : -1;
        if (tRem >= tLoc) paraSalvar.push(rem.payload);
        else paraSubir.push(id);
      }
      for (const loc of locais) {
        if (!remoto.has(loc.id)) paraSubir.push(loc.id);
      }
      if (paraSalvar.length) {
        await (db[tabela] as never as { bulkPut(a: Entidade[]): Promise<unknown> }).bulkPut(paraSalvar);
        baixados += paraSalvar.length;
      }
      for (const id of paraSubir) if (await subir(tabela, id)) enviados++;
    } catch (e) {
      erro = erro ?? (e instanceof Error ? e.message : String(e));
    }
  }
  return { ok: !erro, baixados, enviados, erro };
}

export function traduzErro(m: string): string {
  if (/Invalid login/i.test(m)) return "E-mail ou senha incorretos.";
  if (/already registered/i.test(m)) return "Esse e-mail já tem conta. Toque em Entrar.";
  if (/Password should/i.test(m)) return "A senha precisa de pelo menos 6 caracteres.";
  return m;
}
