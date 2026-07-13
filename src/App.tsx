import { useEffect, useRef, useState } from "react";
import { useStore, type Aba } from "./store";
import { GlosModal } from "./glos";
import { Hoje } from "./screens/Hoje";
import { Treinos } from "./screens/Treinos";
import { Biblioteca } from "./screens/Biblioteca";
import { Evolucao } from "./screens/Evolucao";
import { Ajustes } from "./screens/Ajustes";
import { DetalheExercicioModal } from "./detalhe";
import { TimerDescansoPill } from "./TimerDescanso";

const TABS: Array<{ id: Aba; rotulo: string; ic: string }> = [
  { id: "hoje", rotulo: "Hoje", ic: "🏋️" },
  { id: "treinos", rotulo: "Treinos", ic: "📋" },
  { id: "biblioteca", rotulo: "Exercícios", ic: "📚" },
  { id: "evolucao", rotulo: "Evolução", ic: "📈" },
  { id: "ajustes", rotulo: "Ajustes", ic: "⚙️" },
];

export function App() {
  const st = useStore();

  useEffect(() => {
    void useStore.getState().init();
  }, []);

  if (!st.pronto) {
    return (
      <header className="topo">
        <div className="marca">
          <span>BIRL</span>
          <span className="ponto">!</span>
        </div>
        <h1 className="titulo">Carregando...</h1>
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
      <header className="topo">
        <div className="marca">
          <span>BIRL</span>
          <span className="ponto">!</span>
        </div>
        <h1 className="titulo">{titulo}</h1>
        <div className="sub-treino">{subtitulo}</div>
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
            <span className="ic" aria-hidden="true">
              {t.ic}
            </span>
            {t.rotulo}
          </button>
        ))}
      </nav>

      <AvisoSalvo />
      <GlosModal />
      <DetalheExercicioModal />
      <TimerDescansoPill />
    </>
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

  return <div className={`salvo-aviso${visivel ? " mostra" : ""}`}>Salvo ✓</div>;
}
