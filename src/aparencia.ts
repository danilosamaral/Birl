import { create } from "zustand";

/**
 * Aparência do app: 3 paletas × modo (automático/escuro/claro).
 *
 * Fica no aparelho (localStorage), não na conta: cada celular pode ter a sua
 * (o do treino com a tela clara, o computador escuro…). O index.html aplica a
 * mesma escolha ANTES do React carregar, para a tela não piscar na cor errada.
 */

export type Paleta = "brasa" | "anilha" | "classica";
export type Modo = "auto" | "escuro" | "claro";

export const PALETAS: Array<{ id: Paleta; nome: string; descricao: string; amostra: string[] }> = [
  { id: "brasa", nome: "Ferro & Brasa", descricao: "Grafite e laranja-brasa", amostra: ["#0e1013", "#ff6b2c", "#62c6f5", "#f6c14b"] },
  { id: "anilha", nome: "Anilha", descricao: "Cores das anilhas olímpicas", amostra: ["#121315", "#f2c200", "#5fd28a", "#8db3ff"] },
  { id: "classica", nome: "Clássica", descricao: "O laranja e verde de antes", amostra: ["#0c0c0d", "#f15a22", "#3cc77a", "#f0a93b"] },
];

export const MODOS: Array<{ id: Modo; nome: string }> = [
  { id: "auto", nome: "Automático" },
  { id: "escuro", nome: "Escuro" },
  { id: "claro", nome: "Claro" },
];

const CHAVE = "birl-aparencia";
/** cor da barra do sistema (theme-color) por tema = o --bg de cada um */
const FUNDO: Record<string, string> = {
  "brasa-escuro": "#0e1013",
  "brasa-claro": "#f3f4f1",
  "anilha-escuro": "#121315",
  "anilha-claro": "#f5f5f2",
  "classica-escuro": "#0c0c0d",
  "classica-claro": "#f6f5f3",
};

function ler(): { paleta: Paleta; modo: Modo } {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? "{}") as { paleta?: Paleta; modo?: Modo };
    return {
      paleta: PALETAS.some((p) => p.id === v.paleta) ? v.paleta! : "brasa",
      modo: MODOS.some((m) => m.id === v.modo) ? v.modo! : "auto",
    };
  } catch {
    return { paleta: "brasa", modo: "auto" };
  }
}

const media = typeof window !== "undefined" && window.matchMedia ? window.matchMedia("(prefers-color-scheme: light)") : null;

export function temaEfetivo(paleta: Paleta, modo: Modo): string {
  const claro = modo === "claro" || (modo === "auto" && !!media?.matches);
  return `${paleta}-${claro ? "claro" : "escuro"}`;
}

function aplicar(paleta: Paleta, modo: Modo) {
  const tema = temaEfetivo(paleta, modo);
  document.documentElement.dataset.tema = tema;
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", FUNDO[tema]);
}

interface AparenciaState {
  paleta: Paleta;
  modo: Modo;
  setPaleta(p: Paleta): void;
  setModo(m: Modo): void;
}

export const useAparencia = create<AparenciaState>((set, get) => {
  const inicial = ler();
  if (typeof document !== "undefined") {
    aplicar(inicial.paleta, inicial.modo);
    // modo automático acompanha a troca claro/escuro do aparelho em tempo real
    media?.addEventListener?.("change", () => aplicar(get().paleta, get().modo));
  }
  const salvar = (paleta: Paleta, modo: Modo) => {
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ paleta, modo }));
    } catch {
      // sem armazenamento: vale só até fechar o app
    }
    aplicar(paleta, modo);
    set({ paleta, modo });
  };
  return {
    ...inicial,
    setPaleta: (p) => salvar(p, get().modo),
    setModo: (m) => salvar(get().paleta, m),
  };
});
