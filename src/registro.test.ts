import { describe, expect, it } from "vitest";
import { estadoRegistro } from "./registro";
import type { Sessao } from "./types";
import { seriesDaLinha } from "./utils";

const HOJE = "2026-10-06";
const s = (extra: Partial<Sessao>): Sessao => ({ id: "x", data: HOJE, treinoId: "t", registros: {}, obs: "", aval: {}, updated_at: "", ...extra });

describe("estadoRegistro (séries só com o treino iniciado)", () => {
  it("hoje, sem iniciar → bloqueado até Iniciar treino", () => expect(estadoRegistro(s({}), HOJE)).toBe("nao-iniciado"));
  it("em andamento → liberado", () => expect(estadoRegistro(s({ inicio: "2026-10-06T10:00:00Z" }), HOJE)).toBe("liberado"));
  it("encerrado hoje → travado até Retomar", () =>
    expect(estadoRegistro(s({ inicio: "2026-10-06T10:00:00Z", fim: "2026-10-06T11:00:00Z" }), HOJE)).toBe("encerrado"));
  it("dia passado → pede Registrar sem cronômetro (mesmo se foi encerrado)", () => {
    expect(estadoRegistro(s({ data: "2026-10-05" }), HOJE)).toBe("passado");
    expect(estadoRegistro(s({ data: "2026-10-05", inicio: "a", fim: "b" }), HOJE)).toBe("passado");
  });
  it("registro sem cronômetro → liberado", () => expect(estadoRegistro(s({ data: "2026-10-05", manual: true }), HOJE)).toBe("liberado"));
  it("dia passado esquecido em andamento continua liberado", () =>
    expect(estadoRegistro(s({ data: "2026-10-05", inicio: "2026-10-05T10:00:00Z" }), HOJE)).toBe("liberado"));
});

describe("quantidade de séries escolhida no dia", () => {
  it("sem escolha usa o máximo da prescrição; com escolha usa o número escolhido", () => {
    expect(seriesDaLinha("1-2 × 10 a 15", "")).toBe(2);
    expect(seriesDaLinha("1-2 × 10 a 15", "1")).toBe(1);
    expect(seriesDaLinha("1 × 6 a 10", "3")).toBe(3);
    expect(seriesDaLinha("1 × 6 a 10", "40")).toBe(12);
  });
});
