/**
 * `talkia/client` — framework-agnostic wrapper around the Talkia widget.
 *
 * It lazily injects the CDN bundle (`https://talkia.co/cdn/talkia.js`), which
 * defines the `<talkia-modal>` / `<talkia-inline>` custom elements and exposes
 * the agent SDK on `window.agentSDK`. This module proxies every call to that
 * element/SDK, buffering anything issued before the widget signals
 * `talkia:ready`.
 */

import type {
  Action,
  InitConfig,
  MessageOptions,
  QuickAction,
  TalkiaClient,
  ViewMode,
} from "./types";

export * from "./types";

const DEFAULT_CDN_URL = "https://talkia.co/cdn/talkia.js";
const SCRIPT_ID = "talkia-cdn-bundle";
const READY_TIMEOUT_MS = 5000;
const READY_POLL_MS = 100;

/** Shape of the underlying agent SDK we drive on `window.agentSDK`. */
interface AgentSDKLike {
  registerAction(action: Action): void;
  getStandaloneActions(): Action[];
  clearActions(): void;
  registerQuickAction(action: QuickAction): void;
  registerQuickActions(actions: QuickAction[]): void;
  getQuickActions(): QuickAction[];
  clearQuickActions(): void;
  reset(): void;
}

/** Methods exposed by the `<talkia-modal>` / `<talkia-inline>` custom element. */
interface TalkiaElement extends HTMLElement {
  setAgentConfig(config: Record<string, unknown>): void;
  setDarkMode(enabled: boolean): void;
  setLanguage(language: string): void;
  setSessionId(sessionId: string): void;
  setMode(mode: ViewMode): void;
  sendMessage(text: string, options?: MessageOptions): void;
  openDebugger(): void;
  open?(options?: { reset?: boolean }): void;
  close?(): void;
  toggle?(): void;
}

declare global {
  interface Window {
    agentSDK?: AgentSDKLike;
  }
}

let _el: TalkiaElement | null = null;
let _ready = false;
let _initialized = false;
const _queue: Array<() => void> = [];

/** Run `fn` now if the widget is ready, otherwise buffer until `talkia:ready`. */
function whenReady(fn: () => void): void {
  if (_ready && _el) fn();
  else _queue.push(fn);
}

function flushQueue(): void {
  while (_queue.length) _queue.shift()!();
}

function injectScript(cdnUrl: string): void {
  if (typeof document === "undefined") return;
  if (document.getElementById(SCRIPT_ID)) return;
  const script = document.createElement("script");
  script.id = SCRIPT_ID;
  script.type = "module";
  script.src = cdnUrl;
  document.head.appendChild(script);
}

export function initialize(config: InitConfig): void {
  if (typeof window === "undefined") return; // SSR guard
  if (_initialized) {
    console.warn("[talkia] initialize() called more than once; ignoring.");
    return;
  }
  _initialized = true;

  const { apiKey, target, endpoint, mode, cdnUrl, ...agentConfig } = config;

  injectScript(cdnUrl ?? DEFAULT_CDN_URL);

  const tag = target ? "talkia-inline" : "talkia-modal";
  const el = document.createElement(tag) as TalkiaElement;
  if (apiKey) el.setAttribute("token", apiKey);
  if (endpoint) el.setAttribute("endpoint", endpoint);

  const mount = target ? document.querySelector(target) : document.body;
  if (!mount) {
    console.warn(`[talkia] target "${target}" not found; mounting on <body>.`);
  }
  (mount ?? document.body).appendChild(el);
  _el = el;

  let settled = false;
  const onReady = () => {
    if (settled) return;
    settled = true;
    _ready = true;
    el.setAgentConfig(agentConfig as Record<string, unknown>);
    if (mode) el.setMode(mode);
    flushQueue();
  };
  window.addEventListener("talkia:ready", onReady, { once: true });

  // Fallback: the `talkia:ready` event may fire before this listener attaches
  // (CDN already cached) or never fire. Poll for readiness up to 5s so buffered
  // calls don't hang silently.
  const deadline = Date.now() + READY_TIMEOUT_MS;
  const poll = window.setInterval(() => {
    if (settled) {
      window.clearInterval(poll);
      return;
    }
    if (
      typeof window.agentSDK !== "undefined" &&
      typeof el.setAgentConfig === "function"
    ) {
      window.clearInterval(poll);
      onReady();
    } else if (Date.now() > deadline) {
      window.clearInterval(poll);
      console.warn(
        "[talkia] widget not ready after 5s; buffered calls were not flushed.",
      );
    }
  }, READY_POLL_MS);
}

export function show(): void {
  whenReady(() => _el?.open?.());
}

export function hide(): void {
  whenReady(() => _el?.close?.());
}

export function setDarkMode(enabled: boolean): void {
  whenReady(() => _el?.setDarkMode(enabled));
}

export function setLanguage(language: string): void {
  whenReady(() => _el?.setLanguage(language));
}

export function setSessionId(sessionId: string): void {
  whenReady(() => _el?.setSessionId(sessionId));
}

export function setMode(mode: ViewMode): void {
  whenReady(() => _el?.setMode(mode));
}

export function registerAction(action: Action): void {
  whenReady(() => window.agentSDK?.registerAction(action));
}

export function registerActions(actions: Action[]): void {
  whenReady(() => actions.forEach((a) => window.agentSDK?.registerAction(a)));
}

export function getRegisteredActions(): Action[] {
  return window.agentSDK?.getStandaloneActions() ?? [];
}

export function clearActions(): void {
  whenReady(() => window.agentSDK?.clearActions());
}

export function registerQuickAction(action: QuickAction): void {
  whenReady(() => window.agentSDK?.registerQuickAction(action));
}

export function registerQuickActions(actions: QuickAction[]): void {
  whenReady(() => window.agentSDK?.registerQuickActions(actions));
}

export function getQuickActions(): QuickAction[] {
  return window.agentSDK?.getQuickActions() ?? [];
}

export function clearQuickActions(): void {
  whenReady(() => window.agentSDK?.clearQuickActions());
}

export function sendMessage(text: string, options?: MessageOptions): void {
  whenReady(() => _el?.sendMessage(text, options));
}

export function openDebugger(): void {
  whenReady(() => _el?.openDebugger());
}

export function reset(): void {
  whenReady(() => window.agentSDK?.reset());
}

/** Aggregate client object — same surface as the named exports. */
export const talkia: TalkiaClient = {
  initialize,
  show,
  hide,
  setDarkMode,
  setLanguage,
  setSessionId,
  setMode,
  registerAction,
  registerActions,
  getRegisteredActions,
  clearActions,
  registerQuickAction,
  registerQuickActions,
  getQuickActions,
  clearQuickActions,
  sendMessage,
  openDebugger,
  reset,
};

export default talkia;
