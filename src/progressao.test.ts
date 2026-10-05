import { describe, expect, it } from "vitest";
import { faixaDeReps, sugerirCarga, ultimoTrabalho } from "./progressao";
import type { Sessao, Treino } from "./types";
import { planoDoDia, semanaDoPrograma } from "./utils";
import type { Programa } from "./types";

describe("faixaDeReps", () => {
  it.each([
    ["1 × 6 a 10", [6, 10]],
    ["2 × 10 a 15", [10, 15]],
    ["1-2 × 4 a 6", [4, 6]],
    ["3 × 12", [12, 12]],
    ["3 × RM", null],
  ])("%s", (p, f) => expect(faixaDeReps(p)).toEqual(f));
});

describe("sugerirCarga (regra do PDF)", () => {
  const u = (kg: number, reps: number) => ({ data: "2026-09-29", kg, reps });
  it("passou do máximo → sobe 2,5 kg", () => expect(sugerirCarga("1 × 6 a 10", u(30, 11), "Supino reto")).toMatchObject({ direcao: "subir", kg: 32.5 }));
  it("leg/agachamento sobem 5 kg", () => expect(sugerirCarga("1 × 6 a 10", u(200, 12), "Leg 45")).toMatchObject({ direcao: "subir", kg: 205 }));
  it("abaixo do mínimo → baixa", () => expect(sugerirCarga("1 × 6 a 10", u(30, 4), "Voador")).toMatchObject({ direcao: "baixar", kg: 27.5 }));
  it("dentro da faixa → mantém", () => expect(sugerirCarga("1 × 6 a 10", u(30, 8), "Voador")).toMatchObject({ direcao: "manter", kg: 30 }));
  it("RM ou sem histórico → nada", () => {
    expect(sugerirCarga("3 × RM", u(10, 20), "Abdominal")).toBeNull();
    expect(sugerirCarga("1 × 6 a 10", null, "X")).toBeNull();
  });
});

describe("ultimoTrabalho", () => {
  const treinos: Record<string, Treino> = {
    a: {
      id: "a", nome: "A", foco: "", ordem: 0, updated_at: "",
      exercicios: [{ id: "ta", exercicioId: "supino", series: [{ tipo: "ajuste", presc: "1 × 4 a 6", int: "1 min" }, { tipo: "trabalho", presc: "1 × 6 a 10", int: "2 min" }] }],
    },
    b: {
      id: "b", nome: "B outro programa", foco: "", ordem: 1, updated_at: "",
      exercicios: [{ id: "tb", exercicioId: "supino", series: [{ tipo: "trabalho", presc: "2 × 6 a 10", int: "2 min" }] }],
    },
  };
  const sess = (data: string, treinoId: string, registros: Sessao["registros"]): Sessao => ({ id: `${data}|${treinoId}`, data, treinoId, registros, obs: "", aval: {}, updated_at: "" });
  const r = (kg: string, reps: string) => ({ sets: "", kg, reps, rir: "", done: true });

  it("acha a última série de trabalho do exercício em outro programa, ignorando o ajuste", () => {
    const s = [sess("2026-09-01", "a", { "ta:0": r("40", "5"), "ta:1": r("30", "9") }), sess("2026-09-10", "b", { "tb:0": r("32,5", "7") })];
    expect(ultimoTrabalho("supino", s, treinos, "2026-09-20")).toEqual({ data: "2026-09-10", kg: 32.5, reps: 7 });
    expect(ultimoTrabalho("supino", s, treinos, "2026-09-10")).toEqual({ data: "2026-09-01", kg: 30, reps: 9 });
  });
});

describe("adaptação para sedentários", () => {
  const prog: Programa = { id: "p", nome: "Adaptação", treinoIds: ["t"], divisaoSemana: {}, sedentario: true, updated_at: "" };
  const treino: Treino = { id: "t", nome: "Corpo inteiro", foco: "", ordem: 0, updated_at: "", exercicios: [{ id: "e", exercicioId: "x", series: [{ tipo: "trabalho", presc: "3 × 10 a 15", int: "1 min" }] }] };
  const feito = (data: string): Sessao => ({ id: `${data}|t`, data, treinoId: "t", registros: { "e:0": { sets: "", kg: "10", reps: "12", rir: "", done: true } }, obs: "", aval: {}, updated_at: "" });

  it("semana 1 → 1 série, semana 2 → 2, semana 3 → normal", () => {
    const sessoes = { a: feito("2026-10-05") };
    expect(semanaDoPrograma(prog, sessoes, "2026-10-05")).toBe(1);
    expect(planoDoDia(treino, prog, sessoes, "2026-10-08").exercicios[0].series[0].presc).toBe("1 × 10 a 15");
    expect(planoDoDia(treino, prog, sessoes, "2026-10-12").exercicios[0].series[0].presc).toBe("2 × 10 a 15");
    expect(planoDoDia(treino, prog, sessoes, "2026-10-19").exercicios[0].series[0].presc).toBe("3 × 10 a 15");
  });
  it("sem a opção, o plano não muda", () => {
    expect(planoDoDia(treino, { ...prog, sedentario: false }, {}, "2026-10-05")).toBe(treino);
  });
});
