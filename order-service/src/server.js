import express from "express";
import axios from "axios";
import dotenv from "dotenv";

dotenv.config();
const app = express();

const CATALOG_URL = process.env.CATALOG_SERVICE_URL || "http://localhost:3000/perfumes";
const PORT = process.env.PAYMENT_PORT || 4000;

app.use(express.json());

app.get("/orders/:perfumeID", async (req, res) => {
  const perfumeID = req.params.perfumeID;

  try {
    const response = await axios.get(`${CATALOG_URL}/${perfumeID}`);

    const perfume = response.data;

    res.json({
      message: "Oder placed successfully!",
      perfume: perfume.name,
      price: perfume.price,
      total: perfume.price,
    });
  } catch (error) {
    res
      .status(500)
      .json({ error: "Could not find perfume or catalog service down" });
  }
});

app.get("/test", (req, res) => {
  res.send("Order Service running");
});

app.listen(PORT, () => {
  console.log(`Order Service running on port ${PORT}`);
});
