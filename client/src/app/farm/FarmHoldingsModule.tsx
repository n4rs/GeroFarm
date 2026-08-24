import { useEffect, useState, type FormEvent } from "react";
import type { FarmHoldingDto } from "@shared/farm-holdings";
import { normalizeFarmHoldingCode } from "@shared/farm-holdings";
import { useI18n } from "../../i18n";
import { farmHoldingCopies } from "./farm-holding-locales";
import "./farm-holdings.css";

const defaultTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone || "Europe/Lisbon";

export default function FarmHoldingsModule() {
  const { locale } = useI18n(); const t = farmHoldingCopies[locale];
  const [holdings, setHoldings] = useState<FarmHoldingDto[]>([]); const [loading, setLoading] = useState(true); const [loadFailed, setLoadFailed] = useState(false); const [editing, setEditing] = useState<FarmHoldingDto | null | undefined>();
  async function load() { setLoading(true); setLoadFailed(false); try { const response = await fetch("/api/farm/holdings", { credentials: "include" }); if (!response.ok) throw new Error(); const body = await response.json() as { data: FarmHoldingDto[] }; setHoldings(body.data); } catch { setLoadFailed(true); } finally { setLoading(false); } }
  useEffect(() => { void load(); }, []);
  return <>
    <section className="page-heading"><div><p>{t.kicker}</p><h1>{t.title}</h1><span>{t.description}</span></div><button className="primary-action" onClick={() => setEditing(null)}>＋ {t.add}</button></section>
    <section className="panel holdings-panel">{loading ? <div className="module-state"><span className="spinner" /></div> : loadFailed ? <div className="module-state error-state"><p>{t.loadError}</p><button onClick={() => void load()}>{t.edit}</button></div> : holdings.length === 0 ? <div className="module-state"><p>{t.empty}</p><button className="primary-action" onClick={() => setEditing(null)}>＋ {t.add}</button></div> : <div className="holdings-table"><div className="holdings-head"><span>{t.name}</span><span>{t.code}</span><span>{t.timezone}</span><span>{t.status}</span><span /></div>{holdings.map((holding) => <div className="holding-row" key={holding.id}><span><b>{holding.name}</b></span><code>{holding.code}</code><span>{holding.timezone}</span><em className={holding.status}>{holding.status === "active" ? t.active : t.inactive}</em><button onClick={() => setEditing(holding)}>{t.edit}</button></div>)}</div>}</section>
    {editing !== undefined && <HoldingDialog holding={editing} copy={t} onClose={() => setEditing(undefined)} onSaved={async () => { setEditing(undefined); await load(); }} />}
  </>;
}

function HoldingDialog({ holding, copy: t, onClose, onSaved }: { holding: FarmHoldingDto | null; copy: (typeof farmHoldingCopies)[keyof typeof farmHoldingCopies]; onClose: () => void; onSaved: () => Promise<void> }) {
  const [name, setName] = useState(holding?.name || ""); const [code, setCode] = useState(holding?.code || ""); const [timezone, setTimezone] = useState(holding?.timezone || defaultTimezone); const [status, setStatus] = useState(holding?.status || "active"); const [saving, setSaving] = useState(false); const [saveFailed, setSaveFailed] = useState(false);
  async function submit(event: FormEvent) { event.preventDefault(); setSaving(true); setSaveFailed(false); try { const response = await fetch(holding ? `/api/farm/holdings/${holding.id}` : "/api/farm/holdings", { method: holding ? "PATCH" : "POST", credentials: "include", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, code, timezone, ...(holding ? { status } : {}) }) }); if (!response.ok) throw new Error(); await onSaved(); } catch { setSaveFailed(true); setSaving(false); } }
  return <div className="modal-backdrop" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form className="holding-dialog" onSubmit={(event) => void submit(event)}><header><div><p>{t.kicker}</p><h2>{holding ? t.edit : t.add}</h2></div><button type="button" onClick={onClose} aria-label={t.cancel}>×</button></header><label><span>{t.name}</span><input required minLength={2} maxLength={160} value={name} onChange={(event) => setName(event.target.value)} /></label><label><span>{t.code}</span><input required minLength={2} maxLength={12} value={code} onChange={(event) => setCode(normalizeFarmHoldingCode(event.target.value))} /><small>{t.codeHint}</small></label><label><span>{t.timezone}</span><input required maxLength={64} value={timezone} onChange={(event) => setTimezone(event.target.value)} /></label>{holding && <label><span>{t.status}</span><select value={status} onChange={(event) => setStatus(event.target.value as FarmHoldingDto["status"])}><option value="active">{t.active}</option><option value="inactive">{t.inactive}</option></select></label>}{saveFailed && <p className="form-error">{t.saveError}</p>}<footer><button type="button" className="subtle-button" onClick={onClose}>{t.cancel}</button><button className="primary-action" disabled={saving}>{t.save}</button></footer></form></div>;
}
