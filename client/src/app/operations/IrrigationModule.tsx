import { useEffect, useState } from "react";
import type { FieldDto } from "@shared/fields";
import IrrigationPanel from "./IrrigationPanel";
import { useI18n } from "../../i18n";
import { irrigationCopies } from "./irrigation-locales";
import { Alert, Skeleton } from "../../design-system";

export default function IrrigationModule() {
  const { locale } = useI18n();
  const t = irrigationCopies[locale];
  const [fields, setFields] = useState<FieldDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setLoading(true); setFailed(false);
    void fetch("/api/farm/fields", { credentials: "include", signal: controller.signal })
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then((payload) => setFields(payload.data))
      .catch((error) => { if (error?.name !== "AbortError") setFailed(true); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, []);
  if (loading) return <div className="module-state" aria-busy="true"><Skeleton label={t.title} /></div>;
  if (failed) return <Alert className="module-state error-state" tone="danger"><p>{t.loadError}</p></Alert>;
  return <IrrigationPanel fields={fields} onPhysicalOperationChanged={async () => {}} />;
}
