import { Router } from "express";
import {
  getMyWishlists,
  createWishlist,
  deleteWishlist,
  renameWishlist,
  addToWishlist,
  removeFromWishlist,
  toggleWishlist,
} from "../../controllers/wishlists.controller";
import { authenticate } from "../../middlewares/auth.middleware";

export const wishlistsRouter = Router();

// All wishlist routes require authentication
wishlistsRouter.use(authenticate);

wishlistsRouter.get("/",                            getMyWishlists);
wishlistsRouter.post("/",                           createWishlist);
wishlistsRouter.post("/toggle",                     toggleWishlist);
wishlistsRouter.put("/:id",                         renameWishlist);
wishlistsRouter.delete("/:id",                      deleteWishlist);
wishlistsRouter.post("/:id/items",                  addToWishlist);
wishlistsRouter.delete("/:id/items/:listingId",     removeFromWishlist);
