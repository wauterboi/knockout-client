import * as log from "@std/log";
import { config } from "./config.ts";
import { Application, Router } from "@oak/oak";

/* All of the code below is awful and will be rewritten. It is just a proof
of concept. */

log.info("Configuration loaded");

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.body = "Hello, world";
});

const loginUrl = new URL("https://knockout.chat/login");
loginUrl.searchParams.set("redirect", `${config.baseUrl}authenticate`);

const tokenUrl = new URL(
  `https://api.knockout.chat/auth/request-token?key=${config.apiKey}`,
);

router.get("/login", (ctx) => {
  ctx.response.redirect(loginUrl.toString());
});

router.get("/authenticate", async (ctx) => {
  const authCode = ctx.request.url.searchParams.get("authorization");
  if (authCode == null) {
    ctx.response.status = 400;
    ctx.response.body = {
      error: "Authorization code is required",
    };
    return;
  }
  log.info("Attempting authentication with Knockout API");
  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "text/plain",
      },
      body: authCode,
    });

    if (response.ok) {
      ctx.response.body = await response.text();
    } else {
      ctx.response.status = response.status;
      const err = await response.text();
      ctx.response.body = { error: err };
      log.error("Failed to authenticate", await err);
    }
  } catch (err) {
    ctx.response.status = 500;
    ctx.response.body = { error: "Failed to communicate with the API" };
    log.error("Failed to communicate with the API");
    throw err;
  }
});

const app = new Application();
app.use(router.routes());
app.use(router.allowedMethods());

app.listen({
  port: config.port,
  key: config.https.key,
  cert: config.https.cert,
  secure: true,
});

log.info(`Listening on port ${config.port} with base URL ${config.baseUrl}`);
