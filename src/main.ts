import * as log from "@std/log";
import { config } from "./config.ts";
import { Application, Router } from "@oak/oak";

log.info("Configuration loaded");

const app = new Application();

const router = new Router();

router.get("/", (ctx) => {
  ctx.response.body = "Hello, world";
});

app.use(router.routes());
app.use(router.allowedMethods());

app.listen({
  port: config.port,
  key: config.https.key,
  cert: config.https.cert,
  secure: true,
});

log.info(`Listening on port ${config.port} with base URL ${config.baseUrl}`);
