import { create } from "zustand";
import { useEffect, useRef } from "react";
import { GLOSSARIO, GLOSSARIO_ORDEM } from "./glossario";

interface GlosState {
  termo: string | null;
  abrir(termo: string): void;
  fechar(): void;
}

export const useGlos = create<GlosState>((set) => ({
  termo: null,
  abrir: (termo) => set({ termo }),
  fechar: () => set({ termo: null }),
}));

export function GlosModal() {
  const { termo, fechar } = useGlos();
  const ref = useRef<HTMLDialogElement>(null);
  const g = termo ? GLOSSARIO[termo] : null;

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (g && !d.open) d.showModal();
    if (!g && d.open) d.close();
  }, [g]);

  return (
    <dialog ref={ref} onClose={fechar}>
      <div className="modal-corpo">
        <h3>{g?.t}</h3>
        <p style={{ color: "#d9d9dc", fontSize: ".95rem" }}>{g?.d}</p>
        <div className="acoes">
          <button className="btn btn-sec" type="button" onClick={fechar}>
            Entendi
          </button>
        </div>
      </div>
    </dialog>
  );
}

export function ListaGlossario() {
  const abrir = useGlos((s) => s.abrir);
  return (
    <>
      <p className="glos-titulo-lista">Glossário — toque para ver a explicação</p>
      <div className="glos-lista">
        {GLOSSARIO_ORDEM.map((k) => (
          <button key={k} type="button" onClick={() => abrir(k)}>
            {GLOSSARIO[k].t.split(" — ")[0].replace('Campo "Séries"', "Séries")}
          </button>
        ))}
      </div>
    </>
  );
}
