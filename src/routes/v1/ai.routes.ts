import { Router } from "express";
import { authenticate } from "../../middlewares/auth.middleware";
import {
  aiSearch,
  groupedListings,
  generateDescription,
  chat,
  recommend,
  reviewSummary,
} from "../../controllers/ai.controller";

export const aiRouter = Router();

/**
 * @swagger
 * /ai/search:
 *   post:
 *     tags: [AI]
 *     summary: Extract filters from a natural-language query and search listings
 *     description: Returns paginated listings plus the extracted filters and meta data. Uses a deterministic AI model for filter extraction.
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [query]
 *             properties:
 *               query:
 *                 type: string
 *                 example: apartment in Kigali under $100 for 2 guests
 *     responses:
 *       200:
 *         description: AI extracted filters and matching listings
 *       400:
 *         description: Missing query or no filters extracted
 */
aiRouter.post("/search", aiSearch);

/**
 * @swagger
 * /ai/listings/grouped:
 *   get:
 *     tags: [AI]
 *     summary: Group listings by location or host
 *     parameters:
 *       - in: query
 *         name: groupBy
 *         schema:
 *           type: string
 *           enum: [location, host]
 *           default: location
 *     responses:
 *       200:
 *         description: Grouped listings response
 *       400:
 *         description: Invalid groupBy value
 */
aiRouter.get("/listings/grouped", groupedListings);

/**
 * @swagger
 * /ai/listings/{id}/generate-description:
 *   post:
 *     tags: [AI]
 *     summary: Generate and save a listing description
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: query
 *         name: tone
 *         schema:
 *           type: string
 *           enum: [professional, casual, luxury]
 *           default: professional
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               tone:
 *                 type: string
 *                 enum: [professional, casual, luxury]
 *     responses:
 *       200:
 *         description: Generated description and updated listing
 *       401:
 *         description: Missing or invalid token
 *       403:
 *         description: Not the listing owner
 *       404:
 *         description: Listing not found
 */
aiRouter.post("/listings/:id/generate-description", authenticate, generateDescription);

/**
 * @swagger
 * /ai/chat:
 *   post:
 *     tags: [AI]
 *     summary: Chat with optional listing context
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [sessionId, message]
 *             properties:
 *               sessionId:
 *                 type: string
 *               listingId:
 *                 type: string
 *               message:
 *                 type: string
 *     responses:
 *       200:
 *         description: Chat response and session metadata
 *       404:
 *         description: Listing not found when listingId is provided
 */
aiRouter.post("/chat", chat);

/**
 * @swagger
 * /ai/recommend:
 *   post:
 *     tags: [AI]
 *     summary: Recommend listings from booking history
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recommended listings based on the user's booking history
 *       400:
 *         description: No booking history found
 *       401:
 *         description: Missing or invalid token
 */
aiRouter.post("/recommend", authenticate, recommend);

/**
 * @swagger
 * /ai/listings/{id}/review-summary:
 *   get:
 *     tags: [AI]
 *     summary: Summarize listing reviews
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: AI review summary with caching
 *       400:
 *         description: Not enough reviews
 *       404:
 *         description: Listing not found
 */
aiRouter.get("/listings/:id/review-summary", reviewSummary);
