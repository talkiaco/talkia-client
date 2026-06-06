import type { JSX } from "preact";
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
  /** Auto-capture each visited page into the knowledge base (SPA + static). */
  knowledgeAutocreate?: boolean;
  debuggerEnabled?: boolean;
  language?: string;
  highlightAI?: boolean;
  sessionId?: string;
  toolbar?: {
    theme?: "light" | "dark";
    enabled?: boolean;
    showOrb?: boolean;
    position?: "bottom-left" | "bottom-center" | "bottom-right";
    showKeyboardShortcut?: boolean;
    border?: false | null | undefined | { color: string; width: number };
    placeholder?: string;
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

export interface AgentFlow {
  name: string;
  description?: string;
  actions: Action[];
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

  addEphemeralContext(value: unknown): void;
  getEphemeralContext(): unknown;
  clearEphemeralContext(): void;

  sendMessage(text: string, options?: MessageOptions): void;
  openDebugger(): void;
  /** Clear conversation, actions, flows, and quick actions. */
  reset(): void;
  /** Hide the toolbar. */
  hideToolbar(): void;
  /** Show the toolbar. */
  showToolbar(): void;

  /** Register a component (built with any tech) — the agent knows how to render it. */
  registerComponent<const TSchema extends JSONSchema>(
    component: ComponentDefinition<TSchema>,
  ): void;
  registerComponents<const T extends readonly JSONSchema[]>(components: {
    [K in keyof T]: ComponentDefinition<T[K]>;
  }): void;
}

export interface ComponentHandle {
  setMode: (mode: ViewMode) => void;
  sendMessage: (
    text: string,
    options?: {
      messageContext?: Record<string, unknown>;
      flow?: string;
      ttlCache?: number;
    },
  ) => void;
}

export interface OpenOptions {
  reset?: boolean;
}

export interface AppHandle extends ComponentHandle {
  open: (options?: OpenOptions) => void;
  close: () => void;
  toggle: () => void;
}

export type ReadyCallback = () => void;

export interface ComponentContext {
  /** Display density the host renders at; drives responsive sizing. */
  componentsSize?: "sm" | "md" | "lg";
}

export interface JSONSchema {
  type?:
    | "string"
    | "number"
    | "integer"
    | "boolean"
    | "object"
    | "array"
    | "null";
  title?: string;
  description?: string;
  enum?: readonly unknown[];
  default?: unknown;
  required?: readonly string[];
  properties?: Record<string, JSONSchema>;
  items?: JSONSchema;
  additionalProperties?: boolean | JSONSchema;
}

/** Maps a literal JSONSchema to the TS type of the data it describes (zod-like). */
type JSONSchemaPrimitives = {
  string: string;
  number: number;
  integer: number;
  boolean: boolean;
  null: null;
};

type Prettify<T> = { [K in keyof T]: T[K] } & {};

type RequiredKeys<S> = S extends {
  required: readonly (infer R extends string)[];
}
  ? R
  : never;

type FromObjectSchema<S> = S extends { properties: infer P }
  ? Prettify<
      {
        [K in keyof P as K extends RequiredKeys<S> ? K : never]: FromSchema<
          P[K]
        >;
      } & {
        [K in keyof P as K extends RequiredKeys<S> ? never : K]?: FromSchema<
          P[K]
        >;
      }
    >
  : Record<string, unknown>;

type FromArraySchema<S> = S extends { items: infer I }
  ? FromSchema<I>[]
  : unknown[];

/**
 * Infers the props type from a JSONSchema literal.
 * Requires the schema to be captured with literal types (use a `const`
 * type parameter at the call site, e.g. `registerComponent`).
 */
export type FromSchema<S> = S extends { enum: readonly (infer E)[] }
  ? E
  : S extends { type: "object" }
    ? FromObjectSchema<S>
    : S extends { type: "array" }
      ? FromArraySchema<S>
      : S extends { type: keyof JSONSchemaPrimitives }
        ? JSONSchemaPrimitives[S["type"]]
        : unknown;

/** Props injected into every component, regardless of its schema. */
export interface BaseProps {
  /** HTML content the host nests inside the component. */
  children?: HTMLElement | string;
  /** Notify the agent of a user interaction within the component. */
  sendInteraction: (interaction: string | Record<string, unknown>) => void;
}

export interface RenderArgs<TProps = unknown> {
  container: HTMLElement;
  props: TProps & BaseProps;
  context: ComponentContext;
}

type UnmountFunction = () => void;

export interface ComponentDefinition<TSchema extends JSONSchema = JSONSchema> {
  name: string;
  description?: string;
  inputSchema?: TSchema;
  render(
    args: RenderArgs<FromSchema<TSchema>>,
  ): void | string | UnmountFunction | JSX.Element;
  destroy?(): void;
  wrapperDirection?: "row" | "col";
}
