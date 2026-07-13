import { useRef, useState } from "react";
import { useStore } from "../store";
import { supa, traduzErro } from "../sync";
import { DIAS_SEMANA, treinosVisiveis } from "../utils";

export function Ajustes() {
  const st = useStore();
  const treinos = treinosVisiveis(st.treinos);
  const [loginAberto, setLoginAberto] = useState(false);
  const [backupAberto, setBackupAberto] = useState(false);

  async function sair() {
    const c = supa();
    if (c && confirm("Sair da conta neste aparelho? Os dados continuam salvos localmente.")) await c.auth.signOut();
  }

  return (
    <>
      <div className={`sync-bar${st.usuario ? " on" : ""}`}>
        <span className="estado">
          <i className="dot" />
          <span>
            {st.sincronizando
              ? "Sincronizando..."
              : st.usuario
                ? `Sincronizado: ${st.usuario.email ?? ""}`
                : "Salvo só neste aparelho"}
          </span>
        </span>
        <button className="btn-mini" type="button" onClick={() => (st.usuario ? sair() : setLoginAberto(true))}>
          {st.usuario ? "Sair" : "Entrar para sincronizar"}
        </button>
      </div>

      <div className="card">
        <h3>Divisão da semana</h3>
        <p className="card-sub">Qual treino é sugerido em cada dia. Aparece na tela Hoje.</p>
        <div className="divisao-grid">
          {[1, 2, 3, 4, 5, 6, 0].map((dia) => (
            <DivisaoDia key={dia} dia={dia} />
          ))}
        </div>
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

      {loginAberto && <ModalLogin onFechar={() => setLoginAberto(false)} />}
      {backupAberto && <ModalBackup onFechar={() => setBackupAberto(false)} />}
    </>
  );
}

function DivisaoDia({ dia }: { dia: number }) {
  const st = useStore();
  const treinos = treinosVisiveis(st.treinos);
  const valor = st.prefs.divisaoSemana[dia] ?? "";
  return (
    <>
      <span className="dia">{DIAS_SEMANA[dia]}</span>
      <select value={valor} onChange={(e) => st.setDivisao(dia, e.target.value || null)} aria-label={`Treino de ${DIAS_SEMANA[dia]}`}>
        <option value="">Descanso</option>
        {treinos.map((t) => (
          <option key={t.id} value={t.id}>
            {t.nome}
          </option>
        ))}
      </select>
    </>
  );
}

function ModalLogin({ onFechar }: { onFechar(): void }) {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");

  async function entrar(criar: boolean) {
    const c = supa();
    if (!c) {
      setMsg("Sem conexão com o serviço de sincronização.");
      return;
    }
    if (!email.trim() || senha.length < 6) {
      setMsg("Informe e-mail e uma senha de 6+ caracteres.");
      return;
    }
    setMsg("Conectando...");
    try {
      const res = criar
        ? await c.auth.signUp({ email: email.trim(), password: senha })
        : await c.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (res.error) {
        setMsg(traduzErro(res.error.message));
        return;
      }
      if (criar && !res.data.session) {
        setMsg("Conta criada! Se pedir confirmação por e-mail, confirme e depois toque em Entrar.");
        return;
      }
      onFechar();
    } catch {
      setMsg("Sem conexão. Tente novamente.");
    }
  }

  return (
    <dialog open style={{ position: "fixed", top: "14vh", zIndex: 60, margin: "0 auto", left: 0, right: 0 }}>
      <div className="modal-corpo">
        <h3>Sincronizar treinos</h3>
        <p>Use o mesmo e-mail e senha em todos os aparelhos para ver os mesmos dados. A conta é a mesma do app antigo.</p>
        <input type="email" autoComplete="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        <input
          type="password"
          autoComplete="current-password"
          placeholder="senha (mínimo 6 caracteres)"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <div className="acoes">
          <button className="btn btn-pri" type="button" onClick={() => entrar(false)}>
            Entrar
          </button>
          <button className="btn btn-sec" type="button" onClick={() => entrar(true)}>
            Criar conta
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
