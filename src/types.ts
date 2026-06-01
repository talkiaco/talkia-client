/**
 * Public type surface for `talkia/client`.
 *
 * These types are framework-agnostic (no React/Preact deps) so they can be
 * consumed from React, Angular, Vue, Svelte, Astro, or plain JS/TS.
 */

/** View layout of the chat surface. */
export type ViewMode = "chat" | "presentation";

/** Map of `paramName -> human description` passed to the LLM. */
export interface ActionParameters {
  [paramName: string]: string;
}

/** Runtime context handed to an action runner. */
export interface ActionContext {
  /** Public API key the widget was initialized with. */
  apiKey?: string;
  [key: string]: unknown;
}

/**
 * A tool the agent can call. The LLM decides when to invoke it; `runner`
 * executes in the host page with the params the model chose.
 */
export interface Action {
  /** Unique snake/kebab name the LLM references. */
  name: string;
  /** What the action does — drives when the LLM calls it. */
  description: string;
  /** `paramName -> description`. Omit for no-arg actions. */
  parameters?: ActionParameters;
  /** Subset of `parameters` keys that are mandatory. */
  required?: string[];
  /** Executed when the LLM calls the action. Return value is sent back to the model. */
  runner: (params: any, context?: ActionContext) => Promise<unknown> | unknown;
}

/** A one-tap suggestion chip shown in the chat composer. */
export interface QuickAction {
  /** Text on the chip. */
  label: string;
  /** Optional hint shown to the user. */
  description?: string;
  /** Message sent as the user when the chip is tapped. */
  message: string;
  /** Optional icon (framework-specific node; left untyped on purpose). */
  icon?: unknown;
  /** TTL in seconds for caching the message response. */
  ttlCache?: number;
}

/** Per-message overrides for {@link TalkiaClient.sendMessage}. */
export interface MessageOptions {
  /** Arbitrary structured context attached to the message. */
  messageContext?: Record<string, unknown>;
  /** Force a specific registered flow for this message. */
  flow?: string;
  /** Attach a screenshot/description of the current view to the message. */
  sendCurrentView?: boolean;
  /** TTL in seconds for caching the response. */
  ttlCache?: number;
}

/** Brand palette for the widget (OKLCH/hex/rgb strings). */
export interface AgentColors {
  bg?: string;
  c1?: string;
  c2?: string;
  c3?: string;
}

/** Built-in capabilities the agent may use. */
export interface AgentTools {
  /** Allow fetching and reading arbitrary URLs. */
  inspectWebsites?: boolean;
  /** Allow capturing the current page to gain visual context. */
  viewCurrentWebsite?: boolean;
  /** Allow microphone input. */
  allowMic?: boolean;
  /** Allow image attachments. */
  allowImages?: boolean;
}

/** Visual + behavioral configuration of the agent. */
export interface AgentConfig {
  apiKey?: string;
  agentName?: string;
  agentImage?: string;
  agentDescription?: string;
  quickActions?: QuickAction[];
  colors?: AgentColors;
  tools?: AgentTools;
  /** Keyboard combo to open the modal, or `null` to disable the shortcut. */
  openKeys?: string[] | null;
  darkMode?: boolean;
  businessContext?: string;
  debuggerEnabled?: boolean;
  language?: string;
  highlightAI?: boolean;
  sessionId?: string;
  toolbar?: {
    enabled?: boolean;
  };
}

/** Configuration passed to {@link initialize}. */
export interface InitConfig extends AgentConfig {
  /** Public API key for your Talkia agent. Required. */
  apiKey: string;
  /**
   * CSS selector of the element to mount the widget into (inline mode).
   * Omit to render a floating modal attached to `<body>`.
   */
  target?: string;
  /** Optional custom backend endpoint. */
  endpoint?: string;
  /** Initial view mode. */
  mode?: ViewMode;
  /** Override the CDN URL of the widget bundle. */
  cdnUrl?: string;
}

/** Imperative client returned by {@link createClient} / the default export. */
export interface TalkiaClient {
  /** Load the CDN bundle, mount the widget, and apply config. Call once. */
  initialize(config: InitConfig): void;

  /** Show the floating modal (no-op in inline mode). */
  show(): void;
  /** Hide the floating modal (no-op in inline mode). */
  hide(): void;

  setDarkMode(enabled: boolean): void;
  setLanguage(language: string): void;
  setSessionId(sessionId: string): void;
  setMode(mode: ViewMode): void;

  registerAction(action: Action): void;
  registerActions(actions: Action[]): void;
  getRegisteredActions(): Action[];
  clearActions(): void;

  registerQuickAction(action: QuickAction): void;
  registerQuickActions(actions: QuickAction[]): void;
  getQuickActions(): QuickAction[];
  clearQuickActions(): void;

  sendMessage(text: string, options?: MessageOptions): void;
  openDebugger(): void;
  /** Clear conversation, actions, flows, and quick actions. */
  reset(): void;
}
