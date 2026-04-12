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
    discount: { type: Number, default: 0, min: 0, max: 100 },
    inStock: { type: Boolean, default: true },
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
    productImageUrl: { type: String, default: "" }, // snapshot of first image at order time
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
let gfsBucket = null;

// ── Multer: keep file in memory, we push it to GridFS ───────
// Images are compressed on the frontend (≈300 KB each) before upload,
// so a 5-image batch is well under Vercel's 4.5 MB body limit.
const upload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (_req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const valid =
      allowed.test(path.extname(file.originalname).toLowerCase()) &&
      allowed.test(file.mimetype);
    if (valid) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed (JPG, PNG, WEBP, GIF)"), false);
    }
  },
  limits: {
    fileSize: 5 * 1024 * 1024, // 5 MB per file (compressed images are ~300 KB)
    files: 10,                  // max 10 files per request
  },
});

// ── MongoDB connection cache (serverless-safe) ────────────────
let isConnected = false;
let connectingPromise = null; // prevent concurrent connect() calls

async function connectDB() {
  // Already connected and healthy — return immediately
  if (isConnected && mongoose.connection.readyState === 1 && gfsBucket) return;

  // If a connection attempt is already in progress, await it instead of starting a new one
  if (connectingPromise) return connectingPromise;

  if (!MONGO_URI) throw new Error("MONGO_URI environment variable is not set");

  connectingPromise = (async () => {
    try {
      await mongoose.connect(MONGO_URI, {
        serverSelectionTimeoutMS: 10000, // fail fast — don't hang for 30s
        socketTimeoutMS: 45000,
      });

      // Only mark connected AFTER gfsBucket is ready
      gfsBucket = new GridFSBucket(mongoose.connection.db, { bucketName: "uploads" });
      isConnected = true;

      // Seed admin password once
      const existing = await AdminConfig.findOne();
      if (!existing) {
        await AdminConfig.create({ password: "adminNaazAtif3321" });
        console.log("🔑  Admin password seeded");
      }
      console.log("✅  Connected to MongoDB Atlas");
    } finally {
      connectingPromise = null; // reset so next call can retry if this one failed
    }
  })();

  return connectingPromise;
}

// Reset state when mongoose loses connection so the next request re-connects
mongoose.connection.on("disconnected", () => {
  console.warn("⚠️  MongoDB disconnected — will reconnect on next request");
  isConnected = false;
  gfsBucket = null;
});
mongoose.connection.on("error", (err) => {
  console.error("MongoDB connection error:", err.message);
  isConnected = false;
  gfsBucket = null;
});

// ── Health check (no DB required) ────────────────────────────
app.get("/api/health", (_req, res) => {
  res.json({
    status: "ok",
    db: mongoose.connection.readyState === 1 ? "connected" : "disconnected",
    time: new Date().toISOString(),
  });
});

// ── DB connection middleware ──────────────────────────────────
app.use(async (req, res, next) => {
  try {
    await connectDB();
    next();
  } catch (err) {
    console.error("DB connection error:", err.message);
    res.status(503).json({ error: "Database unavailable — " + err.message });
  }
});

// ── Helper: save buffer → GridFS, returns the new file _id ──
function saveToGridFS(buffer, filename, mimetype) {
  if (!gfsBucket) throw new Error("Database not ready — GridFS bucket is not initialised");
  return new Promise((resolve, reject) => {
    const uploadStream = gfsBucket.openUploadStream(filename, {
      metadata: { mimetype },
    });
    const readable = Readable.from(buffer);
    readable.pipe(uploadStream);
    uploadStream.on("finish", () => resolve(uploadStream.id));
    uploadStream.on("error", reject);
    readable.on("error", reject);
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
    const { name, price, badge, description, deliveryCharges, pieces, discount, inStock } = req.body;
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
      discount: Math.min(100, Math.max(0, parseFloat(discount) || 0)),
      inStock: inStock === "false" ? false : true,
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

    const { name, price, badge, description, deliveryCharges, pieces, keepImageIds, discount, inStock } = req.body;

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

    // Build explicit $set — bypasses Mongoose dirty-tracking entirely
    const $set = {};
    if (name)                    $set.name             = name;
    if (price)                   $set.price            = price;
    if (badge)                   $set.badge            = badge;
    if (description !== undefined) $set.description    = description;
    if (deliveryCharges !== undefined) $set.deliveryCharges = parseInt(deliveryCharges) || 200;
    if (discount !== undefined)  $set.discount         = Math.min(100, Math.max(0, parseFloat(discount) || 0));
    if (inStock !== undefined)   $set.inStock          = (inStock !== "false");
    if (pieces !== undefined) {
      try { $set.pieces = JSON.parse(pieces); } catch { /* keep existing */ }
    }
    $set.imageIds = [...remainingIds, ...newImageIds];

    // Clean up legacy imageId if we now have imageIds
    if ($set.imageIds.length > 0 && product.imageId && !product.isExternal) {
      await deleteGridFSFile(product.imageId);
      $set.imageId = null;
    }

    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set },
      { new: true }
    );
    res.json(updated);
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

// ── PATCH stock status ───────────────────────────────────────
app.patch("/api/products/:id/stock", async (req, res) => {
  try {
    const { inStock } = req.body;
    if (typeof inStock !== "boolean")
      return res.status(400).json({ error: "inStock must be a boolean" });
    const updated = await Product.findByIdAndUpdate(
      req.params.id,
      { $set: { inStock } },
      { new: true }
    );
    if (!updated) return res.status(404).json({ error: "Product not found" });
    res.json(updated);
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

    // Snapshot the product's first image URL so the admin always sees it,
    // even if the product is edited or deleted later
    let productImageUrl = "";
    if (productId) {
      try {
        const prod = await Product.findById(productId);
        if (prod) {
          if (prod.isExternal && prod.externalImg) {
            productImageUrl = prod.externalImg;
          } else if (prod.imageIds && prod.imageIds.length > 0) {
            productImageUrl = `${BASE_URL}/api/images/${prod.imageIds[0]}`;
          } else if (prod.imageId) {
            productImageUrl = `${BASE_URL}/api/images/${prod.imageId}`;
          }
        }
      } catch { /* if product lookup fails, just leave imageUrl blank */ }
    }

    const order = await Order.create({
      customerName, phone, email, deliveryAddress,
      productId: productId || null,
      productName, productPrice, productImageUrl, size,
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
    const orders = await Order.find()
      .sort({ createdAt: -1 })
      .populate("productId", "imageIds imageId isExternal externalImg");
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

// ── Local dev: start server, then attempt DB connection ──────
// Server ALWAYS listens — DB failures are handled per-request by the middleware.
if (process.env.NODE_ENV !== "production") {
  app.listen(PORT, () => {
    console.log(`🚀  Backend running at http://localhost:${PORT}`);
    // Attempt early connection so first request is fast, but don't block startup
    connectDB().catch((err) =>
      console.error("⚠️  Initial DB connect failed (will retry on first request):", err.message)
    );
  });
}

// ── Vercel serverless export ──────────────────────────────────
module.exports = app;
