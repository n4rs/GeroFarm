import { useEffect, useState } from "react";
import type { FieldDto } from "@shared/fields";
import IrrigationPanel from "./IrrigationPanel";

export default function IrrigationModule() {
  const [fields, setFields] = useState<FieldDto[]>([]);
  useEffect(() => { void fetch("/api/farm/fields", { credentials: "include" }).then((response) => response.ok ? response.json() : Promise.reject()).then((payload) => setFields(payload.data)).catch(() => setFields([])); }, []);
  return <IrrigationPanel fields={fields} onPhysicalOperationChanged={async () => {}} />;
}
