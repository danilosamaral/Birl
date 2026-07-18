import { useEffect, useState } from "react";
import { useStore } from "../store";
import { useGlos, ListaGlossario } from "../glos";
import { useDetalheEx } from "../detalhe";
import { useTimer } from "../TimerDescanso";
import { parseIntervalo } from "../analise";
import { ROTULO_TIPO, ATRIBUTOS, regKey } from "../types";
import type { RegistroSerie } from "../types";
import { glosDaNota } from "../glossario";
import {
  DIAS_SEMANA,
  dataHoje,
  diaDaSemana,
  formatarData,
  programasVisiveis,
  sessoesDoTreino,
  treinosDoPrograma,
  treinosVisiveis,
  duracaoMin,
  formatarDuracao,
  ultimaCargaAntes,
  ultimoRegistroDaSerie,
} from "../utils";

const REG_VAZIO: RegistroSerie = { sets: "", kg: "", reps: "", rir: "", done: false };

export function Hoje() {
  const st = useStore();
  const abrirGlos = useGlos((s) => s.abrir);
  const abrirDetalhe = useDetalheEx((s) => s.abrir);
  const programas = programasVisiveis(st.programas);
  const programa = st.programaAtivo();
  const treinos = programa ? treinosDoPrograma(programa, st.treinos) : treinosVisiveis(st.treinos);
  const treino = st.treinoAtivoId ? st.treinos[st.treinoAtivoId] : null;
  const sess = st.sessaoAtiva();

  const sugestaoId = programa?.divisaoSemana[diaDaSemana(st.dataAtiva)];
  const sugestao = sugestaoId ? st.treinos[sugestaoId] : null;

  if (treinos.length === 0) {
    return (
      <div className="vazio">
        {programa
          ? `O programa "${programa.nome}" ainda não tem treinos — adicione na aba Treinos.`
          : "Nenhum treino cadastrado. Crie o primeiro na aba Treinos."}
      </div>
    );
  }
  if (!treino) return null;
  const treinoForaDoPrograma = !treinos.some((t) => t.id === treino.id);

  const historico = sessoesDoTreino(st.sessoes, treino.id);

  return (
    <>
      {programas.length > 0 && (
        <div className="prog-barra">
          <label htmlFor="sel-programa">Programa</label>
          <select id="sel-programa" value={programa?.id ?? ""} onChange={(e) => st.setProgramaAtivo(e.target.value || null)}>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </div>
      )}
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
        {treinoForaDoPrograma && (
          <button className="aba" type="button" aria-selected="true">
            {treino.nome.replace(/^Treino /i, "")}
          </button>
        )}
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
          {DIAS_SEMANA[diaDaSemana(st.dataAtiva)]}: <b>{sugestao ? sugestao.nome : "descanso"}</b>
          {programa ? ` na divisão de "${programa.nome}"` : ""}
        </div>
        <BlocoDuracao />
      </div>

      {st.migradas > 0 && (
        <div className="banner-ok">
          ✓ {st.migradas} sessão(ões) do app antigo foram migradas para a plataforma nova. Nada foi perdido.
        </div>
      )}

      {!st.usuario && (
        <button className="banner-info" style={{ width: "100%", textAlign: "left", cursor: "pointer" }} type="button" onClick={() => st.setTab("ajustes")}>
          ☁️ Você não está sincronizando — os dados ficam só neste aparelho. Toque para entrar e ver os mesmos treinos no celular e no iPad.
        </button>
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
              {ex ? (
                <button className="ex-nome clicavel" type="button" onClick={() => abrirDetalhe(ex.id)}>
                  {ex.nome} <span className="info-ic" aria-hidden="true">ⓘ</span>
                </button>
              ) : (
                <div className="ex-nome">Exercício removido</div>
              )}
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
                const salvo = sess.registros[chave];
                const registroVazio = !salvo || (!salvo.sets && !salvo.kg && !salvo.reps && !salvo.rir && !salvo.done);
                // pré-carrega os números da última sessão como sugestão editável;
                // eles só são gravados quando você marca Feito ou ajusta um campo
                const sugestao = registroVazio ? ultimoRegistroDaSerie(historico, chave, st.dataAtiva) : null;
                const r = salvo ?? REG_VAZIO;
                const mostra = sugestao ?? r;
                const mudar = (campo: "sets" | "kg" | "reps" | "rir", valor: string) => {
                  if (sugestao) st.setRegistroCompleto(chave, { ...sugestao, done: false, [campo]: valor });
                  else st.setRegistro(chave, campo, valor);
                };
                const marcar = (checked: boolean) => {
                  if (sugestao) st.setRegistroCompleto(chave, { ...sugestao, done: checked });
                  else st.setRegistro(chave, "done", checked);
                  if (checked && st.prefs.timerDescanso !== false) {
                    const segundos = parseIntervalo(s.int);
                    if (segundos > 0) useTimer.getState().iniciar(segundos);
                  }
                };
                const setsHint = s.presc.split("×")[0].trim();
                const glosNota = glosDaNota(s.nota);
                const clsInput = sugestao ? "sugerida" : "";
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
                      {sugestao && <span className="tag-sugestao">última sessão</span>}
                      <label className="check">
                        <input
                          type="checkbox"
                          checked={r.done}
                          onChange={(e) => marcar(e.target.checked)}
                          aria-label={sugestao ? "Marcar como feita mantendo os números da última sessão" : "Marcar como feita"}
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
                          className={clsInput}
                          value={mostra.sets}
                          placeholder={setsHint}
                          onChange={(e) => mudar("sets", e.target.value)}
                          aria-label={`Quantas séries você fez de ${ex?.nome ?? ""}`}
                        />
                      </div>
                      <div className="campo">
                        <span>Carga (kg)</span>
                        <input
                          type="text"
                          inputMode="decimal"
                          className={clsInput}
                          value={mostra.kg}
                          placeholder="0"
                          onChange={(e) => mudar("kg", e.target.value)}
                          aria-label={`Carga em quilos de ${ex?.nome ?? ""}`}
                        />
                      </div>
                      <div className="campo">
                        <span>Reps</span>
                        <input
                          type="text"
                          inputMode="numeric"
                          className={clsInput}
                          value={mostra.reps}
                          placeholder="0"
                          onChange={(e) => mudar("reps", e.target.value)}
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
                            className={clsInput}
                            value={mostra.rir}
                            placeholder="0"
                            onChange={(e) => mudar("rir", e.target.value)}
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

/** Iniciar/encerrar treino — registra a duração da sessão. */
function BlocoDuracao() {
  const st = useStore();
  const sess = st.sessaoAtiva();
  const rodando = !!sess.inicio && !sess.fim;
  const [, tick] = useState(0);

  useEffect(() => {
    if (!rodando) return;
    const intervalo = setInterval(() => tick((x) => x + 1), 1000);
    return () => clearInterval(intervalo);
  }, [rodando, sess.id]);

  if (!sess.inicio) {
    return (
      <div className="bloco-duracao">
        <button className="btn btn-pri" type="button" onClick={st.iniciarTreino}>
          ▶ Iniciar treino
        </button>
      </div>
    );
  }

  if (!sess.fim) {
    const seg = Math.max(0, Math.floor((Date.now() - Date.parse(sess.inicio)) / 1000));
    const h = Math.floor(seg / 3600);
    const mm = String(Math.floor((seg % 3600) / 60)).padStart(h ? 2 : 1, "0");
    const ss = String(seg % 60).padStart(2, "0");
    return (
      <div className="bloco-duracao">
        <span className="tempo" role="timer">
          ⏱ {h ? `${h}:` : ""}
          {mm}:{ss}
        </span>
        <button className="btn btn-sec" type="button" onClick={st.encerrarTreino}>
          ■ Encerrar treino
        </button>
      </div>
    );
  }

  const min = duracaoMin(sess);
  return (
    <div className="bloco-duracao">
      <span className="tempo encerrado">✓ Treino encerrado · {min != null ? formatarDuracao(Math.max(min, 1)) : "—"}</span>
      <button className="btn-mini" type="button" onClick={st.retomarTreino}>
        Retomar
      </button>
    </div>
  );
}
