import { Router } from "express";
import {
  getAllExperiences, getExperienceById,
  createExperience, updateExperience, deleteExperience,
  bookExperience,
} from "../../controllers/experiences.controller";
import { authenticate, requireHost } from "../../middlewares/auth.middleware";

export const experiencesRouter = Router();

experiencesRouter.get("/",          getAllExperiences);
experiencesRouter.get("/:id",       getExperienceById);
experiencesRouter.post("/",         authenticate, requireHost, createExperience);
experiencesRouter.put("/:id",       authenticate, updateExperience);
experiencesRouter.delete("/:id",    authenticate, deleteExperience);
experiencesRouter.post("/:id/book", authenticate, bookExperience);
