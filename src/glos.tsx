import { create } from "zustand";
import { GLOSSARIO, GLOSSARIO_ORDEM } from "./glossario";
import { Folha } from "./folha";

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
  const g = termo ? GLOSSARIO[termo] : null;
  if (!g) return null;
  return (
    <Folha titulo={g.t} aoFechar={fechar}>
      <p>{g.d}</p>
      <div className="acoes">
        <button className="btn btn-sec" type="button" onClick={fechar}>
          Entendi
        </button>
      </div>
    </Folha>
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
            {GLOSSARIO[k].t.split(" — ")[0]}
          </button>
        ))}
      </div>
    </>
  );
}
