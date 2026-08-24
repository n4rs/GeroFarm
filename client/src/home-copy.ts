export const supportedLocales = ["pt-PT", "pt-BR", "en", "fr", "es", "nl", "de", "ja", "he", "tr", "ar", "pl", "hr", "el", "sv", "no", "da", "it", "uk", "ro", "fi", "bg", "hu", "is", "sk", "lt", "sl", "lv"] as const;
export type SupportedLocale = typeof supportedLocales[number];

export type HomepageCopy = {
  metaTitle: string; metaDescription: string;
  nav: { platform: string; weather: string; plans: string; faq: string; login: string; start: string; language: string; menu: string };
  hero: { eyebrow: string; title: string; accent: string; description: string; primary: string; secondary: string; note: string; imageAlt: string; mapLabel: string; cropLabel: string; operationLabel: string };
  proof: string[];
  flow: { kicker: string; title: string; description: string; stages: string[] };
  platform: { kicker: string; title: string; description: string; cards: Array<{ title: string; description: string; status: string }> };
  weather: { kicker: string; title: string; description: string; metrics: string[]; tagsTitle: string; tags: string[]; status: string };
  modules: { kicker: string; title: string; description: string; inventory: string; inventoryDesc: string; costs: string; costsDesc: string; optional: string };
  pricing: {
    kicker: string; title: string; description: string; monthly: string; annual: string; annualNote: string; vat: string; recommended: string; consult: string; month: string; year: string; choose: string; contact: string;
    plans: Array<{ name: string; description: string; monthly: string; annual: string; features: string[] }>;
    addonsTitle: string; addons: string[]; paidNote: string; grace: string;
  };
  faq: { kicker: string; title: string; items: Array<{ q: string; a: string }> };
  closing: { title: string; description: string; primary: string; secondary: string };
  footer: { tagline: string; product: string; account: string; legal: string; privacy: string; terms: string; cookies: string; future: string; rights: string };
};

export const en: HomepageCopy = {
  metaTitle: "Field management software for modern farming | GeroFarm",
  metaDescription: "Map fields, connect crops, operations, harvests and agronomic weather, and keep a clear field record with GeroFarm.",
  nav: { platform: "Platform", weather: "Agronomic weather", plans: "Plans", faq: "FAQ", login: "Sign in", start: "Get started", language: "Language", menu: "Open menu" },
  hero: { eyebrow: "Field agriculture, connected", title: "Every field decision,", accent: "from map to field record.", description: "GeroFarm connects parcels, crops, operations, harvests and agronomic indicators in one practical history for your farm.", primary: "Start with GeroFarm", secondary: "View plans", note: "Free for up to 30 days · No credit card required", imageAlt: "Agricultural fields with mapped parcel boundaries and agronomic observation points", mapLabel: "Mapped parcels", cropLabel: "Active crops", operationLabel: "Operations linked" },
  proof: ["KML and KMZ field maps", "Temporary and permanent crops", "Unlimited operations and harvests", "A field record built from real work"],
  flow: { kicker: "One connected history", title: "From the land to the field record", description: "Each record enriches the next without duplicating the same physical work, resources or costs.", stages: ["Field", "Crop", "Operation", "Harvest", "Field record"] },
  platform: { kicker: "Daily farm management", title: "The work of the farm, in the same place", description: "Structure the farm, record what happened and retrieve the context your team needs.", cards: [
    { title: "Maps and parcels", description: "Draw fields or import KML/KMZ boundaries and keep areas, crops and observations connected to the map.", status: "Available" },
    { title: "Crops and campaigns", description: "Manage permanent crops and compatible temporary crops by area, cycle and campaign.", status: "Available" },
    { title: "Operations and spraying", description: "Record cultural work, plant protection products, people, equipment and execution evidence.", status: "Available" },
    { title: "Irrigation and fertigation", description: "Connect irrigation sectors, water, nutrients and executed fertigation without duplicating the operation.", status: "Available" },
    { title: "Fertilisation", description: "Record plans and completed applications with products, nutrients, doses and responsible applicators.", status: "Available" },
    { title: "Harvests and lots", description: "Keep quantities, quality, destination and lots connected to the crop that produced them.", status: "Available" },
    { title: "Teams and equipment", description: "Associate people, valid applicators, machinery and resources with each operation.", status: "Available" },
    { title: "Field record", description: "Generate a coherent PDF from the current operational history. Free includes a clearly marked fictional demonstration only.", status: "Available" }
  ] },
  weather: { kicker: "Agronomic weather", title: "Weather that speaks the language of each crop", description: "Virtual stations turn weather data into agronomic indicators linked to each crop and its tags. Values are estimates for decision support, not sensor measurements.", metrics: ["Reference evapotranspiration (ET₀)", "Solar radiation", "Estimated daily light integral (DLI)", "Growing degree days", "Chill requirements", "Estimated leaf wetness", "Indicators by crop"], tagsTitle: "Examples by crop tag", tags: ["Phenological stage", "Variety", "Irrigation sector", "Risk monitoring"], status: "Available in the planned GeroFarm offer" },
  modules: { kicker: "Adaptable depth", title: "Add operational control when you need it", description: "Inventory and Costs are optional modules on Grow and Custom, and included with Professional.", inventory: "Inventory", inventoryDesc: "Purchases, batches, movements and consumption connected to the operation that used each resource.", costs: "Costs", costsDesc: "Labour, equipment, inputs and other resources projected into crop and harvest costs without double counting.", optional: "Optional module" },
  pricing: { kicker: "Clear plans", title: "Start small. Keep the whole operational history.", description: "No plan limits operations, harvests or field records. All paid plans allow future integrations, including GeroGrid when available.", monthly: "Monthly", annual: "Annual", annualNote: "Annual billing equals ten monthly payments", vat: "Prices exclude VAT.", recommended: "Most popular", consult: "On request", month: "/month", year: "/year", choose: "Choose plan", contact: "Request a proposal",
    plans: [
      { name: "Free", description: "A real 30-day start for one organisation.", monthly: "€0", annual: "€0", features: ["1 user", "10 ha", "5 active fields", "1 virtual station", "30 days maximum", "Consultation and export after the period", "Fictional, non-valid field-record PDF demo"] },
      { name: "Grow", description: "For farms building a consistent digital routine.", monthly: "€24.90", annual: "€249", features: ["3 users", "100 ha", "50 fields", "2 virtual stations", "Inventory and Costs available as add-ons", "Future integrations allowed"] },
      { name: "Professional", description: "For larger teams and more complex operations.", monthly: "€69.90", annual: "€699", features: ["10 users", "500 ha", "250 fields", "5 virtual stations", "Inventory included", "Costs included", "Future integrations allowed"] },
      { name: "Custom", description: "Limits, integrations and modules tailored to the organisation.", monthly: "On request", annual: "On request", features: ["Custom users and area", "Custom fields and stations", "Inventory and Costs by proposal", "Tailored modules", "Future and tailored integrations"] }
    ],
    addonsTitle: "Add-ons for Grow and Custom", addons: ["Inventory · €9.90/month or €99/year", "Costs · €19.90/month or €199/year", "Inventory + Costs · €24.90/month or €249/year", "Additional virtual station on paid plans · €4.90/month or €49/year"], paidNote: "All paid plans keep the full operational history and may use future integrations when they become available.", grace: "When a subscription ends, the organisation has a 7-day grace period with a notice at every sign-in." },
  faq: { kicker: "Before you start", title: "Straight answers", items: [
    { q: "What happens after the 30 Free days?", a: "The organisation switches to consultation and export. Data stays preserved; creating or changing operational records requires a paid plan." },
    { q: "Is the Free field-record PDF valid?", a: "No. Free only includes a fictional demonstration PDF, clearly identified as having no validity." },
    { q: "Are Inventory and Costs included?", a: "Both are included with Professional. On Grow and Custom they can be added separately or as a pack, subject to the Custom proposal." },
    { q: "Can I add more virtual stations?", a: "Yes. Paid plans can add stations for €4.90/month or €49/year each." },
    { q: "Why is annual billing lower?", a: "The annual price equals ten monthly payments. All displayed prices exclude VAT." },
    { q: "Does GeroFarm already integrate with GeroGrid?", a: "The boundary is prepared for future integrations, including GeroGrid. This is not presented as an active integration until it is implemented and released." }
  ] },
  closing: { title: "Give every field operation a useful history", description: "Start free, map the farm and build a field record from the work your team already does.", primary: "Create account", secondary: "Sign in" },
  footer: { tagline: "Clear field management, from map to field record.", product: "Product", account: "Access", legal: "Legal", privacy: "Privacy", terms: "Terms", cookies: "Cookies", future: "Future integrations are identified as such and are not sold as active features.", rights: "All rights reserved." }
};

export const ptPT: HomepageCopy = {
  metaTitle: "Software de gestão agrícola de campo | GeroFarm",
  metaDescription: "Mapeie talhões, ligue plantações, operações, colheitas e meteorologia agronómica e mantenha um caderno de campo claro com o GeroFarm.",
  nav: { platform: "Plataforma", weather: "Meteorologia agronómica", plans: "Planos", faq: "Perguntas", login: "Entrar", start: "Começar", language: "Idioma", menu: "Abrir menu" },
  hero: { eyebrow: "Agricultura de campo, ligada", title: "Cada decisão no talhão,", accent: "do mapa ao caderno de campo.", description: "O GeroFarm liga talhões, plantações, operações, colheitas e indicadores agronómicos num histórico prático para a sua exploração.", primary: "Começar com o GeroFarm", secondary: "Ver planos", note: "Grátis até 30 dias · Sem cartão de crédito", imageAlt: "Campos agrícolas com limites de talhões mapeados e pontos de observação agronómica", mapLabel: "Talhões mapeados", cropLabel: "Plantações ativas", operationLabel: "Operações ligadas" },
  proof: ["Mapas de talhões por KML e KMZ", "Culturas temporárias e permanentes", "Operações e colheitas sem limite", "Caderno construído a partir do trabalho real"],
  flow: { kicker: "Um histórico ligado", title: "Do território ao caderno de campo", description: "Cada registo enriquece o seguinte sem duplicar o mesmo trabalho físico, recursos ou custos.", stages: ["Talhão", "Plantação", "Operação", "Colheita", "Caderno de campo"] },
  platform: { kicker: "Gestão agrícola diária", title: "O trabalho da exploração, no mesmo lugar", description: "Estruture a exploração, registe o que aconteceu e recupere o contexto de que a equipa precisa.", cards: [
    { title: "Mapa e talhões", description: "Desenhe talhões ou importe limites KML/KMZ e mantenha áreas, plantações e observações ligadas ao mapa.", status: "Disponível" },
    { title: "Plantações e campanhas", description: "Gira culturas permanentes e culturas temporárias compatíveis por área, ciclo e campanha.", status: "Disponível" },
    { title: "Operações e pulverizações", description: "Registe trabalhos culturais, produtos fitofarmacêuticos, pessoas, equipamentos e evidência de execução.", status: "Disponível" },
    { title: "Rega e fertirrega", description: "Ligue setores de rega, água, nutrientes e fertirrega realizada sem duplicar a operação.", status: "Disponível" },
    { title: "Fertilização", description: "Registe planos e aplicações realizadas com produtos, nutrientes, doses e aplicadores responsáveis.", status: "Disponível" },
    { title: "Colheitas e lotes", description: "Mantenha quantidades, qualidade, destino e lotes ligados à plantação que os produziu.", status: "Disponível" },
    { title: "Equipas e equipamentos", description: "Associe pessoas, aplicadores válidos, máquinas e recursos a cada operação.", status: "Disponível" },
    { title: "Caderno de campo", description: "Gere um PDF coerente a partir do histórico operacional atual. No Free existe apenas uma demonstração fictícia claramente assinalada.", status: "Disponível" }
  ] },
  weather: { kicker: "Meteorologia agronómica", title: "Meteorologia que fala a linguagem de cada plantação", description: "As estações virtuais transformam dados meteorológicos em indicadores agronómicos ligados a cada plantação e respetivas tags. Os valores são estimativas de apoio à decisão, não medições de sensores.", metrics: ["Evapotranspiração de referência (ET₀)", "Radiação solar", "DLI estimada", "Graus-dia", "Necessidades de frio", "Molhamento foliar estimado", "Indicadores por plantação"], tagsTitle: "Exemplos por tag da plantação", tags: ["Estado fenológico", "Variedade", "Setor de rega", "Monitorização de risco"], status: "Disponível na oferta prevista do GeroFarm" },
  modules: { kicker: "Profundidade adaptável", title: "Acrescente controlo operacional quando precisar", description: "Inventário e Custos são módulos opcionais no Grow e Custom e estão incluídos no Professional.", inventory: "Inventário", inventoryDesc: "Compras, lotes, movimentos e consumos ligados à operação que utilizou cada recurso.", costs: "Custos", costsDesc: "Mão de obra, equipamentos, fatores e outros recursos projetados nos custos da plantação e colheita sem dupla contabilização.", optional: "Módulo opcional" },
  pricing: { kicker: "Planos claros", title: "Comece pequeno. Preserve todo o histórico operacional.", description: "Nenhum plano limita operações, colheitas ou cadernos. Todos os planos pagos admitem integrações futuras, incluindo o GeroGrid quando estiver disponível.", monthly: "Mensal", annual: "Anual", annualNote: "O anual equivale a dez mensalidades", vat: "Preços sem IVA.", recommended: "Mais popular", consult: "Sob consulta", month: "/mês", year: "/ano", choose: "Escolher plano", contact: "Pedir proposta",
    plans: [
      { name: "Free", description: "Um início real de 30 dias para uma organização.", monthly: "0 €", annual: "0 €", features: ["1 utilizador", "10 ha", "5 talhões ativos", "1 estação virtual", "Máximo de 30 dias", "Consulta e exportação após o período", "Demonstração fictícia de PDF sem validade"] },
      { name: "Grow", description: "Para explorações a criar uma rotina digital consistente.", monthly: "24,90 €", annual: "249 €", features: ["3 utilizadores", "100 ha", "50 talhões", "2 estações virtuais", "Inventário e Custos disponíveis como addons", "Integrações futuras permitidas"] },
      { name: "Professional", description: "Para equipas maiores e operações mais complexas.", monthly: "69,90 €", annual: "699 €", features: ["10 utilizadores", "500 ha", "250 talhões", "5 estações virtuais", "Inventário incluído", "Custos incluídos", "Integrações futuras permitidas"] },
      { name: "Custom", description: "Limites, integrações e módulos à medida da organização.", monthly: "Sob consulta", annual: "Sob consulta", features: ["Utilizadores e área à medida", "Talhões e estações à medida", "Inventário e Custos sob proposta", "Módulos à medida", "Integrações futuras e à medida"] }
    ],
    addonsTitle: "Addons no Grow e Custom", addons: ["Inventário · 9,90 €/mês ou 99 €/ano", "Custos · 19,90 €/mês ou 199 €/ano", "Inventário + Custos · 24,90 €/mês ou 249 €/ano", "Estação virtual adicional nos planos pagos · 4,90 €/mês ou 49 €/ano"], paidNote: "Todos os planos pagos preservam o histórico operacional completo e podem usar integrações futuras quando forem disponibilizadas.", grace: "Quando a subscrição termina, a organização tem 7 dias de tolerância com um aviso em cada entrada." },
  faq: { kicker: "Antes de começar", title: "Respostas diretas", items: [
    { q: "O que acontece depois dos 30 dias Free?", a: "A organização passa a consulta e exportação. Os dados ficam preservados; criar ou alterar registos operacionais requer um plano pago." },
    { q: "O PDF do caderno no Free tem validade?", a: "Não. O Free inclui apenas um PDF de demonstração com dados fictícios, claramente identificado como sem validade." },
    { q: "Inventário e Custos estão incluídos?", a: "Ambos estão incluídos no Professional. No Grow e Custom podem ser adicionados separadamente ou em pack, sujeito à proposta Custom." },
    { q: "Posso acrescentar mais estações virtuais?", a: "Sim. Os planos pagos podem acrescentar estações por 4,90 €/mês ou 49 €/ano cada." },
    { q: "Porque é que o anual é mais baixo?", a: "O preço anual equivale a dez mensalidades. Todos os preços apresentados são sem IVA." },
    { q: "O GeroFarm já integra com o GeroGrid?", a: "A fronteira está preparada para integrações futuras, incluindo o GeroGrid. Não é apresentada como integração ativa até ser implementada e disponibilizada." }
  ] },
  closing: { title: "Dê a cada operação um histórico útil", description: "Comece grátis, mapeie a exploração e construa o caderno a partir do trabalho que a sua equipa já realiza.", primary: "Criar conta", secondary: "Entrar" },
  footer: { tagline: "Gestão agrícola clara, do mapa ao caderno de campo.", product: "Produto", account: "Acesso", legal: "Legal", privacy: "Privacidade", terms: "Termos", cookies: "Cookies", future: "As integrações futuras são identificadas como tal e não são vendidas como funcionalidades ativas.", rights: "Todos os direitos reservados." }
};
