import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import prisma from "../config/prisma";

const HOST_SELECT = { id: true, name: true, avatar: true, isSuperhost: true };

const FULL_INCLUDE = {
  host:   { select: HOST_SELECT },
  photos: { select: { id: true, url: true } },
};

/** GET /services */
export async function getAllServices(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { category, location, minPrice, maxPrice, page, limit } = req.query;
    const pageNum  = Math.max(1, parseInt(String(page  ?? "1"),  10));
    const limitNum = Math.max(1, Math.min(50, parseInt(String(limit ?? "12"), 10)));

    const where: Prisma.ServiceWhereInput = { isPublished: true };
    if (category && String(category) !== "all") where.category = String(category);
    if (location)  where.location = { contains: String(location), mode: "insensitive" };
    if (minPrice)  where.price = { ...(where.price as object ?? {}), gte: parseFloat(String(minPrice)) };
    if (maxPrice)  where.price = { ...(where.price as object ?? {}), lte: parseFloat(String(maxPrice)) };

    const [data, total] = await Promise.all([
      prisma.service.findMany({
        where, include: FULL_INCLUDE,
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.service.count({ where }),
    ]);

    res.json({ data, meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) } });
  } catch (e) { next(e); }
}

/** GET /services/:id */
export async function getServiceById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const svc = await prisma.service.findUnique({
      where: { id: req.params.id },
      include: FULL_INCLUDE,
    });
    if (!svc) { res.status(404).json({ error: "Service not found" }); return; }
    res.json(svc);
  } catch (e) { next(e); }
}

/** POST /services  (HOST only) */
export async function createService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { title, description, location, category, price, priceUnit,
            duration, tags, responseTime, photos, isGuestFav } = req.body;

    if (!title || !description || !location || !category || !price) {
      res.status(400).json({ error: "Missing required fields: title, description, location, category, price" });
      return;
    }

    const svc = await prisma.service.create({
      data: {
        title, description, location,
        category:     String(category),
        price:        Number(price),
        priceUnit:    String(priceUnit ?? "hour"),
        duration:     duration ? String(duration) : null,
        tags:         Array.isArray(tags) ? tags : [],
        responseTime: String(responseTime ?? "Within 2 hours"),
        isGuestFav:   Boolean(isGuestFav),
        hostId:       req.userId!,
        photos: {
          create: (Array.isArray(photos) ? photos as string[] : []).map((url: string) => ({ url })),
        },
      },
      include: FULL_INCLUDE,
    });
    res.status(201).json(svc);
  } catch (e) { next(e); }
}

/** PUT /services/:id */
export async function updateService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: "Service not found" }); return; }
    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "Not your service" }); return;
    }

    const { title, description, location, category, price, priceUnit,
            duration, tags, responseTime, isPublished, isGuestFav } = req.body;

    const svc = await prisma.service.update({
      where: { id: req.params.id },
      data: {
        ...(title        !== undefined && { title }),
        ...(description  !== undefined && { description }),
        ...(location     !== undefined && { location }),
        ...(category     !== undefined && { category }),
        ...(price        !== undefined && { price:       Number(price) }),
        ...(priceUnit    !== undefined && { priceUnit }),
        ...(duration     !== undefined && { duration:    duration ? String(duration) : null }),
        ...(tags         !== undefined && { tags:        Array.isArray(tags) ? tags : [] }),
        ...(responseTime !== undefined && { responseTime }),
        ...(isPublished  !== undefined && { isPublished: Boolean(isPublished) }),
        ...(isGuestFav   !== undefined && { isGuestFav:  Boolean(isGuestFav) }),
      },
      include: FULL_INCLUDE,
    });
    res.json(svc);
  } catch (e) { next(e); }
}

/** DELETE /services/:id */
export async function deleteService(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const existing = await prisma.service.findUnique({ where: { id: req.params.id } });
    if (!existing) { res.status(404).json({ error: "Service not found" }); return; }
    if (existing.hostId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "Not your service" }); return;
    }
    await prisma.service.delete({ where: { id: req.params.id } });
    res.json({ message: "Deleted" });
  } catch (e) { next(e); }
}
