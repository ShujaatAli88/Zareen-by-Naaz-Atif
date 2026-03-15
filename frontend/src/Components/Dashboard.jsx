import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import "./Dashboard.css";

const API = process.env.REACT_APP_API_URL || "http://localhost:5000";
const NAV_LINKS = ["NEW IN", "EID COLLECTION", "READY TO WEAR", "FABRICS", "SALE"];

const FOOTER_COLS = [
  { title: "SHOP", links: ["New In", "Eid Collection", "Ready to Wear", "Fabrics", "Sale"] },
  { title: "HELP", links: ["Size Guide", "Track Order", "Returns", "FAQs", "Contact Us"] },
  { title: "COMPANY", links: ["About Us", "Careers", "Press", "Stores", "Blog"] },
];

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(true);
  const [activeFilter, setActiveFilter] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeSlide, setActiveSlide] = useState(0);
  const [aboutOpen, setAboutOpen] = useState(false);

  // Search
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const searchInputRef = useRef(null);

  const navigate = useNavigate();

  // Fetch all products
  useEffect(() => {
    fetch(`${API}/api/products`)
      .then((r) => r.json())
      .then((data) => setProducts(data))
      .catch(() => setProducts([]))
      .finally(() => setLoadingProducts(false));
  }, []);

  // Body scroll lock for overlays
  useEffect(() => {
    document.body.style.overflow = (mobileMenuOpen || searchOpen || aboutOpen) ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [mobileMenuOpen, searchOpen, aboutOpen]);

  // Focus search input when opened
  useEffect(() => {
    if (searchOpen) setTimeout(() => searchInputRef.current?.focus(), 60);
  }, [searchOpen]);

  // Close search on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === "Escape") closeSearch(); };
    if (searchOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [searchOpen]);

  const closeSearch = () => { setSearchOpen(false); setSearchQuery(""); };

  // Derived: filtered products for main grid
  const displayProducts = (() => {
    let list = products;
    if (activeFilter) list = list.filter(p => p.badge === activeFilter);
    return list;
  })();

  // Search results (live, inside search modal)
  const searchResults = (() => {
    if (!searchQuery.trim()) return [];
    const q = searchQuery.trim().toLowerCase();
    return products.filter(p =>
      p.name.toLowerCase().includes(q) ||
      (p.badge || "").toLowerCase().includes(q)
    );
  })();

  const sectionTitle = searchQuery.trim() ? `Results for "${searchQuery}"` : (activeFilter || "New Arrivals");
  const sectionEyebrow = searchQuery.trim() ? "SEARCH" : (activeFilter ? "FILTERED BY" : "HAND PICKED");

  return (
    <div className="app">

      {/* ── Announcement Bar ── */}
      <div className="announcement-bar">
        ✨ Eid Exclusives — Free Shipping on Orders Above PKR 5,000 &nbsp;
        <span className="announcement-link">SHOP NOW</span>
      </div>

      {/* ── Navbar ── */}
      <nav className="navbar">
        <div className="logo">
          <img src="/nazzAtif_logo.jpeg" alt="NaazAtif Logo" className="logo-img" />
        </div>

        <ul className="nav-links">
          {NAV_LINKS.map((link, i) => (
            <li
              key={i}
              className={`nav-item ${i === 4 ? "nav-sale" : ""} ${activeFilter === link ? "nav-active" : ""}`}
              onClick={() => { setActiveFilter(activeFilter === link ? null : link); setSearchQuery(""); }}
            >
              {link}
            </li>
          ))}
          <li className="nav-item nav-about" onClick={() => setAboutOpen(true)}>ABOUT US</li>
        </ul>

        <div className="nav-icons">
          {/* Search button — icon only on mobile, pill on desktop */}
          <button
            className={`search-btn${searchOpen ? " search-btn-active" : ""}`}
            onClick={() => setSearchOpen(true)}
            aria-label="Search"
          >
            <svg className="search-btn-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="7" />
              <line x1="16.5" y1="16.5" x2="22" y2="22" />
            </svg>
            <span className="search-btn-label">Search</span>
          </button>

          <button className="hamburger" onClick={() => setMobileMenuOpen(true)} aria-label="Open menu">
            <span /><span /><span />
          </button>
        </div>
      </nav>

      {/* ── Search Modal ── */}
      {searchOpen && (
        <div className="search-modal-overlay" onClick={closeSearch}>
          <div className="search-modal" onClick={(e) => e.stopPropagation()}>
            {/* Search bar */}
            <div className="search-modal-bar">
              <svg className="search-modal-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="11" cy="11" r="7" /><line x1="16.5" y1="16.5" x2="22" y2="22" />
              </svg>
              <input
                ref={searchInputRef}
                className="search-modal-input"
                placeholder="Search for products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="search-modal-clear" onClick={() => setSearchQuery("")}>✕</button>
              )}
              <button className="search-modal-close" onClick={closeSearch}>Close</button>
            </div>

            {/* Results area */}
            <div className="search-modal-body">
              {!searchQuery.trim() ? (
                <div className="search-modal-hint">
                  <p className="search-hint-title">What are you looking for?</p>
                  <div className="search-hint-tags">
                    {NAV_LINKS.map((tag, i) => (
                      <span key={i} className="search-hint-tag" onClick={() => { setSearchQuery(tag); }}>
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              ) : searchResults.length === 0 ? (
                <div className="search-no-results">
                  <span className="search-no-results-icon">🔍</span>
                  <p>No results for <strong>"{searchQuery}"</strong></p>
                  <p className="search-no-results-sub">Try a different keyword or browse our collections</p>
                </div>
              ) : (
                <>
                  <p className="search-results-count">
                    {searchResults.length} result{searchResults.length !== 1 ? "s" : ""} for "{searchQuery}"
                  </p>
                  <div className="search-results-grid">
                    {searchResults.map((p) => (
                      <div
                        key={p._id}
                        className="search-result-card"
                        onClick={() => { closeSearch(); navigate(`/product/${p._id}`); }}
                      >
                        <div className="search-result-img-wrap">
                          <img src={p.img} alt={p.name} className="search-result-img" loading="lazy" />
                          <span className="search-result-badge">{p.badge}</span>
                        </div>
                        <div className="search-result-info">
                          <p className="search-result-name">{p.name}</p>
                          <p className="search-result-price">{p.price}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Mobile Menu Overlay ── */}
      {mobileMenuOpen && (
        <div className="mobile-menu-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-menu" onClick={(e) => e.stopPropagation()}>
            <div className="mobile-menu-header">
              <div className="mobile-menu-brand">ZAREEN'S</div>
              <button className="mobile-menu-close" onClick={() => setMobileMenuOpen(false)}>✕</button>
            </div>
            <ul className="mobile-nav-links">
              {/* Search row */}
              <li className="mobile-nav-item mobile-search-row">
                <input
                  className="mobile-search-input"
                  placeholder="🔍 Search products..."
                  onFocus={() => { setMobileMenuOpen(false); setSearchOpen(true); }}
                  readOnly
                />
              </li>
              {NAV_LINKS.map((link, i) => (
                <li
                  key={i}
                  className={`mobile-nav-item ${i === 4 ? "nav-sale" : ""} ${activeFilter === link ? "mobile-nav-active" : ""}`}
                  onClick={() => { setActiveFilter(activeFilter === link ? null : link); setSearchQuery(""); setMobileMenuOpen(false); }}
                >
                  {link} {activeFilter === link ? "✓" : ""}
                </li>
              ))}
              <li
                className="mobile-nav-item mobile-nav-about"
                onClick={() => { setMobileMenuOpen(false); setAboutOpen(true); }}
              >
                ABOUT US
              </li>
            </ul>
            <div className="mobile-menu-footer">
              <p>WhatsApp: <a href="https://wa.me/923555353536" className="mobile-wa-link">+92 355 5353536</a></p>
            </div>
          </div>
        </div>
      )}

      {/* ── About Us Modal ── */}
      {aboutOpen && (
        <div className="about-overlay" onClick={() => setAboutOpen(false)}>
          <div className="about-modal" onClick={(e) => e.stopPropagation()}>

            {/* Header bar */}
            <div className="about-modal-header">
              <div className="about-modal-brand">
                <span className="about-modal-brand-main">ZAREEN'S</span>
                <span className="about-modal-brand-sub">by NaazAtif</span>
              </div>
              <button className="about-modal-close" onClick={() => setAboutOpen(false)} aria-label="Close">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                </svg>
              </button>
            </div>

            {/* Body */}
            <div className="about-modal-body">

              {/* Eyebrow + title */}
              <p className="about-eyebrow">✦ OUR STORY ✦</p>
              <h2 className="about-title">The Heart of Zareen</h2>
              <p className="about-subtitle">From the Peaks to the Loom</p>

              {/* Pull quote */}
              <blockquote className="about-pullquote">
                "My story began where the clouds meet the Karakoram."
              </blockquote>

              <div className="about-divider" />

              {/* Main intro */}
              <p className="about-body">
                I am <strong>Khuram Naaz (NaazAtif)</strong>, and my journey is rooted in the breathtaking valleys of
                Gilgit-Baltistan. Growing up amidst the rugged grandeur of Northern Pakistan, I didn't just see the
                mountains — I saw the art hidden within them. In our culture, clothing is a silent language: from the
                intricate Iragi caps hand-stitched by our elders to the vibrant, hand-woven patterns that have warmed
                our families for generations.
              </p>
              <p className="about-body">
                Coming from a humble background in the North, I learned early on that true luxury isn't about a price
                tag — it's about the grace of simplicity and the strength of heritage.
              </p>

              {/* Section: Mother's Vision */}
              <div className="about-section">
                <p className="about-section-eyebrow">A Mother's Vision</p>
                <p className="about-body">
                  While my roots gave me my foundation, my greatest inspiration walks beside me today. Being a mother
                  to my spirited three-year-old son, <strong>Aron Atif</strong>, changed how I view the world of
                  fashion. He taught me that beauty is found in resilience — and that the clothes we wear should feel
                  like a sanctuary: as comforting as home, yet as bold as a mountain peak.
                </p>
              </div>

              {/* Section: Birth */}
              <div className="about-section">
                <p className="about-section-eyebrow">The Birth of Zareen by NaazAtif</p>
                <p className="about-body">
                  Zareen was born from a desire to merge these two worlds — the realization of a lifelong dream to
                  bring the soul of GB's clothing culture: its rich textures, its soulful embroidery, and its timeless
                  silhouettes, into the wardrobe of the modern woman.
                </p>
              </div>

              {/* What you wear */}
              <div className="about-wear-block">
                <p className="about-wear-title">When you wear Zareen, you wear:</p>
                <ul className="about-wear-list">
                  <li>
                    <span className="about-wear-dot">✦</span>
                    <div>
                      <strong>The Spirit of the North</strong>
                      <span> — Inspired by the artisans of the Silk Road.</span>
                    </div>
                  </li>
                  <li>
                    <span className="about-wear-dot">✦</span>
                    <div>
                      <strong>A Personal Legacy</strong>
                      <span> — A brand built on the values of a humble upbringing and the love of a mother.</span>
                    </div>
                  </li>
                  <li>
                    <span className="about-wear-dot">✦</span>
                    <div>
                      <strong>Modern Elegance</strong>
                      <span> — Pieces designed for the woman who honors her past while leading her future.</span>
                    </div>
                  </li>
                </ul>
              </div>

              {/* Closing */}
              <div className="about-closing">
                <p className="about-closing-text">
                  From my home in the mountains to your doorstep — welcome to a piece of my heart.
                </p>
                <p className="about-closing-sig">Welcome to Zareen by NaazAtif.</p>
              </div>

            </div>
          </div>
        </div>
      )}

      {/* ── Hero ── */}
      <section className="hero">
        <img src="https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1400&q=80" alt="hero" className="hero-img" />
        <div className="hero-overlay">
          <div className="hero-text-block">
            <p className="hero-eyebrow">✦ EID COLLECTION 2025 ✦</p>
            <h1 className="hero-title">FLORAL<br />RADIANCE</h1>
            <p className="hero-sub">ready to wear &nbsp;•&nbsp; eid collection</p>
            <div className="hero-btns">
              <button className="btn btn-primary" onClick={() => { setActiveFilter(null); document.getElementById("products")?.scrollIntoView({ behavior: "smooth" }); }}>SHOP NOW</button>
              <button className="btn btn-outline-white">EXPLORE</button>
            </div>
          </div>
        </div>
        <div className="hero-dots">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`dot ${i === activeSlide ? "dot-active" : ""}`} onClick={() => setActiveSlide(i)} />
          ))}
        </div>
      </section>

      {/* ── Brand Strip — true marquee (two identical tracks) ── */}
      {(() => {
        const items = ["ZAREEN'S WARDROBE", "✦", "BY NAAZATIF", "✦", "EID 2026", "✦", "READY TO WEAR", "✦", "LUXURY LAWN", "✦", "UNSTITCHED", "✦"];
        const renderTrack = (prefix) => items.map((t, i) => (
          <span key={`${prefix}-${i}`} className={t === "✦" ? "brand-strip-dot" : "brand-strip-text"}>{t}</span>
        ));
        return (
          <div className="brand-strip" aria-hidden="true">
            <div className="brand-strip-track">{renderTrack("a")}</div>
            <div className="brand-strip-track" aria-hidden="true">{renderTrack("b")}</div>
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
        <div className="section-header">
          <p className="section-eyebrow">{sectionEyebrow}</p>
          <h2 className="section-title">{sectionTitle}</h2>
          <div className="section-divider maroon" />
          {activeFilter && (
            <button className="filter-clear-btn" onClick={() => setActiveFilter(null)}>
              ✕ Show all products
            </button>
          )}
        </div>

        {loadingProducts ? (
          <div className="products-loading">Loading...</div>
        ) : displayProducts.length === 0 ? (
          <div className="products-empty">
            No products in this category. <span className="filter-clear-link" onClick={() => setActiveFilter(null)}>Show all</span>
          </div>
        ) : (
          <div className="products-grid">
            {displayProducts.map((p, idx) => (
              <div
                key={p._id}
                className="product-card"
                style={{ animationDelay: `${Math.min(idx, 7) * 0.07}s` }}
                onClick={() => navigate(`/product/${p._id}`)}
              >
                <div className="product-img-wrapper">
                  <img src={p.img} alt={p.name} className="product-img" loading="lazy" />

                  {/* Hover overlay — quick view */}
                  <div className="product-hover-overlay">
                    <button
                      className="product-quick-view-btn"
                      onClick={(e) => { e.stopPropagation(); navigate(`/product/${p._id}`); }}
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>
                      </svg>
                      QUICK VIEW
                    </button>
                  </div>

                  {/* Badge */}
                  {p.badge && <span className="product-badge">{p.badge}</span>}

                  {/* Wishlist heart — decorative */}
                  <button
                    className="product-wishlist-btn"
                    onClick={(e) => e.stopPropagation()}
                    aria-label="Save"
                  >
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
                    </svg>
                  </button>
                </div>

                <div className="product-info">
                  {p.badge && <p className="product-category">{p.badge}</p>}
                  <p className="product-name">{p.name}</p>
                  <div className="product-price-row">
                    <p className="product-price">{p.price}</p>
                    <span className="product-price-tag">PKR</span>
                  </div>
                  <button
                    className="product-order-btn"
                    onClick={(e) => { e.stopPropagation(); navigate(`/product/${p._id}`); }}
                  >
                    ORDER NOW
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* ── Sale Banner ── */}
      <section className="sale-banner">
        <img src="https://images.unsplash.com/photo-1583391733956-6c78276477e2?w=1400&q=80" alt="sale" className="sale-img" />
        <div className="sale-overlay" />
        <div className="sale-content">
          <p className="sale-eyebrow">LIMITED OFFER</p>
          <h2 className="sale-title">SALE UP TO 50% OFF</h2>
          <p className="sale-sub">On selected ready-to-wear and unstitched pieces</p>
          <button className="btn btn-gold">SHOP SALE</button>
        </div>
      </section>

      {/* ── Footer ── */}
      <footer className="footer">
        <div className="footer-inner">

          {/* Brand Hero */}
          <div className="footer-brand-hero">
            <p className="footer-brand-hero-name">ZAREEN'S</p>
            <p className="footer-brand-hero-tagline">Wardrobe by NaazAtif · Est. 2025</p>
            <div className="footer-brand-hero-divider" />
            <p className="footer-brand-hero-desc">
              Crafted with love, designed for the modern Pakistani woman.<br />Elegance in every thread.
            </p>
            <div className="footer-social-row">
              <a href="https://wa.me/923555353536" className="footer-wa-btn">
                <svg viewBox="0 0 24 24" fill="currentColor" width="15" height="15">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
                  <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.555 4.116 1.524 5.845L0 24l6.336-1.498A11.93 11.93 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.818a9.794 9.794 0 0 1-5.013-1.378l-.36-.213-3.762.889.93-3.672-.234-.374A9.757 9.757 0 0 1 2.182 12C2.182 6.566 6.566 2.182 12 2.182S21.818 6.566 21.818 12 17.434 21.818 12 21.818z"/>
                </svg>
                WhatsApp Us
              </a>
              <a
                href="https://www.instagram.com/zareen_by_naaz?igsh=N2dzNXRsdHBpNmVh"
                target="_blank" rel="noreferrer"
                className="footer-insta-btn"
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <rect x="2" y="2" width="20" height="20" rx="5" ry="5"/>
                  <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z"/>
                  <line x1="17.5" y1="6.5" x2="17.51" y2="6.5"/>
                </svg>
                Follow on Instagram
              </a>
            </div>
          </div>

          {/* Link columns */}
          <div className="footer-grid">
            {FOOTER_COLS.map((col, i) => (
              <div key={i} className="footer-col">
                <h4 className="footer-col-title">{col.title}</h4>
                {col.links.map((l, j) => <p key={j} className="footer-link">{l}</p>)}
              </div>
            ))}
          </div>

        </div>

        <div className="footer-bottom">
          <p className="footer-copy">© 2025 Zareen by NaazAtif — All rights reserved.</p>
          <div className="footer-legal">
            {["Privacy Policy", "Terms", "Cookies"].map((l, i) => (
              <span key={i} className="footer-legal-link">{l}</span>
            ))}
          </div>
        </div>
      </footer>
    </div>
  );
}
