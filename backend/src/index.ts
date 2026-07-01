import "./env.js";
import cors from "cors";
import express from "express";
import meetingsRouter from "./routes/meetings.js";

const app = express();
const PORT = Number(process.env.PORT ?? 4000);
const HOST = process.env.HOST ?? "0.0.0.0";

const allowedOrigins = (process.env.FRONTEND_URL ?? "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) {
        callback(null, true);
        return;
      }

      const isAllowed =
        allowedOrigins.includes(origin) ||
        /\.vercel\.app$/.test(origin) ||
        origin.startsWith("http://localhost:") ||
        origin.startsWith("http://103.179.45.111:");

      callback(null, isAllowed);
    },
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "meeting-schedule-backend",
    timestamp: new Date().toISOString(),
  });
});

app.use("/api/meetings", meetingsRouter);

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
