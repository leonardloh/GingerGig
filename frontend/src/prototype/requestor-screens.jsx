import { AILabel, Avatar, Badge, Button, Card, GingerLogo, Icon, Stars, useLang, useT } from './components';
// requestor-screens.jsx — Home, Search results, Provider detail
import { useEffect, useMemo, useRef, useState } from 'react';
import { getListingById, searchListings } from '../services/api/endpoints/requestor';

function formatListingPrice(listing) {
  const price = `RM${listing.price}`;
  return listing.priceMax ? `${price}-${listing.priceMax}` : price;
}

function formatMenuPrice(price) {
  return typeof price === "number" ? `RM${price}` : price;
}

function providerTone(provider) {
  return provider.id === "chen"
    ? "teal"
    : provider.id === "raju"
      ? "gold"
      : provider.id === "hassan"
        ? "sand"
        : "warm";
}

function adaptListingToProvider(listing) {
  return {
    id: listing.id,
    name: listing.elderName || "Provider",
    initials: listing.elderInitials || "GG",
    area: listing.elderArea || "",
    portrait: listing.elderPortraitUrl,
    service: listing.title,
    description: listing.description,
    rating: listing.rating,
    reviews: listing.reviewCount,
    price: formatListingPrice(listing),
    priceUnit: listing.priceUnit,
    distance: listing.distance,
    matchScore:
      listing.matchScore ??
      Math.round(Math.min(Number(listing.rating) || 0, 5) * 20),
    matchReason: listing.matchReason,
    days: listing.days,
    menu: listing.menu.map((item) => ({
      ...item,
      price: formatMenuPrice(item.price),
    })),
    halal: listing.halal,
    age: listing.age,
    tone: providerTone(listing),
  };
}

function adaptReview(review) {
  return {
    id: review.id,
    author: review.reviewerName,
    date: new Date(review.createdAt).toLocaleDateString([], {
      month: "short",
      day: "numeric",
    }),
    text: review.comment,
    rating: review.rating,
  };
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 4 — Requestor Home
// ═══════════════════════════════════════════════════════════════
function RequestorHome({ onSearch, onProvider, user }) {
  const t = useT();
  const [q, setQ] = useState("");
  const [voiceOpen, setVoiceOpen] = useState(false);
  const [providers, setProviders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    searchListings({})
      .then((listings) => {
        if (!active) return;
        setProviders(listings.map(adaptListingToProvider));
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  const cats = [
    { key: "cat_cooking", icon: "chef", bg: "#FFF3EC", color: "#C2662D" },
    { key: "cat_crafts", icon: "scissors", bg: "#FFF8E7", color: "#B58423" },
    { key: "cat_pet", icon: "paw", bg: "#E6F5F5", color: "#2D6A6A" },
    { key: "cat_household", icon: "broom", bg: "#F4EEE6", color: "#6B5E54" },
  ];

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      <div style={{ padding: "0 16px" }}>
        <div style={{ color: "var(--text-3)", fontSize: 14 }}>
          {t("greetEvening")},
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 38px)",
            margin: "4px 0 0",
            fontWeight: 400,
          }}
        >
          {user?.name || "Amir bin Razak"}
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 17, margin: "10px 0 0" }}>
          {t("needToday")}
        </p>
      </div>

      <div style={{ padding: "20px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "6px 6px 6px 14px",
            height: 56,
            maxWidth: 720,
          }}
        >
          <Icon name="search" size={20} color="var(--text-3)" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && q.trim()) onSearch && onSearch(q);
            }}
            placeholder={t("searchPlaceholder")}
            style={{
              flex: 1,
              border: 0,
              outline: 0,
              background: "transparent",
              fontFamily: "var(--font-body)",
              fontSize: 16,
              color: "var(--text-1)",
              minWidth: 0,
            }}
          />

          {/* Mic — secondary, soft style */}
          <button
            onClick={() => setVoiceOpen(true)}
            title="Speak instead"
            style={{
              appearance: "none",
              border: "1px solid var(--border)",
              cursor: "pointer",
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "var(--surface)",
              color: "var(--text-2)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon name="mic" size={18} strokeWidth={1.9} />
          </button>

          {/* Search — primary, only enabled with input */}
          <button
            onClick={() =>
              onSearch &&
              onSearch(
                q.trim() || "halal dinner for 2, weekdays, near Damansara",
              )
            }
            disabled={!q.trim()}
            style={{
              appearance: "none",
              border: 0,
              cursor: q.trim() ? "pointer" : "not-allowed",
              padding: "0 18px",
              height: 42,
              borderRadius: 10,
              background: q.trim() ? "var(--primary)" : "var(--bg-2)",
              color: q.trim() ? "#fff" : "var(--text-3)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 14,
              display: "inline-flex",
              alignItems: "center",
              gap: 7,
              flexShrink: 0,
              transition: "background 0.15s ease",
            }}
          >
            <Icon
              name="search"
              size={16}
              color={q.trim() ? "#fff" : "var(--text-3)"}
              strokeWidth={2.2}
            />
            <span>Search</span>
          </button>
        </div>
      </div>

      <div style={{ padding: "24px 16px 0" }}>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: 12,
          }}
        >
          {cats.map((c) => (
            <button
              key={c.key}
              onClick={() => onSearch && onSearch(c.key)}
              style={{
                appearance: "none",
                cursor: "pointer",
                textAlign: "left",
                background: c.bg,
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: "20px 18px",
                minHeight: 110,
                display: "flex",
                flexDirection: "column",
                justifyContent: "space-between",
                fontFamily: "var(--font-body)",
              }}
            >
              <div
                style={{
                  width: 42,
                  height: 42,
                  borderRadius: 11,
                  background: "rgba(255,255,255,0.7)",
                  color: c.color,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <Icon name={c.icon} size={22} strokeWidth={2} />
              </div>
              <div
                style={{
                  fontWeight: 600,
                  fontSize: 16,
                  color: "var(--text-1)",
                  marginTop: 14,
                }}
              >
                {t(c.key)}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: 32 }}>
        <div style={{ padding: "0 16px" }}>
          <h2 className="section-h">{t("popularNearYou")}</h2>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 14,
            padding: "0 16px",
          }}
        >
          {providers.slice(0, 4).map((p) => (
            <button
              key={p.id}
              onClick={() => onProvider && onProvider(p.id)}
              style={{
                appearance: "none",
                cursor: "pointer",
                textAlign: "left",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 14,
                padding: 16,
                fontFamily: "var(--font-body)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                <Avatar
                  src={p.portrait}
                  initials={p.initials}
                  size={54}
                  tone={providerTone(p)}
                />
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "var(--text-1)",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      display: "flex",
                      alignItems: "center",
                      gap: 4,
                      marginTop: 2,
                    }}
                  >
                    <Icon name="map-pin" size={11} /> {p.distance} {t("away")}
                  </div>
                </div>
              </div>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 18,
                  color: "var(--text-1)",
                  marginTop: 14,
                  lineHeight: 1.25,
                  fontWeight: 400,
                }}
              >
                {p.service}
              </div>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  marginTop: 12,
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                    fontSize: 13,
                    color: "var(--text-2)",
                    fontWeight: 600,
                  }}
                >
                  <Icon name="star" size={13} color="var(--accent)" />{" "}
                  {p.rating}
                </span>
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--primary)",
                    fontWeight: 600,
                  }}
                >
                  {p.price}
                </span>
              </div>
            </button>
          ))}
        </div>
      </div>

      <div style={{ padding: "32px 16px 0" }}>
        <h2 className="section-h">{t("recentlyBooked")}</h2>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: 12,
          }}
        >
          {providers.filter(Boolean).slice(0, 2).map((p) => (
            <button
              key={p.id}
              onClick={() => onProvider && onProvider(p.id)}
              style={{
                appearance: "none",
                cursor: "pointer",
                width: "100%",
                textAlign: "left",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                padding: 14,
                display: "flex",
                alignItems: "center",
                gap: 12,
                fontFamily: "var(--font-body)",
              }}
            >
              <Avatar
                src={p.portrait}
                initials={p.initials}
                size={44}
                tone={providerTone(p)}
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--text-1)",
                  }}
                >
                  {p.name}
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-2)",
                    marginTop: 2,
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {p.service}
                </div>
              </div>
              <Icon name="chevron-right" size={18} color="var(--text-3)" />
            </button>
          ))}
        </div>
      </div>

      {voiceOpen && (
        <RequestorVoiceModal
          onClose={() => setVoiceOpen(false)}
          onSubmit={(text) => {
            setVoiceOpen(false);
            onSearch && onSearch(text);
          }}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 5 — Search Results
// ═══════════════════════════════════════════════════════════════
function RequestorSearch({ onProvider, onBack, query }) {
  const t = useT();
  const q = query || "halal dinner for 2, weekdays, near Damansara";
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    searchListings({ query: q })
      .then((listings) => {
        if (!active) return;
        setMatches(listings.map(adaptListingToProvider));
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [q]);

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 10,
        }}
      >
        <button
          onClick={onBack}
          style={{
            appearance: "none",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            padding: "6px 10px 6px 6px",
            marginLeft: -6,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "var(--text-1)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Icon name="chevron-left" size={22} />
          <span>Back</span>
        </button>
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            gap: 10,
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            padding: "0 14px",
            height: 52,
            maxWidth: 720,
          }}
        >
          <Icon name="search" size={18} color="var(--text-3)" />
          <div
            style={{
              fontSize: 14,
              color: "var(--text-1)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
              flex: 1,
            }}
          >
            "{q}"
          </div>
        </div>
      </div>

      <div style={{ padding: "24px 16px 0" }}>
        <div style={{ fontSize: 15, color: "var(--text-2)" }}>
          <span
            style={{ color: "var(--text-1)", fontWeight: 700, fontSize: 18 }}
          >
            {matches.length}
          </span>{" "}
          {t("matchesFound")}
        </div>
        <div
          style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}
        >
          {["Halal", "Weekdays", "Under RM50/meal", "< 2 km"].map((c) => (
            <Badge key={c} tone="teal">
              {c}
            </Badge>
          ))}
        </div>
      </div>

      <div
        style={{
          padding: "20px 16px 0",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))",
          gap: 16,
        }}
      >
        {matches.map((p, i) => (
          <Card
            key={p.id}
            style={{
              padding: 22,
              position: "relative",
              animation: `slideUp 0.4s ${i * 80}ms ease both`,
            }}
            onClick={() => onProvider && onProvider(p.id)}
          >
            <div
              style={{
                position: "absolute",
                top: 16,
                right: 16,
                background: "var(--secondary)",
                color: "#fff",
                fontSize: 12,
                fontWeight: 700,
                padding: "5px 9px",
                borderRadius: 999,
              }}
            >
              {p.matchScore}% {t("match")}
            </div>
            <div
              style={{
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
                paddingRight: 90,
              }}
            >
              <Avatar
                src={p.portrait}
                initials={p.initials}
                size={60}
                tone={
                  providerTone(p)
                }
              />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 16,
                    color: "var(--text-1)",
                  }}
                >
                  {p.name}{" "}
                  <span style={{ color: "var(--text-3)", fontWeight: 400 }}>
                    · {p.age}
                  </span>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 20,
                    color: "var(--text-1)",
                    marginTop: 4,
                    lineHeight: 1.2,
                    fontWeight: 400,
                  }}
                >
                  {p.service}
                </div>
                <p
                  style={{
                    margin: "6px 0 0",
                    fontSize: 14,
                    color: "var(--text-2)",
                    lineHeight: 1.5,
                  }}
                >
                  {p.description.length > 110
                    ? p.description.slice(0, 110) + "…"
                    : p.description}
                </p>
              </div>
            </div>
            <div
              style={{
                marginTop: 16,
                padding: "12px 14px",
                background: "var(--accent-subtle)",
                borderLeft: "3px solid var(--accent)",
                borderRadius: 8,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  color: "#8a6614",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  marginBottom: 4,
                }}
              >
                <Icon name="sparkles" size={12} /> Why this match
              </div>
              <div
                style={{
                  fontSize: 14,
                  color: "var(--text-1)",
                  fontStyle: "italic",
                  lineHeight: 1.5,
                }}
              >
                {p.matchReason}
              </div>
            </div>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginTop: 16,
                gap: 10,
                flexWrap: "wrap",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: 14,
                  fontSize: 13,
                  color: "var(--text-2)",
                  flexWrap: "wrap",
                }}
              >
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Icon name="star" size={12} color="var(--accent)" />{" "}
                  {p.rating}
                </span>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 3,
                  }}
                >
                  <Icon name="map-pin" size={12} /> {p.distance}
                </span>
                <span style={{ color: "var(--primary)", fontWeight: 700 }}>
                  {p.price}
                </span>
              </div>
              <Button size="sm">{t("bookNow")}</Button>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 6 — Provider Detail (split layout on desktop)
// ═══════════════════════════════════════════════════════════════
function ProviderDetail({ providerId, onBack }) {
  const t = useT();
  const [provider, setProvider] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const p =
    provider || {
      id: providerId || "",
      name: "Provider",
      initials: "GG",
      area: "",
      service: "",
      description: "",
      rating: 0,
      reviews: 0,
      price: "RM0",
      priceUnit: "",
      days: [],
      menu: null,
    };
  const allDays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const [faved, setFaved] = useState(false);
  const [favToast, setFavToast] = useState(false);

  useEffect(() => {
    if (!providerId) return;
    let active = true;

    setLoading(true);
    setError(null);
    getListingById(providerId)
      .then((detail) => {
        if (!active) return;
        setProvider(adaptListingToProvider(detail));
        setReviews(detail.reviews.map(adaptReview));
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [providerId]);

  const toggleFav = () => {
    const next = !faved;
    setFaved(next);
    if (next) {
      setFavToast(true);
      setTimeout(() => setFavToast(false), 2000);
    }
  };

  return (
    <div
      className="screen mobile-px"
      style={{ padding: "8px 0 40px", position: "relative" }}
    >
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 4,
        }}
      >
        <button
          onClick={onBack}
          style={{
            appearance: "none",
            border: 0,
            background: "transparent",
            cursor: "pointer",
            padding: "8px 12px 8px 8px",
            marginLeft: -8,
            display: "inline-flex",
            alignItems: "center",
            gap: 4,
            color: "var(--text-1)",
            fontFamily: "var(--font-body)",
            fontSize: 14,
            fontWeight: 600,
          }}
        >
          <Icon name="chevron-left" size={22} />
          <span>Back</span>
        </button>
        <div style={{ flex: 1 }} />
        <button
          onClick={toggleFav}
          aria-label={faved ? "Remove from favourites" : "Save to favourites"}
          style={{
            appearance: "none",
            cursor: "pointer",
            padding: "8px 12px",
            border: faved
              ? "1px solid var(--primary)"
              : "1px solid var(--border)",
            background: faved ? "var(--primary-subtle)" : "var(--surface)",
            borderRadius: 999,
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            fontFamily: "var(--font-body)",
            fontSize: 13,
            fontWeight: 600,
            color: faved ? "var(--primary)" : "var(--text-2)",
            transition: "all 0.18s ease",
          }}
        >
          <span
            style={{
              transition: "transform 0.25s cubic-bezier(.34,1.56,.64,1)",
              transform: faved ? "scale(1.15)" : "scale(1)",
              display: "inline-flex",
            }}
          >
            <GingerLogo size={18} fill={faved ? "#C2662D" : "#C2662D"} />
          </span>
          <span>{faved ? "Favourited" : "Favourite"}</span>
        </button>
      </div>

      {/* Favourited toast */}
      <div
        style={{
          position: "absolute",
          top: 56,
          right: 16,
          zIndex: 50,
          background: "var(--text-1)",
          color: "#fff",
          padding: "10px 14px",
          borderRadius: 10,
          fontSize: 13,
          fontWeight: 600,
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
          opacity: favToast ? 1 : 0,
          transform: favToast ? "translateY(0)" : "translateY(-6px)",
          pointerEvents: "none",
          transition: "opacity 0.22s ease, transform 0.22s ease",
        }}
      >
        <GingerLogo size={16} fill="#F4A155" />
        <span>Saved to favourites</span>
      </div>

      <div className="wide-grid" style={{ padding: "16px 16px 0" }}>
        {/* Left: hero + listing + menu */}
        <div>
          <Card style={{ padding: 28, textAlign: "center" }}>
            <Avatar
              src={p.portrait}
              initials={p.initials}
              size={120}
              tone={providerTone(p)}
              border
            />
            <h1
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                margin: "18px 0 4px",
                fontWeight: 400,
              }}
            >
              {p.name}
            </h1>
            <div
              style={{
                fontSize: 14,
                color: "var(--text-2)",
                display: "flex",
                justifyContent: "center",
                gap: 8,
                alignItems: "center",
              }}
            >
              <span>Age {p.age}</span>
              <span
                style={{
                  width: 3,
                  height: 3,
                  background: "var(--text-3)",
                  borderRadius: "50%",
                }}
              />
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Icon name="map-pin" size={12} /> {p.area}
              </span>
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                justifyContent: "center",
                flexWrap: "wrap",
                marginTop: 16,
              }}
            >
              <Badge tone="success">
                <Icon name="shield" size={12} /> {t("verified")}
              </Badge>
              <Badge tone="accent">
                <Icon name="star" size={12} /> {p.rating} stars
              </Badge>
              <Badge tone="teal">
                {p.reviews} {t("bookings")}
              </Badge>
            </div>
          </Card>

          <Card aiBorder style={{ padding: 22, marginTop: 16 }}>
            <AILabel />
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                margin: "10px 0 8px",
                fontWeight: 400,
              }}
            >
              {p.service}
            </h2>
            <p
              style={{
                margin: 0,
                color: "var(--text-2)",
                fontSize: 15,
                lineHeight: 1.6,
              }}
            >
              {p.description}
            </p>
          </Card>

          {p.menu && (
            <div style={{ marginTop: 24 }}>
              <h3 className="section-h">{t("menu")}</h3>
              <Card style={{ padding: "8px 20px" }}>
                {p.menu.map((m, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "14px 0",
                      borderBottom:
                        i < p.menu.length - 1
                          ? "1px solid var(--border)"
                          : "none",
                    }}
                  >
                    <span style={{ fontSize: 15, color: "var(--text-1)" }}>
                      {m.name}
                    </span>
                    <span
                      style={{
                        fontSize: 15,
                        color: "var(--text-1)",
                        fontWeight: 600,
                      }}
                    >
                      {m.price}
                    </span>
                  </div>
                ))}
              </Card>
            </div>
          )}
        </div>

        {/* Right: availability + reviews + book CTA */}
        <div>
          <h3 className="section-h">{t("v_availability")}</h3>
          <Card style={{ padding: 18 }}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(7, 1fr)",
                gap: 6,
              }}
            >
              {allDays.map((d) => {
                const avail = p.days && p.days.includes(d);
                return (
                  <div
                    key={d}
                    style={{
                      textAlign: "center",
                      padding: "12px 0",
                      borderRadius: 10,
                      background: avail
                        ? "var(--secondary-subtle)"
                        : "var(--bg-2)",
                      border: `1px solid ${avail ? "var(--secondary-light)" : "var(--border)"}`,
                      color: avail ? "var(--secondary)" : "var(--text-3)",
                      fontSize: 13,
                      fontWeight: 600,
                    }}
                  >
                    {d}
                  </div>
                );
              })}
            </div>
          </Card>

          <div style={{ marginTop: 24 }}>
            <h3 className="section-h">{t("reviews")}</h3>
            {reviews.map((r) => (
              <Card key={r.id} style={{ padding: 16, marginBottom: 10 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "baseline",
                  }}
                >
                  <div style={{ fontWeight: 600, fontSize: 14 }}>
                    {r.author}
                  </div>
                  <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                    {r.date}
                  </div>
                </div>
                <Stars value={r.rating} size={13} />
                <p
                  style={{
                    margin: "8px 0 0",
                    fontSize: 14,
                    color: "var(--text-2)",
                    lineHeight: 1.5,
                  }}
                >
                  "{r.text}"
                </p>
              </Card>
            ))}
          </div>

          <Card
            style={{ padding: 20, marginTop: 16, position: "sticky", top: 80 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                marginBottom: 14,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-3)",
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    fontWeight: 600,
                  }}
                >
                  From
                </div>
                <div
                  style={{
                    fontSize: 24,
                    fontFamily: "var(--font-display)",
                    color: "var(--text-1)",
                    lineHeight: 1,
                    marginTop: 4,
                  }}
                >
                  {p.price}
                </div>
              </div>
              <div style={{ fontSize: 13, color: "var(--text-2)" }}>
                {p.priceUnit}
              </div>
            </div>
            <Button full size="lg">
              {t("bookThis")}
            </Button>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// Voice/Type modal — opens when user taps the mic on the search bar.
// Mirrors the Elder voice flow: tap to talk, or switch to typing.
// ═══════════════════════════════════════════════════════════════
function RequestorVoiceModal({ onClose, onSubmit }) {
  const t = useT();
  const lang = useLang();
  const [mode, setMode] = useState("voice"); // "voice" | "type"
  const [state, setState] = useState("ready"); // ready | recording | done
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [seconds, setSeconds] = useState(0);
  const tickRef = useRef(null);
  const recogRef = useRef(null);

  const speechLangCode =
    { ms: "ms-MY", en: "en-MY", zh: "zh-CN", ta: "ta-IN" }[lang] || "en-US";
  const fallback = "Halal dinner for 2, weekdays, near Damansara";

  const startRecord = () => {
    setSeconds(0);
    setTranscript("");
    setState("recording");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = speechLangCode;
      r.onresult = (e) => {
        let txt = "";
        for (let i = 0; i < e.results.length; i++)
          txt += e.results[i][0].transcript;
        setTranscript(txt);
      };
      r.onerror = () => {};
      try {
        r.start();
        recogRef.current = r;
      } catch (_) {}
    }
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
  };
  const stopRecord = () => {
    clearInterval(tickRef.current);
    if (recogRef.current) {
      try {
        recogRef.current.stop();
      } catch (_) {}
      recogRef.current = null;
    }
    setState("done");
  };
  useEffect(
    () => () => {
      clearInterval(tickRef.current);
      if (recogRef.current) {
        try {
          recogRef.current.stop();
        } catch (_) {}
      }
    },
    [],
  );

  const finalText = (transcript || typed || fallback).trim();
  const canSubmit =
    !!finalText &&
    (mode === "type"
      ? typed.trim().length > 0
      : state === "done" || transcript.length > 0);
  const mm = String(Math.floor(seconds / 60)).padStart(2, "0");
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "rgba(44, 36, 32, 0.45)",
        backdropFilter: "blur(6px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: 16,
        animation: "fadeIn 220ms ease",
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: "var(--bg)",
          borderRadius: 20,
          width: "100%",
          maxWidth: 540,
          padding: 28,
          boxShadow: "0 24px 60px rgba(0,0,0,0.18)",
          animation: "slideUp 280ms ease",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 6,
          }}
        >
          <div>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              What do you need?
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                color: "var(--text-1)",
                marginTop: 2,
                lineHeight: 1.1,
                fontWeight: 400,
              }}
            >
              Tell us in your own words
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              appearance: "none",
              border: "1px solid var(--border)",
              background: "var(--surface)",
              cursor: "pointer",
              width: 36,
              height: 36,
              borderRadius: 10,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="x" size={18} />
          </button>
        </div>

        {/* Mode toggle */}
        <div
          style={{
            display: "flex",
            gap: 4,
            padding: 4,
            marginTop: 18,
            background: "var(--bg-2)",
            borderRadius: 12,
            border: "1px solid var(--border)",
          }}
        >
          {[
            { id: "voice", label: "Talk", icon: "mic" },
            { id: "type", label: "Type", icon: "edit" },
          ].map((m) => (
            <button
              key={m.id}
              onClick={() => {
                setMode(m.id);
                if (m.id === "type") {
                  clearInterval(tickRef.current);
                  if (recogRef.current) {
                    try {
                      recogRef.current.stop();
                    } catch (_) {}
                  }
                  setState("ready");
                }
              }}
              data-active={mode === m.id}
              style={{
                appearance: "none",
                border: 0,
                cursor: "pointer",
                flex: 1,
                padding: "10px 14px",
                borderRadius: 9,
                background: mode === m.id ? "var(--surface)" : "transparent",
                color: mode === m.id ? "var(--text-1)" : "var(--text-2)",
                fontFamily: "var(--font-body)",
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 7,
                boxShadow:
                  mode === m.id ? "0 1px 3px rgba(0,0,0,0.06)" : "none",
              }}
            >
              <Icon
                name={m.icon}
                size={15}
                strokeWidth={mode === m.id ? 2.2 : 1.75}
              />
              {m.label}
            </button>
          ))}
        </div>

        {/* Body — voice */}
        {mode === "voice" && (
          <div
            style={{
              padding: "30px 0 16px",
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
            }}
          >
            <div
              style={{
                position: "relative",
                width: 180,
                height: 180,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {state === "recording" && (
                <>
                  <div
                    className="ripple"
                    style={{ animationDelay: "0s", inset: 30 }}
                  />
                  <div
                    className="ripple"
                    style={{ animationDelay: "0.7s", inset: 30 }}
                  />
                </>
              )}
              <button
                onClick={() =>
                  state === "recording" ? stopRecord() : startRecord()
                }
                style={{
                  width: 96,
                  height: 96,
                  borderRadius: "50%",
                  border: 0,
                  cursor: "pointer",
                  background:
                    state === "recording" ? "var(--error)" : "var(--primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  boxShadow:
                    state === "recording"
                      ? "0 8px 24px rgba(196,74,74,0.4)"
                      : "0 8px 24px rgba(194,102,45,0.35)",
                  animation:
                    state === "ready"
                      ? "gentlePulse 2s ease-in-out infinite"
                      : "none",
                  transition: "background 0.3s ease",
                }}
              >
                <Icon
                  name={state === "recording" ? "stop" : "mic"}
                  size={state === "recording" ? 28 : 36}
                  color="#fff"
                  strokeWidth={2}
                />
              </button>
            </div>
            {state === "recording" && (
              <div
                style={{
                  display: "flex",
                  gap: 4,
                  alignItems: "flex-end",
                  height: 28,
                  marginTop: 16,
                }}
              >
                {[0, 1, 2, 3, 4, 5].map((i) => (
                  <span
                    key={i}
                    className="wbar"
                    style={{ animationDelay: `${i * 0.12}s` }}
                  />
                ))}
              </div>
            )}
            <div
              style={{
                marginTop: 14,
                fontSize: 15,
                color: "var(--text-2)",
                textAlign: "center",
              }}
            >
              {state === "ready" && "Tap and tell us what you're looking for"}
              {state === "recording" && (
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  Listening… {mm}:{ss} · tap to stop
                </span>
              )}
              {state === "done" && "Got it. Review and search below."}
            </div>
            {transcript && (
              <div
                style={{
                  marginTop: 18,
                  padding: "14px 16px",
                  borderRadius: 12,
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  fontSize: 15,
                  color: "var(--text-1)",
                  lineHeight: 1.5,
                  width: "100%",
                  maxWidth: 460,
                }}
              >
                "{transcript}"
              </div>
            )}
            {state === "ready" && !transcript && (
              <button
                onClick={() => onSubmit(fallback)}
                style={{
                  appearance: "none",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  marginTop: 18,
                  color: "var(--text-3)",
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  textDecoration: "underline",
                }}
              >
                Or try a sample: "{fallback}"
              </button>
            )}
          </div>
        )}

        {/* Body — type */}
        {mode === "type" && (
          <div style={{ padding: "20px 0 8px" }}>
            <textarea
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              autoFocus
              placeholder={`e.g. "${fallback}"`}
              style={{
                width: "100%",
                minHeight: 140,
                padding: "14px 16px",
                background: "var(--surface)",
                border: "1px solid var(--border)",
                borderRadius: 12,
                fontFamily: "var(--font-body)",
                fontSize: 15,
                color: "var(--text-1)",
                resize: "vertical",
                outline: "none",
                lineHeight: 1.5,
              }}
            />
            <div style={{ fontSize: 12, color: "var(--text-3)", marginTop: 8 }}>
              Be as specific as you like — meal type, dietary, area, timing.
            </div>
          </div>
        )}

        {/* Footer */}
        <div style={{ display: "flex", gap: 10, marginTop: 20 }}>
          <button
            onClick={onClose}
            style={{
              flex: 1,
              appearance: "none",
              cursor: "pointer",
              padding: "13px 18px",
              borderRadius: 11,
              background: "var(--surface)",
              color: "var(--text-1)",
              border: "1px solid var(--border)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
            }}
          >
            Cancel
          </button>
          <button
            disabled={!canSubmit}
            onClick={() => onSubmit(finalText)}
            style={{
              flex: 2,
              appearance: "none",
              border: 0,
              cursor: canSubmit ? "pointer" : "not-allowed",
              padding: "13px 18px",
              borderRadius: 11,
              background: canSubmit ? "var(--primary)" : "var(--bg-2)",
              color: canSubmit ? "#fff" : "var(--text-3)",
              fontFamily: "var(--font-body)",
              fontWeight: 600,
              fontSize: 15,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 8,
              opacity: canSubmit ? 1 : 0.7,
            }}
          >
            <Icon
              name="search"
              size={16}
              color={canSubmit ? "#fff" : "var(--text-3)"}
              strokeWidth={2.2}
            />
            Find matches
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// RequestorProfile — about MY needs as a service-buyer.
// Saved providers, preferences, area, payment, notifications.
// ═══════════════════════════════════════════════════════════════
function RequestorProfile({ user }) {
  const t = useT();
  const [diet, setDiet] = useState(["halal"]);
  const [notifs, setNotifs] = useState({
    matches: true,
    deals: false,
    reminders: true,
  });
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const toggleDiet = (k) =>
    setDiet((d) => (d.includes(k) ? d.filter((x) => x !== k) : [...d, k]));

  const dietOptions = [
    { id: "halal", label: "Halal" },
    { id: "veg", label: "Vegetarian" },
    { id: "no_seafood", label: "No seafood" },
    { id: "no_spicy", label: "Mild only" },
  ];

  const cuisineLikes = ["Malay", "Chinese", "Indian", "Western"];

  useEffect(() => {
    let active = true;

    setLoading(true);
    setError(null);
    searchListings({})
      .then((listings) => {
        if (!active) return;
        setSaved(listings.map(adaptListingToProvider).slice(0, 3));
      })
      .catch((err) => {
        if (!active) return;
        setError(err);
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      {/* Header — me as a buyer */}
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Avatar
          src={user?.avatarUrl}
          initials={user?.initials || "AR"}
          size={68}
          tone="warm"
          border
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            Your account
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 3vw, 30px)",
              color: "var(--text-1)",
              lineHeight: 1.1,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            {user?.name || "Amir bin Razak"}
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-2)",
              marginTop: 4,
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <Icon name="map-pin" size={13} />{" "}
            {user?.area || "Damansara Utama, KL"}
          </div>
        </div>
        <button
          style={{
            appearance: "none",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            cursor: "pointer",
            padding: "9px 14px",
            borderRadius: 10,
            fontFamily: "var(--font-body)",
            fontWeight: 600,
            fontSize: 13,
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
        >
          <Icon name="edit" size={14} strokeWidth={2} /> Edit
        </button>
      </div>

      {/* Quick stats — what they've used the app for */}
      <div className="three-col" style={{ padding: "20px 16px 0" }}>
        <Card style={{ padding: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-3)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Bookings
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              color: "var(--text-1)",
              marginTop: 6,
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            12
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
            3 this month
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-3)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Providers helped
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              color: "var(--text-1)",
              marginTop: 6,
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            5
          </div>
          <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
            RM 412 paid out
          </div>
        </Card>
        <Card style={{ padding: 18 }}>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-3)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              textTransform: "uppercase",
            }}
          >
            Reviews left
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 30,
              color: "var(--text-1)",
              marginTop: 6,
              fontWeight: 400,
              lineHeight: 1,
            }}
          >
            9
          </div>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-2)",
              marginTop: 6,
              display: "inline-flex",
              alignItems: "center",
              gap: 4,
            }}
          >
            <Icon name="star" size={11} color="var(--accent)" /> 4.8 avg given
          </div>
        </Card>
      </div>

      {/* Saved providers — most important for a buyer */}
      <div style={{ padding: "32px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 14,
          }}
        >
          <h2 className="section-h" style={{ margin: 0 }}>
            Saved providers
          </h2>
          <button
            style={{
              appearance: "none",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "var(--primary)",
              fontWeight: 600,
              fontSize: 13,
            }}
          >
            See all ({saved.length})
          </button>
        </div>
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
            gap: 12,
          }}
        >
          {saved.map((p) => (
            <Card key={p.id} style={{ padding: 14 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Avatar
                  src={p.portrait}
                  initials={p.initials}
                  size={48}
                  tone={p.tone}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 15,
                      color: "var(--text-1)",
                    }}
                  >
                    {p.name}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      marginTop: 2,
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {p.service}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      marginTop: 4,
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Icon name="star" size={11} color="var(--accent)" />{" "}
                    {p.rating} · {p.distance}
                  </div>
                </div>
                <Icon name="heart" size={18} color="var(--primary)" />
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Preferences — taste / dietary */}
      <div style={{ padding: "32px 16px 0" }}>
        <h2 className="section-h">Your preferences</h2>
        <Card style={{ padding: 22 }}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Dietary
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {dietOptions.map((d) => {
              const on = diet.includes(d.id);
              return (
                <button
                  key={d.id}
                  onClick={() => toggleDiet(d.id)}
                  style={{
                    appearance: "none",
                    cursor: "pointer",
                    padding: "9px 14px",
                    borderRadius: 999,
                    border: on
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                    background: on ? "var(--primary-subtle)" : "var(--surface)",
                    color: on ? "var(--primary)" : "var(--text-1)",
                    fontFamily: "var(--font-body)",
                    fontWeight: 600,
                    fontSize: 13,
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  {on && (
                    <Icon
                      name="check"
                      size={13}
                      color="var(--primary)"
                      strokeWidth={2.5}
                    />
                  )}
                  {d.label}
                </button>
              );
            })}
          </div>

          <div
            style={{ height: 1, background: "var(--border)", margin: "20px 0" }}
          />

          <div
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
              marginBottom: 10,
            }}
          >
            Cuisines you like
          </div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {cuisineLikes.map((c) => (
              <span
                key={c}
                style={{
                  padding: "7px 12px",
                  borderRadius: 999,
                  background: "var(--bg-2)",
                  color: "var(--text-2)",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {c}
              </span>
            ))}
            <button
              style={{
                appearance: "none",
                cursor: "pointer",
                padding: "7px 12px",
                borderRadius: 999,
                background: "transparent",
                border: "1px dashed var(--border)",
                color: "var(--text-3)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 500,
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <Icon name="plus" size={12} /> Add
            </button>
          </div>

          <div
            style={{ height: 1, background: "var(--border)", margin: "20px 0" }}
          />

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: 16,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-3)",
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                }}
              >
                Default delivery area
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "var(--text-1)",
                  marginTop: 4,
                  fontWeight: 500,
                }}
              >
                Damansara Utama · 5 km radius
              </div>
            </div>
            <button
              style={{
                appearance: "none",
                cursor: "pointer",
                padding: "8px 12px",
                borderRadius: 8,
                background: "var(--bg-2)",
                border: "1px solid var(--border)",
                color: "var(--text-1)",
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 600,
              }}
            >
              Change
            </button>
          </div>
        </Card>
      </div>

      {/* Notifications */}
      <div style={{ padding: "32px 16px 0" }}>
        <h2 className="section-h">Notifications</h2>
        <Card style={{ padding: 8 }}>
          {[
            {
              key: "matches",
              label: "New matches near you",
              sub: "When a provider you'd like joins",
            },
            {
              key: "deals",
              label: "Deals & promotions",
              sub: "Weekly roundup, never spammy",
            },
            {
              key: "reminders",
              label: "Booking reminders",
              sub: "1 hour before pickup or delivery",
            },
          ].map((n, i, arr) => (
            <div
              key={n.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 14px",
                gap: 16,
                borderBottom:
                  i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 15,
                    color: "var(--text-1)",
                    fontWeight: 500,
                  }}
                >
                  {n.label}
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}
                >
                  {n.sub}
                </div>
              </div>
              <button
                onClick={() => setNotifs((s) => ({ ...s, [n.key]: !s[n.key] }))}
                style={{
                  appearance: "none",
                  border: 0,
                  cursor: "pointer",
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  background: notifs[n.key]
                    ? "var(--primary)"
                    : "var(--border)",
                  position: "relative",
                  transition: "background 0.2s ease",
                  padding: 0,
                  flexShrink: 0,
                }}
              >
                <span
                  style={{
                    position: "absolute",
                    top: 3,
                    left: notifs[n.key] ? 21 : 3,
                    width: 20,
                    height: 20,
                    borderRadius: "50%",
                    background: "#fff",
                    transition: "left 0.2s ease",
                    boxShadow: "0 1px 3px rgba(0,0,0,0.15)",
                  }}
                />
              </button>
            </div>
          ))}
        </Card>
      </div>

      {/* Payment + Account */}
      <div className="two-col" style={{ padding: "32px 16px 0" }}>
        <Card style={{ padding: 22 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              margin: 0,
              fontWeight: 400,
            }}
          >
            Payment
          </h3>
          <div
            style={{
              marginTop: 14,
              padding: "14px 16px",
              background: "var(--bg-2)",
              borderRadius: 12,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <div
              style={{
                width: 36,
                height: 24,
                borderRadius: 4,
                background: "linear-gradient(135deg,#FFB347,#C2662D)",
              }}
            />
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Maybank •••• 4821
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                Default · expires 09/28
              </div>
            </div>
          </div>
          <button
            style={{
              appearance: "none",
              cursor: "pointer",
              marginTop: 12,
              padding: "10px 14px",
              width: "100%",
              borderRadius: 10,
              background: "var(--surface)",
              border: "1px dashed var(--border)",
              color: "var(--text-2)",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              gap: 6,
            }}
          >
            <Icon name="plus" size={14} /> Add payment method
          </button>
        </Card>

        <Card style={{ padding: 22 }}>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              margin: 0,
              fontWeight: 400,
            }}
          >
            Account
          </h3>
          <div style={{ marginTop: 8 }}>
            {[
              { icon: "globe", label: "Language", value: "English" },
              { icon: "shield", label: "Privacy & data", value: null },
              { icon: "info", label: "Help & support", value: null },
            ].map((row, i) => (
              <button
                key={i}
                style={{
                  appearance: "none",
                  border: 0,
                  cursor: "pointer",
                  width: "100%",
                  background: "transparent",
                  padding: "12px 0",
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  borderBottom: i < 2 ? "1px solid var(--border)" : "none",
                  fontFamily: "var(--font-body)",
                }}
              >
                <Icon
                  name={row.icon}
                  size={18}
                  color="var(--text-2)"
                  strokeWidth={1.8}
                />
                <span
                  style={{
                    flex: 1,
                    textAlign: "left",
                    fontSize: 15,
                    color: "var(--text-1)",
                    fontWeight: 500,
                  }}
                >
                  {row.label}
                </span>
                {row.value && (
                  <span style={{ fontSize: 13, color: "var(--text-3)" }}>
                    {row.value}
                  </span>
                )}
                <Icon name="chevron-right" size={16} color="var(--text-3)" />
              </button>
            ))}
          </div>
          <button
            style={{
              appearance: "none",
              border: 0,
              cursor: "pointer",
              marginTop: 16,
              padding: "10px 14px",
              width: "100%",
              borderRadius: 10,
              background: "transparent",
              color: "var(--error)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            Sign out
          </button>
        </Card>
      </div>
    </div>
  );
}


export { RequestorHome, RequestorSearch, ProviderDetail, RequestorProfile };
