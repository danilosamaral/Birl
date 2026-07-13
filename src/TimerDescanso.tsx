import { create } from "zustand";
import { useEffect, useRef, useState } from "react";

/** Timer de descanso flutuante, disparado ao marcar uma série como feita. */

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
    const { fim } = get();
    if (fim) set({ fim: fim + segundos * 1000, total: get().total + segundos });
  },
  parar: () => set({ fim: null, total: 0 }),
}));

function apitar() {
  try {
    type JanelaComAudio = typeof window & { webkitAudioContext?: typeof AudioContext };
    const Ctx = window.AudioContext ?? (window as JanelaComAudio).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
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

export function TimerDescansoPill() {
  const { fim, somar, parar } = useTimer();
  const [, força] = useState(0);
  const avisou = useRef(false);

  useEffect(() => {
    if (!fim) {
      avisou.current = false;
      return;
    }
    const intervalo = setInterval(() => força((x) => x + 1), 250);
    return () => clearInterval(intervalo);
  }, [fim]);

  if (!fim) return null;
  const restante = Math.ceil((fim - Date.now()) / 1000);

  if (restante <= 0 && !avisou.current) {
    avisou.current = true;
    apitar();
    navigator.vibrate?.([200, 100, 200]);
    setTimeout(parar, 8000);
  }

  const mm = Math.floor(Math.max(restante, 0) / 60);
  const ss = String(Math.max(restante, 0) % 60).padStart(2, "0");

  return (
    <div className={`timer-pill${restante <= 0 ? " fim" : ""}`} role="timer" aria-live="polite">
      <span className="rotulo">{restante <= 0 ? "Descanso encerrado — BIRL!" : "Descanso"}</span>
      {restante > 0 && (
        <b>
          {mm}:{ss}
        </b>
      )}
      {restante > 0 && (
        <button type="button" onClick={() => somar(30)}>
          +30s
        </button>
      )}
      <button type="button" onClick={parar} aria-label="Fechar timer">
        ✕
      </button>
    </div>
  );
}
