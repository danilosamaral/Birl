import { useMemo, useState } from "react";
import { useStore } from "../store";
import { useDetalheEx } from "../detalhe";
import { GRUPOS_MUSCULARES } from "../seeds";
import { novoId, agora } from "../types";
import type { Exercicio } from "../types";

export function Biblioteca() {
  const st = useStore();
  const abrir = useDetalheEx((s) => s.abrir);
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<string | null>(null);

  const todos = useMemo(
    () => Object.values(st.exercicios).filter((e) => !e.deleted && !e.arquivado),
    [st.exercicios]
  );
  const grupos = useMemo(() => {
    const presentes = new Set(todos.map((e) => e.grupo));
    return GRUPOS_MUSCULARES.filter((g) => presentes.has(g));
  }, [todos]);

  const lista = useMemo(() => {
    const q = busca.trim().toLowerCase();
    return todos
      .filter((e) => !grupo || e.grupo === grupo)
      .filter((e) => !q || e.nome.toLowerCase().includes(q) || (e.equipamento ?? "").toLowerCase().includes(q))
      .sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  }, [todos, busca, grupo]);

  function criarNovo() {
    const ex: Exercicio = {
      id: novoId(),
      nome: busca.trim() || "Novo exercício",
      grupo: grupo ?? GRUPOS_MUSCULARES[0],
      origem: "proprio",
      updated_at: agora(),
    };
    st.salvarExercicio(ex);
    abrir(ex.id, true);
  }

  return (
    <>
      <input className="picker-busca" value={busca} onChange={(e) => setBusca(e.target.value)} placeholder="Buscar exercício ou equipamento..." />
      <div className="chips">
        <button type="button" className={grupo === null ? "ativo" : ""} onClick={() => setGrupo(null)}>
          Todos
        </button>
        {grupos.map((g) => (
          <button key={g} type="button" className={grupo === g ? "ativo" : ""} onClick={() => setGrupo(grupo === g ? null : g)}>
            {g}
          </button>
        ))}
      </div>

      <div className="acoes" style={{ margin: "12px 0" }}>
        <button className="btn btn-pri" type="button" onClick={criarNovo}>
          + Novo exercício
        </button>
      </div>

      <p className="card-sub" style={{ margin: "0 0 10px" }}>
        {lista.length} exercício(s) · toque para ver execução e postura
      </p>

      {lista.map((e) => (
        <button key={e.id} type="button" className="bib-item" onClick={() => abrir(e.id)}>
          {e.midia?.imagens?.[0] ? (
            <img className="bib-thumb" src={e.midia.imagens[0]} alt="" loading="lazy" />
          ) : (
            <span className="bib-thumb vazia">🏋️</span>
          )}
          <span className="bib-info">
            <span className="bib-nome">{e.nome}</span>
            <span className="bib-meta">
              {e.grupo}
              {e.equipamento ? ` · ${e.equipamento}` : ""}
              {e.origem === "proprio" ? " · seu" : ""}
            </span>
          </span>
          <span className="bib-seta">›</span>
        </button>
      ))}
      {lista.length === 0 && <div className="vazio">Nenhum exercício encontrado — crie um novo acima.</div>}
    </>
  );
}
