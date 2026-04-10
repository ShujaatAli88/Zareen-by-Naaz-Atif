import { useState, useEffect, useRef } from "react";
import "./Admin.css";
import AdminOrders from "./AdminOrders";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const BADGES = ["NEW IN", "EID COLLECTION", "READY TO WEAR", "FABRICS", "SALE"];

const emptyForm = {
  name: "",
  price: "",
  discount: "0",
  inStock: true,
  badge: "NEW IN",
  description: "",
  deliveryCharges: "200",
  pieces: [], // [{pieceName, description}]
};

function parseNumericPrice(priceStr) {
  if (!priceStr) return 0;
  const n = parseFloat(String(priceStr).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

export default function AdminDashboard({ onLogout }) {
  const [activeSection, setActiveSection] = useState("products");
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null); // null | 'add' | 'edit'
  const [form, setForm] = useState(emptyForm);
  const [editId, setEditId] = useState(null);

  // Multiple image state
  const [existingImages, setExistingImages] = useState([]); // [{id, url}] from DB
  const [removedImageIds, setRemovedImageIds] = useState(new Set());
  const [newImageFiles, setNewImageFiles] = useState([]); // File[]
  const [newImagePreviews, setNewImagePreviews] = useState([]); // local URLs

  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [toast, setToast] = useState("");
  const fileInputRef = useRef();

  // ── Fetch products ──────────────────────────────────────────
  const fetchProducts = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/products`);
      setProducts(await res.json());
    } catch {
      showToast("Failed to load products");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Toast helper ────────────────────────────────────────────
  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3000);
  };

  // ── Add new image files ─────────────────────────────────────
  const handleImageChange = (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    const previews = files.map((f) => URL.createObjectURL(f));
    setNewImageFiles((prev) => [...prev, ...files]);
    setNewImagePreviews((prev) => [...prev, ...previews]);
    // reset input so same file can be re-selected
    fileInputRef.current.value = "";
  };

  // ── Remove a new (not yet uploaded) image ───────────────────
  const removeNewImage = (idx) => {
    setNewImageFiles((prev) => prev.filter((_, i) => i !== idx));
    setNewImagePreviews((prev) => prev.filter((_, i) => i !== idx));
  };

  // ── Remove an existing (already in DB) image ────────────────
  const removeExistingImage = (id) => {
    setRemovedImageIds((prev) => new Set([...prev, id]));
  };

  // ── Reset image state ───────────────────────────────────────
  const resetImages = () => {
    setExistingImages([]);
    setRemovedImageIds(new Set());
    setNewImageFiles([]);
    setNewImagePreviews([]);
  };

  // ── Piece helpers ───────────────────────────────────────────
  const addPiece = () => {
    setForm((f) => ({ ...f, pieces: [...f.pieces, { pieceName: "", description: "" }] }));
  };
  const updatePiece = (idx, field, value) => {
    setForm((f) => {
      const pieces = [...f.pieces];
      pieces[idx] = { ...pieces[idx], [field]: value };
      return { ...f, pieces };
    });
  };
  const removePiece = (idx) => {
    setForm((f) => ({ ...f, pieces: f.pieces.filter((_, i) => i !== idx) }));
  };

  // ── Open Add modal ──────────────────────────────────────────
  const openAdd = () => {
    setForm(emptyForm);
    resetImages();
    setEditId(null);
    setModal("add");
  };

  // ── Open Edit modal ─────────────────────────────────────────
  const openEdit = (product) => {
    // Build existing images from product.imgs or img
    const imgs = product.imgs && product.imgs.length > 0
      ? product.imgs
      : (product.img ? [product.img] : []);
    const imgIds = product.imageIds || [];

    // Map ids to {id, url}
    const existingImgs = imgIds.map((id, i) => ({
      id: String(id),
      url: imgs[i] || `${API}/api/images/${id}`,
    }));

    setExistingImages(existingImgs);
    setRemovedImageIds(new Set());
    setNewImageFiles([]);
    setNewImagePreviews([]);

    setForm({
      name: product.name,
      price: product.price,
      discount: String(product.discount ?? 0),
      inStock: product.inStock !== false,
      badge: product.badge,
      description: product.description || "",
      deliveryCharges: String(product.deliveryCharges || 200),
      pieces: product.pieces && product.pieces.length > 0
        ? product.pieces.map((p) => ({ pieceName: p.pieceName || "", description: p.description || "" }))
        : [],
    });
    setEditId(product._id);
    setModal("edit");
  };

  // ── Close modal ─────────────────────────────────────────────
  const closeModal = () => {
    setModal(null);
    setForm(emptyForm);
    resetImages();
    setEditId(null);
  };

  // ── Submit form ─────────────────────────────────────────────
  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("name", form.name);
      fd.append("price", form.price);
      fd.append("discount", form.discount || "0");
      fd.append("inStock", form.inStock === false ? "false" : "true");
      fd.append("badge", form.badge);
      fd.append("description", form.description);
      fd.append("deliveryCharges", form.deliveryCharges || "200");
      fd.append("pieces", JSON.stringify(form.pieces));

      // New image files
      for (const file of newImageFiles) {
        fd.append("images", file);
      }

      // Which existing images to keep (for edit)
      if (modal === "edit") {
        const keepIds = existingImages
          .filter((img) => !removedImageIds.has(img.id))
          .map((img) => img.id);
        fd.append("keepImageIds", JSON.stringify(keepIds));
      }

      const url =
        modal === "edit"
          ? `${API}/api/products/${editId}`
          : `${API}/api/products`;

      const res = await fetch(url, {
        method: modal === "edit" ? "PUT" : "POST",
        body: fd,
      });

      if (res.ok) {
        const saved = await res.json();
        showToast(modal === "edit" ? "Product updated!" : "Product added!");
        closeModal();
        // Directly update local state from the response — no stale cache risk
        if (modal === "edit") {
          setProducts((prev) => prev.map((p) => p._id === saved._id ? saved : p));
        } else {
          setProducts((prev) => [saved, ...prev]);
        }
        fetchProducts(); // background sync
      } else {
        const err = await res.json();
        showToast(err.error || "Something went wrong");
      }
    } catch {
      showToast("Server error. Is the backend running?");
    } finally {
      setSaving(false);
    }
  };

  // ── Delete product ───────────────────────────────────────────
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API}/api/products/${id}`, { method: "DELETE" });
      if (res.ok) {
        showToast("Product deleted");
        setProducts((prev) => prev.filter((p) => p._id !== id));
      } else {
        const err = await res.json().catch(() => ({}));
        showToast(err.error || "Delete failed");
        fetchProducts();
      }
    } catch {
      showToast("Server error");
      fetchProducts();
    } finally {
      setDeleteConfirm(null);
    }
  };

  // Visible existing images (not removed)
  const visibleExisting = existingImages.filter((img) => !removedImageIds.has(img.id));

  return (
    <div className="admin-page">
      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-logo">
          <span className="admin-brand-main">ZAREEN'S</span>
          <span className="admin-brand-sub">Admin Panel</span>
        </div>
        <nav className="admin-nav">
          <div className={`admin-nav-item ${activeSection === "products" ? "active" : ""}`} onClick={() => setActiveSection("products")}>📦 Products</div>
          <div className={`admin-nav-item ${activeSection === "orders" ? "active" : ""}`} onClick={() => setActiveSection("orders")}>🛍️ All Orders</div>
        </nav>
        <button className="admin-logout-btn" onClick={onLogout}>Logout</button>
      </aside>

      {/* ── Bottom Nav (Mobile) ── */}
      <nav className="admin-bottom-nav">
        <div className={`admin-bottom-nav-item ${activeSection === "products" ? "active" : ""}`} onClick={() => setActiveSection("products")}>
          <span className="nav-icon">📦</span>Products
        </div>
        <div className={`admin-bottom-nav-item ${activeSection === "orders" ? "active" : ""}`} onClick={() => setActiveSection("orders")}>
          <span className="nav-icon">🛍️</span>Orders
        </div>
        <div className="admin-bottom-nav-item" onClick={onLogout}>
          <span className="nav-icon">🚪</span>Logout
        </div>
      </nav>

      {/* ── Main ── */}
      <main className="admin-main">
        {activeSection === "orders" ? <AdminOrders /> : (
          <>
            {/* Header */}
            <div className="admin-header">
              <div>
                <h1 className="admin-title">Products</h1>
                <p className="admin-subtitle">{products.length} items in catalog</p>
              </div>
              <button className="admin-btn-primary" onClick={openAdd}>+ Add Product</button>
            </div>

            {/* Product Grid */}
            {loading ? (
              <div className="admin-loading">Loading products...</div>
            ) : products.length === 0 ? (
              <div className="admin-empty">
                <p>No products yet.</p>
                <button className="admin-btn-primary" onClick={openAdd}>Add your first product</button>
              </div>
            ) : (
              <div className="admin-products-grid">
                {products.map((p) => {
                  const imgs = p.imgs && p.imgs.length > 0 ? p.imgs : (p.img ? [p.img] : []);
                  return (
                    <div key={p._id} className="admin-product-card">
                      {/* Image thumbnails */}
                      <div className="admin-product-img-wrapper">
                        <img
                          src={imgs[0] || "https://via.placeholder.com/300x350?text=No+Image"}
                          alt={p.name}
                          className="admin-product-img"
                        />
                        <span className="admin-product-badge">{p.badge}</span>
                        {imgs.length > 1 && (
                          <span className="admin-img-count">+{imgs.length - 1} more</span>
                        )}
                      </div>
                      <div className="admin-product-info">
                        <p className="admin-product-name">{p.name}</p>
                        {p.discount > 0 ? (
                          <p className="admin-product-price">
                            <span style={{ textDecoration: "line-through", color: "#999", marginRight: 6, fontSize: 12 }}>
                              PKR {parseNumericPrice(p.price).toLocaleString()}
                            </span>
                            <strong style={{ color: "#16a34a" }}>
                              PKR {Math.round(parseNumericPrice(p.price) * (1 - p.discount / 100)).toLocaleString()}
                            </strong>
                            <span style={{ marginLeft: 6, background: "#dc2626", color: "#fff", borderRadius: 4, padding: "1px 5px", fontSize: 11 }}>
                              {p.discount}% OFF
                            </span>
                          </p>
                        ) : (
                          <p className="admin-product-price">PKR {parseNumericPrice(p.price).toLocaleString()}</p>
                        )}
                        <p className="admin-product-delivery">Delivery: PKR {p.deliveryCharges || 200}</p>
                        <p style={{
                          display: "inline-block", marginTop: 4,
                          fontSize: 10, fontWeight: 700, letterSpacing: 1,
                          padding: "2px 8px", borderRadius: 4,
                          background: p.inStock !== false ? "#dcfce7" : "#fee2e2",
                          color: p.inStock !== false ? "#16a34a" : "#dc2626",
                        }}>
                          {p.inStock !== false ? "IN STOCK" : "OUT OF STOCK"}
                        </p>
                        {p.pieces && p.pieces.length > 0 && (
                          <p className="admin-product-desc">{p.pieces.length} piece description{p.pieces.length !== 1 ? "s" : ""}</p>
                        )}
                      </div>
                      <div className="admin-product-actions">
                        <button className="admin-btn-edit" onClick={() => openEdit(p)}>Edit</button>
                        <button className="admin-btn-delete" onClick={() => setDeleteConfirm(p._id)}>Delete</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      {/* ── Add / Edit Modal ── */}
      {modal && (
        <div className="admin-modal-overlay" onClick={closeModal}>
          <div className="admin-modal" onClick={(e) => e.stopPropagation()}>
            <div className="admin-modal-header">
              <h2>{modal === "edit" ? "Edit Product" : "Add New Product"}</h2>
              <button className="admin-modal-close" onClick={closeModal}>×</button>
            </div>

            <form onSubmit={handleSubmit} className="admin-modal-form">

              {/* ── Multi-image upload ── */}
              <div className="admin-form-group">
                <label className="admin-label">Product Images</label>

                {/* Existing images */}
                {visibleExisting.length > 0 && (
                  <div className="admin-img-grid">
                    {visibleExisting.map((img) => (
                      <div key={img.id} className="admin-img-thumb">
                        <img src={img.url} alt="existing" />
                        <button
                          type="button"
                          className="admin-img-remove"
                          onClick={() => removeExistingImage(img.id)}
                          title="Remove"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* New image previews */}
                {newImagePreviews.length > 0 && (
                  <div className="admin-img-grid" style={{ marginTop: visibleExisting.length > 0 ? 8 : 0 }}>
                    {newImagePreviews.map((url, idx) => (
                      <div key={idx} className="admin-img-thumb admin-img-thumb-new">
                        <img src={url} alt="new" />
                        <button
                          type="button"
                          className="admin-img-remove"
                          onClick={() => removeNewImage(idx)}
                          title="Remove"
                        >×</button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload button */}
                <button
                  type="button"
                  className="admin-img-add-btn"
                  onClick={() => fileInputRef.current.click()}
                >
                  + Add Images
                </button>
                <p className="admin-image-hint">JPG, PNG, WEBP — max 10MB each. Add multiple images.</p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  multiple
                  style={{ display: "none" }}
                  onChange={handleImageChange}
                />
              </div>

              {/* Name */}
              <div className="admin-form-group">
                <label className="admin-label">Product Name *</label>
                <input
                  className="admin-input"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="e.g. Rose Embroidered Kurta"
                  required
                />
              </div>

              {/* Price */}
              <div className="admin-form-group">
                <label className="admin-label">Actual Price (PKR) *</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  placeholder="e.g. 5000"
                  required
                />
              </div>

              {/* Discount */}
              <div className="admin-form-group">
                <label className="admin-label">Discount % <span style={{ fontWeight: 400, fontSize: 11, color: "#888" }}>(0 = no discount)</span></label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  max="100"
                  value={form.discount}
                  onChange={(e) => setForm({ ...form, discount: e.target.value })}
                  placeholder="e.g. 15"
                />
                {(() => {
                  const orig = parseNumericPrice(form.price);
                  const disc = parseFloat(form.discount) || 0;
                  if (orig > 0 && disc > 0) {
                    const sale = Math.round(orig * (1 - disc / 100));
                    return (
                      <p style={{ marginTop: 6, fontSize: 13, color: "#16a34a" }}>
                        Sale price: <strong>PKR {sale.toLocaleString()}</strong>
                        <span style={{ color: "#888", marginLeft: 8, textDecoration: "line-through" }}>PKR {orig.toLocaleString()}</span>
                        <span style={{ marginLeft: 8, background: "#dc2626", color: "#fff", borderRadius: 4, padding: "1px 6px", fontSize: 11 }}>{disc}% OFF</span>
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              {/* Stock Status */}
              <div className="admin-form-group">
                <label className="admin-label">Stock Status</label>
                <div className="admin-stock-toggle">
                  <button
                    type="button"
                    className={`admin-stock-btn${form.inStock !== false ? " admin-stock-btn--in" : ""}`}
                    onClick={async () => {
                      setForm((f) => ({ ...f, inStock: true }));
                      if (editId) {
                        await fetch(`${API}/api/products/${editId}/stock`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ inStock: true }),
                        });
                        fetchProducts();
                      }
                    }}
                  >
                    ✓ In Stock
                  </button>
                  <button
                    type="button"
                    className={`admin-stock-btn${form.inStock === false ? " admin-stock-btn--out" : ""}`}
                    onClick={async () => {
                      setForm((f) => ({ ...f, inStock: false }));
                      if (editId) {
                        await fetch(`${API}/api/products/${editId}/stock`, {
                          method: "PATCH",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ inStock: false }),
                        });
                        fetchProducts();
                      }
                    }}
                  >
                    ✕ Out of Stock
                  </button>
                </div>
              </div>

              {/* Delivery Charges */}
              <div className="admin-form-group">
                <label className="admin-label">Delivery Charges (PKR)</label>
                <input
                  className="admin-input"
                  type="number"
                  min="0"
                  value={form.deliveryCharges}
                  onChange={(e) => setForm({ ...form, deliveryCharges: e.target.value })}
                  placeholder="e.g. 200"
                />
              </div>

              {/* Badge */}
              <div className="admin-form-group">
                <label className="admin-label">Badge</label>
                <select
                  className="admin-input"
                  value={form.badge}
                  onChange={(e) => setForm({ ...form, badge: e.target.value })}
                >
                  {BADGES.map((b) => <option key={b} value={b}>{b}</option>)}
                </select>
              </div>

              {/* General Description */}
              <div className="admin-form-group">
                <label className="admin-label">General Description</label>
                <textarea
                  className="admin-input admin-textarea"
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Short overview of the product..."
                  rows={2}
                />
              </div>

              {/* Piece-by-piece descriptions */}
              <div className="admin-form-group">
                <label className="admin-label">
                  Piece Descriptions
                  <span style={{ fontWeight: 400, fontSize: 11, marginLeft: 8, color: "#888" }}>
                    (e.g. Shirt, Trouser, Dupatta)
                  </span>
                </label>

                {form.pieces.map((piece, idx) => (
                  <div key={idx} className="admin-piece-row">
                    <div className="admin-piece-fields">
                      <input
                        className="admin-input"
                        placeholder="Piece name (e.g. Shirt)"
                        value={piece.pieceName}
                        onChange={(e) => updatePiece(idx, "pieceName", e.target.value)}
                        style={{ marginBottom: 6 }}
                      />
                      <textarea
                        className="admin-input admin-textarea"
                        placeholder="Description for this piece..."
                        rows={2}
                        value={piece.description}
                        onChange={(e) => updatePiece(idx, "description", e.target.value)}
                      />
                    </div>
                    <button
                      type="button"
                      className="admin-piece-remove"
                      onClick={() => removePiece(idx)}
                    >×</button>
                  </div>
                ))}

                <button type="button" className="admin-piece-add" onClick={addPiece}>
                  + Add Piece
                </button>
              </div>

              <div className="admin-modal-footer">
                <button type="button" className="admin-btn-secondary" onClick={closeModal}>Cancel</button>
                <button type="submit" className="admin-btn-primary" disabled={saving}>
                  {saving ? "Saving..." : modal === "edit" ? "Save Changes" : "Add Product"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirmation ── */}
      {deleteConfirm && (
        <div className="admin-modal-overlay">
          <div className="admin-modal admin-modal-sm">
            <h3 className="admin-confirm-title">Delete Product?</h3>
            <p className="admin-confirm-text">This action cannot be undone. The product will be permanently removed.</p>
            <div className="admin-modal-footer">
              <button className="admin-btn-secondary" onClick={() => setDeleteConfirm(null)}>Cancel</button>
              <button className="admin-btn-delete-confirm" onClick={() => handleDelete(deleteConfirm)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="admin-toast">{toast}</div>}
    </div>
  );
}
