import { create } from "zustand";
import { registerSW } from "virtual:pwa-register";

/**
 * Atualização do app instalado (PWA).
 *
 * O service worker guarda o app inteiro para funcionar offline na academia, e
 * é ele quem decide qual versão a tela mostra. O registro padrão do
 * vite-plugin-pwa só chama `register()` uma vez, no carregamento: enquanto a
 * PWA fica aberta — e no iPhone/iPad ela fica suspensa no multitarefa por dias
 * — ninguém procura versão nova, e quando o service worker novo enfim entra,
 * a tela em uso continua sendo a antiga. Resultado: mudanças publicadas não
 * chegam ao aparelho.
 *
 * Aqui o registro é nosso: procuramos versão nova toda vez que o app volta ao
 * primeiro plano (é exatamente quando a PWA "acorda"), de hora em hora
 * enquanto aberto, e sob demanda pelo botão em Ajustes. Achando, mostramos a
 * faixa de "atualizar" — nunca recarregamos sozinhos no meio de um treino.
 */

const UMA_HORA = 60 * 60 * 1000;

interface EstadoAtualizacao {
  /** versão nova baixada, esperando o toque para entrar */
  disponivel: boolean;
  /** procurando versão nova agora (botão em Ajustes) */
  procurando: boolean;
  /** resultado da última procura manual */
  resumo: string | null;
  iniciar(): void;
  procurarAgora(): Promise<void>;
  aplicar(): void;
}

let aplicarAtualizacao: ((recarregar?: boolean) => Promise<void>) | null = null;
let registro: ServiceWorkerRegistration | null = null;
let jaIniciou = false;

export const useAtualizacao = create<EstadoAtualizacao>((set, get) => ({
  disponivel: false,
  procurando: false,
  resumo: null,

  iniciar() {
    if (jaIniciou) return;
    jaIniciou = true;
    if (!("serviceWorker" in navigator)) return;

    aplicarAtualizacao = registerSW({
      immediate: true,
      onNeedRefresh() {
        set({ disponivel: true });
      },
      onRegisteredSW(_url, reg) {
        registro = reg ?? null;
        if (!reg) return;
        // ao voltar do multitarefa/aba, checa se saiu versão nova
        const aoVoltar = () => {
          if (document.visibilityState === "visible") void reg.update().catch(() => {});
        };
        document.addEventListener("visibilitychange", aoVoltar);
        window.addEventListener("focus", aoVoltar);
        setInterval(aoVoltar, UMA_HORA);
      },
    });
  },

  async procurarAgora() {
    if (get().procurando) return;
    set({ procurando: true, resumo: null });
    try {
      if (!registro) {
        set({ resumo: "Este aparelho não guarda o app offline — recarregue a página para pegar a versão nova." });
        return;
      }
      await registro.update();
      // o service worker novo aparece em `installing`/`waiting` e dispara
      // `onNeedRefresh`; damos um instante para isso acontecer
      await new Promise((r) => setTimeout(r, 1500));
      set({ resumo: get().disponivel ? "Versão nova encontrada!" : "Você já está na versão mais recente." });
    } catch {
      set({ resumo: "Não consegui verificar agora — sem conexão?" });
    } finally {
      set({ procurando: false });
    }
  },

  aplicar() {
    set({ disponivel: false });
    if (!aplicarAtualizacao) {
      window.location.reload();
      return;
    }
    // `updateSW(true)` manda o service worker novo assumir e recarrega quando
    // ele assume. Só que ele nem sempre assume: quando nenhuma aba está sob
    // controle do service worker (a primeira visita, por exemplo), o novo já
    // entra ativado e o evento de troca nunca vem. Recarregamos por conta
    // própria logo depois — se o reload dele veio antes, este nem roda.
    void aplicarAtualizacao(true).catch(() => {});
    setTimeout(() => window.location.reload(), 1200);
  },
}));

/** Versão deste build, para conferir o que o aparelho está rodando. */
export const BUILD_ID = __BUILD_ID__;
