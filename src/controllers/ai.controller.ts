import { Request, Response, NextFunction } from "express";
import { HumanMessage, AIMessage, SystemMessage, BaseMessage } from "@langchain/core/messages";
import { Prisma, ListingType } from "@prisma/client";
import prisma from "../config/prisma";
import { model, filterModel } from "../config/ai";
import { getCache, setCache, deleteCache } from "../config/cache";

// In-memory chat session store: sessionId → message history
const chatSessions = new Map<string, BaseMessage[]>();
const MAX_CHAT_MESSAGES = 20;

type AiErrorLike = {
  status?: unknown;
  response?: { status?: unknown };
};

type SearchFilters = {
  location: string | null;
  type: string | null;
  maxPrice: number | null;
  guests: number | null;
};

type RecommendationPayload = {
  preferences: string;
  searchFilters: SearchFilters;
  reason: string;
};

type ReviewSummaryPayload = {
  summary: string;
  positives: string[];
  negatives: string[];
};

type GroupByMode = "location" | "host";

type GroupedListing = {
  id: string;
  title: string;
  location: string;
  pricePerNight: number;
  guests: number;
  type: ListingType;
  amenities: string[];
  rating: number | null;
  createdAt: Date;
  host: {
    id: string;
    name: string;
    email: string;
  };
};

type ListingGroup = {
  key: string;
  label: string;
  count: number;
  listings: GroupedListing[];
};

function extractJsonObject<T>(content: string): T | null {
  const match = content.match(/\{[\s\S]*\}/);
  if (!match) return null;

  try {
    return JSON.parse(match[0]) as T;
  } catch {
    return null;
  }
}

function normalizeListingType(value: unknown): ListingType | null {
  if (typeof value !== "string") return null;

  const upperValue = value.toUpperCase();
  return Object.values(ListingType).includes(upperValue as ListingType)
    ? (upperValue as ListingType)
    : null;
}

function buildListingWhere(filters: SearchFilters, excludeIds: string[] = []): Prisma.ListingWhereInput {
  const where: Prisma.ListingWhereInput = {};

  if (excludeIds.length > 0) {
    where.id = { notIn: excludeIds };
  }

  if (filters.location) {
    where.location = { contains: filters.location, mode: "insensitive" };
  }

  const listingType = normalizeListingType(filters.type);
  if (listingType) {
    where.type = listingType;
  }

  if (typeof filters.maxPrice === "number") {
    where.pricePerNight = { lte: filters.maxPrice };
  }

  if (typeof filters.guests === "number") {
    where.guests = { gte: filters.guests };
  }

  return where;
}

function groupListings(listings: GroupedListing[], groupBy: GroupByMode): ListingGroup[] {
  const groups = new Map<string, ListingGroup>();

  for (const listing of listings) {
    const key = groupBy === "location" ? listing.location : listing.host.id;
    const label = groupBy === "location" ? listing.location : listing.host.name;

    const existing = groups.get(key);
    if (existing) {
      existing.count += 1;
      existing.listings.push(listing);
      continue;
    }

    groups.set(key, {
      key,
      label,
      count: 1,
      listings: [listing],
    });
  }

  return Array.from(groups.values()).sort((left, right) => {
    if (right.count !== left.count) return right.count - left.count;
    return left.label.localeCompare(right.label);
  });
}

function handleAiError(error: unknown, res: Response, next: NextFunction): void {
  const err = error as AiErrorLike;
  const status =
    (typeof err.status === "number" ? err.status : undefined) ??
    (typeof err.response?.status === "number" ? err.response.status : undefined);

  if (status === 429) {
    res.status(429).json({ error: "AI service is busy, please try again in a moment" });
    return;
  }
  if (status === 401) {
    res.status(500).json({ error: "AI service configuration error" });
    return;
  }
  next(error);
}

// ─── Part 1: Smart Listing Search ────────────────────────────────────────────

export async function aiSearch(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { query } = req.body;
    if (!query || typeof query !== "string") {
      res.status(400).json({ error: "Missing required field: query" });
      return;
    }

    const pageNum = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
    const limitNum = Math.max(1, parseInt(String(req.query["limit"] ?? "10"), 10));

    const filterPrompt = `Extract search filters from this property search query: "${query}"

Return ONLY a valid JSON object with exactly these fields (null if not mentioned):
{
  "location": string or null,
  "type": "APARTMENT" | "HOUSE" | "VILLA" | "CABIN" | null,
  "maxPrice": number or null,
  "guests": number or null
}

Rules:
- type must be one of the four values above or null
- maxPrice is a number (no currency symbols)
- guests is an integer
- Return nothing except the JSON object`;

    let filters: {
      location: string | null;
      type: string | null;
      maxPrice: number | null;
      guests: number | null;
    };

    try {
      const aiResponse = await filterModel.invoke([new HumanMessage(filterPrompt)]);
      const content = String(aiResponse.content).trim();
      const parsed = extractJsonObject<SearchFilters>(content);
      if (!parsed) throw new Error("No valid JSON in response");
      filters = parsed;
    } catch {
      res.status(500).json({ error: "AI service returned an invalid response, please try again" });
      return;
    }

    const allNull = !filters.location && !filters.type && !filters.maxPrice && !filters.guests;
    if (allNull) {
      res.status(400).json({ error: "Could not extract any filters from your query, please be more specific" });
      return;
    }

    const where = buildListingWhere(filters);

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: { host: { select: { name: true, email: true } } },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.listing.count({ where }),
    ]);

    res.status(200).json({
      filters,
      data: listings,
      meta: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (error) {
    handleAiError(error, res, next);
  }
}

// ─── Part 1b: Grouped Listing Results ───────────────────────────────────────

export async function groupedListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const groupByRaw = String(req.query["groupBy"] ?? "location").toLowerCase();
    if (groupByRaw !== "location" && groupByRaw !== "host") {
      res.status(400).json({ error: "groupBy must be either location or host" });
      return;
    }

    const listings = await prisma.listing.findMany({
      select: {
        id: true,
        title: true,
        location: true,
        pricePerNight: true,
        guests: true,
        type: true,
        amenities: true,
        rating: true,
        createdAt: true,
        host: { select: { id: true, name: true, email: true } },
      },
      orderBy: groupByRaw === "location" ? [{ location: "asc" }, { createdAt: "desc" }] : [{ hostId: "asc" }, { createdAt: "desc" }],
    });

    const groups = groupListings(listings, groupByRaw as GroupByMode);

    res.status(200).json({
      groupBy: groupByRaw,
      totalListings: listings.length,
      totalGroups: groups.length,
      groups,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Part 2: Description Generator ───────────────────────────────────────────

const toneInstructions: Record<string, string> = {
  professional: "Write a formal, clear, and business-like property description. Use precise language.",
  casual: "Write a friendly, relaxed, and conversational property description. Keep it warm and inviting.",
  luxury: "Write an elegant, premium, and aspirational property description. Use rich and evocative language.",
};

export async function generateDescription(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params["id"]);
    const tone = (req.body.tone as string | undefined) ?? "professional";

    if (!["professional", "casual", "luxury"].includes(tone)) {
      res.status(400).json({ error: "tone must be one of: professional, casual, luxury" });
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: `Listing with id ${id} not found` });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ error: "You can only generate descriptions for your own listings" });
      return;
    }

    const toneInstruction = toneInstructions[tone];
    const prompt = `${toneInstruction}

Property details:
- Title: ${listing.title}
- Location: ${listing.location}
- Type: ${listing.type}
- Price per night: $${listing.pricePerNight}
- Max guests: ${listing.guests}
- Amenities: ${listing.amenities.join(", ")}

Write only the description paragraph — no headings, no labels, no extra commentary.`;

    let description: string;
    try {
      const aiResponse = await model.invoke([new HumanMessage(prompt)]);
      description = String(aiResponse.content).trim();
    } catch (error) {
      handleAiError(error, res, next);
      return;
    }

    const updatedListing = await prisma.listing.update({
      where: { id },
      data: { description },
    });

    res.status(200).json({ description, listing: updatedListing });
  } catch (error) {
    next(error);
  }
}

// ─── Part 3: Guest Support Chatbot ───────────────────────────────────────────

export async function chat(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { sessionId, message, listingId } = req.body;

    if (!sessionId || typeof sessionId !== "string") {
      res.status(400).json({ error: "Missing required field: sessionId" });
      return;
    }
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Missing required field: message" });
      return;
    }

    let systemContent =
      "You are a helpful guest support assistant for an Airbnb-like platform. " +
      "Answer questions accurately and helpfully.";

    if (listingId !== undefined && listingId !== null) {
      const listing = await prisma.listing.findUnique({ where: { id: String(listingId) } });
      if (!listing) {
        res.status(404).json({ error: `Listing with id ${listingId} not found` });
        return;
      }

      systemContent =
        `You are a helpful guest support assistant for an Airbnb-like platform.\n` +
        `You are currently helping a guest with questions about this specific listing:\n\n` +
        `Title: ${listing.title}\n` +
        `Location: ${listing.location}\n` +
        `Price per night: $${listing.pricePerNight}\n` +
        `Max guests: ${listing.guests}\n` +
        `Type: ${listing.type}\n` +
        `Amenities: ${listing.amenities.join(", ")}\n` +
        `Description: ${listing.description ?? "N/A"}\n\n` +
        `Answer questions about this listing accurately based on the details above.\n` +
        `If asked something not covered by the listing details, say you don't have that information.`;
    }

    const history = chatSessions.get(sessionId) ?? [];

    // Keep last 10 exchanges (20 messages)
    const trimmedHistory = history.slice(-MAX_CHAT_MESSAGES);

    const messages: BaseMessage[] = [
      new SystemMessage(systemContent),
      ...trimmedHistory,
      new HumanMessage(message),
    ];

    let aiResponse: BaseMessage;
    try {
      aiResponse = await model.invoke(messages);
    } catch (error) {
      handleAiError(error, res, next);
      return;
    }

    const updatedHistory = [...trimmedHistory, new HumanMessage(message), aiResponse].slice(-MAX_CHAT_MESSAGES);
    chatSessions.set(sessionId, updatedHistory);

    res.status(200).json({
      response: String(aiResponse.content),
      sessionId,
      messageCount: updatedHistory.length,
    });
  } catch (error) {
    next(error);
  }
}

// ─── Part 4: Booking Recommendation ─────────────────────────────────────────

export async function recommend(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = req.userId!;

    const [bookings, allBookedListings] = await Promise.all([
      prisma.booking.findMany({
        where: { guestId: userId },
        include: { listing: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      }),
      prisma.booking.findMany({
        where: { guestId: userId },
        select: { listingId: true },
      }),
    ]);

    if (bookings.length === 0) {
      res.status(400).json({
        error: "No booking history found. Make some bookings first to get recommendations.",
      });
      return;
    }

    const bookedListingIds = [...new Set(allBookedListings.map((booking) => booking.listingId))];

    const historySummary = bookings
      .map(
        (b, i) =>
          `${i + 1}. ${b.listing.type} in ${b.listing.location} — $${b.listing.pricePerNight}/night, ` +
          `${b.listing.guests} guests max, amenities: ${b.listing.amenities.join(", ")}`
      )
      .join("\n");

    const prompt = `Analyze this user's Airbnb booking history and recommend search filters:

Booking history:
${historySummary}

Return ONLY a valid JSON object:
{
  "preferences": "string describing what the user likes",
  "searchFilters": {
    "location": string or null,
    "type": "APARTMENT" | "HOUSE" | "VILLA" | "CABIN" | null,
    "maxPrice": number or null,
    "guests": number or null
  },
  "reason": "string explaining why these filters were chosen"
}`;

    let aiResult: {
      preferences: string;
      searchFilters: {
        location: string | null;
        type: string | null;
        maxPrice: number | null;
        guests: number | null;
      };
      reason: string;
    };

    try {
      const aiResponse = await model.invoke([new HumanMessage(prompt)]);
      const content = String(aiResponse.content).trim();
      const parsed = extractJsonObject<RecommendationPayload>(content);
      if (!parsed) throw new Error("No valid JSON in response");
      aiResult = parsed;
    } catch {
      res.status(500).json({ error: "AI service returned an invalid response, please try again" });
      return;
    }

    const { searchFilters } = aiResult;
    const where = buildListingWhere(searchFilters, bookedListingIds);

    const recommendations = await prisma.listing.findMany({
      where,
      include: { host: { select: { name: true, email: true } } },
      take: 10,
      orderBy: { rating: "desc" },
    });

    res.status(200).json({
      preferences: aiResult.preferences,
      reason: aiResult.reason,
      searchFilters,
      recommendations,
    });
  } catch (error) {
    handleAiError(error, res, next);
  }
}

// ─── Part 5: Review Summarizer ────────────────────────────────────────────────

export const REVIEW_SUMMARY_CACHE_PREFIX = "ai:review-summary:";

export async function reviewSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const id = String(req.params.id);

    const cacheKey = `${REVIEW_SUMMARY_CACHE_PREFIX}${id}`;
    const cached = await getCache<unknown>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached);
      return;
    }

    const listing = await prisma.listing.findUnique({ where: { id } });
    if (!listing) {
      res.status(404).json({ error: `Listing with id ${id} not found` });
      return;
    }

    const reviews = await prisma.review.findMany({
      where: { listingId: id },
      include: { user: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });

    if (reviews.length < 3) {
      res.status(400).json({
        error: "Not enough reviews to generate a summary (minimum 3 required)",
      });
      return;
    }

    const averageRating =
      Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length) * 10) / 10;

    const reviewsText = reviews
      .map((r) => `- ${(r.user && (r.user as { name: string }).name) || 'Unknown'} (${r.rating}/5): ${r.comment}`)
      .join("\n");

    const prompt = `Analyze these guest reviews for a property listing and provide a structured summary.

Reviews:
${reviewsText}

Return ONLY a valid JSON object:
{
  "summary": "2-3 sentence overall summary of guest experience",
  "positives": ["thing guests praised 1", "thing guests praised 2", "thing guests praised 3"],
  "negatives": ["complaint 1"] // empty array if no negatives
}

Rules:
- positives must have exactly 3 items
- negatives can be empty
- Do not include ratings or calculations — those are handled separately`;

    let aiResult: {
      summary: string;
      positives: string[];
      negatives: string[];
    };

    try {
      const aiResponse = await model.invoke([new HumanMessage(prompt)]);
      const content = String(aiResponse.content).trim();
      const parsed = extractJsonObject<ReviewSummaryPayload>(content);
      if (!parsed) throw new Error("No valid JSON in response");
      aiResult = parsed;
    } catch {
      res.status(500).json({ error: "AI service returned an invalid response, please try again" });
      return;
    }

    const result = {
      summary: aiResult.summary,
      positives: aiResult.positives,
      negatives: aiResult.negatives ?? [],
      averageRating,
      totalReviews: reviews.length,
    };

    await setCache(cacheKey, result, 600); // 10-minute cache
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(result);
  } catch (error) {
    handleAiError(error, res, next);
  }
}
