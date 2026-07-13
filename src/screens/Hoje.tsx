import { useStore } from "../store";
import { useGlos, ListaGlossario } from "../glos";
import { ROTULO_TIPO, ATRIBUTOS, regKey } from "../types";
import type { RegistroSerie } from "../types";
import { glosDaNota } from "../glossario";
import {
  DIAS_SEMANA,
  dataHoje,
  diaDaSemana,
  formatarData,
  sessoesDoTreino,
  treinosVisiveis,
  ultimaCargaAntes,
} from "../utils";

const REG_VAZIO: RegistroSerie = { sets: "", kg: "", reps: "", rir: "", done: false };

export function Hoje() {
  const st = useStore();
  const abrirGlos = useGlos((s) => s.abrir);
  const treinos = treinosVisiveis(st.treinos);
  const treino = st.treinoAtivoId ? st.treinos[st.treinoAtivoId] : null;
  const sess = st.sessaoAtiva();

  const sugestaoId = st.prefs.divisaoSemana[diaDaSemana(st.dataAtiva)];
  const sugestao = sugestaoId ? st.treinos[sugestaoId] : null;

  if (treinos.length === 0) {
    return (
      <div className="vazio">
        Nenhum treino cadastrado. Crie o primeiro na aba <b>Treinos</b>.
      </div>
    );
  }
  if (!treino) return null;

  const historico = sessoesDoTreino(st.sessoes, treino.id);
  let total = 0;
  let feitas = 0;
  treino.exercicios.forEach((te) =>
    te.series.forEach((_s, si) => {
      total++;
      if (sess.registros[regKey(te.id, si)]?.done) feitas++;
    })
  );

  return (
    <>
      <nav className="abas" aria-label="Selecionar treino">
        {treinos.map((t) => (
          <button
            key={t.id}
            className="aba"
            type="button"
            aria-selected={t.id === treino.id}
            onClick={() => st.setTreinoAtivo(t.id)}
          >
            {t.nome.replace(/^Treino /i, "")}
          </button>
        ))}
      </nav>

      <div style={{ padding: "0 0 8px" }}>
        <div className="controle-data">
          <label htmlFor="data">Data do treino</label>
          <input type="date" id="data" value={st.dataAtiva} onChange={(e) => st.setData(e.target.value || dataHoje())} />
          <button className="btn-hoje" type="button" onClick={() => st.setData(dataHoje())}>
            Hoje
          </button>
        </div>
        <div className="sugestao-dia">
          {DIAS_SEMANA[diaDaSemana(st.dataAtiva)]}:{" "}
          {sugestao ? (
            <b>{sugestao.nome}</b>
          ) : (
            <b>descanso</b>
          )}{" "}
          na sua divisão da semana
        </div>
        <div className="progresso-wrap">
          <div className="progresso-top">
            <span>Séries concluídas</span>
            <b>
              {feitas} / {total}
            </b>
          </div>
          <div className="barra">
            <i style={{ width: total ? `${(feitas / total) * 100}%` : "0%" }} />
          </div>
        </div>
      </div>

      {st.migradas > 0 && (
        <div className="banner-ok">
          ✓ {st.migradas} sessão(ões) do app antigo foram migradas para a plataforma nova. Nada foi perdido.
        </div>
      )}

      <details className="painel">
        <summary>
          Recomendações e glossário <span className="seta">›</span>
        </summary>
        <div className="painel-corpo">
          <ul className="reco">
            <li>
              <b>Aquecimento:</b> ~30% da carga máxima, longe da falha.
            </li>
            <li>
              <b>Ajuste:</b> carga considerável, ainda longe da falha. Serve pra sentir o dia.
            </li>
            <li>
              <b>Série de trabalho:</b> é a que conta. Vá até a falha dentro da faixa de reps.
            </li>
            <li>
              <b>Progressão:</b> a cada semana, mais 1–2 reps, um pouco mais de carga, ou menos RIR.
            </li>
          </ul>
          <ListaGlossario />
        </div>
      </details>

      {treino.exercicios.map((te) => {
        const ex = st.exercicios[te.exercicioId];
        const ultima = ultimaCargaAntes(historico, te, st.dataAtiva);
        return (
          <section className="exercicio" key={te.id}>
            <div className="ex-cabec">
              <div className="ex-nome">{ex?.nome ?? "Exercício removido"}</div>
              {ex?.grupo && <div className="ex-grupo">{ex.grupo}</div>}
              {te.aviso && <div className="ex-aviso">⚠ {te.aviso}</div>}
              {ultima && (
                <div className="ex-ultima">
                  Da última vez ({formatarData(ultima.date)}): {ultima.kg} kg
                  {ultima.reps ? ` × ${ultima.reps}` : ""}
                  {ultima.rir !== "" ? ` · RIR ${ultima.rir}` : ""}
                </div>
              )}
            </div>
            <div className="ex-series">
              {te.series.map((s, si) => {
                const chave = regKey(te.id, si);
                const r = sess.registros[chave] ?? REG_VAZIO;
                const setsHint = s.presc.split("×")[0].trim();
                const glosNota = glosDaNota(s.nota);
                return (
                  <div className={`serie${r.done ? " feita" : ""}`} key={si}>
                    <div className="serie-top">
                      <button
                        className={`badge ${s.tipo}`}
                        type="button"
                        onClick={() => abrirGlos(s.tipo)}
                        aria-label={`O que é série de ${ROTULO_TIPO[s.tipo].toLowerCase()}`}
                      >
                        {ROTULO_TIPO[s.tipo]}
                        <i className="q" aria-hidden="true">
                          ?
                        </i>
                      </button>
                      <span className="presc">
                        <b>{s.presc}</b> · intervalo {s.int}
                      </span>
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={r.done}
                          onChange={(e) => st.setRegistro(chave, "done", e.target.checked)}
                          aria-label="Marcar como feita"
                        />{" "}
                        Feito
                      </label>
                    </div>
                    <div className="serie-inputs">
                      <div className="campo">
                        <span>
                          Séries
                          <button className="q-btn" type="button" onClick={() => abrirGlos("series")} aria-label="O que registrar em séries">
                            ?
                          </button>
                        </span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={r.sets}
                          placeholder={setsHint}
                          onChange={(e) => st.setRegistro(chave, "sets", e.target.value)}
                          aria-label={`Quantas séries você fez de ${ex?.nome ?? ""}`}
                        />
                      </div>
                      <div className="campo">
                        <span>Carga (kg)</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          value={r.kg}
                          placeholder="0"
                          onChange={(e) => st.setRegistro(chave, "kg", e.target.value)}
                          aria-label={`Carga em quilos de ${ex?.nome ?? ""}`}
                        />
                      </div>
                      <div className="campo">
                        <span>Reps</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          value={r.reps}
                          placeholder="0"
                          onChange={(e) => st.setRegistro(chave, "reps", e.target.value)}
                          aria-label={`Repetições feitas de ${ex?.nome ?? ""}`}
                        />
                      </div>
                      {s.tipo === "trabalho" && (
                        <div className="campo">
                          <span>
                            RIR
                            <button className="q-btn" type="button" onClick={() => abrirGlos("rir")} aria-label="O que é RIR">
                              ?
                            </button>
                          </span>
                          <input
                            type="text"
                            inputMode="numeric"
                            value={r.rir}
                            placeholder="0"
                            onChange={(e) => st.setRegistro(chave, "rir", e.target.value)}
                            aria-label={`Repetições em reserva de ${ex?.nome ?? ""}`}
                          />
                        </div>
                      )}
                    </div>
                    {s.nota && (
                      <p className="nota">
                        <span>{s.nota}</span>
                        {glosNota && (
                          <button className="q-btn claro" type="button" onClick={() => abrirGlos(glosNota)} aria-label="O que significa">
                            ?
                          </button>
                        )}
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}

      <div className="aval-card">
        <h3>Como você estava hoje?</h3>
        <p className="aval-sub">Escala de 0 (nada) a 10 (no máximo). Entra no relatório e na tela de Evolução.</p>
        {ATRIBUTOS.map(([attr, rotulo]) => {
          const v = sess.aval[attr];
          return (
            <div className="aval-item" key={attr}>
              <div className="aval-top">
                <span>{rotulo}</span>
                <b>{v ?? "—"}</b>
              </div>
              <input
                type="range"
                min={0}
                max={10}
                step={1}
                value={v ?? 5}
                onChange={(e) => st.setAval(attr, Number(e.target.value))}
                aria-label={`${rotulo} de 0 a 10`}
              />
            </div>
          );
        })}
      </div>

      <div className="obs-card">
        <h3>Observações do dia</h3>
        <textarea
          value={sess.obs}
          placeholder="Como foi o treino, sensações, ajustes pra próxima vez..."
          onChange={(e) => st.setObs(e.target.value)}
        />
      </div>

      <div className="acoes">
        <button
          className="btn btn-perigo"
          type="button"
          onClick={() => {
            if (confirm(`Apagar os registros de ${treino.nome} em ${formatarData(st.dataAtiva)}?`)) st.limparDia();
          }}
        >
          Limpar este dia
        </button>
      </div>
    </>
  );
}
