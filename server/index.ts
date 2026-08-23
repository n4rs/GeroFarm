import "./load-env";
import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { createDatabase } from "./database";

const app = createApp();
const server = createServer(app);
const persistence = process.env.DATABASE_URL ? createDatabase() : null;

if (process.env.NODE_ENV === "production") {
  const publicDirectory = fileURLToPath(new URL("./public", import.meta.url));
  app.use(express.static(publicDirectory, { maxAge: "1h", index: false }));
  app.get("*splat", (_req, res) => res.sendFile("index.html", { root: publicDirectory }));
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "spa" });
  app.use(vite.middlewares);
}

const port = Number.parseInt(process.env.PORT ?? "5000", 10);
const host = process.env.HOST || (process.env.NODE_ENV === "production" ? "0.0.0.0" : "127.0.0.1");
server.listen(port, host, () => console.log(`GeroFarm listening on http://${host}:${port}`));

let shuttingDown = false;
async function shutdown(signal: string): Promise<void> {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`GeroFarm received ${signal}; shutting down`);
  server.close(async (error) => {
    try {
      await persistence?.pool.end();
    } finally {
      process.exitCode = error ? 1 : 0;
      if (error) console.error("GeroFarm HTTP shutdown failed", error);
    }
  });
}

process.once("SIGTERM", () => void shutdown("SIGTERM"));
process.once("SIGINT", () => void shutdown("SIGINT"));
