import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import pg from "pg";
import bcrypt from "bcrypt";

const pool = new pg.Pool({ connectionString: process.env["DATABASE_URL"] as string });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// ─── Experience seed data ─────────────────────────────────────────────────────

const EXPERIENCE_HOSTS = [
  { name: "Marco Rossi",     email: "marco@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=12", isSuperhost: true  },
  { name: "Priya Sharma",    email: "priya@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=25", isSuperhost: true  },
  { name: "Diego Vargas",    email: "diego@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=33", isSuperhost: false },
  { name: "Léa Dubois",      email: "lea@exp.example.com",     avatar: "https://i.pravatar.cc/150?img=47", isSuperhost: true  },
  { name: "James Carter",    email: "james@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=58", isSuperhost: true  },
  { name: "Henri Beaumont",  email: "henri@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=67", isSuperhost: true  },
  { name: "Elena Greco",     email: "elena@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=5",  isSuperhost: false },
  { name: "Kenji Tanaka",    email: "kenji@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=78", isSuperhost: true  },
  { name: "Amara Osei",      email: "amara@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=23", isSuperhost: true  },
  { name: "Carmen Flores",   email: "carmen@exp.example.com",  avatar: "https://i.pravatar.cc/150?img=40", isSuperhost: true  },
  { name: "Astrid Berg",     email: "astrid@exp.example.com",  avatar: "https://i.pravatar.cc/150?img=91", isSuperhost: false },
  { name: "Rodrigo Silva",   email: "rodrigo@exp.example.com", avatar: "https://i.pravatar.cc/150?img=15", isSuperhost: true  },
  { name: "Sofia Mendez",    email: "sofia@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=35", isSuperhost: true  },
  { name: "Yuki Hayashi",    email: "yuki@exp.example.com",    avatar: "https://i.pravatar.cc/150?img=83", isSuperhost: false },
  { name: "Marcus Williams", email: "marcus@exp.example.com",  avatar: "https://i.pravatar.cc/150?img=20", isSuperhost: true  },
  { name: "Moana Tetuanui",  email: "moana@exp.example.com",   avatar: "https://i.pravatar.cc/150?img=68", isSuperhost: true  },
];

const EXPERIENCES_DATA = [
  {
    hostIdx: 0,
    title: "Pizza-making masterclass in a Naples kitchen",
    description: "Learn the secrets of authentic Neapolitan pizza from Marco, a third-generation pizzaiolo. Knead the dough, choose your toppings, and bake in a wood-fired oven that's been in his family for 100 years.",
    location: "Naples, Italy",
    isOnline: false,
    category: "cooking",
    duration: 3,
    price: 78,
    rating: 4.98,
    maxGuests: 8,
    languages: ["English", "Italian"],
    highlights: ["Make dough from scratch", "Learn wood-fired oven technique", "Take home the recipe", "Enjoy 3 pizzas per person"],
    includes: ["All ingredients", "Wine & beer", "Recipe card", "Apron to keep"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1513104890138-7c749659a591?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 1,
    title: "Dawn yoga & meditation on the rooftop",
    description: "Greet the sunrise from a rooftop overlooking the Pink City. Priya leads a gentle Hatha yoga session followed by guided pranayama and meditation.",
    location: "Jaipur, India",
    isOnline: false,
    category: "wellness",
    duration: 2,
    price: 35,
    rating: 4.97,
    maxGuests: 10,
    languages: ["English", "Hindi"],
    highlights: ["Watch sunrise over Jaipur", "Hatha yoga flow", "Pranayama breathing", "Guided meditation"],
    includes: ["Yoga mat", "Herbal chai", "Meditation cushion"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1506126613408-eca07ce68773?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1545205597-3d9d02c29597?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 2,
    title: "Surf lesson for beginners at sunrise",
    description: "Start your surfing journey at Playa Guiones — one of the most consistent beginner waves in Central America. Diego has taught 2,000+ students.",
    location: "Nosara, Costa Rica",
    isOnline: false,
    category: "outdoor",
    duration: 2.5,
    price: 95,
    rating: 4.94,
    maxGuests: 6,
    languages: ["English", "Spanish"],
    highlights: ["100% stand-up guarantee", "World-class beginner waves", "Video of your session", "Turtle sightings likely"],
    includes: ["Surfboard & wetsuit", "Rash guard", "Safety fins", "Photos & video"],
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1502680390469-be75c86b636f?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1468581286699-06b3eb12f08c?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 3,
    title: "Street art & graffiti walking tour",
    description: "Discover the hidden street art scene in Le Marais and Belleville with Léa, a contemporary artist who knows every crew behind the murals.",
    location: "Paris, France",
    isOnline: false,
    category: "arts",
    duration: 2,
    price: 42,
    rating: 4.95,
    maxGuests: 12,
    languages: ["English", "French"],
    highlights: ["Hidden courtyards & secret spots", "Meet local artists", "Spray-can workshop", "Take home your mini canvas"],
    includes: ["Spray cans & canvas", "Art history booklet", "Coffee stop"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1541961017774-22349e4a1262?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1594909122845-11baa439b7bf?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 4,
    title: "Jazz piano masterclass — all levels",
    description: "James has played the French Quarter for 20 years. You'll learn chord voicings, walking bass lines, and how to improvise over a 12-bar blues.",
    location: "Online",
    isOnline: true,
    category: "music",
    duration: 1.5,
    price: 29,
    rating: 4.99,
    maxGuests: 1,
    languages: ["English"],
    highlights: ["12-bar blues mastery", "Jazz chord voicings", "Improv fundamentals", "Video recording included"],
    includes: ["Sheet music PDF", "Backing tracks", "Recording of your session"],
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1520523839897-bd0b52f945a0?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1507838153414-b4b713384a76?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 5,
    title: "Truffle hunting in the Dordogne forest",
    description: "Join Henri and his trained Lagotto dogs in the ancient oak forests of the Dordogne. After the hunt, cook a traditional Périgord lunch with your finds.",
    location: "Périgord, France",
    isOnline: false,
    category: "cooking",
    duration: 4,
    price: 120,
    rating: 4.96,
    maxGuests: 6,
    languages: ["English", "French"],
    highlights: ["Hunt with trained truffle dogs", "Harvest black truffles", "Cook a 3-course truffle lunch", "Bring leftovers home"],
    includes: ["Truffle lunch", "Wine pairing", "Truffle to take home", "Transport from village"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1476224203421-74177f13e8cc?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 6,
    title: "Volcano trek with a volcanologist",
    description: "Hike the active slopes of Mount Etna with Elena, a geologist who studies the volcano daily. See active craters, lava tubes, and learn geology.",
    location: "Etna, Sicily",
    isOnline: false,
    category: "outdoor",
    duration: 6,
    price: 85,
    rating: 4.93,
    maxGuests: 8,
    languages: ["English", "Italian"],
    highlights: ["Active crater access", "Lava tube exploration", "Geology of eruptions", "Sicilian wine tasting at summit"],
    includes: ["Hiking gear", "Safety equipment", "Packed lunch", "Wine tasting"],
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1506905925-346a9d64ded8?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 7,
    title: "Sushi & sake pairing workshop",
    description: "Kenji is a 3rd-generation sushi chef. Learn nigiri, maki and temaki, then discover how to pair each style with artisan sake.",
    location: "Osaka, Japan",
    isOnline: false,
    category: "cooking",
    duration: 3,
    price: 110,
    rating: 4.98,
    maxGuests: 6,
    languages: ["English", "Japanese"],
    highlights: ["Knife skills fundamentals", "Nigiri, maki & temaki", "Sake selection secrets", "Certificate of completion"],
    includes: ["Premium fish & seafood", "4 sake varieties", "Knife sharpening guide", "Recipe book"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1564116481-6a0f88f13ee6?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 8,
    title: "Wildlife photography safari at golden hour",
    description: "Join Amara, a National Geographic-featured photographer, for a golden-hour game drive with a photography lesson built in.",
    location: "Maasai Mara, Kenya",
    isOnline: false,
    category: "outdoor",
    duration: 5,
    price: 145,
    rating: 4.97,
    maxGuests: 4,
    languages: ["English", "Swahili"],
    highlights: ["Golden hour lighting tutorial", "Big Five encounters", "Edit your photos on-site", "Prints of your best shots"],
    includes: ["4×4 game vehicle", "Photography guide sheet", "Printed photo", "Sundowner drinks"],
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1516026672322-bc52d61a55d5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1477612676059-3b6ee6afee70?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 9,
    title: "Flamenco dance class in a cave studio",
    description: "Carmen's family has danced flamenco in the Sacromonte caves for five generations. Learn the fundamental footwork, arm movements, and the duende.",
    location: "Granada, Spain",
    isOnline: false,
    category: "arts",
    duration: 2,
    price: 55,
    rating: 4.96,
    maxGuests: 10,
    languages: ["English", "Spanish"],
    highlights: ["Authentic cave setting", "Footwork & palmas", "Traditional costume", "Live guitar accompaniment"],
    includes: ["Flamenco shoes (all sizes)", "Traditional fan", "Dress/shirt to keep", "Refreshments"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1518611012118-696072aa579a?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 10,
    title: "Foraging & wild food cooking",
    description: "Venture into the Arctic forest with Astrid, a Sámi guide, to forage wild mushrooms, lingonberries, and herbs. Return to camp and cook them over an open fire.",
    location: "Swedish Lapland",
    isOnline: false,
    category: "outdoor",
    duration: 5,
    price: 98,
    rating: 4.91,
    maxGuests: 6,
    languages: ["English", "Swedish"],
    highlights: ["Sámi foraging traditions", "Identify 12+ wild species", "Open-fire cooking", "Northern Lights possible (winter)"],
    includes: ["Foraging basket", "Full forest lunch", "Warm clothing if needed", "Sámi herbal tea"],
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1501854140801-50d01698950b?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 11,
    title: "Capoeira & Brazilian culture immersion",
    description: "Rodrigo is a Mestre Capoeira who has trained 1,500+ students from 40 countries. Learn ginga, basic kicks, and acrobatics with live berimbau music.",
    location: "Salvador, Brazil",
    isOnline: false,
    category: "sports",
    duration: 2,
    price: 40,
    rating: 4.94,
    maxGuests: 12,
    languages: ["English", "Portuguese"],
    highlights: ["Ginga & fundamental kicks", "Acrobatics for all levels", "Berimbau & atabaque music", "Roda (circle sparring)"],
    includes: ["Abadá (capoeira uniform)", "Capoeira music guide", "Video of your jogo"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1571019614242-c5c5dee9f50b?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 12,
    title: "Astrology reading & star map workshop",
    description: "Sofia is a professional astrologer who interprets your birth chart. You'll understand your rising sign, key life themes, and current planetary transits.",
    location: "Online",
    isOnline: true,
    category: "wellness",
    duration: 1.5,
    price: 22,
    rating: 4.97,
    maxGuests: 1,
    languages: ["English", "Spanish", "Portuguese"],
    highlights: ["Personalized birth chart reading", "Rising, sun & moon signs", "Current transits & timing", "Q&A session included"],
    includes: ["PDF birth chart", "Year ahead forecast", "Recommended books list"],
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1519681393784-d1b22eae09a5?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 13,
    title: "Ceramics wheel-throwing afternoon",
    description: "Yuki trained at a Kyoto kiln for 10 years and teaches wheel-throwing in her hillside studio. Create two pieces — both glazed, fired, and shipped worldwide.",
    location: "Kyoto, Japan",
    isOnline: false,
    category: "arts",
    duration: 3,
    price: 88,
    rating: 4.92,
    maxGuests: 5,
    languages: ["English", "Japanese"],
    highlights: ["Traditional Kyoto kiln atmosphere", "Create 2 ceramic pieces", "Glaze & finish your work", "Worldwide shipping included"],
    includes: ["All clay & tools", "Apron", "Matcha tea ceremony", "Pieces shipped to you"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1565193566173-7a0ee3dbe261?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1567538096630-e670ef4a45e8?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 14,
    title: "Stand-up comedy open-mic workshop",
    description: "Marcus has headlined Comedy Cellar for 15 years. This workshop teaches joke structure, comedic voice, and ends with a live 5-minute open-mic set.",
    location: "New York City, USA",
    isOnline: false,
    category: "entertainment",
    duration: 2.5,
    price: 65,
    rating: 4.95,
    maxGuests: 15,
    languages: ["English"],
    highlights: ["Write 5 minutes of material", "Joke structure masterclass", "Stage presence & timing", "Perform at a real mic night"],
    includes: ["Writing workbook", "Video of your set", "Post-show drinks"],
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1503095396549-807753ba0f82?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 15,
    title: "Freediving in the crystal lagoon",
    description: "Moana, a world-record freediver, teaches breath-holding and equalization in Bora Bora's lagoon. Dive alongside manta rays with zero scuba equipment.",
    location: "Bora Bora, French Polynesia",
    isOnline: false,
    category: "outdoor",
    duration: 4,
    price: 165,
    rating: 4.98,
    maxGuests: 4,
    languages: ["English", "French", "Tahitian"],
    highlights: ["Breath-hold fundamentals", "Dive with manta rays", "Equalization technique", "Underwater photos included"],
    includes: ["Freediving fins & mask", "Wetsuit", "Safety equipment", "Underwater photos"],
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1559494007-9f5847c49d94?auto=format&fit=crop&w=800&q=80",
    ],
  },
];

// ─── Service seed data ────────────────────────────────────────────────────────

const SERVICE_HOSTS = [
  { name: "Isabella Chen",   email: "isabella@svc.example.com", avatar: "https://i.pravatar.cc/150?img=12", isSuperhost: true  },
  { name: "Clean & Shine",   email: "cleanshine@svc.example.com",avatar:"https://i.pravatar.cc/150?img=22", isSuperhost: false },
  { name: "Léa Morin",       email: "leam@svc.example.com",     avatar: "https://i.pravatar.cc/150?img=47", isSuperhost: true  },
  { name: "Marcus Reid",     email: "marcusr@svc.example.com",  avatar: "https://i.pravatar.cc/150?img=33", isSuperhost: true  },
  { name: "Sophie Laurent",  email: "sophie@svc.example.com",   avatar: "https://i.pravatar.cc/150?img=55", isSuperhost: false },
  { name: "Carlos Mendez",   email: "carlosm@svc.example.com",  avatar: "https://i.pravatar.cc/150?img=15", isSuperhost: false },
  { name: "Elena Vasquez",   email: "elenav@svc.example.com",   avatar: "https://i.pravatar.cc/150?img=5",  isSuperhost: true  },
  { name: "Hana Kimura",     email: "hana@svc.example.com",     avatar: "https://i.pravatar.cc/150?img=62", isSuperhost: true  },
  { name: "Amara Diallo",    email: "amarad@svc.example.com",   avatar: "https://i.pravatar.cc/150?img=23", isSuperhost: false },
  { name: "Priya Nair",      email: "priyan@svc.example.com",   avatar: "https://i.pravatar.cc/150?img=25", isSuperhost: true  },
  { name: "Jean-Pierre Roy", email: "jpr@svc.example.com",      avatar: "https://i.pravatar.cc/150?img=76", isSuperhost: false },
  { name: "Rodrigo Faria",   email: "rodrigof@svc.example.com", avatar: "https://i.pravatar.cc/150?img=42", isSuperhost: false },
];

const SERVICES_DATA = [
  {
    hostIdx: 0,
    title: "Private chef dinner for 2–10 guests",
    description: "Isabella is a Michelin-trained chef who brings a restaurant experience to your home. She handles shopping, cooking, plating, and cleanup — you just enjoy the evening.",
    location: "New York City, USA",
    category: "chef",
    price: 120,
    priceUnit: "hour",
    duration: "4–6 hours",
    tags: ["Menu planning", "Grocery shopping", "Full cleanup", "Wine pairing advice"],
    rating: 4.98,
    responseTime: "Within 1 hour",
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1556909114-f6e7ad7d3136?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1571091718767-18b5b1457add?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 1,
    title: "Professional home deep clean",
    description: "A team of 2–3 certified cleaners using eco-friendly products. Kitchen deep clean, bathroom sanitization, window cleaning, and organization included. Fully insured.",
    location: "San Francisco, USA",
    category: "cleaning",
    price: 85,
    priceUnit: "hour",
    duration: "3–5 hours",
    tags: ["Eco-friendly products", "Deep clean", "Kitchen & bathrooms", "Insured team"],
    rating: 4.93,
    responseTime: "Within 2 hours",
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1527515545081-5db817172677?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 2,
    title: "Couples portrait photography session",
    description: "Léa shoots couples in the hidden corners of Paris — gardens, rooftops, classic cafés. You'll receive 100+ edited high-resolution images in 3 days.",
    location: "Paris, France",
    category: "photography",
    price: 250,
    priceUnit: "session",
    duration: "2 hours",
    tags: ["100+ edited photos", "3-day delivery", "Paris locations scouted", "Candid editorial style"],
    rating: 4.97,
    responseTime: "Within 3 hours",
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1492691527719-9d1e07e534b4?auto=format&fit=crop&w=800&q=80",
      "https://images.unsplash.com/photo-1537047902294-62a40c20a6ae?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 3,
    title: "Personal training at your gym or home",
    description: "Marcus is a certified NASM personal trainer. He builds customized programs for weight loss, strength, or sports performance. Early morning or evening sessions.",
    location: "London, UK",
    category: "fitness",
    price: 80,
    priceUnit: "hour",
    duration: "1 hour",
    tags: ["Custom program", "Nutrition advice", "Progress tracking", "Flexible schedule"],
    rating: 4.96,
    responseTime: "Within 1 hour",
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 4,
    title: "Dog walking & mid-day pet care",
    description: "Sophie has cared for 200+ dogs and sends real-time GPS updates plus photos every walk. Trained in dog first aid, handles all sizes and breeds.",
    location: "Amsterdam, Netherlands",
    category: "pet-care",
    price: 25,
    priceUnit: "visit",
    duration: "30–60 min",
    tags: ["GPS live tracking", "Photo updates", "First aid certified", "All breeds welcome"],
    rating: 4.99,
    responseTime: "Within 30 minutes",
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1450778869421-9f4ad4e9b7b4?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 5,
    title: "Handyman & minor home repairs",
    description: "Carlos handles flat-pack furniture assembly, picture hanging, minor plumbing and electrical fixes. Fully licensed, insured, and carries his own professional tools.",
    location: "Barcelona, Spain",
    category: "handyman",
    price: 55,
    priceUnit: "hour",
    duration: "As needed",
    tags: ["Furniture assembly", "Plumbing & electrical", "Fully insured", "Own tools"],
    rating: 4.91,
    responseTime: "Within 2 hours",
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1581244277943-fe229eb72ded?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 6,
    title: "Private Spanish lessons — beginner to advanced",
    description: "Elena is a certified teacher from Madrid with 12 years of experience teaching Spanish via video call. Conversational method proven to get students speaking in session one.",
    location: "Online",
    category: "tutoring",
    price: 45,
    priceUnit: "hour",
    duration: "1 hour",
    tags: ["Conversational method", "Custom curriculum", "Grammar & vocabulary", "Cultural context"],
    rating: 4.97,
    responseTime: "Within 1 hour",
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 7,
    title: "Wedding & event florist",
    description: "Hana creates bespoke floral installations drawing from ikebana tradition and contemporary European design. Works with seasonal Japanese flowers.",
    location: "Kyoto, Japan",
    category: "events",
    price: 300,
    priceUnit: "day",
    duration: "Full day",
    tags: ["Ikebana-inspired designs", "Seasonal Japanese flowers", "Full setup & takedown", "Free consultation"],
    rating: 4.98,
    responseTime: "Within 4 hours",
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1490750967868-88df5691cc7e?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 8,
    title: "Meal prep & nutrition coaching",
    description: "Amara is a certified nutritionist and chef who comes to your home to batch-cook a week's worth of healthy meals. Customizes for dietary needs and labels everything.",
    location: "Nairobi, Kenya",
    category: "chef",
    price: 65,
    priceUnit: "session",
    duration: "3 hours",
    tags: ["Nutritional planning", "Batch cooking", "Dietary customization", "Meal labels & macros"],
    rating: 4.94,
    responseTime: "Within 2 hours",
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1512621776951-a57ef384aee9?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 9,
    title: "Home massage therapy & spa day",
    description: "Priya is a certified Balinese massage therapist who brings her massage table, essential oils, and hot stones to your villa or hotel.",
    location: "Bali, Indonesia",
    category: "wellness",
    price: 95,
    priceUnit: "session",
    duration: "90 min – 3 hours",
    tags: ["Balinese massage", "Hot stone therapy", "Aromatherapy oils", "Portable spa setup"],
    rating: 4.99,
    responseTime: "Within 1 hour",
    isGuestFav: true,
    photos: [
      "https://images.unsplash.com/photo-1544161515-4be31b050ddf?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 10,
    title: "Airport transfer & private driver",
    description: "Jean-Pierre is a licensed chauffeur with a fleet of premium vehicles including Mercedes E-Class and Tesla. Flight tracking included, waits even if delayed.",
    location: "Paris, France",
    category: "transport",
    price: 70,
    priceUnit: "visit",
    duration: "As needed",
    tags: ["Flight tracking", "Child seats available", "Premium vehicles", "Meet & greet"],
    rating: 4.95,
    responseTime: "Instant confirmation",
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1580273916550-e323be2ae537?auto=format&fit=crop&w=800&q=80",
    ],
  },
  {
    hostIdx: 11,
    title: "Acai bowl & smoothie bar for events",
    description: "Rodrigo brings his Rio-style açaí bar to your event. Sets up a full station with fresh açaí, toppings, smoothies, and cold-pressed juices.",
    location: "Rio de Janeiro, Brazil",
    category: "events",
    price: 400,
    priceUnit: "day",
    duration: "Up to 8 hours",
    tags: ["Full bar setup", "Up to 200 guests", "Fresh açaí flown in", "Cleanup included"],
    rating: 4.92,
    responseTime: "Within 3 hours",
    isGuestFav: false,
    photos: [
      "https://images.unsplash.com/photo-1511690656952-34342bb7c2f2?auto=format&fit=crop&w=800&q=80",
    ],
  },
];

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main() {
  console.log("🌱 Seeding experiences and services...\n");
  const hashedPassword = await bcrypt.hash("password123", 10);

  // Remove existing experiences & services (preserves listings/bookings/etc.)
  await prisma.experienceBooking.deleteMany();
  await prisma.experiencePhoto.deleteMany();
  await prisma.experience.deleteMany();
  await prisma.servicePhoto.deleteMany();
  await prisma.service.deleteMany();
  console.log("  ✓ Cleared existing experiences & services");

  // Create experience hosts
  const expHosts = await Promise.all(
    EXPERIENCE_HOSTS.map((h, i) =>
      prisma.user.upsert({
        where: { email: h.email },
        update: {},
        create: {
          name: h.name,
          email: h.email,
          username: h.email.split("@")[0].replace(/[^a-z0-9]/gi, "_"),
          phone: `+1-555-${String(1000 + i).slice(1)}`,
          password: hashedPassword,
          role: "HOST",
          avatar: h.avatar,
          isSuperhost: h.isSuperhost,
          bio: `Experience host with a passion for sharing unique local knowledge.`,
        },
      })
    )
  );
  console.log(`  ✓ Upserted ${expHosts.length} experience hosts`);

  // Seed experiences
  for (const [i, d] of EXPERIENCES_DATA.entries()) {
    const { photos, hostIdx, ...fields } = d;
    await prisma.experience.create({
      data: {
        ...fields,
        hostId: expHosts[hostIdx].id,
        photos: { create: photos.map(url => ({ url })) },
      },
    });
  }
  console.log(`  ✓ Created ${EXPERIENCES_DATA.length} experiences`);

  // Create service hosts
  const svcHosts = await Promise.all(
    SERVICE_HOSTS.map((h, i) =>
      prisma.user.upsert({
        where: { email: h.email },
        update: {},
        create: {
          name: h.name,
          email: h.email,
          username: h.email.split("@")[0].replace(/[^a-z0-9]/gi, "_"),
          phone: `+1-555-${String(2000 + i).slice(1)}`,
          password: hashedPassword,
          role: "HOST",
          avatar: h.avatar,
          isSuperhost: h.isSuperhost,
          bio: `Service professional committed to exceptional quality.`,
        },
      })
    )
  );
  console.log(`  ✓ Upserted ${svcHosts.length} service hosts`);

  // Seed services
  for (const [i, d] of SERVICES_DATA.entries()) {
    const { photos, hostIdx, ...fields } = d;
    await prisma.service.create({
      data: {
        ...fields,
        hostId: svcHosts[hostIdx].id,
        photos: { create: photos.map(url => ({ url })) },
      },
    });
  }
  console.log(`  ✓ Created ${SERVICES_DATA.length} services`);

  console.log("\n✅ Done!");
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(async () => { await prisma.$disconnect(); await pool.end(); });
