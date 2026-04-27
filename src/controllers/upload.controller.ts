import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { uploadToCloudinary, deleteFromCloudinary } from "../config/cloudinary";

const OMIT_SENSITIVE = { password: true, resetToken: true, resetTokenExpiry: true } as const;



export async function uploadAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params["id"]);

    if (req.userId !== userId) {
      res.status(403).json({ error: "You can only update your own avatar" });
      return;
    }

    if (!req.file) {
      res.status(400).json({ error: "No file uploaded" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    // Delete old avatar from Cloudinary before uploading a new one
    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId).catch((e) =>
        console.error("[uploadAvatar] failed to delete old avatar:", e)
      );
    }

    const { url, publicId } = await uploadToCloudinary(req.file.buffer, "airbnb/avatars");

    const updated = await prisma.user.update({
      where: { id: userId },
      data: { avatar: url, avatarPublicId: publicId },
      omit: OMIT_SENSITIVE,
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteAvatar(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const userId = Number(req.params["id"]);

    if (req.userId !== userId) {
      res.status(403).json({ error: "You can only remove your own avatar" });
      return;
    }

    const user = await prisma.user.findFirst({ where: { id: userId } });
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (!user.avatar) {
      res.status(400).json({ error: "No avatar to remove" });
      return;
    }

    if (user.avatarPublicId) {
      await deleteFromCloudinary(user.avatarPublicId);
    }

    await prisma.user.update({
      where: { id: userId },
      data: { avatar: null, avatarPublicId: null },
    });

    res.status(200).json({ message: "Avatar removed successfully" });
  } catch (error) {
    next(error);
  }
}

// ── Listing Photos ─────────────────────────────────────────────────────────────

export async function uploadListingPhotos(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listingId = Number(req.params["id"]);

    const listing = await prisma.listing.findFirst({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ error: "You can only upload photos to your own listings" });
      return;
    }

    const existingCount = await prisma.listingPhoto.count({ where: { listingId } });
    if (existingCount >= 5) {
      res.status(400).json({ error: "Maximum of 5 photos allowed per listing" });
      return;
    }

    const files = req.files as Express.Multer.File[] | undefined;
    if (!files || files.length === 0) {
      res.status(400).json({ error: "No files uploaded" });
      return;
    }

    const remainingSlots = 5 - existingCount;
    const toProcess = files.slice(0, remainingSlots);

    await Promise.all(
      toProcess.map(async (file) => {
        const { url, publicId } = await uploadToCloudinary(file.buffer, "airbnb/listings");
        await prisma.listingPhoto.create({ data: { url, publicId, listingId } });
      })
    );

    const updated = await prisma.listing.findUnique({
      where: { id: listingId },
      include: { photos: true, host: { select: { name: true, avatar: true } } },
    });

    res.status(200).json(updated);
  } catch (error) {
    next(error);
  }
}

export async function deleteListingPhoto(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const listingId = Number(req.params["id"]);
    const photoId = Number(req.params["photoId"]);

    const listing = await prisma.listing.findFirst({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: "Listing not found" });
      return;
    }

    if (listing.hostId !== req.userId) {
      res.status(403).json({ error: "You can only delete photos from your own listings" });
      return;
    }

    const photo = await prisma.listingPhoto.findFirst({ where: { id: photoId } });
    if (!photo) {
      res.status(404).json({ error: "Photo not found" });
      return;
    }

    if (photo.listingId !== listingId) {
      res.status(403).json({ error: "Photo does not belong to this listing" });
      return;
    }

    await deleteFromCloudinary(photo.publicId);
    await prisma.listingPhoto.delete({ where: { id: photoId } });

    res.status(200).json({ message: "Photo deleted successfully" });
  } catch (error) {
    next(error);
  }
}
