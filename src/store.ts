import { create } from "zustand";
import { db, getMeta, setMeta } from "./db";
import { gerarSeeds } from "./seeds";
import { gerarBiblioteca, gerarEnriquecimentoSeeds, SEED_EPOCH_V2 } from "./biblioteca";
import { CATALOGO, exercicioNovoDoCatalogo } from "./catalogo";
import { seedExercicioId } from "./seeds";
import type { TreinoExercicio } from "./types";
import { migrarLocal, migrarRemoto } from "./migracao";
import { enfileirar, setLogado, sincronizarTudo, supa, type Tabela } from "./sync";
import type { Exercicio, Medida, Prefs, Programa, RegistroSerie, Sessao, Treino, Aval } from "./types";
import { agora, novoId, sessaoId } from "./types";
import { dataHoje, diaDaSemana, treinosDoPrograma, treinosVisiveis } from "./utils";

export type Aba = "hoje" | "treinos" | "biblioteca" | "evolucao" | "ajustes";

const PROGRAMA_INICIAL_ID = "sd_prog_intermediario";

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
  programas: Record<string, Programa>;
  medidas: Record<string, Medida>;
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

  setTimerDescanso(ligado: boolean): void;
  programaAtivo(): Programa | null;
  setProgramaAtivo(id: string | null): void;
  salvarPrograma(p: Programa): void;
  duplicarPrograma(id: string): void;
  arquivarPrograma(id: string, arquivado: boolean): void;
  excluirPrograma(id: string): void;
  /** Instancia um programa do catálogo; retorna o id criado (ou null). */
  adicionarProgramaDoCatalogo(templateId: string): string | null;

  salvarMedida(m: Medida): void;
  excluirMedida(id: string): void;

  sessaoAtiva(): Sessao;
  setRegistro(chave: string, campo: keyof RegistroSerie, valor: string | boolean): void;
  setRegistroCompleto(chave: string, registro: RegistroSerie): void;
  iniciarTreino(): void;
  encerrarTreino(): void;
  retomarTreino(): void;
  setAval(attr: keyof Aval, valor: number): void;
  setObs(obs: string): void;
  limparDia(): void;

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
    const { treinos } = get();
    const prog = get().programaAtivo();
    const valido = (id: string | null | undefined) =>
      !!id && !!treinos[id] && !treinos[id].deleted && !treinos[id].arquivado;
    if (prog) {
      const sugestao = prog.divisaoSemana[diaDaSemana(data)];
      if (valido(sugestao)) return sugestao!;
      const doPrograma = treinosDoPrograma(prog, treinos)[0]?.id;
      if (valido(doPrograma)) return doPrograma;
    }
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
    programas: {},
    medidas: {},
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

      // v3: programas de treino — a ficha A/B/C/D vira o programa inicial,
      // herdando a divisão da semana configurada nas prefs
      if (((await getMeta<number>("seed_version")) ?? 1) < 3) {
        if (!(await db.programas.get(PROGRAMA_INICIAL_ID))) {
          const prefsRow = (await db.prefs.get("prefs")) ?? PREFS_PADRAO();
          await db.programas
            .add({
              id: PROGRAMA_INICIAL_ID,
              nome: "Intermediário 4x na Semana",
              descricao: "Programa original da ficha A/B/C/D.",
              treinoIds: ["sd_A", "sd_B", "sd_C", "sd_D"],
              divisaoSemana: { ...prefsRow.divisaoSemana },
              updated_at: agora(),
            })
            .catch(() => {});
          await db.prefs.put({ ...prefsRow, programaAtivoId: PROGRAMA_INICIAL_ID, updated_at: agora() });
          enfileirar("programas", PROGRAMA_INICIAL_ID);
          enfileirar("prefs", "prefs");
        }
        await setMeta("seed_version", 3);
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
      const [exs, trs, sss, prgs, meds, prefs] = await Promise.all([
        db.exercicios.toArray(),
        db.treinos.toArray(),
        db.sessoes.toArray(),
        db.programas.toArray(),
        db.medidas.toArray(),
        db.prefs.get("prefs"),
      ]);
      set({
        exercicios: Object.fromEntries(exs.map((e) => [e.id, e])),
        treinos: Object.fromEntries(trs.map((t) => [t.id, t])),
        sessoes: Object.fromEntries(sss.filter((s) => !s.deleted).map((s) => [s.id, s])),
        programas: Object.fromEntries(prgs.map((p) => [p.id, p])),
        medidas: Object.fromEntries(meds.filter((m) => !m.deleted).map((m) => [m.id, m])),
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
      // tira o treino dos programas que o referenciam
      for (const p of Object.values(get().programas)) {
        if (p.deleted || !p.treinoIds.includes(id)) continue;
        const divisao = Object.fromEntries(
          Object.entries(p.divisaoSemana).map(([d, tid]) => [d, tid === id ? null : tid])
        );
        get().salvarPrograma({ ...p, treinoIds: p.treinoIds.filter((x) => x !== id), divisaoSemana: divisao });
      }
      if (get().treinoAtivoId === id) set({ treinoAtivoId: treinoSugerido(get().dataAtiva) });
    },
    salvarExercicio(e) {
      const atualizado = { ...e, updated_at: agora() };
      set({ exercicios: { ...get().exercicios, [e.id]: atualizado } });
      persistir("exercicios", atualizado);
    },

    salvarMedida(m) {
      const atualizado = { ...m, updated_at: agora() };
      set({ medidas: { ...get().medidas, [m.id]: atualizado } });
      persistir("medidas", atualizado);
    },
    excluirMedida(id) {
      const m = get().medidas[id];
      if (!m) return;
      const morto = { ...m, deleted: true, updated_at: agora() };
      const medidas = { ...get().medidas };
      delete medidas[id];
      set({ medidas });
      void db.medidas.put(morto);
      enfileirar("medidas", id);
      set({ avisoSalvo: get().avisoSalvo + 1 });
    },

    setTimerDescanso(ligado) {
      const prefs: Prefs = { ...get().prefs, timerDescanso: ligado, updated_at: agora() };
      set({ prefs });
      persistir("prefs", prefs);
    },
    programaAtivo() {
      const { prefs, programas } = get();
      const p = prefs.programaAtivoId ? programas[prefs.programaAtivoId] : null;
      if (p && !p.deleted && !p.arquivado) return p;
      // fallback: primeiro programa visível
      return (
        Object.values(programas)
          .filter((x) => !x.deleted && !x.arquivado)
          .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"))[0] ?? null
      );
    },
    setProgramaAtivo(id) {
      const prefs: Prefs = { ...get().prefs, programaAtivoId: id, updated_at: agora() };
      set({ prefs });
      persistir("prefs", prefs);
      set({ treinoAtivoId: treinoSugerido(get().dataAtiva) });
    },
    salvarPrograma(p) {
      const atualizado = { ...p, updated_at: agora() };
      set({ programas: { ...get().programas, [p.id]: atualizado } });
      persistir("programas", atualizado);
    },
    duplicarPrograma(id) {
      const orig = get().programas[id];
      if (!orig) return;
      const copia: Programa = {
        ...orig,
        id: novoId(),
        nome: `${orig.nome} (cópia)`,
        treinoIds: [...orig.treinoIds],
        divisaoSemana: { ...orig.divisaoSemana },
        arquivado: false,
        updated_at: agora(),
      };
      delete copia.deleted;
      set({ programas: { ...get().programas, [copia.id]: copia } });
      persistir("programas", copia);
    },
    arquivarPrograma(id, arquivado) {
      const p = get().programas[id];
      if (p) get().salvarPrograma({ ...p, arquivado });
    },
    excluirPrograma(id) {
      const p = get().programas[id];
      if (!p) return;
      const morto = { ...p, deleted: true, updated_at: agora() };
      set({ programas: { ...get().programas, [id]: morto } });
      persistir("programas", morto);
      if (get().prefs.programaAtivoId === id) get().setProgramaAtivo(null);
    },
    adicionarProgramaDoCatalogo(templateId) {
      const tpl = CATALOGO.find((t) => t.id === templateId);
      if (!tpl) return null;
      const exAtuais = { ...get().exercicios };
      const novosEx: Exercicio[] = [];
      // treinos com UUIDs novos; a divisão referencia os treinos por índice
      const idsPorIndice: string[] = tpl.treinos.map(() => novoId());
      const ordemBase = Math.max(...Object.values(get().treinos).map((t) => t.ordem), -1) + 1;
      const treinos: Treino[] = tpl.treinos.map((ct, ti) => {
        const exercicios: TreinoExercicio[] = ct.exercicios.map((ce) => {
          const exId = seedExercicioId(ce.nome);
          // reaproveita exercício existente (histórico unificado) ou cria o que falta
          if (!exAtuais[exId] && !novosEx.some((e) => e.id === exId)) {
            novosEx.push(exercicioNovoDoCatalogo(ce));
          }
          return {
            id: novoId(),
            exercicioId: exId,
            series: ce.series.map((s) => ({ ...s })),
            ...(ce.aviso ? { aviso: ce.aviso } : {}),
          };
        });
        return {
          id: idsPorIndice[ti],
          nome: ct.nome,
          foco: ct.foco,
          ordem: ordemBase + ti,
          exercicios,
          updated_at: agora(),
        };
      });
      const divisaoSemana: Record<number, string | null> = {};
      for (const [dia, idx] of Object.entries(tpl.divisaoSemana)) {
        divisaoSemana[Number(dia)] = idx == null ? null : idsPorIndice[idx];
      }
      const programa: Programa = {
        id: novoId(),
        nome: tpl.nome,
        descricao: tpl.descricao,
        treinoIds: idsPorIndice,
        divisaoSemana,
        updated_at: agora(),
      };
      // grava exercícios novos, treinos e o programa
      const exState = { ...get().exercicios };
      for (const e of novosEx) {
        exState[e.id] = e;
        void db.exercicios.put(e);
        enfileirar("exercicios", e.id);
      }
      const trState = { ...get().treinos };
      for (const t of treinos) {
        trState[t.id] = t;
        void db.treinos.put(t);
        enfileirar("treinos", t.id);
      }
      set({ exercicios: exState, treinos: trState, programas: { ...get().programas, [programa.id]: programa } });
      persistir("programas", programa);
      return programa.id;
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
    setRegistroCompleto(chave, registro) {
      const sess = { ...get().sessaoAtiva() };
      sess.registros = { ...sess.registros, [chave]: registro };
      salvarSessao(sess);
    },
    iniciarTreino() {
      const sess = { ...get().sessaoAtiva() };
      if (sess.inicio) return;
      sess.inicio = agora();
      delete sess.fim;
      salvarSessao(sess);
    },
    encerrarTreino() {
      const sess = { ...get().sessaoAtiva() };
      if (!sess.inicio || sess.fim) return;
      sess.fim = agora();
      salvarSessao(sess);
    },
    retomarTreino() {
      const sess = { ...get().sessaoAtiva() };
      if (!sess.fim) return;
      delete sess.fim;
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

    exportarBackup() {
      const { exercicios, treinos, sessoes, programas, medidas, prefs } = get();
      return JSON.stringify({ versao: 2, exercicios, treinos, sessoes, programas, medidas, prefs }, null, 2);
    },
    async importarBackup(json) {
      const b = JSON.parse(json) as {
        versao: number;
        exercicios: Record<string, Exercicio>;
        treinos: Record<string, Treino>;
        sessoes: Record<string, Sessao>;
        programas?: Record<string, Programa>;
        medidas?: Record<string, Medida>;
        prefs?: Prefs;
      };
      if (b.versao !== 2 || typeof b.treinos !== "object" || typeof b.sessoes !== "object") {
        throw new Error("Backup em formato desconhecido.");
      }
      await db.exercicios.bulkPut(Object.values(b.exercicios ?? {}));
      await db.treinos.bulkPut(Object.values(b.treinos ?? {}));
      await db.sessoes.bulkPut(Object.values(b.sessoes ?? {}));
      await db.programas.bulkPut(Object.values(b.programas ?? {}));
      await db.medidas.bulkPut(Object.values(b.medidas ?? {}));
      if (b.prefs) await db.prefs.put(b.prefs);
      for (const e of Object.values(b.exercicios ?? {})) enfileirar("exercicios", e.id);
      for (const t of Object.values(b.treinos ?? {})) enfileirar("treinos", t.id);
      for (const s of Object.values(b.sessoes ?? {})) enfileirar("sessoes", s.id);
      for (const p of Object.values(b.programas ?? {})) enfileirar("programas", p.id);
      for (const m of Object.values(b.medidas ?? {})) enfileirar("medidas", m.id);
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
