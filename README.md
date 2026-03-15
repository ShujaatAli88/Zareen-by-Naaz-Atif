# Zareen's Wardrobe — Full Stack E-Commerce

A premium Pakistani fashion e-commerce platform built with React and Node.js. Customers can browse and order clothing, while the admin manages products and orders through a private dashboard.

---

## Project Structure

```
clothing_brand/
├── frontend/          # React 19 customer-facing app
└── backend/           # Node.js + Express REST API
```

---

## Tech Stack

| Layer     | Technology                                    |
|-----------|-----------------------------------------------|
| Frontend  | React 19, React Router DOM, CSS (mobile-first)|
| Backend   | Node.js, Express.js                           |
| Database  | MongoDB Atlas + Mongoose                      |
| Images    | MongoDB GridFS (stored in DB, not filesystem) |
| Hosting   | Vercel (frontend + backend, separate projects)|

---

## Features

### Customer Side
- Browse all products with live search and category filters
- Product detail page with size selector and order form
- Invoice PDF generation after placing an order
- About Us modal with brand story
- Fully responsive — mobile-first design

### Admin Panel (`/admin`)
- Password-protected login (password stored in MongoDB)
- Add, edit, and delete products with image upload
- View and manage all customer orders
- Update order status (Pending → Processing → Delivered → Cancelled)
- Delete orders with confirmation

---

## Local Development

### Prerequisites
- Node.js 18+
- A MongoDB Atlas cluster (free tier works)

### 1 — Clone the repo

```bash
git clone https://github.com/YOUR_USERNAME/zareen-wardrobe.git
cd zareen-wardrobe
```

### 2 — Set up the Backend

```bash
cd backend
npm install
```

Create `backend/.env`:

```env
MONGO_URI=your_mongodb_atlas_connection_string
PORT=5000
BASE_URL=http://localhost:5000
FRONTEND_URL=http://localhost:3000
```

Start the backend:

```bash
npm run dev       # development (nodemon auto-restart)
npm start         # production
```

Backend runs at `http://localhost:5000`

### 3 — Set up the Frontend

```bash
cd frontend
npm install
npm start
```

Frontend runs at `http://localhost:3000`

> The frontend automatically uses `http://localhost:5000` as the API in development — no `.env` needed locally.

---

## Environment Variables

### Backend (`backend/.env`)

| Variable       | Description                                      | Required |
|----------------|--------------------------------------------------|----------|
| `MONGO_URI`    | MongoDB Atlas connection string                  | ✅       |
| `PORT`         | Port the server listens on (default: 5000)       | ❌       |
| `BASE_URL`     | Public URL of this backend (used for image URLs) | ✅ prod  |
| `FRONTEND_URL` | Frontend URL for CORS (use `*` to allow all)     | ❌       |

### Frontend (Vercel environment variables)

| Variable              | Description                        | Required |
|-----------------------|------------------------------------|----------|
| `REACT_APP_API_URL`   | Full URL of the deployed backend   | ✅ prod  |

---

## API Endpoints

### Products
| Method | Route                      | Description               |
|--------|----------------------------|---------------------------|
| GET    | `/api/products`            | Get all products          |
| GET    | `/api/products/:id`        | Get single product        |
| POST   | `/api/products`            | Create product (+ image)  |
| PUT    | `/api/products/:id`        | Update product (+ image)  |
| DELETE | `/api/products/:id`        | Delete product + image    |
| POST   | `/api/products/:id/like`   | Toggle like on product    |
| GET    | `/api/products/liked`      | Get liked products        |

### Orders
| Method | Route                        | Description              |
|--------|------------------------------|--------------------------|
|POST    | `/api/orders`                | Place a new order        |
| GET    | `/api/orders`                | Get all orders (admin)   |
| PATCH  | `/api/orders/:id/status`     | Update order status      |
| DELETE | `/api/orders/:id`            | Delete an order          |

### Images
| Method | Route              | Description                      |
|--------|--------------------|----------------------------------|
| GET    | `/api/images/:id`  | Serve image from GridFS by ID    |

### Auth
| Method | Route                | Description         |
|--------|----------------------|---------------------|
| POST   | `/api/admin/login`   | Admin login         |

---

## Deployment (Vercel)

The project deploys as **two separate Vercel projects** from the same GitHub repo.

### Step 1 — Push to GitHub

```bash
cd clothing_brand
git init
git add .
git commit -m "initial commit"
git remote add origin https://github.com/YOUR_USERNAME/zareen-wardrobe.git
git push -u origin main
```

### Step 2 — Deploy Backend

1. Vercel → **Add New Project** → import your repo
2. **Root Directory** → `backend`
3. **Framework Preset** → `Other`
4. Add environment variables:
   - `MONGO_URI` = your Atlas URI
   - `BASE_URL` = `https://your-backend.vercel.app`
5. Deploy → note the URL (e.g. `https://zareen-backend.vercel.app`)

### Step 3 — Deploy Frontend

1. Vercel → **Add New Project** → same repo
2. **Root Directory** → `frontend`
3. **Framework Preset** → `Create React App`
4. Add environment variables:
   - `REACT_APP_API_URL` = `https://zareen-backend.vercel.app`
5. Deploy

### Step 4 — Update Backend CORS

Go back to the backend Vercel project → Settings → Environment Variables → add:
- `FRONTEND_URL` = `https://your-frontend.vercel.app`

Redeploy the backend once.

---

## Admin Access

Navigate to `/admin` on the frontend.

The admin password is stored in MongoDB in the `adminconfigs` collection. On first server start, it is automatically seeded with:

```
adminNaazAtif3321
```

To change it: update the document directly in MongoDB Atlas.

---

## Image Storage

Product images are stored directly in **MongoDB GridFS** — no external file storage service needed. Each image is uploaded via the admin panel and served through `/api/images/:id`.

---

## Brand

**Zareen's Wardrobe by NaazAtif** — Est. 2025
Inspired by the culture and craftsmanship of Gilgit-Baltistan, Pakistan.

- Instagram: [@zareen_by_naaz](https://www.instagram.com/zareen_by_naaz)
- WhatsApp: +92 355 5353536
"# Zareen-by-Naaz-Atif" 
