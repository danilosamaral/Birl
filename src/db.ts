import Dexie, { type Table } from "dexie";
import type { Exercicio, Treino, Sessao, Prefs, Programa, Medida } from "./types";

/** Metadados locais (flags de migração, fila de sync). */
export interface Meta {
  id: string;
  valor: unknown;
}

class BirlDB extends Dexie {
  exercicios!: Table<Exercicio, string>;
  treinos!: Table<Treino, string>;
  sessoes!: Table<Sessao, string>;
  programas!: Table<Programa, string>;
  medidas!: Table<Medida, string>;
  prefs!: Table<Prefs, string>;
  meta!: Table<Meta, string>;

  constructor() {
    super("birl");
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

export const db = new BirlDB();

export async function getMeta<T>(id: string): Promise<T | undefined> {
  const m = await db.meta.get(id);
  return m?.valor as T | undefined;
}

export async function setMeta(id: string, valor: unknown) {
  await db.meta.put({ id, valor });
}
