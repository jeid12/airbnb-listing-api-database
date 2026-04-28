import "dotenv/config";
import express, { type Request, type Response, type NextFunction } from "express";
import compression from "compression";
import morgan from "morgan";
import { connectDB } from "./config/prisma";
import { connectRedis } from "./config/redis";
import { setupSwagger } from "./config/swagger";
import { generalLimiter, strictLimiter } from "./middlewares/rateLimiter";
import { authRouter } from "./routes/auth.routes";
import { usersRouter } from "./routes/users.routes";
import { listingsRouter } from "./routes/listings.routes";
import { bookingsRouter } from "./routes/bookings.routes";
import { reviewsRouter } from "./routes/reviews.routes";
import { uploadRouter } from "./routes/upload.routes";
import { errorHandler } from "./middlewares/errorHandler";

const app = express();
const PORT = Number(process.env["PORT"]) || 3000;

// Compression — must come before routes so responses are compressed
app.use(compression());

// Logging
app.use(morgan(process.env["NODE_ENV"] === "production" ? "combined" : "dev"));

app.use(express.json());

// Rate limiting — general limiter on all routes, strict limiter on POSTs
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

app.use("/auth", authRouter);
app.use("/users", usersRouter);
app.use("/listings", listingsRouter);
app.use("/bookings", bookingsRouter);
app.use("/reviews", reviewsRouter);
app.use("/", uploadRouter);

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

main();
