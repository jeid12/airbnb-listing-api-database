import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  aiSearch,
  generateDescription,
  chat,
  recommend,
  reviewSummary,
} from "../../controllers/ai.controller";

export const aiRouter = Router();

// Part 1 — Smart listing search with pagination
aiRouter.post("/search", aiSearch);

// Part 2 — Generate listing description (auth required, owner only)
aiRouter.post("/listings/:id/generate-description", authenticate, generateDescription);

// Part 3 — Guest support chatbot with optional listing context
aiRouter.post("/chat", chat);

// Part 4 — AI booking recommendation (auth required)
aiRouter.post("/recommend", authenticate, recommend);

// Part 5 — Review summarizer with caching
aiRouter.get("/listings/:id/review-summary", reviewSummary);
