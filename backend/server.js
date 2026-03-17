require("dotenv").config();
const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const multer = require("multer");
const { GridFSBucket } = require("mongodb");
const path = require("path");
const { Readable } = require("stream");
const { v4: uuidv4 } = require("uuid");

const app = express();
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;
const BASE_URL = process.env.BASE_URL || `http://localhost:${PORT}`;

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || "*",
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));
app.use(express.json());

// ── Product Schema ──────────────────────────────────────────
const productSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    price: { type: String, required: true },
    badge: { type: String, default: "NEW" },
    description: { type: String, default: "" },
    // Legacy single image (kept for backward compat)
    imageId: { type: mongoose.Schema.Types.ObjectId, default: null },
    isExternal: { type: Boolean, default: false },
    externalImg: { type: String, default: "" },
    // Multiple images
    imageIds: { type: [mongoose.Schema.Types.ObjectId], default: [] },
    // Piece-by-piece descriptions e.g. [{pieceName:"Shirt", description:"..."}]
    pieces: {
      type: [{ pieceName: { type: String }, description: { type: String } }],
      default: [],
    },
    // Delivery charges (admin sets per product)
    deliveryCharges: { type: Number, default: 200 },
    likedBy: { type: [String], default: [] },
  },
  { timestamps: true }
);

// Compute primary img URL (first of imageIds, fallback to legacy imageId)
productSchema.virtual("img").get(function () {
  if (this.isExternal) return this.externalImg;
  if (this.imageIds && this.imageIds.length > 0)
    return `${BASE_URL}/api/images/${this.imageIds[0]}`;
  if (this.imageId) return `${BASE_URL}/api/images/${this.imageId}`;
  return "";
});

// Compute array of all image URLs
productSchema.virtual("imgs").get(function () {
  const urls = [];
  if (this.imageIds && this.imageIds.length > 0) {
    for (const id of this.imageIds) {
      urls.push(`${BASE_URL}/api/images/${id}`);
    }
  }
  // Fallback to legacy single imageId
  if (urls.length === 0 && this.imageId) {
    urls.push(`${BASE_URL}/api/images/${this.imageId}`);
  }
  if (urls.length === 0 && this.isExternal && this.externalImg) {
    urls.push(this.externalImg);
  }
  return urls;
});

productSchema.set("toJSON", { virtuals: true });

const Product = mongoose.model("Product", productSchema);

// ── Order Schema ─────────────────────────────────────────────
const orderSchema = new mongoose.Schema(
  {
    customerName: { type: String, required: true },
    phone:        { type: String, required: true },
    email:        { type: String, required: true },
    deliveryAddress: { type: String, required: true },
    productId:    { type: mongoose.Schema.Types.ObjectId, ref: "Product" },
    productName:  { type: String, required: true },
    productPrice: { type: String, required: true },
    size:         { type: String, enum: ["XS", "S", "M", "L", "XL"], required: true },
    quantity:     { type: Number, default: 1, min: 1 },
    deliveryCharges: { type: Number, default: 200 },
    totalAmount:  { type: String, required: true },
    status:       { type: String, enum: ["pending", "processing", "delivered", "cancelled"], default: "pending" },
  },
  { timestamps: true }
);
const Order = mongoose.model("Order", orderSchema);

// ── Admin Config Schema ───────────────────────────────────────
const adminConfigSchema = new mongoose.Schema({
  password: { type: String, required: true },
});
const AdminConfig = mongoose.model("AdminConfig", adminConfigSchema);

// ── GridFS bucket ─────────────────────────────────────────────
let gfsBucket;

// ── Multer: keep file in memory, we push it to GridFS ───────
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const valid =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    cb(null, valid);
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10 MB
});

// ── MongoDB connection cache (serverless-safe) ────────────────
let isConnected = false;

async function connectDB() {
  if (isConnected && mongoose.connection.readyState === 1) return;
  if (!MONGO_URI) throw new Error("MONGO_URI environment variable is not set");

  await mongoose.connect(MONGO_URI);
  isConnected = true;
  gfsBucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });

  // Seed admin password if not already in DB
  const existing = await AdminConfig.findOne();
  if (!existing) {
    await AdminConfig.create({ password: "adminNaazAtif3321" });
    console.log("🔑  Admin password seeded to database");
  }
  console.log("✅  Connected to MongoDB Atlas");
}

// ── DB connection middleware ──────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err.message);
    res.status(500).json({ error: "Database connection failed" });
  }
});

// ── Helper: save buffer → GridFS, returns the new file _id ──
function saveToGridFS(buffer, filename, mimetype) {
  return new Promise((resolve, reject) => {
    const uploadStream = gfsBucket.openUploadStream(filename, {
      metadata: { mimetype },
    });
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
  });
}

// ── Helper: delete a GridFS file by ObjectId ────────────────
async function deleteGridFSFile(fileId) {
  if (!fileId) return;
  try {
    await gfsBucket.delete(new mongoose.Types.ObjectId(String(fileId)));
  } catch (err) {
    console.warn("GridFS delete warning:", err.message);
  }
}

// ── Auth ─────────────────────────────────────────────────────
app.post("/api/admin/login", async (req, res) => {
  try {
    const { password } = req.body;
    const config = await AdminConfig.findOne();
    if (!config) return res.status(500).json({ error: "Admin not configured" });
    if (password === config.password) {
      res.json({ success: true, token: "admin-token-zareen" });
    } else {
      res.status(401).json({ error: "Incorrect password" });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Serve image from GridFS ──────────────────────────────────
app.get("/api/images/:id", async (req, res) => {
  try {
    const fileId = new mongoose.Types.ObjectId(req.params.id);
    const files = await gfsBucket.find({ _id: fileId }).toArray();
    if (!files.length) return res.status(404).json({ error: "Image not found" });

    res.set("Content-Type", files[0].metadata?.mimetype || "image/jpeg");
    res.set("Cache-Control", "public, max-age=31536000");
    gfsBucket.openDownloadStream(fileId).pipe(res);
  } catch {
    res.status(400).json({ error: "Invalid image ID" });
  }
});

// ── GET all products ─────────────────────────────────────────
app.get("/api/products", async (_req, res) => {
  try {
    const products = await Product.find().sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST create product (accepts multiple images) ────────────
app.post("/api/products", upload.any(), async (req, res) => {
  try {
    const { name, price, badge, description, deliveryCharges, pieces } = req.body;
    if (!name || !price)
      return res.status(400).json({ error: "Name and price are required" });

    let parsedPieces = [];
    if (pieces) {
      try { parsedPieces = JSON.parse(pieces); } catch { parsedPieces = []; }
    }

    const imageIds = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `${uuidv4()}${path.extname(file.originalname)}`;
        const id = await saveToGridFS(file.buffer, filename, file.mimetype);
        imageIds.push(id);
      }
    }

    const product = await Product.create({
      name,
      price,
      badge: badge || "NEW",
      description: description || "",
      deliveryCharges: parseInt(deliveryCharges) || 200,
      pieces: parsedPieces,
      imageIds,
      isExternal: false,
    });

    res.status(201).json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PUT update product ───────────────────────────────────────
app.put("/api/products/:id", upload.any(), async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    const { name, price, badge, description, deliveryCharges, pieces, keepImageIds } = req.body;

    // Which existing imageIds to keep (admin may have removed some)
    let keepIds = [];
    if (keepImageIds) {
      try { keepIds = JSON.parse(keepImageIds); } catch { keepIds = product.imageIds.map(id => String(id)); }
    } else {
      keepIds = product.imageIds.map(id => String(id));
    }

    // Delete removed images from GridFS
    const removedIds = product.imageIds.filter(id => !keepIds.includes(String(id)));
    for (const id of removedIds) {
      await deleteGridFSFile(id);
    }

    // Keep remaining
    const remainingIds = product.imageIds.filter(id => keepIds.includes(String(id)));

    // Upload new images
    const newImageIds = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const filename = `${uuidv4()}${path.extname(file.originalname)}`;
        const id = await saveToGridFS(file.buffer, filename, file.mimetype);
        newImageIds.push(id);
      }
    }

    product.name = name || product.name;
    product.price = price || product.price;
    product.badge = badge || product.badge;
    product.description = description !== undefined ? description : product.description;
    product.deliveryCharges = deliveryCharges !== undefined ? (parseInt(deliveryCharges) || 200) : product.deliveryCharges;
    if (pieces !== undefined) {
      try { product.pieces = JSON.parse(pieces); } catch { /* keep existing */ }
    }
    product.imageIds = [...remainingIds, ...newImageIds];

    // Clean up legacy imageId if we now have imageIds
    if (product.imageIds.length > 0 && product.imageId && !product.isExternal) {
      await deleteGridFSFile(product.imageId);
      product.imageId = null;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE product ───────────────────────────────────────────
app.delete("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });

    // Delete all imageIds from GridFS
    for (const id of product.imageIds) {
      await deleteGridFSFile(id);
    }
    // Also delete legacy imageId if any
    if (!product.isExternal && product.imageId) {
      await deleteGridFSFile(product.imageId);
    }

    await product.deleteOne();
    res.json({ message: "Product deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET liked products by clientId ──────────────────────────
app.get("/api/products/liked", async (req, res) => {
  try {
    const { clientId } = req.query;
    if (!clientId) return res.json([]);
    const products = await Product.find({ likedBy: clientId }).sort({ createdAt: -1 });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST toggle like ─────────────────────────────────────────
app.post("/api/products/:id/like", async (req, res) => {
  try {
    const { clientId } = req.body;
    if (!clientId) return res.status(400).json({ error: "clientId required" });
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    const idx = product.likedBy.indexOf(clientId);
    if (idx >= 0) {
      product.likedBy.splice(idx, 1);
    } else {
      product.likedBy.push(clientId);
    }
    await product.save();
    res.json({ liked: idx < 0, likeCount: product.likedBy.length });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET single product ───────────────────────────────────────
app.get("/api/products/:id", async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) return res.status(404).json({ error: "Product not found" });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── POST place order ─────────────────────────────────────────
app.post("/api/orders", async (req, res) => {
  try {
    const {
      customerName, phone, email, deliveryAddress,
      productId, productName, productPrice, size,
      quantity, deliveryCharges,
    } = req.body;

    if (!customerName || !phone || !email || !deliveryAddress || !productName || !productPrice || !size)
      return res.status(400).json({ error: "All fields are required" });

    const qty = Math.max(1, parseInt(quantity) || 1);
    const dc = parseInt(deliveryCharges) || 200;
    const numericPrice = parseInt(productPrice.replace(/[^0-9]/g, ""), 10) || 0;
    const total = (numericPrice * qty) + dc;
    const totalAmount = `PKR ${total.toLocaleString()}`;

    const order = await Order.create({
      customerName, phone, email, deliveryAddress,
      productId: productId || null,
      productName, productPrice, size,
      quantity: qty,
      deliveryCharges: dc,
      totalAmount,
    });

    res.status(201).json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── GET all orders (admin) ───────────────────────────────────
app.get("/api/orders", async (_req, res) => {
  try {
    const orders = await Order.find().sort({ createdAt: -1 });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── PATCH order status ───────────────────────────────────────
app.patch("/api/orders/:id/status", async (req, res) => {
  try {
    const { status } = req.body;
    const order = await Order.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE order ─────────────────────────────────────────────
app.delete("/api/orders/:id", async (req, res) => {
  try {
    const order = await Order.findByIdAndDelete(req.params.id);
    if (!order) return res.status(404).json({ error: "Order not found" });
    res.json({ message: "Order deleted successfully" });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// ── Local dev: start server directly ─────────────────────────
if (process.env.NODE_ENV !== "production") {
  connectDB()
    .then(() => {
      app.listen(PORT, () =>
        console.log(`🚀  Backend running at http://localhost:${PORT}\n`)
      );
    })
    .catch((err) => {
      console.error("❌  Startup failed:", err.message);
    });
}

// ── Vercel serverless export ──────────────────────────────────
module.exports = app;
