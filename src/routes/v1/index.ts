import { Router } from "express";
import { authRouter } from "./auth.routes";
import { usersRouter } from "./users.routes";
import { listingsRouter } from "./listings.routes";
import { bookingsRouter } from "./bookings.routes";
import { reviewsRouter } from "./reviews.routes";
import { wishlistsRouter } from "./wishlists.routes";
import { messagesRouter } from "./messages.routes";
import { experiencesRouter } from "./experiences.routes";
import { servicesRouter } from "./services.routes";
import { uploadRouter } from "./upload.routes";
import { aiRouter } from "./ai.routes";

export const v1Router = Router();

v1Router.use("/auth", authRouter);
v1Router.use("/users", usersRouter);
v1Router.use("/listings", listingsRouter);
v1Router.use("/bookings", bookingsRouter);
v1Router.use("/reviews", reviewsRouter);
v1Router.use("/wishlists",   wishlistsRouter);
v1Router.use("/messages",    messagesRouter);
v1Router.use("/experiences", experiencesRouter);
v1Router.use("/services",    servicesRouter);
v1Router.use("/ai", aiRouter);
v1Router.use("/", uploadRouter); // handles /users/:id/avatar and /listings/:id/photos
