import { useEffect, useState } from "react";
import type { FarmHoldingDto } from "@shared/farm-holdings";
import { Alert, Button, Card, PageHeader } from "../design-system";
import type { SupportedLocale } from "../home-copy";
import { AsyncState } from "../patterns";
import type { ModuleId } from "../routing/route-manifest";
import { dashboardCopies } from "./dashboard-locales";
import type { WorkspaceCopy } from "./workspace-locales";
import { formatWorkspaceMessage } from "./workspace-locales";
import { farmHoldingCopies } from "./farm/farm-holding-locales";
import "./overview-dashboard.css";

type OverviewDashboardProps = {
  name: string;
  organization: string;
  common: WorkspaceCopy;
  locale: SupportedLocale;
  navigationLabels: Record<ModuleId, string>;
  actionDescriptions: Partial<Record<ModuleId, string>>;
  canRegister: boolean;
  onNavigate: (module: ModuleId) => void;
  onRegister: () => void;
};

export default function OverviewDashboard({ name, organization, common, locale, navigationLabels, actionDescriptions, canRegister, onNavigate, onRegister }: OverviewDashboardProps) {
  const [holdingState, setHoldingState] = useState<"loading" | "missing" | "ready" | "error">("loading");
  useEffect(() => { let active = true; void fetch("/api/farm/holdings", { credentials: "include" }).then(async response => { if (!response.ok) throw new Error(); const holdings = ((await response.json()) as { data: FarmHoldingDto[] }).data; if (active) setHoldingState(holdings.length ? "ready" : "missing"); }).catch(() => { if (active) setHoldingState("error"); }); return () => { active = false; }; }, []);
  const t = dashboardCopies[locale], holdingCopy = farmHoldingCopies[locale];
  const actions: Array<{ id: ModuleId; description: string }> = [
    { id: "farm", description: actionDescriptions.farm ?? holdingCopy.description },
    { id: "operations", description: actionDescriptions.operations ?? common.registerOperation },
    { id: "monitoring", description: actionDescriptions.monitoring ?? navigationLabels.monitoring },
    { id: "notebook", description: actionDescriptions.notebook ?? navigationLabels.notebook },
  ];
  return <div className="gero-overview">
    <PageHeader eyebrow={common.workspace} title={formatWorkspaceMessage(common.greeting, { name })} description={formatWorkspaceMessage(common.ready, { organization })} actions={<Button disabled={!canRegister} onClick={onRegister}>＋ {common.registerOperation}</Button>} />
    <section aria-labelledby="overview-attention"><h2 id="overview-attention">{t.attention}</h2>
      {holdingState === "loading" ? <AsyncState state="loading" label={common.workspace} className="gero-overview__skeleton" /> : holdingState === "ready" ? <Alert tone="success"><strong>{t.readyTitle}</strong><span>{t.readyDescription}</span></Alert> : holdingState === "missing" ? <AsyncState state="empty" title={t.missingTitle} description={holdingCopy.empty} action={<Button variant="secondary" onClick={() => onNavigate("farm")}>{holdingCopy.add}</Button>} /> : <AsyncState state="error" title={t.errorTitle} description={holdingCopy.loadError} action={<Button variant="secondary" onClick={() => onNavigate("farm")}>{holdingCopy.edit}</Button>} />}
    </section>
    <section aria-labelledby="overview-actions"><h2 id="overview-actions">{t.actionsTitle}</h2><div className="gero-overview__actions">{actions.map((action) => <Card key={action.id}><h3>{navigationLabels[action.id]}</h3><p>{action.description}</p><Button variant="secondary" onClick={() => onNavigate(action.id)}>{navigationLabels[action.id]}</Button></Card>)}</div></section>
    <section aria-labelledby="overview-context"><h2 id="overview-context">{t.contextTitle}</h2><dl className="gero-overview__context"><div><dt>{common.account}</dt><dd>{common.authenticated}</dd></div><div><dt>{common.organization}</dt><dd>{organization}</dd></div><div><dt>{common.access}</dt><dd>{common.authorized}</dd></div></dl></section>
  </div>;
}
