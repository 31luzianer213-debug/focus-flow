// @lovable.dev/vite-tanstack-config already includes the TanStack Start,
// React, Tailwind, tsconfig paths, Nitro/Cloudflare and Lovable runtime plugins.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

export default defineConfig({
  tanstackStart: {
    server: { entry: "server" },
  },
});
