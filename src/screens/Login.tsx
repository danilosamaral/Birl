import { useState } from "react";
import { useStore } from "../store";
import { supa, traduzErro } from "../sync";

/**
 * Tela de entrada: o app agora é multiusuário, então cada pessoa entra com a
 * própria conta e vê apenas os seus treinos, histórico e evolução.
 */
export function Login() {
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [modo, setModo] = useState<"entrar" | "criar">("entrar");
  const [msg, setMsg] = useState("");
  const [ocupado, setOcupado] = useState(false);

  async function enviar() {
    const c = supa();
    if (!c) {
      setMsg("Sem conexão com o serviço de conta. Tente de novo em instantes.");
      return;
    }
    if (!email.trim() || senha.length < 6) {
      setMsg("Informe e-mail e uma senha de 6+ caracteres.");
      return;
    }
    setOcupado(true);
    setMsg("Conectando...");
    try {
      const res =
        modo === "criar"
          ? await c.auth.signUp({ email: email.trim(), password: senha })
          : await c.auth.signInWithPassword({ email: email.trim(), password: senha });
      if (res.error) {
        setMsg(traduzErro(res.error.message));
        return;
      }
      if (modo === "criar" && !res.data.session) {
        setMsg("Conta criada! Confirme pelo link enviado ao seu e-mail e depois toque em Entrar.");
        setModo("entrar");
        return;
      }
      // sessão criada: o onAuthStateChange do store carrega o app
    } catch {
      setMsg("Sem conexão. Tente novamente.");
    } finally {
      setOcupado(false);
    }
  }

  async function esqueciSenha() {
    const c = supa();
    if (!c) {
      setMsg("Sem conexão com o serviço de conta.");
      return;
    }
    if (!email.trim()) {
      setMsg("Preencha o e-mail acima e toque de novo em “Esqueci a senha”.");
      return;
    }
    const { error } = await c.auth.resetPasswordForEmail(email.trim(), {
      redirectTo: window.location.origin,
    });
    setMsg(error ? traduzErro(error.message) : "Enviei um link de recuperação para o seu e-mail.");
  }

  return (
    <div className="login-tela">
      <div className="marca login-marca">
        <span>BIRL</span>
        <span className="ponto">!</span>
      </div>
      <p className="login-sub">Sua plataforma de treinos</p>

      <div className="card login-card">
        <h3>{modo === "criar" ? "Criar conta" : "Entrar"}</h3>
        <p className="card-sub">
          {modo === "criar"
            ? "Sua conta já vem com a ficha de treinos pronta — depois é só personalizar."
            : "Cada pessoa tem sua conta, com treinos, histórico e evolução próprios."}
        </p>
        <input
          type="email"
          autoComplete="email"
          placeholder="seu@email.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <input
          type="password"
          autoComplete={modo === "criar" ? "new-password" : "current-password"}
          placeholder="senha (mínimo 6 caracteres)"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && enviar()}
        />
        <div className="acoes">
          <button className="btn btn-pri" type="button" onClick={enviar} disabled={ocupado}>
            {modo === "criar" ? "Criar conta" : "Entrar"}
          </button>
        </div>
        <p className="msg-aviso">{msg}</p>
        <div className="login-links">
          <button type="button" onClick={() => { setModo(modo === "criar" ? "entrar" : "criar"); setMsg(""); }}>
            {modo === "criar" ? "Já tenho conta — entrar" : "Não tem conta? Criar agora"}
          </button>
          {modo === "entrar" && (
            <button type="button" onClick={esqueciSenha}>
              Esqueci a senha
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Modal exibido quando a pessoa chega pelo link de recuperação de senha. */
export function ModalNovaSenha() {
  const st = useStore();
  const [senha, setSenha] = useState("");
  const [msg, setMsg] = useState("");

  if (!st.recuperandoSenha) return null;

  async function salvar() {
    setMsg("Salvando...");
    const erro = await useStore.getState().definirNovaSenha(senha);
    setMsg(erro ?? "");
    if (!erro) alert("Senha alterada! Você já está dentro.");
  }

  return (
    <dialog open style={{ position: "fixed", top: "14vh", zIndex: 70, margin: "0 auto", left: 0, right: 0 }}>
      <div className="modal-corpo">
        <h3>Nova senha</h3>
        <p>Você chegou pelo link de recuperação. Escolha a nova senha da sua conta.</p>
        <input
          type="password"
          autoComplete="new-password"
          placeholder="nova senha (mínimo 6 caracteres)"
          value={senha}
          onChange={(e) => setSenha(e.target.value)}
        />
        <div className="acoes">
          <button className="btn btn-pri" type="button" onClick={salvar}>
            Salvar nova senha
          </button>
        </div>
        <p className="msg-aviso">{msg}</p>
      </div>
    </dialog>
  );
}
