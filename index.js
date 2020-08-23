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

  // fetch from kv
  const { value, metadata } = await ASSETS.getWithMetadata(key, "arrayBuffer");
  if (!value) {
    return new Response(NOT_FOUND_RESPONSE_BODY, {
      status: 404,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  // build and cache response
  response = new Response(value, {
    headers: {
      "Access-Control-Allow-Origin": "https://georgeblack.me",
      "Access-Control-Allow-Methods": "GET, OPTIONS",
      "Content-Type": metadata.contentType,
      "Cache-Control": metadata.cacheControl,
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
