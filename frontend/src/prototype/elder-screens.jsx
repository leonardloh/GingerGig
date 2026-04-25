import { LANGUAGES } from './i18n';
import { AILabel, Avatar, Badge, Button, Card, Icon, Stars, useLang, useT } from './components';
import { getElderBookings, getElderEarnings, getElderListings, respondToBooking, updateListing } from '../services/api/endpoints/elder';
// elder-screens.jsx — Language pick, Voice flow, Elder dashboard
import { useEffect, useMemo, useRef, useState } from 'react';

const formatCurrencyValue = (value) => {
  const numeric = Number(value ?? 0);
  return Number.isInteger(numeric) ? String(numeric) : numeric.toFixed(2);
};

const formatMoney = (amount, currency = "MYR") => {
  const value = formatCurrencyValue(amount);
  return currency === "MYR" ? `RM${value}` : `${currency} ${value}`;
};

const formatPriceRange = (listing) => {
  const min = formatMoney(listing.price, listing.currency);
  if (!listing.priceMax) return min;
  return `${min}-${formatCurrencyValue(listing.priceMax)}`;
};

const formatBookingDate = (iso) =>
  new Date(iso).toLocaleString([], {
    weekday: "short",
    hour: "numeric",
    minute: "2-digit",
  });

const adaptBooking = (booking) => ({
  id: booking.id,
  requestor: booking.requestorName,
  requestorInitials: booking.requestorInitials,
  portrait: booking.requestorAvatarUrl,
  item: booking.listingTitle || booking.itemDescription,
  qty: booking.qty,
  price: formatMoney(booking.amount, booking.currency),
  date: formatBookingDate(booking.scheduledAt),
  scheduledAt: booking.scheduledAt,
  status: booking.status,
  rating: booking.rating,
});

const adaptListing = (listing) => ({
  id: listing.id,
  title: listing.title,
  price: formatPriceRange(listing),
  priceUnit: listing.priceUnit,
  rating: listing.rating,
  bookings: listing.reviewCount,
  active: listing.isActive,
});

// ═══════════════════════════════════════════════════════════════
// SCREEN 1 — Language Selection
// ═══════════════════════════════════════════════════════════════
function ElderLanguage({ lang, setLang, onContinue }) {
  const t = useT();
  const [picked, setPicked] = useState(lang);
  return (
    <div
      className="screen narrow mobile-px"
      style={{ padding: "32px 24px 40px" }}
    >
      <div style={{ textAlign: "center", marginTop: 24 }}>
        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: 8,
            padding: "6px 14px",
            borderRadius: 999,
            background: "var(--primary-subtle)",
            color: "var(--primary)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
          }}
        >
          <span
            style={{
              width: 6,
              height: 6,
              background: "var(--primary)",
              borderRadius: "50%",
            }}
          ></span>
          GINGER GIG
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(36px, 6vw, 56px)",
            lineHeight: 1.05,
            marginTop: 28,
            marginBottom: 8,
            color: "var(--text-1)",
            fontWeight: 400,
          }}
        >
          Selamat Datang
        </h1>
        <p style={{ color: "var(--text-2)", fontSize: 17, margin: 0 }}>
          Choose your language · Pilih bahasa anda
        </p>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 12,
          marginTop: 36,
        }}
      >
        {LANGUAGES.map((l) => {
          const isPicked = picked === l.code;
          return (
            <button
              key={l.code}
              onClick={() => setPicked(l.code)}
              style={{
                appearance: "none",
                cursor: "pointer",
                background: isPicked
                  ? "var(--primary-subtle)"
                  : "var(--surface)",
                border: `2px solid ${isPicked ? "var(--primary)" : "var(--border)"}`,
                borderRadius: 14,
                padding: "20px 22px",
                minHeight: 72,
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                fontFamily: "var(--font-body)",
                transition: "all 0.18s ease",
                textAlign: "left",
              }}
            >
              <div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    lineHeight: 1.1,
                    color: "var(--text-1)",
                    fontWeight: 400,
                  }}
                >
                  {l.native}
                </div>
                {l.native !== l.name && (
                  <div
                    style={{
                      fontSize: 14,
                      color: "var(--text-3)",
                      marginTop: 2,
                    }}
                  >
                    {l.name}
                  </div>
                )}
              </div>
              <div
                style={{
                  width: 28,
                  height: 28,
                  borderRadius: "50%",
                  background: isPicked ? "var(--primary)" : "transparent",
                  border: isPicked ? "0" : "1.5px solid var(--border)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {isPicked && (
                  <Icon name="check" size={16} color="#fff" strokeWidth={2.5} />
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div style={{ marginTop: 32 }}>
        <Button
          full
          size="lg"
          onClick={() => {
            setLang(picked);
            onContinue();
          }}
        >
          {t("continue")}
        </Button>
        <div style={{ textAlign: "center", marginTop: 18 }}>
          <button
            style={{
              appearance: "none",
              border: 0,
              background: "transparent",
              cursor: "pointer",
              color: "var(--text-2)",
              fontFamily: "var(--font-body)",
              fontSize: 15,
              textDecoration: "underline",
              textUnderlineOffset: 3,
            }}
          >
            {t("setupWithFamily")}
          </button>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// SCREEN 2 — Voice-to-Profile (HERO)
// ═══════════════════════════════════════════════════════════════
function ElderVoice({ onConfirm }) {
  const t = useT();
  const lang = useLang();
  const [state, setState] = useState("ready");
  const [seconds, setSeconds] = useState(0);
  const [transcript, setTranscript] = useState("");
  const [typed, setTyped] = useState("");
  const [steps, setSteps] = useState([0, 0, 0]);
  const [source, setSource] = useState("voice"); // "voice" | "typed" — affects step 1 label
  const recogRef = useRef(null);
  const tickRef = useRef(null);

  const speechLangCode =
    { ms: "ms-MY", en: "en-MY", zh: "zh-CN", ta: "ta-IN" }[lang] || "en-US";

  const startRecord = () => {
    setSeconds(0);
    setTranscript("");
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SR) {
      const r = new SR();
      r.continuous = true;
      r.interimResults = true;
      r.lang = speechLangCode;
      r.onresult = (e) => {
        let full = "";
        for (let i = 0; i < e.results.length; i++)
          full += e.results[i][0].transcript + " ";
        setTranscript(full.trim());
      };
      r.onerror = () => {};
      try {
        r.start();
        recogRef.current = r;
      } catch (_) {}
    }
    tickRef.current = setInterval(() => setSeconds((s) => s + 1), 1000);
    setState("recording");
  };
  const runProcessing = (source = "voice") => {
    setState("processing");
    setSource(source);
    setSteps([1, 0, 0]);
    setTimeout(() => setSteps([2, 1, 0]), 900);
    setTimeout(() => setSteps([2, 2, 1]), 1900);
    setTimeout(() => {
      setSteps([2, 2, 2]);
      setState("generated");
    }, 3000);
  };
  const stopRecord = () => {
    clearInterval(tickRef.current);
    if (recogRef.current) {
      try {
        recogRef.current.stop();
      } catch (_) {}
      recogRef.current = null;
    }
    runProcessing("voice");
  };
  const submitTyped = () => {
    if (!typed.trim()) return;
    runProcessing("typed");
  };

  useEffect(
    () => () => {
      clearInterval(tickRef.current);
      if (recogRef.current)
        try {
          recogRef.current.stop();
        } catch (_) {}
    },
    [],
  );

  const mm = String(Math.floor(seconds / 60));
  const ss = String(seconds % 60).padStart(2, "0");

  return (
    <div
      className="screen narrow mobile-px"
      style={{
        padding: "16px 24px 40px",
        background:
          state === "recording" ? "var(--primary-subtle)" : "transparent",
        transition: "background 0.4s ease",
        borderRadius: 20,
      }}
    >
      <div style={{ paddingTop: 12 }}>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 38px)",
            lineHeight: 1.15,
            margin: 0,
            color: "var(--text-1)",
            fontWeight: 400,
          }}
        >
          {t("v_title")}
        </h1>
        <p
          style={{
            color: "var(--text-2)",
            fontSize: 17,
            marginTop: 8,
            marginBottom: 0,
            lineHeight: 1.45,
          }}
        >
          {t("v_subtitle")}
        </p>
      </div>

      {(state === "ready" || state === "recording") && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "48px 0 32px",
            minHeight: 460,
          }}
        >
          <div
            style={{
              position: "relative",
              width: 240,
              height: 240,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {state === "recording" && (
              <>
                <div className="ripple" style={{ animationDelay: "0s" }} />
                <div className="ripple" style={{ animationDelay: "0.7s" }} />
                <div className="ripple" style={{ animationDelay: "1.4s" }} />
              </>
            )}
            <button
              onClick={state === "ready" ? startRecord : stopRecord}
              style={{
                width: 120,
                height: 120,
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
                    ? "0 8px 30px rgba(196, 74, 74, 0.4)"
                    : "0 8px 30px rgba(194, 102, 45, 0.35)",
                animation:
                  state === "ready"
                    ? "gentlePulse 2s ease-in-out infinite"
                    : "none",
                transition: "background 0.3s ease",
              }}
            >
              <Icon
                name={state === "recording" ? "stop" : "mic"}
                size={state === "recording" ? 38 : 44}
                color="#fff"
                strokeWidth={2}
              />
            </button>
          </div>
          {state === "recording" && (
            <div
              style={{
                display: "flex",
                gap: 5,
                alignItems: "flex-end",
                height: 36,
                marginTop: 24,
              }}
            >
              {[0, 1, 2, 3, 4, 5, 6].map((i) => (
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
              marginTop: 20,
              fontSize: 18,
              fontWeight: 500,
              color: "var(--text-1)",
              textAlign: "center",
            }}
          >
            {state === "recording" ? (
              <>
                <span style={{ fontVariantNumeric: "tabular-nums" }}>
                  {mm}:{ss}
                </span>
                <span style={{ marginLeft: 12, color: "var(--text-2)" }}>
                  · {t("v_stop")}
                </span>
              </>
            ) : (
              t("v_tap")
            )}
          </div>
          {transcript && state === "recording" && (
            <div
              style={{
                marginTop: 24,
                padding: "14px 18px",
                borderRadius: 12,
                background: "rgba(255,255,255,0.7)",
                border: "1px solid var(--border)",
                maxWidth: 420,
                fontSize: 16,
                lineHeight: 1.5,
                color: "var(--text-1)",
                fontStyle: "italic",
                textAlign: "center",
              }}
            >
              "{transcript}"
            </div>
          )}
          {state === "ready" && (
            <>
              <Card
                style={{
                  padding: "14px 18px",
                  marginTop: 32,
                  maxWidth: 420,
                  background: "var(--bg-2)",
                }}
              >
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--text-3)",
                    fontWeight: 600,
                    letterSpacing: "0.04em",
                    textTransform: "uppercase",
                    marginBottom: 4,
                  }}
                >
                  Example
                </div>
                <div
                  style={{
                    fontSize: 15,
                    color: "var(--text-2)",
                    lineHeight: 1.5,
                  }}
                >
                  {t("v_example")}
                </div>
              </Card>
              <button
                onClick={() => {
                  setState("typing");
                }}
                style={{
                  appearance: "none",
                  border: 0,
                  background: "transparent",
                  cursor: "pointer",
                  marginTop: 18,
                  color: "var(--secondary)",
                  fontFamily: "var(--font-body)",
                  fontSize: 16,
                  fontWeight: 600,
                  textDecoration: "underline",
                  textUnderlineOffset: 4,
                }}
              >
                {t("v_orType")}
              </button>
            </>
          )}
        </div>
      )}

      {state === "typing" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "stretch",
            padding: "32px 0 24px",
            maxWidth: 560,
            margin: "0 auto",
            width: "100%",
          }}
        >
          <textarea
            value={typed}
            onChange={(e) => setTyped(e.target.value)}
            placeholder={t("v_typePlaceholder")}
            autoFocus
            rows={6}
            style={{
              width: "100%",
              padding: "18px 20px",
              borderRadius: 14,
              border: "2px solid var(--border)",
              background: "var(--surface)",
              fontFamily: "var(--font-body)",
              fontSize: 18,
              lineHeight: 1.55,
              color: "var(--text-1)",
              resize: "vertical",
              outline: "none",
              minHeight: 160,
              transition: "border-color 0.2s ease",
            }}
            onFocus={(e) =>
              (e.currentTarget.style.borderColor = "var(--primary)")
            }
            onBlur={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          />
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 10,
              marginTop: 20,
            }}
          >
            <Button
              full
              size="lg"
              icon="sparkles"
              disabled={!typed.trim()}
              onClick={submitTyped}
            >
              {t("v_generate")}
            </Button>
            <Button
              full
              size="lg"
              variant="secondary"
              icon="mic"
              onClick={() => {
                setState("ready");
              }}
            >
              {t("v_useVoice")}
            </Button>
          </div>
        </div>
      )}

      {state === "processing" && (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: "60px 0",
            minHeight: 460,
          }}
        >
          <div
            className="dots"
            style={{ display: "flex", gap: 10, marginBottom: 28 }}
          >
            <span />
            <span />
            <span />
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 26,
              color: "var(--text-1)",
              marginBottom: 28,
              textAlign: "center",
              fontWeight: 400,
            }}
          >
            {t("v_processing")}
          </div>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: 14,
              alignItems: "flex-start",
              maxWidth: 360,
              margin: "0 auto",
            }}
          >
            {[
              source === "typed" ? t("v_step1_typed") : t("v_step1"),
              t("v_step2"),
              t("v_step3"),
            ].map((label, i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 12,
                  fontSize: 16,
                  color: steps[i] === 0 ? "var(--text-3)" : "var(--text-1)",
                  opacity: steps[i] === 0 ? 0.4 : 1,
                  transition: "all 0.3s ease",
                }}
              >
                <div
                  style={{
                    width: 24,
                    height: 24,
                    borderRadius: "50%",
                    background:
                      steps[i] === 2
                        ? "var(--success)"
                        : steps[i] === 1
                          ? "var(--primary)"
                          : "transparent",
                    border: steps[i] === 0 ? "1.5px solid var(--border)" : "0",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  {steps[i] === 2 && (
                    <Icon name="check" size={14} color="#fff" strokeWidth={3} />
                  )}
                  {steps[i] === 1 && <span className="spin-tiny" />}
                </div>
                <span>{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {state === "generated" && (
        <GeneratedListing
          t={t}
          onConfirm={() => onConfirm && onConfirm()}
          onTryAgain={() => {
            setState("ready");
          }}
        />
      )}
    </div>
  );
}

// ─── Editable AI-generated listing card ───
function GeneratedListing({ t, onConfirm, onTryAgain }) {
  const initial = {
    title: "Masakan Melayu Tradisional",
    description:
      "Home-cooked rendang, nasi lemak, and kampung favourites — recipes I have been making for over 30 years. Cooked fresh every morning, packed with love.",
    price: "RM15-20",
    priceSub: "per meal",
    capacity: "10 pax",
    capacitySub: "per day",
    availability: "Mon-Fri",
    availabilitySub: "6 AM - 7 PM",
    area: "Kepong",
    areaSub: "3 km radius",
  };
  const [editing, setEditing] = useState(false);
  const [data, setData] = useState(initial);
  const [snapshot, setSnapshot] = useState(initial); // saved baseline to revert to
  const [confirmingDiscard, setConfirmingDiscard] = useState(false);
  const update = (k) => (v) => setData((d) => ({ ...d, [k]: v }));

  const isDirty = JSON.stringify(data) !== JSON.stringify(snapshot);

  const startEdit = () => {
    setSnapshot(data);
    setEditing(true);
  };
  const saveEdit = () => {
    setSnapshot(data);
    setEditing(false);
  };
  const requestCancel = () => {
    if (isDirty) setConfirmingDiscard(true);
    else setEditing(false);
  };
  const confirmDiscard = () => {
    setData(snapshot);
    setEditing(false);
    setConfirmingDiscard(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", paddingTop: 24 }}>
      <Card
        aiBorder
        style={{
          padding: 28,
          animation: "slideUp 0.5s ease",
          position: "relative",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: 12,
            marginBottom: 6,
            flexWrap: "wrap",
          }}
        >
          <AILabel />
          {!editing ? (
            <button
              onClick={startEdit}
              style={{
                appearance: "none",
                border: "1px solid var(--border)",
                cursor: "pointer",
                background: "var(--surface)",
                color: "var(--text-2)",
                padding: "6px 12px",
                borderRadius: 8,
                fontFamily: "var(--font-body)",
                fontSize: 13,
                fontWeight: 600,
                display: "inline-flex",
                alignItems: "center",
                gap: 5,
              }}
            >
              <Icon name="edit" size={13} strokeWidth={2} />
              <span>{t("v_editListing")}</span>
            </button>
          ) : (
            <div style={{ display: "inline-flex", gap: 8 }}>
              <button
                onClick={requestCancel}
                style={{
                  appearance: "none",
                  border: "1px solid var(--border)",
                  cursor: "pointer",
                  background: "var(--surface)",
                  color: "var(--text-2)",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icon name="close" size={13} strokeWidth={2.4} />
                <span>{t("v_cancelEdit")}</span>
              </button>
              <button
                onClick={saveEdit}
                style={{
                  appearance: "none",
                  border: "1px solid var(--primary)",
                  cursor: "pointer",
                  background: "var(--primary)",
                  color: "#fff",
                  padding: "6px 12px",
                  borderRadius: 8,
                  fontFamily: "var(--font-body)",
                  fontSize: 13,
                  fontWeight: 600,
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 5,
                }}
              >
                <Icon name="check" size={13} strokeWidth={2.5} />
                <span>{t("v_doneEditing")}</span>
              </button>
            </div>
          )}
        </div>

        {/* Title */}
        <EditableField
          editing={editing}
          value={data.title}
          onChange={update("title")}
          label={t("v_serviceTitle")}
          inputStyle={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            lineHeight: 1.2,
            fontWeight: 400,
          }}
          renderStatic={(v) => (
            <h2
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 30,
                lineHeight: 1.2,
                margin: "10px 0 10px",
                color: "var(--text-1)",
                fontWeight: 400,
              }}
            >
              {v}
            </h2>
          )}
        />

        <div style={{ marginBottom: 16 }}>
          <Badge tone="primary">
            <Icon name="chef" size={12} /> Home Cooking
          </Badge>
          <Badge tone="success" style={{ marginLeft: 6 }}>
            <Icon name="shield" size={12} /> Halal
          </Badge>
        </div>

        {/* Description */}
        <EditableField
          editing={editing}
          value={data.description}
          onChange={update("description")}
          label={t("v_description")}
          multiline
          renderStatic={(v) => (
            <p
              style={{
                color: "var(--text-2)",
                fontSize: 16,
                lineHeight: 1.6,
                margin: "0 0 22px",
              }}
            >
              {v}
            </p>
          )}
        />

        {/* Detail grid — editable cells */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(140px, 1fr))",
            gap: 18,
            paddingTop: 18,
            borderTop: "1px solid var(--border)",
          }}
        >
          <EditableSelectCell
            editing={editing}
            icon="wallet"
            label={t("v_suggestedPrice")}
            value={data.price}
            sub={data.priceSub}
            onChange={update("price")}
            onSubChange={update("priceSub")}
            options={["RM10-15", "RM15-20", "RM20-30", "RM30-50", "RM50+"]}
            subOptions={["per meal", "per hour", "per session", "per day"]}
          />
          <EditableSelectCell
            editing={editing}
            icon="users"
            label={t("v_capacity")}
            value={data.capacity}
            sub={data.capacitySub}
            onChange={update("capacity")}
            onSubChange={update("capacitySub")}
            options={[
              "5 pax",
              "10 pax",
              "15 pax",
              "20 pax",
              "30 pax",
              "50 pax",
            ]}
            subOptions={["per day", "per session", "per hour", "per week"]}
          />
          <EditableSelectCell
            editing={editing}
            icon="calendar"
            label={t("v_availability")}
            value={data.availability}
            sub={data.availabilitySub}
            onChange={update("availability")}
            onSubChange={update("availabilitySub")}
            options={[
              "Mon-Fri",
              "Mon-Sat",
              "Mon-Sun",
              "Weekends only",
              "Sat-Sun",
            ]}
            subOptions={[
              "6 AM - 7 PM",
              "8 AM - 5 PM",
              "9 AM - 6 PM",
              "10 AM - 8 PM",
              "Flexible",
            ]}
          />
          <EditableAreaCell
            editing={editing}
            icon="map-pin"
            label="Service area"
            value={data.area}
            sub={data.areaSub}
            onChange={update("area")}
            onSubChange={update("areaSub")}
          />
        </div>
      </Card>

      <div
        style={{ marginTop: 24, display: "flex", gap: 10, flexWrap: "wrap" }}
      >
        <Button
          size="lg"
          icon="check"
          onClick={onConfirm}
          disabled={editing}
          style={{ flex: "1 1 200px" }}
        >
          {t("v_looksGood")}
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={onTryAgain}
          disabled={editing}
          style={{ flex: "1 1 200px" }}
        >
          {t("v_tryAgain")}
        </Button>
      </div>

      {/* Discard confirmation modal */}
      {confirmingDiscard && (
        <div
          onClick={() => setConfirmingDiscard(false)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(28, 22, 18, 0.5)",
            backdropFilter: "blur(4px)",
            zIndex: 100,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 20,
            animation: "fadeIn 180ms ease",
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: 16,
              padding: 28,
              maxWidth: 420,
              width: "100%",
              boxShadow: "0 20px 60px rgba(28, 22, 18, 0.3)",
              animation: "slideUp 220ms ease",
            }}
          >
            <h3
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 24,
                margin: "0 0 8px",
                fontWeight: 400,
                color: "var(--text-1)",
              }}
            >
              {t("v_discardChanges")}
            </h3>
            <p
              style={{
                margin: "0 0 22px",
                color: "var(--text-2)",
                fontSize: 15,
                lineHeight: 1.5,
              }}
            >
              Your edits will be lost.
            </p>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              <Button
                size="md"
                variant="secondary"
                onClick={() => setConfirmingDiscard(false)}
                style={{ flex: "1 1 140px" }}
              >
                {t("v_keepEditing")}
              </Button>
              <Button
                size="md"
                onClick={confirmDiscard}
                style={{ flex: "1 1 140px", background: "var(--error)" }}
              >
                {t("v_discardYes")}
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const editInputBase = {
  width: "100%",
  border: "2px solid var(--primary)",
  outline: "none",
  background: "var(--surface)",
  padding: "8px 12px",
  borderRadius: 8,
  color: "var(--text-1)",
  fontFamily: "var(--font-body)",
  boxShadow: "0 0 0 4px rgba(194, 102, 45, 0.08)",
};

function EditableField({
  editing,
  value,
  onChange,
  label,
  multiline,
  inputStyle = {},
  renderStatic,
}) {
  if (!editing) return renderStatic(value);
  return (
    <div style={{ marginBottom: multiline ? 22 : 12 }}>
      <div
        style={{
          fontSize: 11,
          color: "var(--text-3)",
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          marginBottom: 6,
        }}
      >
        {label}
      </div>
      {multiline ? (
        <textarea
          value={value}
          onChange={(e) => onChange(e.target.value)}
          rows={4}
          style={{
            ...editInputBase,
            fontSize: 16,
            lineHeight: 1.6,
            resize: "vertical",
          }}
        />
      ) : (
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{ ...editInputBase, ...inputStyle }}
        />
      )}
    </div>
  );
}

function EditableDetailCell({
  editing,
  icon,
  label,
  value,
  sub,
  onChange,
  onSubChange,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-3)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        <Icon name={icon} size={13} />
        <span>{label}</span>
      </div>
      {editing ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 4,
          }}
        >
          <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            style={{
              ...editInputBase,
              fontSize: 16,
              fontWeight: 600,
              padding: "6px 10px",
            }}
          />
          <input
            value={sub}
            onChange={(e) => onSubChange(e.target.value)}
            style={{
              ...editInputBase,
              fontSize: 13,
              color: "var(--text-3)",
              padding: "5px 10px",
            }}
          />
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--text-1)",
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              {sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Detail cell with two stacked dropdowns (price / capacity / availability)
function EditableSelectCell({
  editing,
  icon,
  label,
  value,
  sub,
  onChange,
  onSubChange,
  options,
  subOptions,
}) {
  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-3)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        <Icon name={icon} size={13} />
        <span>{label}</span>
      </div>
      {editing ? (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: 6,
            marginTop: 4,
          }}
        >
          <SilverSelect
            value={value}
            options={options}
            onChange={onChange}
            inputStyle={{ fontSize: 16, fontWeight: 600 }}
          />
          <SilverSelect
            value={sub}
            options={subOptions}
            onChange={onSubChange}
            inputStyle={{
              fontSize: 13,
              color: "var(--text-3)",
              padding: "5px 32px 5px 10px",
            }}
          />
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--text-1)",
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              {sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

// ─── Native-styled select wrapped to match editInputBase
function SilverSelect({ value, options, onChange, inputStyle = {} }) {
  // If current value isn't in the option list, keep it visible as the first option
  const opts = options.includes(value) ? options : [value, ...options];
  return (
    <div style={{ position: "relative" }}>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        style={{
          ...editInputBase,
          appearance: "none",
          WebkitAppearance: "none",
          MozAppearance: "none",
          padding: "6px 32px 6px 10px",
          cursor: "pointer",
          ...inputStyle,
        }}
      >
        {opts.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
      <span
        style={{
          position: "absolute",
          right: 10,
          top: "50%",
          transform: "translateY(-50%)",
          pointerEvents: "none",
          display: "flex",
          color: "var(--primary)",
        }}
      >
        <Icon name="chevron-down" size={16} />
      </span>
    </div>
  );
}

// ─── Mock Google-Maps-style address autocomplete + radius
const KL_AREAS = [
  { name: "Kepong", region: "Kuala Lumpur" },
  { name: "Kepong Baru", region: "Kuala Lumpur" },
  { name: "Cheras", region: "Kuala Lumpur" },
  { name: "Setapak", region: "Kuala Lumpur" },
  { name: "Bangsar", region: "Kuala Lumpur" },
  { name: "Mont Kiara", region: "Kuala Lumpur" },
  { name: "Petaling Jaya", region: "Selangor" },
  { name: "Subang Jaya", region: "Selangor" },
  { name: "Shah Alam", region: "Selangor" },
  { name: "Ampang", region: "Selangor" },
  { name: "Damansara", region: "Selangor" },
  { name: "Puchong", region: "Selangor" },
  { name: "Klang", region: "Selangor" },
  { name: "Kajang", region: "Selangor" },
  { name: "Sentul", region: "Kuala Lumpur" },
  { name: "Wangsa Maju", region: "Kuala Lumpur" },
  { name: "Taman Tun Dr Ismail", region: "Kuala Lumpur" },
  { name: "Sri Hartamas", region: "Kuala Lumpur" },
];

function EditableAreaCell({
  editing,
  icon,
  label,
  value,
  sub,
  onChange,
  onSubChange,
}) {
  const [query, setQuery] = useState(value);
  const [open, setOpen] = useState(false);
  const wrapRef = useRef(null);

  // keep local query in sync if value changes externally (e.g. editing toggled off then on)
  useEffect(() => {
    setQuery(value);
  }, [value, editing]);

  // Close suggestions on outside click
  useEffect(() => {
    if (!open) return;
    const onDoc = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target))
        setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const matches = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return KL_AREAS.slice(0, 6);
    return KL_AREAS.filter(
      (a) =>
        a.name.toLowerCase().includes(q) || a.region.toLowerCase().includes(q),
    ).slice(0, 6);
  }, [query]);

  const radii = [
    "1 km radius",
    "3 km radius",
    "5 km radius",
    "10 km radius",
    "15 km radius",
  ];

  const pick = (name) => {
    setQuery(name);
    onChange(name);
    setOpen(false);
  };

  // Spans full row inside the grid, since it includes a map preview
  return (
    <div style={{ gridColumn: "1 / -1" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          color: "var(--text-3)",
          fontSize: 12,
          fontWeight: 600,
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        <Icon name={icon} size={13} />
        <span>{label}</span>
      </div>

      {editing ? (
        <div
          ref={wrapRef}
          style={{
            position: "relative",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            marginTop: 4,
          }}
        >
          {/* Search input */}
          <div style={{ position: "relative" }}>
            <span
              style={{
                position: "absolute",
                left: 10,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--primary)",
                display: "flex",
              }}
            >
              <Icon name="search" size={16} />
            </span>
            <input
              value={query}
              onChange={(e) => {
                setQuery(e.target.value);
                setOpen(true);
                onChange(e.target.value);
              }}
              onFocus={() => setOpen(true)}
              placeholder="Search address or area"
              style={{
                ...editInputBase,
                fontSize: 16,
                fontWeight: 600,
                padding: "8px 10px 8px 34px",
              }}
            />
            {open && matches.length > 0 && (
              <div
                style={{
                  position: "absolute",
                  top: "calc(100% + 4px)",
                  left: 0,
                  right: 0,
                  zIndex: 20,
                  background: "var(--surface)",
                  borderRadius: 10,
                  border: "1px solid var(--border)",
                  boxShadow: "0 12px 32px rgba(28, 22, 18, 0.18)",
                  overflow: "hidden",
                }}
              >
                {matches.map((m) => (
                  <button
                    key={m.name}
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => pick(m.name)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 10,
                      width: "100%",
                      padding: "10px 12px",
                      border: "none",
                      background: "transparent",
                      textAlign: "left",
                      cursor: "pointer",
                      borderBottom: "1px solid var(--border-subtle, #f1ebe5)",
                    }}
                    onMouseEnter={(e) =>
                      (e.currentTarget.style.background =
                        "var(--primary-subtle)")
                    }
                    onMouseLeave={(e) =>
                      (e.currentTarget.style.background = "transparent")
                    }
                  >
                    <span style={{ display: "flex", color: "var(--primary)" }}>
                      <Icon name="map-pin" size={16} />
                    </span>
                    <div style={{ minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 14,
                          fontWeight: 600,
                          color: "var(--text-1)",
                        }}
                      >
                        {m.name}
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-3)" }}>
                        {m.region}, Malaysia
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Radius dropdown */}
          <SilverSelect
            value={sub}
            options={radii}
            onChange={onSubChange}
            inputStyle={{
              fontSize: 13,
              color: "var(--text-3)",
              padding: "5px 32px 5px 10px",
            }}
          />

          {/* Mini map preview */}
          <MockMapPreview area={query} />
        </div>
      ) : (
        <>
          <div
            style={{
              fontSize: 17,
              fontWeight: 600,
              color: "var(--text-1)",
              lineHeight: 1.2,
            }}
          >
            {value}
          </div>
          {sub && (
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
              {sub}
            </div>
          )}
        </>
      )}
    </div>
  );
}

function MockMapPreview({ area }) {
  return (
    <div
      style={{
        position: "relative",
        height: 120,
        borderRadius: 12,
        overflow: "hidden",
        background: "linear-gradient(135deg, #e8efe6 0%, #dee9d9 100%)",
        border: "1px solid var(--border)",
        marginTop: 2,
      }}
    >
      {/* Faux roads */}
      <svg
        width="100%"
        height="100%"
        viewBox="0 0 400 120"
        preserveAspectRatio="none"
        style={{ position: "absolute", inset: 0 }}
      >
        <g stroke="#fff" strokeWidth="6" fill="none" opacity="0.85">
          <path d="M -10 80 Q 120 60 220 90 T 420 70" />
          <path d="M -10 30 Q 90 45 200 25 T 420 40" />
        </g>
        <g stroke="#fff" strokeWidth="3" fill="none" opacity="0.65">
          <path d="M 60 -10 L 90 130" />
          <path d="M 280 -10 L 250 130" />
          <path d="M 160 -10 L 175 130" />
        </g>
        {/* Faux blocks */}
        <g fill="#d4dfd0" opacity="0.6">
          <rect x="20" y="55" width="38" height="20" rx="2" />
          <rect x="105" y="95" width="55" height="18" rx="2" />
          <rect x="200" y="50" width="40" height="28" rx="2" />
          <rect x="300" y="80" width="48" height="22" rx="2" />
          <rect x="340" y="20" width="44" height="20" rx="2" />
        </g>
      </svg>
      {/* Radius circle + pin */}
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 90,
          height: 90,
          borderRadius: "50%",
          background: "rgba(194, 102, 45, 0.18)",
          border: "2px solid rgba(194, 102, 45, 0.5)",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -100%)",
          color: "var(--primary)",
          filter: "drop-shadow(0 2px 4px rgba(0,0,0,0.25))",
        }}
      >
        <Icon name="map-pin" size={28} />
      </div>
      {/* Area label chip */}
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 8,
          padding: "4px 10px",
          borderRadius: 999,
          background: "var(--surface)",
          color: "var(--text-1)",
          fontSize: 12,
          fontWeight: 600,
          boxShadow: "0 2px 8px rgba(28, 22, 18, 0.12)",
          maxWidth: "calc(100% - 16px)",
          overflow: "hidden",
          textOverflow: "ellipsis",
          whiteSpace: "nowrap",
        }}
      >
        {area || "—"}
      </div>
    </div>
  );
}

const DetailCell = ({ icon, label, value, sub }) => (
  <div>
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 6,
        color: "var(--text-3)",
        fontSize: 12,
        fontWeight: 600,
        letterSpacing: "0.04em",
        textTransform: "uppercase",
        marginBottom: 4,
      }}
    >
      <Icon name={icon} size={13} />
      <span>{label}</span>
    </div>
    <div
      style={{
        fontSize: 17,
        fontWeight: 600,
        color: "var(--text-1)",
        lineHeight: 1.2,
      }}
    >
      {value}
    </div>
    {sub && (
      <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}>
        {sub}
      </div>
    )}
  </div>
);

// ═══════════════════════════════════════════════════════════════
// SCREEN 3 — Elder Dashboard (responsive multi-col on desktop)
// ═══════════════════════════════════════════════════════════════
function ElderDashboard({ user }) {
  const t = useT();
  const [bookings, setBookings] = useState([]);
  const [earnings, setEarnings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [count, setCount] = useState(0);
  const target = earnings?.monthTotal ?? 99; // preserve the existing animation fallback until data loads
  useEffect(() => {
    let r = 0;
    const id = setInterval(() => {
      r += target / 26;
      if (r >= target) {
        setCount(target);
        clearInterval(id);
      } else setCount(Math.floor(r));
    }, 22);
    return () => clearInterval(id);
  }, [target]);

  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    Promise.all([getElderBookings(user.id), getElderEarnings(user.id)])
      .then(([bookingRows, earningsSummary]) => {
        if (cancelled) return;
        setBookings(bookingRows.map(adaptBooking));
        setEarnings(earningsSummary);
      })
      .catch((err) => {
        if (cancelled) return;
        setBookings([]);
        setEarnings(null);
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.id]);

  const pending = bookings.filter((b) => b.status === "pending");
  const confirmed = bookings.filter((b) => b.status === "confirmed");
  const completed = bookings.filter((b) => b.status === "completed");
  const todayCompletedCount = completed.filter((c) => {
    if (!c.scheduledAt) return /Today/i.test(c.date);
    const scheduled = new Date(c.scheduledAt);
    const now = new Date();
    return scheduled.toDateString() === now.toDateString();
  }).length;

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          padding: "0 16px",
          gap: 12,
        }}
      >
        <div style={{ minWidth: 0, flex: 1 }}>
          <div
            style={{ color: "var(--text-3)", fontSize: 14, fontWeight: 500 }}
          >
            {t("hello")},
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 38px)",
              margin: "2px 0 0",
              fontWeight: 400,
              color: "var(--text-1)",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {user.name}
          </h1>
        </div>
        <Avatar
          src={user.avatarUrl}
          initials={user.initials}
          size={56}
          tone="warm"
          border
        />
      </div>

      {/* Top row: today's earnings + AI nudge */}
      <div
        className="wide-grid"
        style={{ padding: "0 16px", marginBottom: 32 }}
      >
        <Card
          style={{
            padding: 28,
            background:
              "linear-gradient(135deg, var(--accent-subtle) 0%, #FFF3D6 100%)",
            border: "1px solid #F0E0B8",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              marginBottom: 20,
            }}
          >
            <div
              style={{
                color: "#8a6614",
                fontSize: 13,
                fontWeight: 600,
                letterSpacing: "0.06em",
                textTransform: "uppercase",
              }}
            >
              {t("todayEarnings")}
            </div>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "rgba(212, 169, 76, 0.18)",
                color: "var(--accent)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name="wallet" size={20} />
            </div>
          </div>

          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(52px, 7vw, 76px)",
              lineHeight: 0.95,
              color: "var(--text-1)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 400,
            }}
          >
            RM <span>{count}</span>
          </div>
          <div style={{ fontSize: 14, color: "#8a6614", marginTop: 8 }}>
            {todayCompletedCount}{" "}
            {t("totalToday")}
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              paddingTop: 18,
              marginTop: 20,
              borderTop: "1px solid rgba(138, 102, 20, 0.18)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 12,
                  color: "#8a6614",
                  letterSpacing: "0.04em",
                  textTransform: "uppercase",
                  fontWeight: 600,
                }}
              >
                {t("lastBooking")}
              </div>
              <div
                style={{
                  fontSize: 15,
                  color: "var(--text-1)",
                  fontWeight: 600,
                  marginTop: 4,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {completed[0]?.item || "—"}
              </div>
              <div
                style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}
              >
                {completed[0]?.requestor} · {completed[0]?.date}
              </div>
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 26,
                color: "var(--primary)",
                fontWeight: 400,
                flexShrink: 0,
              }}
            >
              {completed[0]?.price}
            </div>
          </div>
        </Card>

        <Card aiBorder style={{ padding: 22 }}>
          <AILabel />
          <p
            style={{
              margin: "12px 0 16px",
              color: "var(--text-1)",
              fontSize: 16,
              lineHeight: 1.55,
            }}
          >
            {t("nudge_save")}
          </p>
          <Button size="sm" variant="teal" icon="info">
            {t("learnAboutISaraan")}
          </Button>
        </Card>
      </div>

      {/* Bookings — segregated into 3 buckets */}
      {pending.length > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 28 }}>
          <SectionHeader
            label={t("needsAction")}
            count={pending.length}
            tone="warning"
            icon="alert"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {pending.map((b) => (
              <BookingRow key={b.id} booking={b} t={t} />
            ))}
          </div>
        </div>
      )}

      {confirmed.length > 0 && (
        <div style={{ padding: "0 16px", marginBottom: 28 }}>
          <SectionHeader
            label={t("confirmedHeader")}
            count={confirmed.length}
            tone="info"
            icon="calendar"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 12,
            }}
          >
            {confirmed.map((b) => (
              <BookingRow key={b.id} booking={b} t={t} />
            ))}
          </div>
        </div>
      )}

      {completed.length > 0 && (
        <div style={{ padding: "0 16px" }}>
          <SectionHeader
            label={t("completedHeader")}
            count={completed.length}
            tone="success"
            icon="check"
          />
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 12,
            }}
          >
            {completed.map((b) => (
              <CompletedRow key={b.id} booking={b} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Section header with count badge ───
function SectionHeader({ label, count, tone = "info", icon }) {
  const colors = {
    warning: { bg: "#FBEFD9", fg: "#8a6614" },
    info: { bg: "var(--secondary-subtle)", fg: "var(--secondary)" },
    success: { bg: "#E8F2EC", fg: "var(--success)" },
  }[tone];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        marginBottom: 14,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          borderRadius: 8,
          background: colors.bg,
          color: colors.fg,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={17} strokeWidth={2.2} />
      </div>
      <h2 className="section-h" style={{ margin: 0, fontSize: 20 }}>
        {label}
      </h2>
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          minWidth: 24,
          height: 24,
          padding: "0 8px",
          borderRadius: 999,
          background: colors.bg,
          color: colors.fg,
          fontSize: 13,
          fontWeight: 700,
        }}
      >
        {count}
      </span>
    </div>
  );
}

// ─── Compact completed row ───
function CompletedRow({ booking }) {
  return (
    <Card style={{ padding: 14, opacity: 0.92 }}>
      <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <Avatar
          src={booking.portrait}
          initials={booking.requestorInitials}
          size={40}
          tone="teal"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <div
              style={{
                fontWeight: 600,
                fontSize: 15,
                color: "var(--text-1)",
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {booking.requestor}
            </div>
            <div
              style={{
                fontWeight: 700,
                fontSize: 14,
                color: "var(--success)",
                flexShrink: 0,
              }}
            >
              {booking.price}
            </div>
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
            {booking.item}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 6,
              fontSize: 12,
              color: "var(--text-3)",
            }}
          >
            <span>{booking.date}</span>
            {booking.rating && (
              <>
                <span>·</span>
                <Stars value={booking.rating} size={11} />
              </>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}

// ═══════════════════════════════════════════════════════════════
// ElderListings — dedicated listings tab
// ═══════════════════════════════════════════════════════════════
function ElderListings({ onAddListing }) {
  const t = useT();
  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      <div
        style={{
          padding: "0 16px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 18,
          gap: 12,
        }}
      >
        <div>
          <div
            style={{
              color: "var(--text-3)",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.04em",
              textTransform: "uppercase",
            }}
          >
            {t("yourListings")}
          </div>
          <h1
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(28px, 4vw, 38px)",
              margin: "4px 0 0",
              fontWeight: 400,
            }}
          >
            What you offer
          </h1>
        </div>
        <Button size="md" icon="plus" onClick={onAddListing}>
          New listing
        </Button>
      </div>

      <div
        style={{
          padding: "0 16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: 14,
          alignItems: "stretch",
        }}
      >
        {ELDER_LISTINGS.map((l) => (
          <Card
            key={l.id}
            style={{
              padding: 20,
              display: "flex",
              flexDirection: "column",
              height: "100%",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                gap: 12,
                flex: 1,
              }}
            >
              <div style={{ minWidth: 0, flex: 1 }}>
                <div style={{ marginBottom: 8 }}>
                  <Badge tone="primary">
                    <Icon name="chef" size={12} /> Home Cooking
                  </Badge>
                </div>
                <div
                  style={{
                    fontFamily: "var(--font-display)",
                    fontSize: 24,
                    color: "var(--text-1)",
                    lineHeight: 1.2,
                    fontWeight: 400,
                  }}
                >
                  {l.title}
                </div>
                <div
                  style={{ fontSize: 15, color: "var(--text-2)", marginTop: 8 }}
                >
                  <strong style={{ color: "var(--text-1)" }}>{l.price}</strong>{" "}
                  <span style={{ color: "var(--text-3)" }}>
                    · {l.priceUnit}
                  </span>
                </div>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    marginTop: 12,
                    fontSize: 13,
                    color: "var(--text-2)",
                  }}
                >
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 4,
                    }}
                  >
                    <Stars value={l.rating} size={12} /> {l.rating}
                  </span>
                  <span>
                    {l.bookings} {t("bookings")}
                  </span>
                </div>
              </div>
              <Toggle on={l.active} />
            </div>
            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 16,
                paddingTop: 14,
                borderTop: "1px solid var(--border)",
              }}
            >
              <Button size="sm" variant="secondary" icon="edit" full>
                Edit
              </Button>
              <Button size="sm" variant="secondary" full>
                Preview
              </Button>
            </div>
          </Card>
        ))}

        {/* Add new card */}
        <button
          onClick={onAddListing}
          style={{
            appearance: "none",
            cursor: "pointer",
            textAlign: "center",
            background: "transparent",
            border: "2px dashed var(--border)",
            borderRadius: 14,
            padding: "32px 20px",
            minHeight: 200,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            gap: 10,
            fontFamily: "var(--font-body)",
            color: "var(--text-2)",
            transition: "all 0.18s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.borderColor = "var(--primary)";
            e.currentTarget.style.color = "var(--primary)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.borderColor = "var(--border)";
            e.currentTarget.style.color = "var(--text-2)";
          }}
        >
          <div
            style={{
              width: 48,
              height: 48,
              borderRadius: "50%",
              background: "var(--primary-subtle)",
              color: "var(--primary)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Icon name="plus" size={24} strokeWidth={2} />
          </div>
          <div style={{ fontSize: 16, fontWeight: 600 }}>
            Add another listing
          </div>
          <div style={{ fontSize: 13, color: "var(--text-3)" }}>
            Use voice or type
          </div>
        </button>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ElderEarnings — full earnings view
// ═══════════════════════════════════════════════════════════════
function ElderEarnings() {
  const t = useT();
  const [count, setCount] = useState(0);
  const target = 680;
  useEffect(() => {
    let r = 0;
    const id = setInterval(() => {
      r += target / 32;
      if (r >= target) {
        setCount(target);
        clearInterval(id);
      } else setCount(Math.floor(r));
    }, 22);
    return () => clearInterval(id);
  }, []);

  const months = [
    { label: "Nov", v: 320 },
    { label: "Dec", v: 410 },
    { label: "Jan", v: 480 },
    { label: "Feb", v: 510 },
    { label: "Mar", v: 500 },
    { label: "Apr", v: 680 },
  ];
  const max = 700;

  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      <div style={{ padding: "0 16px", marginBottom: 24 }}>
        <div
          style={{
            color: "var(--text-3)",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.04em",
            textTransform: "uppercase",
          }}
        >
          Earnings
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: "clamp(28px, 4vw, 38px)",
            margin: "4px 0 0",
            fontWeight: 400,
          }}
        >
          Your income
        </h1>
      </div>

      <div className="wide-grid" style={{ padding: "0 16px" }}>
        <Card
          style={{
            padding: 28,
            background:
              "linear-gradient(135deg, var(--accent-subtle) 0%, #FFF3D6 100%)",
            border: "1px solid #F0E0B8",
          }}
        >
          <div
            style={{
              color: "#8a6614",
              fontSize: 13,
              fontWeight: 600,
              letterSpacing: "0.06em",
              textTransform: "uppercase",
            }}
          >
            {t("thisMonth")}
          </div>
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: "clamp(56px, 8vw, 80px)",
              lineHeight: 0.95,
              marginTop: 10,
              color: "var(--text-1)",
              fontVariantNumeric: "tabular-nums",
              fontWeight: 400,
            }}
          >
            RM <span>{count}</span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              marginTop: 16,
              color: "var(--success)",
              fontSize: 14,
              fontWeight: 600,
            }}
          >
            <Icon name="trending-up" size={16} strokeWidth={2.2} />
            <span>+RM 180 {t("moreThanLast")}</span>
          </div>

          {/* Bar chart */}
          <div
            style={{
              marginTop: 28,
              paddingTop: 20,
              borderTop: "1px solid rgba(138, 102, 20, 0.18)",
            }}
          >
            <div
              style={{
                fontSize: 12,
                color: "#8a6614",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 12,
              }}
            >
              Last 6 months
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "flex-end",
                gap: 10,
                height: 100,
              }}
            >
              {months.map((m, i) => {
                const h = (m.v / max) * 100;
                const isLast = i === months.length - 1;
                return (
                  <div
                    key={m.label}
                    style={{
                      flex: 1,
                      display: "flex",
                      flexDirection: "column",
                      alignItems: "center",
                      gap: 6,
                    }}
                  >
                    <div
                      style={{
                        width: "100%",
                        maxWidth: 36,
                        height: `${h}%`,
                        borderRadius: "6px 6px 0 0",
                        background: isLast
                          ? "var(--accent)"
                          : "rgba(212, 169, 76, 0.45)",
                        transition: "height 0.6s ease",
                      }}
                    />
                    <div
                      style={{
                        fontSize: 11,
                        color: "var(--text-3)",
                        fontWeight: 600,
                      }}
                    >
                      {m.label}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </Card>

        <div>
          <Card aiBorder style={{ padding: 22, marginBottom: 14 }}>
            <AILabel />
            <p
              style={{
                margin: "12px 0 16px",
                color: "var(--text-1)",
                fontSize: 16,
                lineHeight: 1.55,
              }}
            >
              {t("nudge_save")}
            </p>
            <Button size="sm" variant="teal" icon="info">
              {t("learnAboutISaraan")}
            </Button>
          </Card>

          <Card style={{ padding: 18 }}>
            <div
              style={{
                fontSize: 12,
                color: "var(--text-3)",
                fontWeight: 600,
                letterSpacing: "0.04em",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Lifetime earnings
            </div>
            <div
              style={{
                fontFamily: "var(--font-display)",
                fontSize: 32,
                color: "var(--text-1)",
                fontWeight: 400,
              }}
            >
              RM 4,820
            </div>
            <div style={{ fontSize: 13, color: "var(--text-3)", marginTop: 4 }}>
              since Aug 2025 · 38 bookings
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════
// ElderProfile — settings / language / logout
// ═══════════════════════════════════════════════════════════════
function ElderProfile({ onChangeLanguage }) {
  const t = useT();
  return (
    <div className="screen mobile-px" style={{ padding: "8px 0 40px" }}>
      <div style={{ padding: "0 16px", textAlign: "center", marginBottom: 24 }}>
        <div style={{ display: "flex", justifyContent: "center" }}>
          <Avatar
            src={HERO_ELDER.portrait}
            initials={HERO_ELDER.initials}
            size={104}
            tone="warm"
            border
          />
        </div>
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 30,
            margin: "16px 0 4px",
            fontWeight: 400,
          }}
        >
          {HERO_ELDER.name}
        </h1>
        <div style={{ fontSize: 14, color: "var(--text-2)" }}>
          {HERO_ELDER.area}
        </div>
        <div style={{ marginTop: 12 }}>
          <Badge tone="success">
            <Icon name="shield" size={12} /> {t("verified")}
          </Badge>
        </div>
      </div>

      <div
        style={{
          padding: "0 16px",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 12,
          maxWidth: 720,
          margin: "0 auto",
        }}
      >
        {[
          {
            icon: "globe",
            label: "Language",
            value: "English",
            onClick: onChangeLanguage,
          },
          { icon: "bell", label: "Notifications", value: "On" },
          { icon: "shield", label: "Privacy", value: "" },
          { icon: "phone", label: "Support", value: "" },
        ].map((row, i) => (
          <button
            key={i}
            onClick={row.onClick}
            style={{
              appearance: "none",
              cursor: "pointer",
              textAlign: "left",
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 12,
              padding: "16px 18px",
              display: "flex",
              alignItems: "center",
              gap: 14,
              fontFamily: "var(--font-body)",
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 9,
                background: "var(--bg-2)",
                color: "var(--text-2)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                flexShrink: 0,
              }}
            >
              <Icon name={row.icon} size={18} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  fontSize: 15,
                  fontWeight: 600,
                  color: "var(--text-1)",
                }}
              >
                {row.label}
              </div>
              {row.value && (
                <div
                  style={{ fontSize: 13, color: "var(--text-3)", marginTop: 2 }}
                >
                  {row.value}
                </div>
              )}
            </div>
            <Icon name="chevron-right" size={18} color="var(--text-3)" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Booking row with local pending → confirmed → declined state ───
function BookingRow({ booking, t }) {
  const [status, setStatus] = useState(booking.status);
  const [justChanged, setJustChanged] = useState(false);

  const accept = async () => {
    const updated = await respondToBooking(booking.id, "accept");
    setStatus(updated.status);
    setJustChanged(true);
    setTimeout(() => setJustChanged(false), 2400);
  };
  const decline = async () => {
    const updated = await respondToBooking(booking.id, "decline");
    setStatus(updated.status);
    setJustChanged(true);
    setTimeout(() => setJustChanged(false), 2400);
  };

  if (status === "declined" || status === "cancelled") return null;

  return (
    <Card
      style={{
        padding: 16,
        marginBottom: 12,
        transition: "background 0.4s ease",
        background:
          justChanged && status === "confirmed"
            ? "rgba(61, 139, 95, 0.06)"
            : "var(--surface)",
      }}
    >
      <div style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
        <Avatar
          src={booking.portrait}
          initials={booking.requestorInitials}
          size={44}
          tone="teal"
        />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "baseline",
              gap: 8,
            }}
          >
            <div
              style={{ fontWeight: 600, fontSize: 16, color: "var(--text-1)" }}
            >
              {booking.requestor}
            </div>
            <div
              style={{ fontWeight: 700, fontSize: 16, color: "var(--primary)" }}
            >
              {booking.price}
            </div>
          </div>
          <div style={{ fontSize: 14, color: "var(--text-2)", marginTop: 2 }}>
            {booking.item} · {booking.qty}
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              marginTop: 6,
              fontSize: 13,
              color: "var(--text-3)",
            }}
          >
            <Icon name="clock" size={13} />
            <span>{booking.date}</span>
          </div>

          {status === "pending" && (
            <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
              <Button size="sm" icon="check" onClick={accept}>
                {t("accept")}
              </Button>
              <Button size="sm" variant="secondary" onClick={decline}>
                {t("decline")}
              </Button>
            </div>
          )}

          {status === "confirmed" && (
            <div
              style={{
                marginTop: 12,
                display: "flex",
                flexDirection: "column",
                gap: 8,
                animation: justChanged ? "slideUp 0.4s ease" : "none",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <div
                  style={{
                    width: 22,
                    height: 22,
                    borderRadius: "50%",
                    background: "var(--success)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    flexShrink: 0,
                  }}
                >
                  <Icon name="check" size={13} color="#fff" strokeWidth={3} />
                </div>
                <span
                  style={{
                    color: "var(--success)",
                    fontWeight: 600,
                    fontSize: 14,
                  }}
                >
                  {t("bookingConfirmed") || "Booking confirmed"}
                </span>
              </div>
              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-3)",
                  paddingLeft: 30,
                  lineHeight: 1.5,
                }}
              >
                {t("confirmedNote") ||
                  `${booking.requestor} has been notified. We'll send a reminder before the booking time.`}
              </div>
              <div
                style={{
                  display: "flex",
                  gap: 8,
                  paddingLeft: 30,
                  marginTop: 4,
                }}
              >
                <button
                  style={{
                    appearance: "none",
                    border: "1px solid var(--border)",
                    background: "var(--surface)",
                    cursor: "pointer",
                    padding: "6px 12px",
                    borderRadius: 8,
                    fontFamily: "var(--font-body)",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "var(--text-2)",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                  }}
                >
                  <Icon name="message-circle" size={13} /> Message
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}

const Toggle = ({ on: initial }) => {
  const [on, setOn] = useState(initial);
  return (
    <button
      onClick={() => setOn(!on)}
      style={{
        width: 44,
        height: 26,
        borderRadius: 999,
        border: 0,
        cursor: "pointer",
        padding: 2,
        background: on ? "var(--success)" : "var(--border)",
        transition: "background 0.2s ease",
        flexShrink: 0,
      }}
    >
      <div
        style={{
          width: 22,
          height: 22,
          borderRadius: "50%",
          background: "#fff",
          transform: `translateX(${on ? 18 : 0}px)`,
          transition: "transform 0.2s ease",
          boxShadow: "0 1px 3px rgba(0,0,0,0.2)",
        }}
      />
    </button>
  );
};


export { ElderLanguage, ElderVoice, ElderDashboard, ElderListings, ElderEarnings, ElderProfile };
