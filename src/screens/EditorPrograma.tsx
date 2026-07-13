import { useState } from "react";
import { useStore } from "../store";
import { DIAS_SEMANA, treinosDoPrograma, treinosVisiveis } from "../utils";
import type { Programa } from "../types";

export function EditorPrograma({ programaId, aoVoltar }: { programaId: string; aoVoltar(): void }) {
  const st = useStore();
  const programa = st.programas[programaId];
  const [adicionando, setAdicionando] = useState(false);

  if (!programa || programa.deleted) {
    return (
      <div className="vazio">
        Programa não encontrado.
        <div className="acoes" style={{ marginTop: 12 }}>
          <button className="btn btn-sec" type="button" onClick={aoVoltar}>
            Voltar
          </button>
        </div>
      </div>
    );
  }

  const doPrograma = treinosDoPrograma(programa, st.treinos);
  const foraDoPrograma = treinosVisiveis(st.treinos).filter((t) => !programa.treinoIds.includes(t.id));
  const ativo = st.programaAtivo()?.id === programa.id;

  function mutar(fn: (p: Programa) => void) {
    const copia: Programa = { ...programa, treinoIds: [...programa.treinoIds], divisaoSemana: { ...programa.divisaoSemana } };
    fn(copia);
    st.salvarPrograma(copia);
  }

  function mover(i: number, delta: number) {
    mutar((p) => {
      const j = i + delta;
      if (j < 0 || j >= p.treinoIds.length) return;
      [p.treinoIds[i], p.treinoIds[j]] = [p.treinoIds[j], p.treinoIds[i]];
    });
  }

  return (
    <>
      <div className="acoes" style={{ marginBottom: 16 }}>
        <button className="btn btn-sec" type="button" onClick={aoVoltar}>
          ‹ Voltar
        </button>
        {!ativo && (
          <button className="btn btn-pri" type="button" onClick={() => st.setProgramaAtivo(programa.id)}>
            Usar este programa
          </button>
        )}
      </div>

      {ativo && <div className="banner-ok">✓ Este é o programa ativo — a tela Hoje segue a divisão dele.</div>}

      <div className="card">
        <label className="form-linha">
          <span>Nome do programa</span>
          <input value={programa.nome} onChange={(e) => mutar((p) => (p.nome = e.target.value))} placeholder="Intermediário 4x na Semana" />
        </label>
        <label className="form-linha" style={{ marginBottom: 0 }}>
          <span>Descrição (opcional)</span>
          <input
            value={programa.descricao ?? ""}
            onChange={(e) => mutar((p) => (p.descricao = e.target.value || undefined))}
            placeholder="Foco, fase, observações..."
          />
        </label>
      </div>

      <div className="card">
        <h3>Treinos do programa</h3>
        <p className="card-sub">Na ordem em que aparecem na tela Hoje.</p>
        {doPrograma.length === 0 && <p className="card-sub">Nenhum treino ainda — adicione abaixo.</p>}
        {programa.treinoIds.map((tid, i) => {
          const t = st.treinos[tid];
          if (!t || t.deleted) return null;
          return (
            <div className="ed-serie" key={tid}>
              <div className="linha1">
                <span style={{ flex: 1, fontFamily: "var(--head)", fontWeight: 600 }}>
                  {t.nome}
                  {t.arquivado ? " (arquivado)" : ""}
                  {t.foco && <small style={{ display: "block", color: "var(--muted)", fontWeight: 400 }}>{t.foco}</small>}
                </span>
                <button className="btn-mini" type="button" disabled={i === 0} onClick={() => mover(i, -1)} aria-label="Mover para cima">
                  ↑
                </button>
                <button
                  className="btn-mini"
                  type="button"
                  disabled={i === programa.treinoIds.length - 1}
                  onClick={() => mover(i, 1)}
                  aria-label="Mover para baixo"
                >
                  ↓
                </button>
                <button
                  className="btn-mini perigo"
                  type="button"
                  onClick={() =>
                    mutar((p) => {
                      p.treinoIds = p.treinoIds.filter((x) => x !== tid);
                      for (const [d, v] of Object.entries(p.divisaoSemana)) if (v === tid) p.divisaoSemana[Number(d)] = null;
                    })
                  }
                >
                  Tirar
                </button>
              </div>
            </div>
          );
        })}
        <div className="acoes" style={{ marginTop: 10 }}>
          {!adicionando ? (
            <button className="btn btn-sec" type="button" onClick={() => setAdicionando(true)} disabled={foraDoPrograma.length === 0}>
              + Adicionar treino existente
            </button>
          ) : (
            <select
              className="picker-busca"
              style={{ marginBottom: 0 }}
              autoFocus
              defaultValue=""
              onChange={(e) => {
                if (e.target.value) mutar((p) => p.treinoIds.push(e.target.value));
                setAdicionando(false);
              }}
            >
              <option value="" disabled>
                Escolha o treino...
              </option>
              {foraDoPrograma.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.nome}
                  {t.foco ? ` — ${t.foco}` : ""}
                </option>
              ))}
            </select>
          )}
        </div>
        <p className="card-sub" style={{ margin: "10px 0 0" }}>
          Para criar um treino novo, use a lista "Meus treinos" e depois adicione aqui.
        </p>
      </div>

      <div className="card">
        <h3>Divisão da semana</h3>
        <p className="card-sub">Qual treino deste programa é sugerido em cada dia, na tela Hoje.</p>
        <div className="divisao-grid">
          {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
            <DivisaoDia key={dia} dia={dia} programa={programa} doPrograma={doPrograma} onMutar={mutar} />
          ))}
        </div>
      </div>
    </>
  );
}

function DivisaoDia({
  dia,
  programa,
  doPrograma,
  onMutar,
}: {
  dia: number;
  programa: Programa;
  doPrograma: ReturnType<typeof treinosDoPrograma>;
  onMutar(fn: (p: Programa) => void): void;
}) {
  return (
    <>
      <span className="dia">{DIAS_SEMANA[dia]}</span>
      <select
        value={programa.divisaoSemana[dia] ?? ""}
        onChange={(e) => onMutar((p) => (p.divisaoSemana[dia] = e.target.value || null))}
        aria-label={`Treino de ${DIAS_SEMANA[dia]}`}
      >
        <option value="">Descanso</option>
        {doPrograma.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>
    </>
  );
}
