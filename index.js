import mime from "mime";

const ORIGIN = "https://media.georgeblack.me";
const REMOTE_STORAGE_URL = "https://storage.googleapis.com/georgeblack.me";
const CACHE_TTL = "7776000";

addEventListener("fetch", (event) => {
  try {
    event.respondWith(handleEvent(event));
  } catch (e) {
    event.respondWith(new Response("Internal error", { status: 500 }));
  }
});

/**
 * Primary event handler
 */
async function handleEvent(event) {
  let response;
  const cache = caches.default;
  const pathname = getPathname(event);

  if (event.request.method == "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://georgeblack.me",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  if (event.request.method != "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // check cache
  response = await cache.match(`${ORIGIN}/${pathname}`);
  if (response) return response;

  // fetch asset from cloud storage
  let storageResponse = await fetch(`${REMOTE_STORAGE_URL}/${pathname}`);

  if (storageResponse.status == 404) {
    return new Response("404 not found", { status: 404 });
  }
  if (storageResponse.status != 200) {
    return new Response("Internal error", { status: 500 });
  }

  // build and cache response
  response = new Response(storageResponse.body, {
    headers: {
      "Access-Control-Allow-Origin": "https://georgeblack.me",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": mime.getType(pathname) || "text/plain",
      "Cache-Control": `public, max-age=${CACHE_TTL}`,
    },
  });
  event.waitUntil(cache.put(`${ORIGIN}/${pathname}`, response.clone()));

  return response;
}

/**
 * Get sanitized pathname of asset
 */
function getPathname(event) {
  let pathname = new URL(event.request.url).pathname;
  if (pathname.endsWith("/")) {
    pathname = pathname.concat("index.html");
  }
  const filename = pathname.split("/").pop();
  if (!filename.includes(".")) {
    pathname = pathname.concat("/index.html");
  }
  pathname = pathname.replace(/^\/+/, "");
  return pathname;
}
