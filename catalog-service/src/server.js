/*
import express from "express";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = process.env.CATALOG_PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;

app.use(express.json());

const perfumeSchema = new mongoose.Schema({
  name: String,
  price: Number,
  scent: String,
})

const Perfume = mongoose.model("Perfume", perfumeSchema);

mongoose.connect(MONGODB_URI)
  .then(async () => {
    console.log("MongoDB connected");
  })
  .catch(err => {
    console.error("MongoDB connection error", err.message);
  })

//* find all perfumes
app.get("/perfumes", async (req, res) => {
  try {
    const perfumes = await Perfume.find();
    res.json(perfumes)
  } catch (error) {
    res.status(500).json({ error: "Database error" });
  }
});

//* find perfume by id
app.get("/perfumes/:id", async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id);
    if (perfume) {
      res.json(perfume);
    } else {
      res.status(404).json({ error: "Perfume not found" })
    }
  } catch (error) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

//* add perfume
app.post("/perfumes", async (req, res) => {
  try {
    const newPerfume = new Perfume(req.body);
    await newPerfume.save();
    res.status(201).json(newPerfume);
  } catch (error) {
    res.status(400).json({ error: "Invalid data" })
  }
})

app.listen(PORT, () => {
  console.log(`Catalog Service running on ${PORT}`);
});
*/

import express from "express";
import cors from "cors";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "2mb" }));

const PORT = process.env.CATALOG_PORT || 3000;
const MONGODB_URI = process.env.MONGODB_URI;
const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // used to protect write endpoints

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// Schema: include imageUrl so clients can render images
const perfumeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: Number, required: true, min: 0 },
    scent: { type: String, default: "" },
    imageUrl: { type: String, default: "" },
  },
  { timestamps: true }
);

const Perfume = mongoose.model("Perfume", perfumeSchema);

function requireAdmin(req, res, next) {
  if (!ADMIN_API_KEY) return res.status(500).json({ message: "ADMIN_API_KEY not set" });
  const key = req.header("x-admin-api-key") || req.header("X-Admin-Api-Key");
  if (key !== ADMIN_API_KEY) return res.status(403).json({ message: "Forbidden" });
  next();
}

// Public endpoints (read-only)
app.get("/perfumes", async (req, res) => {
  try {
    const perfumes = await Perfume.find().sort({ createdAt: -1 });
    res.json(perfumes);
  } catch (err) {
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/perfumes/:id", async (req, res) => {
  try {
    const perfume = await Perfume.findById(req.params.id);
    if (!perfume) return res.status(404).json({ error: "Perfume not found" });
    res.json(perfume);
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// Admin-only write endpoints (NOT used by the app)
app.post("/perfumes", requireAdmin, async (req, res) => {
  try {
    const { name, price, scent, imageUrl } = req.body || {};
    if (!name || typeof price !== "number")
      return res.status(400).json({ error: "name and price are required" });
    const created = await Perfume.create({ name, price, scent, imageUrl });
    res.status(201).json(created);
  } catch (err) {
    res.status(400).json({ error: err.message || "Invalid data" });
  }
});

// Seed a few items (admin-only); run once, then you may remove/disable
app.post("/admin/seed", requireAdmin, async (req, res) => {
  try {
    const items = req.body?.items || [
      {
        name: "Valentino Born in Roma Intense",
        price: 99.0,
        scent: "Warm, spicy",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/sample.jpg",
      },
      {
        name: "Dior Sauvage",
        price: 115.0,
        scent: "Fresh, aromatic",
        imageUrl: "https://res.cloudinary.com/demo/image/upload/kitten.jpg",
      },
    ];
    const inserted = await Perfume.insertMany(items);
    res.json({ inserted: inserted.length, items: inserted });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState; // 0..3
  res.json({ status: "Catalog OK", dbState: state });
});

app.get("/", (req, res) => {
  res.send(`
    <h1>Catalog Service</h1>
    <p>GET /perfumes</p>
    <p>GET /perfumes/:id</p>
    <p>POST /perfumes (admin only via x-admin-api-key)</p>
  `);
});

(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB (Catalog)");
    app.listen(PORT, () => console.log(`Catalog Service running on ${PORT}`));
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
})();