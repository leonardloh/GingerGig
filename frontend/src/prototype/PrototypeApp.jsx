import { useState } from 'react';
import { LANGUAGES, makeT } from './i18n';
import { GingerLogo, Icon, LANG_CTX, T_CTX } from './components';
import { ElderDashboard, ElderEarnings, ElderLanguage, ElderListings, ElderProfile, ElderVoice } from './elder-screens';
import { ProviderDetail, RequestorHome, RequestorProfile, RequestorSearch } from './requestor-screens';
import { CompanionAlerts, CompanionDashboard, CompanionProfile } from './companion-screens';
import { OnboardingFlow } from './OnboardingFlow';
import { getMe, login, logout } from '../services/api/endpoints/auth';
import './prototype.css';

// ─── Requestor bookings placeholder ───────────────────────────────────────
function RequestorBookings() {
  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: 480,
        gap: 16,
        padding: '40px 24px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          width: 72,
          height: 72,
          borderRadius: 20,
          background: 'var(--primary-subtle)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <Icon name="calendar" size={32} color="var(--primary)" />
      </div>
      <h2
        style={{
          fontFamily: 'var(--font-display)',
          fontSize: 26,
          fontWeight: 400,
          color: 'var(--text-1)',
          margin: 0,
        }}
      >
        My Bookings
      </h2>
      <p style={{ color: 'var(--text-2)', fontSize: 15, margin: 0, maxWidth: 300 }}>
        Your upcoming and past bookings will appear here once the backend is connected.
      </p>
      <span
        style={{
          display: 'inline-block',
          padding: '4px 12px',
          borderRadius: 999,
          background: 'var(--bg-2)',
          border: '1px solid var(--border)',
          fontSize: 12,
          fontWeight: 600,
          color: 'var(--text-3)',
          letterSpacing: '0.04em',
        }}
      >
        COMING SOON
      </span>
    </div>
  );
}

// ─── Mock demo accounts ────────────────────────────────────────────────────
const DEMO_ACCOUNTS = [
  {
    email: 'siti@gingergig.my',
    password: 'demo',
    persona: 'elder',
    name: 'Makcik Siti',
    initials: 'SH',
    subtitle: 'Elder · Home cook in Kepong',
  },
  {
    email: 'amir@gingergig.my',
    password: 'demo',
    persona: 'requestor',
    name: 'Amir Razak',
    initials: 'AR',
    subtitle: 'Requestor · Damansara Utama',
  },
  {
    email: 'faiz@gingergig.my',
    password: 'demo',
    persona: 'companion',
    name: 'Faiz Hassan',
    initials: 'FH',
    subtitle: 'Family · Watching over Makcik Siti',
  },
];

const DEMO_WATCHED_ELDER_BY_EMAIL = {
  'faiz@gingergig.my': '5a9017b1-acc2-51a2-be47-538b8bffb800',
};

const TONE_GRADIENT = {
  elder: 'linear-gradient(135deg,#E8A87C,#C2662D)',
  requestor: 'linear-gradient(135deg,#4DA6A6,#2D6A6A)',
  companion: 'linear-gradient(135deg,#E6C36F,#B58423)',
};

// ─── Login screen ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSignUp, lang, setLang }) {
  const t = makeT(lang);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const tryLogin = async ({ email: loginEmail, password: loginPassword }) => {
    setError('');
    setLoading(true);
    try {
      await onLogin({ email: loginEmail.trim().toLowerCase(), password: loginPassword });
    } catch (err) {
      setError(err.message || 'Email or password is incorrect. Use one of the demo accounts below.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await tryLogin({ email, password });
  };

  return (
    <div
      style={{
        minHeight: '100vh',
        background: 'var(--bg)',
        display: 'flex',
        flexDirection: 'column',
      }}
    >
      {/* Top bar — logo + language */}
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '16px 24px',
          borderBottom: '1px solid var(--border)',
          background: 'rgba(253,250,247,0.92)',
          backdropFilter: 'blur(16px)',
          position: 'sticky',
          top: 0,
          zIndex: 20,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              background: 'linear-gradient(135deg,#fff5ea 0%,#fbe4cc 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 2px 8px rgba(194,102,45,0.25), inset 0 0 0 1px rgba(194,102,45,0.18)',
            }}
          >
            <GingerLogo size={22} />
          </div>
          <span
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 20,
              color: 'var(--text-1)',
              fontWeight: 400,
            }}
          >
            Ginger Gig
          </span>
        </div>

        {/* Language picker */}
        <div
          style={{
            display: 'flex',
            gap: 2,
            padding: 3,
            background: 'var(--bg-2)',
            borderRadius: 10,
            border: '1px solid var(--border)',
          }}
        >
          {LANGUAGES.map((l) => (
            <button
              key={l.code}
              onClick={() => setLang(l.code)}
              data-active={lang === l.code}
              style={{
                appearance: 'none',
                border: 0,
                background: lang === l.code ? 'var(--surface)' : 'transparent',
                cursor: 'pointer',
                width: 30,
                height: 28,
                borderRadius: 7,
                fontFamily: 'var(--font-body)',
                fontSize: 13,
                fontWeight: 600,
                color: lang === l.code ? 'var(--text-1)' : 'var(--text-3)',
              }}
              title={l.name}
            >
              {l.short}
            </button>
          ))}
        </div>
      </header>

      {/* Main content */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          padding: '48px 24px 80px',
        }}
      >
        <div style={{ width: '100%', maxWidth: 420 }}>
          {/* Heading */}
          <h1
            style={{
              fontFamily: 'var(--font-display)',
              fontSize: 'clamp(32px, 5vw, 44px)',
              fontWeight: 400,
              color: 'var(--text-1)',
              margin: '0 0 6px',
              lineHeight: 1.05,
            }}
          >
            Selamat Datang
          </h1>
          <p style={{ fontSize: 16, color: 'var(--text-2)', margin: '0 0 36px' }}>
            Sign in to your Ginger Gig account
          </p>

          {/* Login form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
              >
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                placeholder="your@email.com"
                style={{
                  height: 48,
                  padding: '0 14px',
                  borderRadius: 12,
                  border: '1.5px solid var(--border)',
                  background: 'var(--surface)',
                  fontFamily: 'var(--font-body)',
                  fontSize: 15,
                  color: 'var(--text-1)',
                  outline: 'none',
                  transition: 'border-color 0.15s',
                }}
                onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
              >
                Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setError(''); }}
                  placeholder="••••••••"
                  style={{
                    height: 48,
                    padding: '0 44px 0 14px',
                    borderRadius: 12,
                    border: '1.5px solid var(--border)',
                    background: 'var(--surface)',
                    fontFamily: 'var(--font-body)',
                    fontSize: 15,
                    color: 'var(--text-1)',
                    outline: 'none',
                    width: '100%',
                    boxSizing: 'border-box',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'var(--primary)')}
                  onBlur={(e) => (e.target.style.borderColor = 'var(--border)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPw((v) => !v)}
                  style={{
                    position: 'absolute',
                    right: 12,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    appearance: 'none',
                    border: 0,
                    background: 'transparent',
                    cursor: 'pointer',
                    color: 'var(--text-3)',
                    padding: 4,
                    display: 'flex',
                  }}
                >
                  <Icon name={showPw ? 'eye-off' : 'eye'} size={18} />
                </button>
              </div>
            </div>

            {error && (
              <div
                style={{
                  padding: '10px 14px',
                  borderRadius: 10,
                  background: '#FBE6E6',
                  color: 'var(--error)',
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              style={{
                height: 52,
                borderRadius: 14,
                border: 0,
                background: 'var(--primary)',
                color: '#fff',
                fontFamily: 'var(--font-body)',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                marginTop: 4,
                transition: 'opacity 0.15s',
              }}
              onMouseDown={(e) => (e.currentTarget.style.opacity = '0.88')}
              onMouseUp={(e) => (e.currentTarget.style.opacity = '1')}
              onMouseLeave={(e) => (e.currentTarget.style.opacity = '1')}
            >
              Sign in
            </button>
          </form>

          {/* Sign up link */}
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)', margin: '20px 0 0' }}>
            Don't have an account?{' '}
            <button
              type="button"
              onClick={onSignUp}
              style={{
                appearance: 'none', border: 0, background: 'transparent',
                color: 'var(--primary)', fontFamily: 'var(--font-body)',
                fontSize: 14, fontWeight: 700, cursor: 'pointer',
                textDecoration: 'underline', textUnderlineOffset: 3, padding: 0,
              }}
            >
              Create account
            </button>
          </p>

          {/* Divider */}
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '24px 0 24px',
            }}
          >
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            <span style={{ fontSize: 13, color: 'var(--text-3)', fontWeight: 500, whiteSpace: 'nowrap' }}>
              or try a demo account
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Demo account cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.persona}
                onClick={() => tryLogin(acc)}
                disabled={loading}
                style={{
                  appearance: 'none',
                  cursor: 'pointer',
                  background: 'var(--surface)',
                  border: '1.5px solid var(--border)',
                  borderRadius: 14,
                  padding: '14px 16px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  textAlign: 'left',
                  fontFamily: 'var(--font-body)',
                  transition: 'border-color 0.15s, box-shadow 0.15s',
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.borderColor = 'var(--primary)';
                  e.currentTarget.style.boxShadow = '0 2px 12px rgba(194,102,45,0.12)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.borderColor = 'var(--border)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Avatar circle */}
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: TONE_GRADIENT[acc.persona],
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#fff',
                    fontWeight: 700,
                    fontSize: 15,
                    flexShrink: 0,
                    letterSpacing: '0.02em',
                  }}
                >
                  {acc.initials}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 15, color: 'var(--text-1)' }}>
                    {acc.name}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>
                    {acc.subtitle}
                  </div>
                </div>
                <Icon name="chevron-right" size={18} color="var(--text-3)" />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Tab definitions ───────────────────────────────────────────────────────
const ELDER_TABS = [
  { id: 'dashboard', icon: 'home',    labelKey: 'tab_home' },
  { id: 'listings',  icon: 'list',    labelKey: 'tab_listings' },
  { id: 'earnings',  icon: 'wallet',  labelKey: 'tab_earnings' },
  { id: 'profile',   icon: 'user',    labelKey: 'tab_profile' },
];
const REQUESTOR_TABS = [
  { id: 'home',     icon: 'home',     labelKey: 'tab_home' },
  { id: 'search',   icon: 'search',   labelKey: 'tab_search' },
  { id: 'bookings', icon: 'calendar', labelKey: 'tab_bookings' },
  { id: 'profile',  icon: 'user',     labelKey: 'tab_profile' },
];
const COMPANION_TABS = [
  { id: 'dashboard', icon: 'home',  labelKey: 'tab_dashboard' },
  { id: 'alerts',    icon: 'bell',  labelKey: 'tab_alerts' },
  { id: 'profile',   icon: 'user',  labelKey: 'tab_profile' },
];

// ─── Main app shell ────────────────────────────────────────────────────────
function App() {
  const [user, setUser] = useState(null);     // null = not logged in
  const [showSignUp, setShowSignUp] = useState(false);
  const [lang, setLang] = useState('en');
  const [tab, setTab] = useState({
    elder: 'dashboard',
    requestor: 'home',
    companion: 'dashboard',
  });
  const [providerId, setProviderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const handleLogin = async (credentials) => {
    const normalizedEmail = credentials.email.trim().toLowerCase();
    const session = await login({ email: normalizedEmail, password: credentials.password });
    const profile = await getMe();
    const demo = DEMO_ACCOUNTS.find((a) => a.email === normalizedEmail);

    setUser({
      id: profile.id,
      persona: profile.role,
      role: profile.role,
      name: profile.name,
      initials: profile.initials || demo?.initials,
      locale: profile.locale,
      area: profile.area,
      avatarUrl: profile.avatarUrl,
      accessToken: session.accessToken,
      watchedElderId: DEMO_WATCHED_ELDER_BY_EMAIL[normalizedEmail],
    });
  };

  const signOut = () => {
    logout();
    setUser(null);
    setTab({ elder: 'dashboard', requestor: 'home', companion: 'dashboard' });
    setProviderId(null);
    setSearchQuery('');
  };

  // Show onboarding / sign-up flow
  if (!user && showSignUp) {
    return (
      <OnboardingFlow
        lang={lang}
        setLang={setLang}
        onBack={() => setShowSignUp(false)}
        onComplete={() => setShowSignUp(false)} // return to login after account creation
      />
    );
  }

  // Show login screen if no user
  if (!user) {
    return <LoginScreen onLogin={handleLogin} onSignUp={() => setShowSignUp(true)} lang={lang} setLang={setLang} />;
  }

  const persona = user.persona;
  const t = makeT(lang);

  // Tab helpers
  const setElderTab = (id) => setTab((s) => ({ ...s, elder: id }));
  const setReqTab = (id) => {
    setTab((s) => ({ ...s, requestor: id }));
    if (id !== 'search' && id !== 'providerDetail') setProviderId(null);
  };
  const setCompTab = (id) => setTab((s) => ({ ...s, companion: id }));

  // Resolve active tabs + body per persona
  let body, tabs, activeTab, onTabChange;
  if (persona === 'elder') {
    tabs = ELDER_TABS;
    activeTab = tab.elder;
    onTabChange = setElderTab;
    if (tab.elder === 'dashboard')
      body = <ElderDashboard user={user} onAddListing={() => setElderTab('listings')} />;
    else if (tab.elder === 'listings')
      body = <ElderListings user={user} onAddListing={() => setElderTab('voice')} />;
    else if (tab.elder === 'voice')
      body = <ElderVoice user={user} accessToken={user.accessToken} onConfirm={() => setElderTab('listings')} />;
    else if (tab.elder === 'earnings') body = <ElderEarnings user={user} />;
    else if (tab.elder === 'language')
      body = (
        <ElderLanguage
          lang={lang}
          setLang={setLang}
          onContinue={() => setElderTab('profile')}
        />
      );
    else if (tab.elder === 'profile')
      body = <ElderProfile user={user} onChangeLanguage={() => setElderTab('language')} />;
  } else if (persona === 'requestor') {
    tabs = REQUESTOR_TABS;
    activeTab = tab.requestor === 'providerDetail' ? 'home' : tab.requestor;
    onTabChange = setReqTab;
    if (tab.requestor === 'home')
      body = (
        <RequestorHome
          user={user}
          onSearch={(q) => { setSearchQuery(q); setReqTab('search'); }}
          onProvider={(id) => {
            setProviderId(id);
            setTab((s) => ({ ...s, requestor: 'providerDetail' }));
          }}
        />
      );
    else if (tab.requestor === 'search')
      body = (
        <RequestorSearch
          user={user}
          query={searchQuery}
          onBack={() => setReqTab('home')}
          onProvider={(id) => {
            setProviderId(id);
            setTab((s) => ({ ...s, requestor: 'providerDetail' }));
          }}
        />
      );
    else if (tab.requestor === 'providerDetail')
      body = (
        <ProviderDetail
          user={user}
          providerId={providerId}
          onBack={() =>
            setTab((s) => ({ ...s, requestor: searchQuery ? 'search' : 'home' }))
          }
        />
      );
    else if (tab.requestor === 'bookings') body = <RequestorBookings />;
    else if (tab.requestor === 'profile') body = <RequestorProfile user={user} />;
    else
      body = (
        <RequestorHome
          user={user}
          onSearch={(q) => { setSearchQuery(q); setReqTab('search'); }}
          onProvider={(id) => {
            setProviderId(id);
            setTab((s) => ({ ...s, requestor: 'providerDetail' }));
          }}
        />
      );
  } else {
    tabs = COMPANION_TABS;
    activeTab = tab.companion;
    onTabChange = setCompTab;
    if (tab.companion === 'alerts') body = <CompanionAlerts user={user} elderId={user.watchedElderId} />;
    else if (tab.companion === 'profile') body = <CompanionProfile user={user} elderId={user.watchedElderId} />;
    else body = <CompanionDashboard user={user} elderId={user.watchedElderId} />;
  }

  const tabItems = tabs.map((x) => ({
    id: x.id,
    icon: x.icon,
    label: t(x.labelKey),
  }));

  return (
    <T_CTX.Provider value={t}>
      <LANG_CTX.Provider value={lang}>
        <div className="app-shell">
          {/* Top nav */}
          <header className="top-nav">
            <div className="top-nav-inner">
              <a className="brand">
                <span className="brand-mark">
                  <GingerLogo size={26} />
                </span>
                <span className="brand-text">Ginger Gig</span>
              </a>

              <nav className="nav-tabs">
                {tabItems.map((it) => (
                  <button
                    key={it.id}
                    className="nav-tab"
                    data-active={activeTab === it.id}
                    onClick={() => onTabChange(it.id)}
                  >
                    <Icon
                      name={it.icon}
                      size={16}
                      strokeWidth={activeTab === it.id ? 2.2 : 1.75}
                    />
                    <span>{it.label}</span>
                  </button>
                ))}
              </nav>

              {/* Right side: language + user + sign out */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginLeft: 'auto' }}>
                {/* Language picker */}
                <div className="lang-pick">
                  {LANGUAGES.map((l) => (
                    <button
                      key={l.code}
                      data-active={lang === l.code}
                      onClick={() => setLang(l.code)}
                      title={l.name}
                    >
                      {l.short}
                    </button>
                  ))}
                </div>

                {/* User badge */}
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '5px 12px 5px 6px',
                    borderRadius: 999,
                    background: 'var(--bg-2)',
                    border: '1px solid var(--border)',
                  }}
                >
                  <div
                    style={{
                      width: 28,
                      height: 28,
                      borderRadius: '50%',
                      background: TONE_GRADIENT[persona],
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: '#fff',
                      fontWeight: 700,
                      fontSize: 11,
                      letterSpacing: '0.02em',
                      flexShrink: 0,
                    }}
                  >
                    {user.initials}
                  </div>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: 'var(--text-1)',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {user.name}
                  </span>
                </div>

                {/* Sign out */}
                <button
                  onClick={signOut}
                  title="Sign out"
                  style={{
                    appearance: 'none',
                    border: '1px solid var(--border)',
                    background: 'var(--surface)',
                    cursor: 'pointer',
                    width: 36,
                    height: 36,
                    borderRadius: 10,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: 'var(--text-3)',
                    transition: 'color 0.15s, border-color 0.15s',
                    flexShrink: 0,
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.color = 'var(--error)';
                    e.currentTarget.style.borderColor = 'var(--error)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.color = 'var(--text-3)';
                    e.currentTarget.style.borderColor = 'var(--border)';
                  }}
                >
                  <Icon name="log-out" size={16} />
                </button>
              </div>
            </div>
          </header>

          {/* Main */}
          <main className="content-frame" key={`${persona}-${activeTab}`}>
            <div className="screen-wrap">{body}</div>
          </main>

          {/* Mobile bottom nav */}
          <nav
            className="mobile-bottom-nav"
            style={{ gridTemplateColumns: `repeat(${tabItems.length}, 1fr)` }}
          >
            {tabItems.map((it) => (
              <button
                key={it.id}
                data-active={activeTab === it.id}
                onClick={() => onTabChange(it.id)}
              >
                <Icon
                  name={it.icon}
                  size={22}
                  strokeWidth={activeTab === it.id ? 2.2 : 1.75}
                />
                <span>{it.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </LANG_CTX.Provider>
    </T_CTX.Provider>
  );
}

export default App;
