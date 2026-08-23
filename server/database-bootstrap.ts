const adminDatabase = "defaultdb";
const adminUser = "doadmin";
const targetDatabase = "gero_farm";
const migratorUser = "gero_farm_migrator";

export type BootstrapConnections = {
  adminUrl: string;
  migratorUrl: string;
};

type ParsedConnection = {
  database: string;
  hostname: string;
  port: string;
  username: string;
};

function parseConnection(value: string, label: string): ParsedConnection {
  let url: URL;
  try {
    url = new URL(value.trim());
  } catch {
    throw new Error(`${label} must be a valid PostgreSQL connection string.`);
  }
  if (url.protocol !== "postgresql:" && url.protocol !== "postgres:") {
    throw new Error(`${label} must use the PostgreSQL protocol.`);
  }
  return {
    database: decodeURIComponent(url.pathname.replace(/^\//, "")),
    hostname: url.hostname,
    port: url.port || "5432",
    username: decodeURIComponent(url.username),
  };
}

export function validateBootstrapConnections({ adminUrl, migratorUrl }: BootstrapConnections): void {
  const admin = parseConnection(adminUrl, "Admin connection");
  const migrator = parseConnection(migratorUrl, "Migrator connection");
  if (admin.database !== adminDatabase || admin.username !== adminUser) {
    throw new Error(`Admin connection must target ${adminDatabase} as ${adminUser}.`);
  }
  if (migrator.database !== targetDatabase || migrator.username !== migratorUser) {
    throw new Error(`Migrator connection must target ${targetDatabase} as ${migratorUser}.`);
  }
  if (admin.hostname !== migrator.hostname || admin.port !== migrator.port) {
    throw new Error("Admin and migrator connections must target the same database cluster.");
  }
}

export const bootstrapTarget = {
  adminDatabase,
  adminUser,
  database: targetDatabase,
  migratorUser,
  runtimeUser: "gero_farm_app",
} as const;
