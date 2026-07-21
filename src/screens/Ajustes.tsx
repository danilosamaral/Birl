import { useRef, useState } from "react";
import { useStore } from "../store";
import { supa } from "../sync";
import { treinosVisiveis } from "../utils";

export function Ajustes() {
  const st = useStore();
  const treinos = treinosVisiveis(st.treinos);
  const [backupAberto, setBackupAberto] = useState(false);
  const [msgConvite, setMsgConvite] = useState("");

  async function sair() {
    const c = supa();
    if (c && confirm("Sair da conta neste aparelho? Seus dados continuam salvos e voltam quando você entrar de novo."))
      await c.auth.signOut();
  }

  async function copiarLink() {
    const link = window.location.origin;
    try {
      if (navigator.share) {
        await navigator.share({ title: "BIRL!", text: "Bora treinar comigo no BIRL!", url: link });
        return;
      }
      await navigator.clipboard.writeText(link);
      setMsgConvite("Link copiado! Manda pra pessoa e ela cria a conta dela.");
    } catch {
      setMsgConvite(`O link do app é ${link}`);
    }
  }

  return (
    <>
      <div className="sync-bar on">
        <span className="estado">
          <i className="dot" />
          <span>{st.sincronizando ? "Sincronizando..." : `Conta: ${st.usuario?.email ?? ""}`}</span>
        </span>
        <button className="btn-mini" type="button" onClick={sair}>
          Sair
        </button>
      </div>

      <div className="card">
        <h3>Sincronização</h3>
        <p className="card-sub">
          Use a <b>mesma conta</b> em todos os aparelhos para ver os mesmos treinos, histórico e evolução. O app
          sincroniza sozinho ao abrir; use o botão para forçar agora.
        </p>
        <div className="acoes">
          <button className="btn btn-pri" type="button" onClick={() => st.sincronizarAgora(true)} disabled={st.sincronizando}>
            {st.sincronizando ? "Sincronizando..." : "Sincronizar agora"}
          </button>
        </div>
        <p className="card-sub" style={{ margin: "10px 0 0" }}>
          {st.ultimoSync ? `Última sincronização: ${new Date(st.ultimoSync).toLocaleString("pt-BR")}` : "Ainda não sincronizado nesta sessão."}
        </p>
        {st.syncResumo && <p className="msg-aviso" style={{ color: "var(--green-soft)" }}>{st.syncResumo}</p>}
      </div>

      <div className="card">
        <h3>Compartilhar o app</h3>
        <p className="card-sub">
          Cada pessoa cria a <b>própria conta</b> e ganha a ficha de treinos padrão, com histórico e evolução só dela —
          ninguém vê os dados de ninguém. É só mandar o link.
        </p>
        <div className="acoes">
          <button className="btn btn-sec" type="button" onClick={copiarLink}>
            Compartilhar link
          </button>
        </div>
        {msgConvite && <p className="msg-aviso" style={{ color: "var(--green-soft)" }}>{msgConvite}</p>}
      </div>

      <div className="card">
        <h3>Timer de descanso</h3>
        <p className="card-sub">Ao marcar uma série como feita, inicia a contagem do intervalo prescrito.</p>
        <label className="check" style={{ marginLeft: 0 }}>
          <input
            type="checkbox"
            checked={st.prefs.timerDescanso !== false}
            onChange={(e) => st.setTimerDescanso(e.target.checked)}
          />{" "}
          Iniciar automaticamente
        </label>
      </div>

      <div className="card">
        <h3>Divisão da semana</h3>
        <p className="card-sub">
          A divisão agora pertence a cada <b>programa</b> de treino — configure na aba Treinos, em Programas → Editar. O
          programa ativo é o que guia a tela Hoje.
        </p>
      </div>

      <div className="card">
        <h3>Backup</h3>
        <p className="card-sub">Exporte um texto com todos os dados (treinos, sessões, exercícios) ou restaure de um backup.</p>
        <div className="acoes">
          <button className="btn btn-sec" type="button" onClick={() => setBackupAberto(true)}>
            Backup / Restaurar
          </button>
        </div>
      </div>

      <div className="card">
        <h3>Versão anterior</h3>
        <p className="card-sub">
          A ficha antiga (somente treinos A–D) continua disponível como referência em{" "}
          <a href="/legacy/index.html" style={{ color: "var(--orange-soft)" }}>
            /legacy
          </a>
          . Os registros feitos lá não entram mais aqui automaticamente.
        </p>
      </div>

      {treinos.length === 0 && <div className="banner-info">Você não tem treinos ativos — crie ou desarquive na aba Treinos.</div>}

      {backupAberto && <ModalBackup onFechar={() => setBackupAberto(false)} />}
    </>
  );
}

function ModalBackup({ onFechar }: { onFechar(): void }) {
  const st = useStore();
  const areaRef = useRef<HTMLTextAreaElement>(null);
  const [texto, setTexto] = useState(() => st.exportarBackup());
  const [msg, setMsg] = useState("");

  async function copiar() {
    try {
      await navigator.clipboard.writeText(texto);
      setMsg("Backup copiado!");
    } catch {
      areaRef.current?.select();
      setMsg("Selecionei o texto — use Copiar do teclado.");
    }
  }

  async function restaurar() {
    try {
      await st.importarBackup(texto);
      setMsg("");
      onFechar();
      alert("Registros restaurados!");
    } catch {
      setMsg("Não consegui ler esse backup. Confira se o texto está completo.");
    }
  }

  return (
    <dialog open style={{ position: "fixed", top: "8vh", zIndex: 60, margin: "0 auto", left: 0, right: 0 }}>
      <div className="modal-corpo">
        <h3>Backup dos registros</h3>
        <p>Copie o texto pra guardar como backup. Para restaurar, cole aqui e toque em Restaurar.</p>
        <textarea ref={areaRef} className="mono" value={texto} onChange={(e) => setTexto(e.target.value)} />
        <div className="acoes" style={{ marginTop: 12 }}>
          <button className="btn btn-sec" type="button" onClick={copiar}>
            Copiar
          </button>
          <button className="btn btn-sec" type="button" onClick={restaurar}>
            Restaurar
          </button>
          <button className="btn btn-sec" type="button" onClick={onFechar}>
            Fechar
          </button>
        </div>
        <p className="msg-aviso">{msg}</p>
      </div>
    </dialog>
  );
}
