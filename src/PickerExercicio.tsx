import { useMemo, useState } from "react";
import { useStore } from "./store";
import { GRUPOS_MUSCULARES } from "./seeds";
import { novoId, agora } from "./types";
import type { Exercicio } from "./types";

/**
 * Seletor da biblioteca de exercícios: busca por nome/grupo, escolhe um
 * existente ou cria um novo na hora. Usado pelo editor de treino e pelo
 * acréscimo de exercício extra na tela Hoje.
 */
export function PickerExercicio({
  titulo = "Adicionar exercício",
  descricao,
  jaEscolhidos,
  onEscolher,
  onFechar,
}: {
  titulo?: string;
  descricao?: string;
  /** ids que já estão na lista de destino — aparecem marcados e sem ação */
  jaEscolhidos?: Set<string>;
  onEscolher(id: string): void;
  onFechar(): void;
}) {
  const st = useStore();
  const [busca, setBusca] = useState("");
  const [criando, setCriando] = useState(false);
  const [grupoNovo, setGrupoNovo] = useState(GRUPOS_MUSCULARES[0]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return Object.values(st.exercicios)
      .filter((e) => !e.deleted && !e.arquivado)
      .filter((e) => !q || e.nome.toLowerCase().includes(q) || e.grupo.toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [st.exercicios, busca]);

  function criarNovo() {
    const nome = busca.trim();
    if (!nome) return;
    const ex: Exercicio = { id: novoId(), nome, grupo: grupoNovo, origem: "proprio", updated_at: agora() };
    st.salvarExercicio(ex);
    onEscolher(ex.id);
  }

  return (
    <dialog open style={{ position: "fixed", top: "8vh", zIndex: 60, margin: "0 auto", left: 0, right: 0 }}>
      <div className="modal-corpo">
        <h3>{titulo}</h3>
        {descricao && <p className="card-sub">{descricao}</p>}
        <input
          className="picker-busca"
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value);
            setCriando(false);
          }}
          placeholder="Buscar por nome ou grupo muscular..."
          autoFocus
        />
        {!criando ? (
          <>
            <div className="picker-lista">
              {lista.map((e) => {
                const jaTem = jaEscolhidos?.has(e.id) ?? false;
                return (
                  <button key={e.id} type="button" disabled={jaTem} onClick={() => onEscolher(e.id)}>
                    {e.nome}
                    <small>
                      {e.grupo}
                      {jaTem ? " · já adicionado" : ""}
                    </small>
                  </button>
                );
              })}
              {lista.length === 0 && <div className="vazio">Nenhum exercício encontrado.</div>}
            </div>
            <div className="acoes" style={{ marginTop: 12 }}>
              <button className="btn btn-pri" type="button" onClick={() => setCriando(true)} disabled={!busca.trim()}>
                Criar "{busca.trim() || "..."}"
              </button>
              <button className="btn btn-sec" type="button" onClick={onFechar}>
                Fechar
              </button>
            </div>
          </>
        ) : (
          <>
            <label className="form-linha">
              <span>Grupo muscular de "{busca.trim()}"</span>
              <select value={grupoNovo} onChange={(e) => setGrupoNovo(e.target.value)}>
                {GRUPOS_MUSCULARES.map((g) => (
                  <option key={g}>{g}</option>
                ))}
              </select>
            </label>
            <div className="acoes">
              <button className="btn btn-pri" type="button" onClick={criarNovo}>
                Criar e adicionar
              </button>
              <button className="btn btn-sec" type="button" onClick={() => setCriando(false)}>
                Voltar
              </button>
            </div>
          </>
        )}
      </div>
    </dialog>
  );
}
