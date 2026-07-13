import type { Exercicio, Midia } from "./types";
import { seedExercicioId } from "./seeds";

/**
 * Biblioteca curada de exercícios com imagens de execução da base pública
 * free-exercise-db (domínio público), servidas via CDN e cacheadas pelo
 * service worker para funcionar offline na academia.
 */

export const MIDIA_CDN = "https://cdn.jsdelivr.net/gh/yuhonas/free-exercise-db@main/exercises/";
export const SEED_EPOCH_V2 = "2026-01-02T00:00:00.000Z";

function imgs(libId: string): string[] {
  return [`${MIDIA_CDN}${libId}/0.jpg`, `${MIDIA_CDN}${libId}/1.jpg`];
}

interface DefBib {
  nome: string;
  grupo: string;
  equipamento: string;
  libId: string;
  passos: string[];
}

const B = (nome: string, grupo: string, equipamento: string, libId: string, passos: string[]): DefBib => ({
  nome, grupo, equipamento, libId, passos,
});

export const BIBLIOTECA: DefBib[] = [
  // ---------- Peito ----------
  B("Supino reto com barra", "Peito", "Barra", "Barbell_Bench_Press_-_Medium_Grip", [
    "Deite no banco com os pés firmes no chão e escápulas retraídas.",
    "Desça a barra controlada até a linha dos mamilos.",
    "Empurre de volta até estender os braços, sem bater os cotovelos.",
  ]),
  B("Crucifixo com halteres", "Peito", "Halteres", "Dumbbell_Flyes", [
    "Deite no banco com halteres acima do peito, cotovelos levemente flexionados.",
    "Abra os braços em arco até sentir alongar o peitoral.",
    "Volte pelo mesmo arco apertando o peito no topo.",
  ]),
  B("Crucifixo inclinado com halteres", "Peito", "Halteres", "Incline_Dumbbell_Flyes", [
    "No banco inclinado (30–45°), segure os halteres acima do peito.",
    "Abra em arco mantendo a leve flexão dos cotovelos.",
    "Suba contraindo a parte superior do peitoral.",
  ]),
  B("Cross-over na polia", "Peito", "Cabo", "Cable_Crossover", [
    "Com as polias altas, dê um passo à frente e incline levemente o tronco.",
    "Traga as mãos à frente do corpo em arco, cruzando levemente.",
    "Segure 1s a contração e volte controlado.",
  ]),
  B("Supino na máquina", "Peito", "Máquina", "Machine_Bench_Press", [
    "Ajuste o banco para as manoplas ficarem na altura do peito.",
    "Empurre até quase estender os cotovelos.",
    "Volte devagar sem deixar o peso descansar entre as reps.",
  ]),
  B("Flexão de braço", "Peito", "Peso do corpo", "Pushups", [
    "Mãos um pouco além da largura dos ombros, corpo em linha reta.",
    "Desça até o peito quase tocar o chão.",
    "Empurre de volta mantendo o abdômen firme.",
  ]),
  B("Paralelas (ênfase peito)", "Peito", "Peso do corpo", "Dips_-_Chest_Version", [
    "Nas paralelas, incline o tronco à frente e flexione levemente os joelhos.",
    "Desça até sentir alongar o peitoral.",
    "Suba sem estender totalmente os cotovelos para manter a tensão.",
  ]),
  // ---------- Costas ----------
  B("Puxada aberta no pulley", "Costas", "Cabo", "Wide-Grip_Lat_Pulldown", [
    "Pegada aberta e pronada, tronco levemente inclinado para trás.",
    "Puxe a barra até a parte alta do peito levando os cotovelos para baixo.",
    "Suba controlado alongando bem as costas.",
  ]),
  B("Barra fixa", "Costas", "Peso do corpo", "Pullups", [
    "Pendure-se com pegada pronada, um pouco além dos ombros.",
    "Puxe até o queixo passar a barra, peito em direção a ela.",
    "Desça controlado até quase estender os braços.",
  ]),
  B("Remada unilateral com halter", "Costas", "Halteres", "One-Arm_Dumbbell_Row", [
    "Apoie mão e joelho no banco, costas neutras.",
    "Puxe o halter em direção ao quadril, cotovelo junto ao corpo.",
    "Desça alongando sem girar o tronco.",
  ]),
  B("Remada cavalinho (T-bar)", "Costas", "Barra", "T-Bar_Row_with_Handle", [
    "Tronco inclinado (~45°), joelhos semiflexionados, costas neutras.",
    "Puxe o triângulo até o peito apertando as escápulas.",
    "Desça devagar sem arredondar a lombar.",
  ]),
  B("Pulldown com braços estendidos", "Costas", "Cabo", "Straight-Arm_Pulldown", [
    "Em pé, segure a barra na polia alta com braços quase estendidos.",
    "Puxe em arco até as coxas usando o dorsal.",
    "Volte controlado até sentir alongar.",
  ]),
  B("Remada na máquina (iso)", "Costas", "Máquina", "Leverage_Iso_Row", [
    "Peito apoiado, pegue as manoplas.",
    "Puxe levando os cotovelos para trás, apertando as escápulas.",
    "Volte devagar mantendo o peito no apoio.",
  ]),
  B("Face pull", "Costas", "Cabo", "Face_Pull", [
    "Corda na polia alta, pegada neutra.",
    "Puxe em direção ao rosto abrindo os cotovelos.",
    "Aperte a parte de trás dos ombros e volte controlado.",
  ]),
  B("Hiperextensão lombar", "Lombar", "Peso do corpo", "Hyperextensions_Back_Extensions", [
    "No banco romano, quadril apoiado e pés presos.",
    "Desça o tronco controlado.",
    "Suba até alinhar o tronco com as pernas, sem hiperestender.",
  ]),
  // ---------- Ombro ----------
  B("Desenvolvimento com barra", "Ombro", "Barra", "Barbell_Shoulder_Press", [
    "Sentado ou em pé, barra na altura das clavículas.",
    "Empurre para cima até estender os braços.",
    "Desça controlado até a linha do queixo/clavícula.",
  ]),
  B("Desenvolvimento Arnold", "Ombro", "Halteres", "Arnold_Dumbbell_Press", [
    "Comece com as palmas viradas para você na altura dos ombros.",
    "Suba girando os punhos até as palmas apontarem para frente.",
    "Desça revertendo o giro, controlado.",
  ]),
  B("Elevação lateral sentado", "Ombro", "Halteres", "Seated_Side_Lateral_Raise", [
    "Sentado, halteres ao lado do corpo.",
    "Eleve os braços até a linha dos ombros, cotovelos levemente flexionados.",
    "Desça devagar resistindo ao peso.",
  ]),
  B("Crucifixo invertido na máquina", "Ombro", "Máquina", "Reverse_Machine_Flyes", [
    "Peito apoiado no encosto, manoplas à frente.",
    "Abra os braços para trás na linha dos ombros.",
    "Segure 1s e volte controlado.",
  ]),
  B("Remada alta com barra", "Trapézio", "Barra", "Upright_Barbell_Row", [
    "Pegada um pouco mais fechada que os ombros.",
    "Puxe a barra rente ao corpo até a linha do peito, cotovelos acima das mãos.",
    "Desça controlado.",
  ]),
  B("Encolhimento com barra", "Trapézio", "Barra", "Barbell_Shrug", [
    "Em pé, barra à frente com braços estendidos.",
    "Eleve os ombros em direção às orelhas, sem girar.",
    "Segure 1s no topo e desça devagar.",
  ]),
  B("Encolhimento com halteres", "Trapézio", "Halteres", "Dumbbell_Shrug", [
    "Halteres ao lado do corpo, braços estendidos.",
    "Encolha os ombros o mais alto possível.",
    "Pause e desça controlado.",
  ]),
  // ---------- Bíceps ----------
  B("Rosca alternada com halteres", "Bíceps", "Halteres", "Dumbbell_Alternate_Bicep_Curl", [
    "Em pé, halteres ao lado do corpo.",
    "Suba um braço girando a palma para cima (supinando).",
    "Desça controlado e alterne.",
  ]),
  B("Rosca martelo", "Bíceps", "Halteres", "Hammer_Curls", [
    "Pegada neutra (palmas frente a frente).",
    "Suba o halter sem girar o punho, cotovelo fixo.",
    "Desça devagar até estender.",
  ]),
  B("Rosca concentrada", "Bíceps", "Halteres", "Concentration_Curls", [
    "Sentado, cotovelo apoiado na parte interna da coxa.",
    "Suba o halter contraindo o bíceps no topo.",
    "Desça lento até quase estender.",
  ]),
  B("Rosca inclinada com halteres", "Bíceps", "Halteres", "Incline_Dumbbell_Curl", [
    "No banco inclinado, braços pendendo para trás do corpo.",
    "Suba os halteres sem mover os cotovelos.",
    "Desça alongando bem o bíceps.",
  ]),
  B("Rosca com barra EZ", "Bíceps", "Barra", "EZ-Bar_Curl", [
    "Pegue a barra EZ na parte angulada, cotovelos junto ao corpo.",
    "Suba até a contração máxima.",
    "Desça controlado sem balançar o tronco.",
  ]),
  B("Rosca Scott com barra", "Bíceps", "Barra", "Preacher_Curl", [
    "Braços apoiados no banco Scott, axilas encaixadas.",
    "Suba a barra contraindo o bíceps.",
    "Desça devagar até quase estender, sem relaxar no fundo.",
  ]),
  // ---------- Tríceps ----------
  B("Tríceps testa com barra EZ", "Tríceps", "Barra", "EZ-Bar_Skullcrusher", [
    "Deitado, barra acima da testa com braços estendidos.",
    "Flexione apenas os cotovelos descendo a barra até a testa.",
    "Estenda de volta sem abrir os cotovelos.",
  ]),
  B("Tríceps pushdown na barra", "Tríceps", "Cabo", "Triceps_Pushdown", [
    "Polia alta, cotovelos colados ao tronco.",
    "Empurre a barra até estender totalmente os braços.",
    "Volte controlado até a altura do peito.",
  ]),
  B("Tríceps coice com halter", "Tríceps", "Halteres", "Tricep_Dumbbell_Kickback", [
    "Tronco inclinado, braço paralelo ao chão e cotovelo fixo.",
    "Estenda o antebraço para trás até a extensão total.",
    "Volte devagar mantendo o cotovelo alto.",
  ]),
  B("Extensão de tríceps acima da cabeça na corda", "Tríceps", "Cabo", "Cable_Rope_Overhead_Triceps_Extension", [
    "De costas para a polia baixa, corda atrás da cabeça.",
    "Estenda os braços à frente/acima separando a corda no final.",
    "Volte controlado alongando o tríceps.",
  ]),
  B("Mergulho no banco", "Tríceps", "Peso do corpo", "Bench_Dips", [
    "Mãos no banco atrás do corpo, pernas estendidas à frente.",
    "Desça flexionando os cotovelos até ~90°.",
    "Empurre de volta contraindo o tríceps.",
  ]),
  B("Paralelas (ênfase tríceps)", "Tríceps", "Peso do corpo", "Dips_-_Triceps_Version", [
    "Tronco ereto, cotovelos apontando para trás.",
    "Desça até ~90° de flexão.",
    "Suba até estender os braços.",
  ]),
  // ---------- Pernas ----------
  B("Agachamento frontal", "Quadríceps", "Barra", "Front_Barbell_Squat", [
    "Barra apoiada nos deltoides da frente, cotovelos altos.",
    "Agache mantendo o tronco o mais vertical possível.",
    "Suba empurrando o chão com o pé inteiro.",
  ]),
  B("Agachamento goblet", "Quadríceps", "Halteres", "Goblet_Squat", [
    "Segure o halter junto ao peito.",
    "Agache entre os joelhos mantendo o peito alto.",
    "Suba sem deixar os joelhos caírem para dentro.",
  ]),
  B("Agachamento hack", "Quadríceps", "Máquina", "Hack_Squat", [
    "Costas apoiadas na máquina, pés na largura dos ombros.",
    "Desça controlado até ~90° ou mais.",
    "Suba sem travar os joelhos no topo.",
  ]),
  B("Agachamento no smith", "Quadríceps", "Smith", "Smith_Machine_Squat", [
    "Barra nas costas, pés levemente à frente do corpo.",
    "Desça controlado mantendo os joelhos na linha dos pés.",
    "Suba empurrando com o pé inteiro.",
  ]),
  B("Afundo com halteres", "Quadríceps", "Halteres", "Dumbbell_Lunges", [
    "Dê um passo à frente com halteres nas mãos.",
    "Desça até o joelho de trás quase tocar o chão.",
    "Empurre de volta e alterne as pernas.",
  ]),
  B("Agachamento búlgaro", "Quadríceps", "Halteres", "Split_Squat_with_Dumbbells", [
    "Pé de trás apoiado no banco, halteres nas mãos.",
    "Desça verticalmente flexionando a perna da frente.",
    "Suba sem impulsionar com a perna de trás.",
  ]),
  B("Levantamento terra", "Posterior", "Barra", "Barbell_Deadlift", [
    "Barra rente à canela, costas neutras e peito alto.",
    "Suba estendendo quadril e joelhos juntos.",
    "Desça controlado mantendo a barra próxima ao corpo.",
  ]),
  B("Bom dia (good morning)", "Posterior", "Barra", "Good_Morning", [
    "Barra nas costas, joelhos semiflexionados.",
    "Incline o tronco à frente empurrando o quadril para trás.",
    "Suba contraindo posteriores e glúteos.",
  ]),
  B("Stiff com halteres", "Posterior", "Halteres", "Stiff-Legged_Dumbbell_Deadlift", [
    "Halteres à frente das coxas, joelhos quase estendidos.",
    "Desça empurrando o quadril para trás até alongar o posterior.",
    "Suba contraindo glúteos e posteriores.",
  ]),
  B("Cadeira adutora", "Quadríceps", "Máquina", "Thigh_Adductor", [
    "Sente com as pernas abertas nos apoios.",
    "Feche as pernas contra a resistência.",
    "Volte controlado sem bater o peso.",
  ]),
  B("Cadeira abdutora", "Glúteos", "Máquina", "Thigh_Abductor", [
    "Sente com as pernas juntas nos apoios.",
    "Abra as pernas contra a resistência.",
    "Volte devagar mantendo a tensão.",
  ]),
  B("Ponte de glúteo com barra", "Glúteos", "Barra", "Barbell_Glute_Bridge", [
    "Deitado, barra sobre o quadril e pés firmes no chão.",
    "Eleve o quadril contraindo os glúteos no topo.",
    "Desça controlado sem relaxar totalmente.",
  ]),
  B("Coice no cabo", "Glúteos", "Cabo", "Glute_Kickback", [
    "Tornozeleira na polia baixa, tronco inclinado apoiado.",
    "Estenda a perna para trás contraindo o glúteo.",
    "Volte devagar sem girar o quadril.",
  ]),
  B("Panturrilha em pé", "Panturrilha", "Máquina", "Standing_Calf_Raises", [
    "Pontas dos pés no degrau, calcanhares livres.",
    "Suba o mais alto possível e segure 1s.",
    "Desça alongando bem abaixo da linha do degrau.",
  ]),
  B("Panturrilha no leg press", "Panturrilha", "Máquina", "Calf_Press_On_The_Leg_Press_Machine", [
    "Pontas dos pés na base da plataforma.",
    "Empurre estendendo os tornozelos.",
    "Volte alongando controlado.",
  ]),
  // ---------- Abdômen ----------
  B("Abdominal supra (crunch)", "Abdômen", "Peso do corpo", "Crunches", [
    "Deitado, joelhos flexionados e mãos ao lado da cabeça.",
    "Suba o tronco contraindo o abdômen, sem puxar o pescoço.",
    "Desça controlado sem relaxar no chão.",
  ]),
  B("Abdominal na polia (corda)", "Abdômen", "Cabo", "Cable_Crunch", [
    "Ajoelhado de frente para a polia alta, corda junto à cabeça.",
    "Flexione o tronco levando os cotovelos aos joelhos.",
    "Volte controlado mantendo a tensão no cabo.",
  ]),
  B("Prancha", "Abdômen", "Peso do corpo", "Plank", [
    "Apoie antebraços e pontas dos pés, corpo em linha reta.",
    "Contraia abdômen e glúteos.",
    "Mantenha o tempo programado sem deixar o quadril cair.",
  ]),
  B("Elevação de pernas no banco", "Abdômen", "Peso do corpo", "Flat_Bench_Lying_Leg_Raise", [
    "Deitado no banco, mãos segurando atrás da cabeça.",
    "Eleve as pernas estendidas até a vertical.",
    "Desça controlado sem tocar o banco.",
  ]),
  B("Abdominal máquina", "Abdômen", "Máquina", "Ab_Crunch_Machine", [
    "Ajuste o banco e segure as manoplas.",
    "Flexione o tronco contraindo o abdômen.",
    "Volte devagar sem deixar o peso descansar.",
  ]),
  B("Rotação russa", "Abdômen", "Peso do corpo", "Russian_Twist", [
    "Sentado com tronco inclinado para trás e pés elevados.",
    "Gire o tronco de um lado ao outro, controlado.",
    "Mantenha o abdômen contraído o tempo todo.",
  ]),
];

/**
 * Enriquecimento dos exercícios que já existem nos treinos A–D:
 * imagens, equipamento e instruções (aplicado apenas se o usuário
 * ainda não editou o exercício).
 */
interface Enriquecimento {
  equipamento: string;
  midia: Midia;
  instrucoes: string;
}

const ENR: Array<[string, string, string, string[]]> = [
  // [nome exato do seed, equipamento, libId, passos]
  ["Supino inclinado com halteres ou máquina", "Halteres/Máquina", "Incline_Dumbbell_Press", [
    "Banco inclinado (30–45°), halteres na linha do peito.",
    "Empurre até quase estender os cotovelos.",
    "Desça controlado até alongar o peitoral.",
  ]],
  ["Supino reto com halteres ou máquina", "Halteres/Máquina", "Dumbbell_Bench_Press", [
    "Deitado no banco reto, halteres na lateral do peito.",
    "Empurre para cima aproximando os halteres no topo.",
    "Desça devagar até a linha do peito.",
  ]],
  ["Supino declinado barra ou máquina", "Barra/Máquina", "Decline_Barbell_Bench_Press", [
    "No banco declinado, pegada um pouco além dos ombros.",
    "Desça a barra até a parte baixa do peito.",
    "Empurre de volta sem travar os cotovelos.",
  ]],
  ["Voador com 2s de pico de contração", "Máquina", "Butterfly", [
    "Ajuste o banco para as manoplas na linha do peito.",
    "Feche os braços à frente e segure 2s a contração.",
    "Volte controlado alongando o peitoral.",
  ]],
  ["Rosca direta barra livre ou cabo com barra", "Barra/Cabo", "Barbell_Curl", [
    "Em pé, pegada supinada na largura dos ombros.",
    "Suba a barra sem balançar o tronco, cotovelos fixos.",
    "Desça controlado até quase estender.",
  ]],
  ["Rosca Scott na máquina", "Máquina", "Machine_Preacher_Curls", [
    "Braços apoiados no banco, axilas encaixadas no apoio.",
    "Suba contraindo o bíceps no topo.",
    "Desça devagar sem relaxar no fundo.",
  ]],
  ["Rosca direta na corda", "Cabo", "Cable_Hammer_Curls_-_Rope_Attachment", [
    "Corda na polia baixa, pegada neutra.",
    "Suba flexionando os cotovelos junto ao corpo.",
    "Desça controlado mantendo a tensão.",
  ]],
  ["Abdominal supra na prancha declinada", "Peso do corpo", "Decline_Crunch", [
    "Na prancha declinada, pés presos e mãos ao lado da cabeça.",
    "Suba o tronco contraindo o abdômen.",
    "Desça devagar sem relaxar totalmente.",
  ]],
  ["Remada curvada com barra (2s de pico de contração)", "Barra", "Bent_Over_Barbell_Row", [
    "Tronco inclinado (~45°), costas neutras.",
    "Puxe a barra até o abdômen e segure 2s.",
    "Desça controlado alongando as costas.",
  ]],
  ["Remada baixa triângulo (2s de pico de contração)", "Cabo", "Seated_Cable_Rows", [
    "Sentado, tronco ereto e triângulo à frente.",
    "Puxe até o abdômen apertando as escápulas por 2s.",
    "Volte devagar sem arredondar as costas.",
  ]],
  ["Remada baixa pegada aberta ou máquina pegada aberta (2s de pico)", "Cabo/Máquina", "Leverage_High_Row", [
    "Pegada aberta, peito apoiado ou tronco firme.",
    "Puxe abrindo os cotovelos na linha dos ombros, segure 2s.",
    "Volte controlado.",
  ]],
  ["Pulley frente triângulo (2s de pico de contração)", "Cabo", "Close-Grip_Front_Lat_Pulldown", [
    "Triângulo na polia alta, tronco levemente inclinado.",
    "Puxe até a parte alta do peito e segure 2s.",
    "Suba alongando bem o dorsal.",
  ]],
  ["Meio Terra", "Barra", "Romanian_Deadlift", [
    "Barra à frente das coxas, joelhos semiflexionados.",
    "Desça até a canela empurrando o quadril para trás.",
    "Suba contraindo glúteos e posteriores.",
  ]],
  ["Panturrilha na máquina ou em pé no smith", "Máquina/Smith", "Smith_Machine_Calf_Raise", [
    "Pontas dos pés no degrau, barra/apoio nos ombros.",
    "Suba o máximo e segure 1s.",
    "Desça alongando abaixo da linha do degrau.",
  ]],
  ["Desenvolvimento halteres ou máquina", "Halteres/Máquina", "Dumbbell_Shoulder_Press", [
    "Halteres na altura das orelhas, palmas para frente.",
    "Empurre até estender os braços acima da cabeça.",
    "Desça controlado até a linha das orelhas.",
  ]],
  ["Elevação frontal na corda ou halteres", "Cabo/Halteres", "Front_Two-Dumbbell_Raise", [
    "Braços à frente das coxas, cotovelos levemente flexionados.",
    "Eleve à frente até a linha dos ombros.",
    "Desça devagar resistindo.",
  ]],
  ["Elevação lateral", "Halteres", "Side_Lateral_Raise", [
    "Halteres ao lado do corpo, cotovelos levemente flexionados.",
    "Eleve até a linha dos ombros, sem encolher.",
    "Desça controlado.",
  ]],
  ["Elevação lateral unilateral no cabo", "Cabo", "One-Arm_Side_Laterals", [
    "De lado para a polia baixa, cabo cruzando o corpo.",
    "Eleve o braço até a linha do ombro.",
    "Desça devagar mantendo a tensão do cabo.",
  ]],
  ["Tríceps testa na corda", "Cabo", "Cable_Lying_Triceps_Extension", [
    "Deitado, corda vinda da polia atrás da cabeça.",
    "Estenda os cotovelos sem abri-los.",
    "Volte controlado até a testa.",
  ]],
  ["Tríceps na corda", "Cabo", "Triceps_Pushdown_-_Rope_Attachment", [
    "Corda na polia alta, cotovelos colados ao tronco.",
    "Empurre para baixo separando a corda no final.",
    "Volte devagar até a altura do peito.",
  ]],
  ["Tríceps francês", "Halteres", "Seated_Triceps_Press", [
    "Sentado, halter seguro com as duas mãos atrás da cabeça.",
    "Estenda os braços acima da cabeça.",
    "Desça controlado alongando o tríceps.",
  ]],
  ["Abdominal infra na torre", "Peso do corpo", "Hanging_Leg_Raise", [
    "Apoiado na torre/barra, tronco estável.",
    "Eleve as pernas (ou joelhos) contraindo o infra.",
    "Desça controlado sem balançar.",
  ]],
  ["Panturrilha sentada", "Máquina", "Seated_Calf_Raise", [
    "Joelhos sob o apoio, pontas dos pés no degrau.",
    "Suba o máximo e segure 1s.",
    "Desça alongando bem.",
  ]],
  ["Agachamento livre", "Barra", "Barbell_Squat", [
    "Barra nas costas, pés na largura dos ombros.",
    "Agache até pelo menos 90°, joelhos na linha dos pés.",
    "Suba empurrando o chão com o pé inteiro.",
  ]],
  ["Leg 45", "Máquina", "Leg_Press", [
    "Pés na plataforma na largura dos ombros.",
    "Desça controlado até ~90° sem tirar a lombar do banco.",
    "Empurre de volta sem travar os joelhos.",
  ]],
  ["Cadeira extensora", "Máquina", "Leg_Extensions", [
    "Ajuste o encosto e o rolo sobre os tornozelos.",
    "Estenda as pernas contraindo o quadríceps no topo.",
    "Desça devagar sem bater o peso.",
  ]],
  ["Mesa flexora deitado (2s de pico de contração)", "Máquina", "Lying_Leg_Curls", [
    "Deitado, rolo atrás dos tornozelos.",
    "Flexione os joelhos e segure 2s no topo.",
    "Volte controlado até quase estender.",
  ]],
  ["Stiff", "Barra", "Stiff-Legged_Barbell_Deadlift", [
    "Barra à frente das coxas, joelhos quase estendidos.",
    "Desça empurrando o quadril para trás até alongar o posterior.",
    "Suba contraindo glúteos e posteriores.",
  ]],
  ["Elevação de quadril (2s de pico de contração)", "Barra", "Barbell_Hip_Thrust", [
    "Costas apoiadas no banco, barra sobre o quadril.",
    "Eleve o quadril e segure 2s a contração do glúteo.",
    "Desça controlado sem relaxar.",
  ]],
];

export function gerarBiblioteca(): Exercicio[] {
  return BIBLIOTECA.map((d) => ({
    id: `sd_lib_${d.libId}`,
    nome: d.nome,
    grupo: d.grupo,
    equipamento: d.equipamento,
    instrucoes: d.passos.join("\n"),
    midia: { imagens: imgs(d.libId) },
    origem: "seed",
    updated_at: SEED_EPOCH_V2,
  }));
}

export function gerarEnriquecimentoSeeds(): Record<string, Enriquecimento> {
  const out: Record<string, Enriquecimento> = {};
  for (const [nome, equipamento, libId, passos] of ENR) {
    out[seedExercicioId(nome)] = {
      equipamento,
      midia: { imagens: imgs(libId) },
      instrucoes: passos.join("\n"),
    };
  }
  return out;
}
