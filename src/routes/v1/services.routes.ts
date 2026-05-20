import { Router } from "express";
import {
  getAllServices, getServiceById,
  createService, updateService, deleteService,
} from "../../controllers/services.controller";
import { authenticate, requireHost } from "../../middlewares/auth.middleware";

export const servicesRouter = Router();

servicesRouter.get("/",       getAllServices);
servicesRouter.get("/:id",    getServiceById);
servicesRouter.post("/",      authenticate, requireHost, createService);
servicesRouter.put("/:id",    authenticate, updateService);
servicesRouter.delete("/:id", authenticate, deleteService);
