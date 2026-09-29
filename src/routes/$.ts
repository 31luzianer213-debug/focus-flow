import { createFileRoute } from "@tanstack/react-router";
import { renderStaticShell } from "../static-shell";

export const Route = createFileRoute("/$")({
  server: {
    handlers: {
      GET: async () =>
        new Response(renderStaticShell(), {
          status: 200,
          headers: {
            "content-type": "text/html; charset=utf-8",
            "cache-control": "no-cache",
          },
        }),
    },
  },
});
