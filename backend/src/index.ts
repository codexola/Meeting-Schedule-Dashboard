import "./env.js";
import cors from "cors";
import express from "express";
import companiesRouter from "./routes/companies.js";
import meetingsRouter from "./routes/meetings.js";
import searchRouter from "./routes/search.js";
import { prisma } from "./lib/prisma.js";

const app = express();
const PORT = Number(process.env.PORT ?? 3100);
const HOST = process.env.HOST ?? "0.0.0.0";

const allowedOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean)
  .map((origin) =>
    /^https?:\/\//i.test(origin) ? origin : `https://${origin}`
  );

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/i.test(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://127.0.0.1:") ||
        origin.startsWith("http://103.179.45.111:");

      callback(null, isAllowed);
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/", (_req, res) => {
  res.json({
    ok: true,
    service: "meeting-schedule-backend",
    health: "/health",
    api: "/api/meetings",
  });
});

app.get("/health", async (_req, res) => {
  try {
    await prisma.$queryRaw`SELECT 1`;
    res.json({
      ok: true,
      service: "meeting-schedule-backend",
      database: "connected",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Health check database error:", error);
    res.status(503).json({
      ok: false,
      service: "meeting-schedule-backend",
      database: "disconnected",
      error: "Database unavailable. Run npx prisma dev from the project root.",
      timestamp: new Date().toISOString(),
    });
  }
});

app.use("/api/meetings", meetingsRouter);
app.use("/api/companies", companiesRouter);
app.use("/api/search", searchRouter);

app.use(
  (
    err: Error,
    _req: express.Request,
    res: express.Response,
    _next: express.NextFunction
  ) => {
    console.error("Unhandled error:", err);
    res.status(500).json({ error: "Internal server error" });
  }
);

app.listen(PORT, HOST, () => {
  console.log(`Backend API running at http://${HOST}:${PORT}`);
  console.log(`Health check: http://${HOST}:${PORT}/health`);
});
