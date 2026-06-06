# talkia/client

Framework-agnostic client for the **Talkia** AI browser agent. Drop it into any
site to add an AI assistant that can answer questions, run actions in your page,
and render your own UI right inside the chat — works with React, Next.js, Vue,
Angular, Svelte, Astro, or plain JS.

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

- **No `target`** → floating modal (open with `show()` or the keyboard shortcut,
  `⌘K` / `Ctrl+K` by default).
- **`target: "#selector"`** → widget rendered inline inside that element.

Call `initialize()` from a client-only path (see [SSR](#ssr)). Anything you
register or send right after it works immediately — you don't need to wait for
the widget to finish loading.

## What you can do

- **Register actions** — give the agent tools it can call in your page.
- **Register components** — let the agent render your own UI in the chat.
- **Quick actions** — suggestion chips that prefill a message.
- **Send messages** — drive the conversation from your own buttons/flows.
- **Configure** — name, avatar, theme, language, brand colors, and more.

## API

```ts
interface TalkiaClient {
  initialize(config: InitConfig): void;

  show(): void; // floating modal only
  hide(): void; // floating modal only
  setDarkMode(enabled: boolean): void;
  setLanguage(language: string): void;
  setSessionId(sessionId: string): void;
  setMode(mode: ViewMode): void; // "chat" | "presentation"

  registerAction(action: Action): void;
  registerActions(actions: Action[]): void;
  getRegisteredActions(): Action[];
  clearActions(): void;

  registerComponent(component: ComponentDefinition): void;
  registerComponents(components: ComponentDefinition[]): void;

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

| Field              | Type                                                             | Notes                                            |
| ------------------ | ---------------------------------------------------------------- | ------------------------------------------------ |
| `apiKey`           | `string` (required)                                              | Public key for your agent.                       |
| `target`           | `string`                                                         | CSS selector → inline mode. Omit → floating box. |
| `mode`             | `"chat" \| "presentation"`                                       | Initial view mode.                               |
| `endpoint`         | `string`                                                         | Custom backend endpoint.                         |
| `cdnUrl`           | `string`                                                         | Override the CDN bundle URL.                     |
| `agentName`        | `string`                                                         | Display name.                                    |
| `agentImage`       | `string`                                                         | Avatar URL.                                      |
| `agentDescription` | `string`                                                         | Subtitle / greeting.                             |
| `darkMode`         | `boolean`                                                        | Force dark theme.                                |
| `language`         | `string`                                                         | UI language, e.g. `"es"`, `"en"`.                |
| `colors`           | `{ bg, c1, c2, c3 }`                                             | Brand palette (OKLCH/hex/rgb).                   |
| `tools`            | `{ inspectWebsites, viewCurrentWebsite, allowMic, allowImages }` | Built-in capabilities.                           |
| `quickActions`     | `QuickAction[]`                                                  | Suggestion chips.                                |
| `sessionId`        | `string`                                                         | Persist a conversation session.                  |
| `debuggerEnabled`  | `boolean`                                                        | Show the in-widget debugger.                     |

## Actions

Actions are tools the agent can call. The LLM decides **when**; your `runner`
runs in the page with the params the model chose, and its return value is fed
back to the model.

```ts
import { registerAction } from "talkia/client";

registerAction({
  name: "get_order_status",
  description:
    "Fetches the status of a customer order. " +
    "Call this when the user asks about their order, shipping, or delivery.",
  parameters: {
    orderId: "The order ID to look up",
  },
  required: ["orderId"],
  runner: async ({ orderId }) => {
    const res = await fetch(`/api/orders/${orderId}`);
    return res.json();
  },
});
```

The `runner` also receives a context with the current `apiKey` and `sessionId`
as its second argument, handy for authenticated calls.

## Components

Register a component to let the agent render **your own UI** inside the chat.
You describe it once — its name, what it's for, and the props it accepts — and
the agent decides when to render it and with what data. Talkia hands your
`render` function a DOM `container`; what you put inside is up to you (plain DOM,
React, Vue, a web component — anything).

```ts
import { registerComponent } from "talkia/client";

registerComponent({
  name: "rating",
  description: "Ask the user to rate the answer from 1 to 5 stars.",
  inputSchema: {
    type: "object",
    properties: {
      question: {
        type: "string",
        description: "What we're asking them to rate",
      },
    },
    required: ["question"],
  },
  render({ container, props }) {
    container.innerHTML = `<p>${props.question}</p>`;
    for (let i = 1; i <= 5; i++) {
      const star = document.createElement("button");
      star.textContent = "★";
      // tell the agent what the user did — it continues the conversation
      star.onclick = () => props.sendInteraction({ rating: i });
      container.appendChild(star);
    }
    return () => container.replaceChildren(); // optional cleanup
  },
});
```

`render` receives `{ container, props, context }`:

- **`container`** — the `HTMLElement` to draw into.
- **`props`** — the values the agent filled (typed from your `inputSchema`),
  plus `children` and `sendInteraction(data)` to report user interactions back
  to the agent.
- **`context`** — `{ componentsSize: "sm" | "md" | "lg" }` for responsive sizing.

Register many at once with `registerComponents([...])`. Each property's
`description` in `inputSchema` is the hint the agent uses to fill that prop.

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
import { createRoot } from "react-dom/client";
import { initialize, registerAction, registerComponent } from "talkia/client";

function Stars({ onRate }: { onRate: (n: number) => void }) {
  return (
    <div>
      {[1, 2, 3, 4, 5].map((n) => (
        <button key={n} onClick={() => onRate(n)}>
          ★
        </button>
      ))}
    </div>
  );
}

export function TalkiaProvider() {
  useEffect(() => {
    initialize({ apiKey: "YOUR_API_KEY" });

    registerAction({
      name: "go_to_cart",
      description: "Navigate the user to the cart page",
      runner: async () => {
        window.location.href = "/cart";
      },
    });

    registerComponent({
      name: "rating",
      description: "Ask the user to rate the answer from 1 to 5 stars.",
      render({ container, props }) {
        const root = createRoot(container);
        root.render(
          <Stars onRate={(n) => props.sendInteraction({ rating: n })} />,
        );
        return () => root.unmount();
      },
    });
  }, []);

  return null;
}
```

Mount `<TalkiaProvider />` once near your app root. For Next.js (App Router),
add `"use client"` at the top of the file and read the key from
`process.env.NEXT_PUBLIC_TALKIA_KEY`.

### Vue 3

```vue
<script setup lang="ts">
import { onMounted } from "vue";
import { createApp, h } from "vue";
import { initialize, registerAction, registerComponent } from "talkia/client";

onMounted(() => {
  initialize({ apiKey: "YOUR_API_KEY" });

  registerAction({
    name: "navigate",
    description: "Navigate the user to a route",
    parameters: { path: "The route path, e.g. /pricing" },
    required: ["path"],
    runner: async ({ path }) => {
      window.location.href = path;
    },
  });

  registerComponent({
    name: "rating",
    description: "Ask the user to rate the answer from 1 to 5 stars.",
    render({ container, props }) {
      const app = createApp({
        render: () =>
          [1, 2, 3, 4, 5].map((n) =>
            h(
              "button",
              { onClick: () => props.sendInteraction({ rating: n }) },
              "★",
            ),
          ),
      });
      app.mount(container);
      return () => app.unmount();
    },
  });
});
</script>

<template></template>
```

### Angular

```ts
import { Component, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { initialize, registerAction, registerComponent } from "talkia/client";

@Component({
  selector: "app-root",
  template: "<router-outlet></router-outlet>",
})
export class AppComponent implements OnInit {
  constructor(private router: Router) {}

  ngOnInit() {
    initialize({ apiKey: "YOUR_API_KEY" });

    registerAction({
      name: "navigate",
      description: "Navigate to a route",
      parameters: { path: "The route path, e.g. /account" },
      required: ["path"],
      runner: async ({ path }) => this.router.navigateByUrl(path),
    });

    registerComponent({
      name: "rating",
      description: "Ask the user to rate the answer from 1 to 5 stars.",
      render({ container, props }) {
        for (let i = 1; i <= 5; i++) {
          const star = document.createElement("button");
          star.textContent = "★";
          star.onclick = () => props.sendInteraction({ rating: i });
          container.appendChild(star);
        }
      },
    });
  }
}
```

### Svelte / SvelteKit

```svelte
<script lang="ts">
  import { onMount } from "svelte";

  onMount(async () => {
    const { initialize, registerAction } = await import("talkia/client");
    initialize({ apiKey: "YOUR_API_KEY" });

    registerAction({
      name: "navigate",
      description: "Navigate to a route",
      parameters: { path: "The route path" },
      required: ["path"],
      runner: async ({ path }) => (window.location.href = path),
    });
  });
</script>
```

### Astro

```astro
---
// src/components/Talkia.astro
---
<script>
  import { initialize } from "talkia/client";
  initialize({ apiKey: "YOUR_API_KEY" });
</script>
```

Then drop `<Talkia />` into your layout.

### Plain HTML / JS

```html
<script type="module">
  import { initialize, show } from "https://esm.sh/talkia/client";
  initialize({ apiKey: "YOUR_API_KEY" });
  document.querySelector("#open").addEventListener("click", show);
</script>
```

---

## SSR

`initialize()`, `show()`, `hide()`, etc. require a browser DOM. They safely
no-op on the server, but always call them from a client-only path — `useEffect`,
`onMounted`, `onMount`, an Astro `<script>`, and so on.

## TypeScript

All types are exported from `talkia/client`:

```ts
import type {
  TalkiaClient,
  InitConfig,
  AgentConfig,
  Action,
  ComponentDefinition,
  QuickAction,
  MessageOptions,
  ViewMode,
} from "talkia/client";
```
