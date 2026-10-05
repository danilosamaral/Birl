import { create } from "zustand";
import { useEffect, useRef, useState } from "react";

/** Timer de descanso em faixa fixa acima da barra inferior, disparado ao marcar uma série como feita. */

interface TimerState {
  fim: number | null;
  total: number;
  iniciar(segundos: number): void;
  somar(segundos: number): void;
  parar(): void;
}

export const useTimer = create<TimerState>((set, get) => ({
  fim: null,
  total: 0,
  iniciar: (segundos) => set({ fim: Date.now() + segundos * 1000, total: segundos }),
  somar: (segundos) => {
    const { fim, total } = get();
    if (!fim) return;
    // nunca deixa o fim antes de agora (−15 com 5s restantes encerra o descanso)
    const novoFim = Math.max(Date.now(), fim + segundos * 1000);
    set({ fim: novoFim, total: Math.max(1, total + segundos) });
  },
  parar: () => set({ fim: null, total: 0 }),
}));

type JanelaComAudio = typeof window & { webkitAudioContext?: typeof AudioContext };
let audio: AudioContext | null = null;

/**
 * Prepara o som do fim do descanso. Precisa ser chamado num toque (o Safari do
 * iPhone só libera áudio que nasce de um gesto) e reaproveita sempre o mesmo
 * AudioContext — o iPhone limita quantos podem existir ao mesmo tempo.
 */
export function prepararAudio() {
  try {
    const Ctx = window.AudioContext ?? (window as JanelaComAudio).webkitAudioContext;
    if (!Ctx) return;
    if (!audio) audio = new Ctx();
    if (audio.state === "suspended") void audio.resume();
    // um som mudo e curtíssimo dentro do toque "destrava" o áudio no iOS
    const osc = audio.createOscillator();
    const gain = audio.createGain();
    gain.gain.value = 0;
    osc.connect(gain);
    gain.connect(audio.destination);
    osc.start();
    osc.stop(audio.currentTime + 0.01);
  } catch {
    // sem áudio disponível: o aviso visual continua
  }
}

function apitar() {
  try {
    const ctx = audio;
    if (!ctx) return;
    if (ctx.state === "suspended") void ctx.resume();
    [0, 0.3].forEach((t) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.value = 880;
      gain.gain.setValueAtTime(0.15, ctx.currentTime + t);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + 0.25);
      osc.start(ctx.currentTime + t);
      osc.stop(ctx.currentTime + t + 0.25);
    });
  } catch {
    // sem áudio disponível: a vibração/visual ainda avisa
  }
}

export function TimerDescansoFaixa() {
  const { fim, total, somar, parar } = useTimer();
  const [, forca] = useState(0);
  const avisou = useRef(false);

  useEffect(() => {
    // um descanso novo (ou ajustado) volta a avisar quando acabar
    avisou.current = false;
    if (!fim) return;
    const intervalo = setInterval(() => forca((x) => x + 1), 250);
    return () => clearInterval(intervalo);
  }, [fim]);

  const restante = fim ? Math.ceil((fim - Date.now()) / 1000) : 0;
  const acabou = !!fim && restante <= 0;

  // fim do descanso: bip + vibração (onde houver) e some sozinho depois de 8s
  useEffect(() => {
    if (!acabou || avisou.current) return;
    avisou.current = true;
    apitar();
    navigator.vibrate?.([200, 100, 200]);
    const t = setTimeout(parar, 8000);
    return () => clearTimeout(t);
  }, [acabou, parar]);

  // o conteúdo da página ganha espaço embaixo para a faixa não cobrir nada
  useEffect(() => {
    document.documentElement.style.setProperty("--timer-h", fim ? "92px" : "0px");
  }, [fim]);

  if (!fim) return null;
  const seg = Math.max(restante, 0);
  const mm = Math.floor(seg / 60);
  const ss = String(seg % 60).padStart(2, "0");
  const pct = total > 0 ? Math.min(100, (seg / total) * 100) : 0;

  return (
    <div className={`timer-faixa${acabou ? " fim" : ""}`} role="timer" aria-live="polite">
      <div className="t">
        <span className="tempo num">{acabou ? "BIRL!" : `${mm}:${ss}`}</span>
        {!acabou && (
          <>
            <button type="button" onClick={() => somar(-15)} aria-label="Tirar 15 segundos">
              −15
            </button>
            <button type="button" onClick={() => somar(15)} aria-label="Somar 15 segundos">
              +15
            </button>
          </>
        )}
        <button type="button" onClick={parar}>
          {acabou ? "Fechar" : "Pular"}
        </button>
      </div>
      <div className="rodape">
        {!acabou && (
          <div className="trilho">
            <i style={{ width: `${pct}%` }} />
          </div>
        )}
        <span className="rotulo">{acabou ? "Descanso encerrado — próxima série" : "Descanso"}</span>
      </div>
    </div>
  );
}
