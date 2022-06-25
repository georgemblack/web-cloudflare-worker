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
    <p><em>You better <a href="https://george.black" style="text-decoration: none;">head on home</a>, before you get into trouble.</em><p>
  </body>
</html>
`;

export default {
  async fetch(request, env) {
    return handleEvent(request, env);
  }
}

/**
 * Primary event handler
 */
async function handleEvent(request, env) {
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
    return new Response(METHOD_NOT_ALLOWED_BODY, {
      status: 405,
      headers: {
        "Content-Type": "text/html",
      },
    });
  }

  // check cache
  response = await caches.default.match(request.url);
  if (response) return response;

  // fetch from r2
  let asset;
  if(request.url.includes("/assets/")) {
    asset = await env.WEB_ASSETS.get(key);
  } else {
    asset = await env.WEB.get(key);
  }
  if (!asset) {
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
      "Access-Control-Allow-Origin": "https://george.black",
      "Access-Control-Allow-Methods": "GET, OPTIONS"
    },
  });
  env.waitUntil(caches.default.put(request.url, response.clone()));

  return response;
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
  return `${url.hostname}${pathname}`;
}
