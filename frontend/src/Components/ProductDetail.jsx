import { useState, useEffect, useRef, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { jsPDF } from "jspdf";
import { useCart } from "./CartContext";
import "./ProductDetail.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

/* ── Invoice PDF ─────────────────────────────────────────── */
function generateInvoicePDF(order) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  let y = 20;

  doc.setFillColor(139, 26, 26);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(201, 169, 110);
  doc.setFontSize(26);
  doc.setFont("helvetica", "bold");
  doc.text("ZAREEN", 20, 20);
  doc.setFontSize(11);
  doc.setFont("helvetica", "normal");
  doc.text("by NaazAtif", 20, 28);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("ORDER INVOICE", W - 20, 24, { align: "right" });

  y = 52;
  doc.setTextColor(50, 50, 50);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  const orderId = `ORD-${String(order._id).slice(-6).toUpperCase()}`;
  const date = new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", {
    day: "2-digit", month: "long", year: "numeric",
  });
  doc.text(`Order ID: ${orderId}`, 20, y);
  doc.text(`Date: ${date}`, W - 20, y, { align: "right" });
  y += 10;
  doc.setDrawColor(220, 220, 220);
  doc.line(20, y, W - 20, y);
  y += 10;

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 26, 26);
  doc.text("CUSTOMER DETAILS", 20, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  doc.text(`Name:   ${order.customerName}`, 20, y); y += 7;
  doc.text(`Phone:  ${order.phone}`, 20, y); y += 7;
  doc.text(`Email:  ${order.email}`, 20, y); y += 7;
  y += 5; doc.line(20, y, W - 20, y); y += 10;

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 26, 26);
  doc.text("ORDER DETAILS", 20, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  doc.text(`Product:`,          20, y); doc.text(order.productName,                             70, y); y += 7;
  doc.text(`Size:`,             20, y); doc.text(order.size,                                    70, y); y += 7;
  doc.text(`Quantity:`,         20, y); doc.text(String(order.quantity || 1),                   70, y); y += 7;
  doc.text(`Product Price:`,    20, y); doc.text(order.productPrice,                            70, y); y += 7;
  doc.text(`Delivery Charges:`, 20, y); doc.text(`PKR ${(order.deliveryCharges || 200).toLocaleString()}`, 70, y); y += 3;

  doc.setFillColor(245, 240, 235);
  doc.rect(18, y, W - 36, 12, "F"); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(139, 26, 26);
  doc.text("TOTAL AMOUNT:", 20, y); doc.text(order.totalAmount, W - 20, y, { align: "right" }); y += 12;
  doc.line(20, y, W - 20, y); y += 10;

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 26, 26);
  doc.text("DELIVERY ADDRESS", 20, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  doc.text(doc.splitTextToSize(order.deliveryAddress, W - 40), 20, y);

  doc.setFillColor(139, 26, 26);
  doc.rect(0, 280, W, 17, "F");
  doc.setTextColor(201, 169, 110);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Thank you for shopping with ZAREEN by NaazAtif!", W / 2, 290, { align: "center" });

  doc.save(`ZAREEN-Invoice-${orderId}.pdf`);
}

/* ── MagnifierImage ──────────────────────────────────────── */
function MagnifierImage({ src, alt }) {
  const [lens, setLens] = useState({ active: false, x: 50, y: 50 });
  const imgRef = useRef(null);

  const handleMouseMove = useCallback((e) => {
    const rect = imgRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = Math.max(0, Math.min(100, ((e.clientX - rect.left) / rect.width) * 100));
    const y = Math.max(0, Math.min(100, ((e.clientY - rect.top) / rect.height) * 100));
    setLens({ active: true, x, y });
  }, []);

  return (
    <div
      className="mag-wrap"
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLens((l) => ({ ...l, active: false }))}
    >
      <img
        ref={imgRef}
        src={src}
        alt={alt}
        className="pd-image"
        onLoad={(e) => e.target.closest(".mag-wrap")?.classList.add("img-ready")}
      />
      <div
        className={`mag-lens${lens.active ? " mag-lens--active" : ""}`}
        style={{
          left: `${lens.x}%`,
          top: `${lens.y}%`,
          backgroundImage: `url(${src})`,
          backgroundSize: "300%",
          backgroundPosition: `${lens.x}% ${lens.y}%`,
        }}
      />
    </div>
  );
}

/* ── FloatingHeader ──────────────────────────────────────── */
function FloatingHeader({ visible, name, price, onBack, onCart, cartCount }) {
  return (
    <div className={`pd-float-header${visible ? " pd-float-header--visible" : ""}`}>
      <button className="pd-back-btn pd-back-btn--float" onClick={onBack}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"
          strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
          <polyline points="15 18 9 12 15 6" />
        </svg>
        Back
      </button>
      <div className="pd-float-identity">
        <span className="pd-float-name">{name}</span>
        <span className="pd-float-price">{price}</span>
      </div>
      <button className="pd-cart-icon-btn" onClick={onCart}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
        {cartCount > 0 && <span className="pd-cart-count">{cartCount}</span>}
      </button>
    </div>
  );
}

/* ── ProductDetail ───────────────────────────────────────── */
export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart, cartCount } = useCart();

  const [product, setProduct]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [quantity, setQuantity]         = useState(1);
  const [selectedImgIdx, setSelectedImgIdx] = useState(0);
  const [form, setForm]                 = useState({ customerName: "", phone: "", email: "", deliveryAddress: "" });
  const [placing, setPlacing]           = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [error, setError]               = useState("");
  const [cartToast, setCartToast]       = useState(false);
  const [showFloating, setShowFloating] = useState(false);

  const nameRef = useRef(null);

  /* Fetch product */
  useEffect(() => {
    fetch(`${API}/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => setProduct(data))
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  /* Floating header: watch when product name scrolls out of view */
  useEffect(() => {
    const el = nameRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setShowFloating(!entry.isIntersecting),
      { threshold: 0 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [product]);

  const showCartToast = () => {
    setCartToast(true);
    setTimeout(() => setCartToast(false), 2500);
  };

  const handleAddToCart = () => {
    if (!selectedSize) { setError("Please select a size first"); return; }
    setError("");
    addToCart({
      productId: product._id,
      productName: product.name,
      productPrice: product.price,
      productImg: imgs[0] || "",
      size: selectedSize,
      quantity,
      deliveryCharges: product.deliveryCharges || 200,
    });
    showCartToast();
  };

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!selectedSize) { setError("Please select a size to continue"); return; }
    setError(""); setPlacing(true);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          productId: product._id,
          productName: product.name,
          productPrice: product.price,
          size: selectedSize,
          quantity,
          deliveryCharges: product.deliveryCharges || 200,
        }),
      });
      const data = await res.json();
      if (res.ok) { setOrderSuccess(data); generateInvoicePDF(data); }
      else setError(data.error || "Order failed");
    } catch { setError("Server error. Make sure the backend is running."); }
    finally { setPlacing(false); }
  };

  /* ── Loading / Error states ── */
  if (loading) return (
    <div className="pd-loading-screen">
      <div className="pd-loading-spinner" />
      <p>Loading product...</p>
    </div>
  );
  if (error && !product) return <div className="pd-loading-screen"><p>{error}</p></div>;

  /* ── Derived values ── */
  const imgs = (product.imgs && product.imgs.length > 0)
    ? product.imgs
    : (product.img ? [product.img] : []);
  const activeImg      = imgs[selectedImgIdx] || "https://via.placeholder.com/600x750?text=No+Image";
  const deliveryCharges = product.deliveryCharges || 200;
  const numericPrice   = parseInt(product.price.replace(/[^0-9]/g, ""), 10) || 0;
  const total          = (numericPrice * quantity) + deliveryCharges;

  /* ── Success screen ── */
  if (orderSuccess) {
    const dc = orderSuccess.deliveryCharges || 200;
    return (
      <div className="pd-success-page">
        <div className="pd-success-card">
          <div className="pd-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
              strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="pd-success-eyebrow">ORDER CONFIRMED</p>
          <h2>Thank You!</h2>
          <p className="pd-success-order-id">ORD-{String(orderSuccess._id).slice(-6).toUpperCase()}</p>
          <p className="pd-success-msg">
            Your invoice has been downloaded. We'll contact you at{" "}
            <strong>{orderSuccess.phone}</strong> to confirm delivery.
          </p>
          <div className="pd-success-summary">
            <div className="pd-summary-row"><span>Product</span><span>{orderSuccess.productName}</span></div>
            <div className="pd-summary-row"><span>Size</span><span>{orderSuccess.size}</span></div>
            <div className="pd-summary-row"><span>Quantity</span><span>{orderSuccess.quantity || 1}</span></div>
            <div className="pd-summary-row"><span>Product Price</span><span>{orderSuccess.productPrice}</span></div>
            <div className="pd-summary-row"><span>Delivery</span><span>PKR {dc.toLocaleString()}</span></div>
            <div className="pd-summary-row total"><span>Total</span><span>{orderSuccess.totalAmount}</span></div>
          </div>
          <div className="pd-success-btns">
            <button className="pd-btn-secondary" onClick={() => generateInvoicePDF(orderSuccess)}>↓ Invoice</button>
            <button className="pd-btn-primary" onClick={() => navigate("/")}>Continue Shopping</button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Main PDP ── */
  return (
    <div className="pd-page">

      {/* Floating header — slides in when product name is out of view */}
      <FloatingHeader
        visible={showFloating}
        name={product.name}
        price={product.price}
        onBack={() => navigate(-1)}
        onCart={() => navigate("/cart")}
        cartCount={cartCount}
      />

      {/* Cart toast */}
      {cartToast && (
        <div className="pd-cart-toast">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            width="16" height="16">
            <polyline points="20 6 9 17 4 12" />
          </svg>
          Added to cart!
          <button onClick={() => navigate("/cart")}>View Cart →</button>
        </div>
      )}

      {/* Topbar */}
      <div className="pd-topbar">
        <button className="pd-back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
            style={{ width: 14, height: 14 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="pd-brand">ZAREEN <span>by NaazAtif</span></span>
        <button className="pd-cart-icon-btn" onClick={() => navigate("/cart")}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
            strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            width="18" height="18">
            <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
            <line x1="3" y1="6" x2="21" y2="6"/>
            <path d="M16 10a4 4 0 01-8 0"/>
          </svg>
          {cartCount > 0 && <span className="pd-cart-count">{cartCount}</span>}
        </button>
      </div>

      {/* ── Split-screen layout ── */}
      <div className="pd-container">

        {/* LEFT — Sticky image gallery */}
        <div className="pd-image-col">

          {/* Gallery: swipeable on mobile, vertical thumbs on desktop */}
          <div className="pd-gallery-layout">
            {imgs.length > 1 && (
              <div className="pd-vert-thumbs">
                {imgs.map((url, idx) => (
                  <button
                    key={idx}
                    className={`pd-thumb${selectedImgIdx === idx ? " pd-thumb-active" : ""}`}
                    onClick={() => setSelectedImgIdx(idx)}
                    aria-label={`View image ${idx + 1}`}
                  >
                    <img src={url} alt={`${product.name} ${idx + 1}`} />
                  </button>
                ))}
              </div>
            )}

            {/* Main image — swipeable on mobile */}
            <div className="pd-main-image-wrap">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={selectedImgIdx}
                  className="pd-swipe-frame"
                  drag="x"
                  dragConstraints={{ left: 0, right: 0 }}
                  dragElastic={0.18}
                  onDragEnd={(_, info) => {
                    if (info.offset.x < -55 && selectedImgIdx < imgs.length - 1)
                      setSelectedImgIdx((i) => i + 1);
                    else if (info.offset.x > 55 && selectedImgIdx > 0)
                      setSelectedImgIdx((i) => i - 1);
                  }}
                  initial={{ opacity: 0, x: 40 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -40 }}
                  transition={{ type: "spring", stiffness: 320, damping: 30 }}
                  style={{ height: "100%", width: "100%", touchAction: "pan-y" }}
                >
                  <MagnifierImage src={activeImg} alt={product.name} />
                </motion.div>
              </AnimatePresence>

              <span className="pd-badge">{product.badge}</span>
              <div className="pd-image-corner" />

              {/* Dot indicators — mobile only */}
              {imgs.length > 1 && (
                <div className="pd-img-dots">
                  {imgs.map((_, idx) => (
                    <motion.button
                      key={idx}
                      className={`pd-img-dot${selectedImgIdx === idx ? " pd-img-dot--active" : ""}`}
                      onClick={() => setSelectedImgIdx(idx)}
                      whileTap={{ scale: 0.8 }}
                      aria-label={`Image ${idx + 1}`}
                    />
                  ))}
                </div>
              )}

              {/* Counter */}
              {imgs.length > 1 && (
                <span className="pd-img-counter">{selectedImgIdx + 1} / {imgs.length}</span>
              )}
            </div>
          </div>

          {/* Trust bar */}
          <div className="pd-trust-bar">
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Authentic</span>
            </div>
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"/>
                <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/>
                <circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span>Free Returns</span>
            </div>
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/>
                <polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Fast Delivery</span>
            </div>
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/>
                <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Cash on Delivery</span>
            </div>
          </div>
        </div>

        {/* RIGHT — Scrollable product info + form */}
        <div className="pd-info-col">
          <div className="pd-info-inner">

            <p className="pd-eyebrow">ZAREEN BY NAAZATIF</p>
            <h1 className="pd-name" ref={nameRef}>{product.name}</h1>

            <div className="pd-price-block">
              <span className="pd-price">{product.price}</span>
              <span className="pd-price-tag">Incl. all taxes</span>
            </div>

            {product.description && (
              <p className="pd-description">{product.description}</p>
            )}

            {product.pieces && product.pieces.length > 0 && (
              <div className="pd-pieces">
                <p className="pd-section-label" style={{ marginBottom: 12 }}>DESCRIPTION</p>
                {product.pieces.map((piece, idx) => (
                  <div key={idx} className="pd-piece-item">
                    {piece.pieceName && <p className="pd-piece-name">{piece.pieceName}</p>}
                    {piece.description && <p className="pd-piece-desc">{piece.description}</p>}
                  </div>
                ))}
              </div>
            )}

            <div className="pd-divider" />

            {/* Size */}
            <div className="pd-section">
              <div className="pd-section-header-row">
                <p className="pd-section-label">SELECT SIZE</p>
                {selectedSize && <span className="pd-selected-size-label">{selectedSize} selected</span>}
              </div>
              <div className="pd-sizes">
                {["XS", "S", "M", "L", "XL"].map((code) => (
                  <motion.button
                    key={code}
                    className={`pd-size-btn${selectedSize === code ? " selected" : ""}`}
                    onClick={() => setSelectedSize(code)}
                    whileTap={{ scale: 0.93 }}
                  >
                    {code}
                  </motion.button>
                ))}
              </div>
            </div>

            <div className="pd-divider" />

            {/* Quantity */}
            <div className="pd-section">
              <p className="pd-section-label">QUANTITY</p>
              <div className="pd-qty-row">
                <div className="pd-qty-ctrl">
                  <button className="pd-qty-btn" onClick={() => setQuantity((q) => Math.max(1, q - 1))}>−</button>
                  <span className="pd-qty-num">{quantity}</span>
                  <button className="pd-qty-btn" onClick={() => setQuantity((q) => q + 1)}>+</button>
                </div>
                <span className="pd-qty-total">
                  Subtotal: PKR {(numericPrice * quantity).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="pd-divider" />

            {error && <p className="pd-error" style={{ marginBottom: 12 }}>{error}</p>}

            {/* CTA buttons */}
            <div className="pd-action-btns">
              <motion.button className="pd-add-to-cart-btn" onClick={handleAddToCart} whileTap={{ scale: 0.97 }}>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor"
                  strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"
                  width="16" height="16">
                  <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                  <line x1="3" y1="6" x2="21" y2="6"/>
                  <path d="M16 10a4 4 0 01-8 0"/>
                </svg>
                ADD TO CART
              </motion.button>
              <motion.button
                className="pd-order-now-btn"
                onClick={() => document.querySelector(".pd-form")?.scrollIntoView({ behavior: "smooth" })}
                whileTap={{ scale: 0.97 }}
              >
                ORDER NOW
              </motion.button>
            </div>

            <div className="pd-divider" />

            {/* Order form */}
            <form className="pd-form" onSubmit={handleOrder}>
              <p className="pd-section-label">YOUR DETAILS</p>

              <div className="pd-form-row">
                <div className="pd-form-group">
                  <label>Full Name *</label>
                  <input className="pd-input" placeholder="Fatima Khan" required
                    value={form.customerName}
                    onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                </div>
                <div className="pd-form-group">
                  <label>WhatsApp / Phone *</label>
                  <input className="pd-input" placeholder="0300-1234567" required
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                </div>
              </div>

              <div className="pd-form-group">
                <label>Email Address *</label>
                <input className="pd-input" type="email" placeholder="fatima@email.com" required
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>

              <div className="pd-form-group">
                <label>Delivery Address *</label>
                <textarea className="pd-input pd-textarea" rows={3}
                  placeholder="House no., Street, Area, City" required
                  value={form.deliveryAddress}
                  onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
              </div>

              <div className="pd-price-summary">
                <div className="pd-price-row"><span>Product Price</span><span>{product.price}</span></div>
                <div className="pd-price-row"><span>Quantity</span><span>× {quantity}</span></div>
                <div className="pd-price-row"><span>Delivery Charges</span><span>PKR {deliveryCharges.toLocaleString()}</span></div>
                <div className="pd-price-row total">
                  <span>Total Payable</span>
                  <span>PKR {total.toLocaleString()}</span>
                </div>
              </div>

              <div className="pd-info-pills">
                <div className="pd-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/>
                    <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  Cash on Delivery
                </div>
                <div className="pd-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"/>
                    <polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/>
                    <circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Fast Shipping
                </div>
              </div>

              {error && <p className="pd-error">{error}</p>}

              <motion.button type="submit" className="pd-order-btn" disabled={placing} whileTap={{ scale: 0.98 }}>
                {placing ? (
                  <span className="pd-btn-loading">
                    <span className="pd-btn-spinner" /> Placing Order...
                  </span>
                ) : (
                  <>
                    <svg className="pd-btn-icon" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2.2"
                      strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
                      <line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    PLACE ORDER & GET INVOICE
                  </>
                )}
              </motion.button>

              <p className="pd-wa-note">
                Questions?{" "}
                <a href="https://wa.me/923205623004" target="_blank" rel="noreferrer" className="pd-wa-link">
                  WhatsApp us →
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* Sticky mobile bar */}
      <div className="pd-sticky-bar">
        <div className="pd-sticky-info">
          <span className="pd-sticky-name">{product.name}</span>
          <span className="pd-sticky-price">{product.price}</span>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <motion.button className="pd-sticky-cart-btn" onClick={handleAddToCart} whileTap={{ scale: 0.93 }}>+ Cart</motion.button>
          <motion.button
            className="pd-sticky-btn"
            onClick={() => document.querySelector(".pd-form")?.scrollIntoView({ behavior: "smooth" })}
            whileTap={{ scale: 0.95 }}
          >
            Order Now
          </motion.button>
        </div>
      </div>
    </div>
  );
}
