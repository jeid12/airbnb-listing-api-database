import { z } from "zod";

export const createBookingSchema = z
  .object({
    listingId: z.number().int().positive("listingId must be a positive integer"),
    checkIn: z.coerce.date(),
    checkOut: z.coerce.date(),
  })
  .refine((data) => data.checkIn < data.checkOut, {
    message: "checkIn must be before checkOut",
    path: ["checkIn"],
  })
  .refine((data) => data.checkIn > new Date(), {
    message: "checkIn must be in the future",
    path: ["checkIn"],
  });
