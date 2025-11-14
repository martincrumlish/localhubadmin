import { useSyncExternalStore, useState, useEffect, useCallback } from 'react';

/**
 * Official OpenAI Apps SDK React Hooks
 * Based on SDK documentation and best practices
 */

// Event type constant for OpenAI bridge updates
export const SET_GLOBALS_EVENT_TYPE = "openai:set_globals";

/**
 * Type definitions for OpenAI globals
 */
export type UnknownObject = Record<string, unknown>;

export type Theme = "light" | "dark";
export type DisplayMode = "pip" | "inline" | "fullscreen";

export type OpenAiGlobals<
  ToolInput extends UnknownObject = UnknownObject,
  ToolOutput extends UnknownObject = UnknownObject,
  ToolResponseMetadata extends UnknownObject = UnknownObject,
  WidgetState extends UnknownObject = UnknownObject
> = {
  theme: Theme;
  locale: string;
  maxHeight: number;
  displayMode: DisplayMode;
  toolInput: ToolInput;
  toolOutput: ToolOutput | null;
  toolResponseMetadata: ToolResponseMetadata | null;
  widgetState: WidgetState | null;
};

export interface SetGlobalsEvent extends CustomEvent<{
  globals: Partial<OpenAiGlobals>;
}> {
  readonly type: typeof SET_GLOBALS_EVENT_TYPE;
}

/**
 * Core hook for subscribing to any window.openai global property
 * Uses React 18's useSyncExternalStore for optimal performance
 *
 * This is event-driven (listens for openai:set_globals events) rather than polling
 */
export function useOpenAiGlobal<K extends keyof OpenAiGlobals>(
  key: K
): OpenAiGlobals[K] {
  return useSyncExternalStore(
    (onChange) => {
      const handleSetGlobal = (event: Event) => {
        const customEvent = event as SetGlobalsEvent;
        const value = customEvent.detail?.globals?.[key];
        if (value === undefined) {
          return;
        }
        onChange();
      };

      window.addEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal as EventListener, {
        passive: true,
      });

      return () => {
        window.removeEventListener(SET_GLOBALS_EVENT_TYPE, handleSetGlobal as EventListener);
      };
    },
    () => {
      const openai = (window as any).openai;
      return openai?.[key];
    }
  );
}

/**
 * Get tool input parameters (the arguments passed to the tool)
 * Automatically reactive to updates
 */
export function useToolInput<T extends UnknownObject = UnknownObject>(): T {
  return useOpenAiGlobal("toolInput") as T;
}

/**
 * Get tool output data (the structuredContent returned by the tool)
 * Automatically reactive to updates
 *
 * This is the RECOMMENDED way to access tool output - replaces manual polling
 */
export function useToolOutput<T extends UnknownObject = UnknownObject>(): T | null {
  return useOpenAiGlobal("toolOutput") as T | null;
}

/**
 * Get tool response metadata
 * Automatically reactive to updates
 */
export function useToolResponseMetadata<T extends UnknownObject = UnknownObject>(): T | null {
  return useOpenAiGlobal("toolResponseMetadata") as T | null;
}

/**
 * Get current theme (light or dark)
 * Automatically reactive to theme changes
 */
export function useTheme(): Theme {
  return useOpenAiGlobal("theme");
}

/**
 * Get current display mode (inline, fullscreen, or pip)
 * Automatically reactive to display mode changes
 */
export function useDisplayMode(): DisplayMode {
  return useOpenAiGlobal("displayMode");
}

/**
 * Get current locale
 * Automatically reactive to locale changes
 */
export function useLocale(): string {
  return useOpenAiGlobal("locale");
}

/**
 * Manage persisted widget state
 * Uses OpenAI's setWidgetState API to persist state across sessions
 *
 * State is shown to the model, so keep it small (< 4k tokens recommended)
 */
export function useWidgetState<T extends UnknownObject>(
  defaultState: T
): readonly [T, (state: T | ((prev: T) => T)) => void];

export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: T | null | ((prev: T | null) => T | null)) => void];

export function useWidgetState<T extends UnknownObject>(
  defaultState?: T | (() => T | null) | null
): readonly [T | null, (state: T | null | ((prev: T | null) => T | null)) => void] {
  const widgetStateFromWindow = useOpenAiGlobal("widgetState") as T | null;

  const [widgetState, _setWidgetState] = useState<T | null>(() => {
    if (widgetStateFromWindow != null) {
      return widgetStateFromWindow;
    }
    return typeof defaultState === "function"
      ? defaultState()
      : defaultState ?? null;
  });

  useEffect(() => {
    _setWidgetState(widgetStateFromWindow);
  }, [widgetStateFromWindow]);

  const setWidgetState = useCallback(
    (state: T | null | ((prev: T | null) => T | null)) => {
      _setWidgetState((prevState) => {
        const newState = typeof state === "function" ? state(prevState) : state;
        if (newState != null) {
          const openai = (window as any).openai;
          openai?.setWidgetState?.(newState);
        }
        return newState;
      });
    },
    []
  );

  return [widgetState, setWidgetState] as const;
}
