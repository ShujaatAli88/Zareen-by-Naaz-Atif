import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useInView } from "framer-motion";
import { useCart } from "./CartContext";
import "./Dashboard.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const NAV_LINKS = ["NEW IN", "EID COLLECTION", "READY TO WEAR", "FABRICS", "SALE"];

function parsePrice(priceStr) {
  if (!priceStr) return 0;
  const n = parseFloat(String(priceStr).replace(/[^0-9.]/g, ""));
  return isNaN(n) ? 0 : n;
}

function effectivePrice(p) {
  const base = parsePrice(p.price);
  return p.discount > 0 ? Math.round(base * (1 - p.discount / 100)) : base;
}

// ── Magnetic Button ─────────────────────────────────────────
function MagneticBtn({ children, className, onClick, type = "button", style }) {
  const ref = useRef(null);
  const onMove = (e) => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = (e.clientX - r.left - r.width / 2) * 0.3;
    const y = (e.clientY - r.top - r.height / 2) * 0.3;
    el.style.transform = `translate(${x}px, ${y}px)`;
    el.style.transition = "transform 0.1s ease";
  };
  const onLeave = () => {
    const el = ref.current;
    if (!el) return;
    el.style.transform = "translate(0, 0)";
    el.style.transition = "transform 0.65s cubic-bezier(0.23, 1, 0.32, 1)";
  };
  return (
    <motion.button ref={ref} type={type} className={className} onClick={onClick} style={style}
      onMouseMove={onMove} onMouseLeave={onLeave}
      whileTap={{ scale: 0.95 }}>
      {children}
    </motion.button>
  );
}

// ── Product Skeleton ─────────────────────────────────────────
function ProductSkeleton() {
  return (
    <div className="product-skeleton">
      <div className="skeleton-img" />
      <div className="skeleton-body">
        <div className="skeleton-line w80" />
        <div className="skeleton-line w50" />
      </div>
    </div>
  );
}

// ── Animated product grid section ────────────────────────────
const gridVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 56, scale: 0.96 },
  show: { opacity: 1, y: 0, scale: 1, transition: { type: "spring", stiffness: 260, damping: 24 } },
};

function ProductGrid({ products, onCardClick }) {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <motion.div
      ref={ref}
      className="products-grid"
      variants={gridVariants}
      initial="hidden"
      animate={inView ? "show" : "hidden"}
    >
      {products.map((p) => {
        const imgs = p.imgs && p.imgs.length > 0 ? p.imgs : (p.img ? [p.img] : []);
        const imgSrc = imgs[0] || "https://via.placeholder.com/400x530?text=No+Image";
        const origPrice = parsePrice(p.price);
        const salePrice = p.discount > 0 ? Math.round(origPrice * (1 - p.discount / 100)) : null;
        const outOfStock = p.inStock === false;

        return (
          <motion.div
            key={p._id}
            className={`product-card${outOfStock ? " product-card--oos" : ""}`}
            variants={cardVariants}
            onClick={() => onCardClick(p._id)}
            whileTap={{ scale: 0.97 }}
          >
            <div className="product-img-wrapper">
              <img src={imgSrc} alt={p.name} className="product-img" loading="lazy" />

              {(p.discount > 0) ? (
                <span className="product-discount-badge">{p.discount}% OFF</span>
              ) : (
                p.badge && <span className="product-badge">{p.badge}</span>
              )}

              <button
                className="product-wishlist-btn"
                onClick={(e) => e.stopPropagation()}
                aria-label="Save"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                </svg>
              </button>

              {/* Quick Add drawer */}
              <div className="product-quick-add-drawer" onClick={(e) => { e.stopPropagation(); onCardClick(p._id); }}>
                <span className="product-quick-add-label">Quick View</span>
                <span className="product-quick-add-icon">→</span>
              </div>

              {outOfStock && (
                <div className="product-oos-overlay">
                  <span className="product-oos-label">OUT OF STOCK</span>
                </div>
              )}
            </div>

            <div className="product-info">
              {p.badge && <p className="product-category">{p.badge}</p>}
              <p className="product-name">{p.name}</p>
              <div className="product-price-row">
                {salePrice ? (
                  <>
                    <p className="product-price product-price-sale">PKR {salePrice.toLocaleString()}</p>
                    <p className="product-price product-price-original">PKR {origPrice.toLocaleString()}</p>
                  </>
                ) : (
                  <p className="product-price">PKR {origPrice > 0 ? origPrice.toLocaleString() : p.price}</p>
                )}
              </div>
            </div>
          </motion.div>
        );
      })}
    </motion.div>
  );
}

// ── Top Progress Bar ─────────────────────────────────────────
function TopProgressBar({ visible }) {
  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          className="top-progress-bar"
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 0.92 }}
          exit={{ scaleX: 1, opacity: 0 }}
          transition={{ duration: 1.6, ease: "easeOut" }}
          style={{ transformOrigin: "left" }}
        />
      )}
    </AnimatePresence>
  );
}

// ── Bottom Navigation ─────────────────────────────────────────
function BottomNav({ onSearch, onAbout, cartCount, activeFilter, onHome }) {
  const nav = useNavigate();
  const tabs = [
    {
      id: "home", label: "Home", active: !activeFilter, onClick: onHome,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/>
          <polyline points="9 22 9 12 15 12 15 22"/>
        </svg>
      ),
    },
    {
      id: "search", label: "Search", active: false, onClick: onSearch,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
        </svg>
      ),
    },
    {
      id: "cart", label: "Cart", active: false, isCart: true, onClick: () => nav("/cart"),
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
          <line x1="3" y1="6" x2="21" y2="6"/>
          <path d="M16 10a4 4 0 01-8 0"/>
        </svg>
      ),
    },
    {
      id: "about", label: "About", active: false, onClick: onAbout,
      icon: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2"/>
          <circle cx="12" cy="7" r="4"/>
        </svg>
      ),
    },
  ];

  return (
    <nav className="bottom-nav" aria-label="Mobile navigation">
      {tabs.map((tab) => (
        <motion.button
          key={tab.id}
          className={`bnav-btn${tab.active ? " bnav-active" : ""}${tab.isCart ? " bnav-cart" : ""}`}
          onClick={tab.onClick}
          whileTap={{ scale: 0.86 }}
          aria-label={tab.label}
        >
          {tab.isCart ? (
            <div className="bnav-cart-pill">
              {tab.icon}
              <AnimatePresence mode="wait">
                {cartCount > 0 && (
                  <motion.span
                    key={cartCount}
                    className="bnav-badge"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    exit={{ scale: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 20 }}
                  >
                    {cartCount}
                  </motion.span>
                )}
              </AnimatePresence>
            </div>
          ) : (
            <span className="bnav-icon">{tab.icon}</span>
          )}
          <span className="bnav-label">{tab.label}</span>
          {tab.active && <motion.span className="bnav-dot" layoutId="bnav-dot" />}
        </motion.button>
      ))}
    </nav>
  );
}

// ── Main Dashboard ───────────────────────────────────────────
export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [priceSort, setPriceSort] = useState(null); // null | 'asc' | 'desc'
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 12;
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  const navigate = useNavigate();
  const { cartCount } = useCart();

  // Developer Easter egg — visible only in browser DevTools console
  useEffect(() => {
    console.log(
      "%c ♥ Zareen by NaazAtif %c\n%c Built with love by Shujaat \n%c github.com/shujaat ",
      "background:#1A1818;color:#B07B94;font-size:18px;font-weight:bold;padding:8px 16px;border-radius:4px 4px 0 0;",
      "",
      "background:#B07B94;color:#fff;font-size:13px;padding:6px 16px;",
      "background:#1A1818;color:#ABA7A3;font-size:11px;padding:4px 16px;border-radius:0 0 4px 4px;"
    );
  }, []);

  // Fetch products
  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Navbar scroll behaviour
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Body scroll lock
  useEffect(() => {
    document.body.style.overflow = (mobileMenuOpen || searchOpen || aboutOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen, searchOpen, aboutOpen]);

  // Focus search
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 60);
  }, [searchOpen]);

  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") closeSearch(); };
    if (searchOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]); // eslint-disable-line react-hooks/exhaustive-deps

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  const displayProducts = (() => {
    let list = products;
    if (activeFilter) list = list.filter((p) => p.badge === activeFilter);
    if (priceSort) {
      list = [...list].sort((a, b) =>
        priceSort === "asc"
          ? effectivePrice(a) - effectivePrice(b)
          : effectivePrice(b) - effectivePrice(a)
      );
    }
    return list;
  })();

  const totalPages  = Math.max(1, Math.ceil(displayProducts.length / PAGE_SIZE));
  const pagedProducts = displayProducts.slice(
    (currentPage - 1) * PAGE_SIZE,
    currentPage * PAGE_SIZE
  );

  // Reset to page 1 whenever filter or sort changes
  useEffect(() => { setCurrentPage(1); }, [activeFilter, priceSort]);

  const searchResults = (() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return products.filter(
      (p) => p.name.toLowerCase().includes(q) || (p.badge || "").toLowerCase().includes(q)
    );
  })();

  const sectionTitle = activeFilter ? activeFilter : "New Arrivals";
  const sectionEyebrow = activeFilter ? "FILTERED BY" : "HAND PICKED";

  return (
    <div className="app">

      <TopProgressBar visible={loadingProducts} />

      {/* ── Announcement Bar ── */}
      <div className="announcement-bar">
        ✦ Eid Exclusives — Free Shipping on Orders Above PKR 5,000 &nbsp;
        <span className="announcement-link">SHOP NOW</span>
      </div>

      {/* ── Navbar ── */}
      <nav className={`navbar${scrolled ? " scrolled" : ""}`}>

        {/* Mobile: hamburger — LEFT slot */}
        <motion.button
          className="hamburger"
          onClick={() => setMobileMenuOpen(true)}
          aria-label="Open menu"
          whileTap={{ scale: 0.88 }}
        >
          <span /><span /><span />
        </motion.button>

        {/* Logo */}
        <div className="logo">
          <motion.img
            src="/nazzAtif_logo.jpeg"
            alt=""
            className="logo-img"
            aria-hidden="true"
            animate={{ height: scrolled ? "30px" : "38px" }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          />
          <div className="logo-wordmark">
            <span className="logo-primary">ZAREEN</span>
            <span className="logo-secondary">by NaazAtif</span>
          </div>
        </div>

        {/* Desktop nav links — Signature Underline via Framer Motion layoutId */}
        <ul className="nav-links">
          {NAV_LINKS.map((link, i) => (
            <li
              key={i}
              className={`nav-item${i === 4 ? " nav-sale" : ""}${activeFilter === link ? " nav-active" : ""}`}
              onClick={() => { setActiveFilter(activeFilter === link ? null : link); setSearchQuery(""); setPriceSort(null); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              <span className="nav-item-text">{link}</span>
              {activeFilter === link && (
                <motion.span
                  className="nav-underline"
                  layoutId="nav-underline"
                  initial={false}
                  transition={{ type: "spring", stiffness: 380, damping: 30 }}
                />
              )}
            </li>
          ))}
          <li className="nav-item nav-about" onClick={() => setAboutOpen(true)}>
            <span className="nav-item-text">ABOUT US</span>
          </li>
        </ul>

        {/* Right: luxury search + cart — hamburger removed (now lives on left on mobile) */}
        <div className="nav-icons">
          <button
            className={`search-btn${searchOpen ? " search-btn-active" : ""}`}
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <svg className="search-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
            <span className="search-btn-label">Search</span>
          </button>

          <button className="cart-nav-btn" onClick={() => navigate("/cart")} aria-label="Cart">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
              <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" />
              <path d="M16 10a4 4 0 01-8 0" />
            </svg>
            <AnimatePresence mode="wait">
              {cartCount > 0 && (
                <motion.span
                  key={cartCount}
                  className="cart-nav-badge"
                  initial={{ scale: 0, rotate: -15 }}
                  animate={{ scale: 1, rotate: 0 }}
                  exit={{ scale: 0 }}
                  transition={{ type: "spring", stiffness: 500, damping: 24 }}
                >
                  {cartCount}
                </motion.span>
              )}
            </AnimatePresence>
          </button>
        </div>
      </nav>

      {/* ── Search Modal ── */}
      <AnimatePresence>
        {searchOpen && (
          <motion.div
            className="search-modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={closeSearch}
          >
            <motion.div
              className="search-modal"
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -20, opacity: 0 }}
              transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="search-modal-bar">
                <svg className="search-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
                </svg>
                <input
                  ref={searchInputRef}
                  className="search-modal-input"
                  placeholder="Search collections..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
                {searchQuery && (
                  <button className="search-modal-clear" onClick={() => setSearchQuery("")}>✕</button>
                )}
                <button className="search-modal-close" onClick={closeSearch}>Close</button>
              </div>

              <div className="search-modal-body">
                {!searchQuery.trim() ? (
                  <div className="search-modal-hint">
                    <p className="search-hint-title">What are you looking for?</p>
                    <div className="search-hint-tags">
                      {NAV_LINKS.map((tag, i) => (
                        <span key={i} className="search-hint-tag" onClick={() => setSearchQuery(tag)}>{tag}</span>
                      ))}
                    </div>
                  </div>
                ) : searchResults.length === 0 ? (
                  <div className="search-no-results">
                    <span className="search-no-results-icon">◎</span>
                    <p>No results for <strong>"{searchQuery}"</strong></p>
                    <p className="search-no-results-sub">Try a different keyword or browse our collections</p>
                  </div>
                ) : (
                  <>
                    <p className="search-results-count">
                      {searchResults.length} result{searchResults.length !== 1 ? "s" : ""}
                    </p>
                    <div className="search-results-grid">
                      {searchResults.map((p) => {
                        const imgSrc = (p.imgs && p.imgs[0]) || p.img || "";
                        return (
                          <div key={p._id} className="search-result-card"
                            onClick={() => { closeSearch(); navigate(`/product/${p._id}`); }}>
                            <div className="search-result-img-wrap">
                              <img src={imgSrc} alt={p.name} className="search-result-img" loading="lazy" />
                              <span className="search-result-badge">{p.badge}</span>
                            </div>
                            <div className="search-result-info">
                              <p className="search-result-name">{p.name}</p>
                              <p className="search-result-price">{p.price}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Mobile Menu ── */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            className="mobile-menu-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileMenuOpen(false)}
          >
            <motion.div
              className="mobile-menu"
              initial={{ x: "100%" }}
              animate={{ x: 0 }}
              exit={{ x: "100%" }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="mobile-menu-header">
                <div className="mobile-menu-brand-wrap">
                  <img src="/nazzAtif_logo.jpeg" alt="ZAREEN'S" className="mobile-menu-logo" />
                  <span className="mobile-menu-brand">ZAREEN'S</span>
                </div>
                <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
              </div>
              <ul className="mobile-nav-links">
                <li className="mobile-nav-item mobile-search-row">
                  <input
                    className="mobile-search-input"
                    placeholder="Search products..."
                    onFocus={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
                    readOnly
                  />
                </li>
                {NAV_LINKS.map((link, i) => (
                  <li key={i}
                    className={`mobile-nav-item ${i === 4 ? "nav-sale" : ""} ${activeFilter === link ? "mobile-nav-active" : ""}`}
                    onClick={() => { setActiveFilter(activeFilter === link ? null : link); setSearchQuery(""); setPriceSort(null); setMobileMenuOpen(false); setTimeout(() => document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }), 350); }}
                  >
                    {link} {activeFilter === link ? "✓" : ""}
                  </li>
                ))}
                <li className="mobile-nav-item mobile-nav-about"
                  onClick={() => { setMobileMenuOpen(false); setAboutOpen(true); }}>
                  ABOUT US
                </li>
              </ul>
              <div className="mobile-menu-footer">
                <p>WhatsApp: <a href="https://wa.me/923205623004" className="mobile-wa-link">+92 320 5623004</a></p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── About Modal ── */}
      <AnimatePresence>
        {aboutOpen && (
          <motion.div
            className="about-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setAboutOpen(false)}
          >
            <motion.div
              className="about-modal"
              initial={{ y: 60, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 60, opacity: 0 }}
              transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="about-modal-header">
                <div className="about-modal-brand">
                  <span className="about-modal-brand-main">ZAREEN</span>
                  <span className="about-modal-brand-sub">by NaazAtif</span>
                </div>
                <button className="about-modal-close" onClick={() => setAboutOpen(false)}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
              </div>
              <div className="about-modal-body">
                <p className="about-eyebrow">✦ OUR STORY ✦</p>
                <h2 className="about-title">The Heart of Zareen</h2>
                <p className="about-subtitle">From the Peaks to the Loom</p>
                <blockquote className="about-pullquote">
                  "My story began where the clouds meet the Karakoram."
                </blockquote>
                <div className="about-divider" />
                <p className="about-body">
                  I am <strong>Khuram Naaz (NaazAtif)</strong>, and my journey is rooted in the breathtaking valleys of Gilgit-Baltistan. Growing up amidst the rugged grandeur of Northern Pakistan, I didn't just see the mountains — I saw the art hidden within them.
                </p>
                <p className="about-body">
                  Coming from a humble background in the North, I learned early on that true luxury isn't about a price tag — it's about the grace of simplicity and the strength of heritage.
                </p>
                <div className="about-section">
                  <p className="about-section-eyebrow">A Mother's Vision</p>
                  <p className="about-body">
                    While my roots gave me my foundation, my greatest inspiration walks beside me today. Being a mother to my spirited three-year-old son, <strong>Aron Atif</strong>, changed how I view fashion. He taught me that beauty is found in resilience.
                  </p>
                </div>
                <div className="about-section">
                  <p className="about-section-eyebrow">The Birth of Zareen</p>
                  <p className="about-body">
                    Zareen was born from a desire to merge two worlds — to bring the soul of GB's clothing culture: its rich textures, soulful embroidery, and timeless silhouettes into the wardrobe of the modern woman.
                  </p>
                </div>
                <div className="about-wear-block">
                  <p className="about-wear-title">When you wear Zareen, you wear:</p>
                  <ul className="about-wear-list">
                    <li><span className="about-wear-dot">✦</span><div><strong>The Spirit of the North</strong><span> — Inspired by the artisans of the Silk Road.</span></div></li>
                    <li><span className="about-wear-dot">✦</span><div><strong>A Personal Legacy</strong><span> — Built on the values of a humble upbringing.</span></div></li>
                    <li><span className="about-wear-dot">✦</span><div><strong>Modern Elegance</strong><span> — Pieces for the woman who honors her past while leading her future.</span></div></li>
                  </ul>
                </div>
                <div className="about-closing">
                  <p className="about-closing-text">From my home in the mountains to your doorstep — welcome to a piece of my heart.</p>
                  <p className="about-closing-sig">Welcome to Zareen by NaazAtif.</p>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Hero ── */}
      <section className="hero">
        <img
          src="/bg_naaz_atif.jpeg"
          alt="hero"
          className="hero-img"
        />
        <div className="hero-overlay" />

        <motion.div
          className="hero-text-block"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.4 }}
        >
          <motion.span
            className="hero-eyebrow"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
          >
            ✦ EID COLLECTION 2026 ✦
          </motion.span>
          <motion.h1
            className="hero-title"
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
          >
            FLORAL
            <span className="hero-title-italic">Radiance</span>
          </motion.h1>
          <motion.p
            className="hero-sub"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.35 }}
          >
            ready to wear &nbsp;·&nbsp; eid collection
          </motion.p>
          <motion.div
            className="hero-btns"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <MagneticBtn
              className="btn-primary-mag"
              onClick={() => { setActiveFilter(null); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
            >
              SHOP NOW
            </MagneticBtn>
            <MagneticBtn className="btn-outline-mag">
              EXPLORE
            </MagneticBtn>
          </motion.div>
        </motion.div>

        <div className="hero-dots">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`dot${i === activeSlide ? " dot-active" : ""}`} onClick={() => setActiveSlide(i)} />
          ))}
        </div>
      </section>

      {/* ── Brand Strip ── */}
      {(() => {
        const items = ["ZAREEN'S WARDROBE", "✦", "BY NAAZATIF", "✦", "EID 2026", "✦", "READY TO WEAR", "✦", "LUXURY LAWN", "✦", "UNSTITCHED", "✦"];
        const track = (prefix) => items.map((t, i) => (
          <span key={`${prefix}-${i}`} className={t === "✦" ? "brand-strip-dot" : "brand-strip-text"}>{t}</span>
        ));
        return (
          <div className="brand-strip" aria-hidden="true">
            <div className="brand-strip-track">{track("a")}</div>
            <div className="brand-strip-track" aria-hidden="true">{track("b")}</div>
          </div>
        );
      })()}

      {/* ── Category Strip ── */}
      <div className="category-strip">
        {["EID SPECIAL", "LUXURY LAWN", "READY TO WEAR", "UNSTITCHED", "GIFT SETS"].map((cat, i) => (
          <div key={i} className="category-item">{cat}</div>
        ))}
      </div>

      {/* ── Products ── */}
      <section className="section products-section" id="products">
        <div className="section-inner">
        <div className="section-header">
          <p className="section-eyebrow">{sectionEyebrow}</p>
          <h2 className="section-title">{sectionTitle}</h2>
          <div className="section-divider" />
          <div className="section-controls">
            {activeFilter && (
              <button className="filter-clear-btn" onClick={() => setActiveFilter(null)}>
                ✕ Show all
              </button>
            )}
            <div className="price-sort-btns">
              <button
                className={`price-sort-btn${priceSort === "asc" ? " price-sort-active" : ""}`}
                onClick={() => setPriceSort(priceSort === "asc" ? null : "asc")}
              >
                Price ↑
              </button>
              <button
                className={`price-sort-btn${priceSort === "desc" ? " price-sort-active" : ""}`}
                onClick={() => setPriceSort(priceSort === "desc" ? null : "desc")}
              >
                Price ↓
              </button>
            </div>
          </div>
        </div>

        {loadingProducts ? (
          <div className="products-loading">
            {[...Array(6)].map((_, i) => <ProductSkeleton key={i} />)}
          </div>
        ) : displayProducts.length === 0 ? (
          <div className="products-empty">
            {/* Hanger / dress-form SVG illustration */}
            <svg className="products-empty-svg" viewBox="0 0 120 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
              {/* Hanger hook */}
              <path d="M60 10 C60 10 60 4 67 4 C74 4 74 10 74 10" stroke="#9A8E80" strokeWidth="2" strokeLinecap="round" fill="none"/>
              {/* Hanger bar crosspiece */}
              <path d="M60 10 L60 24" stroke="#9A8E80" strokeWidth="2" strokeLinecap="round"/>
              <path d="M14 48 Q60 24 106 48" stroke="#9A8E80" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
              {/* Shoulders down */}
              <path d="M14 48 L28 80" stroke="#9A8E80" strokeWidth="1.5" strokeLinecap="round"/>
              <path d="M106 48 L92 80" stroke="#9A8E80" strokeWidth="1.5" strokeLinecap="round"/>
              {/* Body */}
              <path d="M28 80 L24 120 L96 120 L92 80 Z" stroke="#9A8E80" strokeWidth="1.5" fill="rgba(154,142,128,0.07)" strokeLinejoin="round"/>
              {/* Waist seam */}
              <path d="M30 100 L90 100" stroke="#9A8E80" strokeWidth="1" strokeDasharray="4 3" opacity="0.5"/>
              {/* Center seam */}
              <path d="M60 80 L60 120" stroke="#9A8E80" strokeWidth="1" strokeDasharray="3 3" opacity="0.4"/>
            </svg>
            <p className="products-empty-title">Nothing here yet</p>
            <p className="products-empty-sub">
              {activeFilter
                ? <>No products tagged <strong>{activeFilter}</strong>.</>
                : "The collection is being curated. Check back soon."}
            </p>
            {activeFilter && (
              <button className="products-empty-btn" onClick={() => setActiveFilter(null)}>
                View All Products
              </button>
            )}
          </div>
        ) : (
          <>
            <ProductGrid
              products={pagedProducts}
              onCardClick={(id) => navigate(`/product/${id}`)}
            />

            {/* ── Pagination ── */}
            {totalPages > 1 && (
              <div className="pagination">
                <button
                  className="pagination-btn pagination-prev"
                  onClick={() => { setCurrentPage(p => p - 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === 1}
                >
                  ← Prev
                </button>

                <div className="pagination-pages">
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                    <button
                      key={page}
                      className={`pagination-page${currentPage === page ? " active" : ""}`}
                      onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                    >
                      {page}
                    </button>
                  ))}
                </div>

                <button
                  className="pagination-btn pagination-next"
                  onClick={() => { setCurrentPage(p => p + 1); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                  disabled={currentPage === totalPages}
                >
                  Next →
                </button>
              </div>
            )}
          </>
        )}
        </div>{/* /section-inner */}
      </section>

      {/* ── Sale Strip ── */}
      <section className="sale-strip">
        <div className="sale-strip-inner">
          <div className="sale-strip-badge">LIMITED TIME</div>
          <div className="sale-strip-center">
            <span className="sale-strip-pct">50<sup>%</sup></span>
            <span className="sale-strip-off">OFF</span>
            <p className="sale-strip-desc">Selected ready-to-wear &amp; unstitched pieces</p>
          </div>
          <button
            className="sale-strip-btn"
            onClick={() => { setActiveFilter("SALE"); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}
          >
            SHOP SALE →
          </button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-main">
          <div className="footer-brand-col">
            <span className="footer-brand-name">ZAREEN</span>
            <span className="footer-brand-sub">by NaazAtif · Est. 2025</span>
            <p className="footer-brand-desc">
              Crafted with love, designed for the modern Pakistani woman. Elegance in every thread.
            </p>
            <div className="footer-socials">
              <a href="https://wa.me/923205623004" className="footer-social-btn footer-social-btn-wa">
                <svg viewBox="0 0 24 24" fill="currentColor" width="14" height="14">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.524 5.845L0 24l6.336-1.498A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 0 1-5.013-1.378l-.36-.213-3.762.889.93-3.672-.234-.374A9.757 9.757 0 0 1 2.182 12C2.182 6.566 6.566 2.182 12 2.182S21.818 6.566 21.818 12 17.434 21.818 12 21.818z"/>
                </svg>
                WhatsApp Us
              </a>
              <a href="https://www.instagram.com/zareen_by_naaz?igsh=N2dzNXRsdHBpNmVh" target="_blank" rel="noreferrer" className="footer-social-btn footer-social-btn-ig">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" width="14" height="14">
                  <rect x="2" y="2" width="20" height="20" rx="5" /><path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" /><line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
                </svg>
                Instagram
              </a>
            </div>
          </div>

        </div>

        <div className="footer-bottom">
          <p className="footer-copy">© 2026 Zareen by NaazAtif — All rights reserved.</p>
          <div className="footer-legal">
            {["Privacy Policy", "Terms", "Cookies"].map((l, i) => (
              <span key={i} className="footer-legal-link">{l}</span>
            ))}
          </div>
        </div>
        <p className="footer-dev">crafted with ♥ by Shujaat</p>
      </footer>

      <BottomNav
        onSearch={() => setSearchOpen(true)}
        onAbout={() => setAboutOpen(true)}
        onHome={() => { setActiveFilter(null); window.scrollTo({ top: 0, behavior: "smooth" }); }}
        cartCount={cartCount}
        activeFilter={activeFilter}
      />
    </div>
  );
}
