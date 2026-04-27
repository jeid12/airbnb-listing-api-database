import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { createUserSchema, updateUserSchema } from "../validators/users.validator";

const OMIT_SENSITIVE = { password: true, resetToken: true, resetTokenExpiry: true } as const;

export async function getAllUsers(_req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const users = await prisma.user.findMany({
      omit: OMIT_SENSITIVE,
      include: { _count: { select: { listings: true } } },
    });
    res.status(200).json(users);
  } catch (error) {
    next(error);
  }
}

export async function getUserById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findUnique({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    if (user.role === "HOST") {
      const result = await prisma.user.findUnique({
        where: { id: Number(id) },
        omit: OMIT_SENSITIVE,
        include: {
          listings: { include: { _count: { select: { bookings: true } } } },
          profile: true,
        },
      });
      res.status(200).json(result);
    } else {
      const result = await prisma.user.findUnique({
        where: { id: Number(id) },
        omit: OMIT_SENSITIVE,
        include: {
          bookings: {
            include: { listing: { select: { title: true, location: true } } },
          },
          profile: true,
        },
      });
      res.status(200).json(result);
    }
  } catch (error) {
    next(error);
  }
}

export async function createUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const user = await prisma.user.create({ data: result.data, omit: OMIT_SENSITIVE });
    res.status(201).json(user);
  } catch (error) {
    next(error);
  }
}

export async function updateUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findFirst({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    const result = updateUserSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const user = await prisma.user.update({
      where: { id: Number(id) },
      data: result.data,
      omit: OMIT_SENSITIVE,
    });

    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function deleteUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const existing = await prisma.user.findFirst({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    const user = await prisma.user.delete({ where: { id: Number(id) }, omit: OMIT_SENSITIVE });
    res.status(200).json(user);
  } catch (error) {
    next(error);
  }
}

export async function getListingsByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    const listings = await prisma.listing.findMany({
      where: { hostId: Number(id) },
      include: { _count: { select: { bookings: true } } },
    });
    res.status(200).json(listings);
  } catch (error) {
    next(error);
  }
}

export async function getBookingsByUser(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    const bookings = await prisma.booking.findMany({
      where: { guestId: Number(id) },
      include: { listing: { select: { title: true, location: true } } },
    });
    res.status(200).json(bookings);
  } catch (error) {
    next(error);
  }
}
