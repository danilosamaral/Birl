import { create } from "zustand";
import { useEffect, useRef, type ReactNode } from "react";
import { Icone } from "./icones";

/**
 * Folha que sobe de baixo: formulários, menus e confirmações no celular
 * (no computador vira uma janela no centro). Fecha no Esc, no X e no toque fora.
 */
export function Folha({
  titulo,
  aoFechar,
  cheia,
  children,
}: {
  titulo: string;
  aoFechar(): void;
  cheia?: boolean;
  children: ReactNode;
}) {
  // a função de fechar muda a cada render; o efeito fica preso à montagem
  const fechar = useRef(aoFechar);
  fechar.current = aoFechar;
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && fechar.current();
    window.addEventListener("keydown", esc);
    // a página por trás não rola enquanto a folha está aberta
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", esc);
      document.body.style.overflow = antes;
    };
  }, []);

  return (
    <div className="folha-fundo" onClick={(e) => e.target === e.currentTarget && aoFechar()}>
      <div className={`folha${cheia ? " cheia" : ""}`} role="dialog" aria-modal="true" aria-label={titulo}>
        <div className="folha-alca" aria-hidden="true" />
        <div className="folha-cab">
          <h3>{titulo}</h3>
          <button className="btn-icone" type="button" onClick={aoFechar} aria-label="Fechar">
            <Icone nome="fechar" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

/* ---------- confirmação de ação destrutiva (no lugar do confirm() do navegador) ---------- */

interface Pedido {
  titulo: string;
  texto: string;
  /** verbo no botão: "Excluir programa", "Limpar dia"… */
  acao: string;
  perigo?: boolean;
  resolver(ok: boolean): void;
}

const useConfirmacao = create<{ pedido: Pedido | null; set(p: Pedido | null): void }>((set) => ({
  pedido: null,
  set: (pedido) => set({ pedido }),
}));

/** Pergunta e devolve true/false: `if (await confirmar({...})) excluir()`. */
export function confirmar(p: Omit<Pedido, "resolver">): Promise<boolean> {
  return new Promise((resolver) => useConfirmacao.getState().set({ perigo: true, ...p, resolver }));
}

export function ConfirmSheet() {
  const { pedido, set } = useConfirmacao();
  if (!pedido) return null;
  const responder = (ok: boolean) => {
    set(null);
    pedido.resolver(ok);
  };
  return (
    <Folha titulo={pedido.titulo} aoFechar={() => responder(false)}>
      <p>{pedido.texto}</p>
      <div className="acoes">
        <button className="btn btn-sec" type="button" onClick={() => responder(false)}>
          Cancelar
        </button>
        <button
          className={`btn ${pedido.perigo ? "btn-perigo-solido" : "btn-pri"}`}
          type="button"
          onClick={() => responder(true)}
        >
          {pedido.acao}
        </button>
      </div>
    </Folha>
  );
}
