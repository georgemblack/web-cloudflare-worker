const METHOD_NOT_ALLOWED_BODY = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family: system-ui;text-align:center;">
    <h1>METHOD NOT ALLOWED!</h1>
    <p><em>What in tarnation are you trying to do?</em><p>
  </body>
</html>
`;
const NOT_FOUND_RESPONSE_BODY = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family: system-ui;text-align:center;">
    <h1>404 NOT FOUND!</h1>
    <p><em>You better <a href="https://georgeblack.me" style="text-decoration: none;">head on home</a>, before you get into trouble.</em><p>
  </body>
</html>
`;
const INTERNAL_ERROR_RESPONSE_BODY = `
<!DOCTYPE html>
<html lang="en">
  <body style="font-family: system-ui;text-align:center;">
    <h1>INTERNAL SERVER ERROR, OH SHIT!</h1>
    <p><em>Sorry 'bout that</em><p>
  </body>
</html>
`;

const REMOTE_STORAGE_URL = "https://storage.googleapis.com";

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
  const key = getKey(event);

  if (event.request.method == "OPTIONS") {
    return new Response(null, {
      headers: {
        "Access-Control-Allow-Origin": "https://georgeblack.me",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
      },
    });
  }

  if (event.request.method != "GET") {
    return new Response(METHOD_NOT_ALLOWED_BODY, {
      status: 405,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  // check cache
  response = await caches.default.match(event.request.url);
  if (response) return response;

  // fetch asset from cloud storage
  let storageResponse = await fetch(`${REMOTE_STORAGE_URL}/${key}`);

  if (storageResponse.status == 404) {
    return new Response(NOT_FOUND_RESPONSE_BODY, {
      status: 404,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }
  if (storageResponse.status != 200) {
    return new Response(INTERNAL_ERROR_RESPONSE_BODY, {
      status: 500,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  // build and cache response
  response = new Response(storageResponse.body, {
    headers: {
      "Access-Control-Allow-Origin": "https://georgeblack.me",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type":
        storageResponse.headers.get("Content-Type") || "text/plain",
      "Cache-Control": `public, max-age=${cacheMaxAge(key)}`,
    },
  });
  event.waitUntil(caches.default.put(event.request.url, response.clone()));

  return response;
}

function getKey(event) {
  let url = new URL(event.request.url);
  let pathname = url.pathname;
  if (pathname.endsWith("/")) {
    pathname = pathname.concat("index.html");
  }
  const filename = pathname.split("/").pop();
  if (!filename.includes(".")) {
    pathname = pathname.concat("/index.html");
  }
  return `${url.hostname}${pathname}`;
}

function cacheMaxAge(key) {
  const extension = key.split(".").pop();
  if (/^(jpg|jpeg|png|webp|mov|ico|svg|webmanifest)$/.test(extension))
    return "1296000"; // 15 days
  if (/^(js|css)$/.test(extension)) return "172800"; // 2 days
  return "7200"; // 2 hours
}
