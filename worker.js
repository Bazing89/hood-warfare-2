/**
 * Hood Warfare 2 - Cloudflare Worker Entrypoint
 * Serves static PlayCanvas 3D assets from public/ and provides health status.
 */
export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Health check endpoint
    if (url.pathname === '/api/health') {
      return new Response(JSON.stringify({
        status: 'online',
        game: 'Hood Warfare 2',
        worker: true
      }), {
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Serve static files from public/ via Cloudflare Assets
    if (env && env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Hood Warfare 2 Worker Active. Static assets are served via Cloudflare Assets.', {
      headers: { 'Content-Type': 'text/plain' }
    });
  }
};
