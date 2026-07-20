import Dexie, { type Table } from "dexie";
import type { Exercicio, Treino, Sessao, Prefs, Programa, Medida } from "./types";

/** Metadados locais (flags de migração, fila de sync). */
export interface Meta {
  id: string;
  valor: unknown;
}

/** Nome do banco da era pré-login (dados sem dono neste aparelho). */
const BANCO_LEGADO = "birl";
const CHAVE_DONO_LEGADO = "birl_dono_dados_locais";

class BirlDB extends Dexie {
  exercicios!: Table<Exercicio, string>;
  treinos!: Table<Treino, string>;
  sessoes!: Table<Sessao, string>;
  programas!: Table<Programa, string>;
  medidas!: Table<Medida, string>;
  prefs!: Table<Prefs, string>;
  meta!: Table<Meta, string>;

  constructor(nome: string) {
    super(nome);
    this.version(1).stores({
      exercicios: "id, nome, grupo",
      treinos: "id, ordem",
      sessoes: "id, data, treinoId",
      prefs: "id",
      meta: "id",
    });
    this.version(2).stores({
      programas: "id",
    });
    this.version(3).stores({
      medidas: "id, data",
    });
  }
}

/** Banco do usuário logado — aberto por `abrirBanco()` depois do login. */
export let db: BirlDB = null as unknown as BirlDB;

export function abrirBanco(userId: string) {
  if (db?.isOpen()) db.close();
  db = new BirlDB(`birl_u_${userId}`);
}

export function fecharBanco() {
  if (db?.isOpen()) db.close();
  db = null as unknown as BirlDB;
}

/**
 * O primeiro usuário a logar neste aparelho vira dono dos dados feitos antes
 * do login obrigatório (banco "birl" e o localStorage do app antigo). Quem
 * logar depois começa do zero (mais o que baixar da própria conta).
 */
export function usuarioDonoDoLegado(userId: string): boolean {
  try {
    const dono = localStorage.getItem(CHAVE_DONO_LEGADO);
    if (!dono) {
      localStorage.setItem(CHAVE_DONO_LEGADO, userId);
      return true;
    }
    return dono === userId;
  } catch {
    return false;
  }
}

/** Copia o banco pré-login para o banco do usuário dono. Roda uma vez. */
export async function adotarBancoLegado(): Promise<void> {
  if (await getMeta<boolean>("legado_adotado")) return;
  if (await Dexie.exists(BANCO_LEGADO)) {
    const legado = new BirlDB(BANCO_LEGADO);
    try {
      const [exs, trs, sss, prgs, meds, prefs, metas] = await Promise.all([
        legado.exercicios.toArray(),
        legado.treinos.toArray(),
        legado.sessoes.toArray(),
        legado.programas.toArray(),
        legado.medidas.toArray(),
        legado.prefs.toArray(),
        legado.meta.toArray(),
      ]);
      await Promise.all([
        db.exercicios.bulkPut(exs),
        db.treinos.bulkPut(trs),
        db.sessoes.bulkPut(sss),
        db.programas.bulkPut(prgs),
        db.medidas.bulkPut(meds),
        db.prefs.bulkPut(prefs),
        // meta traz junto as flags de seed/migração já concluídas
        db.meta.bulkPut(metas),
      ]);
    } finally {
      legado.close();
    }
  }
  await setMeta("legado_adotado", true);
}

export async function getMeta<T>(id: string): Promise<T | undefined> {
  const m = await db.meta.get(id);
  return m?.valor as T | undefined;
}

export async function setMeta(id: string, valor: unknown) {
  await db.meta.put({ id, valor });
}
