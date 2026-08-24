import { useMemo, useState } from "react";
import "./mockup.css";

type Screen = "inicio" | "exploracao" | "operacoes" | "planos" | "meteorologia" | "colheitas" | "caderno" | "gestao" | "inventario" | "custos" | "configuracoes";

const navigation: { id: Screen; label: string; short: string; group?: string }[] = [
  { id: "inicio", label: "Início", short: "IN" },
  { id: "exploracao", label: "Exploração", short: "EX" },
  { id: "operacoes", label: "Operações", short: "OP" },
  { id: "planos", label: "Planos", short: "PL" },
  { id: "meteorologia", label: "Meteorologia", short: "ME" },
  { id: "colheitas", label: "Colheitas", short: "CO" },
  { id: "caderno", label: "Caderno de campo", short: "CA" },
  { id: "gestao", label: "Gestão", short: "GE", group: "Gestão e recursos" },
  { id: "inventario", label: "Inventário", short: "IV" },
  { id: "custos", label: "Custos", short: "CU" },
  { id: "configuracoes", label: "Configurações", short: "CF" },
];

const operationTypes = ["Instalar cultura", "Preparação do solo", "Pulverização", "Aplicação de produtos", "Fertilização", "Rega ou fertirrega", "Trabalho cultural", "Monitorização", "Colheita", "Outra operação"];

const recentOperations = [
  { date: "24 ago", type: "Rega", target: "OLV-01 · Olival Norte", detail: "18,4 mm · Setor Norte", tone: "blue" },
  { date: "23 ago", type: "Pulverização", target: "VIN-02 · Vinha da Encosta", detail: "Enxofre molhável · 3,2 ha", tone: "amber" },
  { date: "22 ago", type: "Monitorização", target: "TOM-01 · Tomate Campo Sul", detail: "Vigor uniforme · 2 achados", tone: "green" },
  { date: "20 ago", type: "Fertilização", target: "OLV-01 · Olival Norte", detail: "N 12,6 kg/ha · fertirrega", tone: "violet" },
];

const screenMeta: Record<Screen, { eyebrow: string; title: string; description: string }> = {
  inicio: { eyebrow: "Segunda-feira, 24 de agosto", title: "Bom dia, Hugo.", description: "Acompanhe o que mudou na exploração e registe o trabalho realizado." },
  exploracao: { eyebrow: "Exploração Monte Claro", title: "A exploração, vista no terreno.", description: "Talhões, plantações, setores e contadores numa única leitura espacial." },
  operacoes: { eyebrow: "Registo único", title: "Operações realizadas", description: "Cada trabalho existe uma vez e é projetado nas vistas especializadas relevantes." },
  planos: { eyebrow: "Decisão agronómica", title: "Planos em vigor", description: "Planos de fertilização e programação semanal de rega, separados da execução real." },
  meteorologia: { eyebrow: "Estação Monte Claro", title: "Meteorologia agronómica", description: "Condições modeladas, previsão e indicadores calculados por plantação." },
  colheitas: { eyebrow: "Campanha 2026", title: "Colheitas e lotes", description: "Produção, qualidade, imputações e destinos sem duplicar o lote físico." },
  caderno: { eyebrow: "Registo oficial", title: "Caderno de campo", description: "Consulte o caderno atual ou emita uma versão fechada para um âmbito concreto." },
  gestao: { eyebrow: "Pessoas e meios", title: "Gestão da exploração", description: "Trabalhadores, prestadores, equipamentos, documentos e validades." },
  inventario: { eyebrow: "Módulo ativo", title: "Inventário", description: "Entradas, lotes e consumos ligados às operações — sem bloquear o trabalho de campo." },
  custos: { eyebrow: "Módulo ativo", title: "Custos e rentabilidade", description: "Custos diretos e indiretos distribuídos sem duplicar recursos comuns." },
  configuracoes: { eyebrow: "Organização", title: "Configurações", description: "Catálogos, módulos, preferências, unidades e regras da organização." },
};

export default function MockupWorkspace() {
  const [screen, setScreen] = useState<Screen>("inicio");
  const [operationMenu, setOperationMenu] = useState(false);
  const [selectedField, setSelectedField] = useState("OLV-01");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const meta = screenMeta[screen];

  function navigate(target: Screen) {
    setScreen(target);
    setSidebarOpen(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  function chooseOperation(type: string) {
    setOperationMenu(false);
    setNotice(`Formulário “${type}” selecionado — nesta mockup seria aberto já com o contexto atual.`);
  }

  return <div className="farm-app">
    <aside className={`farm-sidebar ${sidebarOpen ? "is-open" : ""}`}>
      <div className="farm-brand-row">
        <img src="/brand/gerofarm-mark.svg" alt="GeroFarm" />
        <button className="sidebar-close" onClick={() => setSidebarOpen(false)} aria-label="Fechar navegação">×</button>
      </div>
      <div className="farm-context">
        <span>Exploração atual</span>
        <button>Monte Claro <b>⌄</b></button>
      </div>
      <nav className="farm-nav" aria-label="Navegação da aplicação">
        {navigation.map((item, index) => <div key={item.id}>
          {item.group && <p>{item.group}</p>}
          <button className={screen === item.id ? "active" : ""} onClick={() => navigate(item.id)}>
            <i>{item.short}</i><span>{item.label}</span>{item.id === "inventario" && <em>Ativo</em>}
          </button>
          {index === 6 && <div className="nav-divider" />}
        </div>)}
      </nav>
      <div className="sidebar-foot">
        <div className="avatar">HA</div><div><b>Hugo Alves</b><span>Administrador</span></div><button aria-label="Mais opções">•••</button>
      </div>
    </aside>

    <div className="farm-shell">
      <header className="farm-topbar">
        <button className="mobile-menu" onClick={() => setSidebarOpen(true)} aria-label="Abrir navegação">☰</button>
        <div className="crumb"><span>GeroFarm</span><b>/</b><strong>{navigation.find(item => item.id === screen)?.label}</strong></div>
        <div className="top-actions"><button className="icon-button" aria-label="Pesquisar">⌕</button><button className="icon-button notification" aria-label="Avisos">◎</button><button className="primary-action" onClick={() => setOperationMenu(true)}><span>＋</span> Registar operação</button></div>
      </header>

      <div className="mockup-banner"><b>Mockup para aprovação</b><span>Dados demonstrativos · nenhuma ação é guardada</span><a href="/">Ver homepage</a></div>

      <main className="farm-content">
        <section className="page-heading"><div><p>{meta.eyebrow}</p><h1>{meta.title}</h1><span>{meta.description}</span></div>{screen !== "inicio" && <button className="subtle-button" onClick={() => setNotice("Os filtros manter-se-iam ativos ao navegar entre vistas.")}>Filtros <b>3</b></button>}</section>
        {screen === "inicio" ? <Dashboard onNavigate={navigate} onRegister={() => setOperationMenu(true)} selectedField={selectedField} setSelectedField={setSelectedField} /> : <SectionScreen screen={screen} onNavigate={navigate} selectedField={selectedField} setSelectedField={setSelectedField} />}
      </main>
    </div>

    {operationMenu && <div className="modal-backdrop" onMouseDown={() => setOperationMenu(false)}><section className="operation-modal" onMouseDown={(event) => event.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="operation-title">
      <div className="modal-head"><div><p>Registo especializado</p><h2 id="operation-title">O que foi realizado?</h2><span>Escolha o tipo de operação para abrir o formulário certo.</span></div><button onClick={() => setOperationMenu(false)} aria-label="Fechar">×</button></div>
      <div className="operation-grid">{operationTypes.map((type, index) => <button key={type} onClick={() => chooseOperation(type)}><i>{String(index + 1).padStart(2, "0")}</i><span><b>{type}</b><small>{index === 0 ? "Cria uma plantação" : index === 8 ? "Produção, lote e destino" : "Registar trabalho realizado"}</small></span><em>→</em></button>)}</div>
    </section></div>}
    {notice && <button className="toast" onClick={() => setNotice("")}><b>Pré-visualização</b><span>{notice}</span><em>×</em></button>}
  </div>;
}

function Dashboard({ onNavigate, onRegister, selectedField, setSelectedField }: { onNavigate: (screen: Screen) => void; onRegister: () => void; selectedField: string; setSelectedField: (id: string) => void }) {
  return <>
    <section className="attention-strip"><div><i>!</i><span><b>3 pontos a rever</b><small>1 certificado próximo do fim · 2 operações com dados incompletos</small></span></div><button onClick={() => onNavigate("gestao")}>Rever agora →</button></section>
    <section className="metric-grid">
      <Metric label="Área ativa" value="84,6 ha" note="6 talhões" trend="+ 4,2 ha este ano" />
      <Metric label="Plantações ativas" value="8" note="5 permanentes · 3 temporárias" trend="2 campanhas em curso" />
      <Metric label="Água esta semana" value="1 842 m³" note="21,8 mm equivalentes" trend="72% do programado" blue />
      <Metric label="Operações em agosto" value="37" note="5 tipos de trabalho" trend="Última há 2 horas" />
    </section>
    <section className="dashboard-grid">
      <article className="panel map-panel">
        <PanelHead kicker="Exploração" title="Estado dos talhões" action="Abrir mapa" onClick={() => onNavigate("exploracao")} />
        <FarmMap selectedField={selectedField} setSelectedField={setSelectedField} />
      </article>
      <article className="panel weather-summary">
        <PanelHead kicker="Hoje" title="Tempo no Monte Claro" action="Ver detalhe" onClick={() => onNavigate("meteorologia")} />
        <div className="weather-now"><div><b>27°</b><span>Céu pouco nublado</span></div><i>☼</i></div>
        <div className="weather-mini"><span><b>0%</b> precipitação</span><span><b>18 km/h</b> noroeste</span><span><b>4,8 mm</b> ET0</span><span><b>7,2 h</b> molhamento</span></div>
        <div className="risk-note"><i>●</i><span><b>Risco moderado de stress hídrico</b><small>Tomate Campo Sul · próximas 48 horas</small></span></div>
      </article>
      <article className="panel operations-panel"><PanelHead kicker="Atividade" title="Operações recentes" action="Ver todas" onClick={() => onNavigate("operacoes")} /><OperationList /><button className="wide-outline" onClick={onRegister}>＋ Registar operação</button></article>
      <article className="panel weekly-panel"><PanelHead kicker="Semana 35" title="Rega programada" action="Abrir plano" onClick={() => onNavigate("planos")} /><div className="ring-row"><div className="progress-ring"><b>72%</b><span>realizado</span></div><div className="weekly-copy"><b>1 842 de 2 560 m³</b><span>3 setores com execução registada</span><small>718 m³ por realizar até domingo</small></div></div><div className="week-days">{["S","T","Q","Q","S","S","D"].map((day,index)=><span className={index < 4 ? "done" : index === 4 ? "today" : ""} key={`${day}${index}`}>{day}</span>)}</div></article>
    </section>
  </>;
}

function SectionScreen({ screen, onNavigate, selectedField, setSelectedField }: { screen: Screen; onNavigate: (screen: Screen) => void; selectedField: string; setSelectedField: (id: string) => void }) {
  if (screen === "exploracao") return <section className="exploration-layout"><article className="panel full-map"><div className="map-toolbar"><button className="active">Talhões</button><button>Plantações</button><button>Rega</button><button>Contadores</button><span /><button>Importar KML/KMZ</button><button>＋ Novo talhão</button></div><FarmMap selectedField={selectedField} setSelectedField={setSelectedField} large /></article><FieldInspector field={selectedField} onRegister={() => onNavigate("operacoes")} /></section>;
  if (screen === "meteorologia") return <WeatherScreen />;
  if (screen === "operacoes") return <OperationsScreen />;
  if (screen === "colheitas") return <HarvestScreen />;
  if (screen === "caderno") return <NotebookScreen />;
  return <GenericScreen screen={screen} />;
}

function OperationsScreen() { return <section className="panel table-panel"><div className="filter-row"><button className="active">Todas <b>37</b></button><button>Pulverizações <b>5</b></button><button>Rega <b>12</b></button><button>Fertilização <b>7</b></button><button>Trabalhos culturais <b>9</b></button><button>Mais ⌄</button></div><div className="data-table"><div className="table-head"><span>Data / operação</span><span>Destino</span><span>Recursos</span><span>Estado</span><span /></div>{recentOperations.concat([{ date: "19 ago", type: "Trabalho cultural", target: "VIN-02 · Vinha da Encosta", detail: "Desponta · 12,5 h", tone: "green" }]).map((item,index)=><div className="table-row" key={`${item.date}${item.type}`}><span><i className={item.tone} /> <b>{item.type}</b><small>{item.date} 2026</small></span><span><b>{item.target}</b><small>{index === 1 ? "3,2 ha · 100%" : "Área intervencionada registada"}</small></span><span><b>{index + 1} trabalhador{index ? "es" : ""}</b><small>{item.detail}</small></span><span><em className={index === 1 ? "warning-chip" : "ok-chip"}>{index === 1 ? "Rever" : "Completa"}</em></span><button>•••</button></div>)}</div></section>; }

function WeatherScreen() { return <><section className="weather-hero-card"><div><span>Agora · 10:42</span><b>27,4°</b><p>Pouco nublado · sensação 28,1°</p><small>Estação virtual Monte Claro · dados modelados</small></div><div className="weather-glyph">☼</div><div className="weather-facts"><span><b>42%</b>Humidade</span><span><b>18 km/h</b>Vento NO</span><span><b>0,0 mm</b>Precipitação</span><span><b>5 alto</b>Índice UV</span></div></section><section className="indicator-grid"><Metric label="ET0 hoje" value="4,8 mm" note="FAO-56 Penman-Monteith" trend="+0,6 mm face a ontem" blue /><Metric label="Radiação solar" value="18,7 MJ/m²" note="energia diária estimada" trend="DLI 34,2 mol/m²" /><Metric label="Graus-dia" value="1 486" note="Olival Norte · campanha" trend="Base 10 °C" /><Metric label="Molhamento foliar" value="7,2 h" note="estimado nas últimas 24 h" trend="Confiança média" /></section><section className="panel chart-panel"><PanelHead kicker="Últimos 7 dias" title="Balanço hídrico" action="Comparar plantações" /><div className="chart-area">{[42,58,49,72,64,81,67].map((height,index)=><div key={index}><span style={{height:`${height}%`}}/><b>{["Seg","Ter","Qua","Qui","Sex","Sáb","Dom"][index]}</b></div>)}</div><div className="chart-legend"><span><i /> ET0</span><span><i /> Rega + precipitação</span></div></section></>; }

function HarvestScreen() { const lots=[{lot:"OL0001OL01-260818-01",culture:"Oliveira · Galega",field:"OLV-01",qty:"12 480 kg",status:"Em aberto"},{lot:"TM0003TS01-260816-01",culture:"Tomate · H1015",field:"TOM-01",qty:"28 620 kg",status:"Fechado"},{lot:"UV0MIXVI02-260812-01",culture:"Vinha · várias variedades",field:"VIN-02",qty:"8 940 kg",status:"Fechado"}]; return <><section className="metric-grid three"><Metric label="Produção em agosto" value="50,0 t" note="3 lotes" trend="+8,4% face a 2025" /><Metric label="Área colhida" value="11,7 ha" note="4 origens imputadas" trend="Produtividade 4,27 t/ha" /><Metric label="Receita registada" value="18 420 €" note="2 lotes valorizados" trend="1 lote sem preço" /></section><section className="panel table-panel"><PanelHead kicker="Lotes físicos" title="Colheitas recentes" action="Exportar" /><div className="data-table harvest-table"><div className="table-head"><span>Lote</span><span>Cultura / origem</span><span>Quantidade</span><span>Estado</span><span /></div>{lots.map(lot=><div className="table-row" key={lot.lot}><span><code>{lot.lot}</code><small>Data inicial no código</small></span><span><b>{lot.culture}</b><small>{lot.field}</small></span><span><b>{lot.qty}</b><small>Peso líquido</small></span><span><em className={lot.status==="Em aberto"?"warning-chip":"ok-chip"}>{lot.status}</em></span><button>→</button></div>)}</div></section></>; }

function NotebookScreen() { return <section className="notebook-layout"><article className="notebook-preview"><div className="paper-head"><img src="/brand/gerofarm-mark.svg" alt="GeroFarm" /><span>EXP-2026-0001-V2</span></div><p>Caderno de campo</p><h2>Campanha 2026 · Olival Norte</h2><div className="paper-meta"><span><b>Exploração</b>Monte Claro</span><span><b>Período</b>01 jan — 24 ago 2026</span><span><b>Área</b>24,8 ha</span></div><div className="paper-lines">{[88,72,94,64,81,55,90,76,62].map((width,index)=><i style={{width:`${width}%`}} key={index}/>)}</div><footer>Pré-visualização dinâmica · o PDF emitido permanece fechado</footer></article><aside className="notebook-actions"><span>Caderno atual</span><h3>Dados atualizados há 2 minutos</h3><p>Inclui 42 operações, 3 análises, 4 colheitas e 6 avisos aceites no âmbito selecionado.</p><div className="check-list"><span>✓ Identificação e mapas</span><span>✓ Trabalhos e recursos</span><span>✓ Fertilização e rega</span><span>✓ Colheitas e lotes</span><span className="warn">! 2 anexos por escolher</span></div><button className="primary-action">Emitir nova versão</button><button className="wide-outline">Exportar XLSX</button><small>Custos, preços, receitas e margens nunca entram no caderno.</small></aside></section>; }

function GenericScreen({ screen }: { screen: Screen }) { const content: Partial<Record<Screen,{tabs:string[];cards:{label:string;value:string;note:string}[]}>>={planos:{tabs:["Fertilização","Rega semanal","Histórico"],cards:[{label:"Planos em vigor",value:"5",note:"3 fertilização · 2 rega"},{label:"Semana atual",value:"2 560 m³",note:"programados"},{label:"Avisos",value:"2",note:"não bloqueantes"}]},gestao:{tabs:["Trabalhadores","Prestadores","Equipamentos","Documentos"],cards:[{label:"Trabalhadores ativos",value:"12",note:"3 aplicadores válidos"},{label:"Equipamentos",value:"18",note:"2 manutenções próximas"},{label:"Prestadores",value:"4",note:"todos ativos"}]},inventario:{tabs:["Existências","Movimentos","Compras","Por regularizar"],cards:[{label:"Produtos ativos",value:"86",note:"12 com lote obrigatório"},{label:"Valor atual",value:"24 680 €",note:"sem IVA"},{label:"Por regularizar",value:"3",note:"consumos sem stock"}]},custos:{tabs:["Resumo","Operações","Campanhas","Custos fixos"],cards:[{label:"Custo da campanha",value:"48 720 €",note:"580 €/ha"},{label:"Receita",value:"73 940 €",note:"dados registados"},{label:"Margem",value:"25 220 €",note:"34,1%"}]},configuracoes:{tabs:["Organização","Catálogos","Módulos","Unidades","Idiomas"],cards:[{label:"Plano",value:"Professional",note:"até 500 ha"},{label:"Módulos ativos",value:"2",note:"Inventário e Custos"},{label:"Idioma",value:"Português",note:"Portugal"}]}}; const data=content[screen]||content.planos!; return <><section className="section-tabs">{data.tabs.map((tab,index)=><button className={index===0?"active":""} key={tab}>{tab}</button>)}</section><section className="metric-grid three">{data.cards.map(card=><Metric key={card.label} label={card.label} value={card.value} note={card.note} trend="Ver detalhe →" />)}</section><section className="panel empty-detail"><div className="detail-graphic"><i/><i/><i/></div><div><span>Vista de detalhe</span><h3>Estrutura visual preparada para aprovação</h3><p>Os filtros, tabelas e formulários desta área seguirão o mesmo sistema visual. A mockup foca primeiro a hierarquia, navegação e densidade de informação.</p></div></section></>; }

function Metric({ label,value,note,trend,blue=false }:{label:string;value:string;note:string;trend:string;blue?:boolean}) { return <article className={`metric-card ${blue?"blue":""}`}><div><span>{label}</span><i>↗</i></div><b>{value}</b><p>{note}</p><small>{trend}</small></article>; }
function PanelHead({ kicker,title,action,onClick }:{kicker:string;title:string;action:string;onClick?:()=>void}) { return <header className="panel-head"><div><span>{kicker}</span><h2>{title}</h2></div><button onClick={onClick}>{action} →</button></header>; }
function OperationList() { return <div className="operation-list">{recentOperations.map(item=><div key={`${item.date}${item.type}`}><i className={item.tone}/><span><b>{item.type}</b><small>{item.target}</small></span><em>{item.date}</em></div>)}</div>; }

function FarmMap({ selectedField,setSelectedField,large=false }:{selectedField:string;setSelectedField:(id:string)=>void;large?:boolean}) { const fields=[{id:"OLV-01",name:"Olival Norte",className:"field-one"},{id:"VIN-02",name:"Vinha da Encosta",className:"field-two"},{id:"TOM-01",name:"Tomate Campo Sul",className:"field-three"},{id:"POU-01",name:"Pousio",className:"field-four"}]; return <div className={`farm-map ${large?"large":""}`}><div className="map-grid"/><div className="water-line"/><div className="road-line"/>{fields.map(field=><button key={field.id} className={`field-shape ${field.className} ${selectedField===field.id?"selected":""}`} onClick={()=>setSelectedField(field.id)} aria-label={`Selecionar ${field.name}`}><span>{field.id}</span></button>)}<div className="map-key"><span><i className="active-field"/>Cultura ativa</span><span><i className="free-field"/>Área livre</span></div><div className="map-zoom"><button>＋</button><button>−</button></div></div>; }

function FieldInspector({ field,onRegister }:{field:string;onRegister:()=>void}) { const data=useMemo(()=>field==="VIN-02"?{name:"Vinha da Encosta",area:"12,4 ha",crop:"Vinha · Touriga Nacional",campaign:"Campanha 2026"}:field==="TOM-01"?{name:"Tomate Campo Sul",area:"8,7 ha",crop:"Tomate · H1015",campaign:"Ciclo ativo"}:{name:"Olival Norte",area:"24,8 ha",crop:"Oliveira · Galega",campaign:"Campanha 2026"},[field]); return <aside className="field-inspector"><span>{field}</span><h2>{data.name}</h2><p>{data.area} · 100% ocupada</p><div className="crop-card"><i>●</i><div><b>{data.crop}</b><span>{data.campaign}</span></div><button>→</button></div><dl><div><dt>Última operação</dt><dd>Rega · hoje</dd></div><div><dt>Setor de rega</dt><dd>Setor Norte</dd></div><div><dt>Área livre</dt><dd>0,0 ha</dd></div><div><dt>Avisos</dt><dd className="warn-text">1 por rever</dd></div></dl><button className="primary-action" onClick={onRegister}>＋ Registar operação</button><button className="wide-outline">Abrir ficha do talhão</button></aside>; }
