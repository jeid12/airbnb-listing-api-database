import { Router } from "express";
import {
  getAllListings,
  searchListings,
  getListingById,
  createListing,
  updateListing,
  deleteListing,
} from "../controllers/listings.controller";
import { getListingStats } from "../controllers/stats.controller";
import { getListingReviews, createReview } from "../controllers/reviews.controller";
import { authenticate, requireHost } from "../middlewares/auth.middleware";

export const listingsRouter = Router();

/**
 * @swagger
 * /listings:
 *   get:
 *     tags: [Listings]
 *     summary: Get all listings
 *     parameters:
 *       - in: query
 *         name: location
 *         schema:
 *           type: string
 *         description: Case-insensitive partial match on location
 *       - in: query
 *         name: type
 *         schema:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *       - in: query
 *         name: maxPrice
 *         schema:
 *           type: number
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [pricePerNight, createdAt]
 *       - in: query
 *         name: order
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *     responses:
 *       200:
 *         description: Paginated listing results
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Listing'
 *                 meta:
 *                   type: object
 *                   properties:
 *                     page:
 *                       type: integer
 *                     limit:
 *                       type: integer
 *                     total:
 *                       type: integer
 *                     totalPages:
 *                       type: integer
 */
listingsRouter.get("/", getAllListings);

/**
 * @swagger
 * /listings/search:
 *   get:
 *     tags: [Listings]
 *     summary: Search listings with filters
 *     parameters:
 *       - in: query
 *         name: location
 *         schema: { type: string }
 *       - in: query
 *         name: type
 *         schema: { type: string, enum: [APARTMENT, HOUSE, VILLA, CABIN] }
 *       - in: query
 *         name: minPrice
 *         schema: { type: number }
 *       - in: query
 *         name: maxPrice
 *         schema: { type: number }
 *       - in: query
 *         name: guests
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Filtered + paginated listings with host name/email
 */
listingsRouter.get("/search", searchListings);

/**
 * @swagger
 * /listings/stats:
 *   get:
 *     tags: [Listings]
 *     summary: Listing statistics (cached 5 min)
 *     description: Returns total, average price, count by location, count by type. Result cached for 5 minutes.
 *     responses:
 *       200:
 *         description: Listing stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalListings: { type: integer }
 *                 averagePrice: { type: number }
 *                 byLocation:
 *                   type: array
 *                   items: { type: object }
 *                 byType:
 *                   type: array
 *                   items: { type: object }
 */
listingsRouter.get("/stats", getListingStats);


/**
 * @swagger
 * /listings/{id}:
 *   get:
 *     tags: [Listings]
 *     summary: Get a listing by ID
 *     description: Includes full host details and all bookings with guest info.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listing with host and bookings
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
listingsRouter.get("/:id", getListingById);

/**
 * @swagger
 * /listings:
 *   post:
 *     tags: [Listings]
 *     summary: Create a listing
 *     description: HOST role required. The hostId is taken from the JWT token — do not send it in the body.
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateListingInput'
 *     responses:
 *       201:
 *         description: Created listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 */
listingsRouter.post("/", authenticate, requireHost, createListing);

/**
 * @swagger
 * /listings/{id}:
 *   put:
 *     tags: [Listings]
 *     summary: Update a listing
 *     description: Only the listing's host or an ADMIN can update. All fields are optional.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateListingInput'
 *     responses:
 *       200:
 *         description: Updated listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
listingsRouter.put("/:id", authenticate, updateListing);

/**
 * @swagger
 * /listings/{id}:
 *   delete:
 *     tags: [Listings]
 *     summary: Delete a listing
 *     description: Only the listing's host or an ADMIN can delete.
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted listing
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Listing'
 *       401:
 *         $ref: '#/components/responses/Unauthorized'
 *       403:
 *         $ref: '#/components/responses/Forbidden'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
listingsRouter.delete("/:id", authenticate, deleteListing);

/**
 * @swagger
 * /listings/{id}/reviews:
 *   get:
 *     tags: [Reviews]
 *     summary: Get reviews for a listing (paginated, cached 30s)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated reviews with reviewer name and avatar
 *       404:
 *         $ref: '#/components/responses/NotFound'
 *   post:
 *     tags: [Reviews]
 *     summary: Add a review to a listing
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [rating, comment]
 *             properties:
 *               rating:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 5
 *               comment:
 *                 type: string
 *     responses:
 *       201:
 *         description: Created review
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
listingsRouter.get("/:id/reviews", getListingReviews);
listingsRouter.post("/:id/reviews", authenticate, createReview);
