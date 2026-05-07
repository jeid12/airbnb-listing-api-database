import { Request, Response, NextFunction } from "express";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import prisma from "../config/prisma";
import { sendEmail } from "../config/email";
import { welcomeEmail, passwordResetEmail } from "../templates/emails";
import {
  registerSchema,
  loginSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from "../validators/auth.validator";

const JWT_SECRET = process.env["JWT_SECRET"] as string;
const JWT_EXPIRES_IN = (process.env["JWT_EXPIRES_IN"] ?? "7d") as jwt.SignOptions["expiresIn"];

function omitPassword<T extends { password?: string | null }>(user: T): Omit<T, "password"> {
  const { password: _pwd, ...rest } = user;
  return rest;
}

export async function register(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const { password, ...rest } = result.data;

    const existing = await prisma.user.findFirst({
      where: { OR: [{ email: rest.email }, { username: rest.username }] },
    });
    if (existing) {
      res.status(409).json({ error: "Email or username already taken" });
      return;
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({
      data: { ...rest, password: hashed },
    });

    res.status(201).json(omitPassword(user));

    // Send welcome email after responding — failure must not block registration
    try {
      await sendEmail(user.email, "Welcome to Airbnb!", welcomeEmail(user.name, user.role));
    } catch (emailError) {
      console.error("[register] failed to send welcome email:", emailError);
    }
  } catch (error) {
    next(error);
  }
}

export async function login(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const { email, password } = result.data;

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user || !user.password) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const passwordMatch = await bcrypt.compare(password, user.password);
    if (!passwordMatch) {
      res.status(401).json({ error: "Invalid credentials" });
      return;
    }

    const token = jwt.sign(
      { userId: user.id, role: user.role },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );

    res.status(200).json({ token, user: omitPassword(user) });
  } catch (error) {
    next(error);
  }
}

export async function getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.userId },
    });

    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    if (user.role === "HOST") {
      const full = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          listings: { include: { _count: { select: { bookings: true } } } },
          profile: true,
        },
      });
      res.status(200).json(omitPassword(full!));
    } else {
      const full = await prisma.user.findUnique({
        where: { id: req.userId },
        include: {
          bookings: {
            include: { listing: { select: { title: true, location: true } } },
          },
          profile: true,
        },
      });
      res.status(200).json(omitPassword(full!));
    }
  } catch (error) {
    next(error);
  }
}

export async function changePassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = changePasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const { currentPassword, newPassword } = result.data;

    const user = await prisma.user.findUnique({ where: { id: req.userId } });
    if (!user || !user.password) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const match = await bcrypt.compare(currentPassword, user.password);
    if (!match) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }

    const hashed = await bcrypt.hash(newPassword, 10);
    await prisma.user.update({
      where: { id: req.userId },
      data: { password: hashed },
    });

    res.status(200).json({ message: "Password changed successfully" });
  } catch (error) {
    next(error);
  }
}

export async function forgotPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = forgotPasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const { email } = result.data;
    const SAFE_RESPONSE = { message: "If that email is registered, a reset link has been sent" };

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(200).json(SAFE_RESPONSE);
      return;
    }

    const rawToken = crypto.randomBytes(32).toString("hex");
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");
    const expiry = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await prisma.user.update({
      where: { id: user.id },
      data: { resetToken: hashedToken, resetTokenExpiry: expiry },
    });

    const BASE_URL = process.env["API_RESET_PASSWORD_URL"] ?? `http://localhost:${process.env["PORT"] ?? 3000}`;
    const resetLink = `${BASE_URL}/auth/reset-password/${rawToken}`;

    // Always log the raw token in development for easy .http file testing
    if (process.env["NODE_ENV"] !== "production") {
      console.log(`[DEV] Password reset token for ${email}:`);
      console.log(`  Token : ${rawToken}`);
      console.log(`  Link  : ${resetLink}`);
    }

    res.status(200).json(SAFE_RESPONSE);

    try {
      await sendEmail(user.email, "Reset your Airbnb password", passwordResetEmail(user.name, resetLink));
    } catch (emailError) {
      console.error("[forgotPassword] failed to send reset email:", emailError);
    }
  } catch (error) {
    next(error);
  }
}

export async function resetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const rawToken = String(req.params["token"]);
    const hashedToken = crypto.createHash("sha256").update(rawToken).digest("hex");

    const user = await prisma.user.findFirst({
      where: {
        resetToken: hashedToken,
        resetTokenExpiry: { gt: new Date() },
      },
    });

    if (!user) {
      res.status(400).json({ error: "Invalid or expired reset token" });
      return;
    }

    const result = resetPasswordSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const hashed = await bcrypt.hash(result.data.password, 10);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashed, resetToken: null, resetTokenExpiry: null },
    });

    res.status(200).json({ message: "Password reset successfully" });
  } catch (error) {
    next(error);
  }
}

export async function updateMe(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { name, username, phone, bio, avatar } = req.body;
    const data: Record<string, unknown> = {};
    if (name)     data["name"]     = String(name);
    if (username) data["username"] = String(username);
    if (phone)    data["phone"]    = String(phone);
    if (bio !== undefined) data["bio"] = bio ? String(bio) : null;
    if (avatar !== undefined) data["avatar"] = avatar ? String(avatar) : null;

    const user = await prisma.user.update({
      where: { id: req.userId! },
      data,
    });
    res.status(200).json(omitPassword(user));
  } catch (error) {
    next(error);
  }
}

export async function getMyBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pageNum  = Math.max(1, parseInt(String(req.query["page"]  ?? "1"),  10));
    const limitNum = Math.max(1, parseInt(String(req.query["limit"] ?? "10"), 10));
    const status   = req.query["status"] ? String(req.query["status"]).toUpperCase() : undefined;

    const where = {
      guestId: req.userId!,
      ...(status ? { status: status as import("@prisma/client").BookingStatus } : {}),
    };

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        where,
        include: {
          listing: {
            select: {
              id: true, title: true, location: true, type: true, pricePerNight: true,
              photos: { select: { url: true }, take: 1 },
              host: { select: { id: true, name: true, avatar: true } },
            },
          },
          review: { select: { id: true, rating: true, comment: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.booking.count({ where }),
    ]);

    res.status(200).json({
      data: bookings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getMyListings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pageNum  = Math.max(1, parseInt(String(req.query["page"]  ?? "1"),  10));
    const limitNum = Math.max(1, parseInt(String(req.query["limit"] ?? "10"), 10));

    const [listings, total] = await Promise.all([
      prisma.listing.findMany({
        where: { hostId: req.userId! },
        include: {
          photos: { select: { url: true }, take: 1 },
          _count: { select: { bookings: true, reviews: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.listing.count({ where: { hostId: req.userId! } }),
    ]);

    res.status(200).json({
      data: listings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}
