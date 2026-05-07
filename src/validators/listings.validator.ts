import { z } from "zod";

export const createListingSchema = z.object({
  title:         z.string().min(5, "Title must be at least 5 characters"),
  description:   z.string().min(10, "Description must be at least 10 characters"),
  location:      z.string().min(2, "Location is required"),
  pricePerNight: z.number().positive("Price must be positive"),
  guests:        z.number().int().min(1, "Must allow at least 1 guest"),
  bedrooms:      z.number().int().min(0).optional().default(1),
  beds:          z.number().int().min(1).optional().default(1),
  bathrooms:     z.number().min(0.5).optional().default(1),
  type:          z.enum(["APARTMENT", "HOUSE", "VILLA", "CABIN"]),
  category:      z.string().optional().default("trending"),
  amenities:     z.array(z.string()).min(1, "At least one amenity is required"),
  rating:        z.number().min(0).max(5).optional(),
});

export const updateListingSchema = createListingSchema.partial();
