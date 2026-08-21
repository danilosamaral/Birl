import { create } from "zustand";
import { abrirBanco, adotarBancoLegado, db, fecharBanco, getMeta, setMeta, usuarioDonoDoLegado } from "./db";
import { gerarSeeds } from "./seeds";
import { gerarBiblioteca, gerarEnriquecimentoSeeds, SEED_EPOCH_V2, SEED_EPOCH_V3 } from "./biblioteca";
import { CATALOGO, exercicioNovoDoCatalogo } from "./catalogo";
import { seedExercicioId } from "./seeds";
import type { TreinoExercicio } from "./types";
import { migrarLocal, migrarRemoto } from "./migracao";
import { enfileirar, limparFila, setLogado, sincronizarTudo, supa, traduzErro, usuarioAtual, type Tabela } from "./sync";
import type { Exercicio, Medida, Prefs, Programa, RegistroSerie, Sessao, Treino, Aval } from "./types";
import { agora, extraId, novoId, seriesExtraPadrao, sessaoId, teIdDaChave } from "./types";
import { dataHoje, diaDaSemana, planoDoExercicio, treinosDoPrograma, treinosVisiveis } from "./utils";

export type Aba = "hoje" | "treinos" | "biblioteca" | "evolucao" | "ajustes";

const PROGRAMA_INICIAL_ID = "sd_prog_intermediario";

const PREFS_PADRAO = (): Prefs => ({
  id: "prefs",
  divisaoSemana: { 0: null, 1: "sd_A", 2: "sd_B", 3: null, 4: "sd_C", 5: "sd_D", 6: null },
  updated_at: "2026-01-01T00:00:00.000Z",
});

interface Estado {
  /** sessão de login já verificada (define se mostra a tela de login ou o app) */
  authPronto: boolean;
  /** dados do usuário logado carregados do banco local */
  pronto: boolean;
  tab: Aba;
  editandoTreinoId: string | null;
  dataAtiva: string;
  treinoAtivoId: string | null;
  usuario: { id: string; email?: string } | null;
  /** chegou pelo link de "esqueci a senha" — mostra o modal de nova senha */
  recuperandoSenha: boolean;
  sincronizando: boolean;
  ultimoSync: number | null;
  syncResumo: string | null;
  avisoSalvo: number;
  migradas: number;

  exercicios: Record<string, Exercicio>;
  treinos: Record<string, Treino>;
  sessoes: Record<string, Sessao>;
  programas: Record<string, Programa>;
  medidas: Record<string, Medida>;
  prefs: Prefs;

  init(): Promise<void>;
  /** abre o banco do usuário, semeia treinos/programas padrão e carrega tudo */
  entrarComoUsuario(userId: string): Promise<void>;
  /** define a senha nova no fluxo de recuperação; retorna mensagem de erro ou null */
  definirNovaSenha(senha: string): Promise<string | null>;
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
  /** Acrescenta ao dia um exercício que não está no plano do treino. */
  adicionarExtra(exercicioId: string): void;
  removerExtra(id: string): void;
  adicionarSerieExtra(id: string): void;
  removerSerieExtra(id: string, serieIdx: number): void;
  iniciarTreino(): void;
  encerrarTreino(): void;
  retomarTreino(): void;
  setAval(attr: keyof Aval, valor: number): void;
  setObs(obs: string): void;
  limparDia(): void;

  exportarBackup(): string;
  importarBackup(json: string): Promise<void>;
  aoLogar(): Promise<void>;
  sincronizarAgora(manual?: boolean): Promise<void>;
}

function sessaoVazia(data: string, treinoId: string): Sessao {
  return { id: sessaoId(data, treinoId), data, treinoId, registros: {}, obs: "", aval: {}, updated_at: agora() };
}

/** evita listeners e carga duplicados (StrictMode em dev re-executa efeitos) */
let initJaRodou = false;

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

  /**
   * Registra a ordem real do dia: o exercício entra na fila na primeira vez
   * que você mexe nele (números ou série marcada). Quem já está na fila
   * mantém o lugar — voltar pra corrigir um peso não muda a ordem.
   */
  function registrarOrdem(sess: Sessao, chave: string) {
    const teId = teIdDaChave(chave);
    const ordem = sess.ordemExecucao ?? [];
    if (!ordem.includes(teId)) sess.ordemExecucao = [...ordem, teId];
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

  const DADOS_VAZIOS = () => ({
    exercicios: {},
    treinos: {},
    sessoes: {},
    programas: {},
    medidas: {},
    prefs: PREFS_PADRAO(),
  });

  return {
    authPronto: false,
    pronto: false,
    tab: "hoje",
    editandoTreinoId: null,
    dataAtiva: dataHoje(),
    treinoAtivoId: null,
    usuario: null,
    recuperandoSenha: false,
    sincronizando: false,
    ultimoSync: null,
    syncResumo: null,
    avisoSalvo: 0,
    migradas: 0,
    exercicios: {},
    treinos: {},
    sessoes: {},
    programas: {},
    medidas: {},
    prefs: PREFS_PADRAO(),

    async init() {
      if (initJaRodou) return;
      initJaRodou = true;
      const c = supa();
      if (!c) {
        // sem serviço de conta não há como logar — a tela de login explica
        set({ authPronto: true });
        return;
      }

      const { data } = await c.auth.getSession();
      const u0 = data.session?.user ?? null;
      set({ authPronto: true, usuario: u0 ? { id: u0.id, email: u0.email ?? undefined } : null });
      setLogado(!!u0);

      c.auth.onAuthStateChange((evento, session) => {
        if (evento === "PASSWORD_RECOVERY") set({ recuperandoSenha: true });
        const u = session?.user ?? null;
        const antes = get().usuario?.id;
        set({ usuario: u ? { id: u.id, email: u.email ?? undefined } : null });
        setLogado(!!u);
        if (u && u.id !== antes) void get().entrarComoUsuario(u.id);
        if (!u && antes) {
          // saiu da conta: fecha o banco dela e volta pra tela de login
          limparFila();
          fecharBanco();
          set({
            pronto: false,
            ...DADOS_VAZIOS(),
            tab: "hoje",
            editandoTreinoId: null,
            treinoAtivoId: null,
            ultimoSync: null,
            syncResumo: null,
            migradas: 0,
          });
        }
      });

      if (u0) await get().entrarComoUsuario(u0.id);

      // re-sincroniza ao reabrir/focar o app e ao voltar a rede, para pegar o
      // que foi alterado em outro aparelho. Throttle simples de 15s.
      const resyncSeAntigo = () => {
        if (document.visibilityState === "hidden" || !get().usuario) return;
        const ult = get().ultimoSync ?? 0;
        if (Date.now() - ult > 15000) void get().sincronizarAgora();
      };
      document.addEventListener("visibilitychange", resyncSeAntigo);
      window.addEventListener("focus", resyncSeAntigo);
      window.addEventListener("online", () => void get().sincronizarAgora());
      setInterval(resyncSeAntigo, 90000);
    },

    async entrarComoUsuario(userId) {
      set({ pronto: false });
      limparFila();
      abrirBanco(userId);

      // dados feitos neste aparelho antes do login obrigatório pertencem ao
      // primeiro usuário que logar (o dono do aparelho até aqui)
      const dono = usuarioDonoDoLegado(userId);
      if (dono) await adotarBancoLegado();

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
              // data fixa e antiga: um aparelho recém-instalado nunca sobrescreve
              // por LWW as edições deste programa feitas em outro aparelho
              updated_at: "2026-01-01T00:00:00.000Z",
            })
            .catch(() => {});
          await db.prefs.put({ ...prefsRow, programaAtivoId: PROGRAMA_INICIAL_ID, updated_at: agora() });
          enfileirar("programas", PROGRAMA_INICIAL_ID);
          enfileirar("prefs", "prefs");
        }
        await setMeta("seed_version", 3);
      }

      // v4: exercícios novos da biblioteca curada (grupo Punho / Antebraço).
      // Insere só os ids que ainda não existem — nunca sobrescreve edições suas.
      if (((await getMeta<number>("seed_version")) ?? 1) < 4) {
        const lib = gerarBiblioteca();
        const libExistentes = await db.exercicios.bulkGet(lib.map((e) => e.id));
        await db.exercicios.bulkAdd(lib.filter((_, i) => !libExistentes[i])).catch(() => {});
        await setMeta("seed_version", 4);
      }

      // v5: fotos de execução nos exercícios de Punho / Antebraço, que entraram
      // na v4 sem mídia. Data mais nova que a da v4 para a foto vencer por LWW
      // a cópia sem mídia já sincronizada — e ainda perder para uma edição sua.
      if (((await getMeta<number>("seed_version")) ?? 1) < 5) {
        const lib = gerarBiblioteca();
        const libExistentes = await db.exercicios.bulkGet(lib.map((e) => e.id));
        await db.exercicios.bulkAdd(lib.filter((_, i) => !libExistentes[i])).catch(() => {});
        for (const [i, novo] of lib.entries()) {
          const row = libExistentes[i];
          // só preenche quem ainda está sem foto — nunca troca as suas
          if (row && novo.midia && !row.midia) {
            await db.exercicios.put({ ...row, midia: novo.midia, updated_at: SEED_EPOCH_V3 });
          }
        }
        await setMeta("seed_version", 5);
      }

      // o histórico do app antigo (localStorage) também é do dono do aparelho
      const migradas = dono ? await migrarLocal() : 0;
      await get().recarregar();
      set({ pronto: true, migradas, treinoAtivoId: treinoSugerido(get().dataAtiva) });
      void get().aoLogar();
    },

    async definirNovaSenha(senha) {
      const c = supa();
      if (!c) return "Sem conexão com o serviço de conta.";
      if (senha.length < 6) return "A senha precisa de pelo menos 6 caracteres.";
      const { error } = await c.auth.updateUser({ password: senha });
      if (error) return traduzErro(error.message);
      set({ recuperandoSenha: false });
      return null;
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
      registrarOrdem(sess, chave);
      salvarSessao(sess);
    },
    setRegistroCompleto(chave, registro) {
      const sess = { ...get().sessaoAtiva() };
      sess.registros = { ...sess.registros, [chave]: registro };
      registrarOrdem(sess, chave);
      salvarSessao(sess);
    },
    adicionarExtra(exercicioId) {
      const sess = { ...get().sessaoAtiva() };
      const id = extraId(exercicioId);
      if ((sess.extras ?? []).some((x) => x.id === id)) return; // já está no dia
      const series = planoDoExercicio(exercicioId, get().treinos, get().programaAtivo()) ?? seriesExtraPadrao();
      sess.extras = [...(sess.extras ?? []), { id, exercicioId, series }];
      salvarSessao(sess);
    },
    removerExtra(id) {
      const sess = { ...get().sessaoAtiva() };
      if (!(sess.extras ?? []).some((x) => x.id === id)) return;
      sess.extras = (sess.extras ?? []).filter((x) => x.id !== id);
      sess.registros = Object.fromEntries(
        Object.entries(sess.registros).filter(([chave]) => !chave.startsWith(`${id}:`))
      );
      if (sess.ordemExecucao) sess.ordemExecucao = sess.ordemExecucao.filter((x) => x !== id);
      salvarSessao(sess);
    },
    adicionarSerieExtra(id) {
      const sess = { ...get().sessaoAtiva() };
      const extras = (sess.extras ?? []).map((x) => {
        if (x.id !== id) return x;
        const ultima = x.series[x.series.length - 1];
        return { ...x, series: [...x.series, ultima ? { ...ultima } : seriesExtraPadrao()[0]] };
      });
      sess.extras = extras;
      salvarSessao(sess);
    },
    removerSerieExtra(id, serieIdx) {
      const sess = { ...get().sessaoAtiva() };
      const extra = (sess.extras ?? []).find((x) => x.id === id);
      if (!extra || extra.series.length <= 1) return;
      sess.extras = (sess.extras ?? []).map((x) =>
        x.id === id ? { ...x, series: x.series.filter((_, i) => i !== serieIdx) } : x
      );
      // as linhas seguintes sobem uma posição — os registros acompanham
      const prefixo = `${id}:`;
      const registros: Record<string, RegistroSerie> = {};
      for (const [chave, reg] of Object.entries(sess.registros)) {
        if (!chave.startsWith(prefixo)) {
          registros[chave] = reg;
          continue;
        }
        const i = Number(chave.slice(prefixo.length));
        if (i === serieIdx) continue;
        registros[`${prefixo}${i > serieIdx ? i - 1 : i}`] = reg;
      }
      sess.registros = registros;
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
      const sess = {
        ...get().sessaoAtiva(),
        registros: {},
        extras: [],
        ordemExecucao: [],
        obs: "",
        aval: {},
        deleted: true,
      };
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
      // migração única do histórico antigo (adg_registros) + primeira sincronização
      const jaMigrouRemoto = await getMeta<boolean>(`migracao_remota_${get().usuario?.id}`);
      if (!jaMigrouRemoto) {
        await migrarRemoto();
        await setMeta(`migracao_remota_${get().usuario?.id}`, true);
      }
      await get().sincronizarAgora();
    },

    async sincronizarAgora(manual = false) {
      if (get().sincronizando) return;
      const user = await usuarioAtual();
      if (!user) {
        if (manual) set({ syncResumo: "Entre com uma conta para sincronizar." });
        return;
      }
      set({ sincronizando: true, ...(manual ? { syncResumo: null } : {}) });
      try {
        const r = await sincronizarTudo();
        await get().recarregar();
        if (r.ok) {
          set({
            ultimoSync: Date.now(),
            syncResumo: manual
              ? r.baixados || r.enviados
                ? `Sincronizado: ${r.baixados} baixado(s), ${r.enviados} enviado(s).`
                : "Tudo já estava sincronizado."
              : get().syncResumo,
          });
        } else if (manual) {
          set({ syncResumo: `Falha ao sincronizar: ${r.erro ?? "sem conexão"}.` });
        }
      } finally {
        set({ sincronizando: false });
      }
    },
  };
});
