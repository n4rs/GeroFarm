import { useEffect, useState } from "react";
import type { FieldDto } from "@shared/fields";
import IrrigationPanel from "./IrrigationPanel";

export default function IrrigationModule() {
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
  if (loading) return <div className="module-state" aria-busy="true"><span className="spinner" /></div>;
  if (failed) return <div className="module-state error-state" role="alert"><p>Não foi possível carregar os talhões para a rega.</p></div>;
  return <IrrigationPanel fields={fields} onPhysicalOperationChanged={async () => {}} />;
}
