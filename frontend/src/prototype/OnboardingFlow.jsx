/**
 * OnboardingFlow.jsx
 *
 * Full sign-up + eKYC flow. Designed to call the real API layer when
 * the backend is ready — swap the MOCK_* constants and the apiCall()
 * helper for real imports from src/services/api/endpoints/.
 *
 * Steps:
 *   1  Role selection  (elder / requestor / companion)
 *   2  Basic info      (name, email, phone, password)
 *   3a eKYC intro      (elder only)
 *   3b IC upload       (elder only) — front + back MyKad
 *   3c Selfie          (elder only)
 *   3d Processing      (Textract → Rekognition simulation)
 *   3e KYC result      (extracted data confirmation or failure)
 *   4  Done            (account created)
 */
import { useRef, useState } from 'react';
import { GingerLogo, Icon } from './components';
import { LANGUAGES } from './i18n';

// ─── API shim (replace with real imports when backend is ready) ─────────────
// import { register }         from '../services/api/endpoints/auth';
// import { initiateSession, uploadDocument, startVerification, waitForVerification } from '../services/api/endpoints/kyc';

const MOCK_DELAY = (ms) => new Promise((r) => setTimeout(r, ms));

async function apiRegister(payload) {
  await MOCK_DELAY(1200);
  return {
    userId: 'mock-user-' + Date.now(),
    accessToken: 'mock-token',
    kycRequired: payload.role === 'elder',
    kycStatus: payload.role === 'elder' ? 'not_started' : 'approved',
  };
}

async function apiInitiateKycSession() {
  await MOCK_DELAY(600);
  return { sessionId: 'kyc-session-' + Date.now(), frontUrl: '', backUrl: '', selfieUrl: '' };
}

async function apiStartVerification(_sessionId) {
  await MOCK_DELAY(400);
  return { jobId: 'job-' + Date.now(), estimatedSeconds: 8 };
}

async function apiWaitForResult(_jobId, onProgress) {
  const steps = ['pending', 'pending', 'pending'];
  for (const s of steps) { onProgress(s); await MOCK_DELAY(1800); }
  return {
    status: 'approved',
    extractedData: {
      fullName: 'SITI BINTI HASSAN',
      icNumber: '620415-14-5678',
      dateOfBirth: '1962-04-15',
      address: 'NO 12 JALAN KEPONG 5, KEPONG, 52100 KUALA LUMPUR',
      nationality: 'WARGANEGARA',
      gender: 'F',
      confidence: 97.4,
    },
    faceMatch: { matched: true, similarity: 94.1 },
  };
}
// ─────────────────────────────────────────────────────────────────────────────

const ROLE_OPTIONS = [
  {
    id: 'elder',
    icon: 'chef',
    label: 'Elder Provider',
    sublabel: 'Makcik / Pakcik',
    desc: 'Offer services and earn supplemental income from your skills',
    gradient: 'linear-gradient(135deg,#fff5ea,#fbe4cc)',
    border: '#F0D4B0',
    badge: 'eKYC required',
  },
  {
    id: 'requestor',
    icon: 'search',
    label: 'Requestor',
    sublabel: 'Community member',
    desc: 'Book trusted local services from vetted elders near you',
    gradient: 'linear-gradient(135deg,#e6f5f5,#c8eaea)',
    border: '#B0D8D8',
    badge: null,
  },
  {
    id: 'companion',
    icon: 'calendar-heart',
    label: 'Family Member',
    sublabel: 'Companion',
    desc: "Watch over a family elder's activity and earnings gently",
    gradient: 'linear-gradient(135deg,#fff8e7,#fdefc0)',
    border: '#F0DFA0',
    badge: null,
  },
];

// ─── Sub-components ───────────────────────────────────────────────────────────

function StepHeader({ step, total, label }) {
  return (
    <div style={{ marginBottom: 28 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
        {[...Array(total)].map((_, i) => (
          <div
            key={i}
            style={{
              height: 3,
              flex: 1,
              borderRadius: 99,
              background: i < step ? 'var(--primary)' : 'var(--border)',
              transition: 'background 0.3s ease',
            }}
          />
        ))}
      </div>
      <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
        Step {step} of {total} · {label}
      </div>
    </div>
  );
}

function FormField({ label, type = 'text', value, onChange, placeholder, hint }) {
  const [focused, setFocused] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
      <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}>{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        style={{
          height: 48,
          padding: '0 14px',
          borderRadius: 12,
          border: `1.5px solid ${focused ? 'var(--primary)' : 'var(--border)'}`,
          background: 'var(--surface)',
          fontFamily: 'var(--font-body)',
          fontSize: 15,
          color: 'var(--text-1)',
          outline: 'none',
          width: '100%',
          boxSizing: 'border-box',
        }}
      />
      {hint && <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{hint}</div>}
    </div>
  );
}

function UploadBox({ label, sublabel, file, onFile, icon = 'upload' }) {
  const ref = useRef(null);
  const preview = file ? URL.createObjectURL(file) : null;
  return (
    <div>
      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)', marginBottom: 8 }}>{label}</div>
      <button
        onClick={() => ref.current?.click()}
        style={{
          appearance: 'none',
          width: '100%',
          minHeight: 140,
          border: `2px dashed ${file ? 'var(--primary)' : 'var(--border)'}`,
          borderRadius: 14,
          background: file ? 'var(--primary-subtle)' : 'var(--bg-2)',
          cursor: 'pointer',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 10,
          padding: 16,
          position: 'relative',
          overflow: 'hidden',
          transition: 'border-color 0.2s, background 0.2s',
        }}
      >
        {preview ? (
          <img
            src={preview}
            alt="preview"
            style={{ maxWidth: '100%', maxHeight: 120, borderRadius: 8, objectFit: 'contain' }}
          />
        ) : (
          <>
            <div style={{
              width: 48, height: 48, borderRadius: '50%',
              background: 'var(--bg)', border: '1.5px solid var(--border)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: 'var(--text-3)',
            }}>
              <Icon name={icon} size={22} />
            </div>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>
                Tap to upload
              </div>
              {sublabel && (
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{sublabel}</div>
              )}
            </div>
          </>
        )}
        {file && (
          <div style={{
            position: 'absolute', bottom: 8, right: 8,
            background: 'var(--primary)', borderRadius: 99,
            padding: '3px 8px', fontSize: 11, fontWeight: 700, color: '#fff',
            display: 'flex', alignItems: 'center', gap: 4,
          }}>
            <Icon name="check" size={11} color="#fff" strokeWidth={3} /> Uploaded
          </div>
        )}
      </button>
      <input
        ref={ref}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />
    </div>
  );
}

// ─── Processing animation ────────────────────────────────────────────────────

const PROCESSING_STEPS = [
  { id: 'upload',   icon: 'upload',   label: 'Uploading documents securely…',        sub: 'Direct to encrypted S3 storage' },
  { id: 'textract', icon: 'sparkles', label: 'Reading your MyKad (AWS Textract)…',   sub: 'Extracting name, IC number, date of birth' },
  { id: 'rekognition', icon: 'shield', label: 'Checking face match (AWS Rekognition)…', sub: 'Comparing IC photo with your selfie' },
];

function ProcessingScreen({ kycStep }) {
  // kycStep: 0=upload, 1=textract, 2=rekognition, 3=done
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 0' }}>
      <div style={{
        width: 72, height: 72, borderRadius: '50%',
        background: 'var(--primary-subtle)', border: '2px solid var(--primary)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 28, animation: 'gentlePulse 2s ease-in-out infinite',
      }}>
        <Icon name="shield" size={32} color="var(--primary)" />
      </div>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400,
        color: 'var(--text-1)', margin: '0 0 8px', textAlign: 'center',
      }}>
        Verifying your identity
      </h2>
      <p style={{ fontSize: 14, color: 'var(--text-3)', margin: '0 0 36px', textAlign: 'center' }}>
        This usually takes under 30 seconds
      </p>

      <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: 12 }}>
        {PROCESSING_STEPS.map((s, i) => {
          const done = i < kycStep;
          const active = i === kycStep;
          return (
            <div
              key={s.id}
              style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '14px 16px', borderRadius: 14,
                background: done ? '#E8F2EC' : active ? 'var(--primary-subtle)' : 'var(--bg-2)',
                border: `1.5px solid ${done ? '#B8DEC8' : active ? 'var(--primary)' : 'var(--border)'}`,
                transition: 'all 0.4s ease',
                opacity: i > kycStep ? 0.45 : 1,
              }}
            >
              <div style={{
                width: 36, height: 36, borderRadius: '50%', flexShrink: 0,
                background: done ? 'var(--success)' : active ? 'var(--primary)' : 'var(--border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'background 0.3s ease',
              }}>
                {done
                  ? <Icon name="check" size={16} color="#fff" strokeWidth={2.5} />
                  : active
                    ? <div className="spin-tiny" />
                    : <Icon name={s.icon} size={16} color="var(--text-3)" />
                }
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: done ? 'var(--success)' : active ? 'var(--text-1)' : 'var(--text-3)' }}>
                  {s.label}
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{s.sub}</div>
              </div>
            </div>
          );
        })}
      </div>

      <p style={{ fontSize: 11, color: 'var(--text-3)', marginTop: 28, textAlign: 'center', lineHeight: 1.6 }}>
        Your documents are encrypted in transit and at rest.<br />
        They are never stored on our servers.
      </p>
    </div>
  );
}

// ─── KYC result screen ───────────────────────────────────────────────────────

function KycResultScreen({ result, onDone, onRetry }) {
  const approved = result?.status === 'approved';
  const data = result?.extractedData;
  const face = result?.faceMatch;

  if (!approved) {
    return (
      <div style={{ textAlign: 'center', padding: '40px 0' }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#FBE6E6', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <Icon name="x" size={32} color="var(--error)" strokeWidth={2.5} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 400, color: 'var(--error)', margin: '0 0 10px' }}>
          Verification unsuccessful
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 28px', lineHeight: 1.6 }}>
          {result?.failureReason || 'We could not verify your identity. Please ensure the IC is clearly visible and try again.'}
        </p>
        <button
          onClick={onRetry}
          style={{
            width: '100%', height: 52, borderRadius: 14, border: 0,
            background: 'var(--primary)', color: '#fff', fontFamily: 'var(--font-body)',
            fontSize: 16, fontWeight: 700, cursor: 'pointer',
          }}
        >
          Try again
        </button>
      </div>
    );
  }

  return (
    <div>
      {/* Success header */}
      <div style={{ textAlign: 'center', marginBottom: 28 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: '#E8F2EC', display: 'flex', alignItems: 'center',
          justifyContent: 'center', margin: '0 auto 16px',
        }}>
          <Icon name="check" size={36} color="var(--success)" strokeWidth={2.5} />
        </div>
        <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--text-1)', margin: '0 0 6px' }}>
          Identity verified!
        </h2>
        <p style={{ fontSize: 14, color: 'var(--text-2)', margin: 0 }}>
          Please confirm the details we extracted from your MyKad
        </p>
      </div>

      {/* Extracted data card */}
      <div style={{
        background: 'var(--surface)', border: '1.5px solid var(--border)',
        borderLeft: '4px solid var(--success)', borderRadius: 14,
        padding: 20, marginBottom: 16,
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--success)', marginBottom: 14 }}>
          <Icon name="sparkles" size={12} /> AWS Textract — extracted from IC
        </div>
        {data && [
          ['Full Name',    data.fullName],
          ['IC Number',    data.icNumber],
          ['Date of Birth', data.dateOfBirth],
          ['Address',      data.address],
          ['Nationality',  data.nationality],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 12, paddingBottom: 10, marginBottom: 10, borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 600, minWidth: 100, paddingTop: 2 }}>{k}</div>
            <div style={{ fontSize: 14, color: 'var(--text-1)', fontWeight: 500, flex: 1 }}>{v}</div>
          </div>
        ))}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <div style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: '#E8F2EC', border: '1px solid #B8DEC8',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="check" size={14} color="var(--success)" strokeWidth={2.5} />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--success)' }}>Face match</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{face?.similarity?.toFixed(1)}% similarity</div>
            </div>
          </div>
          <div style={{
            flex: 1, padding: '8px 12px', borderRadius: 10,
            background: 'var(--primary-subtle)', border: '1px solid #F0D4B0',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            <Icon name="sparkles" size={14} color="var(--primary)" />
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--primary)' }}>Confidence</div>
              <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{data?.confidence?.toFixed(1)}%</div>
            </div>
          </div>
        </div>
      </div>

      <button
        onClick={onDone}
        style={{
          width: '100%', height: 52, borderRadius: 14, border: 0,
          background: 'var(--primary)', color: '#fff', fontFamily: 'var(--font-body)',
          fontSize: 16, fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
        }}
      >
        <Icon name="check" size={18} color="#fff" strokeWidth={2.5} /> Yes, this is correct
      </button>
      <button
        onClick={onRetry}
        style={{
          width: '100%', height: 44, borderRadius: 14, border: '1.5px solid var(--border)',
          background: 'transparent', color: 'var(--text-2)', fontFamily: 'var(--font-body)',
          fontSize: 14, fontWeight: 600, cursor: 'pointer', marginTop: 10,
        }}
      >
        Something looks wrong — retry
      </button>
    </div>
  );
}

// ─── Main OnboardingFlow ─────────────────────────────────────────────────────

export function OnboardingFlow({ onComplete, onBack, lang, setLang }) {
  const [step, setStep] = useState(1);      // 1=role, 2=info, 3=kyc-intro, 4=ic-upload, 5=selfie, 6=processing, 7=result, 8=done
  const [role, setRole] = useState(null);
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [icFront, setIcFront] = useState(null);
  const [icBack, setIcBack] = useState(null);
  const [selfie, setSelfie] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [kycProcessingStep, setKycProcessingStep] = useState(0);  // 0-3
  const [kycResult, setKycResult] = useState(null);
  const [userId, setUserId] = useState(null);

  const setField = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));

  // Total steps varies by role
  const totalSteps = role === 'elder' ? 5 : 3;
  const stepLabels = {
    1: 'Choose role',
    2: 'Your details',
    3: role === 'elder' ? 'Identity verification' : 'All done',
    4: 'Upload MyKad',
    5: 'Selfie',
    6: 'Verifying',
    7: 'Confirm details',
    8: 'Complete',
  };

  // ── Step transitions ──

  const handleRoleSelect = (r) => { setRole(r); setStep(2); };

  const handleInfoSubmit = async () => {
    if (!form.name || !form.email || !form.phone || !form.password) {
      setError('Please fill in all fields.'); return;
    }
    setError('');
    setLoading(true);
    try {
      const res = await apiRegister({ ...form, role, locale: lang });
      setUserId(res.userId);
      if (res.kycRequired) {
        setStep(3); // KYC intro
      } else {
        setStep(8); // done
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleIcSubmit = () => {
    if (!icFront || !icBack) { setError('Please upload both sides of your IC.'); return; }
    setError('');
    setStep(5); // selfie
  };

  const handleSelfieSubmit = async () => {
    if (!selfie) { setError('Please take or upload a selfie.'); return; }
    setError('');
    setStep(6); // processing
    setKycProcessingStep(0);

    try {
      // Step 0: initiate session & upload
      const session = await apiInitiateKycSession();
      setKycProcessingStep(1);

      // Step 1: Textract (simulated via startVerification)
      const { jobId } = await apiStartVerification(session.sessionId);
      setKycProcessingStep(2);

      // Step 2: Rekognition — poll result
      const result = await apiWaitForResult(jobId, () => {});
      setKycProcessingStep(3);

      await MOCK_DELAY(600);
      setKycResult(result);
      setStep(7); // show result
    } catch {
      setKycResult({ status: 'failed', failureReason: 'Verification failed. Please try again.' });
      setStep(7);
    }
  };

  const handleKycRetry = () => {
    setIcFront(null); setIcBack(null); setSelfie(null);
    setKycResult(null); setKycProcessingStep(0);
    setStep(4); // back to IC upload
  };

  // ── Render ──

  const containerStyle = {
    minHeight: '100vh',
    background: 'var(--bg)',
    display: 'flex',
    flexDirection: 'column',
  };

  const header = (
    <header style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: '16px 24px',
      borderBottom: '1px solid var(--border)',
      background: 'rgba(253,250,247,0.92)',
      backdropFilter: 'blur(16px)',
      position: 'sticky', top: 0, zIndex: 20,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        {step > 1 && step < 8 && (
          <button
            onClick={() => {
              if (step === 5) setStep(4);
              else if (step === 4) setStep(3);
              else if (step === 3) setStep(2);
              else if (step === 2) setStep(1);
              else onBack?.();
            }}
            style={{
              appearance: 'none', border: 0, background: 'transparent',
              cursor: 'pointer', color: 'var(--text-2)', padding: '4px 8px 4px 0',
              display: 'flex', alignItems: 'center', gap: 6,
              fontFamily: 'var(--font-body)', fontSize: 14, fontWeight: 600,
            }}
          >
            <Icon name="chevron-left" size={18} /> Back
          </button>
        )}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 32, height: 32, borderRadius: 8,
            background: 'linear-gradient(135deg,#fff5ea,#fbe4cc)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 8px rgba(194,102,45,0.2)',
          }}>
            <GingerLogo size={20} />
          </div>
          <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-1)', fontWeight: 400 }}>
            Ginger Gig
          </span>
        </div>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        {/* Language picker */}
        <div style={{ display: 'flex', gap: 2, padding: 3, background: 'var(--bg-2)', borderRadius: 10, border: '1px solid var(--border)' }}>
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang?.(l.code)}
              style={{
                appearance: 'none', border: 0,
                background: lang === l.code ? 'var(--surface)' : 'transparent',
                cursor: 'pointer', width: 28, height: 26, borderRadius: 6,
                fontFamily: 'var(--font-body)', fontSize: 12, fontWeight: 600,
                color: lang === l.code ? 'var(--text-1)' : 'var(--text-3)',
              }}
            >
              {l.short}
            </button>
          ))}
        </div>
      </div>
    </header>
  );

  const body = (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '36px 24px 80px' }}>
      <div style={{ width: '100%', maxWidth: 480 }}>

        {/* ── Step 1: Role selection ── */}
        {step === 1 && (
          <>
            <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(28px, 5vw, 38px)', fontWeight: 400, color: 'var(--text-1)', margin: '0 0 8px' }}>
              Create your account
            </h1>
            <p style={{ fontSize: 15, color: 'var(--text-2)', margin: '0 0 32px' }}>
              Who are you joining as?
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {ROLE_OPTIONS.map((r) => (
                <button
                  key={r.id}
                  onClick={() => handleRoleSelect(r.id)}
                  style={{
                    appearance: 'none', cursor: 'pointer',
                    background: r.gradient, border: `2px solid ${r.border}`,
                    borderRadius: 16, padding: '18px 20px',
                    display: 'flex', alignItems: 'center', gap: 16,
                    textAlign: 'left', fontFamily: 'var(--font-body)',
                    transition: 'transform 0.15s, box-shadow 0.15s',
                  }}
                  onMouseDown={(e) => (e.currentTarget.style.transform = 'scale(0.98)')}
                  onMouseUp={(e) => (e.currentTarget.style.transform = '')}
                  onMouseLeave={(e) => (e.currentTarget.style.transform = '')}
                >
                  <div style={{
                    width: 52, height: 52, borderRadius: 14,
                    background: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(4px)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                  }}>
                    <Icon name={r.icon} size={26} color="var(--primary)" />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontWeight: 700, fontSize: 16, color: 'var(--text-1)' }}>{r.label}</span>
                      {r.badge && (
                        <span style={{ fontSize: 10, fontWeight: 700, background: 'var(--primary)', color: '#fff', padding: '2px 7px', borderRadius: 99 }}>
                          {r.badge}
                        </span>
                      )}
                    </div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500, marginTop: 1 }}>{r.sublabel}</div>
                    <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 6, lineHeight: 1.5 }}>{r.desc}</div>
                  </div>
                  <Icon name="chevron-right" size={20} color="var(--text-3)" />
                </button>
              ))}
            </div>
          </>
        )}

        {/* ── Step 2: Basic info ── */}
        {step === 2 && (
          <>
            <StepHeader step={1} total={totalSteps} label="Your details" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 400, color: 'var(--text-1)', margin: '0 0 24px' }}>
              Tell us about yourself
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormField label="Full name (as in IC)" value={form.name} onChange={setField('name')} placeholder="e.g. Siti binti Hassan" />
              <FormField label="Email address" type="email" value={form.email} onChange={setField('email')} placeholder="your@email.com" />
              <FormField label="Phone number" type="tel" value={form.phone} onChange={setField('phone')} placeholder="+601X-XXXXXXX" hint="Used for booking confirmations" />
              <FormField label="Password" type="password" value={form.password} onChange={setField('password')} placeholder="At least 8 characters" />
            </div>
            {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FBE6E6', color: 'var(--error)', fontSize: 13, marginTop: 16 }}>{error}</div>}
            <button
              onClick={handleInfoSubmit}
              disabled={loading}
              style={{
                width: '100%', height: 52, borderRadius: 14, border: 0,
                background: loading ? 'var(--border)' : 'var(--primary)',
                color: '#fff', fontFamily: 'var(--font-body)',
                fontSize: 16, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                marginTop: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              {loading ? <><div className="spin-tiny" /> Creating account…</> : 'Continue'}
            </button>
          </>
        )}

        {/* ── Step 3: eKYC intro (elder only) ── */}
        {step === 3 && (
          <>
            <StepHeader step={2} total={totalSteps} label="Identity verification" />
            <div style={{ textAlign: 'center', padding: '20px 0 32px' }}>
              <div style={{
                width: 80, height: 80, borderRadius: '50%',
                background: 'var(--primary-subtle)', border: '2px solid var(--primary)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
              }}>
                <Icon name="shield" size={36} color="var(--primary)" />
              </div>
              <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, color: 'var(--text-1)', margin: '0 0 12px' }}>
                Verify your identity
              </h2>
              <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 28px' }}>
                To receive payments, Malaysian law requires us to verify your identity using your <strong>MyKad</strong> (IC).
                <br /><br />
                This uses <strong>AWS Textract</strong> to read your IC and <strong>AWS Rekognition</strong> to match your face.
              </p>
            </div>

            {/* What you need */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 28 }}>
              {[
                { icon: 'shield', label: 'MyKad — front photo',   sub: 'Your IC with photo, name, and IC number visible' },
                { icon: 'shield', label: 'MyKad — back photo',    sub: 'The fingerprint side of your IC' },
                { icon: 'user',   label: 'Selfie',                sub: 'A clear photo of your face — no sunglasses' },
              ].map((item) => (
                <div key={item.label} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 12,
                  background: 'var(--surface)', border: '1px solid var(--border)',
                }}>
                  <Icon name={item.icon} size={20} color="var(--primary)" />
                  <div>
                    <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-1)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>{item.sub}</div>
                  </div>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6, margin: '0 0 20px' }}>
              Your documents are uploaded directly to encrypted AWS S3 storage.
              They are never stored on our servers and are deleted after verification.
            </p>

            <button
              onClick={() => setStep(4)}
              style={{
                width: '100%', height: 52, borderRadius: 14, border: 0,
                background: 'var(--primary)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
              }}
            >
              <Icon name="shield" size={18} color="#fff" /> Start verification
            </button>
          </>
        )}

        {/* ── Step 4: IC upload ── */}
        {step === 4 && (
          <>
            <StepHeader step={3} total={totalSteps} label="Upload MyKad" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, color: 'var(--text-1)', margin: '0 0 8px' }}>
              Upload your MyKad
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.55 }}>
              Place your IC on a flat surface with good lighting. Make sure all text is readable.
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 24 }}>
              <UploadBox
                label="Front of IC (photo side)"
                sublabel="Name, IC number, photo must be visible"
                file={icFront}
                onFile={setIcFront}
                icon="user"
              />
              <UploadBox
                label="Back of IC (fingerprint side)"
                sublabel="Fingerprint area and barcode"
                file={icBack}
                onFile={setIcBack}
                icon="shield"
              />
            </div>
            {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FBE6E6', color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button
              onClick={handleIcSubmit}
              style={{
                width: '100%', height: 52, borderRadius: 14, border: 0,
                background: icFront && icBack ? 'var(--primary)' : 'var(--border)',
                color: '#fff', fontFamily: 'var(--font-body)',
                fontSize: 16, fontWeight: 700, cursor: icFront && icBack ? 'pointer' : 'not-allowed',
              }}
            >
              Continue
            </button>
          </>
        )}

        {/* ── Step 5: Selfie ── */}
        {step === 5 && (
          <>
            <StepHeader step={4} total={totalSteps} label="Take a selfie" />
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 400, color: 'var(--text-1)', margin: '0 0 8px' }}>
              Take a selfie
            </h2>
            <p style={{ fontSize: 14, color: 'var(--text-2)', margin: '0 0 24px', lineHeight: 1.55 }}>
              AWS Rekognition will compare your face with the photo on your IC. Look directly at the camera with a neutral expression.
            </p>
            <div style={{ marginBottom: 8 }}>
              <UploadBox
                label="Your selfie"
                sublabel="Face clearly visible, no sunglasses, good lighting"
                file={selfie}
                onFile={setSelfie}
                icon="user"
              />
            </div>
            {/* Tips */}
            <div style={{
              display: 'flex', flexWrap: 'wrap', gap: 8, margin: '16px 0 24px',
            }}>
              {['✅ Face fully visible', '✅ Good lighting', '✅ No sunglasses', '✅ Neutral expression'].map((tip) => (
                <span key={tip} style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--bg-2)', borderRadius: 99, padding: '5px 10px', fontWeight: 500 }}>
                  {tip}
                </span>
              ))}
            </div>
            {error && <div style={{ padding: '10px 14px', borderRadius: 10, background: '#FBE6E6', color: 'var(--error)', fontSize: 13, marginBottom: 16 }}>{error}</div>}
            <button
              onClick={handleSelfieSubmit}
              style={{
                width: '100%', height: 52, borderRadius: 14, border: 0,
                background: selfie ? 'var(--primary)' : 'var(--border)',
                color: '#fff', fontFamily: 'var(--font-body)',
                fontSize: 16, fontWeight: 700, cursor: selfie ? 'pointer' : 'not-allowed',
              }}
            >
              Verify my identity
            </button>
          </>
        )}

        {/* ── Step 6: Processing ── */}
        {step === 6 && <ProcessingScreen kycStep={kycProcessingStep} />}

        {/* ── Step 7: KYC result ── */}
        {step === 7 && (
          <>
            <StepHeader step={5} total={totalSteps} label="Confirm details" />
            <KycResultScreen
              result={kycResult}
              onDone={() => setStep(8)}
              onRetry={handleKycRetry}
            />
          </>
        )}

        {/* ── Step 8: Done ── */}
        {step === 8 && (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <div style={{
              width: 88, height: 88, borderRadius: '50%',
              background: 'linear-gradient(135deg,#fff5ea,#fbe4cc)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 4px 20px rgba(194,102,45,0.2)',
            }}>
              <GingerLogo size={44} />
            </div>
            <h2 style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 400, color: 'var(--text-1)', margin: '0 0 12px' }}>
              You're all set!
            </h2>
            <p style={{ fontSize: 15, color: 'var(--text-2)', lineHeight: 1.65, margin: '0 0 36px' }}>
              Your account has been created
              {role === 'elder' ? ' and your identity has been verified.' : '.'}<br />
              Welcome to the Ginger Gig community.
            </p>
            <button
              onClick={() => onComplete?.({ role, name: form.name, userId })}
              style={{
                width: '100%', height: 52, borderRadius: 14, border: 0,
                background: 'var(--primary)', color: '#fff',
                fontFamily: 'var(--font-body)', fontSize: 16, fontWeight: 700, cursor: 'pointer',
              }}
            >
              Sign in to your account
            </button>
          </div>
        )}

      </div>
    </div>
  );

  return (
    <div style={containerStyle}>
      {header}
      {body}
    </div>
  );
}

export default OnboardingFlow;
