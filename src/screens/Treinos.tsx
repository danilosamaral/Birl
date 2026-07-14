import { useState } from "react";
import { useStore } from "../store";
import { EditorTreino } from "./EditorTreino";
import { EditorPrograma } from "./EditorPrograma";
import { CATALOGO } from "../catalogo";
import { novoId, agora } from "../types";
import type { Treino, Programa } from "../types";

export function Treinos() {
  const st = useStore();
  const [editandoProgramaId, setEditandoProgramaId] = useState<string | null>(null);
  const [catalogoAberto, setCatalogoAberto] = useState(false);

  if (st.editandoTreinoId) return <EditorTreino treinoId={st.editandoTreinoId} />;
  if (editandoProgramaId) return <EditorPrograma programaId={editandoProgramaId} aoVoltar={() => setEditandoProgramaId(null)} />;

  const programas = Object.values(st.programas)
    .filter((p) => !p.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.nome.localeCompare(b.nome, "pt-BR"));
  const ativoId = st.programaAtivo()?.id;

  const todos = Object.values(st.treinos)
    .filter((t) => !t.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.ordem - b.ordem);

  // agrupa os treinos por programa (evita o "Treino A" ambíguo entre programas)
  const progsOrdenados = Object.values(st.programas)
    .filter((p) => !p.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.nome.localeCompare(b.nome, "pt-BR"));
  const emAlgumPrograma = new Set(progsOrdenados.flatMap((p) => p.treinoIds));
  const grupos = progsOrdenados.map((p) => ({
    titulo: p.nome + (p.arquivado ? " (arquivado)" : ""),
    treinos: p.treinoIds.map((id) => st.treinos[id]).filter((t) => t && !t.deleted),
  }));
  const orfaos = todos.filter((t) => !emAlgumPrograma.has(t.id));
  if (orfaos.length) grupos.push({ titulo: "Sem programa", treinos: orfaos });

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
        <button className="btn btn-sec" type="button" onClick={() => setCatalogoAberto(true)}>
          + Programa pronto
        </button>
      </div>

      {catalogoAberto && (
        <CatalogoModal
          onFechar={() => setCatalogoAberto(false)}
          onEditar={(id) => {
            setCatalogoAberto(false);
            setEditandoProgramaId(id);
          }}
        />
      )}

      <div className="card" style={{ paddingBottom: 10 }}>
        <h3>Meus treinos</h3>
        <p className="card-sub">Agrupados por programa — o "Treino A" de cada programa é independente.</p>
      </div>
      {todos.length === 0 && <div className="vazio">Nenhum treino ainda. Crie o primeiro!</div>}
      {grupos.map((g) => (
        <div key={g.titulo}>
          <div className="grupo-programa">{g.titulo}</div>
          {g.treinos.length === 0 && <div className="meta-linha" style={{ padding: "0 4px 10px" }}>Sem treinos.</div>}
          {g.treinos.map((t) => (
            <TreinoItem key={t.id} treino={t} />
          ))}
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

function TreinoItem({ treino: t }: { treino: Treino }) {
  const st = useStore();
  return (
    <div className={`treino-item${t.arquivado ? " arquivado" : ""}`}>
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
  );
}

const DIAS_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];

function CatalogoModal({ onFechar, onEditar }: { onFechar(): void; onEditar(programaId: string): void }) {
  const st = useStore();
  const jaTem = new Set(
    Object.values(st.programas)
      .filter((p) => !p.deleted)
      .map((p) => p.nome)
  );

  function adicionar(templateId: string) {
    const id = st.adicionarProgramaDoCatalogo(templateId);
    if (id) onEditar(id);
  }

  return (
    <dialog open style={{ position: "fixed", top: "8vh", zIndex: 60, margin: "0 auto", left: 0, right: 0, maxHeight: "84vh", overflowY: "auto" }}>
      <div className="modal-corpo">
        <h3>Programas prontos</h3>
        <p>Adicione um programa completo. Ele vira um programa seu, editável, sem alterar os demais.</p>
        {CATALOGO.map((tpl) => {
          const dias = [1, 2, 3, 4, 5, 6, 0]
            .filter((d) => tpl.divisaoSemana[d] != null)
            .map((d) => DIAS_ABREV[d])
            .join(" · ");
          return (
            <div className="cat-item" key={tpl.id}>
              <div className="cat-info">
                <div className="cat-nome">{tpl.nome}</div>
                <div className="cat-meta">{tpl.origem}</div>
                <div className="cat-meta">
                  {tpl.treinos.length} treinos · {dias}
                </div>
              </div>
              <button className="btn-mini laranja" type="button" onClick={() => adicionar(tpl.id)}>
                {jaTem.has(tpl.nome) ? "Adicionar +1" : "Adicionar"}
              </button>
            </div>
          );
        })}
        <div className="acoes" style={{ marginTop: 12 }}>
          <button className="btn btn-sec" type="button" onClick={onFechar}>
            Fechar
          </button>
        </div>
      </div>
    </dialog>
  );
}
