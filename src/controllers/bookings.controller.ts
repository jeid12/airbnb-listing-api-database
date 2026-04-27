import { Request, Response, NextFunction } from "express";
import { BookingStatus } from "@prisma/client";
import prisma from "../config/prisma";
import { sendEmail } from "../config/email";
import { bookingConfirmationEmail, bookingCancellationEmail } from "../templates/emails";
import { createBookingSchema } from "../validators/bookings.validator";

function fmt(date: Date): string {
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export async function getAllBookings(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const pageNum = Math.max(1, parseInt(String(req.query["page"] ?? "1"), 10));
    const limitNum = Math.max(1, parseInt(String(req.query["limit"] ?? "10"), 10));

    const [bookings, total] = await Promise.all([
      prisma.booking.findMany({
        include: {
          guest: { select: { name: true } },
          listing: { select: { title: true, location: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: (pageNum - 1) * limitNum,
        take: limitNum,
      }),
      prisma.booking.count(),
    ]);

    res.status(200).json({
      data: bookings,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
}

export async function getBookingById(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const booking = await prisma.booking.findUnique({
      where: { id: Number(id) },
      include: {
        guest: { select: { id: true, name: true, email: true, username: true, avatar: true } },
        listing: {
          include: { host: { select: { name: true } } },
        },
      },
    });

    if (!booking) {
      res.status(404).json({ error: `Booking with id ${id} not found` });
      return;
    }

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
}

export async function createBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const result = createBookingSchema.safeParse(req.body);
    if (!result.success) {
      res.status(400).json({ errors: result.error.issues });
      return;
    }

    const { listingId, checkIn, checkOut } = result.data;
    const guestId = req.userId!; // always from the verified token

    const listing = await prisma.listing.findFirst({ where: { id: listingId } });
    if (!listing) {
      res.status(404).json({ error: `Listing with id ${listingId} not found` });
      return;
    }

    // Overlap check: any CONFIRMED booking where checkIn < newCheckOut AND checkOut > newCheckIn
    const conflict = await prisma.booking.findFirst({
      where: {
        listingId,
        status: BookingStatus.CONFIRMED,
        checkIn: { lt: checkOut },
        checkOut: { gt: checkIn },
      },
    });
    if (conflict) {
      res.status(409).json({ error: "Listing is already booked for these dates" });
      return;
    }

    const nights = Math.ceil((checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24));
    const totalPrice = nights * listing.pricePerNight;

    const booking = await prisma.booking.create({
      data: {
        guestId,
        listingId,
        checkIn,
        checkOut,
        totalPrice,
        status: BookingStatus.PENDING,
      },
      include: {
        guest: { select: { name: true } },
        listing: { select: { title: true } },
      },
    });

    res.status(201).json(booking);

    try {
      const guest = await prisma.user.findUnique({ where: { id: guestId } });
      if (guest) {
        await sendEmail(
          guest.email,
          "Your booking is confirmed!",
          bookingConfirmationEmail(
            guest.name,
            listing.title,
            listing.location,
            fmt(checkIn),
            fmt(checkOut),
            totalPrice
          )
        );
      }
    } catch (emailError) {
      console.error("[createBooking] failed to send confirmation email:", emailError);
    }
  } catch (error) {
    next(error);
  }
}

export async function deleteBooking(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;

    const booking = await prisma.booking.findFirst({ where: { id: Number(id) } });
    if (!booking) {
      res.status(404).json({ error: `Booking with id ${id} not found` });
      return;
    }

    if (booking.guestId !== req.userId && req.role !== "ADMIN") {
      res.status(403).json({ error: "You can only cancel your own bookings" });
      return;
    }

    if (booking.status === BookingStatus.CANCELLED) {
      res.status(400).json({ error: "Booking is already cancelled" });
      return;
    }

    // Cancel — keep the record for history, just update status
    const updated = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: BookingStatus.CANCELLED },
      include: { listing: { select: { title: true } } },
    });

    res.status(200).json(updated);

    try {
      const guest = await prisma.user.findUnique({ where: { id: booking.guestId } });
      if (guest) {
        await sendEmail(
          guest.email,
          "Your booking has been cancelled",
          bookingCancellationEmail(
            guest.name,
            (updated as typeof updated & { listing: { title: string } }).listing.title,
            fmt(booking.checkIn),
            fmt(booking.checkOut)
          )
        );
      }
    } catch (emailError) {
      console.error("[deleteBooking] failed to send cancellation email:", emailError);
    }
  } catch (error) {
    next(error);
  }
}

export async function updateBookingStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status || !Object.values(BookingStatus).includes(status as BookingStatus)) {
      res.status(400).json({ error: `status must be one of: ${Object.values(BookingStatus).join(", ")}` });
      return;
    }

    const existing = await prisma.booking.findFirst({ where: { id: Number(id) } });
    if (!existing) {
      res.status(404).json({ error: `Booking with id ${id} not found` });
      return;
    }

    const booking = await prisma.booking.update({
      where: { id: Number(id) },
      data: { status: status as BookingStatus },
    });

    res.status(200).json(booking);
  } catch (error) {
    next(error);
  }
}
