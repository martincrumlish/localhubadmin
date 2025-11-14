import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create dist directory if it doesn't exist
const distDir = path.join(__dirname, "dist");
if (!fs.existsSync(distDir)) {
  fs.mkdirSync(distDir, { recursive: true });
}

// Build the widget bundle
try {
  // Add version/timestamp for cache busting
  const version = Date.now();
  const jsFilename = `localhub-map.js?v=${version}`;

  await build({
    entryPoints: ["src/component.tsx"],
    outfile: "dist/localhub-map.js",
    bundle: true,
    format: "esm",
    platform: "browser",
    target: ["es2022"],
    minify: true,
    sourcemap: false,
  });
  console.log("✓ Widget bundle built: dist/localhub-map.js");

  // Generate HTML template that references external JS with cache-busting version
  // The ASSET_BASE_URL placeholder will be replaced at runtime with the actual asset URL
  const htmlTemplate = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>LocalHub Map</title>
  <style>
    html, body, #root {
      height: 100%;
      margin: 0;
      padding: 0;
    }
  </style>
  <script>
    // Make base URL available to widget - will be replaced at runtime
    window.LOCALHUB_BASE_URL = 'ASSET_BASE_URL_ROOT';
  </script>
</head>
<body>
  <div id="root"></div>
  <script type="module">
    // Load the widget bundle from external URL with cache-busting version
    import init from 'ASSET_BASE_URL/${jsFilename}';

    // Initialize the widget
    const root = document.getElementById('root');
    if (root) {
      init({ mount: root });
    }
  </script>
</body>
</html>`;

  // Write HTML template
  const htmlPath = path.join(distDir, "localhub-map.html");
  fs.writeFileSync(htmlPath, htmlTemplate, "utf8");
  console.log("✓ HTML template generated: dist/localhub-map.html");

  console.log("\nBuild complete! Generated files:");
  console.log("  - localhub-map.js (widget bundle)");
  console.log(`  - localhub-map.html (with version ${version})`);
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
}
