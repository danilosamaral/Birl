import { create } from "zustand";
import { Folha } from "./folha";
import { ListaGlossario } from "./glos";

/**
 * Guia do método — as recomendações gerais do material "Além da Genética 2.0",
 * resumidas, com os exemplos do próprio material. Abre de Hoje e de Exercícios.
 */

export const useGuia = create<{ aberto: boolean; abrir(): void; fechar(): void }>((set) => ({
  aberto: false,
  abrir: () => set({ aberto: true }),
  fechar: () => set({ aberto: false }),
}));

export function GuiaFolha() {
  const { aberto, fechar } = useGuia();
  if (!aberto) return null;
  return (
    <Folha titulo="Guia do método" aoFechar={fechar} cheia>
      <div className="guia">
        <h4>Aquecimento</h4>
        <p>
          <b>Geral:</b> 5 a 10 minutos de esteira, bicicleta, escada ou elíptico, mais a mobilidade indicada no treino do
          dia.
        </p>
        <p>
          <b>Específico (o mais importante):</b> no primeiro aparelho do treino, comece com carga bem baixa e vá
          subindo em 2 a 5 séries até sentir articulações e músculos prontos.
        </p>

        <h4>Os três tipos de série</h4>
        <ul>
          <li>
            <b>Aquecimento</b> (1 barra): 10 a 15 reps com ~30% da sua carga máxima, muito longe da falha.
          </li>
          <li>
            <b>Ajuste</b> (2 barras): 4 a 6 reps com carga considerável, bem longe da falha. Serve para sentir o dia:
            articulações ok? dormiu e comeu bem?
          </li>
          <li>
            <b>Trabalho</b> (3 barras): a série que conta. Vá até a falha dentro da faixa de reps programada.
          </li>
        </ul>
        <p>
          <b>Exemplo do material:</b> sua carga de trabalho no supino é 40 kg de cada lado. Aquecimento com 10 kg (1–2 ×
          10 a 15), ajuste com 20 kg (4–6 reps) e outro ajuste com 30 kg. Pelas sensações, você decide: dia ruim, 35 kg;
          dia normal, 40 kg; dia ótimo, tenta subir.
        </p>

        <h4>Faixas de repetições</h4>
        <div className="faixas">
          <b>3 a 6</b>
          <span>estímulo de força, trabalhando com carga</span>
          <b>6 a 10</b>
          <span>a faixa mais usada com a variável carga</span>
          <b>8 a 12 · 10 a 15</b>
          <span>usadas com as técnicas de intensificação</span>
        </div>
        <p>Não fique contando reps: busque a falha, mas saiba se ficou dentro da faixa.</p>

        <h4>Carga: quando subir</h4>
        <p>
          Se não chegou nas reps mínimas, <b>baixe a carga</b>. Se passou do máximo, <b>suba na próxima série</b>. É
          isso que o app mostra na faixa azul de cada série de trabalho. Aumento de carga só vale com amplitude e
          controle perfeitos.
        </p>

        <h4>Intervalos</h4>
        <p>
          Maiores nos primeiros exercícios (para render com cargas altas) e menores do meio para o fim, quando entram
          reps maiores e técnicas, para um estímulo mais metabólico. O timer usa o descanso prescrito em cada série.
        </p>

        <h4>Progressão</h4>
        <p>
          Toda semana evolua em alguma coisa nas séries válidas: uma conexão melhor com o movimento, 1 ou 2 reps a mais
          ou um pouco mais de carga.
        </p>

        <h4>Iniciantes</h4>
        <p>
          Na adaptação o objetivo é coordenação e consciência muscular, <b>não</b> treinar até a falha nem ficar
          dolorido. Cerca de 4 semanas sem faltar bastam para a próxima etapa. Quem está parado há muito tempo pode
          fazer 1 série na semana 1, 2 na semana 2 e 3 nas semanas 3 e 4 (opção ao adicionar o programa).
        </p>

        <ListaGlossario />
        <p style={{ marginTop: 16, fontSize: 13 }}>Fonte: recomendações gerais do curso Além da Genética 2.0.</p>
      </div>
    </Folha>
  );
}
