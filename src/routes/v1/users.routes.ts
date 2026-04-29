import { Router } from "express";
import {
  getAllUsers,
  getUserById,
  createUser,
  updateUser,
  deleteUser,
  getListingsByUser,
  getBookingsByUser,
} from "../../controllers/users.controller";
import {
  getProfile,
  createProfile,
  updateProfile,
} from "../../controllers/profile.controller";
import { getUserStats } from "../../controllers/stats.controller";

export const usersRouter = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     User:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         name:
 *           type: string
 *           example: Alice Johnson
 *         email:
 *           type: string
 *           format: email
 *           example: alice@example.com
 *         username:
 *           type: string
 *           example: alice_j
 *         phone:
 *           type: string
 *           example: "+1-555-0101"
 *         role:
 *           type: string
 *           enum: [HOST, GUEST, ADMIN]
 *           example: HOST
 *         avatar:
 *           type: string
 *           nullable: true
 *           example: "https://res.cloudinary.com/demo/image/upload/avatar.jpg"
 *         bio:
 *           type: string
 *           nullable: true
 *           example: Superhost with 100+ 5-star reviews
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-01T00:00:00.000Z"
 *     Listing:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         title:
 *           type: string
 *           example: Cozy Downtown Apartment
 *         description:
 *           type: string
 *           example: Beautiful 1-bedroom apartment in the heart of the city
 *         location:
 *           type: string
 *           example: "Downtown, New York"
 *         pricePerNight:
 *           type: number
 *           example: 150
 *         guests:
 *           type: integer
 *           example: 2
 *         type:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *           example: APARTMENT
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen, Gym]
 *         rating:
 *           type: number
 *           nullable: true
 *           example: 4.8
 *         hostId:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-01T00:00:00.000Z"
 *     Booking:
 *       type: object
 *       properties:
 *         id:
 *           type: integer
 *           example: 1
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: "2025-07-01T12:00:00.000Z"
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: "2025-07-05T12:00:00.000Z"
 *         totalPrice:
 *           type: number
 *           example: 600
 *         status:
 *           type: string
 *           enum: [PENDING, CONFIRMED, CANCELLED]
 *           example: CONFIRMED
 *         guestId:
 *           type: integer
 *           example: 2
 *         listingId:
 *           type: integer
 *           example: 1
 *         createdAt:
 *           type: string
 *           format: date-time
 *           example: "2025-01-01T00:00:00.000Z"
 *     RegisterInput:
 *       type: object
 *       required: [name, email, username, phone, password]
 *       properties:
 *         name:
 *           type: string
 *           example: Alice Johnson
 *         email:
 *           type: string
 *           format: email
 *           example: alice@example.com
 *         username:
 *           type: string
 *           example: alice_j
 *         phone:
 *           type: string
 *           example: "+1-555-0101"
 *         password:
 *           type: string
 *           format: password
 *           minLength: 8
 *           example: password123
 *         role:
 *           type: string
 *           enum: [HOST, GUEST]
 *           default: GUEST
 *     LoginInput:
 *       type: object
 *       required: [email, password]
 *       properties:
 *         email:
 *           type: string
 *           format: email
 *           example: alice@example.com
 *         password:
 *           type: string
 *           format: password
 *           example: password123
 *     CreateListingInput:
 *       type: object
 *       required: [title, description, location, pricePerNight, guests, type, amenities]
 *       properties:
 *         title:
 *           type: string
 *           minLength: 5
 *           example: Cozy Downtown Apartment
 *         description:
 *           type: string
 *           minLength: 10
 *           example: Beautiful apartment in the heart of the city
 *         location:
 *           type: string
 *           example: "Downtown, New York"
 *         pricePerNight:
 *           type: number
 *           example: 150
 *         guests:
 *           type: integer
 *           minimum: 1
 *           example: 2
 *         type:
 *           type: string
 *           enum: [APARTMENT, HOUSE, VILLA, CABIN]
 *           example: APARTMENT
 *         amenities:
 *           type: array
 *           items:
 *             type: string
 *           example: [WiFi, Kitchen]
 *         rating:
 *           type: number
 *           minimum: 0
 *           maximum: 5
 *           example: 4.8
 *     CreateBookingInput:
 *       type: object
 *       required: [listingId, checkIn, checkOut]
 *       properties:
 *         listingId:
 *           type: integer
 *           example: 1
 *         checkIn:
 *           type: string
 *           format: date-time
 *           example: "2027-07-01T12:00:00Z"
 *         checkOut:
 *           type: string
 *           format: date-time
 *           example: "2027-07-05T12:00:00Z"
 *     ErrorResponse:
 *       type: object
 *       properties:
 *         error:
 *           type: string
 *           example: Resource not found
 *     AuthResponse:
 *       type: object
 *       properties:
 *         token:
 *           type: string
 *           example: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
 *         user:
 *           $ref: '#/components/schemas/User'
 *   responses:
 *     BadRequest:
 *       description: Validation error
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Unauthorized:
 *       description: Missing or invalid token
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Forbidden:
 *       description: Insufficient permissions
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     NotFound:
 *       description: Resource not found
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 *     Conflict:
 *       description: Resource already exists
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/ErrorResponse'
 */

/**
 * @swagger
 * /users:
 *   get:
 *     tags: [Users]
 *     summary: Get all users
 *     responses:
 *       200:
 *         description: List of users
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/User'
 */
usersRouter.get("/", getAllUsers);

/**
 * @swagger
 * /users/stats:
 *   get:
 *     tags: [Users]
 *     summary: User statistics (cached 5 min)
 *     description: Returns total user count and breakdown by role. Cached for 5 minutes.
 *     responses:
 *       200:
 *         description: User stats
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 totalUsers: { type: integer }
 *                 byRole:
 *                   type: array
 *                   items: { type: object }
 */
usersRouter.get("/stats", getUserStats);

/**
 * @swagger
 * /users/{id}:
 *   get:
 *     tags: [Users]
 *     summary: Get user by ID
 *     description: Returns HOST with their listings, or GUEST with their bookings.
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: User details
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
usersRouter.get("/:id", getUserById);

/**
 * @swagger
 * /users:
 *   post:
 *     tags: [Users]
 *     summary: Create a user (admin use — prefer /auth/register)
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       201:
 *         description: Created user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       409:
 *         $ref: '#/components/responses/Conflict'
 */
usersRouter.post("/", createUser);

/**
 * @swagger
 * /users/{id}:
 *   put:
 *     tags: [Users]
 *     summary: Update a user
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
 *             $ref: '#/components/schemas/RegisterInput'
 *     responses:
 *       200:
 *         description: Updated user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       400:
 *         $ref: '#/components/responses/BadRequest'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
usersRouter.put("/:id", updateUser);

/**
 * @swagger
 * /users/{id}:
 *   delete:
 *     tags: [Users]
 *     summary: Delete a user
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Deleted user
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/User'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
usersRouter.delete("/:id", deleteUser);

/**
 * @swagger
 * /users/{id}/listings:
 *   get:
 *     tags: [Listings]
 *     summary: Get all listings for a host
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Host's user ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Listings
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Listing'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
usersRouter.get("/:id/listings", getListingsByUser);

/**
 * @swagger
 * /users/{id}/bookings:
 *   get:
 *     tags: [Bookings]
 *     summary: Get all bookings for a guest
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         description: Guest's user ID
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Bookings with listing details
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/Booking'
 *       404:
 *         $ref: '#/components/responses/NotFound'
 */
usersRouter.get("/:id/bookings", getBookingsByUser);

usersRouter.get("/:id/profile", getProfile);
usersRouter.post("/:id/profile", createProfile);
usersRouter.put("/:id/profile", updateProfile);
