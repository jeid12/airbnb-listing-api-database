import { z } from "zod";

export const createBookingSchema = z
  .object({
    listingId: z.string().min(1, "listingId is required"),
    checkIn:   z.coerce.date(),
    checkOut:  z.coerce.date(),
    guests:    z.coerce.number().int().min(1).optional().default(1),
  })
  .refine((d) => d.checkIn < d.checkOut, {
    message: "checkIn must be before checkOut",
    path: ["checkIn"],
  })
  .refine((d) => d.checkIn > new Date(), {
    message: "checkIn must be in the future",
    path: ["checkIn"],
  });
