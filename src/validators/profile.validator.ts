import { z } from "zod";

export const createProfileSchema = z.object({
  bio: z.string().max(300, "Bio must be 300 characters or less").optional(),
  website: z.string().url("Invalid URL format").optional(),
  country: z.string().optional(),
});

export const updateProfileSchema = createProfileSchema;
