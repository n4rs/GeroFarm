import assert from "node:assert/strict";
import test from "node:test";
import { supportedLocales } from "../client/src/home-copy";
import { localizedSeoPath, seoLocales } from "@shared/seo";
import { homepageSeo, pathnameFromOriginalUrl, renderSeoHtml, robotsTxt, sitemapXml } from "./seo";

const template = `<!doctype html><html lang="pt-PT"><head><title>Fallback</title><meta name="description" content="Fallback" /></head><body><div id="root"></div></body></html>`;

test("every supported locale has complete indexable homepage content", () => {
  assert.equal(seoLocales.length, 28);
  assert.deepEqual([...seoLocales], [...supportedLocales]);
  for (const locale of seoLocales) {
    const seo = homepageSeo(localizedSeoPath(locale));
    assert.equal(seo.locale, locale);
    assert.equal(seo.canonicalUrl, `https://farm.gero.pt${localizedSeoPath(locale)}`);
    assert.ok(seo.title.length >= 20, `${locale} title is too short`);
    assert.ok(seo.description.length >= 40, `${locale} description is too short`);
    assert.equal(seo.features.length, 8);
    assert.equal(seo.faq.length, 6);
    assert.ok(seo.features.every((item) => item.title && item.description));
    assert.ok(seo.faq.every((item) => item.question && item.answer));
  }
});

test("localized HTML contains server-visible metadata, content and reciprocal alternates", () => {
  const html = renderSeoHtml(template, "/pt-pt/");
  assert.match(html, /<html lang="pt-PT" dir="ltr">/);
  assert.match(html, /<h1>Toda a exploração, sob controlo\.<\/h1>/);
  assert.match(html, /rel="canonical" href="https:\/\/farm\.gero\.pt\/pt-pt\/"/);
  assert.equal((html.match(/rel="alternate"/g) || []).length, seoLocales.length + 1);
  assert.equal((html.match(/<title>/g) || []).length, 1);
  const json = html.match(/<script id="seo-structured-data" type="application\/ld\+json">(.+)<\/script>/)?.[1];
  assert.ok(json);
  const data = JSON.parse(json);
  assert.ok(data["@graph"].some((item: { "@type": string }) => item["@type"] === "FAQPage"));
  assert.ok(data["@graph"].some((item: { "@type": string }) => item["@type"] === "SoftwareApplication"));
});

test("Arabic and Hebrew HTML is explicitly RTL", () => {
  assert.match(renderSeoHtml(template, "/ar/"), /<html lang="ar" dir="rtl">/);
  assert.match(renderSeoHtml(template, "/he/"), /<html lang="he" dir="rtl">/);
});

test("sitemap and robots expose only multilingual commercial homepages", () => {
  const sitemap = sitemapXml();
  assert.equal((sitemap.match(/<url>/g) || []).length, seoLocales.length + 1);
  for (const locale of seoLocales) assert.match(sitemap, new RegExp(`https://farm\\.gero\\.pt${localizedSeoPath(locale)}`));
  assert.doesNotMatch(sitemap, /\/app|\/login|\/register|\/api\//);
  assert.match(robotsTxt(), /Sitemap: https:\/\/farm\.gero\.pt\/sitemap\.xml/);
  assert.match(robotsTxt(), /Disallow: \/api\//);
  assert.match(robotsTxt(), /Disallow: \/app/);
});

test("non-commercial routes keep the application shell unchanged", () => {
  assert.equal(renderSeoHtml(template, "/app"), template);
  assert.equal(renderSeoHtml(template, "/privacy-policy"), template);
});

test("the catch-all preserves localized paths and query locales canonicalize to clean URLs", () => {
  assert.equal(pathnameFromOriginalUrl("/fr/?utm_source=test"), "/fr/");
  assert.match(renderSeoHtml(template, "/fr/"), /rel="canonical" href="https:\/\/farm\.gero\.pt\/fr\/"/);
  assert.match(renderSeoHtml(template, "/", "pt-BR"), /rel="canonical" href="https:\/\/farm\.gero\.pt\/pt-br\/"/);
});
