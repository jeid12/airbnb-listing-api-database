import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";

const pool = new pg.Pool({ connectionString: process.env["DATABASE_URL"] as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ── Static data arrays ────────────────────────────────────────────────────────

const FIRST_NAMES = [
  "Alice", "Bob", "Carol", "Dave", "Emma", "Frank", "Grace", "Henry",
  "Iris", "Jack", "Karen", "Liam", "Maya", "Noah", "Olivia", "Paul",
  "Quinn", "Rosa", "Sam", "Tina", "Uma", "Victor", "Wendy", "Xavier",
  "Yara", "Zack", "Amber", "Brian", "Chloe", "Daniel",
];

const LAST_NAMES = [
  "Johnson", "Smith", "Williams", "Brown", "Jones", "Garcia", "Miller",
  "Davis", "Wilson", "Taylor", "Anderson", "Thomas", "Jackson", "White",
  "Harris", "Martin", "Thompson", "Young", "Lee", "Walker", "Hall",
  "Allen", "King", "Wright", "Scott", "Torres", "Mitchell", "Nelson",
  "Carter", "Ramirez",
];

const LOCATIONS = [
  "Downtown, New York", "Brooklyn, New York", "Harlem, New York",
  "Mission District, San Francisco", "SoMa, San Francisco", "Nob Hill, San Francisco",
  "West Hollywood, Los Angeles", "Silver Lake, Los Angeles", "Venice Beach, Los Angeles",
  "Lincoln Park, Chicago", "Wicker Park, Chicago", "The Loop, Chicago",
  "South Beach, Miami", "Wynwood, Miami", "Coral Gables, Miami",
  "Downtown, Austin", "East Austin, Texas", "South Congress, Austin",
  "Malibu, California", "Monterey, California", "Napa Valley, California",
  "Rocky Mountain National Park, Colorado", "Aspen, Colorado", "Telluride, Colorado",
  "Outer Banks, North Carolina", "Savannah, Georgia", "New Orleans, Louisiana",
  "Seattle, Washington", "Portland, Oregon", "Denver, Colorado",
];

const LISTING_TYPES = ["APARTMENT", "HOUSE", "VILLA", "CABIN"] as const;

const TITLES: Record<string, string[]> = {
  APARTMENT: [
    "Cozy Studio in the Heart of the City", "Modern 1-Bed with Skyline Views",
    "Charming Loft in Arts District", "Bright Corner Apartment Near the Park",
    "Stylish Minimalist Suite Downtown", "Renovated Historic Apartment",
    "Luxury High-Rise with Panoramic Views", "Peaceful Garden-Level Studio",
    "Trendy SoHo Loft with Exposed Brick", "Sunny Rooftop Apartment",
  ],
  HOUSE: [
    "Spacious Victorian Home with Garden", "Charming Craftsman Bungalow",
    "Modern Farmhouse with Open Plan", "Classic American Home with Porch",
    "Family-Friendly House Near Schools", "Elegant Townhouse with Rooftop Deck",
    "Cozy Colonial with Private Yard", "Designer Home with Hot Tub",
    "Historic Brownstone with Original Details", "Contemporary Smart Home",
  ],
  VILLA: [
    "Beachfront Luxury Villa with Private Pool", "Hilltop Villa with Ocean Views",
    "Mediterranean Villa with Olive Gardens", "Ultra-Modern Villa with Infinity Pool",
    "Secluded Jungle Villa with Waterfall", "Clifftop Villa with Sunset Views",
    "Tuscany-Inspired Villa with Vineyard", "Oceanfront Villa with Private Chef",
    "Lakeside Villa with Boat Dock", "Desert Villa with Mountain Views",
  ],
  CABIN: [
    "Rustic Log Cabin by Mountain Stream", "Cozy A-Frame with Fireplace",
    "Lakefront Cabin with Private Dock", "Off-Grid Cabin with Star Gazing Deck",
    "Forest Treehouse Cabin Experience", "Ski-In Ski-Out Mountain Cabin",
    "Secluded Cabin on 50 Private Acres", "Restored Historic Trapper's Cabin",
    "River Cabin with Fishing Access", "Alpine Cabin with Hot Tub",
  ],
};

const AMENITY_SETS = [
  ["WiFi", "Kitchen", "Air Conditioning", "Washer/Dryer"],
  ["WiFi", "Pool", "Hot Tub", "Parking", "BBQ"],
  ["WiFi", "Kitchen", "Heating", "Fireplace", "Parking"],
  ["WiFi", "Kitchen", "Gym", "Doorman", "Elevator"],
  ["WiFi", "Beach Access", "Kayaks", "Outdoor Shower", "Deck"],
  ["WiFi", "Ski Storage", "Fireplace", "Sauna", "Mountain Views"],
  ["WiFi", "Kitchen", "Garden", "BBQ", "Bikes"],
  ["WiFi", "Pool", "Tennis Court", "Cinema Room", "Chef's Kitchen"],
  ["WiFi", "Kitchen", "Balcony", "City Views", "Coffee Machine"],
  ["WiFi", "Hot Tub", "Fireplace", "Hiking Trails", "Stargazing Deck"],
];

const REVIEW_COMMENTS = [
  "Absolutely loved every moment — will definitely be back!",
  "Perfect location and spotlessly clean. Highly recommend.",
  "The host was incredibly responsive and welcoming.",
  "Exceeded all our expectations. A true hidden gem.",
  "Great value for money. Felt like home away from home.",
  "Beautiful property with stunning views. 10/10 would book again.",
  "Exactly as described. Smooth check-in and check-out process.",
  "Comfortable beds, great amenities, fantastic location.",
  "A wonderful stay — peaceful, clean, and well-equipped.",
  "The place was stunning and the neighborhood was great.",
  "Very good stay. Minor issue but host resolved it quickly.",
  "Nice property. Could use some updating but overall enjoyable.",
  "The view made everything worth it. Magical sunsets every evening.",
  "Super clean, super modern, super convenient. Loved it!",
  "Perfect for a family trip. Kids had a blast by the pool.",
  "Incredibly romantic getaway. The hot tub under stars was magical.",
  "Great working-from-home setup. Fast WiFi and quiet environment.",
  "The local tips from the host made our trip so much richer.",
  "Woke up to amazing mountain views every morning. Unforgettable.",
  "Exactly the peaceful escape we needed. Would book immediately again.",
];

const COUNTRIES = ["USA", "Rwanda", "UK", "Canada", "France", "Germany", "Japan", "Australia"];

// ── Main ──────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding database with 80 records per model...\n");

  // Clean in child-first order
  await prisma.review.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.listingPhoto.deleteMany();
  await prisma.listing.deleteMany();
  await prisma.profile.deleteMany();
  await prisma.user.deleteMany();
  console.log("  ✓ Cleared existing data");

  const hashedPassword = await bcrypt.hash("password123", 10);

  // ── 80 Users: 30 HOSTs + 50 GUESTs ──────────────────────────────────────────
  const users = await Promise.all(
    Array.from({ length: 80 }, (_, i) => {
      const isHost = i < 30;
      const first = FIRST_NAMES[i % FIRST_NAMES.length];
      const last = LAST_NAMES[i % LAST_NAMES.length];
      const suffix = i >= FIRST_NAMES.length ? `${Math.floor(i / FIRST_NAMES.length)}` : "";
      return prisma.user.create({
        data: {
          name: `${first} ${last}`,
          email: `${first.toLowerCase()}.${last.toLowerCase()}${suffix}@example.com`,
          username: `${first.toLowerCase()}_${last.toLowerCase()}${suffix}`,
          phone: `+1-555-${String(i + 1000).slice(1)}`,
          password: hashedPassword,
          role: isHost ? "HOST" : "GUEST",
          avatar: `https://randomuser.me/api/portraits/${i % 2 === 0 ? "women" : "men"}/${(i % 70) + 1}.jpg`,
          bio: isHost
            ? `Experienced host with ${20 + (i % 8) * 15}+ five-star reviews. I love welcoming guests!`
            : `Travel enthusiast exploring the world one city at a time.`,
        },
      });
    })
  );

  const hosts = users.filter((u) => u.role === "HOST");
  const guests = users.filter((u) => u.role === "GUEST");
  console.log(`  ✓ Created ${users.length} users — ${hosts.length} HOSTs, ${guests.length} GUESTs`);

  // ── 80 Listings ──────────────────────────────────────────────────────────────
  const listings = await Promise.all(
    Array.from({ length: 80 }, (_, i) => {
      const type = LISTING_TYPES[i % LISTING_TYPES.length];
      const host = hosts[i % hosts.length];
      const location = LOCATIONS[i % LOCATIONS.length];
      const titlePool = TITLES[type];
      const base = type === "VILLA" ? 400 : type === "HOUSE" ? 200 : type === "CABIN" ? 110 : 120;
      const price = base + (i % 10) * 25;
      const maxGuests =
        type === "VILLA" ? 8 + (i % 5)
        : type === "HOUSE" ? 4 + (i % 5)
        : type === "CABIN" ? 2 + (i % 4)
        : 1 + (i % 3);

      return prisma.listing.create({
        data: {
          title: `${titlePool[i % titlePool.length]} #${i + 1}`,
          description: `A wonderful ${type.toLowerCase()} in ${location}. Perfectly equipped for ${maxGuests} guests. ${AMENITY_SETS[i % AMENITY_SETS.length].slice(0, 3).join(", ")} and more included.`,
          location,
          pricePerNight: price,
          guests: maxGuests,
          type,
          amenities: AMENITY_SETS[i % AMENITY_SETS.length],
          rating: Number((3.8 + (i % 12) * 0.1).toFixed(1)),
          hostId: host.id,
        },
      });
    })
  );

  const countByType = LISTING_TYPES.map(
    (t) => `${listings.filter((l) => l.type === t).length} ${t}`
  ).join(", ");
  console.log(`  ✓ Created ${listings.length} listings — ${countByType}`);

  // ── 80 Bookings ───────────────────────────────────────────────────────────────
  const STATUSES = ["CONFIRMED", "PENDING", "CANCELLED"] as const;

  const bookings = await Promise.all(
    Array.from({ length: 80 }, (_, i) => {
      const guest = guests[i % guests.length];
      const listing = listings[i % listings.length];
      const status = STATUSES[i % STATUSES.length];

      // Spread check-ins over the next 18 months (30 days apart each)
      const checkIn = new Date();
      checkIn.setDate(checkIn.getDate() + 30 + i * 7);
      const checkOut = new Date(checkIn);
      checkOut.setDate(checkOut.getDate() + 2 + (i % 8));

      const nights = Math.ceil(
        (checkOut.getTime() - checkIn.getTime()) / (1000 * 60 * 60 * 24)
      );

      return prisma.booking.create({
        data: {
          guestId: guest.id,
          listingId: listing.id,
          checkIn,
          checkOut,
          totalPrice: nights * listing.pricePerNight,
          status,
        },
      });
    })
  );

  const byStatus = STATUSES.map(
    (s) => `${bookings.filter((b) => b.status === s).length} ${s}`
  ).join(", ");
  console.log(`  ✓ Created ${bookings.length} bookings — ${byStatus}`);

  // ── 80 Reviews ────────────────────────────────────────────────────────────────
  const reviews = await Promise.all(
    Array.from({ length: 80 }, (_, i) => {
      const guest = guests[i % guests.length];
      // Spread across listings so each listing gets several reviews
      const listing = listings[(i * 3) % listings.length];
      const rating = 3 + (i % 3); // 3, 4, or 5

      return prisma.review.create({
        data: {
          rating,
          comment: REVIEW_COMMENTS[i % REVIEW_COMMENTS.length],
          userId: guest.id,
          listingId: listing.id,
        },
      });
    })
  );

  const avgRating = (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  const byRating = [3, 4, 5].map(
    (r) => `${reviews.filter((rv) => rv.rating === r).length}★${r}`
  ).join(", ");
  console.log(`  ✓ Created ${reviews.length} reviews — avg ${avgRating} (${byRating})`);

  // ── 80 Profiles (all users get one) ──────────────────────────────────────────
  await Promise.all(
    users.map((user, i) =>
      prisma.profile.create({
        data: {
          bio: `${user.name.split(" ")[0]} is passionate about travel, culture, and memorable experiences.`,
          website: `https://${user.username}.example.com`,
          country: COUNTRIES[i % COUNTRIES.length],
          userId: user.id,
        },
      })
    )
  );
  console.log(`  ✓ Created ${users.length} profiles (one per user)`);

  console.log("\n✅ Seeding complete!");
  console.log(`   Users: ${users.length} | Listings: ${listings.length} | Bookings: ${bookings.length} | Reviews: ${reviews.length} | Profiles: ${users.length}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
