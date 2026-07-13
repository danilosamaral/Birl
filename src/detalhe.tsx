import { create } from "zustand";
import { useEffect, useRef, useState } from "react";
import { useStore } from "./store";
import { GRUPOS_MUSCULARES } from "./seeds";
import type { Exercicio } from "./types";

/** Modal global de detalhe/edição de exercício (aberto da Biblioteca, do Hoje e do editor). */

interface DetState {
  exId: string | null;
  editando: boolean;
  abrir(id: string, editar?: boolean): void;
  fechar(): void;
}

export const useDetalheEx = create<DetState>((set) => ({
  exId: null,
  editando: false,
  abrir: (exId, editar = false) => set({ exId, editando: editar }),
  fechar: () => set({ exId: null, editando: false }),
}));

/** Redimensiona uma foto para no máx. 900px e retorna data URL JPEG (~100-200 KB). */
export function redimensionarImagem(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const max = 900;
      const escala = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * escala);
      canvas.height = Math.round(img.height * escala);
      canvas.getContext("2d")!.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.8));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("imagem inválida"));
    };
    img.src = url;
  });
}

export function linkVideoValido(url: string): boolean {
  return /^https?:\/\//i.test(url.trim());
}

export function DetalheExercicioModal() {
  const { exId, editando, fechar } = useDetalheEx();
  const st = useStore();
  const ex = exId ? st.exercicios[exId] : null;

  if (!ex) return null;
  return (
    <dialog open style={{ position: "fixed", top: "5vh", zIndex: 70, margin: "0 auto", left: 0, right: 0, maxHeight: "88vh", overflowY: "auto" }}>
      <div className="modal-corpo">
        {editando ? <FormExercicio ex={ex} aoFechar={fechar} /> : <VisaoExercicio ex={ex} />}
      </div>
    </dialog>
  );
}

function VisaoExercicio({ ex }: { ex: Exercicio }) {
  const { fechar, abrir } = useDetalheEx();
  const imagens = ex.midia?.imagens ?? [];
  const passos = (ex.instrucoes ?? "").split("\n").filter(Boolean);
  return (
    <>
      <h3>{ex.nome}</h3>
      <p>
        {ex.grupo}
        {ex.equipamento ? ` · ${ex.equipamento}` : ""}
      </p>
      {imagens.length > 0 && (
        <div className="detalhe-imgs">
          {imagens.map((src, i) => (
            <img key={i} src={src} alt={`Execução de ${ex.nome} — posição ${i + 1}`} loading="lazy" />
          ))}
        </div>
      )}
      {passos.length > 0 && (
        <ol className="passos">
          {passos.map((p, i) => (
            <li key={i}>{p}</li>
          ))}
        </ol>
      )}
      {imagens.length === 0 && passos.length === 0 && (
        <p>Sem imagens ou instruções ainda — toque em Editar para adicionar foto de postura, passos ou um link de vídeo.</p>
      )}
      {ex.midia?.video && (
        <div className="acoes" style={{ marginBottom: 10 }}>
          <a className="btn btn-sec" style={{ textAlign: "center", textDecoration: "none", lineHeight: "22px" }} href={ex.midia.video} target="_blank" rel="noreferrer">
            ▶ Ver vídeo
          </a>
        </div>
      )}
      <div className="acoes">
        <button className="btn btn-sec" type="button" onClick={() => abrir(ex.id, true)}>
          Editar
        </button>
        <button className="btn btn-pri" type="button" onClick={fechar}>
          Fechar
        </button>
      </div>
    </>
  );
}

function FormExercicio({ ex, aoFechar }: { ex: Exercicio; aoFechar(): void }) {
  const st = useStore();
  const abrir = useDetalheEx((s) => s.abrir);
  const fileRef = useRef<HTMLInputElement>(null);
  const [rasc, setRasc] = useState<Exercicio>({ ...ex, midia: { imagens: [...(ex.midia?.imagens ?? [])], video: ex.midia?.video } });
  const [msg, setMsg] = useState("");

  useEffect(() => {
    setRasc({ ...ex, midia: { imagens: [...(ex.midia?.imagens ?? [])], video: ex.midia?.video } });
  }, [ex.id]);

  async function adicionarFoto(files: FileList | null) {
    if (!files?.length) return;
    try {
      const data = await redimensionarImagem(files[0]);
      setRasc((r) => ({ ...r, midia: { ...r.midia, imagens: [...(r.midia?.imagens ?? []), data] } }));
    } catch {
      setMsg("Não consegui ler essa imagem.");
    }
  }

  function salvar() {
    if (!rasc.nome.trim()) {
      setMsg("Dê um nome ao exercício.");
      return;
    }
    const video = (rasc.midia?.video ?? "").trim();
    if (video && !linkVideoValido(video)) {
      setMsg("O link de vídeo precisa começar com http(s)://");
      return;
    }
    const midia = {
      ...(rasc.midia?.imagens?.length ? { imagens: rasc.midia.imagens } : {}),
      ...(video ? { video } : {}),
    };
    st.salvarExercicio({
      ...rasc,
      nome: rasc.nome.trim(),
      midia: Object.keys(midia).length ? midia : undefined,
      instrucoes: rasc.instrucoes?.trim() || undefined,
      equipamento: rasc.equipamento?.trim() || undefined,
    });
    abrir(rasc.id, false);
  }

  return (
    <>
      <h3>Editar exercício</h3>
      <label className="form-linha">
        <span>Nome</span>
        <input value={rasc.nome} onChange={(e) => setRasc({ ...rasc, nome: e.target.value })} />
      </label>
      <label className="form-linha">
        <span>Grupo muscular</span>
        <select value={rasc.grupo} onChange={(e) => setRasc({ ...rasc, grupo: e.target.value })}>
          {GRUPOS_MUSCULARES.map((g) => (
            <option key={g}>{g}</option>
          ))}
          {!GRUPOS_MUSCULARES.includes(rasc.grupo) && <option>{rasc.grupo}</option>}
        </select>
      </label>
      <label className="form-linha">
        <span>Equipamento</span>
        <input value={rasc.equipamento ?? ""} onChange={(e) => setRasc({ ...rasc, equipamento: e.target.value })} placeholder="Halteres, máquina, cabo..." />
      </label>
      <label className="form-linha">
        <span>Instruções de execução (um passo por linha)</span>
        <textarea
          value={rasc.instrucoes ?? ""}
          onChange={(e) => setRasc({ ...rasc, instrucoes: e.target.value })}
          placeholder={"Ajuste o banco...\nDesça controlado...\nSuba contraindo..."}
        />
      </label>
      <label className="form-linha">
        <span>Link de vídeo (YouTube etc.)</span>
        <input
          value={rasc.midia?.video ?? ""}
          onChange={(e) => setRasc({ ...rasc, midia: { ...rasc.midia, video: e.target.value } })}
          placeholder="https://..."
          inputMode="url"
        />
      </label>

      <div className="form-linha">
        <span>Fotos de postura</span>
        {(rasc.midia?.imagens?.length ?? 0) > 0 && (
          <div className="detalhe-imgs editavel">
            {rasc.midia!.imagens!.map((src, i) => (
              <div key={i} className="img-wrap">
                <img src={src} alt={`Imagem ${i + 1}`} loading="lazy" />
                <button
                  className="btn-mini perigo"
                  type="button"
                  onClick={() =>
                    setRasc((r) => ({ ...r, midia: { ...r.midia, imagens: r.midia!.imagens!.filter((_, j) => j !== i) } }))
                  }
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={(e) => void adicionarFoto(e.target.files)} />
        <button className="btn-mini laranja" type="button" onClick={() => fileRef.current?.click()}>
          + Adicionar foto
        </button>
      </div>

      <p className="msg-aviso">{msg}</p>
      <div className="acoes">
        <button className="btn btn-pri" type="button" onClick={salvar}>
          Salvar
        </button>
        <button className="btn btn-sec" type="button" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </>
  );
}
