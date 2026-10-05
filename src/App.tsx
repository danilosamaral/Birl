import { useEffect, useRef, useState } from "react";
import { useStore, type Aba } from "./store";
import { GlosModal } from "./glos";
import { GuiaFolha } from "./guia";
import { Hoje } from "./screens/Hoje";
import { Treinos } from "./screens/Treinos";
import { Biblioteca } from "./screens/Biblioteca";
import { Evolucao } from "./screens/Evolucao";
import { Ajustes } from "./screens/Ajustes";
import { Login, ModalNovaSenha } from "./screens/Login";
import { DetalheExercicioModal } from "./detalhe";
import { useAtualizacao } from "./atualizacao";
import { TimerDescansoFaixa } from "./TimerDescanso";
import { ConfirmSheet } from "./folha";
import { Icone, type NomeIcone } from "./icones";
import { useAparencia } from "./aparencia";
import { contarSeries, planoDoDia } from "./utils";

const TABS: Array<{ id: Aba; rotulo: string; ic: NomeIcone }> = [
  { id: "hoje", rotulo: "Hoje", ic: "hoje" },
  { id: "treinos", rotulo: "Treinos", ic: "treinos" },
  { id: "biblioteca", rotulo: "Exercícios", ic: "exercicios" },
  { id: "evolucao", rotulo: "Evolução", ic: "evolucao" },
  { id: "ajustes", rotulo: "Ajustes", ic: "ajustes" },
];

/** Cabeçalho encolhe depois de rolar um pouco: mais tela para o exercício. */
function useRolou(limite = 48) {
  const [rolou, setRolou] = useState(false);
  useEffect(() => {
    const f = () => setRolou(window.scrollY > limite);
    f();
    window.addEventListener("scroll", f, { passive: true });
    return () => window.removeEventListener("scroll", f);
  }, [limite]);
  return rolou;
}

export function App() {
  const st = useStore();
  useAparencia(); // aplica a paleta/modo escolhidos
  const rolou = useRolou();

  useEffect(() => {
    void useStore.getState().init();
    useAtualizacao.getState().iniciar();
  }, []);

  if (st.authPronto && !st.usuario) {
    return (
      <>
        <FaixaAtualizacao />
        <Login />
        <ModalNovaSenha />
      </>
    );
  }

  if (!st.pronto) {
    return (
      <header className="topo">
        <div className="marca">
          BIRL<span className="ponto">!</span>
        </div>
        <h1 className="titulo">Carregando…</h1>
      </header>
    );
  }

  const treinoAtivo = st.treinoAtivoId ? st.treinos[st.treinoAtivoId] : null;
  const titulo =
    st.tab === "hoje"
      ? (treinoAtivo?.nome ?? "Hoje")
      : st.tab === "treinos"
        ? st.editandoTreinoId
          ? "Editar treino"
          : "Meus Treinos"
        : st.tab === "biblioteca"
          ? "Biblioteca"
          : st.tab === "evolucao"
            ? "Evolução"
            : "Ajustes";
  const subtitulo =
    st.tab === "hoje"
      ? (treinoAtivo?.foco ?? "")
      : st.tab === "biblioteca"
        ? "exercícios, execução e postura"
        : st.tab === "evolucao"
          ? "progressão por treino"
          : "";

  return (
    <>
      <header className={`topo${rolou ? " compacto" : ""}`}>
        <div className="marca">
          BIRL<span className="ponto">!</span>
        </div>
        <div className="topo-linha">
          <h1 className="titulo">{titulo}</h1>
          <AvisoSalvo />
        </div>
        {subtitulo && <div className="sub-treino">{subtitulo}</div>}
        {st.tab === "hoje" && <ProgressoHoje />}
      </header>

      <main>
        {st.tab === "hoje" && <Hoje />}
        {st.tab === "treinos" && <Treinos />}
        {st.tab === "biblioteca" && <Biblioteca />}
        {st.tab === "evolucao" && <Evolucao />}
        {st.tab === "ajustes" && <Ajustes />}
        <footer className="creditos">BIRL! — plataforma pessoal de treinos</footer>
      </main>

      <nav className="tabbar" aria-label="Navegação">
        {TABS.map((t) => (
          <button key={t.id} type="button" aria-selected={st.tab === t.id} onClick={() => st.setTab(t.id)}>
            <Icone nome={t.ic} />
            {t.rotulo}
          </button>
        ))}
      </nav>

      <FaixaAtualizacao />
      <GlosModal />
      <GuiaFolha />
      <DetalheExercicioModal />
      <TimerDescansoFaixa />
      <ConfirmSheet />
      <ModalNovaSenha />
    </>
  );
}

/** Progresso de séries fixo no cabeçalho — visível durante toda a rolagem. */
function ProgressoHoje() {
  const st = useStore();
  const treino = st.treinoAtivoId ? st.treinos[st.treinoAtivoId] : null;
  if (!treino || treino.deleted) return null;
  const sess = st.sessaoAtiva();
  const { feitas, total } = contarSeries(planoDoDia(treino, st.programaAtivo(), st.sessoes, st.dataAtiva), sess);
  if (!total) return null;
  return (
    <div className="prog-header" aria-label={`${feitas} de ${total} séries feitas`}>
      <span className="num">
        {feitas}/{total} séries
      </span>
      <span className="trilho">
        <i style={{ width: `${(feitas / total) * 100}%` }} />
      </span>
    </div>
  );
}

/** Versão nova baixada: a troca acontece no toque, nunca no meio de uma série. */
function FaixaAtualizacao() {
  const disponivel = useAtualizacao((s) => s.disponivel);
  const aplicar = useAtualizacao((s) => s.aplicar);
  if (!disponivel) return null;
  return (
    <div className="faixa-atualizar" role="status">
      <span>Tem versão nova do BIRL!</span>
      <button className="btn-mini" type="button" onClick={aplicar}>
        Atualizar
      </button>
    </div>
  );
}

function AvisoSalvo() {
  const contador = useStore((s) => s.avisoSalvo);
  const [visivel, setVisivel] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    if (contador === 0) return;
    setVisivel(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setVisivel(false), 1100);
    return () => clearTimeout(timer.current);
  }, [contador]);

  return (
    <span className={`salvo${visivel ? " mostra" : ""}`} aria-live="polite">
      <Icone nome="check" pequeno />
      {visivel ? "Salvo" : ""}
    </span>
  );
}
