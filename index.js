import { MIME_TYPES } from "./constants.js";

export default {
  async fetch(request, env, context) {
    return handleEvent(request, env, context);
  },
};

/**
 * Redirect requests to the correct handler.
 */
async function handleEvent(request, env, context) {
  const url = new URL(request.url);
  if (url.hostname === env.PUBLIC_HOSTNAME) {
    return handleStandardEvent(request, env, context);
  } else if (url.hostname === env.STORAGE_HOSTNAME) {
    return handleStorageEvent(request, env);
  }
  return new Response("Not found", { status: 404 });
}

/**
 * Serve static assets from cache, otherwise read from R2 (and cache them).
 */
async function handleStandardEvent(request, env, context) {
  let response;
  const key = getKey(request);

  if (request.method == "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://george.black",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  if (request.method != "GET") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Check cache
  response = await caches.default.match(request.url);
  if (response) return response;

  // Fetch from r2
  const object = await env.WEB.get(key);
  if (!object) return new Response("Not found", { status: 404 });

  // Build and cache response
  response = new Response(object.body, {
    headers: {
      "Access-Control-Allow-Origin": "https://george.black",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Cache-Control":
        object.httpMetadata.cacheControl || "public, max-age=2592000",
      "Content-Type": object.httpMetadata.contentType,
    },
  });
  context.waitUntil(caches.default.put(request.url, response.clone()));

  return response;
}

/**
 * Read and write data to R2.
 */
async function handleStorageEvent(request, env) {
  if (!["GET", "PUT", "DELETE"].includes(request.method)) {
    return new Response("Method not allowed", { status: 405 });
  }
  if (!authorized(request, env)) {
    return new Response("Unauthorized", { status: 401 });
  }

  // List bucket objects
  if (request.method === "GET") {
    const objects = await env.WEB.list();
    const keys = objects.objects.map((object) => object.key);
    return new Response(JSON.stringify({ keys }), { status: 200 });
  }

  // Use URL to determine object key
  // i.e. 'http://example.com/picture.jpg' -> 'picture.jpg'
  if (request.method === "PUT") {
    const pathname = new URL(request.url).pathname;
    const objectKey = pathname.replace(/^\/+/, "");
    await env.WEB.put(objectKey, request.body, {
      httpMetadata: generateHttpMetadata(objectKey),
    });
    return new Response("Success", { status: 201 });
  }

  // Delete object, using URL to determine object key
  if (request.method === "DELETE") {
    const pathname = new URL(request.url).pathname;
    const objectKey = pathname.replace(/^\/+/, "");
    await env.WEB.delete(objectKey);
    return new Response("Success", { status: 204 });
  }
}

function getKey(request) {
  let url = new URL(request.url);
  let pathname = url.pathname;
  if (pathname.endsWith("/")) {
    pathname = pathname.concat("index.html");
  }
  const filename = pathname.split("/").pop();
  if (!filename.includes(".")) {
    pathname = pathname.concat("/index.html");
  }
  return pathname.substring(1); // removes leading slash
}

function authorized(request, env) {
  const token = request.headers.get("X-Access-Token");
  return token === env.ACCESS_TOKEN;
}

function generateHttpMetadata(objectKey) {
  const extension = objectKey.split(".").pop();

  let seconds = "2592000";
  if (["html", "xml", "json", "txt"].includes(extension)) seconds = "900";
  if (["css", "js"].includes(extension)) seconds = "172800";

  return {
    contentType: MIME_TYPES.get(extension) || "application/octet-stream",
    cacheControl: `public, max-age=${seconds}`,
  };
}
