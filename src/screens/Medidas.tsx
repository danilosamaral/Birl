import { useMemo, useState } from "react";
import { useStore } from "../store";
import { Grafico } from "../chart";
import { CAMPOS_MEDIDA, agora } from "../types";
import type { Medida } from "../types";
import { dataHoje, formatarData, formatarDelta } from "../utils";
import type { PontoCarga } from "../utils";

function parseNum(v: string): number | null {
  const n = parseFloat(String(v).replace(",", "."));
  return isNaN(n) ? null : n;
}

/** Medidas ordenadas por data (mais antiga primeiro). */
function medidasOrdenadas(medidas: Record<string, Medida>): Medida[] {
  return Object.values(medidas)
    .filter((m) => !m.deleted)
    .sort((a, b) => (a.data < b.data ? -1 : 1));
}

function pontosCampo(lista: Medida[], chave: string): PontoCarga[] {
  const pts: PontoCarga[] = [];
  for (const m of lista) {
    const v = m.valores[chave];
    if (v != null && !isNaN(v)) pts.push({ date: m.data, v });
  }
  return pts;
}

export function VisaoMedidas() {
  const st = useStore();
  const lista = useMemo(() => medidasOrdenadas(st.medidas), [st.medidas]);
  // null = formulário fechado; string = data em edição
  const [dataEdicao, setDataEdicao] = useState<string | null>(lista.length === 0 ? dataHoje() : null);

  return (
    <>
      {dataEdicao != null ? (
        <FormMedida dataInicial={dataEdicao} aoFechar={() => setDataEdicao(null)} />
      ) : (
        <div className="acoes" style={{ margin: "16px 0" }}>
          <button className="btn btn-pri" type="button" onClick={() => setDataEdicao(dataHoje())}>
            + Registrar medidas
          </button>
        </div>
      )}

      {lista.length === 0 && dataEdicao == null && (
        <div className="vazio">
          Ainda não há medidas registradas.
          <br />
          Registre peso e circunferências para acompanhar a evolução do físico.
        </div>
      )}

      {lista.length > 0 && <GraficosMedidas lista={lista} />}

      {lista.length > 0 && <HistoricoMedidas lista={lista} aoEditar={(data) => setDataEdicao(data)} />}
    </>
  );
}

function valoresParaTexto(m?: Medida): Record<string, string> {
  const out: Record<string, string> = {};
  if (m) for (const [k, v] of Object.entries(m.valores)) out[k] = String(v);
  return out;
}

function FormMedida({ dataInicial, aoFechar }: { dataInicial: string; aoFechar(): void }) {
  const st = useStore();
  const [data, setData] = useState(dataInicial);
  const existente = st.medidas[data];
  const [rasc, setRasc] = useState<Record<string, string>>(() => valoresParaTexto(existente));
  const [obs, setObs] = useState(existente?.obs ?? "");
  const [msg, setMsg] = useState("");

  // valores da última medida anterior a esta data, para lembrar (placeholder)
  const anterior = useMemo(() => {
    const anteriores = medidasOrdenadas(st.medidas).filter((m) => m.data < data);
    return anteriores[anteriores.length - 1] ?? null;
  }, [st.medidas, data]);

  function trocarData(novaData: string) {
    setData(novaData);
    const m = st.medidas[novaData];
    setRasc(valoresParaTexto(m));
    setObs(m?.obs ?? "");
    setMsg("");
  }

  function salvar() {
    const valores: Record<string, number> = {};
    for (const { chave } of CAMPOS_MEDIDA) {
      const n = parseNum(rasc[chave] ?? "");
      if (n != null) valores[chave] = n;
    }
    if (Object.keys(valores).length === 0 && !obs.trim()) {
      setMsg("Preencha ao menos um campo.");
      return;
    }
    st.salvarMedida({ id: data, data, valores, obs: obs.trim() || undefined, updated_at: agora() });
    aoFechar();
  }

  return (
    <div className="card" style={{ marginTop: 16 }}>
      <h3>Registrar medidas</h3>
      <p className="card-sub">Peso em kg, circunferências em cm. Preencha só o que medir hoje.</p>
      <label className="form-linha">
        <span>Data</span>
        <input type="date" value={data} onChange={(e) => trocarData(e.target.value || dataHoje())} />
      </label>
      <div className="medida-grid">
        {CAMPOS_MEDIDA.map(({ chave, rotulo, unidade }) => (
          <label className="medida-campo" key={chave}>
            <span>
              {rotulo} <small>{unidade}</small>
            </span>
            <input
              type="text"
              inputMode="decimal"
              value={rasc[chave] ?? ""}
              placeholder={anterior?.valores[chave] != null ? String(anterior.valores[chave]) : "—"}
              onChange={(e) => setRasc({ ...rasc, [chave]: e.target.value })}
              aria-label={`${rotulo} em ${unidade}`}
            />
          </label>
        ))}
      </div>
      <label className="form-linha" style={{ marginTop: 12 }}>
        <span>Observações (opcional)</span>
        <input value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Jejum, pós-treino, foto tirada..." />
      </label>
      <p className="msg-aviso">{msg}</p>
      <div className="acoes">
        <button className="btn btn-pri" type="button" onClick={salvar}>
          Salvar
        </button>
        <button className="btn btn-sec" type="button" onClick={aoFechar}>
          Cancelar
        </button>
      </div>
    </div>
  );
}

function GraficosMedidas({ lista }: { lista: Medida[] }) {
  const comDados = CAMPOS_MEDIDA.filter(({ chave }) => pontosCampo(lista, chave).length > 0);
  if (comDados.length === 0) {
    return <div className="vazio">As medidas registradas não têm valores numéricos para gráficos.</div>;
  }
  return (
    <>
      {comDados.map(({ chave, rotulo, unidade }) => {
        const pts = pontosCampo(lista, chave);
        const primeiro = pts[0].v;
        const fim = pts[pts.length - 1].v;
        const delta = fim - primeiro;
        // peso é neutro (a direção desejada varia: cutting × bulking);
        // cintura/gordura para baixo e circunferências musculares para cima são "bom"
        const neutro = chave === "peso";
        const menorMelhor = chave === "cintura" || chave === "gordura";
        const bom = menorMelhor ? delta < 0 : delta > 0;
        const cls = neutro || delta === 0 ? "" : bom ? "evo-delta-pos" : "evo-delta-neg";
        return (
          <div className="evo-card" key={chave}>
            <div className="evo-nome">
              {rotulo}{" "}
              <small style={{ color: "var(--muted)", fontWeight: 400 }}>({unidade})</small>
            </div>
            <Grafico pts={pts} linha="#1aa15a" area="rgba(26,161,90,.12)" ponto="#f15a22" />
            <div className="evo-stat">
              <span className="item">
                Atual:{" "}
                <b>
                  {fim} {unidade}
                </b>
              </span>
              {pts.length > 1 && (
                <span className={`item ${cls}`}>
                  <b>
                    {formatarDelta(delta)} {unidade}
                  </b>{" "}
                  desde {formatarData(pts[0].date).slice(0, 5)}
                </span>
              )}
            </div>
          </div>
        );
      })}
    </>
  );
}

function HistoricoMedidas({ lista, aoEditar }: { lista: Medida[]; aoEditar(data: string): void }) {
  const st = useStore();
  const recentes = [...lista].reverse();
  return (
    <div className="card">
      <h3>Histórico</h3>
      <p className="card-sub">{lista.length} registro(s). Toque numa data para editar.</p>
      {recentes.map((m) => {
        const preenchidos = CAMPOS_MEDIDA.filter(({ chave }) => m.valores[chave] != null).length;
        return (
          <div className="hist-medida" key={m.id}>
            <button className="hist-data" type="button" onClick={() => aoEditar(m.data)}>
              <b>{formatarData(m.data)}</b>
              <small>
                {m.valores.peso != null ? `${m.valores.peso} kg · ` : ""}
                {preenchidos} medida(s){m.obs ? ` · ${m.obs}` : ""}
              </small>
            </button>
            <button
              className="btn-mini perigo"
              type="button"
              onClick={() => {
                if (confirm(`Excluir as medidas de ${formatarData(m.data)}?`)) st.excluirMedida(m.id);
              }}
            >
              Excluir
            </button>
          </div>
        );
      })}
    </div>
  );
}
