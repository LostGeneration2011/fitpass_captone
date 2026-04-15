// src/config/database-config.ts

export function getDatabaseUrl() {
  return process.env.DATABASE_URL || "";
}

export function getDatabaseProvider(): "sqlite" | "postgresql" {
  // Nếu URL chứa 'file:' → local SQLite
  if (process.env.DATABASE_URL?.startsWith("file:")) return "sqlite";
  return "postgresql";
}

export function getConnectionInfo() {
  const url = getDatabaseUrl();
  const isLocal = url.startsWith("file:");

  return {
    environment: isLocal ? "local" : "cloud",
    provider: getDatabaseProvider(),
    url,
    isLocal
  };
}
