/**
 * Tests for Widget Resource Endpoint (Phase J)
 *
 * Focused tests covering:
 * - Endpoint returns HTML response
 * - HTML includes root div and script tags
 * - GOOGLE_MAPS_PUBLIC_KEY injected into window
 */

import { GET } from "../route";

describe("Phase J: Widget Resource Endpoint", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv };
    process.env.GOOGLE_MAPS_PUBLIC_KEY = "test-maps-key-123";
    process.env.LOCALHUB_WIDGET_INLINE = "1";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  test("returns HTML response with correct content type", async () => {
    const response = await GET();

    expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  });

  test("HTML includes root div element", async () => {
    const response = await GET();
    const html = await response.text();

    expect(html).toContain('<div id="root"></div>');
  });

  test("HTML includes GOOGLE_MAPS_PUBLIC_KEY in window object", async () => {
    const response = await GET();
    const html = await response.text();

    expect(html).toContain("window.GOOGLE_MAPS_PUBLIC_KEY");
    expect(html).toContain("test-maps-key-123");
  });

  test("HTML includes proper DOCTYPE and meta tags", async () => {
    const response = await GET();
    const html = await response.text();

    expect(html).toContain("<!DOCTYPE html>");
    expect(html).toContain('<meta charset="utf-8"');
    expect(html).toContain('name="viewport"');
  });
});
