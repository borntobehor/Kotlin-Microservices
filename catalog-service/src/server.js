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
const ADMIN_API_KEY = process.env.ADMIN_API_KEY; // protects write endpoints

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required");
  process.exit(1);
}

// ----- Schema: aligns with your app’s sections -----
const perfumeSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },         // e.g., "Valentino Born in Roma Intense"
    brand: { type: String, default: "" },          // e.g., "Valentino"
    description: { type: String, default: "" },
    price: { type: Number, required: true, min: 0 },
    stock: { type: Number, default: 0 },            // available amount

    // Men/Women/Unisex
    gender: { type: String, enum: ["men", "women", "unisex"], required: true },

    // Concentration: maps to your categories EDT / EDP (you can extend)
    concentration: {
      type: String,
      enum: ["EDT", "EDP", "PARFUM", "EXTRAIT", "COLOGNE"],
      required: true,
    },

    isPopular: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },

    imageUrl: { type: String, default: "" },       // HTTPS URL for the image
    tags: { type: [String], default: [] },
  },
  { timestamps: true }
);

perfumeSchema.index({ gender: 1 });
perfumeSchema.index({ concentration: 1 });
perfumeSchema.index({ isPopular: 1 });
perfumeSchema.index({ isNewArrival: 1 });
perfumeSchema.index({ name: "text", brand: "text", description: "text", tags: 1 });

const Perfume = mongoose.model("Perfume", perfumeSchema);

// ----- Middleware -----
function requireAdmin(req, res, next) {
  if (!ADMIN_API_KEY) return res.status(500).json({ message: "ADMIN_API_KEY not set" });
  const key = req.header("x-admin-api-key") || req.header("X-Admin-Api-Key");
  if (key !== ADMIN_API_KEY) return res.status(403).json({ message: "Forbidden" });
  next();
}

// ----- Public, read-only endpoints -----
// GET /perfumes?gender=men|women|unisex&concentration=EDT|EDP&popular=true&new=true&search=...&page=1&limit=20
app.get("/perfumes", async (req, res) => {
  try {
    const { gender, concentration, popular, new: isNew, search, page = 1, limit = 100 } = req.query;

    const q = {};
    if (gender && ["men", "women", "unisex"].includes(String(gender))) q.gender = String(gender);
    if (concentration && ["EDT", "EDP", "PARFUM", "EXTRAIT", "COLOGNE"].includes(String(concentration))) q.concentration = String(concentration);
    if (typeof popular !== "undefined") q.isPopular = String(popular) === "true";
    if (typeof isNew !== "undefined") q.isNewArrival = String(isNew) === "true";
    if (search) q.$text = { $search: String(search) };

    const pageNum = Math.max(parseInt(String(page)) || 1, 1);
    const limitNum = Math.max(Math.min(parseInt(String(limit)) || 100, 200), 1);

    const items = await Perfume.find(q)
      .sort({ createdAt: -1 })
      .skip((pageNum - 1) * limitNum)
      .limit(limitNum);

    res.json(items);
  } catch (err) {
    console.error("GET /perfumes error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

app.get("/perfumes/:id", async (req, res) => {
  try {
    const item = await Perfume.findById(req.params.id);
    if (!item) return res.status(404).json({ error: "Perfume not found" });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// Grouped view for your home/category sections
app.get("/perfumes/grouped", async (req, res) => {
  try {
    const all = await Perfume.find({}).sort({ createdAt: -1 });

    const group = {
      "Men Fragrance": {
        Popular: all.filter((p) => p.gender === "men" && p.isPopular),
        "New Arrivals": all.filter((p) => p.gender === "men" && p.isNewArrival),
        "All Products": all.filter((p) => p.gender === "men"),
      },
      "Women Fragrance": {
        Popular: all.filter((p) => p.gender === "women" && p.isPopular),
        "New Arrivals": all.filter((p) => p.gender === "women" && p.isNewArrival),
        "All Products": all.filter((p) => p.gender === "women"),
      },
      "Unisex Fragrance": {
        Popular: all.filter((p) => p.gender === "unisex" && p.isPopular),
        "New Arrivals": all.filter((p) => p.gender === "unisex" && p.isNewArrival),
        "All Products": all.filter((p) => p.gender === "unisex"),
      },
      "Eau de Toilette (EDT)": {
        Popular: all.filter((p) => p.concentration === "EDT" && p.isPopular),
        "New Arrivals": all.filter((p) => p.concentration === "EDT" && p.isNewArrival),
        "All Products": all.filter((p) => p.concentration === "EDT"),
      },
      "Eau de Parfum (EDP)": {
        Popular: all.filter((p) => p.concentration === "EDP" && p.isPopular),
        "New Arrivals": all.filter((p) => p.concentration === "EDP" && p.isNewArrival),
        "All Products": all.filter((p) => p.concentration === "EDP"),
      },
    };

    res.json(group);
  } catch (err) {
    console.error("GET /perfumes/grouped error:", err);
    res.status(500).json({ error: "Database error" });
  }
});

// ----- Admin-only (write) endpoints: users cannot call these from the app -----
app.post("/perfumes", requireAdmin, async (req, res) => {
  try {
    const {
      name,
      brand = "",
      description = "",
      price,
      stock = 0,
      gender,
      concentration,
      isPopular = false,
      isNewArrival = false,
      imageUrl = "",
      tags = [],
    } = req.body || {};

    if (!name || typeof price !== "number" || !gender || !concentration) {
      return res.status(400).json({ error: "name, price, gender, concentration are required" });
    }

    const created = await Perfume.create({
      name,
      brand,
      description,
      price,
      stock,
      gender,
      concentration,
      isPopular,
      isNewArrival,
      imageUrl,
      tags,
    });

    res.status(201).json(created);
  } catch (err) {
    console.error("POST /perfumes error:", err);
    res.status(400).json({ error: err.message || "Invalid data" });
  }
});

app.patch("/perfumes/:id", requireAdmin, async (req, res) => {
  try {
    const updated = await Perfume.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ error: "Perfume not found" });
    res.json(updated);
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

app.delete("/perfumes/:id", requireAdmin, async (req, res) => {
  try {
    const deleted = await Perfume.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ error: "Perfume not found" });
    res.json({ deleted: true });
  } catch (err) {
    res.status(400).json({ error: "Invalid ID" });
  }
});

// Optional bulk import (admin): provide an array of items (no default static items)
app.post("/admin/import", requireAdmin, async (req, res) => {
  try {
    const items = Array.isArray(req.body) ? req.body : []; // expect an array
    if (!items.length) return res.status(400).json({ error: "Provide an array of items" });
    const inserted = await Perfume.insertMany(items);
    res.json({ inserted: inserted.length, items: inserted });
  } catch (err) {
    console.error("/admin/import error:", err);
    res.status(500).json({ error: err.message });
  }
});

// Health & Root
app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState; // 0..3
  res.json({ status: "Catalog OK", dbState: state });
});

app.get("/", (req, res) => {
  res.send(`
    <h1>Catalog Service</h1>
    <p>GET /perfumes</p>
    <p>GET /perfumes/:id</p>
    <p>GET /perfumes/grouped</p>
    <p>POST /perfumes (admin only via x-admin-api-key)</p>
    <p>PATCH /perfumes/:id (admin only)</p>
    <p>DELETE /perfumes/:id (admin only)</p>
  `);
});

// Connect DB then start server
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