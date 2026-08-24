import "./load-env";
import express from "express";
import { createServer } from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createApp } from "./app";
import { createDatabase } from "./database";
import { pathnameFromOriginalUrl, renderSeoHtml, robotsTxt, sitemapXml } from "./seo";
import { localizedSeoPath, seoLocaleFromPath } from "@shared/seo";

const persistence = process.env.DATABASE_URL ? createDatabase() : null;
const app = createApp({ database: persistence?.db });
const server = createServer(app);

app.get("/robots.txt", (_req, res) => res.type("text/plain").send(robotsTxt()));
app.get("/sitemap.xml", (_req, res) => res.type("application/xml").send(sitemapXml()));

function redirectLocalizedPath(pathname: string, res: express.Response): boolean {
  const locale = seoLocaleFromPath(pathname);
  if (locale && pathname === localizedSeoPath(locale).slice(0, -1)) {
    res.redirect(308, localizedSeoPath(locale));
    return true;
  }
  return false;
}

if (process.env.NODE_ENV === "production") {
  const publicDirectory = fileURLToPath(new URL("./public", import.meta.url));
  const indexTemplate = fs.readFileSync(path.join(publicDirectory, "index.html"), "utf8");
  app.use(express.static(publicDirectory, { maxAge: "1h", index: false }));
  app.get("*splat", (req, res) => {
    const pathname = pathnameFromOriginalUrl(req.originalUrl);
    if (redirectLocalizedPath(pathname, res)) return;
    const queryLocale = typeof req.query.lang === "string" ? req.query.lang : null;
    res.set("cache-control", "no-cache").type("html").send(renderSeoHtml(indexTemplate, pathname, queryLocale));
  });
} else {
  const { createServer: createViteServer } = await import("vite");
  const vite = await createViteServer({ server: { middlewareMode: true }, appType: "custom" });
  app.use(vite.middlewares);
  app.get("*splat", async (req, res, next) => {
    try {
      const pathname = pathnameFromOriginalUrl(req.originalUrl);
      if (redirectLocalizedPath(pathname, res)) return;
      const clientTemplate = fileURLToPath(new URL("../client/index.html", import.meta.url));
      const template = await fs.promises.readFile(clientTemplate, "utf8");
      const transformed = await vite.transformIndexHtml(req.originalUrl, template);
      const queryLocale = typeof req.query.lang === "string" ? req.query.lang : null;
      res.status(200).type("html").send(renderSeoHtml(transformed, pathname, queryLocale));
    } catch (error) {
      vite.ssrFixStacktrace(error as Error);
      next(error);
    }
  });
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
