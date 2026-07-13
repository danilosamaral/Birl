export const GLOSSARIO: Record<string, { t: string; d: string }> = {
  aquecimento: { t: "Série de aquecimento", d: "Séries leves (~30% da carga máxima) pra preparar músculos e articulações. Ficam bem longe da falha — não devem te cansar." },
  ajuste: { t: "Série de ajuste (preparatória)", d: "Carga já considerável, mas ainda longe da falha. Servem pra 'sentir o dia' e decidir quanto vai usar na série de trabalho." },
  trabalho: { t: "Série de trabalho", d: "A série que conta de verdade. Você vai até a falha (ou quase) dentro da faixa de repetições programada." },
  rir: { t: "RIR — Repetições em Reserva", d: "Quantas repetições ainda sobrariam se você continuasse. RIR 0 = falha total; RIR 2 = ainda dava mais 2. Quanto menor o RIR, mais perto da falha você chegou." },
  dropset: { t: "Drop set", d: "Ao chegar na falha, você reduz a carga na hora (sem descansar) e continua até falhar de novo. É uma técnica pra intensificar o fim da série." },
  restpause: { t: "Rest pause", d: "Ao falhar, descanse poucos segundos (ex.: 10s) e faça mais algumas reps com a mesma carga. '2 rest pause de 10s' = repetir essa pausa curta duas vezes." },
  pico: { t: "Pico de contração", d: "Segurar a contração no ponto de maior encurtamento do músculo por alguns segundos (ex.: 2s) antes de voltar o movimento." },
  series: { t: 'Campo "Séries"', d: "Quantas séries daquela linha você realmente fez. '1-2 ×' quer dizer de 1 a 2 séries; '3 ×' quer dizer 3 séries. A dica cinza no campo mostra o que está previsto." },
  e1rm: { t: "1RM estimado", d: "Estimativa da carga máxima para 1 repetição, calculada a partir de carga × reps (fórmula de Epley). Serve para comparar força entre sessões com reps diferentes." },
};

export const GLOSSARIO_ORDEM = ["aquecimento", "ajuste", "trabalho", "series", "rir", "dropset", "restpause", "pico"];

export function glosDaNota(nota?: string): string | "" {
  if (!nota) return "";
  if (/drop/i.test(nota)) return "dropset";
  if (/rest pause/i.test(nota)) return "restpause";
  return "";
}
