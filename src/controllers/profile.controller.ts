import { Request, Response, NextFunction } from "express";
import prisma from "../config/prisma";
import { createProfileSchema, updateProfileSchema } from "../validators/profile.validator";

export async function getProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const profile = await prisma.profile.findUnique({ where: { userId: Number(id) } });
    if (!profile) {
      res.status(404).json({ error: `Profile for user ${id} not found` });
      return;
    }

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
}

export async function createProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { userId: Number(id) } });
    if (existing) {
      res.status(409).json({ error: `User ${id} already has a profile` });
      return;
    }

    const result = createProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const profile = await prisma.profile.create({
      data: { ...result.data, userId: Number(id) },
    });

    res.status(201).json(profile);
  } catch (error) {
    next(error);
  }
}

export async function updateProfile(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const user = await prisma.user.findFirst({ where: { id: Number(id) } });
    if (!user) {
      res.status(404).json({ error: `User with id ${id} not found` });
      return;
    }

    const existing = await prisma.profile.findUnique({ where: { userId: Number(id) } });
    if (!existing) {
      res.status(404).json({ error: `Profile for user ${id} not found` });
      return;
    }

    const result = updateProfileSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const profile = await prisma.profile.update({
      where: { userId: Number(id) },
      data: result.data,
    });

    res.status(200).json(profile);
  } catch (error) {
    next(error);
  }
}
