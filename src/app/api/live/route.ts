import { generateLiveSnapshot } from "@/lib/dashboard-data";

export const runtime = "nodejs";

export async function GET() {
  const stream = new ReadableStream({
    start(controller) {
      const send = () => {
        const payload = JSON.stringify(generateLiveSnapshot());
        controller.enqueue(new TextEncoder().encode(`event: update\ndata: ${payload}\n\n`));
      };

      send();
      const interval = setInterval(send, 4000);

      const keepAlive = setInterval(() => {
        controller.enqueue(new TextEncoder().encode(`: keepalive\n\n`));
      }, 15000);

      return () => {
        clearInterval(interval);
        clearInterval(keepAlive);
      };
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
