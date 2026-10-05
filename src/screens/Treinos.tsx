import { useState } from "react";
import { useStore } from "../store";
import { EditorTreino } from "./EditorTreino";
import { EditorPrograma } from "./EditorPrograma";
import { NIVEIS, templateDoPrograma, type CatalogoPrograma, type Nivel } from "../catalogo";
import { trilhaOrdenada, treinosFeitos } from "../trilha";
import { Folha, confirmar } from "../folha";
import { Icone } from "../icones";
import { novoId, agora } from "../types";
import type { Treino, Programa } from "../types";

const DIAS_ABREV = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const ORDEM_SEMANA = [1, 2, 3, 4, 5, 6, 0];

/** "4x · seg ter qui sex" */
function resumoDias(divisao: Record<number, unknown>): string {
  const dias = ORDEM_SEMANA.filter((d) => divisao[d] != null);
  return `${dias.length}x · ${dias.map((d) => DIAS_ABREV[d].toLowerCase()).join(" ")}`;
}

type Menu = { tipo: "programa"; p: Programa } | { tipo: "treino"; t: Treino } | null;

export function Treinos() {
  const st = useStore();
  const [editandoProgramaId, setEditandoProgramaId] = useState<string | null>(null);
  const [trilhaAberta, setTrilhaAberta] = useState(false);
  const [menu, setMenu] = useState<Menu>(null);

  if (st.editandoTreinoId) return <EditorTreino treinoId={st.editandoTreinoId} />;
  if (editandoProgramaId) return <EditorPrograma programaId={editandoProgramaId} aoVoltar={() => setEditandoProgramaId(null)} />;

  const programas = Object.values(st.programas)
    .filter((p) => !p.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.nome.localeCompare(b.nome, "pt-BR"));
  const ativoId = st.programaAtivo()?.id;

  const todos = Object.values(st.treinos)
    .filter((t) => !t.deleted)
    .sort((a, b) => Number(!!a.arquivado) - Number(!!b.arquivado) || a.ordem - b.ordem);

  // agrupa os treinos por programa (evita o "Treino A" ambíguo entre programas)
  const emAlgumPrograma = new Set(programas.flatMap((p) => p.treinoIds));
  const grupos = programas.map((p) => ({
    titulo: p.nome + (p.arquivado ? " (arquivado)" : ""),
    treinos: p.treinoIds.map((id) => st.treinos[id]).filter((t) => t && !t.deleted),
  }));
  const orfaos = todos.filter((t) => !emAlgumPrograma.has(t.id));
  if (orfaos.length) grupos.push({ titulo: "Sem programa", treinos: orfaos });

  function criarPrograma() {
    const p: Programa = {
      id: novoId(),
      nome: "Novo programa",
      treinoIds: [],
      divisaoSemana: { 0: null, 1: null, 2: null, 3: null, 4: null, 5: null, 6: null },
      updated_at: agora(),
    };
    st.salvarPrograma(p);
    setEditandoProgramaId(p.id);
  }

  function criarTreino() {
    const t: Treino = {
      id: novoId(),
      nome: "Novo treino",
      foco: "",
      ordem: Math.max(...todos.map((t) => t.ordem), -1) + 1,
      exercicios: [],
      updated_at: agora(),
    };
    st.salvarTreino(t);
    st.setEditandoTreino(t.id);
  }

  return (
    <>
      <button className="pg" type="button" onClick={() => setTrilhaAberta(true)} style={{ marginBottom: 4 }}>
        <Icone nome="trilha" />
        <span className="info">
          <span className="nome" style={{ display: "block" }}>
            Programas prontos
          </span>
          <span className="meta">A trilha do curso, do primeiro dia ao avançado (7 programas)</span>
        </span>
        <Icone nome="seta" />
      </button>

      <span className="rotulo-secao">Meus programas</span>
      {programas.length === 0 && <div className="vazio">Nenhum programa ainda. Escolha um pronto ou crie o seu.</div>}
      {programas.map((p) => (
        <div className={`treino-item${p.arquivado ? " arquivado" : ""}`} key={p.id}>
          <button className="abrir" type="button" onClick={() => setEditandoProgramaId(p.id)}>
            <span className="nome">
              {p.nome}
              {p.id === ativoId && <span className="selo uso">Em uso</span>}
            </span>
            <span className="foco" style={{ display: "block" }}>
              {resumoDias(p.divisaoSemana)} · {p.treinoIds.length} treino(s){p.arquivado ? " · arquivado" : ""}
            </span>
          </button>
          <button className="btn-icone" type="button" aria-label={`Ações de ${p.nome}`} onClick={() => setMenu({ tipo: "programa", p })}>
            <Icone nome="menu" />
          </button>
        </div>
      ))}
      <div className="acoes">
        <button className="btn btn-sec" type="button" onClick={criarPrograma}>
          <Icone nome="mais" pequeno />
          Novo programa
        </button>
      </div>

      <span className="rotulo-secao">Meus treinos</span>
      {todos.length === 0 && <div className="vazio">Nenhum treino ainda.</div>}
      {grupos.map((g) => (
        <div key={g.titulo}>
          <div className="grupo-programa">{g.titulo}</div>
          {g.treinos.length === 0 && <div className="meta-linha" style={{ padding: "0 4px 10px" }}>Sem treinos.</div>}
          {g.treinos.map((t) => (
            <div className={`treino-item${t.arquivado ? " arquivado" : ""}`} key={t.id}>
              <button className="abrir" type="button" onClick={() => st.setEditandoTreino(t.id)}>
                <span className="nome">{t.nome}</span>
                <span className="foco" style={{ display: "block" }}>
                  {t.foco ? `${t.foco} · ` : ""}
                  {t.exercicios.length} exercício(s){t.arquivado ? " · arquivado" : ""}
                </span>
              </button>
              <button className="btn-icone" type="button" aria-label={`Ações de ${t.nome}`} onClick={() => setMenu({ tipo: "treino", t })}>
                <Icone nome="menu" />
              </button>
            </div>
          ))}
        </div>
      ))}
      <div className="acoes">
        <button className="btn btn-sec" type="button" onClick={criarTreino}>
          <Icone nome="mais" pequeno />
          Novo treino
        </button>
      </div>

      {menu?.tipo === "programa" && (
        <MenuPrograma p={menu.p} ativo={menu.p.id === ativoId} aoFechar={() => setMenu(null)} aoEditar={() => setEditandoProgramaId(menu.p.id)} />
      )}
      {menu?.tipo === "treino" && <MenuTreino t={menu.t} aoFechar={() => setMenu(null)} />}
      {trilhaAberta && (
        <TrilhaFolha
          aoFechar={() => setTrilhaAberta(false)}
          aoAdicionar={() => {
            setTrilhaAberta(false);
            st.setTab("hoje");
          }}
        />
      )}
    </>
  );
}

function MenuPrograma({ p, ativo, aoFechar, aoEditar }: { p: Programa; ativo: boolean; aoFechar(): void; aoEditar(): void }) {
  const st = useStore();
  const fazer = (f: () => void) => () => {
    aoFechar();
    f();
  };
  return (
    <Folha titulo={p.nome} aoFechar={aoFechar}>
      <div className="menu-lista">
        {!ativo && !p.arquivado && (
          <button type="button" onClick={fazer(() => st.setProgramaAtivo(p.id))}>
            <Icone nome="play" /> Usar este programa
          </button>
        )}
        <button type="button" onClick={fazer(aoEditar)}>
          <Icone nome="editar" /> Editar
        </button>
        <button type="button" onClick={fazer(() => st.duplicarPrograma(p.id))}>
          <Icone nome="copiar" /> Duplicar
        </button>
        <button type="button" onClick={fazer(() => st.arquivarPrograma(p.id, !p.arquivado))}>
          <Icone nome="arquivo" /> {p.arquivado ? "Desarquivar" : "Arquivar"}
        </button>
        <button
          type="button"
          className="perigo"
          onClick={fazer(async () => {
            const ok = await confirmar({
              titulo: "Excluir programa?",
              texto: `"${p.nome}" sai da lista. Os treinos e todo o histórico continuam existindo.`,
              acao: "Excluir programa",
            });
            if (ok) st.excluirPrograma(p.id);
          })}
        >
          <Icone nome="lixo" /> Excluir
        </button>
      </div>
    </Folha>
  );
}

function MenuTreino({ t, aoFechar }: { t: Treino; aoFechar(): void }) {
  const st = useStore();
  const fazer = (f: () => void) => () => {
    aoFechar();
    f();
  };
  return (
    <Folha titulo={t.nome} aoFechar={aoFechar}>
      <div className="menu-lista">
        <button type="button" onClick={fazer(() => st.setEditandoTreino(t.id))}>
          <Icone nome="editar" /> Editar
        </button>
        <button type="button" onClick={fazer(() => st.duplicarTreino(t.id))}>
          <Icone nome="copiar" /> Duplicar
        </button>
        <button type="button" onClick={fazer(() => st.arquivarTreino(t.id, !t.arquivado))}>
          <Icone nome="arquivo" /> {t.arquivado ? "Desarquivar" : "Arquivar"}
        </button>
        <button
          type="button"
          className="perigo"
          onClick={fazer(async () => {
            const ok = await confirmar({
              titulo: "Excluir treino?",
              texto: `"${t.nome}" sai dos programas. O histórico das sessões já registradas continua na Evolução.`,
              acao: "Excluir treino",
            });
            if (ok) st.excluirTreino(t.id);
          })}
        >
          <Icone nome="lixo" /> Excluir
        </button>
      </div>
    </Folha>
  );
}

/** Trilha de programas prontos, por nível, com o detalhe antes de adicionar. */
function TrilhaFolha({ aoFechar, aoAdicionar }: { aoFechar(): void; aoAdicionar(): void }) {
  const st = useStore();
  const [detalhe, setDetalhe] = useState<CatalogoPrograma | null>(null);
  const meus = Object.values(st.programas).filter((p) => !p.deleted);
  const ativo = st.programaAtivo();
  const porTpl = new Map<string, Programa[]>();
  for (const p of meus) {
    const tpl = templateDoPrograma(p);
    if (tpl) porTpl.set(tpl.id, [...(porTpl.get(tpl.id) ?? []), p]);
  }
  const selo = (tpl: CatalogoPrograma) => {
    const lista = porTpl.get(tpl.id) ?? [];
    if (lista.some((p) => p.id === ativo?.id)) return <span className="selo uso">Em uso</span>;
    const semanas = tpl.semanas;
    const porSemana = Object.values(tpl.divisaoSemana).filter((x) => x != null).length;
    if (semanas && lista.some((p) => treinosFeitos(p, st.sessoes).length >= Math.ceil(porSemana * semanas * 0.75)))
      return <span className="selo feito">Concluído</span>;
    if (lista.length) return <span className="selo feito">Adicionado</span>;
    return null;
  };
  const trilha = trilhaOrdenada();
  const niveis = [1, 2, 3] as Nivel[];

  if (detalhe) return <DetalhePrograma tpl={detalhe} jaTem={porTpl.has(detalhe.id)} aoVoltar={() => setDetalhe(null)} aoFechar={aoFechar} aoAdicionar={aoAdicionar} />;

  return (
    <Folha titulo="Programas prontos" aoFechar={aoFechar} cheia>
      <p>Toque num programa para ver a semana e os treinos. Ao adicionar, ele vira um programa seu, editável.</p>
      {niveis.map((n) => (
        <div key={n}>
          <div className="nivel">
            <span className="n">{n}</span>
            <span className="rotulo">{NIVEIS[n]}</span>
          </div>
          <div className="trilha">
            {trilha
              .filter((t) => t.nivel === n)
              .map((tpl) => (
                <button key={tpl.id} className={`pg${porTpl.get(tpl.id)?.some((p) => p.id === ativo?.id) ? " ativo" : ""}`} type="button" onClick={() => setDetalhe(tpl)}>
                  <span className="info">
                    <span className="nome" style={{ display: "block" }}>
                      {tpl.nome}
                    </span>
                    <span className="meta" style={{ display: "block" }}>
                      {resumoDias(tpl.divisaoSemana)}
                      {tpl.semanas ? ` · ≈${tpl.semanas} semanas` : ""}
                    </span>
                  </span>
                  {selo(tpl)}
                </button>
              ))}
          </div>
        </div>
      ))}
    </Folha>
  );
}

function DetalhePrograma({
  tpl,
  jaTem,
  aoVoltar,
  aoFechar,
  aoAdicionar,
}: {
  tpl: CatalogoPrograma;
  jaTem: boolean;
  aoVoltar(): void;
  aoFechar(): void;
  aoAdicionar(): void;
}) {
  const st = useStore();
  const [sedentario, setSedentario] = useState(false);
  const letras = tpl.treinos.map((t) => (tpl.treinos.length === 1 ? "•" : t.nome.replace(/^Treino /i, "")));
  const adicionar = (ativar: boolean) => {
    const id = st.adicionarProgramaDoCatalogo(tpl.id, { sedentario, ativar });
    if (id) aoAdicionar();
  };
  return (
    <Folha titulo={tpl.nome} aoFechar={aoFechar} cheia>
      <button className="link" type="button" onClick={aoVoltar} style={{ marginTop: -8 }}>
        <Icone nome="voltar" pequeno /> Todos os programas
      </button>
      <p style={{ marginBottom: 6 }}>{tpl.descricao}</p>
      <p style={{ marginBottom: 12 }}>
        <b>Para quem:</b> {tpl.paraQuem}
      </p>
      <span className="rotulo">Semana sugerida</span>
      <div className="semana" style={{ margin: "8px 0 12px" }}>
        {ORDEM_SEMANA.map((d) => (
          <span className="d" key={`d${d}`}>
            {DIAS_ABREV[d]}
          </span>
        ))}
        {ORDEM_SEMANA.map((d) => {
          const idx = tpl.divisaoSemana[d];
          return (
            <span className={`t${idx != null ? " on" : ""}`} key={`t${d}`}>
              {idx != null ? letras[idx] : "–"}
            </span>
          );
        })}
      </div>
      {tpl.treinos.map((t, i) => (
        <div className="tr-resumo" key={i}>
          <div className="cab">
            <span className="letra">{letras[i]}</span>
            <span className="foco">{t.foco}</span>
          </div>
          <div className="lista">
            {t.exercicios.length} exercícios: {t.exercicios.map((e) => e.nome).join(" · ")}
          </div>
          {t.preparo?.length ? <div className="lista">Preparo: {t.preparo.join(" · ")}</div> : null}
        </div>
      ))}
      {tpl.opcaoSedentario && (
        <label className="check-linha" style={{ marginTop: 12 }}>
          <input type="checkbox" checked={sedentario} onChange={(e) => setSedentario(e.target.checked)} />
          <span>Estou parado há muito tempo: 1 série na semana 1, 2 na semana 2, 3 depois</span>
        </label>
      )}
      {jaTem && <p style={{ marginTop: 12 }}>Você já tem este programa. Adicionar de novo cria uma cópia separada.</p>}
      <div className="acoes" style={{ marginTop: 12 }}>
        <button className="btn btn-pri" type="button" style={{ flexBasis: "100%" }} onClick={() => adicionar(true)}>
          Adicionar e usar este programa
        </button>
        <button className="btn btn-sec" type="button" onClick={() => adicionar(false)}>
          Só adicionar
        </button>
      </div>
      <p style={{ marginTop: 12, fontSize: 13 }}>Fonte: {tpl.origem}.</p>
    </Folha>
  );
}
