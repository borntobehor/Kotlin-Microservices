/*
import express from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(express.json());

const PORT = process.env.USER_PORT || 6000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || "fallback-secret-change-me";
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required!");
  process.exit(1);
}

// User Schema
const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
});

const User = mongoose.model("User", userSchema);

// Connect to MongoDB
mongoose.connect(MONGODB_URI)
  .then(() => console.log("Connected to MongoDB (User Service)"))
  .catch(err => {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  });

// Register
app.post("/register", async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: "All fields required" });
  }

  try {
    // Check if exists
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password
    const hashed = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({
      name,
      email,
      password: hashed
    });

    // Generate token
    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.status(201).json({
      message: "Registered successfully!",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email and password required" });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const token = jwt.sign({ id: user._id, email: user.email }, JWT_SECRET, { expiresIn: "7d" });

    res.json({
      message: "Login successful!",
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Get current user (protected)
app.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    res.json({ user });
  } catch (err) {
    res.status(500).json({ message: "Server error" });
  }
});

// Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];

  if (!token) return res.status(401).json({ message: "Token required" });

  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = payload;
    next();
  });
}

// Health & Root
app.get("/health", (req, res) => res.json({ status: "User Service OK", db: "connected" }));

app.get("/", (req, res) => {
  res.send(`
    <h1>User Service with MongoDB</h1>
    <p>POST /register → {name, email, password}</p>
    <p>POST /login → {email, password}</p>
    <p>GET /me → Authorization: Bearer &lt;token&gt;</p>
  `);
});

app.listen(PORT, () => {
  console.log(`\nUser Service running on http://localhost:${PORT}`);
});
*/


import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import mongoose from "mongoose";
import dotenv from "dotenv";

dotenv.config();

const app = express();
app.use(cors()); // If you host a web client, set specific origins in production
app.use(express.json());

const PORT = process.env.USER_PORT || 6000;
const JWT_SECRET = process.env.JWT_SECRET_KEY || "uOTqyZi8pFVYAhNL92/2QAQcuUqpE5b2DylVA4F5Ai0=";
const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error("MONGODB_URI is required!");
  process.exit(1);
}

// User Schema
const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, index: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

const User = mongoose.model("User", userSchema);

function makeTokenPayload(user) {
  return { id: user._id.toString(), email: user.email, name: user.name };
}

// Middleware
function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.split(" ")[1];
  if (!token) return res.status(401).json({ message: "Token required" });
  jwt.verify(token, JWT_SECRET, (err, payload) => {
    if (err) return res.status(403).json({ message: "Invalid token" });
    req.user = payload;
    next();
  });
}

// Register
app.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body || {};
    if (!name || !email || !password) {
      return res.status(400).json({ message: "All fields required" });
    }

    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(400).json({ message: "Email already registered" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed });

    const expiresIn = 7 * 24 * 60 * 60; // 7 days in seconds
    const token = jwt.sign(makeTokenPayload(user), JWT_SECRET, { expiresIn });
    const exp = Math.floor(Date.now() / 1000) + expiresIn;

    return res.status(201).json({
      message: "Registered successfully!",
      token,
      exp,
      expiresIn,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    if (err?.code === 11000) {
      return res.status(400).json({ message: "Email already registered" });
    }
    console.error("/register error:", err);
    return res.status(500).json({ message: "Server error", error: err.message });
  }
});

// Login
app.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};
    if (!email || !password) {
      return res.status(400).json({ message: "Email and password required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const expiresIn = 7 * 24 * 60 * 60; // 7 days
    const token = jwt.sign(makeTokenPayload(user), JWT_SECRET, { expiresIn });
    const exp = Math.floor(Date.now() / 1000) + expiresIn;

    return res.json({
      message: "Login successful!",
      token,
      exp,
      expiresIn,
      user: { id: user._id, name: user.name, email: user.email },
    });
  } catch (err) {
    console.error("/login error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Get current user (protected)
app.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select("-password");
    return res.json({ user });
  } catch (err) {
    console.error("/me error:", err);
    return res.status(500).json({ message: "Server error" });
  }
});

// Health & Root
app.get("/health", (req, res) => {
  const state = mongoose.connection.readyState; // 0=disconnected 1=connected 2=connecting 3=disconnecting
  res.json({ status: "User Service OK", dbState: state });
});

app.get("/", (req, res) => {
  res.send(`
    <h1>User Service with MongoDB</h1>
    <p>POST /register → {name, email, password}</p>
    <p>POST /login → {email, password}</p>
    <p>GET /me → Authorization: Bearer &lt;token&gt;</p>
  `);
});

// Connect to MongoDB and then start server
(async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log("Connected to MongoDB (User Service)");
    app.listen(PORT, () => {
      console.log(`User Service running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error("MongoDB connection error:", err.message);
    process.exit(1);
  }
})();

process.on("unhandledRejection", (reason) => {
  console.error("Unhandled Rejection:", reason);
});