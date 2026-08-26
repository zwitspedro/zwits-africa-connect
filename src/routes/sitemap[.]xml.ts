import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { services } from "@/data/services";
import { HARARE_SUBURBS, LIVE_CITIES } from "@/data/locations";
import { SITE_URL } from "@/lib/seo";

const BASE_URL = SITE_URL;

interface SitemapEntry {
  path: string;
  changefreq?: "always" | "hourly" | "daily" | "weekly" | "monthly" | "yearly" | "never";
  priority?: string;
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },

          // Delivery cluster
          { path: "/delivery", changefreq: "weekly", priority: "0.9" },
          { path: "/delivery/harare", changefreq: "weekly", priority: "0.9" },
          ...HARARE_SUBURBS.map((s) => ({
            path: `/delivery/harare/${s.slug}`,
            changefreq: "weekly" as const,
            priority: "0.7",
          })),

          // Services cluster
          { path: "/services", changefreq: "weekly", priority: "0.9" },
          ...services.map((s) => ({
            path: `/services/${s.slug}`,
            changefreq: "weekly" as const,
            priority: "0.8",
          })),
          ...services.flatMap((s) =>
            LIVE_CITIES.map((c) => ({
              path: `/services/${s.slug}/${c.slug}`,
              changefreq: "weekly" as const,
              priority: "0.7",
            })),
          ),

          // Business & partner clusters
          { path: "/business", changefreq: "monthly", priority: "0.9" },
          { path: "/providers", changefreq: "monthly", priority: "0.9" },
          { path: "/drivers", changefreq: "monthly", priority: "0.9" },

          // Company & support
          { path: "/about", changefreq: "monthly", priority: "0.7" },
          { path: "/book", changefreq: "weekly", priority: "0.7" },
          { path: "/pricing", changefreq: "monthly", priority: "0.7" },
          { path: "/careers", changefreq: "weekly", priority: "0.5" },
          { path: "/contact", changefreq: "monthly", priority: "0.6" },
          { path: "/faq", changefreq: "monthly", priority: "0.6" },
          { path: "/privacy", changefreq: "yearly", priority: "0.3" },
          { path: "/terms", changefreq: "yearly", priority: "0.3" },
        ];

        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
