import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";

/** GET /wishlists — current user's wishlists with items + listing summaries */
export async function getMyWishlists(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const wishlists = await prisma.wishlist.findMany({
      where: { userId: req.userId! },
      include: {
        items: {
          include: {
            listing: {
              select: {
                id: true,
                title: true,
                location: true,
                pricePerNight: true,
                type: true,
                rating: true,
                photos: { select: { url: true }, take: 1 },
              },
            },
          },
          orderBy: { addedAt: "desc" },
        },
      },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json(wishlists);
  } catch (error) {
    next(error);
  }
}

/** POST /wishlists — create a new wishlist */
export async function createWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name } = req.body;
    const wishlist = await prisma.wishlist.create({
      data: { name: String(name ?? "My Wishlist"), userId: req.userId! },
      include: { items: true },
    });
    res.status(201).json(wishlist);
  } catch (error) {
    next(error);
  }
}

/** DELETE /wishlists/:id — delete a wishlist */
export async function deleteWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const wishlist = await prisma.wishlist.findFirst({ where: { id: String(id) } });
    if (!wishlist) { res.status(404).json({ error: "Wishlist not found" }); return; }
    if (wishlist.userId !== req.userId) { res.status(403).json({ error: "Not your wishlist" }); return; }

    await prisma.wishlist.delete({ where: { id: String(id) } });
    res.status(200).json({ message: "Wishlist deleted" });
  } catch (error) {
    next(error);
  }
}

/** PUT /wishlists/:id — rename a wishlist */
export async function renameWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { name } = req.body;
    if (!name) { res.status(400).json({ error: "name is required" }); return; }

    const wishlist = await prisma.wishlist.findFirst({ where: { id: String(id) } });
    if (!wishlist) { res.status(404).json({ error: "Wishlist not found" }); return; }
    if (wishlist.userId !== req.userId) { res.status(403).json({ error: "Not your wishlist" }); return; }

    const updated = await prisma.wishlist.update({
      where: { id: String(id) },
      data: { name: String(name) },
    });
    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

/** POST /wishlists/:id/items — add listing to wishlist */
export async function addToWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { listingId } = req.body;
    if (!listingId) { res.status(400).json({ error: "listingId is required" }); return; }

    const wishlist = await prisma.wishlist.findFirst({ where: { id: String(id) } });
    if (!wishlist) { res.status(404).json({ error: "Wishlist not found" }); return; }
    if (wishlist.userId !== req.userId) { res.status(403).json({ error: "Not your wishlist" }); return; }

    const listing = await prisma.listing.findFirst({ where: { id: String(listingId) } });
    if (!listing) { res.status(404).json({ error: "Listing not found" }); return; }

    const item = await prisma.wishlistItem.upsert({
      where: { wishlistId_listingId: { wishlistId: String(id), listingId: String(listingId) } },
      create: { wishlistId: String(id), listingId: String(listingId) },
      update: {},
      include: { listing: { select: { id: true, title: true, location: true, pricePerNight: true } } },
    });
    res.status(201).json(item);
  } catch (error) {
    next(error);
  }
}

/** DELETE /wishlists/:id/items/:listingId — remove listing from wishlist */
export async function removeFromWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id, listingId } = req.params;

    const wishlist = await prisma.wishlist.findFirst({ where: { id: String(id) } });
    if (!wishlist) { res.status(404).json({ error: "Wishlist not found" }); return; }
    if (wishlist.userId !== req.userId) { res.status(403).json({ error: "Not your wishlist" }); return; }

    await prisma.wishlistItem.deleteMany({
      where: { wishlistId: String(id), listingId: String(listingId) },
    });
    res.status(200).json({ message: "Removed from wishlist" });
  } catch (error) {
    next(error);
  }
}

/** POST /wishlists/toggle — toggle a listing across the user's default wishlist */
export async function toggleWishlist(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { listingId } = req.body;
    if (!listingId) { res.status(400).json({ error: "listingId is required" }); return; }

    // Ensure the user has a default wishlist
    let wishlist = await prisma.wishlist.findFirst({
      where: { userId: req.userId!, name: "My Wishlist" },
    });
    if (!wishlist) {
      wishlist = await prisma.wishlist.create({
        data: { userId: req.userId!, name: "My Wishlist" },
      });
    }

    const existing = await prisma.wishlistItem.findUnique({
      where: { wishlistId_listingId: { wishlistId: wishlist.id, listingId: String(listingId) } },
    });

    if (existing) {
      await prisma.wishlistItem.delete({ where: { id: existing.id } });
      res.status(200).json({ saved: false, message: "Removed from wishlist" });
    } else {
      await prisma.wishlistItem.create({
        data: { wishlistId: wishlist.id, listingId: String(listingId) },
      });
      res.status(201).json({ saved: true, message: "Saved to wishlist" });
    }
  } catch (error) {
    next(error);
  }
}
