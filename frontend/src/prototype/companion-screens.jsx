import { COMPANION_ALERTS, ELDER_BOOKINGS, HERO_ELDER, TIMELINE } from './mock-data';
import { Avatar, Card, EarningsHeroCard, Icon, useLang, useT } from './components';
// companion-screens.jsx — Family Companion Dashboard
import { useEffect, useState } from 'react';

function CompanionDashboard() {
  const t = useT();
  const lang = useLang();

  const alertStyles = {
    success: {
      bg: "#E8F2EC",
      border: "var(--success)",
      icon: "check",
      iconBg: "var(--success)",
    },
    info: {
      bg: "var(--secondary-subtle)",
      border: "var(--secondary)",
      icon: "info",
      iconBg: "var(--secondary)",
    },
    warning: {
      bg: "#FBEFD9",
      border: "var(--warning)",
      icon: "alert",
      iconBg: "var(--warning)",
    },
  };

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Avatar
          src={HERO_ELDER.portrait}
          initials={HERO_ELDER.initials}
          size={64}
          tone="warm"
          border
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {t("mumActivity")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(24px, 3vw, 32px)",
              color: "var(--text-1)",
              lineHeight: 1.1,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            {HERO_ELDER.name}
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
            {HERO_ELDER.area}
          </div>
        </div>
        <button
          style={{
            appearance: "none",
            border: "1px solid var(--border)",
            background: "var(--surface)",
            cursor: "pointer",
            padding: 10,
            borderRadius: 10,
          }}
        >
          <Icon name="bell" size={20} />
        </button>
      </div>

      {/* Earnings: full-width on mobile, 2/3 on desktop */}
      <div className="wide-grid" style={{ padding: "24px 16px 0" }}>
        <EarningsHeroCard
          monthlyAmount={680}
          deltaLabel={`+RM 180 ${t("moreThanLast")}`}
          lifetimeAmount={4820}
          lifetimeSince="since Aug 2025"
        />

        {/* Bookings inline on right column */}
        <div>
          <h2 className="section-h" style={{ marginBottom: 12 }}>
            {t("upcomingBookings")}
          </h2>
          {ELDER_BOOKINGS.slice(0, 2).map((b) => (
            <Card key={b.id} style={{ padding: 14, marginBottom: 10 }}>
              <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <Avatar
                  src={b.portrait}
                  initials={b.requestorInitials}
                  size={40}
                  tone="teal"
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontWeight: 600,
                      fontSize: 14,
                      color: "var(--text-1)",
                    }}
                  >
                    {b.requestor}
                  </div>
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--text-2)",
                      marginTop: 2,
                    }}
                  >
                    {b.item}
                  </div>
                  <div
                    style={{
                      fontSize: 12,
                      color: "var(--text-3)",
                      marginTop: 4,
                    }}
                  >
                    {b.date}
                  </div>
                </div>
                <div
                  style={{
                    fontWeight: 700,
                    fontSize: 15,
                    color: "var(--primary)",
                  }}
                >
                  {b.price}
                </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {/* Alerts: 3-col grid on desktop */}
      <div style={{ padding: "32px 16px 0" }}>
        <h2 className="section-h">{t("alerts")}</h2>
        <div className="three-col">
          {COMPANION_ALERTS.map((a) => {
            const s = alertStyles[a.type];
            const text = a[`text_${lang}`] || a.text_en;
            return (
              <Card
                key={a.id}
                style={{
                  padding: 18,
                  background: s.bg,
                  borderLeft: `3px solid ${s.border}`,
                  border: `1px solid ${s.border}33`,
                  height: "100%",
                }}
              >
                <div
                  style={{ display: "flex", gap: 12, alignItems: "flex-start" }}
                >
                  <div
                    style={{
                      width: 34,
                      height: 34,
                      borderRadius: "50%",
                      background: s.iconBg,
                      color: "#fff",
                      flexShrink: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Icon
                      name={s.icon}
                      size={17}
                      color="#fff"
                      strokeWidth={2.5}
                    />
                  </div>
                  <div
                    style={{
                      flex: 1,
                      fontSize: 15,
                      color: "var(--text-1)",
                      lineHeight: 1.5,
                    }}
                  >
                    {text}
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Timeline */}
      <div style={{ padding: "32px 16px 0" }}>
        <h2 className="section-h">{t("timeline")}</h2>
        <Card style={{ padding: 22 }}>
          <div style={{ position: "relative", paddingLeft: 24 }}>
            <div
              style={{
                position: "absolute",
                left: 8,
                top: 6,
                bottom: 6,
                width: 1.5,
                background: "var(--border)",
              }}
            />
            {TIMELINE.map((e, i) => (
              <div
                key={e.id}
                style={{
                  position: "relative",
                  paddingBottom: i < TIMELINE.length - 1 ? 18 : 0,
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -22,
                    top: 4,
                    width: 13,
                    height: 13,
                    borderRadius: "50%",
                    background: i === 0 ? "var(--primary)" : "var(--surface)",
                    border: `2px solid ${i === 0 ? "var(--primary)" : "var(--border)"}`,
                  }}
                />
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--text-3)",
                    fontWeight: 600,
                  }}
                >
                  {e.time}
                </div>
                <div
                  style={{
                    fontSize: 14,
                    color: "var(--text-1)",
                    marginTop: 3,
                    lineHeight: 1.4,
                  }}
                >
                  {e[`text_${lang}`] ?? e.text_en}
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------
// CompanionAlerts — "what mum is doing right now"
// Designed as a live activity feed, NOT a dashboard. The feeling
// should be: glancing in on her day from across the country.
// ---------------------------------------------------------------
function CompanionAlerts() {
  const lang = useLang();
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(id);
  }, []);

  // Live status — what mum is doing this minute
  const liveStatus = {
    activity: "Cooking",
    detail: "Rendang Daging — for Amir's order tomorrow",
    location: "At home · Kepong",
    startedMinsAgo: 42,
  };

  // Today's vital signs (from app activity, not health monitoring)
  const todayStats = [
    { label: "Active since", value: "7:12 AM", sub: "9h 18m today" },
    { label: "Orders prepped", value: "2", sub: "1 delivered, 1 in progress" },
    { label: "Last opened app", value: "8 min ago", sub: "Replied to Amir" },
  ];

  // Live feed — newest first, mix of tones
  const feed = [
    {
      id: "f1",
      tone: "live",
      minsAgo: 0,
      title: "Mum is cooking right now",
      body: "Started Rendang Daging at 3:38 PM. Usually takes her 2 hours.",
    },
    {
      id: "f2",
      tone: "good",
      minsAgo: 8,
      title: "Replied to Amir",
      body: '"Boleh, esok 6:30 petang OK. Saya bungkus rapi-rapi."',
    },
    {
      id: "f3",
      tone: "info",
      minsAgo: 47,
      title: "Walked to pasar Kepong",
      body: "Bought ingredients · 1.2 km round trip · Back home now",
    },
    {
      id: "f4",
      tone: "good",
      minsAgo: 95,
      title: "Confirmed booking with Amir",
      body: "Tomorrow, 6:30 PM · Rendang + Nasi Lemak · RM 36",
    },
    {
      id: "f5",
      tone: "warn",
      minsAgo: 180,
      title: "6th active day this week",
      body: "She might be tiring herself out. Maybe suggest a rest day Sunday?",
      action: "Send a gentle reminder",
    },
    {
      id: "f6",
      tone: "good",
      minsAgo: 360,
      title: "Earned RM 75 from Sat booking",
      body: "Nadia paid in full · Funds settle Monday morning",
    },
  ];

  const fmtAgo = (m) => {
    if (m < 1) return "Just now";
    if (m < 60) return `${m} min ago`;
    const h = Math.floor(m / 60),
      r = m % 60;
    if (h < 24) return r ? `${h}h ${r}m ago` : `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  };

  const toneMap = {
    live: { dot: "var(--primary)", tag: "LIVE", tagBg: "var(--primary)" },
    good: { dot: "var(--success)", tag: null },
    info: { dot: "var(--secondary)", tag: null },
    warn: { dot: "var(--warning)", tag: "Heads up" },
  };

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      {/* Header — softer, more personal than dashboard's bold header */}
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 14,
        }}
      >
        <Avatar
          src={HERO_ELDER.portrait}
          initials={HERO_ELDER.initials}
          size={56}
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
            Checking in on
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(22px, 2.6vw, 28px)",
              color: "var(--text-1)",
              lineHeight: 1.1,
              marginTop: 2,
              fontWeight: 400,
            }}
          >
            {HERO_ELDER.name}
          </div>
        </div>
        <div
          style={{ fontSize: 12, color: "var(--text-3)", textAlign: "right" }}
        >
          <div style={{ fontWeight: 600, color: "var(--text-2)" }}>
            {now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </div>
          <div>Kuala Lumpur</div>
        </div>
      </div>

      {/* Live status card — the centerpiece. Pulsing dot, "right now" framing */}
      <div style={{ padding: "20px 16px 0" }}>
        <div
          style={{
            position: "relative",
            padding: "26px 28px",
            borderRadius: 18,
            background: "linear-gradient(135deg, #FFF5EA 0%, #FBE4CC 100%)",
            border: "1px solid #F0D6B8",
            overflow: "hidden",
          }}
        >
          {/* Pulsing live indicator */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <span style={{ position: "relative", width: 10, height: 10 }}>
              <span
                style={{
                  position: "absolute",
                  inset: 0,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  animation: "gentlePulse 2s ease-in-out infinite",
                }}
              />
              <span
                style={{
                  position: "absolute",
                  inset: -4,
                  borderRadius: "50%",
                  background: "var(--primary)",
                  opacity: 0.25,
                  animation: "ripple 2s ease-out infinite",
                }}
              />
            </span>
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: "var(--primary)",
                letterSpacing: "0.12em",
                textTransform: "uppercase",
              }}
            >
              Right now
            </span>
            <span
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                marginLeft: "auto",
              }}
            >
              started {liveStatus.startedMinsAgo} min ago
            </span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-end",
              justifyContent: "space-between",
              gap: 20,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: "clamp(28px, 3.4vw, 40px)",
                  lineHeight: 1.1,
                  color: "var(--text-1)",
                  fontWeight: 400,
                }}
              >
                {liveStatus.activity}
              </div>
              <div
                style={{
                  fontSize: 16,
                  color: "var(--text-1)",
                  marginTop: 8,
                  lineHeight: 1.4,
                }}
              >
                {liveStatus.detail}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-2)",
                  marginTop: 10,
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <Icon name="map-pin" size={14} strokeWidth={2} />
                <span>{liveStatus.location}</span>
              </div>
            </div>

            <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
              <button
                style={{
                  appearance: "none",
                  border: 0,
                  cursor: "pointer",
                  padding: "11px 18px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  background: "var(--primary)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Icon name="phone" size={15} color="#fff" strokeWidth={2.2} />
                Call mum
              </button>
              <button
                style={{
                  appearance: "none",
                  cursor: "pointer",
                  padding: "11px 16px",
                  borderRadius: 10,
                  fontWeight: 600,
                  fontSize: 14,
                  background: "var(--surface)",
                  color: "var(--text-1)",
                  border: "1px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  gap: 7,
                }}
              >
                <Icon name="message" size={15} strokeWidth={2} />
                Message
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Today vitals — three small stats, not earnings */}
      <div className="three-col" style={{ padding: "20px 16px 0" }}>
        {todayStats.map((s, i) => (
          <Card key={i} style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {s.label}
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                color: "var(--text-1)",
                marginTop: 6,
                fontWeight: 400,
                lineHeight: 1.1,
              }}
            >
              {s.value}
            </div>
            <div style={{ fontSize: 12, color: "var(--text-2)", marginTop: 6 }}>
              {s.sub}
            </div>
          </Card>
        ))}
      </div>

      {/* Live feed — the body of this screen */}
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
            Live feed
          </h2>
          <div
            style={{
              fontSize: 12,
              color: "var(--text-3)",
              display: "flex",
              alignItems: "center",
              gap: 6,
            }}
          >
            <span
              style={{
                width: 6,
                height: 6,
                borderRadius: "50%",
                background: "var(--success)",
              }}
            />
            Updates as she does things
          </div>
        </div>

        <div style={{ position: "relative" }}>
          {/* Connecting line */}
          <div
            style={{
              position: "absolute",
              left: 11,
              top: 12,
              bottom: 12,
              width: 1.5,
              background: "var(--border)",
            }}
          />

          {feed.map((f, i) => {
            const tone = toneMap[f.tone];
            const isLive = f.tone === "live";
            return (
              <div
                key={f.id}
                style={{
                  position: "relative",
                  paddingLeft: 38,
                  paddingBottom: i < feed.length - 1 ? 18 : 0,
                }}
              >
                {/* Dot */}
                <div
                  style={{
                    position: "absolute",
                    left: 4,
                    top: 16,
                    width: 16,
                    height: 16,
                    borderRadius: "50%",
                    background: isLive ? tone.dot : "var(--surface)",
                    border: `2px solid ${tone.dot}`,
                    boxShadow: isLive ? `0 0 0 5px ${tone.dot}25` : "none",
                    zIndex: 1,
                  }}
                />
                {isLive && (
                  <div
                    style={{
                      position: "absolute",
                      left: -2,
                      top: 10,
                      width: 28,
                      height: 28,
                      borderRadius: "50%",
                      background: tone.dot,
                      opacity: 0.18,
                      animation: "ripple 2s ease-out infinite",
                    }}
                  />
                )}

                <Card
                  style={{
                    padding: "14px 16px",
                    border: isLive
                      ? `1px solid ${tone.dot}55`
                      : "1px solid var(--border)",
                    background: isLive ? "#FFF8F0" : "var(--surface)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      marginBottom: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        fontWeight: 600,
                      }}
                    >
                      {fmtAgo(f.minsAgo)}
                    </span>
                    {tone.tag && (
                      <span
                        style={{
                          fontSize: 10,
                          fontWeight: 700,
                          letterSpacing: "0.08em",
                          padding: "2px 7px",
                          borderRadius: 4,
                          background:
                            f.tone === "live" ? tone.tagBg : `${tone.dot}22`,
                          color: f.tone === "live" ? "#fff" : tone.dot,
                          textTransform: "uppercase",
                        }}
                      >
                        {tone.tag}
                      </span>
                    )}
                  </div>
                  <div
                    style={{
                      fontSize: 15,
                      color: "var(--text-1)",
                      fontWeight: 600,
                      lineHeight: 1.35,
                    }}
                  >
                    {f.title}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--text-2)",
                      marginTop: 4,
                      lineHeight: 1.5,
                    }}
                  >
                    {f.body}
                  </div>
                  {f.action && (
                    <button
                      style={{
                        appearance: "none",
                        border: 0,
                        cursor: "pointer",
                        marginTop: 10,
                        padding: "7px 12px",
                        borderRadius: 8,
                        background: `${tone.dot}15`,
                        color: tone.dot,
                        fontWeight: 600,
                        fontSize: 13,
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 6,
                      }}
                    >
                      {f.action}
                      <Icon
                        name="chevron-right"
                        size={14}
                        color={tone.dot}
                        strokeWidth={2.2}
                      />
                    </button>
                  )}
                </Card>
              </div>
            );
          })}
        </div>

        {/* End-of-feed quiet note */}
        <div
          style={{
            marginTop: 18,
            padding: "14px 18px",
            textAlign: "center",
            fontSize: 13,
            color: "var(--text-3)",
            fontStyle: "italic",
          }}
        >
          That's everything from today. We'll let you know when she's up to
          something new.
        </div>
      </div>
    </div>
  );
}

// ───────────────────────────────────────────────────────────────
// CompanionProfile — about ME as a carer / safety net for mum.
// Care circle, alert preferences, emergency contacts, permissions.
// ───────────────────────────────────────────────────────────────
function CompanionProfile() {
  const [alertPrefs, setAlertPrefs] = useState({
    inactivity: true,
    overwork: true,
    earnings: true,
    newBookings: true,
    reviews: false,
    appUpdates: false,
  });
  const [digest, setDigest] = useState("weekly"); // "off" | "daily" | "weekly"

  const careCircle = [
    {
      name: "You (Faiz)",
      role: "Primary contact",
      initials: "FR",
      tone: "warm",
      you: true,
    },
    { name: "Aida (sister)", role: "Co-watcher", initials: "AR", tone: "teal" },
    {
      name: "Pak Long Hassan",
      role: "Local emergency",
      initials: "PH",
      tone: "sand",
    },
  ];

  const toggle = (k) => setAlertPrefs((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      {/* Header — me, the carer */}
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          alignItems: "center",
          gap: 16,
        }}
      >
        <Avatar initials="FR" size={68} tone="warm" border />
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
            Carer account
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
            Faiz Rahman
          </div>
          <div style={{ fontSize: 13, color: "var(--text-2)", marginTop: 4 }}>
            Watching over Makcik Siti · Connected since Aug 2025
          </div>
        </div>
      </div>

      {/* Who I'm watching — strong, primary card. The main thing this account is for. */}
      <div style={{ padding: "20px 16px 0" }}>
        <Card
          style={{
            padding: 22,
            background: "linear-gradient(135deg, #FFF5EA 0%, #FBE4CC 100%)",
            border: "1px solid #F0D6B8",
          }}
        >
          <div
            style={{
              fontSize: 12,
              color: "var(--primary)",
              fontWeight: 700,
              letterSpacing: "0.1em",
              textTransform: "uppercase",
            }}
          >
            You're watching over
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 16,
              marginTop: 14,
            }}
          >
            <Avatar
              src={HERO_ELDER.portrait}
              initials={HERO_ELDER.initials}
              size={64}
              tone="warm"
            />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontFamily: "var(--font-display)",
                  fontSize: 26,
                  color: "var(--text-1)",
                  fontWeight: 400,
                  lineHeight: 1.1,
                }}
              >
                {HERO_ELDER.name}
              </div>
              <div
                style={{ fontSize: 14, color: "var(--text-2)", marginTop: 4 }}
              >
                Mum · age {HERO_ELDER.age} · {HERO_ELDER.area}
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--success)",
                  marginTop: 6,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: "var(--success)",
                  }}
                />
                Active 8 minutes ago
              </div>
            </div>
            <button
              style={{
                appearance: "none",
                border: 0,
                cursor: "pointer",
                padding: "10px 14px",
                borderRadius: 10,
                background: "var(--primary)",
                color: "#fff",
                fontFamily: "var(--font-body)",
                fontWeight: 600,
                fontSize: 13,
                display: "inline-flex",
                alignItems: "center",
                gap: 6,
                flexShrink: 0,
              }}
            >
              <Icon name="phone" size={14} color="#fff" strokeWidth={2.2} />{" "}
              Call
            </button>
          </div>
        </Card>
      </div>

      {/* Care circle — others looking after mum too */}
      <div style={{ padding: "32px 16px 0" }}>
        <div
          style={{
            display: "flex",
            alignItems: "baseline",
            justifyContent: "space-between",
            marginBottom: 8,
          }}
        >
          <h2 className="section-h" style={{ margin: 0 }}>
            Care circle
          </h2>
          <span style={{ fontSize: 12, color: "var(--text-3)" }}>
            People who can also see mum's activity
          </span>
        </div>
        <Card style={{ padding: 8 }}>
          {careCircle.map((m, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                padding: "12px 14px",
                borderBottom:
                  i < careCircle.length - 1
                    ? "1px solid var(--border)"
                    : "none",
              }}
            >
              <Avatar initials={m.initials} size={44} tone={m.tone} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 15,
                    color: "var(--text-1)",
                  }}
                >
                  {m.name}
                  {m.you && (
                    <span
                      style={{
                        marginLeft: 8,
                        fontSize: 11,
                        fontWeight: 700,
                        color: "var(--primary)",
                        padding: "2px 7px",
                        borderRadius: 4,
                        background: "var(--primary-subtle)",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      You
                    </span>
                  )}
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}
                >
                  {m.role}
                </div>
              </div>
              {!m.you && (
                <button
                  style={{
                    appearance: "none",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    cursor: "pointer",
                    padding: 8,
                    borderRadius: 8,
                  }}
                >
                  <Icon name="message" size={15} strokeWidth={1.8} />
                </button>
              )}
            </div>
          ))}
          <button
            style={{
              appearance: "none",
              border: 0,
              cursor: "pointer",
              width: "100%",
              background: "transparent",
              padding: "12px 14px",
              display: "flex",
              alignItems: "center",
              gap: 10,
              color: "var(--primary)",
              fontFamily: "var(--font-body)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <span
              style={{
                width: 32,
                height: 32,
                borderRadius: "50%",
                background: "var(--primary-subtle)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Icon
                name="plus"
                size={16}
                color="var(--primary)"
                strokeWidth={2.2}
              />
            </span>
            Invite someone to the care circle
          </button>
        </Card>
      </div>

      {/* Alert preferences — what to ping me about. CORE of carer profile */}
      <div style={{ padding: "32px 16px 0" }}>
        <h2 className="section-h">When to alert you</h2>
        <Card style={{ padding: 8 }}>
          {[
            {
              key: "inactivity",
              label: "If mum hasn't opened the app",
              sub: "Ping after 24 hours of silence",
              important: true,
            },
            {
              key: "overwork",
              label: "If she's been active too many days in a row",
              sub: "5+ active days = gentle rest reminder",
              important: true,
            },
            {
              key: "earnings",
              label: "Big earning milestones",
              sub: "First RM100, RM500, monthly records",
            },
            {
              key: "newBookings",
              label: "When she gets new bookings",
              sub: "Real-time so you can celebrate",
            },
            {
              key: "reviews",
              label: "When she receives a review",
              sub: "Customer feedback, good or bad",
            },
            {
              key: "appUpdates",
              label: "Product updates from Ginger Gig",
              sub: "New features, occasional tips",
            },
          ].map((n, i, arr) => (
            <div
              key={n.key}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px",
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
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 8,
                  }}
                >
                  {n.label}
                  {n.important && (
                    <span
                      style={{
                        fontSize: 10,
                        fontWeight: 700,
                        color: "var(--warning)",
                        padding: "2px 6px",
                        borderRadius: 4,
                        background: "#FBEFD9",
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                      }}
                    >
                      Safety
                    </span>
                  )}
                </div>
                <div
                  style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}
                >
                  {n.sub}
                </div>
              </div>
              <button
                onClick={() => toggle(n.key)}
                style={{
                  appearance: "none",
                  border: 0,
                  cursor: "pointer",
                  width: 44,
                  height: 26,
                  borderRadius: 999,
                  background: alertPrefs[n.key]
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
                    left: alertPrefs[n.key] ? 21 : 3,
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

      {/* Digest schedule */}
      <div style={{ padding: "32px 16px 0" }}>
        <h2 className="section-h">Activity digest</h2>
        <Card style={{ padding: 22 }}>
          <div
            style={{
              fontSize: 14,
              color: "var(--text-2)",
              lineHeight: 1.5,
              marginBottom: 14,
            }}
          >
            A summary of how mum's been doing — earnings, bookings, mood. Sent
            to your email.
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {[
              { id: "off", label: "Off" },
              { id: "daily", label: "Daily" },
              { id: "weekly", label: "Weekly (Sun)" },
            ].map((d) => (
              <button
                key={d.id}
                onClick={() => setDigest(d.id)}
                style={{
                  appearance: "none",
                  cursor: "pointer",
                  padding: "10px 18px",
                  borderRadius: 10,
                  border:
                    digest === d.id
                      ? "1px solid var(--primary)"
                      : "1px solid var(--border)",
                  background:
                    digest === d.id
                      ? "var(--primary-subtle)"
                      : "var(--surface)",
                  color: digest === d.id ? "var(--primary)" : "var(--text-1)",
                  fontFamily: "var(--font-body)",
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {d.label}
              </button>
            ))}
          </div>
        </Card>
      </div>

      {/* Emergency + Permissions */}
      <div className="two-col" style={{ padding: "32px 16px 0" }}>
        <Card style={{ padding: 22, borderLeft: "3px solid var(--error)" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              color: "var(--error)",
            }}
          >
            <Icon
              name="alert"
              size={16}
              color="var(--error)"
              strokeWidth={2.2}
            />
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
              }}
            >
              In case of emergency
            </span>
          </div>
          <h3
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 20,
              margin: "10px 0 0",
              fontWeight: 400,
            }}
          >
            Emergency contact for mum
          </h3>
          <div
            style={{
              marginTop: 14,
              display: "flex",
              alignItems: "center",
              gap: 12,
            }}
          >
            <Avatar initials="PH" size={42} tone="sand" />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 14, fontWeight: 600 }}>
                Pak Long Hassan
              </div>
              <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                Lives 800m from mum · +60 12-345-6789
              </div>
            </div>
          </div>
          <button
            style={{
              appearance: "none",
              cursor: "pointer",
              marginTop: 14,
              padding: "9px 12px",
              width: "100%",
              borderRadius: 8,
              background: "var(--surface)",
              border: "1px solid var(--border)",
              color: "var(--text-1)",
              fontFamily: "var(--font-body)",
              fontSize: 13,
              fontWeight: 600,
            }}
          >
            Update emergency contact
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
            What you can see
          </h3>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-3)",
              marginTop: 4,
              marginBottom: 14,
            }}
          >
            Mum has shared this with you. She can change it anytime.
          </div>
          {[
            { label: "Activity & bookings", on: true },
            { label: "Earnings totals", on: true },
            { label: "Customer messages", on: false },
            { label: "Location (live)", on: false },
          ].map((row, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "10px 0",
                borderBottom: i < 3 ? "1px solid var(--border)" : "none",
              }}
            >
              <span style={{ fontSize: 14, color: "var(--text-1)" }}>
                {row.label}
              </span>
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: row.on ? "var(--success)" : "var(--text-3)",
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <span
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: "50%",
                    background: row.on ? "var(--success)" : "var(--text-3)",
                  }}
                />
                {row.on ? "Shared" : "Private"}
              </span>
            </div>
          ))}
        </Card>
      </div>

      {/* Sign out */}
      <div style={{ padding: "24px 16px 0" }}>
        <button
          style={{
            appearance: "none",
            border: 0,
            cursor: "pointer",
            padding: "12px 14px",
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
      </div>
    </div>
  );
}


export { CompanionDashboard, CompanionAlerts, CompanionProfile };
