import { describe, expect, it } from "vitest";
import { CATALOGO, exercicioNovoDoCatalogo, idDoItemCatalogo } from "./catalogo";
import { gerarBiblioteca } from "./biblioteca";
import { GRUPOS_MUSCULARES, seedExercicioId } from "./seeds";
import { proximaEtapa, proximoDaTrilha, trilhaOrdenada } from "./trilha";
import type { Exercicio, Programa, Sessao, Treino } from "./types";
import { unificarExercicios } from "./unificacao";
import { planoDoDia, semanaDeReentrada } from "./utils";

const rugby = CATALOGO.find((t) => t.id === "cat_rugby_f1_base")!;
const tpl = (id: string) => CATALOGO.find((t) => t.id === id)!;

describe("Rugby · Fase 1 no catálogo", () => {
  it("fica fora da trilha do curso", () => {
    expect(trilhaOrdenada().map((t) => t.id)).not.toContain(rugby.id);
    expect(trilhaOrdenada("rugby").map((t) => t.id)).toEqual([rugby.id]);
    // a fila do curso continua igual: ABCD → ABCDE superiores
    expect(proximoDaTrilha(tpl("cat_abcd"))?.id).toBe("cat_abcde_superiores");
    // e o Rugby nunca aponta para um programa do curso
    expect(proximoDaTrilha(rugby)).toBeNull();
  });

  it("4 treinos seg A · ter B · qui C · sex D, com o grupo Pescoço e o encolhimento em Trapézio", () => {
    expect(rugby.divisaoSemana).toEqual({ 0: null, 1: 0, 2: 1, 3: null, 4: 2, 5: 3, 6: null });
    const todos = rugby.treinos.flatMap((t) => t.exercicios);
    expect(GRUPOS_MUSCULARES).toContain("Pescoço");
    expect(todos.find((e) => e.nome.startsWith("Extensão de pescoço"))!.grupo).toBe("Pescoço");
    expect(todos.find((e) => e.nome === "Encolhimento com halteres")!.grupo).toBe("Trapézio");
    for (const e of todos) expect(GRUPOS_MUSCULARES, e.nome).toContain(e.grupo);
  });

  it("potência (salto e balanço) é Explosivo", () => {
    const todos = rugby.treinos.flatMap((t) => t.exercicios);
    expect(todos.filter((e) => e.tecnicas?.includes("explosivo")).map((e) => e.nome)).toEqual(["Salto no caixote", "Balanço com kettlebell"]);
  });
});

describe("exercícios que já existiam na biblioteca", () => {
  it("afundo búlgaro e encolhimento usam o exercício da biblioteca, não um repetido", () => {
    const todos = rugby.treinos.flatMap((t) => t.exercicios);
    expect(idDoItemCatalogo(todos.find((e) => e.nome === "Afundo búlgaro com halteres")!)).toBe("sd_lib_Split_Squat_with_Dumbbells");
    expect(idDoItemCatalogo(todos.find((e) => e.nome === "Encolhimento com halteres")!)).toBe("sd_lib_Dumbbell_Shrug");
  });

  it("qualquer nome da biblioteca aponta para ela (não só os unificados)", () => {
    expect(idDoItemCatalogo({ nome: "Face pull", grupo: "Costas", series: [] })).toBe("sd_lib_Face_Pull");
    expect(idDoItemCatalogo({ nome: "Exercício inventado", grupo: "Outro", series: [] })).toBe(seedExercicioId("Exercício inventado"));
  });

  it("o búlgaro da biblioteca já se chama Afundo búlgaro com halteres", () => {
    expect(gerarBiblioteca().find((e) => e.id === "sd_lib_Split_Squat_with_Dumbbells")!.nome).toBe("Afundo búlgaro com halteres");
  });

  it("quem já tinha 'Agachamento búlgaro' na biblioteca recebe o nome novo (mesmo id, mesmo histórico)", () => {
    const Q = "2026-10-14T00:00:00.000Z";
    const antigo: Exercicio = { id: "sd_lib_Split_Squat_with_Dumbbells", nome: "Agachamento búlgaro", grupo: "Quadríceps", origem: "seed", updated_at: "2026-01-02T00:00:00.000Z" };
    const m = unificarExercicios({ [antigo.id]: antigo }, {}, {}, Q);
    expect(m.exercicios).toEqual([{ ...antigo, nome: "Afundo búlgaro com halteres", updated_at: Q }]);
  });

  it("exercício novo chega com equipamento, passos e foto", () => {
    const balanco = rugby.treinos[2].exercicios[0];
    const e = exercicioNovoDoCatalogo(balanco);
    expect(e.equipamento).toBe("Kettlebell (ou halter segurado pela ponta)");
    expect(e.instrucoes!.split("\n")).toHaveLength(3);
    expect(e.midia?.imagens?.[0]).toContain("One-Arm_Kettlebell_Swings");
  });
});

describe("reentrada (volta de pausa)", () => {
  const prog: Programa = { id: "p", nome: "Rugby", treinoIds: ["t"], divisaoSemana: {}, reentrada: true, updated_at: "" };
  const treino: Treino = {
    id: "t",
    nome: "Treino A",
    foco: "",
    ordem: 0,
    updated_at: "",
    exercicios: [
      {
        id: "e",
        exercicioId: "x",
        series: [
          { tipo: "aquecimento", presc: "1-2 × 10 a 15", int: "1 min" },
          { tipo: "ajuste", presc: "1-2 × 4 a 6", int: "1 a 2 min" },
          { tipo: "trabalho", presc: "3 × 8 a 12", int: "2 a 3 min" },
        ],
      },
    ],
  };
  const feito = (data: string): Sessao => ({ id: `${data}|t`, data, treinoId: "t", registros: {}, obs: "", aval: {}, inicio: `${data}T10:00:00Z`, updated_at: "" });
  const sessoes = { a: feito("2026-10-05") };
  const series = (data: string) => planoDoDia(treino, prog, sessoes, data).exercicios[0].series.map((s) => s.presc);

  it("semanas 1 e 2: só o trabalho cai para 1 série; semana 3: plano normal", () => {
    expect(series("2026-10-05")).toEqual(["1-2 × 10 a 15", "1-2 × 4 a 6", "1 × 8 a 12"]);
    expect(series("2026-10-14")).toEqual(["1-2 × 10 a 15", "1-2 × 4 a 6", "1 × 8 a 12"]);
    expect(series("2026-10-19")).toEqual(["1-2 × 10 a 15", "1-2 × 4 a 6", "3 × 8 a 12"]);
  });

  it("o lembrete conta a semana e some depois da 2ª", () => {
    expect(semanaDeReentrada(prog, "t", sessoes, "2026-10-05")).toBe(1);
    expect(semanaDeReentrada(prog, "t", sessoes, "2026-10-12")).toBe(2);
    expect(semanaDeReentrada(prog, "t", sessoes, "2026-10-19")).toBeNull();
    expect(semanaDeReentrada({ ...prog, reentrada: false }, "t", sessoes, "2026-10-05")).toBeNull();
  });

  it("sem a opção, o plano não muda", () => {
    expect(planoDoDia(treino, { ...prog, reentrada: false }, {}, "2026-10-05")).toBe(treino);
  });
});

describe("fim da Fase 1: hora da reavaliação", () => {
  const ids = ["a", "b", "c", "d"];
  const prog: Programa = { id: "p", nome: rugby.nome, catalogoId: rugby.id, treinoIds: ids, divisaoSemana: {}, updated_at: "" };
  // 8 semanas × 4 treinos, começando numa segunda
  const sessoes: Record<string, Sessao> = {};
  for (let s = 0; s < 8; s++)
    for (const [i, d] of [0, 1, 3, 4].entries()) {
      const data = new Date(Date.UTC(2026, 7, 3 + s * 7 + d)).toISOString().slice(0, 10);
      sessoes[`${data}|${ids[i]}`] = { id: `${data}|${ids[i]}`, data, treinoId: ids[i], registros: {}, obs: "", aval: {}, inicio: `${data}T10:00:00Z`, updated_at: "" };
    }

  it("antes das 8 semanas, nada", () => {
    expect(proximaEtapa(prog, { p: prog }, sessoes, "2026-09-25")).toBeNull();
  });

  it("depois, avisa a reavaliação e a próxima fase, sem sugerir programa do curso", () => {
    const e = proximaEtapa(prog, { p: prog }, sessoes, "2026-10-05");
    expect(e?.proxima).toBeNull();
    expect(e?.reavaliar).toBe("Fase 2 · Força");
    expect(e?.texto).toContain("8 semanas de Rugby · Fase 1 · Base (32 treinos)");
  });
});
