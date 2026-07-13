import { useState } from "react";
import { useStore } from "../store";
import { EditorTreino } from "./EditorTreino";
import { EditorPrograma } from "./EditorPrograma";
import { novoId, agora } from "../types";
import type { Treino, Programa } from "../types";

export function Treinos() {
  const st = useStore();
  const [editandoProgramaId, setEditandoProgramaId] = useState<string | null>(null);

  if (st.editandoTreinoId) return <EditorTreino treinoId={st.editandoTreinoId} />;
  if (editandoProgramaId) return <EditorPrograma programaId={editandoProgramaId} aoVoltar={() => setEditandoProgramaId(null)} />;

  const programas = Object.values(st.programas)
    .filter((p) => !p.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.nome.localeCompare(b.nome, "pt-BR"));
  const ativoId = st.programaAtivo()?.id;

  const todos = Object.values(st.treinos)
    .filter((t) => !t.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.ordem - b.ordem);

  function criarPrograma() {
    const p: Programa = {
      id: novoId(),
      nome: "Novo programa",
      treinoIds: [],
      divisaoSemana: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      updated_at: agora(),
    };
    st.salvarPrograma(p);
    setEditandoProgramaId(p.id);
  }

  function criarTreino() {
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
      <div className="card" style={{ paddingBottom: 10 }}>
        <h3>Programas</h3>
        <p className="card-sub">Um programa agrupa treinos e tem a própria divisão da semana. O ativo guia a tela Hoje.</p>
      </div>
      {programas.map((p) => (
        <div className={`treino-item${p.arquivado ? " arquivado" : ""}`} key={p.id}>
          <div className="nome">
            {p.nome} {p.id === ativoId && <span className="prog-ativo">ativo</span>}
          </div>
          {p.descricao && <div className="foco">{p.descricao}</div>}
          <div className="meta-linha">
            {p.treinoIds.length} treino(s)
            {p.arquivado ? " · arquivado" : ""}
          </div>
          <div className="linha-acoes">
            {p.id !== ativoId && !p.arquivado && (
              <button className="btn-mini laranja" type="button" onClick={() => st.setProgramaAtivo(p.id)}>
                Usar
              </button>
            )}
            <button className="btn-mini laranja" type="button" onClick={() => setEditandoProgramaId(p.id)}>
              Editar
            </button>
            <button className="btn-mini" type="button" onClick={() => st.duplicarPrograma(p.id)}>
              Duplicar
            </button>
            <button className="btn-mini" type="button" onClick={() => st.arquivarPrograma(p.id, !p.arquivado)}>
              {p.arquivado ? "Desarquivar" : "Arquivar"}
            </button>
            <button
              className="btn-mini perigo"
              type="button"
              onClick={() => {
                if (confirm(`Excluir o programa "${p.nome}"? Os treinos e o histórico continuam existindo.`)) st.excluirPrograma(p.id);
              }}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
      <div className="acoes" style={{ marginBottom: 24 }}>
        <button className="btn btn-pri" type="button" onClick={criarPrograma}>
          + Novo programa
        </button>
      </div>

      <div className="card" style={{ paddingBottom: 10 }}>
        <h3>Meus treinos</h3>
        <p className="card-sub">Todos os treinos, de qualquer programa.</p>
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
                if (confirm(`Excluir "${t.nome}"? O histórico de sessões já registradas continua na Evolução.`)) st.excluirTreino(t.id);
              }}
            >
              Excluir
            </button>
          </div>
        </div>
      ))}
      <div className="acoes">
        <button className="btn btn-pri" type="button" onClick={criarTreino}>
          + Novo treino
        </button>
      </div>
    </>
  );
}
