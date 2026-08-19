import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { useGlos, ListaGlossario } from "../glos";
import { useDetalheEx } from "../detalhe";
import { useTimer } from "../TimerDescanso";
import { PickerExercicio } from "../PickerExercicio";
import { parseIntervalo } from "../analise";
import { ROTULO_TIPO, ATRIBUTOS, extraId, regKey } from "../types";
import type { RegistroSerie, Sessao, TreinoExercicio } from "../types";
import { glosDaNota } from "../glossario";
import {
  DIAS_SEMANA,
  contarSeriesExercicio,
  dataHoje,
  diaDaSemana,
  exerciciosDaSessao,
  extrasDaSessao,
  feitosDaLinha,
  formatarData,
  programasVisiveis,
  seriesDaLinha,
  sessoesDoTreino,
  todasAsSessoes,
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
  const programas = programasVisiveis(st.programas);
  const programa = st.programaAtivo();
  const treinos = programa ? treinosDoPrograma(programa, st.treinos) : treinosVisiveis(st.treinos);
  const treino = st.treinoAtivoId ? st.treinos[st.treinoAtivoId] : null;
  const sess = st.sessaoAtiva();
  const [pickerExtra, setPickerExtra] = useState(false);

  // exercícios retráteis: por padrão só o exercício "da vez" (primeiro com
  // séries pendentes) fica aberto; toques no cabeçalho sobrescrevem
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  useEffect(() => setToggles({}), [st.treinoAtivoId, st.dataAtiva]);

  const sugestaoId = programa?.divisaoSemana[diaDaSemana(st.dataAtiva)];
  const sugestao = sugestaoId ? st.treinos[sugestaoId] : null;

  // histórico do plano: sessões deste treino. Histórico dos extras: todas as
  // sessões — o mesmo extra pode ter sido feito em outro dia/treino.
  const historico = useMemo(
    () => (treino ? sessoesDoTreino(st.sessoes, treino.id) : []),
    [st.sessoes, treino?.id]
  );
  const historicoGeral = useMemo(() => todasAsSessoes(st.sessoes), [st.sessoes]);

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

  const itens = exerciciosDaSessao(treino, sess);
  const jaNoDia = new Set([...treino.exercicios, ...extrasDaSessao(sess)].map((te) => te.exercicioId));

  // exercício "da vez": o primeiro ainda com séries pendentes fica aberto
  const daVezIdx = itens.findIndex(({ te }) => {
    const c = contarSeriesExercicio(te, sess);
    return c.total === 0 || c.feitas < c.total;
  });

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

      {itens.map(({ te, extra }, i) => (
        <BlocoExercicio
          key={te.id}
          te={te}
          extra={extra}
          sess={sess}
          historico={extra ? historicoGeral : historico}
          aberto={toggles[te.id] ?? i === daVezIdx}
          onAlternar={() => setToggles((t) => ({ ...t, [te.id]: !(t[te.id] ?? i === daVezIdx) }))}
        />
      ))}

      <div className="add-extra">
        <p>
          Fez algo fora do {treino.nome} (a esteira, uma máquina que estava livre)? Acrescente só neste dia — o plano do
          treino continua como está.
        </p>
        <div className="acoes">
          <button className="btn btn-sec" type="button" onClick={() => setPickerExtra(true)}>
            + Exercício fora do treino
          </button>
        </div>
      </div>

      {pickerExtra && (
        <PickerExercicio
          titulo="Exercício fora do treino"
          descricao={`Entra só na sessão de ${formatarData(st.dataAtiva)}, sem alterar o ${treino.nome}.`}
          jaEscolhidos={jaNoDia}
          onEscolher={(id) => {
            st.adicionarExtra(id);
            // o extra entra aberto, mesmo com exercícios do plano ainda pendentes
            setToggles((t) => ({ ...t, [extraId(id)]: true }));
            setPickerExtra(false);
          }}
          onFechar={() => setPickerExtra(false)}
        />
      )}

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

/**
 * Um exercício da sessão: o do plano do treino ou um extra do dia. O extra
 * ganha o selo, o botão de remover e a edição das linhas de série ali mesmo —
 * ele só existe neste dia, então não há editor de treino por trás.
 */
function BlocoExercicio({
  te,
  extra,
  sess,
  historico,
  aberto,
  onAlternar,
}: {
  te: TreinoExercicio;
  extra: boolean;
  sess: Sessao;
  historico: Sessao[];
  aberto: boolean;
  onAlternar(): void;
}) {
  const st = useStore();
  const abrirGlos = useGlos((s) => s.abrir);
  const abrirDetalhe = useDetalheEx((s) => s.abrir);
  const ex = st.exercicios[te.exercicioId];
  const ultima = ultimaCargaAntes(historico, te, st.dataAtiva);
  const contEx = contarSeriesExercicio(te, sess);
  const completo = contEx.total > 0 && contEx.feitas >= contEx.total;

  return (
    <section className={`exercicio${aberto ? "" : " fechado"}${extra ? " extra" : ""}`}>
      <div className="ex-topo">
        <button className="ex-toggle" type="button" aria-expanded={aberto} onClick={onAlternar}>
          <span className="seta" aria-hidden="true">
            ›
          </span>
          <span className="ex-nome">
            {ex ? ex.nome : "Exercício removido"}
            {extra && <span className="tag-extra">extra</span>}
          </span>
          <span className={`ex-prog${completo ? " ok" : ""}`}>
            {completo ? "✓ " : ""}
            {contEx.feitas}/{contEx.total}
          </span>
        </button>
        {ex && (
          <button className="q-btn info" type="button" onClick={() => abrirDetalhe(ex.id)} aria-label={`Detalhes de ${ex.nome}`}>
            ⓘ
          </button>
        )}
      </div>
      {aberto && (ex?.grupo || te.aviso || ultima || extra) && (
        <div className="ex-cabec">
          {ex?.grupo && <div className="ex-grupo">{ex.grupo}</div>}
          {extra && <div className="ex-extra-nota">Fora do plano do treino — vale só para este dia.</div>}
          {te.aviso && <div className="ex-aviso">⚠ {te.aviso}</div>}
          {ultima && (
            <div className="ex-ultima">
              Da última vez ({formatarData(ultima.date)}): {ultima.kg} kg
              {ultima.reps ? ` × ${ultima.reps}` : ""}
              {ultima.rir !== "" ? ` · RIR ${ultima.rir}` : ""}
            </div>
          )}
        </div>
      )}
      {aberto && (
        <div className="ex-series">
          {te.series.map((s, si) => (
            <LinhaSerie
              key={si}
              te={te}
              serieIdx={si}
              extra={extra}
              sess={sess}
              historico={historico}
              nomeExercicio={ex?.nome ?? ""}
            />
          ))}
          {extra && (
            <div className="acoes" style={{ marginTop: 12 }}>
              <button className="btn btn-sec" type="button" onClick={() => st.adicionarSerieExtra(te.id)}>
                + Série
              </button>
              <button
                className="btn btn-perigo"
                type="button"
                onClick={() => {
                  const nome = ex?.nome ?? "este exercício";
                  if (confirm(`Tirar "${nome}" deste dia? Os números registrados nele serão apagados.`))
                    st.removerExtra(te.id);
                }}
              >
                Remover do dia
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Uma linha de série: prescrição, botões de feito e os números registrados. */
function LinhaSerie({
  te,
  serieIdx,
  extra,
  sess,
  historico,
  nomeExercicio,
}: {
  te: TreinoExercicio;
  serieIdx: number;
  extra: boolean;
  sess: Sessao;
  historico: Sessao[];
  nomeExercicio: string;
}) {
  const st = useStore();
  const abrirGlos = useGlos((s) => s.abrir);
  const s = te.series[serieIdx];
  const chave = regKey(te.id, serieIdx);
  const salvo = sess.registros[chave];
  const registroVazio =
    !salvo || (!salvo.sets && !salvo.kg && !salvo.reps && !salvo.rir && !salvo.done && !salvo.feitos?.some(Boolean));
  // pré-carrega os números da última sessão como sugestão editável;
  // eles só são gravados quando você marca Feito ou ajusta um campo
  const sugestao = registroVazio ? ultimoRegistroDaSerie(historico, chave, st.dataAtiva) : null;
  const r = salvo ?? REG_VAZIO;
  const mostra = sugestao ?? r;
  const n = seriesDaLinha(s.presc, mostra.sets);
  const feitos = feitosDaLinha(salvo, n);
  const feita = feitos.length > 0 && feitos.every(Boolean);
  const mudar = (campo: "sets" | "kg" | "reps" | "rir", valor: string) => {
    if (sugestao) st.setRegistroCompleto(chave, { ...sugestao, done: false, feitos: [], [campo]: valor });
    else st.setRegistro(chave, campo, valor);
  };
  // marca/desmarca uma série individual; toda série marcada inicia o descanso
  const alternarFeito = (i: number) => {
    const novos = feitos.slice();
    novos[i] = !novos[i];
    const base = sugestao ? { ...sugestao } : { ...r };
    st.setRegistroCompleto(chave, { ...base, feitos: novos, done: novos.every(Boolean) });
    if (novos[i] && st.prefs.timerDescanso !== false) {
      const segundos = parseIntervalo(s.int);
      if (segundos > 0) useTimer.getState().iniciar(segundos);
    }
  };
  const setsHint = s.presc.split("×")[0].trim();
  const glosNota = glosDaNota(s.nota);
  const clsInput = sugestao ? "sugerida" : "";

  return (
    <div className={`serie${feita ? " feita" : ""}`}>
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
        {extra && te.series.length > 1 && (
          <button
            className="btn-mini perigo remove-linha"
            type="button"
            onClick={() => st.removerSerieExtra(te.id, serieIdx)}
            aria-label={`Remover a ${serieIdx + 1}ª linha de série`}
          >
            ✕
          </button>
        )}
      </div>
      <div className="feitos-linha">
        {feitos.map((f, i) => (
          <button
            key={i}
            type="button"
            className={`feito-btn${f ? " on" : ""}`}
            aria-pressed={f}
            onClick={() => alternarFeito(i)}
            aria-label={
              n > 1 ? `Marcar ${i + 1}ª série de ${ROTULO_TIPO[s.tipo].toLowerCase()} como feita` : "Marcar como feita"
            }
          >
            ✓ {n > 1 ? `${i + 1}ª` : "Feito"}
          </button>
        ))}
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
            aria-label={`Quantas séries você fez de ${nomeExercicio}`}
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
            aria-label={`Carga em quilos de ${nomeExercicio}`}
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
            aria-label={`Repetições feitas de ${nomeExercicio}`}
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
              aria-label={`Repetições em reserva de ${nomeExercicio}`}
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
