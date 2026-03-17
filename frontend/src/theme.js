/**
 * ThemeConfig — single source of truth for all design tokens.
 * Import this in any component that needs programmatic access to
 * colors, shadows, z-levels, fonts, or spacing.
 */
export const ThemeConfig = {
  colors: {
    bone:    '#F6F1E9',
    bone2:   '#EDE6DA',
    bone3:   '#DDD5C5',
    ink:     '#17110A',
    ink2:    '#4A3C30',
    ink3:    '#786A5C',
    fog:     '#9A8E80',
    rouge:   '#8B1020',
    rougeD:  '#6A0C18',
    amber:   '#B8922A',
    amberL:  '#E0CFA0',
    ember:   '#D94F1A',
    white:   '#FFFFFF',
    green:   '#27AE60',
  },

  /**
   * Three-layer shadow system.
   * lift1 = resting  |  lift2 = hover  |  lift3 = active / featured
   */
  shadows: {
    lift1: '0 2px 8px rgba(23,17,10,0.06)',
    lift2: '0 8px 24px rgba(23,17,10,0.10), 0 2px 6px rgba(23,17,10,0.06)',
    lift3: '0 20px 48px rgba(23,17,10,0.14), 0 6px 16px rgba(23,17,10,0.08), 0 2px 4px rgba(23,17,10,0.04)',
    ember: '0 12px 36px rgba(217,79,26,0.35)',
    rouge: '0 12px 32px rgba(139,16,32,0.30)',
  },

  /** Z-index layer map — strict ordering, never deviate */
  zIndex: {
    base:    1,
    sticky:  10,
    overlay: 50,
    modal:   100,
  },

  fonts: {
    serif: "'Cormorant Garamond', Georgia, serif",
    sans:  "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    mono:  "'Space Mono', 'Courier New', monospace",
  },

  spacing: {
    xs:  '4px',
    sm:  '8px',
    md:  '16px',
    lg:  '24px',
    xl:  '40px',
    '2xl': '64px',
  },

  /** Easing curves */
  easing: {
    out:    'cubic-bezier(0.22, 1, 0.36, 1)',
    spring: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
    in:     'cubic-bezier(0.4, 0, 1, 1)',
  },
};

export default ThemeConfig;
