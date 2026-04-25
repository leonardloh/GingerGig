// components.jsx — shared atoms for Ginger Gig
import React, { createContext, useContext, useState } from 'react';

// ─── Icons (inline SVG, Lucide-style 1.5px stroke) ───
const Icon = ({
  name,
  size = 20,
  color = "currentColor",
  strokeWidth = 1.75,
  style,
}) => {
  const props = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: color,
    strokeWidth,
    strokeLinecap: "round",
    strokeLinejoin: "round",
    style,
  };
  switch (name) {
    case "mic":
      return (
        <svg {...props}>
          <rect x="9" y="2" width="6" height="12" rx="3" />
          <path d="M5 11a7 7 0 0 0 14 0" />
          <path d="M12 18v4" />
        </svg>
      );
    case "stop":
      return (
        <svg {...props}>
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      );
    case "check":
      return (
        <svg {...props}>
          <path d="M20 6 9 17l-5-5" />
        </svg>
      );
    case "chevron-right":
      return (
        <svg {...props}>
          <path d="m9 18 6-6-6-6" />
        </svg>
      );
    case "chevron-left":
      return (
        <svg {...props}>
          <path d="m15 18-6-6 6-6" />
        </svg>
      );
    case "chevron-down":
      return (
        <svg {...props}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      );
    case "search":
      return (
        <svg {...props}>
          <circle cx="11" cy="11" r="7" />
          <path d="m21 21-4.3-4.3" />
        </svg>
      );
    case "star":
      return (
        <svg {...props} fill={color}>
          <path d="M12 2 15 9l7 .8-5.3 4.8 1.6 7-6.3-3.7L5.7 21.6l1.6-7L2 9.8 9 9z" />
        </svg>
      );
    case "star-outline":
      return (
        <svg {...props}>
          <path d="M12 2 15 9l7 .8-5.3 4.8 1.6 7-6.3-3.7L5.7 21.6l1.6-7L2 9.8 9 9z" />
        </svg>
      );
    case "map-pin":
      return (
        <svg {...props}>
          <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
      );
    case "calendar":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
        </svg>
      );
    case "clock":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case "users":
      return (
        <svg {...props}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case "trending-up":
      return (
        <svg {...props}>
          <path d="m22 7-9 9-4-4-7 7" />
          <path d="M16 7h6v6" />
        </svg>
      );
    case "sparkles":
      return (
        <svg {...props}>
          <path d="M12 3v3m0 12v3M3 12h3m12 0h3M5.5 5.5l2 2m9 9 2 2m0-13-2 2m-9 9-2 2" />
        </svg>
      );
    case "home":
      return (
        <svg {...props}>
          <path d="M3 12 12 3l9 9" />
          <path d="M5 10v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1V10" />
        </svg>
      );
    case "list":
      return (
        <svg {...props}>
          <path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01" />
        </svg>
      );
    case "wallet":
      return (
        <svg {...props}>
          <path d="M19 7H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-9a2 2 0 0 0-2-2Z" />
          <path d="M16 14h.01" />
          <path d="M21 11V7a2 2 0 0 0-2-2h-3.5" />
        </svg>
      );
    case "user":
      return (
        <svg {...props}>
          <circle cx="12" cy="8" r="4" />
          <path d="M4 21a8 8 0 0 1 16 0" />
        </svg>
      );
    case "calendar-heart":
      return (
        <svg {...props}>
          <rect x="3" y="5" width="18" height="16" rx="2" />
          <path d="M8 3v4M16 3v4M3 10h18" />
          <path d="M12 18s-2-1.5-2-3a1.5 1.5 0 0 1 2-1.4 1.5 1.5 0 0 1 2 1.4c0 1.5-2 3-2 3Z" />
        </svg>
      );
    case "bell":
      return (
        <svg {...props}>
          <path d="M6 8a6 6 0 1 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
          <path d="M10.3 21a2 2 0 0 0 3.4 0" />
        </svg>
      );
    case "chef":
      return (
        <svg {...props}>
          <path d="M12 4a4 4 0 0 0-4 4c-2.5 0-4 2-4 4 0 2 2 3 3 3v5h10v-5c1 0 3-1 3-3 0-2-1.5-4-4-4a4 4 0 0 0-4-4Z" />
        </svg>
      );
    case "scissors":
      return (
        <svg {...props}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
        </svg>
      );
    case "paw":
      return (
        <svg {...props}>
          <circle cx="6" cy="9" r="2" />
          <circle cx="10" cy="5" r="2" />
          <circle cx="14" cy="5" r="2" />
          <circle cx="18" cy="9" r="2" />
          <path d="M8 14a4 4 0 0 1 8 0c0 4-2 6-4 6s-4-2-4-6Z" />
        </svg>
      );
    case "broom":
      return (
        <svg {...props}>
          <path d="m17 4-9 9" />
          <path d="m4 21 4-9 8 8-12 1Z" />
          <path d="m13 8 6-6" />
        </svg>
      );
    case "play":
      return (
        <svg {...props} fill={color}>
          <path d="m6 4 14 8-14 8z" />
        </svg>
      );
    case "pause":
      return (
        <svg {...props}>
          <rect x="6" y="5" width="4" height="14" rx="1" />
          <rect x="14" y="5" width="4" height="14" rx="1" />
        </svg>
      );
    case "shield":
      return (
        <svg {...props}>
          <path d="M12 2 4 5v7c0 5 4 9 8 10 4-1 8-5 8-10V5l-8-3Z" />
          <path d="m9 12 2 2 4-4" />
        </svg>
      );
    case "x":
      return (
        <svg {...props}>
          <path d="M18 6 6 18M6 6l12 12" />
        </svg>
      );
    case "plus":
      return (
        <svg {...props}>
          <path d="M12 5v14M5 12h14" />
        </svg>
      );
    case "alert":
      return (
        <svg {...props}>
          <path d="M12 9v4M12 17h.01" />
          <path d="M10.3 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
        </svg>
      );
    case "info":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 16v-4M12 8h.01" />
        </svg>
      );
    case "globe":
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
          <path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" />
        </svg>
      );
    case "message":
    case "message-circle":
      return (
        <svg {...props}>
          <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        </svg>
      );
    case "phone":
      return (
        <svg {...props}>
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
      );
    case "edit":
      return (
        <svg {...props}>
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.12 2.12 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5Z" />
        </svg>
      );
    case "close":
      return (
        <svg {...props}>
          <path d="M18 6L6 18M6 6l12 12" />
        </svg>
      );
    case "heart":
      return (
        <svg {...props}>
          <path d="M19 14c1.5-1.5 3-3.5 3-6a4 4 0 0 0-7-2.7A4 4 0 0 0 8 5a4 4 0 0 0-6 3c0 5 9 12 10 13 .5-.5 4-3.5 7-7Z" />
        </svg>
      );
    case "eye":
      return (
        <svg {...props}>
          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8Z" />
          <circle cx="12" cy="12" r="3" />
        </svg>
      );
    case "eye-off":
      return (
        <svg {...props}>
          <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94" />
          <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19" />
          <path d="M1 1l22 22" />
        </svg>
      );
    case "log-out":
      return (
        <svg {...props}>
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
          <polyline points="16 17 21 12 16 7" />
          <line x1="21" y1="12" x2="9" y2="12" />
        </svg>
      );
    default:
      return (
        <svg {...props}>
          <circle cx="12" cy="12" r="9" />
        </svg>
      );
  }
};

// ─── Avatar (portrait with fallback to initials) ───
const Avatar = ({
  src,
  initials,
  size = 48,
  tone = "warm",
  border = false,
}) => {
  const [err, setErr] = useState(false);
  const tones = {
    warm: "linear-gradient(135deg,#E8A87C,#C2662D)",
    teal: "linear-gradient(135deg,#4DA6A6,#2D6A6A)",
    gold: "linear-gradient(135deg,#E6C36F,#B58423)",
    sand: "linear-gradient(135deg,#D8C4A8,#9C7E5C)",
  };
  const showImg = src && !err;
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: tones[tone] || tones.warm,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        color: "#fff",
        fontWeight: 600,
        fontSize: size * 0.36,
        letterSpacing: "0.02em",
        flexShrink: 0,
        overflow: "hidden",
        position: "relative",
        boxShadow: border ? "0 0 0 3px #fff, 0 0 0 4px var(--border)" : "none",
      }}
    >
      {showImg && (
        <img
          src={src}
          alt=""
          onError={() => setErr(true)}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            position: "absolute",
            inset: 0,
          }}
        />
      )}
      {!showImg && <span>{initials}</span>}
    </div>
  );
};

// ─── Button ───
const Button = ({
  children,
  variant = "primary",
  size = "md",
  full,
  onClick,
  icon,
  style,
  disabled,
}) => {
  const base = {
    appearance: "none",
    border: 0,
    cursor: disabled ? "not-allowed" : "pointer",
    fontFamily: "var(--font-body)",
    fontWeight: 600,
    borderRadius: 10,
    transition: "all 0.18s ease",
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    width: full ? "100%" : "auto",
    opacity: disabled ? 0.5 : 1,
    letterSpacing: "0.005em",
  };
  const sizes = {
    sm: { height: 38, padding: "0 14px", fontSize: 14 },
    md: { height: 48, padding: "0 20px", fontSize: 16 },
    lg: { height: 56, padding: "0 24px", fontSize: 18 },
  };
  const variants = {
    primary: { background: "var(--primary)", color: "#fff" },
    secondary: {
      background: "transparent",
      color: "var(--primary)",
      boxShadow: "inset 0 0 0 1.5px var(--primary)",
    },
    ghost: { background: "transparent", color: "var(--text-2)" },
    teal: { background: "var(--secondary)", color: "#fff" },
    dark: { background: "var(--text-1)", color: "#fff" },
  };
  return (
    <button
      onClick={disabled ? undefined : onClick}
      style={{ ...base, ...sizes[size], ...variants[variant], ...style }}
      onMouseDown={(e) =>
        !disabled && (e.currentTarget.style.transform = "scale(0.98)")
      }
      onMouseUp={(e) => (e.currentTarget.style.transform = "")}
      onMouseLeave={(e) => (e.currentTarget.style.transform = "")}
    >
      {icon && <Icon name={icon} size={size === "lg" ? 20 : 18} />}
      <span>{children}</span>
    </button>
  );
};

// ─── Card ───
const Card = ({ children, style, aiBorder, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: "var(--surface)",
      border: "1px solid var(--border)",
      borderLeft: aiBorder
        ? "3px solid var(--accent)"
        : "1px solid var(--border)",
      borderRadius: 12,
      boxShadow: "0 1px 3px rgba(44, 36, 32, 0.06)",
      cursor: onClick ? "pointer" : "default",
      ...style,
    }}
  >
    {children}
  </div>
);

// ─── Badge ───
const Badge = ({ children, tone = "neutral", style }) => {
  const tones = {
    neutral: { bg: "var(--bg-2)", color: "var(--text-2)" },
    primary: { bg: "var(--primary-subtle)", color: "var(--primary)" },
    teal: { bg: "var(--secondary-subtle)", color: "var(--secondary)" },
    accent: { bg: "var(--accent-subtle)", color: "#8a6614" },
    success: { bg: "#E8F2EC", color: "var(--success)" },
    warning: { bg: "#FBEFD9", color: "var(--warning)" },
    error: { bg: "#FBE6E6", color: "var(--error)" },
    teal_solid: { bg: "var(--secondary)", color: "#fff" },
  };
  const t = tones[tone] || tones.neutral;
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        padding: "4px 10px",
        borderRadius: 999,
        fontSize: 12,
        fontWeight: 600,
        background: t.bg,
        color: t.color,
        letterSpacing: "0.01em",
        ...style,
      }}
    >
      {children}
    </span>
  );
};

// ─── AI label (gold sparkle row) ───
const AILabel = () => (
  <div
    style={{
      display: "inline-flex",
      alignItems: "center",
      gap: 6,
      color: "#8a6614",
      fontSize: 12,
      fontWeight: 600,
      letterSpacing: "0.04em",
      textTransform: "uppercase",
    }}
  >
    <Icon name="sparkles" size={14} />
    <span>{useT()("aiGenerated")}</span>
  </div>
);

// ─── Stars ───
const Stars = ({ value, size = 14 }) => {
  const full = Math.floor(value);
  const half = value - full >= 0.5;
  return (
    <span style={{ display: "inline-flex", gap: 1.5, color: "#D4A94C" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <Icon
          key={i}
          name={i < full || (i === full && half) ? "star" : "star-outline"}
          size={size}
        />
      ))}
    </span>
  );
};

// ─── BottomNav ───
const BottomNav = ({ items, active, onChange }) => (
  <nav
    style={{
      position: "sticky",
      bottom: 0,
      left: 0,
      right: 0,
      background: "rgba(253, 250, 247, 0.92)",
      backdropFilter: "blur(16px)",
      borderTop: "1px solid var(--border)",
      display: "grid",
      gridTemplateColumns: `repeat(${items.length}, 1fr)`,
      paddingBottom: "max(8px, env(safe-area-inset-bottom))",
      paddingTop: 8,
      zIndex: 5,
    }}
  >
    {items.map((it) => {
      const isActive = active === it.id;
      return (
        <button
          key={it.id}
          onClick={() => onChange(it.id)}
          style={{
            appearance: "none",
            border: 0,
            background: "transparent",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: 3,
            padding: "8px 4px",
            cursor: "pointer",
            color: isActive ? "var(--primary)" : "var(--text-3)",
            fontFamily: "var(--font-body)",
            fontSize: 11,
            fontWeight: 600,
          }}
        >
          <Icon name={it.icon} size={22} strokeWidth={isActive ? 2.2 : 1.75} />
          <span>{it.label}</span>
        </button>
      );
    })}
  </nav>
);

// ─── PhoneShell — kept for compat, but now just a passthrough wrapper ───
const PhoneShell = ({ children }) => <>{children}</>;

// ─── A "T" hook for translations sourced from app context ───
const T_CTX = createContext(null);
function useT() {
  return React.useContext(T_CTX) || ((k) => k);
}
function useLang() {
  return React.useContext(LANG_CTX) || "en";
}
const LANG_CTX = createContext("en");

// ─── Ginger root logo mark ───
// Knobby ginger tuber with 3 finger branches reaching up + segment ring details.
// Inspired by classic ginger root illustration. Filled in warm orange with white
// ring lines slicing across each knob. viewBox 32×32.
// Knobby blobby ginger root — bulbous form, with cream leaves sprouting
// from the top and small dot accents floating around. Inspired by reference:
// warm terracotta body, soft cream-tan leaves, white ring slices on body.
const GingerLogo = ({
  size = 22,
  fill = "#C2662D",
  leaf = "#E6D2B5",
  dot = "#D4A974",
  ring = "#FFF5EA",
}) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 32 32"
    fill="none"
    aria-label="Ginger Gig"
  >
    <defs>
      <clipPath id="gg-body-v3">
        <path
          d="M14.5 8.5
                 c1.8 -0.5 3.7 -0.6 5.4 0.1
                 c2.0 0.8 3.4 2.7 3.6 4.8
                 c0.1 1.3 -0.3 2.6 -0.2 3.9
                 c0.1 1.3 0.7 2.5 0.9 3.8
                 c0.3 1.7 -0.4 3.5 -1.8 4.5
                 c-1.4 1.0 -3.3 1.2 -5.0 0.7
                 c-1.1 -0.3 -2.0 -0.9 -3.1 -1.2
                 c-1.4 -0.4 -2.9 0.0 -4.3 -0.4
                 c-1.7 -0.5 -3.0 -1.9 -3.2 -3.7
                 c-0.2 -1.5 0.4 -2.9 0.6 -4.3
                 c0.2 -1.4 -0.1 -2.8 -0.1 -4.2
                 c0.0 -2.0 1.4 -3.9 3.4 -4.4
                 c1.3 -0.3 2.6 0.1 3.8 0.4 z"
        />
      </clipPath>
    </defs>

    {/* Small dot accents — drawn first, behind body */}
    <circle cx="5.0" cy="10.5" r="1.1" fill={dot} />
    <circle cx="2.8" cy="14.0" r="0.6" fill={dot} opacity="0.65" />
    <circle cx="27.5" cy="14" r="0.7" fill={dot} opacity="0.6" />
    <circle cx="26.5" cy="23" r="0.6" fill={dot} opacity="0.65" />

    {/* Cream leaves on top — stem + 2 leaves */}
    <g>
      {/* central stem */}
      <path
        d="M16.0 8.2 c-0.2 -1.2 -0.4 -2.5 0.0 -3.8"
        stroke={leaf}
        strokeWidth="0.7"
        strokeLinecap="round"
        fill="none"
      />
      {/* left smaller leaf */}
      <path
        d="M15.7 5.8
               c-1.4 -0.2 -2.6 -1.0 -3.0 -2.3
               c1.3 -0.1 2.6 0.6 3.2 1.8
               c0.1 0.2 0.0 0.5 -0.2 0.5 z"
        fill={leaf}
      />
      {/* right larger leaf */}
      <path
        d="M16.3 5.2
               c0.3 -1.7 1.7 -3.0 3.4 -3.2
               c0.0 1.7 -1.1 3.3 -2.7 3.7
               c-0.4 0.1 -0.8 -0.1 -0.7 -0.5 z"
        fill={leaf}
      />
    </g>

    {/* Body — bulbous knobby ginger silhouette */}
    <path
      d="M14.5 8.5
         c1.8 -0.5 3.7 -0.6 5.4 0.1
         c2.0 0.8 3.4 2.7 3.6 4.8
         c0.1 1.3 -0.3 2.6 -0.2 3.9
         c0.1 1.3 0.7 2.5 0.9 3.8
         c0.3 1.7 -0.4 3.5 -1.8 4.5
         c-1.4 1.0 -3.3 1.2 -5.0 0.7
         c-1.1 -0.3 -2.0 -0.9 -3.1 -1.2
         c-1.4 -0.4 -2.9 0.0 -4.3 -0.4
         c-1.7 -0.5 -3.0 -1.9 -3.2 -3.7
         c-0.2 -1.5 0.4 -2.9 0.6 -4.3
         c0.2 -1.4 -0.1 -2.8 -0.1 -4.2
         c0.0 -2.0 1.4 -3.9 3.4 -4.4
         c1.3 -0.3 2.6 0.1 3.8 0.4 z"
      fill={fill}
    />

    {/* White flowing ring lines across the body */}
    <g
      clipPath="url(#gg-body-v3)"
      stroke={ring}
      strokeWidth="1.0"
      strokeLinecap="round"
      fill="none"
      opacity="0.9"
    >
      <path d="M6 13.5 q4 -0.9 8 -0.3 q4 0.5 9 -0.4" />
      <path d="M4 17.5 q5 0.9 11 0.0 q4 -0.6 9 0.5" />
      <path d="M5 21.5 q5 1.1 10 0.0 q4 -0.5 8 0.5" />
    </g>
  </svg>
);


export { Icon, Avatar, Button, Card, Badge, AILabel, Stars, GingerLogo, BottomNav, PhoneShell, T_CTX, LANG_CTX, useT, useLang };
