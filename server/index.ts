import "./load-env";
import express from "express";
import { createServer } from "node:http";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";

const app = createApp();
const server = createServer(app);

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
