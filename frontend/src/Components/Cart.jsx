import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { jsPDF } from "jspdf";
import { useCart } from "./CartContext";
import "./Cart.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";

function generateCartInvoicePDF(orders, customer) {
  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const W = 210;
  let y = 20;

  doc.setFillColor(139, 26, 26);
  doc.rect(0, 0, W, 38, "F");
  doc.setTextColor(201, 169, 110);
  doc.setFontSize(26); doc.setFont("helvetica", "bold");
  doc.text("ZAREEN", 20, 20);
  doc.setFontSize(11); doc.setFont("helvetica", "normal");
  doc.text("by NaazAtif", 20, 28);
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(10);
  doc.text("ORDER INVOICE", W - 20, 24, { align: "right" });

  y = 52;
  doc.setTextColor(50, 50, 50); doc.setFontSize(9); doc.setFont("helvetica", "normal");
  const firstOrder = orders[0];
  const orderId = `ORD-${String(firstOrder._id).slice(-6).toUpperCase()}`;
  const date = new Date(firstOrder.createdAt || Date.now()).toLocaleDateString("en-GB", { day: "2-digit", month: "long", year: "numeric" });
  doc.text(`Order ID: ${orderId}`, 20, y);
  doc.text(`Date: ${date}`, W - 20, y, { align: "right" });
  y += 10;
  doc.setDrawColor(220, 220, 220); doc.line(20, y, W - 20, y); y += 10;

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 26, 26);
  doc.text("CUSTOMER DETAILS", 20, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  doc.text(`Name:    ${customer.customerName}`, 20, y); y += 7;
  doc.text(`Phone:   ${customer.phone}`, 20, y); y += 7;
  doc.text(`Email:   ${customer.email}`, 20, y); y += 7;
  y += 5; doc.line(20, y, W - 20, y); y += 10;

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 26, 26);
  doc.text("ORDER ITEMS", 20, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);

  let grandTotal = 0;
  for (const order of orders) {
    doc.text(`• ${order.productName}`, 20, y);
    doc.text(`Size: ${order.size}  Qty: ${order.quantity || 1}`, 70, y);
    doc.text(order.productPrice, W - 20, y, { align: "right" });
    y += 7;
    const num = parseInt((order.totalAmount || "").replace(/[^0-9]/g, ""), 10) || 0;
    grandTotal += num;
  }
  y += 5; doc.line(20, y, W - 20, y); y += 10;

  doc.setFillColor(245, 240, 235);
  doc.rect(18, y - 2, W - 36, 13, "F"); y += 7;
  doc.setFont("helvetica", "bold"); doc.setFontSize(12); doc.setTextColor(139, 26, 26);
  doc.text("TOTAL AMOUNT:", 20, y);
  doc.text(`PKR ${grandTotal.toLocaleString()}`, W - 20, y, { align: "right" }); y += 14;
  doc.line(20, y, W - 20, y); y += 10;

  doc.setFontSize(11); doc.setFont("helvetica", "bold"); doc.setTextColor(139, 26, 26);
  doc.text("DELIVERY ADDRESS", 20, y); y += 8;
  doc.setFontSize(10); doc.setFont("helvetica", "normal"); doc.setTextColor(50, 50, 50);
  const lines = doc.splitTextToSize(customer.deliveryAddress, W - 40);
  doc.text(lines, 20, y);

  doc.setFillColor(139, 26, 26);
  doc.rect(0, 280, W, 17, "F");
  doc.setTextColor(201, 169, 110); doc.setFontSize(9); doc.setFont("helvetica", "normal");
  doc.text("Thank you for shopping with ZAREEN by NaazAtif!", W / 2, 290, { align: "center" });

  doc.save(`ZAREEN-Invoice-${orderId}.pdf`);
}

export default function Cart() {
  const navigate = useNavigate();
  const { cartItems, removeFromCart, updateQuantity, clearCart } = useCart();
  const [form, setForm] = useState({ customerName: "", phone: "", email: "", deliveryAddress: "" });
  const [placing, setPlacing] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [placedOrders, setPlacedOrders] = useState([]);

  // Totals
  const subtotal = cartItems.reduce((sum, item) => {
    const p = parseInt((item.productPrice || "").replace(/[^0-9]/g, ""), 10) || 0;
    return sum + p * item.quantity;
  }, 0);
  const totalDelivery = cartItems.reduce((sum, item) => sum + (item.deliveryCharges || 200), 0);
  const grandTotal = subtotal + totalDelivery;

  const handleCheckout = async (e) => {
    e.preventDefault();
    if (cartItems.length === 0) return;
    setError(""); setPlacing(true);
    try {
      const orders = [];
      for (const item of cartItems) {
        const res = await fetch(`${API}/api/orders`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            productId: item.productId,
            productName: item.productName,
            productPrice: item.productPrice,
            size: item.size,
            quantity: item.quantity,
            deliveryCharges: item.deliveryCharges || 200,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Order failed");
        orders.push(data);
      }
      setPlacedOrders(orders);
      generateCartInvoicePDF(orders, form);
      clearCart();
      setSuccess(true);
    } catch (err) {
      setError(err.message || "Server error. Please try again.");
    } finally {
      setPlacing(false);
    }
  };

  if (success) {
    return (
      <div className="cart-page">
        <div className="cart-topbar">
          <button className="cart-back-btn" onClick={() => navigate("/")}>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
          <span className="cart-brand">ZAREEN <span>by NaazAtif</span></span>
          <div style={{ width: 80 }} />
        </div>
        <div className="cart-success">
          <div className="cart-success-card">
            <div className="cart-success-icon">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </div>
            <p className="cart-success-eyebrow">ORDERS CONFIRMED</p>
            <h2>Thank You!</h2>
            <p className="cart-success-msg">
              {placedOrders.length} order{placedOrders.length !== 1 ? "s" : ""} placed successfully. Your invoice has been downloaded. We'll contact you to confirm delivery.
            </p>
            <div className="cart-success-btns">
              <button className="cart-success-primary" onClick={() => navigate("/")}>
                Continue Shopping
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="cart-page">
      {/* Topbar */}
      <div className="cart-topbar">
        <button className="cart-back-btn" onClick={() => navigate(-1)}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ width: 14, height: 14 }}>
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Back
        </button>
        <span className="cart-brand">ZAREEN <span>by NaazAtif</span></span>
        <div style={{ width: 80 }} />
      </div>

      <div className="cart-container">
        <h1 className="cart-title">Your Cart</h1>
        <p className="cart-count">{cartItems.length === 0 ? "No items" : `${cartItems.reduce((s, i) => s + i.quantity, 0)} item(s)`}</p>

        {cartItems.length === 0 ? (
          <div className="cart-empty">
            <div className="cart-empty-icon">🛍️</div>
            <h3>Your cart is empty</h3>
            <p>Discover our beautiful collections and add your favourites.</p>
            <button className="cart-shop-btn" onClick={() => navigate("/")}>Shop Now</button>
          </div>
        ) : (
          <div className="cart-layout">
            {/* Items */}
            <div className="cart-items">
              {cartItems.map((item) => {
                const unitPrice = parseInt((item.productPrice || "").replace(/[^0-9]/g, ""), 10) || 0;
                return (
                  <div key={`${item.productId}-${item.size}`} className="cart-item">
                    <img
                      src={item.productImg || "https://via.placeholder.com/90x110?text=No+Image"}
                      alt={item.productName}
                      className="cart-item-img"
                    />
                    <div className="cart-item-body">
                      <p className="cart-item-name">{item.productName}</p>
                      <span className="cart-item-size">SIZE: {item.size}</span>
                      <div className="cart-item-qty-row">
                        <div className="cart-qty-ctrl">
                          <button
                            className="cart-qty-btn"
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity - 1)}
                          >−</button>
                          <span className="cart-qty-num">{item.quantity}</span>
                          <button
                            className="cart-qty-btn"
                            onClick={() => updateQuantity(item.productId, item.size, item.quantity + 1)}
                          >+</button>
                        </div>
                        <span className="cart-item-price">
                          PKR {(unitPrice * item.quantity).toLocaleString()}
                        </span>
                      </div>
                      <p className="cart-item-delivery">
                        + PKR {(item.deliveryCharges || 200).toLocaleString()} delivery
                      </p>
                      <button
                        className="cart-item-remove"
                        onClick={() => removeFromCart(item.productId, item.size)}
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Summary + Checkout */}
            <div className="cart-summary">
              <h3>Order Summary</h3>
              {cartItems.map((item) => {
                const up = parseInt((item.productPrice || "").replace(/[^0-9]/g, ""), 10) || 0;
                return (
                  <div key={`${item.productId}-${item.size}`} className="cart-summary-row">
                    <span>{item.productName} ×{item.quantity}</span>
                    <span>PKR {(up * item.quantity).toLocaleString()}</span>
                  </div>
                );
              })}
              <div className="cart-summary-row">
                <span>Delivery Charges</span>
                <span>PKR {totalDelivery.toLocaleString()}</span>
              </div>
              <div className="cart-summary-total">
                <span>Total Payable</span>
                <span>PKR {grandTotal.toLocaleString()}</span>
              </div>

              {/* Checkout form */}
              <form className="cart-checkout-form" onSubmit={handleCheckout}>
                <span className="cart-form-label">Your Details</span>
                <div className="cart-form-row">
                  <div className="cart-form-group">
                    <label>Full Name *</label>
                    <input className="cart-input" placeholder="Fatima Khan" required
                      value={form.customerName}
                      onChange={(e) => setForm({ ...form, customerName: e.target.value })} />
                  </div>
                  <div className="cart-form-group">
                    <label>WhatsApp / Phone *</label>
                    <input className="cart-input" placeholder="0300-1234567" required
                      value={form.phone}
                      onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                </div>
                <div className="cart-form-group">
                  <label>Email Address *</label>
                  <input className="cart-input" type="email" placeholder="fatima@email.com" required
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })} />
                </div>
                <div className="cart-form-group">
                  <label>Delivery Address *</label>
                  <textarea className="cart-input cart-textarea" rows={3}
                    placeholder="House no., Street, Area, City" required
                    value={form.deliveryAddress}
                    onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} />
                </div>
                {error && <p className="cart-error">{error}</p>}
                <button type="submit" className="cart-place-btn" disabled={placing}>
                  {placing ? (
                    <span className="cart-btn-loading">
                      <span className="cart-btn-spinner" /> Placing Orders...
                    </span>
                  ) : (
                    <>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
                        <path d="M16 10a4 4 0 01-8 0" />
                      </svg>
                      PLACE ORDER & GET INVOICE
                    </>
                  )}
                </button>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
