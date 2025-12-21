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
