import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { getCache, setCache, deleteCache, deleteCacheByPrefix } from "../config/cache";
import { REVIEW_SUMMARY_CACHE_PREFIX } from "./ai.controller";

export async function getListingReviews(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const pageNum = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
    const limitNum = Math.max(1, parseInt(String(req.query["limit"] ?? "10"), 10));

    const cacheKey = `reviews:listing:${id}:${pageNum}:${limitNum}`;
    const cached = await getCache<unknown>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached);
      return;
    }

    const listingExists = await prisma.listing.findFirst({ where: { id: String(id) } });
    if (!listingExists) {
      res.status(404).json({ error: `Listing with id ${id} not found` });
      return;
    }

    const [reviews, total] = await Promise.all([
      prisma.review.findMany({
        where: { listingId: String(id) },
        include: { user: { select: { name: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.review.count({ where: { listingId: String(id) } }),
    ]);

    const result = {
      data: reviews,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    };

    await setCache(cacheKey, result, 30); // 30-second cache
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function createReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { rating, comment } = req.body;
    const userId = req.userId!;

    if (!rating || !comment) {
      res.status(400).json({ error: "Missing required fields: rating, comment" });
      return;
    }

    const ratingNum = Number(rating);
    if (!Number.isInteger(ratingNum) || ratingNum < 1 || ratingNum > 5) {
      res.status(400).json({ error: "rating must be an integer between 1 and 5" });
      return;
    }

    const listing = await prisma.listing.findFirst({ where: { id: String(id) } });
    if (!listing) {
      res.status(404).json({ error: `Listing with id ${id} not found` });
      return;
    }

    const review = await prisma.review.create({
      data: { rating: ratingNum, comment, userId, listingId: String(id) },
      include: { user: { select: { name: true, avatar: true } } },
    });

    // Invalidate review cache and AI summary cache for this listing
    await Promise.all([
      deleteCacheByPrefix(`reviews:listing:${id}:`),
      deleteCache(`${REVIEW_SUMMARY_CACHE_PREFIX}${id}`),
    ]);

    res.status(201).json(review);
  } catch (error) {
    next(error);
  }
}

export async function deleteReview(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const review = await prisma.review.findFirst({ where: { id: String(id) } });
    if (!review) {
      res.status(404).json({ error: `Review with id ${id} not found` });
      return;
    }

    if (review.userId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own reviews" });
      return;
    }

    await prisma.review.delete({ where: { id: String(id) } });

    // Invalidate review cache for the listing
    await deleteCacheByPrefix(`reviews:listing:${review.listingId}:`);

    res.status(200).json({ message: "Review deleted successfully" });
  } catch (error) {
    next(error);
  }
}
