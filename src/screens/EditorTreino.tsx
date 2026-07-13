import { useMemo, useState } from "react";
import { useStore } from "../store";
import { GRUPOS_MUSCULARES } from "../seeds";
import { novoId, agora, ROTULO_TIPO } from "../types";
import type { Treino, TreinoExercicio, SeriePlano, TipoSerie, Exercicio } from "../types";

const TIPOS: TipoSerie[] = ["aquecimento", "ajuste", "trabalho"];

export function EditorTreino({ treinoId }: { treinoId: string }) {
  const st = useStore();
  const treino = st.treinos[treinoId];
  const [pickerAberto, setPickerAberto] = useState(false);

  if (!treino) {
    return (
      <div className="vazio">
        Treino não encontrado.
        <div className="acoes" style={{ marginTop: 12 }}>
          <button className="btn btn-sec" type="button" onClick={() => st.setEditandoTreino(null)}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  function mutar(fn: (t: Treino) => void) {
    const copia: Treino = { ...treino, exercicios: treino.exercicios.map((te) => ({ ...te, series: te.series.map((s) => ({ ...s })) })) };
    fn(copia);
    st.salvarTreino(copia);
  }

  function mover(i: number, delta: number) {
    mutar((t) => {
      const j = i + delta;
      if (j < 0 || j >= t.exercicios.length) return;
      [t.exercicios[i], t.exercicios[j]] = [t.exercicios[j], t.exercicios[i]];
    });
  }

  function adicionarExercicio(exercicioId: string) {
    mutar((t) => {
      t.exercicios.push({
        id: novoId(),
        exercicioId,
        series: [
          { tipo: "aquecimento", presc: "1-2 × 10 a 15", int: "1 min" },
          { tipo: "ajuste", presc: "1-2 × 4 a 6", int: "1 a 2 min" },
          { tipo: "trabalho", presc: "1 × 6 a 10", int: "—" },
        ],
      });
    });
    setPickerAberto(false);
  }

  return (
    <>
      <div className="acoes" style={{ marginBottom: 16 }}>
        <button className="btn btn-sec" type="button" onClick={() => st.setEditandoTreino(null)}>
          ‹ Voltar aos treinos
        </button>
      </div>

      <div className="card">
        <label className="form-linha">
          <span>Nome do treino</span>
          <input value={treino.nome} onChange={(e) => mutar((t) => (t.nome = e.target.value))} placeholder="Treino A" />
        </label>
        <label className="form-linha" style={{ marginBottom: 0 }}>
          <span>Foco (grupos trabalhados)</span>
          <input value={treino.foco} onChange={(e) => mutar((t) => (t.foco = e.target.value))} placeholder="Peito · Bíceps · Abdômen" />
        </label>
      </div>

      {treino.exercicios.map((te, i) => (
        <EditorExercicio
          key={te.id}
          te={te}
          exercicio={st.exercicios[te.exercicioId]}
          podeSubir={i > 0}
          podeDescer={i < treino.exercicios.length - 1}
          onSubir={() => mover(i, -1)}
          onDescer={() => mover(i, 1)}
          onRemover={() => {
            const nome = st.exercicios[te.exercicioId]?.nome ?? "exercício";
            if (confirm(`Remover "${nome}" deste treino? O histórico já registrado continua na Evolução.`))
              mutar((t) => t.exercicios.splice(i, 1));
          }}
          onMutar={(fn) => mutar((t) => fn(t.exercicios[i]))}
        />
      ))}

      <div className="acoes">
        <button className="btn btn-pri" type="button" onClick={() => setPickerAberto(true)}>
          + Adicionar exercício
        </button>
      </div>

      {pickerAberto && <PickerExercicio onEscolher={adicionarExercicio} onFechar={() => setPickerAberto(false)} />}
    </>
  );
}

function EditorExercicio({
  te,
  exercicio,
  podeSubir,
  podeDescer,
  onSubir,
  onDescer,
  onRemover,
  onMutar,
}: {
  te: TreinoExercicio;
  exercicio?: Exercicio;
  podeSubir: boolean;
  podeDescer: boolean;
  onSubir(): void;
  onDescer(): void;
  onRemover(): void;
  onMutar(fn: (te: TreinoExercicio) => void): void;
}) {
  return (
    <div className="card">
      <div className="ed-cabec">
        <div>
          <div className="ex-nome">{exercicio?.nome ?? "Exercício removido"}</div>
          {exercicio?.grupo && <div className="ex-grupo">{exercicio.grupo}</div>}
        </div>
        <div className="ed-mover">
          <button className="btn-mini" type="button" disabled={!podeSubir} onClick={onSubir} aria-label="Mover para cima">
            ↑
          </button>
          <button className="btn-mini" type="button" disabled={!podeDescer} onClick={onDescer} aria-label="Mover para baixo">
            ↓
          </button>
          <button className="btn-mini perigo" type="button" onClick={onRemover}>
            Remover
          </button>
        </div>
      </div>

      <label className="form-linha" style={{ marginTop: 12 }}>
        <span>Aviso (opcional)</span>
        <input
          value={te.aviso ?? ""}
          onChange={(e) => onMutar((x) => (x.aviso = e.target.value || undefined))}
          placeholder="Ex.: confirme a carga com seu treinador"
        />
      </label>

      {te.series.map((s, si) => (
        <div className="ed-serie" key={si}>
          <div className="linha1">
            <select value={s.tipo} onChange={(e) => onMutar((x) => (x.series[si].tipo = e.target.value as TipoSerie))} aria-label="Tipo de série">
              {TIPOS.map((t) => (
                <option key={t} value={t}>
                  {ROTULO_TIPO[t]}
                </option>
              ))}
            </select>
            <input
              value={s.presc}
              onChange={(e) => onMutar((x) => (x.series[si].presc = e.target.value))}
              placeholder="1 × 6 a 10"
              aria-label="Prescrição (séries × repetições)"
            />
            <input
              value={s.int}
              onChange={(e) => onMutar((x) => (x.series[si].int = e.target.value))}
              placeholder="1 min"
              aria-label="Intervalo"
              style={{ maxWidth: 110 }}
            />
            <button
              className="btn-mini perigo"
              type="button"
              onClick={() => onMutar((x) => x.series.splice(si, 1))}
              aria-label="Remover série"
            >
              ✕
            </button>
          </div>
          <div className="linha1" style={{ marginTop: 8 }}>
            <input
              value={s.nota ?? ""}
              onChange={(e) => onMutar((x) => (x.series[si].nota = e.target.value || undefined))}
              placeholder="Nota / técnica (ex.: + 1 drop set)"
              aria-label="Nota ou técnica"
            />
          </div>
        </div>
      ))}
      <div className="acoes" style={{ marginTop: 10 }}>
        <button
          className="btn btn-sec"
          type="button"
          onClick={() =>
            onMutar((x) => {
              const ultima = x.series[x.series.length - 1];
              x.series.push(ultima ? { ...ultima } : { tipo: "trabalho", presc: "1 × 6 a 10", int: "—" });
            })
          }
        >
          + Série
        </button>
      </div>
    </div>
  );
}

function PickerExercicio({ onEscolher, onFechar }: { onEscolher(id: string): void; onFechar(): void }) {
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
        <h3>Adicionar exercício</h3>
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
              {lista.map((e) => (
                <button key={e.id} type="button" onClick={() => onEscolher(e.id)}>
                  {e.nome}
                  <small>{e.grupo}</small>
                </button>
              ))}
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
