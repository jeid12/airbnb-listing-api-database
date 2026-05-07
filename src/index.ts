import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import compression from "compression";
import morgan from "morgan";
import { connectDB } from "./config/prisma";
import { connectRedis } from "./config/redis";
import { setupSwagger } from "./config/swagger";
import { generalLimiter, strictLimiter } from "./middlewares/rateLimiter";
import { v1Router } from "./routes/v1/index";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
const PORT = Number(process.env["PORT"]) || 3000;

// Render terminates TLS/proxies requests before they reach Express.
// Trusting one proxy avoids express-rate-limit throwing on X-Forwarded-For.
app.set("trust proxy", 1);

app.use(cors({
  origin: process.env["CORS_ORIGIN"] ?? "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(compression());
app.use(morgan(process.env["NODE_ENV"] === "production" ? "combined" : "dev"));
app.use(express.json());

// Rate limiting
app.use(generalLimiter);
app.use((req: Request, res: Response, next: NextFunction) => {
  if (req.method === "POST") return strictLimiter(req, res, next);
  next();
});

// Health check
app.get("/health", (_req, res) => {
  res.status(200).json({ status: "ok", uptime: process.uptime(), timestamp: new Date() });
});

setupSwagger(app);

// Versioned API
app.use("/api/v1", v1Router);

// Root redirect to docs
app.get("/", (_req: Request, res: Response) => {
  res.json({
    name: "Airbnb API",
    version: "v1",
    docs: "/api-docs",
    redoc: "/api-redoc",
    health: "/health",
    api: "/api/v1",
  });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Route not found" });
});

app.use(errorHandler);

async function main() {
  await connectDB();
  await connectRedis();
  app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

// Only start server when this file is executed directly
if (require.main === module) {
  main();
}

export default app;
