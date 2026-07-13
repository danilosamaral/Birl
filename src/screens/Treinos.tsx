import { useStore } from "../store";
import { EditorTreino } from "./EditorTreino";
import { novoId, agora } from "../types";
import type { Treino } from "../types";

export function Treinos() {
  const st = useStore();

  if (st.editandoTreinoId) return <EditorTreino treinoId={st.editandoTreinoId} />;

  const todos = Object.values(st.treinos)
    .filter((t) => !t.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.ordem - b.ordem);

  function criar() {
    const t: Treino = {
      id: novoId(),
      nome: "Novo treino",
      foco: "",
      ordem: Math.max(...todos.map((t) => t.ordem), -1) + 1,
      exercicios: [],
      updated_at: agora(),
    };
    st.salvarTreino(t);
    st.setEditandoTreino(t.id);
  }

  return (
    <>
      <div className="acoes" style={{ marginBottom: 16 }}>
        <button className="btn btn-pri" type="button" onClick={criar}>
          + Novo treino
        </button>
      </div>
      {todos.length === 0 && <div className="vazio">Nenhum treino ainda. Crie o primeiro!</div>}
      {todos.map((t) => (
        <div className={`treino-item${t.arquivado ? " arquivado" : ""}`} key={t.id}>
          <div className="nome">{t.nome}</div>
          {t.foco && <div className="foco">{t.foco}</div>}
          <div className="meta-linha">
            {t.exercicios.length} exercício(s)
            {t.arquivado ? " · arquivado" : ""}
          </div>
          <div className="linha-acoes">
            <button className="btn-mini laranja" type="button" onClick={() => st.setEditandoTreino(t.id)}>
              Editar
            </button>
            <button className="btn-mini" type="button" onClick={() => st.duplicarTreino(t.id)}>
              Duplicar
            </button>
            <button className="btn-mini" type="button" onClick={() => st.arquivarTreino(t.id, !t.arquivado)}>
              {t.arquivado ? "Desarquivar" : "Arquivar"}
            </button>
            <button
              className="btn-mini perigo"
              type="button"
              onClick={() => {
                if (confirm(`Excluir "${t.nome}"? O histórico de sessões já registradas continua na Evolução.`))
                  st.excluirTreino(t.id);
              }}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
    </>
  );
}
