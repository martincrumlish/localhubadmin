/**
 * Widget Resource Endpoint
 * Serves pre-built HTML template with external JS bundle references
 *
 * This follows the Pizzaz MCP server pattern:
 * 1. Read pre-built HTML from dist folder (generated during build)
 * 2. Replace ASSET_BASE_URL placeholder with actual asset URL
 * 3. Inject Google Maps API key
 * 4. Return HTML shell (NOT inlined JavaScript)
 *
 * GET /api/localhub/resources/localhub-map
 * Returns: HTML document that references external JavaScript bundle
 */

import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

export const dynamic = "force-dynamic";
export const runtime = "nodejs"; // Need Node runtime for file system access

export async function GET() {
  try {
    // Read pre-built HTML template from dist folder
    const htmlTemplatePath = join(
      process.cwd(),
      "apps",
      "localhub",
      "web",
      "dist",
      "localhub-map.html"
    );

    let htmlTemplate: string;
    try {
      htmlTemplate = await readFile(htmlTemplatePath, "utf8");
    } catch (err) {
      console.error("Failed to read widget HTML template:", err);
      return new NextResponse(
        `Widget template not found. Please run: npm run build:widget`,
        { status: 500 }
      );
    }

    // Determine the base URL for assets
    // In production this will be the ngrok/deployed URL
    // In development this is localhost
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || "http://localhost:3000";
    const assetBaseUrl = `${baseUrl}/api/assets`;

    // Replace ASSET_BASE_URL placeholder with actual asset URL
    // Replace ASSET_BASE_URL_ROOT with base URL for logo and other assets
    let html = htmlTemplate
      .replace(/ASSET_BASE_URL_ROOT/g, baseUrl)
      .replace(/ASSET_BASE_URL/g, assetBaseUrl);

    // Inject Google Maps API key into the HTML
    const apiKey = process.env.GOOGLE_MAPS_PUBLIC_KEY || "";
    const apiKeyScript = `
  <script>
    window.GOOGLE_MAPS_PUBLIC_KEY = "${apiKey}";
  </script>`;

    // Insert API key script before closing </head> tag
    html = html.replace("</head>", `${apiKeyScript}\n</head>`);

    return new NextResponse(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "access-control-allow-origin": "*",
      }
    });
  } catch (error) {
    console.error("Widget resource error:", error);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}
