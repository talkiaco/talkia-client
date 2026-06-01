# talkia/client

Framework-agnostic client for the **Talkia** AI browser agent. It loads the
widget bundle from the CDN (`https://talkia.co/cdn/talkia.js`), mounts it, and
gives you a typed imperative API to drive it from React, Angular, Vue, Svelte,
Astro, or plain JS.

## Install

```bash
pnpm add talkia
# or
npm install talkia
```

## Quick start

```ts
import { initialize } from "talkia/client";

initialize({
  apiKey: "YOUR_API_KEY",
  target: "#target", // optional — omit to render a floating box on <body>
});
```

- **No `target`** → floating modal mounted on `<body>` (open with `show()` or
  the keyboard shortcut, `⌘K` / `Ctrl+K` by default).
- **`target: "#selector"`** → widget rendered inline inside that element.

## How it works

1. `initialize()` injects `<script type="module" src="https://talkia.co/cdn/talkia.js">`
   once. The bundle defines the `<talkia-modal>` / `<talkia-inline>` custom
   elements and exposes the agent SDK on `window.agentSDK`.
2. The client mounts the element with your `apiKey` as the `token` attribute.
3. Every call you make is **buffered** until the widget fires `talkia:ready`,
   then flushed in order — so you can register actions and send messages right
   after `initialize()` without waiting.

## API

```ts
interface TalkiaClient {
  initialize(config: InitConfig): void;

  show(): void;            // floating modal only
  hide(): void;            // floating modal only
  setDarkMode(enabled: boolean): void;
  setLanguage(language: string): void;
  setSessionId(sessionId: string): void;
  setMode(mode: ViewMode): void; // "chat" | "presentation"

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
  reset(): void;
}
```

Import as named functions **or** the default aggregate object:

```ts
import { initialize, show, hide } from "talkia/client";
// or
import talkia from "talkia/client";
talkia.initialize({ apiKey: "..." });
```

### `InitConfig`

| Field          | Type                       | Notes                                            |
| -------------- | -------------------------- | ------------------------------------------------ |
| `apiKey`       | `string` (required)        | Public key for your agent.                       |
| `target`       | `string`                   | CSS selector → inline mode. Omit → floating box. |
| `mode`         | `"chat" \| "presentation"` | Initial view mode.                               |
| `endpoint`     | `string`                   | Custom backend endpoint.                         |
| `cdnUrl`       | `string`                   | Override the CDN bundle URL.                     |
| `agentName`    | `string`                   | Display name.                                    |
| `agentImage`   | `string`                   | Avatar URL.                                      |
| `agentDescription` | `string`               | Subtitle / greeting.                             |
| `darkMode`     | `boolean`                  | Force dark theme.                                |
| `language`     | `string`                   | UI language, e.g. `"es"`, `"en"`.                |
| `colors`       | `{ bg, c1, c2, c3 }`       | Brand palette (OKLCH/hex/rgb).                   |
| `tools`        | `{ inspectWebsites, viewCurrentWebsite, allowMic, allowImages }` | Built-in capabilities. |
| `quickActions` | `QuickAction[]`            | Suggestion chips.                                |
| `sessionId`    | `string`                   | Persist a conversation session.                  |
| `debuggerEnabled` | `boolean`               | Show the in-widget debugger.                     |

## Actions

Actions are tools the agent can call. The LLM decides **when**; your `runner`
runs in the page with the params the model chose, and its return value is fed
back to the model.

```ts
import { registerAction } from "talkia/client";

registerAction({
  name: "my-action",
  description: "My action description",
  parameters: {
    myParam: "My param description",
  },
  required: ["myParam"],
  runner: async (params) => {
    console.log(params.myParam);
    return { ok: true };
  },
});
```

## Quick actions

```ts
import { registerQuickActions } from "talkia/client";

registerQuickActions([
  { label: "View catalog", message: "Show me the available products" },
  { label: "My cart", message: "What's in my cart?" },
]);
```

## Sending messages

```ts
import { sendMessage } from "talkia/client";

sendMessage("Hello, world!");
sendMessage("Who are you?", { sendCurrentView: true }); // attach current page context
```

---

## Framework examples

### React

```tsx
import { useEffect } from "react";
import { initialize, registerAction } from "talkia/client";

export function Layout() {
  useEffect(() => {
    initialize({ apiKey: "YOUR_API_KEY" });

    registerAction({
      name: "go-to-cart",
      description: "Navigate the user to the cart page",
      runner: async () => {
        window.location.href = "/cart";
      },
    });
  }, []);

  return null;
}
```

### Next.js (App Router)

Run only on the client.

```tsx
"use client";
import { useEffect } from "react";
import { initialize } from "talkia/client";

export default function TalkiaProvider() {
  useEffect(() => {
    initialize({ apiKey: process.env.NEXT_PUBLIC_TALKIA_KEY! });
  }, []);
  return null;
}
```

### Astro

`initialize` touches the DOM, so guard it inside a client `<script>`.

```astro
---
// src/components/Talkia.astro
---
<script>
  import { initialize } from "talkia/client";
  initialize({ apiKey: "YOUR_API_KEY" });
</script>
```

Then drop `<Talkia />` into your layout. For per-island control, add
`client:only="..."` on a framework component instead.

### Vue 3

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { initialize } from "talkia/client";

onMounted(() => {
  initialize({ apiKey: "YOUR_API_KEY" });
});
</script>
```

### Angular

```ts
import { Component, OnInit } from "@angular/core";
import { initialize, show } from "talkia/client";

@Component({ selector: "app-root", template: "" })
export class AppComponent implements OnInit {
  ngOnInit() {
    initialize({ apiKey: "YOUR_API_KEY" });
  }
  openChat() {
    show();
  }
}
```

### Svelte

```svelte
<script lang="ts">
  import { onMount } from "svelte";
  import { initialize } from "talkia/client";

  onMount(() => {
    initialize({ apiKey: "YOUR_API_KEY" });
  });
</script>
```

### SvelteKit

```svelte
<script lang="ts">
  import { browser } from "$app/environment";
  import { onMount } from "svelte";

  onMount(async () => {
    if (!browser) return;
    const { initialize } = await import("talkia/client");
    initialize({ apiKey: "YOUR_API_KEY" });
  });
</script>
```

### Plain HTML / JS

```html
<script type="module">
  import { initialize, show } from "https://esm.sh/talkia/client";
  initialize({ apiKey: "YOUR_API_KEY" });
  document.querySelector("#open").addEventListener("click", show);
</script>
```

---

## SSR note

`initialize()`, `show()`, `hide()`, etc. require a DOM. They no-op when
`window` is undefined, but always call them from a client-only path
(`useEffect`, `onMounted`, `onMount`, an Astro `<script>`, etc.).

## TypeScript

All types are exported from `talkia/client`:

```ts
import type {
  TalkiaClient,
  InitConfig,
  AgentConfig,
  Action,
  QuickAction,
  MessageOptions,
  ViewMode,
} from "talkia/client";
```
