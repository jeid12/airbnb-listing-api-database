import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";

const pool = new pg.Pool({
  connectionString: process.env["DATABASE_URL"] as string,
});
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

async function main() {
  console.log("🌱 Seeding database...");

  // Clean existing data — children before parents
  await prisma.booking.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();

  const hashedPassword = await bcrypt.hash("password123", 10);

  
  const alice = await prisma.user.create({
    data: {
      name: "Alice Johnson",
      email: "alice@example.com",
      username: "alice_j",
      phone: "+1-555-0101",
      password: hashedPassword,
      role: "HOST",
      avatar: "https://randomuser.me/api/portraits/women/1.jpg",
      bio: "Superhost with 100+ 5-star reviews across NYC",
    },
  });

  const carol = await prisma.user.create({
    data: {
      name: "Carol Davis",
      email: "carol@example.com",
      username: "carol_d",
      phone: "+1-555-0103",
      password: hashedPassword,
      role: "HOST",
      avatar: "https://randomuser.me/api/portraits/women/3.jpg",
      bio: "Local host in San Francisco with beachfront properties",
    },
  });

  const bob = await prisma.user.create({
    data: {
      name: "Bob Smith",
      email: "bob@example.com",
      username: "bob_s",
      phone: "+1-555-0102",
      password: hashedPassword,
      role: "GUEST",
      avatar: "https://randomuser.me/api/portraits/men/2.jpg",
      bio: "Travel enthusiast from NYC",
    },
  });

  const dave = await prisma.user.create({
    data: {
      name: "Dave Wilson",
      email: "dave@example.com",
      username: "dave_w",
      phone: "+1-555-0104",
      password: hashedPassword,
      role: "GUEST",
      bio: "Digital nomad, loves mountains",
    },
  });

  const emma = await prisma.user.create({
    data: {
      name: "Emma Brown",
      email: "emma@example.com",
      username: "emma_b",
      phone: "+1-555-0105",
      password: hashedPassword,
      role: "GUEST",
      avatar: "https://randomuser.me/api/portraits/women/5.jpg",
      bio: "Weekend explorer and foodie",
    },
  });

  console.log(`  ✓ Created 5 users (2 hosts, 3 guests)`);

  // ── Listings ──────────────────────────────────────────────────────────────
  const apartment = await prisma.listing.create({
    data: {
      title: "Cozy Downtown Apartment",
      description: "Beautiful 1-bedroom apartment in the heart of New York City. Steps from Central Park and world-class dining.",
      location: "Downtown, New York",
      pricePerNight: 150,
      guests: 2,
      type: "APARTMENT",
      amenities: ["WiFi", "Air Conditioning", "Kitchen", "Gym", "Doorman"],
      rating: 4.8,
      hostId: alice.id,
    },
  });

  const house = await prisma.listing.create({
    data: {
      title: "Charming Victorian House",
      description: "Spacious 3-bedroom Victorian home with original hardwood floors and a sunny backyard garden.",
      location: "Mission District, San Francisco",
      pricePerNight: 280,
      guests: 6,
      type: "HOUSE",
      amenities: ["WiFi", "Washer/Dryer", "Kitchen", "Garden", "Parking", "BBQ"],
      rating: 4.7,
      hostId: carol.id,
    },
  });

  const villa = await prisma.listing.create({
    data: {
      title: "Beachfront Luxury Villa",
      description: "Stunning oceanfront villa with private pool, infinity views, and direct beach access. Perfect for a family getaway.",
      location: "Malibu, California",
      pricePerNight: 650,
      guests: 10,
      type: "VILLA",
      amenities: ["WiFi", "Pool", "Hot Tub", "Beach Access", "Parking", "Chef's Kitchen", "Home Theater"],
      rating: 4.9,
      hostId: alice.id,
    },
  });

  const cabin = await prisma.listing.create({
    data: {
      title: "Mountain Cabin Retreat",
      description: "Rustic yet modern cabin surrounded by towering pines and hiking trails. Stargazing deck and stone fireplace.",
      location: "Rocky Mountain National Park, Colorado",
      pricePerNight: 120,
      guests: 4,
      type: "CABIN",
      amenities: ["Fireplace", "Kitchen", "Heating", "Hiking Access", "Stargazing Deck"],
      rating: 4.9,
      hostId: carol.id,
    },
  });

  console.log(`  ✓ Created 4 listings (APARTMENT, HOUSE, VILLA, CABIN)`);

  // ── Bookings ──────────────────────────────────────────────────────────────
  const booking1CheckIn = new Date("2026-07-01");
  const booking1CheckOut = new Date("2026-07-05");
  const booking1Nights = Math.ceil(
    (booking1CheckOut.getTime() - booking1CheckIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  const booking1 = await prisma.booking.create({
    data: {
      guestId: bob.id,
      listingId: apartment.id,
      checkIn: booking1CheckIn,
      checkOut: booking1CheckOut,
      totalPrice: booking1Nights * apartment.pricePerNight,
      status: "CONFIRMED",
    },
  });

  const booking2CheckIn = new Date("2026-08-10");
  const booking2CheckOut = new Date("2026-08-17");
  const booking2Nights = Math.ceil(
    (booking2CheckOut.getTime() - booking2CheckIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  const booking2 = await prisma.booking.create({
    data: {
      guestId: dave.id,
      listingId: cabin.id,
      checkIn: booking2CheckIn,
      checkOut: booking2CheckOut,
      totalPrice: booking2Nights * cabin.pricePerNight,
      status: "PENDING",
    },
  });

  const booking3CheckIn = new Date("2026-09-15");
  const booking3CheckOut = new Date("2026-09-20");
  const booking3Nights = Math.ceil(
    (booking3CheckOut.getTime() - booking3CheckIn.getTime()) / (1000 * 60 * 60 * 24)
  );

  const booking3 = await prisma.booking.create({
    data: {
      guestId: emma.id,
      listingId: villa.id,
      checkIn: booking3CheckIn,
      checkOut: booking3CheckOut,
      totalPrice: booking3Nights * villa.pricePerNight,
      status: "CONFIRMED",
    },
  });

  console.log(`  ✓ Created 3 bookings:`);
  console.log(`    - Bob  → Apartment  (${booking1Nights} nights, $${booking1.totalPrice}) [CONFIRMED]`);
  console.log(`    - Dave → Cabin      (${booking2Nights} nights, $${booking2.totalPrice}) [PENDING]`);
  console.log(`    - Emma → Villa      (${booking3Nights} nights, $${booking3.totalPrice}) [CONFIRMED]`);

  console.log("\n✅ Seeding complete!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    await pool.end();
  });
