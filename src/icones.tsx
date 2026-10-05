import type { ReactNode } from "react";

/**
 * Ícones de traço do BIRL! (2px, cantos arredondados, cor do texto).
 * Substituem os emoji da interface, que cada aparelho desenha diferente.
 */

const P: Record<string, ReactNode> = {
  hoje: <path d="M6 7v10M18 7v10M3 10v4M21 10v4M6 12h12" />,
  treinos: (
    <>
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4h6v3H9zM9 12h6M9 16h4" />
    </>
  ),
  exercicios: <path d="M4 5a2 2 0 0 1 2-2h13v16H6a2 2 0 0 0-2 2zM4 21V5M8 7h7" />,
  evolucao: <path d="M4 19h16M5 15l4-4 3 3 6-7M14 7h4v4" />,
  ajustes: (
    <>
      <circle cx="12" cy="12" r="3" />
      <path d="M12 2v3M12 19v3M2 12h3M19 12h3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M4.9 19.1 7 17M17 7l2.1-2.1" />
    </>
  ),
  play: <path d="M7 5l12 7-12 7z" fill="currentColor" stroke="none" />,
  stop: <rect x="6" y="6" width="12" height="12" rx="2" fill="currentColor" stroke="none" />,
  check: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  seta: <path d="M9 6l6 6-6 6" />,
  voltar: <path d="M15 6l-6 6 6 6" />,
  abaixo: <path d="M6 9l6 6 6-6" />,
  mais: <path d="M12 5v14M5 12h14" />,
  fechar: <path d="M6 6l12 12M18 6L6 18" />,
  menu: (
    <>
      <circle cx="5" cy="12" r="1.4" fill="currentColor" />
      <circle cx="12" cy="12" r="1.4" fill="currentColor" />
      <circle cx="19" cy="12" r="1.4" fill="currentColor" />
    </>
  ),
  info: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v6M12 7.5v.5" />
    </>
  ),
  aviso: <path d="M12 4l9 16H3zM12 10v4M12 17v.5" />,
  subir: <path d="M12 19V5M6 11l6-6 6 6" />,
  descer: <path d="M12 5v14M6 13l6 6 6-6" />,
  igual: <path d="M5 9h14M5 15h14" />,
  relogio: (
    <>
      <circle cx="12" cy="13" r="8" />
      <path d="M12 9v4l3 2M10 2h4" />
    </>
  ),
  calendario: (
    <>
      <rect x="4" y="5" width="16" height="15" rx="2" />
      <path d="M4 10h16M8 3v4M16 3v4" />
    </>
  ),
  livro: <path d="M12 6c-2-1.5-5-2-8-1.5v14c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5v-14c-3-.5-6 0-8 1.5zM12 6v14" />,
  video: (
    <>
      <rect x="3" y="6" width="13" height="12" rx="2" />
      <path d="M16 10l5-3v10l-5-3" />
    </>
  ),
  lixo: <path d="M5 7h14M10 7V4h4v3M7 7l1 13h8l1-13" />,
  editar: <path d="M4 20h4L19 9l-4-4L4 16zM14 6l4 4" />,
  copiar: (
    <>
      <rect x="8" y="8" width="12" height="12" rx="2" />
      <path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3" />
    </>
  ),
  arquivo: <path d="M4 7h16v3H4zM6 10v9h12v-9M10 14h4" />,
  trilha: <path d="M5 20V4M5 5h11l-2 3 2 3H5" />,
  peso: <path d="M7 8h10l2 12H5zM9 8a3 3 0 1 1 6 0" />,
};

export type NomeIcone = keyof typeof P;

export function Icone({ nome, pequeno, rotulo }: { nome: NomeIcone; pequeno?: boolean; rotulo?: string }) {
  return (
    <svg
      className={`ic${pequeno ? " p" : ""}`}
      viewBox="0 0 24 24"
      aria-hidden={rotulo ? undefined : true}
      aria-label={rotulo}
      role={rotulo ? "img" : undefined}
    >
      {P[nome]}
    </svg>
  );
}

/** Ícone do tipo de série: 1, 2 ou 3 barras crescentes (aquecimento, ajuste, trabalho). */
export function IconeTipo({ nivel }: { nivel: 1 | 2 | 3 }) {
  return (
    <svg viewBox="0 0 14 14" aria-hidden="true">
      {[0, 1, 2].map((i) => {
        const cheio = i < nivel;
        const h = 4 + i * 4;
        return (
          <rect
            key={i}
            x={1 + i * 4.5}
            y={13 - h}
            width={3}
            height={h}
            rx={1}
            fill={cheio ? "currentColor" : "none"}
            stroke="currentColor"
            strokeWidth={cheio ? 0 : 1.2}
            opacity={cheio ? 1 : 0.45}
          />
        );
      })}
    </svg>
  );
}
