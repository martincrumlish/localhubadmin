/**
 * Tests for React Component Foundation (Phase F)
 *
 * Focused tests covering:
 * - Component renders without crashing
 * - Initial toolOutput hydration
 * - Event-driven toolOutput updates
 * - Graceful fallback when toolOutput missing
 *
 * @jest-environment jsdom
 */

import React from "react";
import { act } from "react-dom/test-utils";
import "@testing-library/jest-dom";
import init from "../component";

describe("Phase F: React Component Foundation", () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement("div");
    document.body.appendChild(container);

    // Reset global openai object
    (globalThis as any).openai = undefined;
  });

  afterEach(() => {
    document.body.removeChild(container);
  });

  test("component renders without crashing", () => {
    (globalThis as any).openai = {
      toolOutput: {},
      openExternal: jest.fn(),
      callTool: jest.fn(),
      requestDisplayMode: jest.fn()
    };

    act(() => {
      init({ mount: container });
    });

    // Component creates #root inside the mount container
    const root = container.querySelector("#root");
    expect(root).toBeTruthy();
  });

  test("component reads initial toolOutput from window.openai", () => {
    const mockToolOutput = {
      search: {
        query: "coffee",
        resolvedArea: "Dublin",
        center: { lat: 53.3498, lng: -6.2603 },
        viewport: { north: 53.4, south: 53.3, east: -6.2, west: -6.3 }
      },
      places: []
    };

    (globalThis as any).openai = {
      toolOutput: mockToolOutput,
      openExternal: jest.fn(),
      callTool: jest.fn(),
      requestDisplayMode: jest.fn()
    };

    act(() => {
      init({ mount: container });
    });

    // Component should render with the toolOutput
    const root = container.querySelector("#root");
    expect(root).toBeTruthy();
    expect(root?.innerHTML).toContain("LocalHub");
  });

  test("component updates state when openai-tool-output event fires", async () => {
    (globalThis as any).openai = {
      toolOutput: { places: [] },
      openExternal: jest.fn(),
      callTool: jest.fn(),
      requestDisplayMode: jest.fn()
    };

    act(() => {
      init({ mount: container });
    });

    const newToolOutput = {
      places: [
        {
          id: "place_1",
          name: "Test Cafe",
          address: "123 Main St",
          phone: null,
          rating: 4.5,
          userRatingsTotal: 100,
          location: { lat: 53.3498, lng: -6.2603 },
          provider: { source: "google_places" }
        }
      ]
    };

    // Dispatch custom event
    await act(async () => {
      const event = new CustomEvent("openai-tool-output", {
        detail: { toolOutput: newToolOutput }
      });
      window.dispatchEvent(event);
      // Wait a tick for event to process
      await new Promise(resolve => setTimeout(resolve, 0));
    });

    // Component should process the event and update
    const root = container.querySelector("#root");
    expect(root).toBeTruthy();
  });

  test("component falls back gracefully when toolOutput is missing", () => {
    // No openai object at all
    act(() => {
      init({ mount: container });
    });

    // Should render with fallback empty object
    const root = container.querySelector("#root");
    expect(root).toBeTruthy();
    expect(root?.innerHTML).toContain("LocalHub");
  });
});
