export const GLOSSARIO: Record<string, { t: string; d: string }> = {
  aquecimento: { t: "Série de aquecimento", d: "Séries leves (~30% da carga máxima) pra preparar músculos e articulações. Ficam bem longe da falha — não devem te cansar." },
  ajuste: { t: "Série de ajuste (preparatória)", d: "Carga já considerável, mas ainda longe da falha. Servem pra 'sentir o dia' e decidir quanto vai usar na série de trabalho." },
  trabalho: { t: "Série de trabalho", d: "A série que conta de verdade. Você vai até a falha (ou quase) dentro da faixa de repetições programada." },
  rir: { t: "RIR — Repetições em Reserva", d: "Quantas repetições ainda sobrariam se você continuasse. RIR 0 = falha total; RIR 2 = ainda dava mais 2. Quanto menor o RIR, mais perto da falha você chegou." },
  dropset: { t: "Drop set", d: "Ao chegar na falha, você reduz a carga na hora (sem descansar) e continua até falhar de novo. É uma técnica pra intensificar o fim da série." },
  restpause: { t: "Rest pause", d: "Ao falhar, descanse poucos segundos (ex.: 10s) e faça mais algumas reps com a mesma carga. '2 rest pause de 10s' = repetir essa pausa curta duas vezes." },
  pico: { t: "Pico de contração (2s)", d: "Segure a contração por 2 segundos no ponto de maior encurtamento do músculo (ex.: cotovelos para trás na remada) antes de voltar o movimento." },
  parciais: { t: "Reps parciais", d: "Depois de falhar na amplitude completa, continue fazendo repetições curtas (meia amplitude) — no leg 45, por exemplo, mais 10 parciais." },
  rm: { t: "RM — máximo de repetições", d: "\"3 × RM\" = 3 séries com o máximo de repetições que você conseguir, com boa execução. Não há faixa de reps nem sugestão de carga." },
  series: { t: "1-2 × 10 a 15", d: "O primeiro número é quantas séries (\"1-2\" = de 1 a 2 séries); o segundo é a faixa de repetições. Cada botão Feita registra uma série." },
  e1rm: { t: "1RM estimado", d: "Estimativa da carga máxima para 1 repetição, calculada a partir de carga × reps (fórmula de Epley). Serve para comparar força entre sessões com reps diferentes." },
};

export const GLOSSARIO_ORDEM = ["aquecimento", "ajuste", "trabalho", "series", "rir", "dropset", "restpause", "pico", "parciais", "rm", "e1rm"];

export function glosDaNota(nota?: string): string | "" {
  if (!nota) return "";
  if (/drop/i.test(nota)) return "dropset";
  if (/rest pause/i.test(nota)) return "restpause";
  if (/parcia/i.test(nota)) return "parciais";
  return "";
}
