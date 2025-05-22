import { Hono } from "hono";
import { logger } from "hono/logger";
import { Interview } from "./interview";
import { configureAuthRoutes } from "./routes/auth";
import { configureInterviewRoutes } from "./routes/interview";
import { ApiContext } from "./types";

const app = new Hono<ApiContext>();
const api = new Hono<ApiContext>();

app.use("*", logger());

app.route("/auth", configureAuthRoutes());
api.route("/interviews", configureInterviewRoutes());

app.route("/api/v1", api);

export { Interview };
export default app;
