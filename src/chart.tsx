import type { PontoCarga } from "./utils";
import { formatarDataCurta } from "./utils";

interface Props {
  pts: PontoCarga[];
  w?: number;
  h?: number;
  pad?: number;
  linha?: string;
  area?: string;
  ponto?: string;
  texto?: string;
  min?: number;
  max?: number;
  /** cor por ponto (ex.: por programa); tem prioridade sobre `ponto` */
  coresPontos?: string[];
}

export function Grafico({
  pts,
  w = 320,
  h = 96,
  pad = 16,
  linha = "#f15a22",
  area = "rgba(241,90,34,.12)",
  ponto = "#1aa15a",
  texto = "#9a9a9e",
  min,
  max,
  coresPontos,
}: Props) {
  if (pts.length === 0) return null;
  const plotW = w - 2 * pad;
  const plotH = h - 2 * pad;
  const vals = pts.map((p) => p.v);
  let mn = min ?? Math.min(...vals);
  let mx = max ?? Math.max(...vals);
  if (mn === mx) {
    mn -= 1;
    mx += 1;
  }
  const range = mx - mn;
  const X = (i: number) => (pts.length === 1 ? pad + plotW / 2 : pad + (i / (pts.length - 1)) * plotW);
  const Y = (v: number) => pad + plotH - ((v - mn) / range) * plotH;

  const d = pts.map((p, i) => `${i === 0 ? "M" : "L"}${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ");
  const areaD =
    pts.length > 1
      ? `M${X(0).toFixed(1)} ${(pad + plotH).toFixed(1)} ` +
        pts.map((p, i) => `L${X(i).toFixed(1)} ${Y(p.v).toFixed(1)}`).join(" ") +
        ` L${X(pts.length - 1).toFixed(1)} ${(pad + plotH).toFixed(1)} Z`
      : "";
  const f = pts[0];
  const l = pts[pts.length - 1];

  return (
    <svg viewBox={`0 0 ${w} ${h}`} width="100%" height={h} role="img" aria-label="Gráfico de evolução">
      {areaD && <path d={areaD} fill={area} />}
      <path d={d} fill="none" stroke={linha} strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round" />
      {pts.map((p, i) => (
        <circle key={i} cx={X(i).toFixed(1)} cy={Y(p.v).toFixed(1)} r={coresPontos ? 4.5 : 3.5} fill={coresPontos?.[i] ?? ponto} />
      ))}
      <text x={X(0).toFixed(1)} y={(Y(f.v) - 7).toFixed(1)} fill={texto} fontSize={11} textAnchor="middle">
        {f.v}
      </text>
      {pts.length > 1 && (
        <text x={X(pts.length - 1).toFixed(1)} y={(Y(l.v) - 7).toFixed(1)} fill={texto} fontSize={11} textAnchor="middle">
          {l.v}
        </text>
      )}
      <text x={X(0).toFixed(1)} y={h - 3} fill={texto} fontSize={9} textAnchor="middle">
        {formatarDataCurta(f.date)}
      </text>
      {pts.length > 1 && (
        <text x={X(pts.length - 1).toFixed(1)} y={h - 3} fill={texto} fontSize={9} textAnchor="middle">
          {formatarDataCurta(l.date)}
        </text>
      )}
    </svg>
  );
}
