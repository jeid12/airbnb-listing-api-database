import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { getCache, setCache } from "../config/cache";

export async function getListingStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = "listings:stats";
    const cached = getCache<unknown>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached);
      return;
    }

    const [totalListings, priceAggregate, byLocation, byType] = await Promise.all([
      prisma.listing.count(),
      prisma.listing.aggregate({ _avg: { pricePerNight: true } }),
      prisma.listing.groupBy({ by: ["location"], _count: { location: true }, orderBy: { _count: { location: "desc" } } }),
      prisma.listing.groupBy({ by: ["type"], _count: { type: true }, orderBy: { _count: { type: "desc" } } }),
    ]);

    const data = {
      totalListings,
      averagePrice: Number((priceAggregate._avg.pricePerNight ?? 0).toFixed(2)),
      byLocation,
      byType,
    };

    setCache(cacheKey, data, 5 * 60); // 5-minute cache
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}

export async function getUserStats(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const cacheKey = "users:stats";
    const cached = getCache<unknown>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached);
      return;
    }

    const [totalUsers, byRole] = await Promise.all([
      prisma.user.count(),
      prisma.user.groupBy({ by: ["role"], _count: { role: true } }),
    ]);

    const data = { totalUsers, byRole };

    setCache(cacheKey, data, 5 * 60); // 5-minute cache
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(data);
  } catch (error) {
    next(error);
  }
}
