import { seedExercicioId, slug } from "./seeds";

/**
 * Nomes unificados dos exercícios dos programas.
 *
 * O mesmo movimento aparecia com nomes diferentes entre fichas ("Tríceps
 * corda", "Tríceps na corda", "Tríceps corda com 2 segundos de pico...") e cada
 * nome virava um exercício separado, com histórico separado. Aqui cada
 * movimento tem UM id — sempre o id que já existia (o histórico, as fotos e as
 * instruções apontam para ele) — e um nome limpo; o resto vira apelido.
 *
 * A técnica que estava no nome ("2s de pico de contração") sai do nome e vira
 * etiqueta do exercício no treino (`tecnicas: ["pico2s"]`).
 */

export interface Canonico {
  /** id definitivo (o que já existia) */
  id: string;
  /** nome exibido */
  nome: string;
  /** outros nomes (antigos ou dos PDFs) que são o mesmo movimento */
  apelidos: string[];
}

const C = (nomeOriginal: string, nome: string, apelidos: string[] = []): Canonico => ({
  id: seedExercicioId(nomeOriginal),
  nome,
  apelidos: [nomeOriginal, ...apelidos],
});

export const CANONICOS: Canonico[] = [
  // peito
  C("Supino inclinado com halteres ou máquina", "Supino inclinado com halteres ou máquina", ["Supino inclinado"]),
  C("Supino reto com halteres ou máquina", "Supino reto com halteres ou máquina", ["Supino reto"]),
  C("Supino declinado barra ou máquina", "Supino declinado com barra ou máquina", ["Supino declinado"]),
  C("Voador com 2s de pico de contração", "Voador", ["Voador com 2 segundos de pico de contração"]),
  // costas
  C("Remada curvada com barra (2s de pico de contração)", "Remada curvada com barra", [
    "Remada curvada com barra com 2 segundos de pico de contração",
  ]),
  C("Remada baixa triângulo (2s de pico de contração)", "Remada baixa triângulo", ["Remada baixa triângulo", "Remada baixa triangulo"]),
  C("Remada baixa pegada aberta ou máquina pegada aberta (2s de pico)", "Remada baixa pegada aberta ou máquina", [
    "Remada baixa pegada aberta",
    "Remada baixa pegada aberta ou máquina pegada aberta",
  ]),
  C("Pulley frente triângulo (2s de pico de contração)", "Pulley frente triângulo", ["Pulley frente triângulo"]),
  C("Pulley frente aberto", "Pulley frente aberto"),
  C("Meio Terra", "Meio terra"),
  C("Hiper extensão no banco romano", "Hiperextensão no banco romano"),
  // ombro
  C("Desenvolvimento halteres ou máquina", "Desenvolvimento com halteres ou máquina", [
    "Desenvolvimento sentado com halteres",
    "Desenvolvimento sentado halteres",
    "Desenvolvimento com halteres",
  ]),
  C("Elevação frontal na corda ou halteres", "Elevação frontal (corda ou halteres)", ["Elevação frontal"]),
  C("Elevação lateral", "Elevação lateral", ["Elevação lateral sentado com halteres"]),
  C("Elevação lateral unilateral no cabo", "Elevação lateral unilateral no cabo", [
    "Elevação lateral máquina ou unilateral no cabo",
    "Elevação unilateral cabo",
  ]),
  // braços
  C("Rosca direta barra livre ou cabo com barra", "Rosca direta com barra ou cabo", ["Rosca direta barra", "Rosca direta cabo"]),
  C("Rosca Scott na máquina", "Rosca Scott (máquina ou cabo)", ["Rosca Scott máquina", "Rosca Scott máquina ou cabo"]),
  C("Rosca direta na corda", "Rosca direta na corda", ["Rosca direta corda"]),
  C("Tríceps testa na corda", "Tríceps testa na corda", ["Tríceps testa corda", "Tríceps testa corda banco 35 graus"]),
  C("Tríceps na corda", "Tríceps na corda", ["Tríceps corda"]),
  C("Tríceps francês", "Tríceps francês", ["Tríceps francês na corda", "Tríceps francês com corda"]),
  // pernas
  C("Agachamento livre", "Agachamento livre"),
  C("Leg 45", "Leg 45", ["Leg 45°", "Leg press 45"]),
  C("Hack machine", "Hack machine"),
  C("Cadeira extensora", "Cadeira extensora", ["Extensor", "Extensora"]),
  C("Mesa flexora deitado (2s de pico de contração)", "Mesa flexora deitado", ["Flexor deitado", "Mesa flexora deitado"]),
  C("Flexor sentado", "Cadeira flexora (sentado)", ["Flexor sentado (2s de pico de contração)"]),
  C("Stiff", "Stiff"),
  C("Elevação de quadril (2s de pico de contração)", "Elevação de quadril", ["Elevação de quadril"]),
  C("Abdutor", "Abdutor", ["Abdutor (2s de pico de contração)"]),
  C("Panturrilha na máquina ou em pé no smith", "Panturrilha em pé (máquina ou smith)", [
    "Panturrilha máquina",
    "Panturrilha em pé na máquina ou smith",
    "Panturrilha em pé na máquina ou no smith com step",
  ]),
  C("Panturrilha sentada", "Panturrilha sentada"),
  // abdômen
  C("Abdominal supra na prancha declinada", "Abdominal supra na prancha declinada"),
  C("Abdominal infra na torre", "Abdominal infra na torre"),
  C("Abdominal supra no solo", "Abdominal supra no solo"),
];

const POR_SLUG = new Map<string, Canonico>();
for (const c of CANONICOS) {
  POR_SLUG.set(slug(c.nome), c);
  for (const a of c.apelidos) POR_SLUG.set(slug(a), c);
}

/** Exercício unificado pelo nome (canônico ou apelido), se houver. */
export function canonicoPorNome(nome: string): Canonico | undefined {
  return POR_SLUG.get(slug(nome));
}

/** Id do exercício para um nome de programa: o unificado, ou o derivado do nome. */
export function idDoExercicio(nome: string): string {
  return canonicoPorNome(nome)?.id ?? seedExercicioId(nome);
}

/**
 * Ids antigos que devem ser absorvidos pelo canônico (apelidos com id próprio).
 * Ex.: "sd_ex_flexor-deitado" (do catálogo 4x) → id da mesa flexora.
 */
export function mapaDeApelidos(): Map<string, Canonico> {
  const m = new Map<string, Canonico>();
  for (const c of CANONICOS) {
    for (const a of c.apelidos) {
      const id = seedExercicioId(a);
      if (id !== c.id) m.set(id, c);
    }
    const doNome = seedExercicioId(c.nome);
    if (doNome !== c.id) m.set(doNome, c);
  }
  return m;
}

/** Nome antigo que trazia a técnica "pico de contração" embutida. */
export function nomeTinhaPico(nome: string): boolean {
  return /pico/i.test(nome);
}
