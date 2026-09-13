/**
 * BOENY NECTAR — Proxy CORS minimal pour KoboToolbox
 * Déploiement : Cloudflare Workers (offre gratuite suffisante pour un petit site).
 *
 * Le token RESTE dans script.js, conformément au choix du projet.
 * Ce Worker ne stocke aucun secret : il relaie seulement les requêtes vers
 * kf.kobotoolbox.org et kc.kobotoolbox.org et ajoute les en-têtes CORS.
 */

const ALLOWED_HOSTS = new Set([
  "kf.kobotoolbox.org",
  "kc.kobotoolbox.org"
]);

const ALLOWED_METHODS = new Set(["GET", "POST", "OPTIONS"]);

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
  "Access-Control-Allow-Headers": "Authorization, Content-Type, Accept, X-OpenRosa-Version",
  "Access-Control-Expose-Headers": "Content-Type, Content-Length, Content-Disposition, Location",
  "Access-Control-Max-Age": "86400"
};

function corsResponse(body, init = {}) {
  const headers = new Headers(init.headers || {});
  for (const [k, v] of Object.entries(CORS_HEADERS)) headers.set(k, v);
  return new Response(body, { ...init, headers });
}

function isAllowedTarget(target) {
  if (!ALLOWED_HOSTS.has(target.hostname)) return false;
  if (target.protocol !== "https:") return false;

  // Limiter le Worker aux API réellement utilisées par Boeny Nectar.
  if (target.hostname === "kf.kobotoolbox.org") {
    return target.pathname.startsWith("/api/v2/") ||
           target.pathname.startsWith("/media/") ||
           target.pathname.startsWith("/attachment/") ||
           target.pathname.startsWith("/private-media/");
  }
  if (target.hostname === "kc.kobotoolbox.org") {
    return target.pathname === "/submission" ||
           target.pathname.startsWith("/media/") ||
           target.pathname.startsWith("/attachment/");
  }
  return false;
}

export default {
  async fetch(request) {
    if (request.method === "OPTIONS") {
      return corsResponse(null, { status: 204 });
    }

    if (!ALLOWED_METHODS.has(request.method)) {
      return corsResponse("Méthode non autorisée", { status: 405 });
    }

    const incoming = new URL(request.url);
    const targetParam = incoming.searchParams.get("url");
    if (!targetParam) {
      return corsResponse("Paramètre url manquant", { status: 400 });
    }

    let target;
    try {
      target = new URL(targetParam);
    } catch {
      return corsResponse("URL cible invalide", { status: 400 });
    }

    if (!isAllowedTarget(target)) {
      return corsResponse("Destination Kobo non autorisée", { status: 403 });
    }

    const headers = new Headers();
    const passHeaders = ["authorization", "accept", "content-type", "x-openrosa-version"];
    for (const name of passHeaders) {
      const value = request.headers.get(name);
      if (value) headers.set(name, value);
    }

    const init = {
      method: request.method,
      headers,
      redirect: "follow"
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      init.body = request.body;
    }

    try {
      const upstream = await fetch(target.toString(), init);
      const outHeaders = new Headers();
      for (const name of ["content-type", "content-length", "content-disposition", "location", "etag", "last-modified"]) {
        const value = upstream.headers.get(name);
        if (value) outHeaders.set(name, value);
      }
      for (const [k, v] of Object.entries(CORS_HEADERS)) outHeaders.set(k, v);
      return new Response(upstream.body, {
        status: upstream.status,
        statusText: upstream.statusText,
        headers: outHeaders
      });
    } catch (error) {
      return corsResponse(`Erreur proxy Kobo : ${error && error.message ? error.message : String(error)}`, { status: 502 });
    }
  }
};
