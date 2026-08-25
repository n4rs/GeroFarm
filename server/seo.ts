import { homepageCopies } from "../client/src/home-locales.generated";
import {
  isPublicSeoHomepage,
  localizedSeoPath,
  rtlSeoLocales,
  seoLocaleFromPath,
  seoLocaleFromValue,
  seoLocales,
  type SeoLocale,
} from "@shared/seo";

const publicOrigin = "https://farm.gero.pt";
const socialImageUrl = `${publicOrigin}/images/gerofarm-field-intelligence-hero.webp`;

const ogLocales: Record<SeoLocale, string> = {
  "pt-PT": "pt_PT", "pt-BR": "pt_BR", en: "en_US", fr: "fr_FR", es: "es_ES", nl: "nl_NL", de: "de_DE",
  ja: "ja_JP", he: "he_IL", tr: "tr_TR", ar: "ar_SA", pl: "pl_PL", hr: "hr_HR", el: "el_GR", sv: "sv_SE",
  no: "no_NO", da: "da_DK", it: "it_IT", uk: "uk_UA", ro: "ro_RO", fi: "fi_FI", bg: "bg_BG", hu: "hu_HU",
  is: "is_IS", sk: "sk_SK", lt: "lt_LT", sl: "sl_SI", lv: "lv_LV",
};

export type HomepageSeo = {
  locale: SeoLocale;
  title: string;
  description: string;
  canonicalUrl: string;
  heading: string;
  features: Array<{ title: string; description: string }>;
  faq: Array<{ question: string; answer: string }>;
};

export function resolveHomepageLocale(pathname: string, queryLocale?: string | null): SeoLocale {
  return seoLocaleFromPath(pathname) || seoLocaleFromValue(queryLocale) || "en";
}

export function pathnameFromOriginalUrl(originalUrl: string): string {
  return new URL(originalUrl, publicOrigin).pathname;
}

export function isKnownSpaPath(pathname: string): boolean {
  return isPublicSeoHomepage(pathname) || ["/login", "/register", "/privacy-policy", "/terms", "/cookie-policy"].includes(pathname)
    || pathname === "/app" || pathname.startsWith("/app/") || pathname === "/mockup" || pathname.startsWith("/mockup/");
}

export function notFoundHtml(): string {
  return '<!doctype html><html lang="en"><head><meta charset="UTF-8"><meta name="robots" content="noindex, nofollow"><title>Not found | GeroFarm</title></head><body><main><h1>Not found</h1><p><a href="/">GeroFarm</a></p></main></body></html>';
}

export function homepageSeo(pathname: string, queryLocale?: string | null): HomepageSeo {
  const locale = resolveHomepageLocale(pathname, queryLocale);
  const copy = homepageCopies[locale];
  const hasExplicitLocale = Boolean(seoLocaleFromPath(pathname) || seoLocaleFromValue(queryLocale));
  return {
    locale,
    title: copy.metaTitle,
    description: copy.metaDescription,
    canonicalUrl: hasExplicitLocale ? `${publicOrigin}${localizedSeoPath(locale)}` : `${publicOrigin}/`,
    heading: `${copy.hero.title} ${copy.hero.accent}`,
    features: copy.platform.cards.map(({ title, description }) => ({ title, description })),
    faq: copy.faq.items.map(({ q, a }) => ({ question: q, answer: a })),
  };
}

function escapeHtml(value: string): string {
  return value.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;").replaceAll('"', "&quot;").replaceAll("'", "&#39;");
}

function safeJson(value: unknown): string {
  return JSON.stringify(value).replaceAll("<", "\\u003c");
}

function alternateLinks(): string {
  return [
    ...seoLocales.map((locale) => `<link rel="alternate" hreflang="${locale}" href="${publicOrigin}${localizedSeoPath(locale)}" />`),
    `<link rel="alternate" hreflang="x-default" href="${publicOrigin}/" />`,
  ].join("\n    ");
}

function structuredData(seo: HomepageSeo): unknown {
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": "https://gero.pt/#organization", name: "Gero", url: "https://gero.pt/" },
      {
        "@type": "SoftwareApplication",
        "@id": `${publicOrigin}/#software`,
        name: "GeroFarm",
        applicationCategory: "BusinessApplication",
        applicationSubCategory: "Farm management software",
        operatingSystem: "Web",
        inLanguage: seo.locale,
        url: seo.canonicalUrl,
        description: seo.description,
        image: socialImageUrl,
        publisher: { "@id": "https://gero.pt/#organization" },
        offers: [
          { "@type": "Offer", name: "Start", price: "7.90", priceCurrency: "EUR" },
          { "@type": "Offer", name: "Grow", price: "24.90", priceCurrency: "EUR" },
          { "@type": "Offer", name: "Professional", price: "69.90", priceCurrency: "EUR" },
        ],
      },
      {
        "@type": "WebSite",
        "@id": `${publicOrigin}/#website`,
        name: "GeroFarm",
        url: `${publicOrigin}/`,
        inLanguage: seoLocales,
        publisher: { "@id": "https://gero.pt/#organization" },
      },
      {
        "@type": "FAQPage",
        "@id": `${seo.canonicalUrl}#faq`,
        inLanguage: seo.locale,
        mainEntity: seo.faq.map(({ question, answer }) => ({
          "@type": "Question",
          name: question,
          acceptedAnswer: { "@type": "Answer", text: answer },
        })),
      },
    ],
  };
}

function seoHead(seo: HomepageSeo): string {
  const alternateOgLocales = seoLocales.filter((locale) => locale !== seo.locale)
    .map((locale) => `<meta property="og:locale:alternate" content="${ogLocales[locale]}" />`).join("\n    ");
  return `<title>${escapeHtml(seo.title)}</title>
    <meta name="description" content="${escapeHtml(seo.description)}" />
    <meta name="robots" content="index, follow, max-image-preview:large" />
    <link rel="canonical" href="${seo.canonicalUrl}" />
    ${alternateLinks()}
    <meta property="og:type" content="website" />
    <meta property="og:site_name" content="GeroFarm" />
    <meta property="og:locale" content="${ogLocales[seo.locale]}" />
    ${alternateOgLocales}
    <meta property="og:title" content="${escapeHtml(seo.title)}" />
    <meta property="og:description" content="${escapeHtml(seo.description)}" />
    <meta property="og:url" content="${seo.canonicalUrl}" />
    <meta property="og:image" content="${socialImageUrl}" />
    <meta property="og:image:width" content="1536" />
    <meta property="og:image:height" content="1024" />
    <meta property="og:image:alt" content="GeroFarm" />
    <meta name="twitter:card" content="summary_large_image" />
    <meta name="twitter:title" content="${escapeHtml(seo.title)}" />
    <meta name="twitter:description" content="${escapeHtml(seo.description)}" />
    <meta name="twitter:image" content="${socialImageUrl}" />
    <script id="seo-structured-data" type="application/ld+json">${safeJson(structuredData(seo))}</script>
    <style id="seo-initial-style">.seo-initial{max-width:72rem;margin:0 auto;padding:4rem 1.5rem;font-family:system-ui,sans-serif;color:#143f32}.seo-initial h1{max-width:55rem;font-size:clamp(2.25rem,6vw,4.5rem);line-height:1.05}.seo-initial>p{max-width:50rem;font-size:1.2rem;line-height:1.7}.seo-initial ul{display:grid;grid-template-columns:repeat(auto-fit,minmax(15rem,1fr));gap:1rem;padding:0;list-style:none}.seo-initial li{padding:1rem;border:1px solid #c4d2c0;border-radius:.75rem}.seo-initial details{margin:.75rem 0}</style>`;
}

function initialContent(seo: HomepageSeo): string {
  const copy = homepageCopies[seo.locale];
  return `<div id="root"><main class="seo-initial">
    <p>${escapeHtml(copy.hero.eyebrow)}</p>
    <h1>${escapeHtml(seo.heading)}</h1>
    <p>${escapeHtml(copy.hero.description)}</p>
    <section aria-labelledby="seo-features"><h2 id="seo-features">${escapeHtml(copy.platform.title)}</h2><ul>${seo.features.map(({ title, description }) => `<li><strong>${escapeHtml(title)}</strong><br />${escapeHtml(description)}</li>`).join("")}</ul></section>
    <section aria-labelledby="seo-faq"><h2 id="seo-faq">${escapeHtml(copy.faq.title)}</h2>${seo.faq.map(({ question, answer }) => `<details><summary>${escapeHtml(question)}</summary><p>${escapeHtml(answer)}</p></details>`).join("")}</section>
    <p><a href="/register">${escapeHtml(copy.hero.primary)}</a></p>
  </main></div>`;
}

function removeBaseSeo(html: string): string {
  return html
    .replace(/\s*<title>[\s\S]*?<\/title>/i, "")
    .replace(/\s*<meta\s+(?:name|property)="(?:description|robots|og:[^"]+|twitter:[^"]+)"[^>]*>/gi, "")
    .replace(/\s*<link\s+rel="(?:canonical|alternate)"[^>]*>/gi, "")
    .replace(/\s*<script(?:\s+(?:id="(?:seo-structured-data|gerofarm-schema)"|type="application\/ld\+json")){1,2}>[\s\S]*?<\/script>/gi, "")
    .replace(/\s*<style\s+id="seo-initial-style"[\s\S]*?<\/style>/gi, "");
}

export function renderSeoHtml(html: string, pathname: string, queryLocale?: string | null): string {
  if (!isPublicSeoHomepage(pathname)) return html;
  const seo = homepageSeo(pathname, queryLocale);
  const dir = rtlSeoLocales.has(seo.locale) ? "rtl" : "ltr";
  return removeBaseSeo(html)
    .replace(/<html(?:\s[^>]*)?>/i, `<html lang="${seo.locale}" dir="${dir}">`)
    .replace("</head>", `    ${seoHead(seo)}\n  </head>`)
    .replace(/<div id="root"><\/div>/, initialContent(seo));
}

export function sitemapXml(): string {
  const alternates = [
    ...seoLocales.map((locale) => `<xhtml:link rel="alternate" hreflang="${locale}" href="${publicOrigin}${localizedSeoPath(locale)}" />`),
    `<xhtml:link rel="alternate" hreflang="x-default" href="${publicOrigin}/" />`,
  ].join("");
  const urls = [`${publicOrigin}/`, ...seoLocales.map((locale) => `${publicOrigin}${localizedSeoPath(locale)}`)];
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">${urls.map((url) => `<url><loc>${url}</loc>${alternates}</url>`).join("")}</urlset>\n`;
}

export function robotsTxt(): string {
  return `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /app\nDisallow: /login\nDisallow: /register\nDisallow: /mockup\n\nSitemap: ${publicOrigin}/sitemap.xml\n`;
}
