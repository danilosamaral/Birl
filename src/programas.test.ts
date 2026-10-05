import { describe, expect, it } from "vitest";
import { parseIntervalo } from "./analise";
import { CANONICOS, canonicoPorNome, mapaDeApelidos } from "./canonicos";
import { CATALOGO, idDoItemCatalogo } from "./catalogo";
import { gerarSeeds, seedExercicioId, slug } from "./seeds";
import { rotuloDaNota } from "./types";
import type { Exercicio, Sessao, Treino } from "./types";
import { unificarExercicios } from "./unificacao";
import { seriesDaLinha } from "./utils";

describe("parseIntervalo (B1)", () => {
  it.each([
    ["1 min", 60],
    ["1 a 2 min", 90],
    ["2 a 3 min", 150],
    ["90 s", 90],
    ["45 s", 45],
    ["45 segundos", 45],
    ["90 segundos", 90],
    ["30 seg", 30],
    ["2", 120],
    ["—", 0],
  ])("%s → %i s", (txt, seg) => expect(parseIntervalo(txt)).toBe(seg));
});

describe("rotuloDaNota", () => {
  it.each([
    ["+ 2 rest pause de 10s na última série", "Rest pause 2×10s na última série"],
    ["+ 1 drop set na última série", "Drop set na última série"],
    ["+ 1 drop set", "Drop set"],
    ["+ 2 drops na última série", "2 drops na última série"],
    ["+ drop set", "Drop set"],
    ["+ 10 reps parciais após a falha em todas as séries", "Parciais +10 após a falha"],
  ])("%s", (nota, rot) => expect(rotuloDaNota(nota)).toBe(rot));
});

describe("nomes unificados", () => {
  it("cada nome/apelido aponta para um só exercício", () => {
    const visto = new Map<string, string>();
    for (const c of CANONICOS) {
      for (const n of [c.nome, ...c.apelidos]) {
        const s = slug(n);
        if (visto.has(s)) expect(visto.get(s)).toBe(c.id);
        visto.set(s, c.id);
      }
    }
    expect(new Set(CANONICOS.map((c) => c.id)).size).toBe(CANONICOS.length);
  });

  it("os ids canônicos dos exercícios da ficha padrão são os ids que já existiam", () => {
    const { exercicios } = gerarSeeds();
    for (const e of exercicios) {
      const c = canonicoPorNome(e.nome);
      expect(c, e.nome).toBeDefined();
      expect(c!.id).toBe(e.id);
    }
  });

  it("nenhum id canônico é apelido de outro", () => {
    const apelidos = mapaDeApelidos();
    for (const c of CANONICOS) expect(apelidos.has(c.id)).toBe(false);
  });
});

describe("catálogo", () => {
  const NOVOS = new Set(["Rosca direta sentado com halteres", "Serrote"]);

  it("tem os 7 programas da trilha, em ordem dentro de cada nível", () => {
    expect(CATALOGO.map((t) => t.id)).toEqual([
      "cat_adaptacao",
      "cat_2x_iniciantes",
      "cat_4x_iniciantes",
      "cat_ppl_3x",
      "cat_abcd",
      "cat_abcde_superiores",
      "cat_5x",
    ]);
  });

  for (const tpl of CATALOGO) {
    it(`${tpl.nome}: exercícios, séries e divisão coerentes`, () => {
      for (const [, idx] of Object.entries(tpl.divisaoSemana)) {
        if (idx != null) expect(idx).toBeLessThan(tpl.treinos.length);
      }
      for (const ct of tpl.treinos) {
        expect(ct.exercicios.length).toBeGreaterThan(0);
        for (const ce of ct.exercicios) {
          if (!NOVOS.has(ce.nome)) expect(canonicoPorNome(ce.nome), ce.nome).toBeDefined();
          expect(idDoItemCatalogo(ce)).toMatch(/^sd_/);
          expect(ce.nome).not.toMatch(/pico/i);
          for (const s of ce.series) {
            expect(seriesDaLinha(s.presc, "")).toBeGreaterThan(0);
            // toda série tem descanso que o timer entende, inclusive a de trabalho
            expect(parseIntervalo(s.int), `${ce.nome} ${s.presc} ${s.int}`).toBeGreaterThan(0);
            expect(parseIntervalo(s.int)).toBeLessThanOrEqual(180);
          }
        }
      }
    });
  }
});

describe("unificarExercicios (migração)", () => {
  const Q = "2026-10-06T00:00:00.000Z";
  const ex = (nome: string, extra: Partial<Exercicio> = {}): Exercicio => ({
    id: seedExercicioId(nome),
    nome,
    grupo: "X",
    origem: "seed",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...extra,
  });
  const base = () => {
    const { treinos, exercicios } = gerarSeeds();
    return {
      exercicios: Object.fromEntries(exercicios.map((e) => [e.id, e])) as Record<string, Exercicio>,
      treinos: Object.fromEntries(treinos.map((t) => [t.id, t])) as Record<string, Treino>,
      sessoes: {} as Record<string, Sessao>,
    };
  };

  it("ficha padrão: limpa os nomes, vira etiqueta Pico 2s e preenche o descanso do trabalho", () => {
    const d = base();
    const m = unificarExercicios(d.exercicios, d.treinos, d.sessoes, Q);
    const remada = m.exercicios.find((e) => e.id === seedExercicioId("Remada curvada com barra (2s de pico de contração)"));
    expect(remada?.nome).toBe("Remada curvada com barra");
    const b = m.treinos.find((t) => t.id === "sd_B")!;
    expect(b.exercicios[0].tecnicas).toEqual(["pico2s"]);
    // nada de "—" sobrando nas séries de trabalho da ficha
    for (const t of m.treinos) for (const te of t.exercicios) for (const s of te.series) expect(s.int).not.toBe("—");
    // supino declinado: 2 min, como nos outros programas do curso
    const a = m.treinos.find((t) => t.id === "sd_A")!;
    expect(a.exercicios[2].series.find((s) => s.tipo === "trabalho")!.int).toBe("2 min");
  });

  it("é idempotente: rodar de novo não muda nada", () => {
    const d = base();
    const m1 = unificarExercicios(d.exercicios, d.treinos, d.sessoes, Q);
    for (const e of m1.exercicios) d.exercicios[e.id] = e;
    for (const t of m1.treinos) d.treinos[t.id] = t;
    const m2 = unificarExercicios(d.exercicios, d.treinos, d.sessoes, Q);
    expect(m2).toEqual({ exercicios: [], treinos: [], sessoes: [] });
  });

  it("junta apelidos (Flexor deitado do 4x) no exercício principal sem perder registros", () => {
    const d = base();
    const apelido = ex("Flexor deitado", { midia: { imagens: ["x.jpg"] } });
    d.exercicios[apelido.id] = apelido;
    d.treinos.t1 = {
      id: "t1",
      nome: "Treino B",
      foco: "",
      ordem: 9,
      exercicios: [{ id: "te1", exercicioId: apelido.id, series: [{ tipo: "trabalho", presc: "3 × 10 a 15", int: "1 min" }] }],
      updated_at: Q,
    };
    d.sessoes["2026-09-01|t1"] = {
      id: "2026-09-01|t1",
      data: "2026-09-01",
      treinoId: "t1",
      registros: { "te1:0": { sets: "", kg: "30", reps: "12", rir: "", done: true } },
      obs: "",
      aval: {},
      extras: [{ id: "extra_x", exercicioId: apelido.id, series: [] }],
      updated_at: Q,
    };
    const m = unificarExercicios(d.exercicios, d.treinos, d.sessoes, Q);
    const canon = seedExercicioId("Mesa flexora deitado (2s de pico de contração)");
    expect(m.treinos.find((t) => t.id === "t1")!.exercicios[0].exercicioId).toBe(canon);
    expect(m.treinos.find((t) => t.id === "t1")!.exercicios[0].id).toBe("te1"); // registros continuam valendo
    expect(m.sessoes[0].extras![0].exercicioId).toBe(canon);
    expect(m.exercicios.find((e) => e.id === apelido.id)?.deleted).toBe(true);
  });

  it("quem só tem o apelido ganha o exercício principal (nunca aponta para id inexistente)", () => {
    const apelido = ex("Flexor sentado (2s de pico de contração)");
    const exercicios = { [apelido.id]: apelido };
    const treinos: Record<string, Treino> = {
      t: { id: "t", nome: "D", foco: "", ordem: 0, exercicios: [{ id: "a", exercicioId: apelido.id, series: [] }], updated_at: Q },
    };
    const m = unificarExercicios(exercicios, treinos, {}, Q);
    const novo = m.exercicios.find((e) => e.id === seedExercicioId("Flexor sentado"));
    expect(novo?.nome).toBe("Cadeira flexora (sentado)");
    expect(novo?.deleted).toBeUndefined();
    expect(m.treinos[0].exercicios[0].exercicioId).toBe(novo!.id);
    expect(m.treinos[0].exercicios[0].tecnicas).toEqual(["pico2s"]);
  });

  it("não renomeia exercício que você renomeou", () => {
    const d = base();
    const id = seedExercicioId("Voador com 2s de pico de contração");
    d.exercicios[id] = { ...d.exercicios[id], nome: "Voador da academia nova" };
    const m = unificarExercicios(d.exercicios, d.treinos, d.sessoes, Q);
    expect(m.exercicios.find((e) => e.id === id)).toBeUndefined();
  });
});
