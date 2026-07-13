import { create } from "zustand";
import { db, getMeta, setMeta } from "./db";
import { gerarSeeds } from "./seeds";
import { gerarBiblioteca, gerarEnriquecimentoSeeds, SEED_EPOCH_V2 } from "./biblioteca";
import { migrarLocal, migrarRemoto } from "./migracao";
import { enfileirar, setLogado, sincronizarTudo, supa, type Tabela } from "./sync";
import type { Exercicio, Prefs, RegistroSerie, Sessao, Treino, Aval } from "./types";
import { agora, novoId, sessaoId } from "./types";
import { dataHoje, diaDaSemana, treinosVisiveis } from "./utils";

export type Aba = "hoje" | "treinos" | "biblioteca" | "evolucao" | "ajustes";

const PREFS_PADRAO = (): Prefs => ({
  id: "prefs",
  divisaoSemana: { 0: null, 1: "sd_A", 2: "sd_B", 3: null, 4: "sd_C", 5: "sd_D", 6: null },
  updated_at: "2026-01-01T00:00:00.000Z",
});

interface Estado {
  pronto: boolean;
  tab: Aba;
  editandoTreinoId: string | null;
  dataAtiva: string;
  treinoAtivoId: string | null;
  usuario: { id: string; email?: string } | null;
  sincronizando: boolean;
  avisoSalvo: number;
  migradas: number;

  exercicios: Record<string, Exercicio>;
  treinos: Record<string, Treino>;
  sessoes: Record<string, Sessao>;
  prefs: Prefs;

  init(): Promise<void>;
  recarregar(): Promise<void>;
  setTab(t: Aba): void;
  setEditandoTreino(id: string | null): void;
  setData(d: string): void;
  setTreinoAtivo(id: string): void;

  salvarTreino(t: Treino): void;
  duplicarTreino(id: string): void;
  arquivarTreino(id: string, arquivado: boolean): void;
  excluirTreino(id: string): void;
  salvarExercicio(e: Exercicio): void;

  sessaoAtiva(): Sessao;
  setRegistro(chave: string, campo: keyof RegistroSerie, valor: string | boolean): void;
  setAval(attr: keyof Aval, valor: number): void;
  setObs(obs: string): void;
  limparDia(): void;

  setDivisao(dia: number, treinoId: string | null): void;

  exportarBackup(): string;
  importarBackup(json: string): Promise<void>;
  aoLogar(): Promise<void>;
}

function sessaoVazia(data: string, treinoId: string): Sessao {
  return { id: sessaoId(data, treinoId), data, treinoId, registros: {}, obs: "", aval: {}, updated_at: agora() };
}

export const useStore = create<Estado>((set, get) => {
  function persistir<T extends { id: string }>(tabela: Tabela, ent: T) {
    void db[tabela].put(ent as never);
    enfileirar(tabela, ent.id);
    set({ avisoSalvo: get().avisoSalvo + 1 });
  }

  function salvarSessao(sess: Sessao) {
    sess.updated_at = agora();
    set({ sessoes: { ...get().sessoes, [sess.id]: sess } });
    persistir("sessoes", sess);
  }

  function treinoSugerido(data: string): string | null {
    const { prefs, treinos } = get();
    const sugestao = prefs.divisaoSemana[diaDaSemana(data)];
    if (sugestao && treinos[sugestao] && !treinos[sugestao].deleted && !treinos[sugestao].arquivado) return sugestao;
    return treinosVisiveis(treinos)[0]?.id ?? null;
  }

  return {
    pronto: false,
    tab: "hoje",
    editandoTreinoId: null,
    dataAtiva: dataHoje(),
    treinoAtivoId: null,
    usuario: null,
    sincronizando: false,
    avisoSalvo: 0,
    migradas: 0,
    exercicios: {},
    treinos: {},
    sessoes: {},
    prefs: PREFS_PADRAO(),

    async init() {
      // semeia os treinos padrão (apenas ids ainda inexistentes — tombstones não ressuscitam)
      const seeds = gerarSeeds();
      const exIds = await db.exercicios.bulkGet(seeds.exercicios.map((e) => e.id));
      await db.exercicios.bulkAdd(seeds.exercicios.filter((_, i) => !exIds[i])).catch(() => {});
      const trIds = await db.treinos.bulkGet(seeds.treinos.map((t) => t.id));
      await db.treinos.bulkAdd(seeds.treinos.filter((_, i) => !trIds[i])).catch(() => {});
      if (!(await db.prefs.get("prefs"))) await db.prefs.add(PREFS_PADRAO()).catch(() => {});

      // v2: biblioteca curada + imagens/instruções nos exercícios dos treinos padrão
      if (((await getMeta<number>("seed_version")) ?? 1) < 2) {
        const lib = gerarBiblioteca();
        const libExistentes = await db.exercicios.bulkGet(lib.map((e) => e.id));
        await db.exercicios.bulkAdd(lib.filter((_, i) => !libExistentes[i])).catch(() => {});
        for (const [id, enr] of Object.entries(gerarEnriquecimentoSeeds())) {
          const row = await db.exercicios.get(id);
          // só enriquece exercícios ainda sem mídia/instruções do usuário
          if (row && !row.instrucoes && !row.midia) {
            await db.exercicios.put({ ...row, ...enr, updated_at: SEED_EPOCH_V2 });
          }
        }
        await setMeta("seed_version", 2);
      }

      const migradas = await migrarLocal();
      await get().recarregar();
      set({ pronto: true, migradas, treinoAtivoId: treinoSugerido(get().dataAtiva) });

      const c = supa();
      if (c) {
        c.auth.getSession().then(({ data }) => {
          const u = data.session?.user ?? null;
          set({ usuario: u ? { id: u.id, email: u.email ?? undefined } : null });
          setLogado(!!u);
          if (u) void get().aoLogar();
        });
        c.auth.onAuthStateChange((_e, session) => {
          const u = session?.user ?? null;
          const antes = get().usuario?.id;
          set({ usuario: u ? { id: u.id, email: u.email ?? undefined } : null });
          setLogado(!!u);
          if (u && u.id !== antes) void get().aoLogar();
        });
      }
    },

    async recarregar() {
      const [exs, trs, sss, prefs] = await Promise.all([
        db.exercicios.toArray(),
        db.treinos.toArray(),
        db.sessoes.toArray(),
        db.prefs.get("prefs"),
      ]);
      set({
        exercicios: Object.fromEntries(exs.map((e) => [e.id, e])),
        treinos: Object.fromEntries(trs.map((t) => [t.id, t])),
        sessoes: Object.fromEntries(sss.filter((s) => !s.deleted).map((s) => [s.id, s])),
        prefs: prefs ?? PREFS_PADRAO(),
      });
    },

    setTab: (tab) => set({ tab, editandoTreinoId: null }),
    setEditandoTreino: (editandoTreinoId) => set({ editandoTreinoId }),
    setData(dataAtiva) {
      set({ dataAtiva });
      const atual = get().treinoAtivoId;
      const t = atual ? get().treinos[atual] : null;
      if (!t || t.deleted || t.arquivado) set({ treinoAtivoId: treinoSugerido(dataAtiva) });
    },
    setTreinoAtivo: (treinoAtivoId) => set({ treinoAtivoId }),

    salvarTreino(t) {
      const atualizado = { ...t, updated_at: agora() };
      set({ treinos: { ...get().treinos, [t.id]: atualizado } });
      persistir("treinos", atualizado);
    },
    duplicarTreino(id) {
      const orig = get().treinos[id];
      if (!orig) return;
      const copia: Treino = {
        ...orig,
        id: novoId(),
        nome: `${orig.nome} (cópia)`,
        ordem: Math.max(...Object.values(get().treinos).map((t) => t.ordem), 0) + 1,
        arquivado: false,
        exercicios: orig.exercicios.map((te) => ({ ...te, id: novoId(), series: te.series.map((s) => ({ ...s })) })),
        updated_at: agora(),
      };
      delete copia.deleted;
      set({ treinos: { ...get().treinos, [copia.id]: copia } });
      persistir("treinos", copia);
    },
    arquivarTreino(id, arquivado) {
      const t = get().treinos[id];
      if (t) get().salvarTreino({ ...t, arquivado });
    },
    excluirTreino(id) {
      const t = get().treinos[id];
      if (!t) return;
      const morto = { ...t, deleted: true, updated_at: agora() };
      const treinos = { ...get().treinos };
      delete treinos[id];
      set({ treinos: { ...treinos, [id]: morto } });
      persistir("treinos", morto);
      if (get().treinoAtivoId === id) set({ treinoAtivoId: treinoSugerido(get().dataAtiva) });
    },
    salvarExercicio(e) {
      const atualizado = { ...e, updated_at: agora() };
      set({ exercicios: { ...get().exercicios, [e.id]: atualizado } });
      persistir("exercicios", atualizado);
    },

    sessaoAtiva() {
      const { dataAtiva, treinoAtivoId, sessoes } = get();
      const tid = treinoAtivoId ?? "";
      return sessoes[sessaoId(dataAtiva, tid)] ?? sessaoVazia(dataAtiva, tid);
    },
    setRegistro(chave, campo, valor) {
      const sess = { ...get().sessaoAtiva() };
      sess.registros = { ...sess.registros };
      const atual = sess.registros[chave] ?? { sets: "", kg: "", reps: "", rir: "", done: false };
      sess.registros[chave] = { ...atual, [campo]: valor };
      salvarSessao(sess);
    },
    setAval(attr, valor) {
      const sess = { ...get().sessaoAtiva() };
      sess.aval = { ...sess.aval, [attr]: valor };
      salvarSessao(sess);
    },
    setObs(obs) {
      const sess = { ...get().sessaoAtiva(), obs };
      salvarSessao(sess);
    },
    limparDia() {
      const sess = { ...get().sessaoAtiva(), registros: {}, obs: "", aval: {}, deleted: true };
      const sessoes = { ...get().sessoes };
      delete sessoes[sess.id];
      set({ sessoes });
      sess.updated_at = agora();
      void db.sessoes.put(sess);
      enfileirar("sessoes", sess.id);
    },

    setDivisao(dia, treinoId) {
      const prefs: Prefs = {
        ...get().prefs,
        divisaoSemana: { ...get().prefs.divisaoSemana, [dia]: treinoId },
        updated_at: agora(),
      };
      set({ prefs });
      persistir("prefs", prefs);
    },

    exportarBackup() {
      const { exercicios, treinos, sessoes, prefs } = get();
      return JSON.stringify({ versao: 2, exercicios, treinos, sessoes, prefs }, null, 2);
    },
    async importarBackup(json) {
      const b = JSON.parse(json) as {
        versao: number;
        exercicios: Record<string, Exercicio>;
        treinos: Record<string, Treino>;
        sessoes: Record<string, Sessao>;
        prefs?: Prefs;
      };
      if (b.versao !== 2 || typeof b.treinos !== "object" || typeof b.sessoes !== "object") {
        throw new Error("Backup em formato desconhecido.");
      }
      await db.exercicios.bulkPut(Object.values(b.exercicios ?? {}));
      await db.treinos.bulkPut(Object.values(b.treinos ?? {}));
      await db.sessoes.bulkPut(Object.values(b.sessoes ?? {}));
      if (b.prefs) await db.prefs.put(b.prefs);
      for (const e of Object.values(b.exercicios ?? {})) enfileirar("exercicios", e.id);
      for (const t of Object.values(b.treinos ?? {})) enfileirar("treinos", t.id);
      for (const s of Object.values(b.sessoes ?? {})) enfileirar("sessoes", s.id);
      await get().recarregar();
    },

    async aoLogar() {
      set({ sincronizando: true });
      try {
        await sincronizarTudo();
        const jaMigrouRemoto = await getMeta<boolean>(`migracao_remota_${get().usuario?.id}`);
        if (!jaMigrouRemoto) {
          await migrarRemoto();
          await setMeta(`migracao_remota_${get().usuario?.id}`, true);
        }
        await get().recarregar();
      } finally {
        set({ sincronizando: false });
      }
    },
  };
});
