import { useEffect, useMemo, useState } from "react";
import { useStore } from "../store";
import { useGlos } from "../glos";
import { useGuia } from "../guia";
import { useDetalheEx } from "../detalhe";
import { prepararAudio, useTimer } from "../TimerDescanso";
import { PickerExercicio } from "../PickerExercicio";
import { Folha, confirmar } from "../folha";
import { Icone, IconeTipo } from "../icones";
import { parseIntervalo } from "../analise";
import { formatarKg, sugerirCarga, ultimoTrabalho } from "../progressao";
import { proximaEtapa } from "../trilha";
import { ROTULO_TIPO, ATRIBUTOS, TECNICAS, extraId, regKey, rotuloDaNota } from "../types";
import type { RegistroSerie, Sessao, TreinoExercicio, TipoSerie } from "../types";
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
  formatarDataCurta,
  planoDoDia,
  posicoesDoDia,
  programasVisiveis,
  semanaDoPrograma,
  seriesDaLinha,
  sessoesDoTreino,
  todasAsSessoes,
  treinosDoPrograma,
  treinosVisiveis,
  duracaoMin,
  formatarDuracao,
  ultimoRegistroDaSerie,
} from "../utils";

const REG_VAZIO: RegistroSerie = { sets: "", kg: "", reps: "", rir: "", done: false };
const NIVEL_TIPO: Record<TipoSerie, 1 | 2 | 3> = { aquecimento: 1, ajuste: 2, trabalho: 3 };
const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

/** "seg, 5 out" */
function dataCurta(iso: string): string {
  const [, m, d] = iso.split("-").map(Number);
  return `${DIAS_SEMANA[diaDaSemana(iso)].slice(0, 3).toLowerCase()}, ${d} ${MESES[m - 1]}`;
}

/** "1 a 2 min" → "1–2 min"; "—" ou vazio → "" */
function descanso(int: string): string {
  const t = int.trim();
  if (!t || t === "—" || parseIntervalo(t) === 0) return "";
  return t.replace(/(\d+)\s*a\s*(\d+)/, "$1–$2");
}

export function Hoje() {
  const st = useStore();
  const abrirGuia = useGuia((s) => s.abrir);
  const programa = st.programaAtivo();
  const treinos = programa ? treinosDoPrograma(programa, st.treinos) : treinosVisiveis(st.treinos);
  const treinoBase = st.treinoAtivoId ? st.treinos[st.treinoAtivoId] : null;
  const sess = st.sessaoAtiva();
  const [pickerExtra, setPickerExtra] = useState(false);
  const [trocarDia, setTrocarDia] = useState(false);

  // exercícios retráteis: por padrão só o exercício "da vez" (primeiro com
  // séries pendentes) fica aberto; toques no cabeçalho sobrescrevem
  const [toggles, setToggles] = useState<Record<string, boolean>>({});
  useEffect(() => setToggles({}), [st.treinoAtivoId, st.dataAtiva]);

  const sugestaoId = programa?.divisaoSemana[diaDaSemana(st.dataAtiva)];
  const sugestao = sugestaoId ? st.treinos[sugestaoId] : null;

  // histórico do plano: sessões deste treino (pré-carrega cada linha).
  // Histórico geral: todas as sessões (extras e a sugestão de carga, que vale
  // para o mesmo exercício em qualquer programa).
  const historico = useMemo(
    () => (treinoBase ? sessoesDoTreino(st.sessoes, treinoBase.id) : []),
    [st.sessoes, treinoBase?.id]
  );
  const historicoGeral = useMemo(() => todasAsSessoes(st.sessoes), [st.sessoes]);

  if (treinos.length === 0) {
    return (
      <div className="vazio">
        {programa
          ? `O programa "${programa.nome}" ainda não tem treinos — adicione na aba Treinos.`
          : "Nenhum treino cadastrado. Escolha um programa pronto na aba Treinos."}
      </div>
    );
  }
  if (!treinoBase) return null;
  const treino = planoDoDia(treinoBase, programa, st.sessoes, st.dataAtiva);
  const treinoForaDoPrograma = !treinos.some((t) => t.id === treino.id);

  const itens = exerciciosDaSessao(treino, sess);
  const posicoes = posicoesDoDia(sess);
  const jaNoDia = new Set([...treino.exercicios, ...extrasDaSessao(sess)].map((te) => te.exercicioId));
  const daVezIdx = itens.findIndex(({ te }) => {
    const c = contarSeriesExercicio(te, sess);
    return c.total === 0 || c.feitas < c.total;
  });

  const preparo = ["Aquecimento geral 5–10 min (esteira, bike, escada)", ...(treino.preparo ?? []).filter((l) => l.trim())];
  const feitosPreparo = new Set(sess.preparo ?? []);
  const semanaSed = programa?.sedentario && programa.treinoIds.includes(treino.id) ? semanaDoPrograma(programa, st.sessoes, st.dataAtiva) : null;
  const etapa = programa ? proximaEtapa(programa, st.programas, st.sessoes, st.dataAtiva) : null;
  const ehHoje = st.dataAtiva === dataHoje();

  return (
    <>
      <nav className="abas" aria-label="Selecionar treino">
        {treinos.map((t) => {
          const letra = t.nome.replace(/^Treino /i, "");
          return (
            <button
              key={t.id}
              className={`aba${letra.length > 2 ? " texto" : ""}`}
              type="button"
              aria-selected={t.id === treino.id}
              onClick={() => st.setTreinoAtivo(t.id)}
            >
              {letra}
            </button>
          );
        })}
        {treinoForaDoPrograma && (
          <button className="aba texto" type="button" aria-selected="true">
            {treino.nome.replace(/^Treino /i, "")}
          </button>
        )}
      </nav>

      {st.migradas > 0 && (
        <div className="banner-ok">{st.migradas} sessão(ões) do app antigo foram migradas para a plataforma nova. Nada foi perdido.</div>
      )}

      <section className="dia-card" aria-label="Seu dia">
        <div className="dia-topo">
          <span className="rotulo">
            {sugestao ? `${DIAS_SEMANA[diaDaSemana(st.dataAtiva)]} é dia de ${sugestao.nome.replace(/^Treino /i, "")}` : `${DIAS_SEMANA[diaDaSemana(st.dataAtiva)]}: descanso na divisão`}
          </span>
          <button className="chip" type="button" onClick={() => setTrocarDia(true)} aria-label="Trocar data ou programa">
            {ehHoje ? "Hoje" : dataCurta(st.dataAtiva)}
            <Icone nome="abaixo" pequeno />
          </button>
        </div>
        {programa && <div className="dia-sub">{programa.nome}</div>}
        {semanaSed != null && (
          <div className="lembrete">
            Semana {semanaSed} da adaptação:{" "}
            {semanaSed >= 3 ? "agora são as 3 séries normais." : `${semanaSed} série${semanaSed > 1 ? "s" : ""} por exercício.`}
          </div>
        )}
        {programa?.lembrete && <div className="lembrete">{programa.lembrete}</div>}

        <span className="rotulo" style={{ marginTop: 6 }}>
          Preparo
        </span>
        {preparo.map((p, i) => (
          <button
            key={i}
            type="button"
            className={`preparo-item${feitosPreparo.has(i) ? " ok" : ""}`}
            aria-pressed={feitosPreparo.has(i)}
            onClick={() => st.alternarPreparo(i)}
          >
            <span className={`caixa${feitosPreparo.has(i) ? " ok" : ""}`}>{feitosPreparo.has(i) && <Icone nome="check" pequeno />}</span>
            <span>{p}</span>
          </button>
        ))}
        <BlocoDuracao />
        <button className="link" type="button" onClick={abrirGuia}>
          <Icone nome="livro" pequeno />
          Guia do método
        </button>
        {etapa && (
          <div className="banner-dica" style={{ margin: "4px 0 0" }}>
            <Icone nome="trilha" pequeno />
            <span>
              {etapa.texto} <b>Próxima etapa: {etapa.proxima.nome}.</b>{" "}
              <button className="link" type="button" style={{ padding: 0, minHeight: 0 }} onClick={() => st.setTab("treinos")}>
                Ver na trilha
              </button>
            </span>
          </div>
        )}
      </section>

      {itens.map(({ te, extra }, i) => (
        <BlocoExercicio
          key={te.id}
          te={te}
          extra={extra}
          posicao={posicoes[te.id]}
          sess={sess}
          historico={extra ? historicoGeral : historico}
          historicoGeral={historicoGeral}
          aberto={toggles[te.id] ?? i === daVezIdx}
          onAlternar={() => setToggles((t) => ({ ...t, [te.id]: !(t[te.id] ?? i === daVezIdx) }))}
        />
      ))}

      <div className="add-extra">
        <p>Fez algo fora do {treino.nome}? Acrescente só neste dia — o plano do treino continua como está.</p>
        <button className="btn btn-sec" type="button" style={{ width: "100%" }} onClick={() => setPickerExtra(true)}>
          <Icone nome="mais" pequeno />
          Exercício fora do treino
        </button>
      </div>

      {pickerExtra && (
        <PickerExercicio
          titulo="Exercício fora do treino"
          descricao={`Entra só na sessão de ${formatarData(st.dataAtiva)}, sem alterar o ${treino.nome}.`}
          jaEscolhidos={jaNoDia}
          onEscolher={(id) => {
            st.adicionarExtra(id);
            setToggles((t) => ({ ...t, [extraId(id)]: true }));
            setPickerExtra(false);
          }}
          onFechar={() => setPickerExtra(false)}
        />
      )}

      {trocarDia && <FolhaTrocarDia aoFechar={() => setTrocarDia(false)} />}

      <div className="aval-card">
        <h3>Como você estava hoje?</h3>
        <p className="aval-sub">De 0 (nada) a 10 (no máximo). Entra no relatório e na Evolução.</p>
        {ATRIBUTOS.map(([attr, rotulo]) => {
          const v = sess.aval[attr];
          return (
            <div className="aval-item" key={attr} role="group" aria-label={`${rotulo} de 0 a 10`}>
              <div className="aval-top">
                <span>{rotulo}</span>
                <b>{v ?? "—"}</b>
              </div>
              <div className="notas">
                {Array.from({ length: 11 }, (_, n) => (
                  <button key={n} type="button" aria-pressed={v === n} onClick={() => st.setAval(attr, n)}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="obs-card">
        <h3>Observações do dia</h3>
        <textarea
          id="obs-dia"
          value={sess.obs}
          placeholder="Como foi o treino, sensações, ajustes pra próxima vez..."
          onChange={(e) => st.setObs(e.target.value)}
        />
      </div>

      <div className="acoes">
        <button
          className="btn btn-perigo"
          type="button"
          onClick={async () => {
            const ok = await confirmar({
              titulo: "Limpar este dia?",
              texto: `Apaga todos os números, séries marcadas, avaliação e observações de ${treino.nome} em ${formatarData(st.dataAtiva)}.`,
              acao: "Limpar dia",
            });
            if (ok) st.limparDia();
          }}
        >
          <Icone nome="lixo" pequeno />
          Limpar este dia
        </button>
      </div>
    </>
  );
}

/** Trocar a data do treino (hoje, ontem, outra) e o programa ativo. */
function FolhaTrocarDia({ aoFechar }: { aoFechar(): void }) {
  const st = useStore();
  const programas = programasVisiveis(st.programas);
  const programa = st.programaAtivo();
  const hoje = dataHoje();
  const ontem = (() => {
    const d = new Date(`${hoje}T12:00:00`);
    d.setDate(d.getDate() - 1);
    return d.toISOString().slice(0, 10);
  })();
  return (
    <Folha titulo="Dia e programa" aoFechar={aoFechar}>
      <span className="rotulo">Data do treino</span>
      <div className="segmentado" style={{ margin: "8px 0" }}>
        <button type="button" aria-pressed={st.dataAtiva === hoje} onClick={() => st.setData(hoje)}>
          Hoje
        </button>
        <button type="button" aria-pressed={st.dataAtiva === ontem} onClick={() => st.setData(ontem)}>
          Ontem
        </button>
      </div>
      <label className="form-linha">
        <span>Outra data</span>
        <input type="date" id="data-treino" value={st.dataAtiva} onChange={(e) => st.setData(e.target.value || hoje)} />
      </label>
      {programas.length > 0 && (
        <label className="form-linha">
          <span>Programa</span>
          <select id="sel-programa" value={programa?.id ?? ""} onChange={(e) => st.setProgramaAtivo(e.target.value || null)}>
            {programas.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nome}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="acoes">
        <button className="btn btn-pri" type="button" onClick={aoFechar}>
          Pronto
        </button>
      </div>
    </Folha>
  );
}

/**
 * Um exercício da sessão: o do plano do treino ou um extra do dia. O selo
 * "1º", "2º"... marca em que posição ele entrou na ordem do dia.
 */
function BlocoExercicio({
  te,
  extra,
  posicao,
  sess,
  historico,
  historicoGeral,
  aberto,
  onAlternar,
}: {
  te: TreinoExercicio;
  extra: boolean;
  posicao?: number;
  sess: Sessao;
  historico: Sessao[];
  historicoGeral: Sessao[];
  aberto: boolean;
  onAlternar(): void;
}) {
  const st = useStore();
  const abrirGlos = useGlos((s) => s.abrir);
  const abrirDetalhe = useDetalheEx((s) => s.abrir);
  const ex = st.exercicios[te.exercicioId];
  const ultimo = ultimoTrabalho(te.exercicioId, historicoGeral, st.treinos, st.dataAtiva);
  const contEx = contarSeriesExercicio(te, sess);
  const completo = contEx.total > 0 && contEx.feitas >= contEx.total;

  return (
    <section className={`exercicio${aberto ? " aberto" : ""}${extra ? " extra" : ""}`}>
      <div className="ex-topo">
        <button className="ex-toggle" type="button" aria-expanded={aberto} onClick={onAlternar}>
          {posicao != null && (
            <span className="ex-ordem" aria-label={`${posicao}º exercício feito neste dia`}>
              {posicao}º
            </span>
          )}
          <span className="ex-nome">
            {ex ? ex.nome : "Exercício removido"}
            {extra && <span className="tag-extra">extra</span>}
          </span>
          <span className={`ex-prog${completo ? " ok" : ""}`}>
            {completo && <Icone nome="check" pequeno />}
            {contEx.feitas}/{contEx.total}
          </span>
        </button>
        {ex && (
          <button className="btn-icone" type="button" onClick={() => abrirDetalhe(ex.id)} aria-label={`Como fazer ${ex.nome}`}>
            <Icone nome="info" />
          </button>
        )}
      </div>
      {aberto && (
        <div className="ex-cabec">
          <div className="ex-apoio">
            {ex?.grupo}
            {ultimo ? ` · da última vez ${formatarKg(ultimo.kg)} kg × ${ultimo.reps} (${formatarDataCurta(ultimo.data)})` : ""}
          </div>
          {(te.tecnicas?.length ?? 0) > 0 && (
            <div className="tags">
              {te.tecnicas!.map((k) => (
                <button key={k} className="tag" type="button" onClick={() => abrirGlos(TECNICAS[k]?.glos ?? k)}>
                  {TECNICAS[k]?.rotulo ?? k}
                </button>
              ))}
            </div>
          )}
          {extra && <div className="ex-apoio">Fora do plano do treino — vale só para este dia.</div>}
          {te.aviso && (
            <div className="ex-aviso">
              <Icone nome="aviso" pequeno />
              <span>{te.aviso}</span>
            </div>
          )}
        </div>
      )}
      {aberto && (
        <div className="ex-series">
          {te.series.map((_, si) => (
            <LinhaSerie
              key={si}
              te={te}
              serieIdx={si}
              extra={extra}
              sess={sess}
              historico={historico}
              nomeExercicio={ex?.nome ?? ""}
              ultimo={ultimo}
            />
          ))}
          {extra && (
            <div className="acoes" style={{ margin: "0 0 12px" }}>
              <button className="btn btn-sec" type="button" onClick={() => st.adicionarSerieExtra(te.id)}>
                <Icone nome="mais" pequeno />
                Série
              </button>
              <button
                className="btn btn-perigo"
                type="button"
                onClick={async () => {
                  const nome = ex?.nome ?? "este exercício";
                  const ok = await confirmar({
                    titulo: "Tirar do dia?",
                    texto: `"${nome}" sai deste dia e os números registrados nele são apagados.`,
                    acao: "Tirar do dia",
                  });
                  if (ok) st.removerExtra(te.id);
                }}
              >
                Tirar do dia
              </button>
            </div>
          )}
        </div>
      )}
    </section>
  );
}

/** Uma linha de série: prescrição, sugestão de carga, números e os botões de série feita. */
function LinhaSerie({
  te,
  serieIdx,
  extra,
  sess,
  historico,
  nomeExercicio,
  ultimo,
}: {
  te: TreinoExercicio;
  serieIdx: number;
  extra: boolean;
  sess: Sessao;
  historico: Sessao[];
  nomeExercicio: string;
  ultimo: ReturnType<typeof ultimoTrabalho>;
}) {
  const st = useStore();
  const abrirGlos = useGlos((s) => s.abrir);
  const s = te.series[serieIdx];
  const chave = regKey(te.id, serieIdx);
  const salvo = sess.registros[chave];
  const registroVazio =
    !salvo || (!salvo.sets && !salvo.kg && !salvo.reps && !salvo.rir && !salvo.done && !salvo.feitos?.some(Boolean));
  // pré-carrega os números da última sessão como sugestão editável;
  // eles só são gravados quando você marca Feita ou ajusta um campo
  const preCarga = registroVazio ? ultimoRegistroDaSerie(historico, chave, st.dataAtiva) : null;
  const r = salvo ?? REG_VAZIO;
  const mostra = preCarga ?? r;
  const n = seriesDaLinha(s.presc, mostra.sets);
  const feitos = feitosDaLinha(salvo, n);
  const feita = feitos.length > 0 && feitos.every(Boolean);
  const ehRM = /×\s*RM/i.test(s.presc);
  const sugestao = s.tipo === "trabalho" && !ehRM ? sugerirCarga(s.presc, ultimo, nomeExercicio) : null;

  const mudar = (campo: "sets" | "kg" | "reps" | "rir", valor: string) => {
    if (preCarga) st.setRegistroCompleto(chave, { ...preCarga, done: false, feitos: [], [campo]: valor });
    else st.setRegistro(chave, campo, valor);
  };
  // marca/desmarca uma série individual; toda série marcada inicia o descanso
  const alternarFeito = (i: number) => {
    const novos = feitos.slice();
    novos[i] = !novos[i];
    const base = preCarga ? { ...preCarga } : { ...r };
    st.setRegistroCompleto(chave, { ...base, feitos: novos, done: novos.every(Boolean) });
    if (novos[i] && st.prefs.timerDescanso !== false) {
      prepararAudio();
      const segundos = parseIntervalo(s.int);
      if (segundos > 0) useTimer.getState().iniciar(segundos);
    }
  };
  const glosNota = glosDaNota(s.nota);
  const clsInput = preCarga ? "sugerida" : "";
  const desc = descanso(s.int);
  const faixa = s.presc.split("×")[1]?.trim().replace(/(\d+)\s*a\s*(\d+)/, "$1–$2") ?? "";
  const rirValores = ["0", "1", "2", "3+"];

  return (
    <div className={`serie${feita ? " feita" : ""}`}>
      <div className="serie-top">
        <button
          className={`badge ${s.tipo}`}
          type="button"
          onClick={() => abrirGlos(s.tipo)}
          aria-label={`Série de ${ROTULO_TIPO[s.tipo].toLowerCase()}: o que é`}
        >
          <IconeTipo nivel={NIVEL_TIPO[s.tipo]} />
          {ROTULO_TIPO[s.tipo]}
        </button>
        <span className="presc">
          <b>{s.presc.replace(/(\d+)\s*a\s*(\d+)/, "$1–$2").replace(/×\s*RM/i, "× até a falha")}</b>
          {desc ? ` · ${desc}` : ""}
        </span>
        {extra && te.series.length > 1 && (
          <button
            className="btn-icone"
            type="button"
            onClick={() => st.removerSerieExtra(te.id, serieIdx)}
            aria-label={`Remover a ${serieIdx + 1}ª linha de série`}
          >
            <Icone nome="fechar" pequeno />
          </button>
        )}
      </div>

      {(s.nota || ehRM) && (
        <div className="nota-linha">
          {s.nota && (
            <button className="tag" type="button" onClick={() => glosNota && abrirGlos(glosNota)}>
              {rotuloDaNota(s.nota)}
            </button>
          )}
          {ehRM && (
            <button className="tag" type="button" onClick={() => abrirGlos("rm")}>
              RM: máximo de repetições
            </button>
          )}
        </div>
      )}

      {sugestao && (
        <div className="banner-dica" style={{ margin: 0 }}>
          <Icone nome={sugestao.direcao === "subir" ? "subir" : sugestao.direcao === "baixar" ? "descer" : "igual"} pequeno />
          <span>
            Na última ({formatarDataCurta(sugestao.ultimo.data)}) você fez {formatarKg(sugestao.ultimo.kg)} kg × {sugestao.ultimo.reps}
            {sugestao.direcao === "subir" && (
              <>
                , acima de {sugestao.faixa[1]}. <b>Suba para {formatarKg(sugestao.kg)} kg.</b>
              </>
            )}
            {sugestao.direcao === "baixar" && (
              <>
                , abaixo de {sugestao.faixa[0]}. <b>Baixe para {formatarKg(sugestao.kg)} kg.</b>
              </>
            )}
            {sugestao.direcao === "manter" && (
              <>
                , dentro da faixa. <b>Mantenha {formatarKg(sugestao.kg)} kg e busque +1 rep.</b>
              </>
            )}
          </span>
        </div>
      )}

      <div className="serie-inputs">
        <label className="campo">
          <span>Carga (kg)</span>
          <input
            type="text"
            inputMode="decimal"
            className={clsInput}
            value={mostra.kg}
            placeholder="kg"
            onChange={(e) => mudar("kg", e.target.value)}
            aria-label={`Carga em quilos de ${nomeExercicio}`}
          />
        </label>
        <label className="campo">
          <span>Reps</span>
          <input
            type="text"
            inputMode="numeric"
            className={clsInput}
            value={mostra.reps}
            placeholder={ehRM ? "máx" : faixa}
            onChange={(e) => mudar("reps", e.target.value)}
            aria-label={`Repetições feitas de ${nomeExercicio}`}
          />
        </label>
      </div>
      {preCarga && <span className="tag-sugestao">Números da última sessão — mude ou marque Feita para registrar</span>}

      {s.tipo === "trabalho" && (
        <div className="campo">
          <span>
            Reps na reserva (RIR){" "}
            <button className="link" type="button" style={{ padding: 0, minHeight: 0, fontSize: 12 }} onClick={() => abrirGlos("rir")}>
              o que é?
            </button>
          </span>
          <div className="rir">
            {rirValores.map((v) => (
              <button
                key={v}
                type="button"
                aria-pressed={mostra.rir === v || (v === "3+" && Number(mostra.rir) >= 3)}
                onClick={() => mudar("rir", mostra.rir === v ? "" : v)}
              >
                {v}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="feitos-linha">
        {feitos.map((f, i) => (
          <button
            key={i}
            type="button"
            className={`feito-btn${f ? " on" : ""}`}
            aria-pressed={f}
            onClick={() => alternarFeito(i)}
            aria-label={n > 1 ? `${i + 1}ª série de ${ROTULO_TIPO[s.tipo].toLowerCase()} feita` : "Série feita"}
          >
            {f && <Icone nome="check" pequeno />}
            {n > 1 ? `${i + 1}ª` : f ? "Feita" : "Marcar feita"}
          </button>
        ))}
      </div>
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
      <div className="duracao">
        <button className="btn btn-pri" type="button" onClick={st.iniciarTreino}>
          <Icone nome="play" pequeno />
          Iniciar treino
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
      <div className="duracao">
        <span className="tempo" role="timer">
          {h ? `${h}:` : ""}
          {mm}:{ss}
        </span>
        <button className="btn btn-sec" type="button" onClick={st.encerrarTreino}>
          <Icone nome="stop" pequeno />
          Encerrar treino
        </button>
      </div>
    );
  }

  const min = duracaoMin(sess);
  return (
    <div className="duracao">
      <span className="tempo encerrado">Treino encerrado · {min != null ? formatarDuracao(Math.max(min, 1)) : "—"}</span>
      <button className="btn-mini" type="button" onClick={st.retomarTreino}>
        Retomar
      </button>
    </div>
  );
}
