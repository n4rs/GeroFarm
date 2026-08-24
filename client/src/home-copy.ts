export const supportedLocales = ["pt-PT", "pt-BR", "en", "fr", "es", "nl", "de", "ja", "he", "tr", "ar", "pl", "hr", "el", "sv", "no", "da", "it", "uk", "ro", "fi", "bg", "hu", "is", "sk", "lt", "sl", "lv"] as const;
export type SupportedLocale = typeof supportedLocales[number];

export type HomepageCopy = {
  metaTitle: string; metaDescription: string;
  nav: { platform: string; weather: string; privacy: string; plans: string; faq: string; login: string; start: string; language: string; menu: string };
  hero: { eyebrow: string; title: string; accent: string; description: string; primary: string; secondary: string; note: string; imageAlt: string; mapLabel: string; cropLabel: string; operationLabel: string };
  proof: string[];
  flow: { kicker: string; title: string; description: string; stages: string[] };
  platform: { kicker: string; title: string; description: string; cards: Array<{ title: string; description: string; status: string }> };
  weather: { kicker: string; title: string; description: string; metrics: string[]; status: string };
  modules: { kicker: string; title: string; description: string; inventory: string; inventoryDesc: string; costs: string; costsDesc: string; optional: string };
  privacy: { badge: string; kicker: string; title: string; description: string; items: string[] };
  pricing: {
    kicker: string; title: string; description: string; monthly: string; annual: string; annualNote: string; vat: string; recommended: string; consult: string; month: string; year: string; choose: string; contact: string;
    plans: Array<{ name: string; description: string; monthly: string; annual: string; features: string[] }>;
    addonsTitle: string; addons: string[]; paidNote: string;
  };
  faq: { kicker: string; title: string; items: Array<{ q: string; a: string }> };
  closing: { title: string; description: string; primary: string; secondary: string };
  footer: { tagline: string; product: string; account: string; legal: string; privacy: string; terms: string; cookies: string; future: string; rights: string };
};

export const en: HomepageCopy = {
  metaTitle: "Field management software for modern farming | GeroFarm",
  metaDescription: "Map fields, connect crops, operations, harvests and agronomic weather, and keep a clear field record with GeroFarm.",
  nav: { platform: "Platform", weather: "Agronomic weather", privacy: "Privacy by Design", plans: "Plans", faq: "FAQ", login: "Sign in", start: "Get started", language: "Language", menu: "Open menu" },
  hero: { eyebrow: "Complete field management", title: "Run every crop,", accent: "from the map to the harvest.", description: "Map parcels, manage crops and record operations, irrigation, fertilisation, harvests, lots, teams and equipment in one application.", primary: "Start with GeroFarm", secondary: "View plans", note: "30-day free trial · No credit card required", imageAlt: "Agricultural fields with mapped parcel boundaries and agronomic observation points", mapLabel: "Mapped parcels", cropLabel: "Active crops", operationLabel: "Recorded operations" },
  proof: ["Map and KML/KMZ", "Complete agricultural operations", "Weather indicators by crop", "Field record and traceability"],
  flow: { kicker: "One connected history", title: "From the land to the field record", description: "Each record enriches the next without duplicating the same physical work, resources or costs.", stages: ["Field", "Crop", "Operation", "Harvest", "Field record"] },
  platform: { kicker: "Daily farm management", title: "One application for the complete field cycle", description: "Plan, carry out and review the work with parcels, crops, resources and results in the same operational history.", cards: [
    { title: "Maps and parcels", description: "Draw fields or import KML/KMZ boundaries and keep areas, crops and observations connected to the map.", status: "Available" },
    { title: "Crops and campaigns", description: "Manage permanent crops and compatible temporary crops by area, cycle and campaign.", status: "Available" },
    { title: "Operations and spraying", description: "Record cultural work, plant protection products, people, equipment and execution evidence.", status: "Available" },
    { title: "Irrigation and fertigation", description: "Connect irrigation sectors, water, nutrients and executed fertigation without duplicating the operation.", status: "Available" },
    { title: "Fertilisation", description: "Record plans and completed applications with products, nutrients, doses and responsible applicators.", status: "Available" },
    { title: "Harvests and lots", description: "Keep quantities, quality, destination and lots connected to the crop that produced them.", status: "Available" },
    { title: "Teams and equipment", description: "Associate people, valid applicators, machinery and resources with each operation.", status: "Available" },
    { title: "Field record", description: "Produce coherent field records from recorded operations, resources, applications and harvests, ready to consult and export.", status: "Available" }
  ] },
  weather: { kicker: "Agronomic weather", title: "Agronomic indicators for every crop", description: "Virtual stations calculate reference evapotranspiration, solar radiation, estimated DLI, growing degree days, chill requirements and estimated leaf wetness to support planning and monitoring. Values are estimates, not sensor measurements.", metrics: ["Reference evapotranspiration (ET₀)", "Solar radiation", "Estimated daily light integral (DLI)", "Growing degree days", "Chill requirements", "Estimated leaf wetness", "Indicators by crop"], status: "Included in every plan, within its virtual-station limit" },
  modules: { kicker: "Adaptable depth", title: "Add operational control when you need it", description: "Inventory and Costs are optional modules on Grow and Custom, and included with Professional.", inventory: "Inventory", inventoryDesc: "Purchases, batches, movements and consumption connected to the operation that used each resource.", costs: "Costs", costsDesc: "Labour, equipment, inputs and other resources projected into crop and harvest costs without double counting.", optional: "Optional module" },
  privacy: { badge: "Included with every paid plan", kicker: "Privacy by Design", title: "GDPR-ready data protection, built into daily work", description: "Give organizations practical controls that support GDPR compliance while preserving the legal and operational traceability that professional production requires.", items: ["Personal-data access by role", "Organization privacy manager", "Pseudonymized reports where names are unnecessary", "Personal privacy area and GDPR requests", "Configurable retention policies", "Audit trail for access and changes", "Mandatory legal identification preserved"] },
  pricing: { kicker: "Clear plans", title: "Start small. Keep the whole operational history.", description: "Choose the scale and agronomic-weather depth your farm needs. No plan limits operations, harvests or field records.", monthly: "Monthly", annual: "Annual", annualNote: "Annual billing equals ten monthly payments", vat: "Prices exclude VAT.", recommended: "Most popular", consult: "On request", month: "/month", year: "/year", choose: "Choose plan", contact: "Request a proposal",
    plans: [
      { name: "Start", description: "For small farms that want a complete, affordable digital routine.", monthly: "€7.90", annual: "€79", features: ["30-day free trial", "1 user", "15 ha", "5 active fields", "5 active crops", "1 virtual station", "Essential agronomic indicators", "Field record export after subscription", "Privacy by Design included"] },
      { name: "Grow", description: "For farms building a consistent digital routine.", monthly: "€24.90", annual: "€249", features: ["3 users", "100 ha", "50 fields", "2 virtual stations", "Complete weather dashboard, history and within-campaign comparison", "Privacy by Design included", "Inventory and Costs available as add-ons"] },
      { name: "Professional", description: "For larger teams and more complex operations.", monthly: "€69.90", annual: "€699", features: ["10 users", "500 ha", "250 fields", "5 virtual stations", "Weather comparisons across campaigns and stations, multi-year charts, export and reports", "Privacy by Design included", "Inventory included", "Costs included"] },
      { name: "Custom", description: "Limits, integrations and modules tailored to the organisation.", monthly: "On request", annual: "On request", features: ["Custom users and area", "Custom fields and stations", "Configurable weather, physical stations, API and custom models", "Privacy by Design included", "Inventory and Costs", "Invoicing ERP connection", "Tailored modules"] }
    ],
    addonsTitle: "Add-ons for Grow and Custom", addons: ["Inventory · €9.90/month or €99/year", "Costs · €19.90/month or €199/year", "Inventory + Costs · €24.90/month or €249/year", "Additional virtual station on paid plans · €4.90/month or €49/year"], paidNote: "All paid plans include Privacy by Design and field-record export, while keeping the complete operational history." },
  faq: { kicker: "Before you start", title: "Straight answers", items: [
    { q: "What does the 30-day Start trial include?", a: "You can enter real data and use the essential agronomic indicators. During the trial, the field record is a mockup and the real field record cannot be exported. Subscribing to Start or a higher plan preserves the data and unlocks export." },
    { q: "Is Privacy by Design included?", a: "Yes. The Privacy by Design and GDPR-support module is included with every paid plan." },
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
  nav: { platform: "Plataforma", weather: "Meteorologia agronómica", privacy: "Privacy by Design", plans: "Planos", faq: "Perguntas", login: "Entrar", start: "Começar", language: "Idioma", menu: "Abrir menu" },
  hero: { eyebrow: "Gestão completa no campo", title: "Gira cada plantação,", accent: "do mapa à colheita.", description: "Mapeie talhões, acompanhe plantações e registe operações, rega, fertilização, colheitas, lotes, equipas e equipamentos numa única aplicação.", primary: "Começar com o GeroFarm", secondary: "Ver planos", note: "30 dias gratuitos · Sem cartão de crédito", imageAlt: "Campos agrícolas com limites de talhões mapeados e pontos de observação agronómica", mapLabel: "Talhões mapeados", cropLabel: "Plantações ativas", operationLabel: "Operações registadas" },
  proof: ["Mapa e KML/KMZ", "Operações agrícolas completas", "Meteorologia por plantação", "Caderno e rastreabilidade"],
  flow: { kicker: "Um histórico ligado", title: "Do território ao caderno de campo", description: "Cada registo enriquece o seguinte sem duplicar o mesmo trabalho físico, recursos ou custos.", stages: ["Talhão", "Plantação", "Operação", "Colheita", "Caderno de campo"] },
  platform: { kicker: "Gestão agrícola diária", title: "Uma aplicação para todo o ciclo no campo", description: "Planeie, execute e reveja o trabalho com talhões, plantações, recursos e resultados no mesmo histórico operacional.", cards: [
    { title: "Mapa e talhões", description: "Desenhe talhões ou importe limites KML/KMZ e mantenha áreas, plantações e observações ligadas ao mapa.", status: "Disponível" },
    { title: "Plantações e campanhas", description: "Gira culturas permanentes e culturas temporárias compatíveis por área, ciclo e campanha.", status: "Disponível" },
    { title: "Operações e pulverizações", description: "Registe trabalhos culturais, produtos fitofarmacêuticos, pessoas, equipamentos e evidência de execução.", status: "Disponível" },
    { title: "Rega e fertirrega", description: "Ligue setores de rega, água, nutrientes e fertirrega realizada sem duplicar a operação.", status: "Disponível" },
    { title: "Fertilização", description: "Registe planos e aplicações realizadas com produtos, nutrientes, doses e aplicadores responsáveis.", status: "Disponível" },
    { title: "Colheitas e lotes", description: "Mantenha quantidades, qualidade, destino e lotes ligados à plantação que os produziu.", status: "Disponível" },
    { title: "Equipas e equipamentos", description: "Associe pessoas, aplicadores válidos, máquinas e recursos a cada operação.", status: "Disponível" },
    { title: "Caderno de campo", description: "Produza cadernos coerentes a partir das operações, recursos, aplicações e colheitas registadas, prontos a consultar e exportar.", status: "Disponível" }
  ] },
  weather: { kicker: "Meteorologia agronómica", title: "Indicadores agronómicos para cada plantação", description: "As estações virtuais calculam evapotranspiração de referência, radiação solar, DLI estimada, graus-dia, necessidades de frio e molhamento foliar estimado para apoiar o planeamento e a monitorização. Os valores são estimativas, não medições de sensores.", metrics: ["Evapotranspiração de referência (ET₀)", "Radiação solar", "DLI estimada", "Graus-dia", "Necessidades de frio", "Molhamento foliar estimado", "Indicadores por plantação"], status: "Incluída em todos os planos, dentro do limite de estações virtuais" },
  modules: { kicker: "Profundidade adaptável", title: "Acrescente controlo operacional quando precisar", description: "Inventário e Custos são módulos opcionais no Grow e Custom e estão incluídos no Professional.", inventory: "Inventário", inventoryDesc: "Compras, lotes, movimentos e consumos ligados à operação que utilizou cada recurso.", costs: "Custos", costsDesc: "Mão de obra, equipamentos, fatores e outros recursos projetados nos custos da plantação e colheita sem dupla contabilização.", optional: "Módulo opcional" },
  privacy: { badge: "Incluído em todos os planos pagos", kicker: "Privacy by Design", title: "Proteção de dados preparada para o RGPD/GDPR e integrada no trabalho diário", description: "Dê às organizações controlos práticos que apoiam a conformidade com o RGPD/GDPR, preservando a rastreabilidade legal e operacional exigida pela produção profissional.", items: ["Acesso a dados pessoais por função", "Gestor de proteção de dados da organização", "Relatórios pseudonimizados quando o nome é desnecessário", "Área pessoal de privacidade e pedidos RGPD", "Políticas de retenção configuráveis", "Auditoria de acessos e alterações", "Identificação legal obrigatória preservada"] },
  pricing: { kicker: "Planos claros", title: "Comece pequeno. Preserve todo o histórico operacional.", description: "Escolha a escala e a profundidade de meteorologia agronómica de que a exploração precisa. Nenhum plano limita operações, colheitas ou cadernos.", monthly: "Mensal", annual: "Anual", annualNote: "O anual equivale a dez mensalidades", vat: "Preços sem IVA.", recommended: "Mais popular", consult: "Sob consulta", month: "/mês", year: "/ano", choose: "Escolher plano", contact: "Pedir proposta",
    plans: [
      { name: "Start", description: "Para pequenas explorações que procuram uma rotina digital completa e económica.", monthly: "7,90 €", annual: "79 €", features: ["30 dias gratuitos", "1 utilizador", "15 ha", "5 talhões ativos", "5 plantações ativas", "1 estação virtual", "Indicadores agronómicos essenciais", "Exportação do caderno após subscrição", "Privacy by Design incluído"] },
      { name: "Grow", description: "Para explorações a criar uma rotina digital consistente.", monthly: "24,90 €", annual: "249 €", features: ["3 utilizadores", "100 ha", "50 talhões", "2 estações virtuais", "Dashboard meteorológico completo, histórico e comparação dentro da campanha", "Privacy by Design incluído", "Inventário e Custos disponíveis como addons"] },
      { name: "Professional", description: "Para equipas maiores e operações mais complexas.", monthly: "69,90 €", annual: "699 €", features: ["10 utilizadores", "500 ha", "250 talhões", "5 estações virtuais", "Comparação meteorológica entre campanhas e estações, gráficos plurianuais, exportação e relatórios", "Privacy by Design incluído", "Inventário incluído", "Custos incluídos"] },
      { name: "Custom", description: "Limites, integrações e módulos à medida da organização.", monthly: "Sob consulta", annual: "Sob consulta", features: ["Utilizadores e área à medida", "Talhões e estações à medida", "Meteorologia configurável, estações físicas, API e modelos personalizados", "Privacy by Design incluído", "Inventário e Custos", "Ligação a ERP de faturação", "Módulos à medida"] }
    ],
    addonsTitle: "Addons no Grow e Custom", addons: ["Inventário · 9,90 €/mês ou 99 €/ano", "Custos · 19,90 €/mês ou 199 €/ano", "Inventário + Custos · 24,90 €/mês ou 249 €/ano", "Estação virtual adicional nos planos pagos · 4,90 €/mês ou 49 €/ano"], paidNote: "Todos os planos pagos incluem Privacy by Design e exportação do caderno, preservando o histórico operacional completo." },
  faq: { kicker: "Antes de começar", title: "Respostas diretas", items: [
    { q: "O que inclui o período experimental de 30 dias do Start?", a: "Pode introduzir dados reais e usar os indicadores agronómicos essenciais. Durante o período experimental, o caderno de campo é um mockup e o caderno real não pode ser exportado. Ao subscrever o Start ou um plano superior, os dados são preservados e a exportação fica disponível." },
    { q: "O Privacy by Design está incluído?", a: "Sim. O módulo Privacy by Design e de apoio ao RGPD/GDPR está incluído em todos os planos pagos." },
    { q: "Inventário e Custos estão incluídos?", a: "Ambos estão incluídos no Professional. No Grow e Custom podem ser adicionados separadamente ou em pack, sujeito à proposta Custom." },
    { q: "Posso acrescentar mais estações virtuais?", a: "Sim. Os planos pagos podem acrescentar estações por 4,90 €/mês ou 49 €/ano cada." },
    { q: "Porque é que o anual é mais baixo?", a: "O preço anual equivale a dez mensalidades. Todos os preços apresentados são sem IVA." },
    { q: "O GeroFarm já integra com o GeroGrid?", a: "A fronteira está preparada para integrações futuras, incluindo o GeroGrid. Não é apresentada como integração ativa até ser implementada e disponibilizada." }
  ] },
  closing: { title: "Dê a cada operação um histórico útil", description: "Comece grátis, mapeie a exploração e construa o caderno a partir do trabalho que a sua equipa já realiza.", primary: "Criar conta", secondary: "Entrar" },
  footer: { tagline: "Gestão agrícola clara, do mapa ao caderno de campo.", product: "Produto", account: "Acesso", legal: "Legal", privacy: "Privacidade", terms: "Termos", cookies: "Cookies", future: "As integrações futuras são identificadas como tal e não são vendidas como funcionalidades ativas.", rights: "Todos os direitos reservados." }
};
