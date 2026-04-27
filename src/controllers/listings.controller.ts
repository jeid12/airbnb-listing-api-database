import { Request, Response, NextFunction } from "express";
import { Prisma, ListingType } from "@prisma/client";
import prisma from "../config/prisma";
import { getCache, setCache, deleteCacheByPrefix } from "../config/cache";
import { createListingSchema, updateListingSchema } from "../validators/listings.validator";

function invalidateListingCaches(): void {
  deleteCacheByPrefix("listings:all:");
  deleteCacheByPrefix("listings:stats");
}

export async function getAllListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { location, type, maxPrice, page, limit, sortBy, order } = req.query;

    const pageNum = parseInt(String(page ?? "1"), 10);
    const limitNum = parseInt(String(limit ?? "10"), 10);

    if (isNaN(pageNum) || pageNum < 1 || isNaN(limitNum) || limitNum < 1) {
      res.status(400).json({ error: "page and limit must be positive integers" });
      return;
    }

    // Cache keyed by the full query string
    const cacheKey = `listings:all:${JSON.stringify(req.query)}`;
    const cached = getCache<unknown>(cacheKey);
    if (cached) {
      res.setHeader("X-Cache", "HIT");
      res.status(200).json(cached);
      return;
    }

    const where: Prisma.ListingWhereInput = {};

    if (location) {
      where.location = { contains: String(location), mode: "insensitive" };
    }

    if (type) {
      const upperType = String(type).toUpperCase();
      if (!Object.values(ListingType).includes(upperType as ListingType)) {
        res.status(400).json({ error: `Invalid type. Must be one of: ${Object.values(ListingType).join(", ")}` });
        return;
      }
      where.type = upperType as ListingType;
    }

    if (maxPrice) {
      const max = parseFloat(String(maxPrice));
      if (isNaN(max)) {
        res.status(400).json({ error: "maxPrice must be a number" });
        return;
      }
      where.pricePerNight = { lte: max };
    }

    const orderByField = sortBy ? String(sortBy) : "createdAt";
    const orderDirection = order === "desc" ? "desc" : "asc";

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        select: {
          id: true,
          title: true,
          location: true,
          pricePerNight: true,
          type: true,
          guests: true,
          amenities: true,
          rating: true,
          createdAt: true,
          host: { select: { name: true, avatar: true } },
          _count: { select: { bookings: true } },
        },
        orderBy: { [orderByField]: orderDirection },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.listing.count({ where }),
    ]);

    const result = {
      data: listings,
      meta: { page: pageNum, limit: limitNum, total, totalPages: Math.ceil(total / limitNum) },
    };

    setCache(cacheKey, result, 60); // 60-second cache
    res.setHeader("X-Cache", "MISS");
    res.status(200).json(result);
  } catch (error) {
    next(error);
  }
}

export async function searchListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { location, type, minPrice, maxPrice, guests, page, limit } = req.query;

    const pageNum = Math.max(1, parseInt(String(page ?? "1"), 10));
    const limitNum = Math.max(1, parseInt(String(limit ?? "10"), 10));

    const where: Prisma.ListingWhereInput = {};

    if (location) {
      where.location = { contains: String(location), mode: "insensitive" };
    }

    if (type) {
      const upperType = String(type).toUpperCase();
      if (!Object.values(ListingType).includes(upperType as ListingType)) {
        res.status(400).json({ error: `Invalid type. Must be one of: ${Object.values(ListingType).join(", ")}` });
        return;
      }
      where.type = upperType as ListingType;
    }

    if (minPrice || maxPrice) {
      where.pricePerNight = {};
      if (minPrice) (where.pricePerNight as Prisma.FloatFilter).gte = parseFloat(String(minPrice));
      if (maxPrice) (where.pricePerNight as Prisma.FloatFilter).lte = parseFloat(String(maxPrice));
    }

    if (guests) {
      where.guests = { gte: parseInt(String(guests), 10) };
    }

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where,
        include: { host: { select: { name: true, email: true, avatar: true } } },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.listing.count({ where }),
    ]);

    res.status(200).json({
      data: listings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getListingById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const listing = await prisma.listing.findUnique({
      where: { id: Number(id) },
      include: {
        host: true,
        bookings: {
          include: { guest: { select: { name: true, avatar: true } } },
        },
        photos: true,
      },
    });

    if (!listing) {
      res.status(404).json({ error: `Listing with id ${id} not found` });
      return;
    }

    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
}

export async function createListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createListingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const listing = await prisma.listing.create({
      data: { ...result.data, hostId: req.userId! },
    });

    invalidateListingCaches();
    res.status(201).json(listing);
  } catch (error) {
    next(error);
  }
}

export async function updateListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.listing.findFirst({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ error: `Listing with id ${id} not found` });
      return;
    }

    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only edit your own listings" });
      return;
    }

    const result = updateListingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const listing = await prisma.listing.update({
      where: { id: Number(id) },
      data: result.data,
    });

    invalidateListingCaches();
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
}

export async function deleteListing(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.listing.findFirst({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ error: `Listing with id ${id} not found` });
      return;
    }

    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only delete your own listings" });
      return;
    }

    const listing = await prisma.listing.delete({ where: { id: Number(id) } });
    invalidateListingCaches();
    res.status(200).json(listing);
  } catch (error) {
    next(error);
  }
}
