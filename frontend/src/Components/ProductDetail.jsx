import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import "./ProductDetail.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

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
  const date = new Date(order.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
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
  doc.text(`Product:`, 20, y); doc.text(order.productName, 70, y); y += 7;
  doc.text(`Size:`, 20, y); doc.text(order.size, 70, y); y += 7;
  doc.text(`Product Price:`, 20, y); doc.text(order.productPrice, 70, y); y += 7;
  doc.text(`Delivery Charges:`, 20, y); doc.text("PKR 200", 70, y); y += 3;

  doc.setFillColor(245, 240, 235);
  doc.rect(18, y, W - 36, 12, "F"); y += 8;
  doc.setFont("helvetica", "bold"); doc.setFontSize(11); doc.setTextColor(139, 26, 26);
  doc.text("TOTAL AMOUNT:", 20, y); doc.text(order.totalAmount, W - 20, y, { align: "right" }); y += 12;
  doc.line(20, y, W - 20, y); y += 10;

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 26, 26);
  doc.text("DELIVERY ADDRESS", 20, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  const addressLines = doc.splitTextToSize(order.deliveryAddress, W - 40);
  doc.text(addressLines, 20, y); y += addressLines.length * 7 + 8;

  doc.setFillColor(139, 26, 26);
  doc.rect(0, 280, W, 17, "F");
  doc.setTextColor(201, 169, 110);
  doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Thank you for shopping with ZAREEN by NaazAtif!", W / 2, 290, { align: "center" });

  doc.save(`ZAREEN-Invoice-${orderId}.pdf`);
}

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedSize, setSelectedSize] = useState("");
  const [form, setForm] = useState({ customerName: "", phone: "", email: "", deliveryAddress: "" });
  const [placing, setPlacing] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState(null);
  const [error, setError] = useState("");
  const [imgLoaded, setImgLoaded] = useState(false);

  useEffect(() => {
    fetch(`${API}/api/products/${id}`)
      .then((r) => r.json())
      .then((data) => setProduct(data))
      .catch(() => setError("Failed to load product"))
      .finally(() => setLoading(false));
  }, [id]);

  const handleOrder = async (e) => {
    e.preventDefault();
    if (!selectedSize) { setError("Please select a size to continue"); return; }
    setError(""); setPlacing(true);
    try {
      const res = await fetch(`${API}/api/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, productId: product._id, productName: product.name, productPrice: product.price, size: selectedSize }),
      });
      const data = await res.json();
      if (res.ok) { setOrderSuccess(data); generateInvoicePDF(data); }
      else setError(data.error || "Order failed");
    } catch { setError("Server error. Make sure the backend is running."); }
    finally { setPlacing(false); }
  };

  if (loading) return (
    <div className="pd-loading-screen">
      <div className="pd-loading-spinner" />
      <p>Loading product...</p>
    </div>
  );
  if (error && !product) return <div className="pd-loading-screen"><p>{error}</p></div>;

  if (orderSuccess) {
    return (
      <div className="pd-success-page">
        <div className="pd-success-card">
          <div className="pd-success-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <p className="pd-success-eyebrow">ORDER CONFIRMED</p>
          <h2>Thank You!</h2>
          <p className="pd-success-order-id">ORD-{String(orderSuccess._id).slice(-6).toUpperCase()}</p>
          <p className="pd-success-msg">
            Your invoice has been downloaded. We'll contact you at <strong>{orderSuccess.phone}</strong> to confirm delivery.
          </p>
          <div className="pd-success-summary">
            <div className="pd-summary-row"><span>Product</span><span>{orderSuccess.productName}</span></div>
            <div className="pd-summary-row"><span>Size</span><span>{orderSuccess.size}</span></div>
            <div className="pd-summary-row"><span>Product Price</span><span>{orderSuccess.productPrice}</span></div>
            <div className="pd-summary-row"><span>Delivery</span><span>PKR 200</span></div>
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

  const numericPrice = parseInt(product.price.replace(/[^0-9]/g, ""), 10) || 0;
  const total = numericPrice + 200;

  return (
    <div className="pd-page">
      {/* ── Topbar ── */}
      <div className="pd-topbar">
        <button className="pd-back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{width:14,height:14}}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="pd-brand">ZAREEN <span>by NaazAtif</span></span>
        <div style={{width:80}} />
      </div>

      <div className="pd-container">
        {/* ── Left: Image ── */}
        <div className="pd-image-col">
          <div className={`pd-image-wrapper${imgLoaded ? " img-ready" : ""}`}>
            {!imgLoaded && <div className="pd-img-skeleton" />}
            <img
              src={product.img || "https://via.placeholder.com/600x750?text=No+Image"}
              alt={product.name}
              className="pd-image"
              onLoad={() => setImgLoaded(true)}
              style={{ opacity: imgLoaded ? 1 : 0 }}
            />
            <div className="pd-image-overlay" />
            <span className="pd-badge">{product.badge}</span>
            {/* Decorative corner */}
            <div className="pd-image-corner" />
          </div>

          {/* Trust bar under image */}
          <div className="pd-trust-bar">
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
              </svg>
              <span>Authentic</span>
            </div>
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
              </svg>
              <span>Free Returns</span>
            </div>
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>Fast Delivery</span>
            </div>
            <div className="pd-trust-item">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
              </svg>
              <span>Cash on Delivery</span>
            </div>
          </div>
        </div>

        {/* ── Right: Info + Form ── */}
        <div className="pd-info-col">
          <div className="pd-info-inner">
            <p className="pd-eyebrow">ZAREEN BY NAAZATIF</p>
            <h1 className="pd-name">{product.name}</h1>

            <div className="pd-price-block">
              <span className="pd-price">{product.price}</span>
              <span className="pd-price-tag">Incl. all taxes</span>
            </div>

            {product.description && (
              <p className="pd-description">{product.description}</p>
            )}

            <div className="pd-divider" />

            {/* Size */}
            <div className="pd-section">
              <div className="pd-section-header-row">
                <p className="pd-section-label">SELECT SIZE</p>
                {selectedSize && <span className="pd-selected-size-label">{selectedSize === "S" ? "Small" : selectedSize === "M" ? "Medium" : "Large"} selected</span>}
              </div>
              {/* Size tags — styled like physical ZAREEN woven label specs (60MM × 18MM) */}
              <div className="pd-sizes">
                {[
                  { code: "S", name: "Small" },
                  { code: "M", name: "Medium" },
                  { code: "L", name: "Large" },
                ].map(({ code, name }) => (
                  <div key={code} className="pd-size-tag-wrapper">

                    {/* ── Top dimension line: 60MM ── */}
                    <div className="pd-dim-top">
                      <span className="pd-dim-tick" />
                      <span className="pd-dim-line-h" />
                      <span className="pd-dim-value">60MM</span>
                      <span className="pd-dim-line-h" />
                      <span className="pd-dim-tick" />
                    </div>

                    <div className="pd-size-tag-row">
                      {/* ── Left dimension line: 18MM ── */}
                      <div className="pd-dim-left">
                        <span className="pd-dim-tick-v" />
                        <span className="pd-dim-line-v" />
                        <span className="pd-dim-value-v">18MM</span>
                        <span className="pd-dim-line-v" />
                        <span className="pd-dim-tick-v" />
                      </div>

                      {/* ── The actual label tag ── */}
                      <button
                        className={`pd-size-tag${selectedSize === code ? " selected" : ""}`}
                        onClick={() => setSelectedSize(code)}
                        title={name}
                      >
                        <span className="pd-tag-brand">
                          <span className="pd-tag-brand-main">ZAREEN</span>
                          <span className="pd-tag-brand-sub">by naazatif</span>
                        </span>
                        <span className="pd-tag-size">{code}</span>
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            </div>

            <div className="pd-divider" />

            {/* Form */}
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
                  placeholder="House no., Street, Area, City"
                  required
                  value={form.deliveryAddress}
                  onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
              </div>

              {/* Price Summary */}
              <div className="pd-price-summary">
                <div className="pd-price-row"><span>Product Price</span><span>{product.price}</span></div>
                <div className="pd-price-row"><span>Delivery Charges</span><span>PKR 200</span></div>
                <div className="pd-price-row total">
                  <span>Total Payable</span>
                  <span>PKR {total.toLocaleString()}</span>
                </div>
              </div>

              {/* Info pills */}
              <div className="pd-info-pills">
                <div className="pd-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
                  </svg>
                  Cash on Delivery
                </div>
                <div className="pd-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="1" y="3" width="15" height="13"/><polygon points="16 8 20 8 23 11 23 16 16 16 16 8"/>
                    <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
                  </svg>
                  Fast Shipping
                </div>
                <div className="pd-pill">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.99 12"/>
                  </svg>
                  WhatsApp Updates
                </div>
              </div>

              {error && <p className="pd-error">{error}</p>}

              <button type="submit" className="pd-order-btn" disabled={placing}>
                {placing ? (
                  <span className="pd-btn-loading">
                    <span className="pd-btn-spinner" /> Placing Order...
                  </span>
                ) : (
                  <>
                    <svg className="pd-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/>
                      <path d="M16 10a4 4 0 01-8 0"/>
                    </svg>
                    PLACE ORDER & GET INVOICE
                  </>
                )}
              </button>

              <p className="pd-wa-note">
                Questions?{" "}
                <a href="https://wa.me/923555353536" target="_blank" rel="noreferrer" className="pd-wa-link">
                  WhatsApp us →
                </a>
              </p>
            </form>
          </div>
        </div>
      </div>

      {/* ── Sticky mobile bar ── */}
      <div className="pd-sticky-bar">
        <div className="pd-sticky-info">
          <span className="pd-sticky-name">{product.name}</span>
          <span className="pd-sticky-price">{product.price}</span>
        </div>
        <button
          className="pd-sticky-btn"
          onClick={() => { document.querySelector(".pd-form")?.scrollIntoView({ behavior: "smooth" }); }}
        >
          Order Now
        </button>
      </div>
    </div>
  );
}
