import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";

// Express 5 types `req.params[key]` as `string | string[]`. Normalise to string.
const param = (v: string | string[]): string => (Array.isArray(v) ? v[0] : v);

const HOST_SELECT = { id: true, name: true, avatar: true, isSuperhost: true };

const FULL_INCLUDE = {
  host:   { select: HOST_SELECT },
  photos: { select: { id: true, url: true } },
  _count: { select: { bookings: true } },
};

/** GET /experiences */
export async function getAllExperiences(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, location, isOnline, minPrice, maxPrice, page, limit } = req.query;
    const pageNum  = Math.max(1, parseInt(String(page  ?? "1"),  10));
    const limitNum = Math.max(1, Math.min(50, parseInt(String(limit ?? "12"), 10)));

    const where: Prisma.ExperienceWhereInput = { isPublished: true };
    if (category && String(category) !== "all") where.category = String(category);
    if (location)  where.location = { contains: String(location), mode: "insensitive" };
    if (isOnline !== undefined) where.isOnline = String(isOnline) === "true";
    if (minPrice)  where.price = { ...(where.price as object ?? {}), gte: parseFloat(String(minPrice)) };
    if (maxPrice)  where.price = { ...(where.price as object ?? {}), lte: parseFloat(String(maxPrice)) };

    const [data, total] = await Promise.all([
      prisma.experience.findMany({
        where, include: FULL_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.experience.count({ where }),
    ]);

    res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (e) { next(e); }
}

/** GET /experiences/:id */
export async function getExperienceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const exp = await prisma.experience.findUnique({
      where: { id: param(req.params.id) },
      include: FULL_INCLUDE,
    });
    if (!exp) { res.status(404).json({ error: "Experience not found" }); return; }
    res.json(exp);
  } catch (e) { next(e); }
}

/** POST /experiences  (HOST only) */
export async function createExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, location, isOnline, category, duration, price,
            maxGuests, languages, highlights, includes, photos, isGuestFav } = req.body;

    if (!title || !description || !location || !category || !duration || !price) {
      res.status(400).json({ error: "Missing required fields: title, description, location, category, duration, price" });
      return;
    }

    const exp = await prisma.experience.create({
      data: {
        title, description, location,
        isOnline:   Boolean(isOnline),
        category:   String(category),
        duration:   Number(duration),
        price:      Number(price),
        maxGuests:  Number(maxGuests ?? 10),
        languages:  Array.isArray(languages) ? languages : [],
        highlights: Array.isArray(highlights) ? highlights : [],
        includes:   Array.isArray(includes) ? includes : [],
        isGuestFav: Boolean(isGuestFav),
        hostId:     req.userId!,
        photos: {
          create: (Array.isArray(photos) ? photos as string[] : []).map((url: string) => ({ url })),
        },
      },
      include: FULL_INCLUDE,
    });
    res.status(201).json(exp);
  } catch (e) { next(e); }
}

/** PUT /experiences/:id */
export async function updateExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.experience.findUnique({ where: { id: param(req.params.id) } });
    if (!existing) { res.status(404).json({ error: "Experience not found" }); return; }
    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "Not your experience" }); return;
    }

    const { title, description, location, isOnline, category, duration, price,
            maxGuests, languages, highlights, includes, isPublished, isGuestFav } = req.body;

    const exp = await prisma.experience.update({
      where: { id: param(req.params.id) },
      data: {
        ...(title       !== undefined && { title }),
        ...(description !== undefined && { description }),
        ...(location    !== undefined && { location }),
        ...(isOnline    !== undefined && { isOnline:   Boolean(isOnline) }),
        ...(category    !== undefined && { category }),
        ...(duration    !== undefined && { duration:   Number(duration) }),
        ...(price       !== undefined && { price:      Number(price) }),
        ...(maxGuests   !== undefined && { maxGuests:  Number(maxGuests) }),
        ...(languages   !== undefined && { languages:  Array.isArray(languages) ? languages : [] }),
        ...(highlights  !== undefined && { highlights: Array.isArray(highlights) ? highlights : [] }),
        ...(includes    !== undefined && { includes:   Array.isArray(includes) ? includes : [] }),
        ...(isPublished !== undefined && { isPublished: Boolean(isPublished) }),
        ...(isGuestFav  !== undefined && { isGuestFav:  Boolean(isGuestFav) }),
      },
      include: FULL_INCLUDE,
    });
    res.json(exp);
  } catch (e) { next(e); }
}

/** DELETE /experiences/:id */
export async function deleteExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.experience.findUnique({ where: { id: param(req.params.id) } });
    if (!existing) { res.status(404).json({ error: "Experience not found" }); return; }
    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "Not your experience" }); return;
    }
    await prisma.experience.delete({ where: { id: param(req.params.id) } });
    res.json({ message: "Deleted" });
  } catch (e) { next(e); }
}

/** POST /experiences/:id/book */
export async function bookExperience(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const exp = await prisma.experience.findUnique({ where: { id: param(req.params.id) } });
    if (!exp) { res.status(404).json({ error: "Experience not found" }); return; }

    const { date, guests } = req.body;
    if (!date) { res.status(400).json({ error: "date is required" }); return; }

    const guestCount = Number(guests ?? 1);
    if (guestCount > exp.maxGuests) {
      res.status(400).json({ error: `Maximum ${exp.maxGuests} guests allowed` }); return;
    }

    const booking = await prisma.experienceBooking.create({
      data: {
        guestId:      req.userId!,
        experienceId: exp.id,
        date:         new Date(date as string),
        guests:       guestCount,
        totalPrice:   exp.price * guestCount,
        status:       "CONFIRMED",
      },
    });
    res.status(201).json(booking);
  } catch (e) { next(e); }
}
