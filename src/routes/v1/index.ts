import { Router } from "express";
import { authRouter } from "./auth.routes";
import { usersRouter } from "./users.routes";
import { listingsRouter } from "./listings.routes";
import { bookingsRouter } from "./bookings.routes";
import { reviewsRouter } from "./reviews.routes";
import { uploadRouter } from "./upload.routes";
import { aiRouter } from "./ai.routes";

export const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/listings", listingsRouter);
v1Router.use("/bookings", bookingsRouter);
v1Router.use("/reviews", reviewsRouter);
v1Router.use("/ai", aiRouter);
v1Router.use("/", uploadRouter); // handles /users/:id/avatar and /listings/:id/photos
