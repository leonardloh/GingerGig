import { useState } from 'react';
import { makeT } from './i18n';
import { GingerLogo, Icon, LANG_CTX, T_CTX, LanguagePicker, SiteFooter } from './components';
import { ElderDashboard, ElderEarnings, ElderLanguage, ElderListings, ElderProfile, ElderVoice } from './elder-screens';
import { ProviderDetail, RequestorHome, RequestorProfile, RequestorSearch } from './requestor-screens';
import { CompanionAlerts, CompanionDashboard, CompanionProfile } from './companion-screens';
import { OnboardingFlow } from './OnboardingFlow';
import { LandingPage } from './LandingPage';
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

const TONE_GRADIENT = {
  elder: 'linear-gradient(135deg,#E8A87C,#C2662D)',
  requestor: 'linear-gradient(135deg,#4DA6A6,#2D6A6A)',
  companion: 'linear-gradient(135deg,#E6C36F,#B58423)',
};

// ─── Login screen ──────────────────────────────────────────────────────────
function LoginScreen({ onLogin, onSignUp, onBack, lang, setLang }) {
  const t = makeT(lang);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState('');

  const tryLogin = (acc) => {
    onLogin({ ...acc, lang });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const acc = DEMO_ACCOUNTS.find(
      (a) => a.email === email.trim().toLowerCase() && a.password === password,
    );
    if (acc) {
      tryLogin(acc);
    } else {
              setError(t('loginError'));
    }
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
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              title="Back to homepage"
              style={{
                appearance: 'none', border: '1.5px solid var(--border)',
                background: 'var(--surface)', borderRadius: 10,
                width: 36, height: 36, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: 'var(--text-2)', flexShrink: 0,
                transition: 'border-color 0.15s, color 0.15s',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'var(--primary)'; e.currentTarget.style.color = 'var(--primary)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border)'; e.currentTarget.style.color = 'var(--text-2)'; }}
            >
              <Icon name="chevron-left" size={18} />
            </button>
          )}
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
            <GingerLogo size={28} />
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

        <LanguagePicker lang={lang} setLang={setLang} />
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
            {t('loginSubtitle')}
          </p>

          {/* Login form */}
          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label
                style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-2)' }}
              >
                {t('email')}
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
                {t('password')}
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
              {t('signIn')}
            </button>
          </form>

          {/* Sign up link */}
          <p style={{ textAlign: 'center', fontSize: 14, color: 'var(--text-2)', margin: '20px 0 0' }}>
            {t('noAccount')}{' '}
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
              {t('createAccount')}
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
              {t('orTryDemo')}
            </span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
          </div>

          {/* Demo account cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {DEMO_ACCOUNTS.map((acc) => (
              <button
                key={acc.persona}
                onClick={() => tryLogin(acc)}
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
  // Sub-screens navigated to from the nav items above — not shown in the tab bar
  { id: 'voice',    hidden: true },
  { id: 'language', hidden: true },
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
  const [showLanding, setShowLanding] = useState(true);  // show landing page first
  const [user, setUser] = useState(null);     // null = not logged in
  const [showSignUp, setShowSignUp] = useState(false);
  const [lang, setLang] = useState('en');
  const [tab, setTab] = useState({
    elder: 'dashboard',
    elderBuyer: 'home',       // tab state when elder is in buyer mode
    requestor: 'home',
    companion: 'dashboard',
    companionBuyer: 'home',   // tab state when companion is in buyer mode
  });
  const [elderMode, setElderMode] = useState('provider');    // 'provider' | 'buyer'
  const [companionMode, setCompanionMode] = useState('carer'); // 'carer' | 'buyer'
  const [providerId, setProviderId] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const signOut = () => {
    setUser(null);
    setShowLanding(false);
    setTab({ elder: 'dashboard', elderBuyer: 'home', requestor: 'home', companion: 'dashboard', companionBuyer: 'home' });
    setElderMode('provider');
    setCompanionMode('carer');
    setProviderId(null);
    setSearchQuery('');
  };

  const switchElderMode = (mode) => {
    setElderMode(mode);
    setProviderId(null);
    setSearchQuery('');
    setTab((s) => ({ ...s, elderBuyer: 'home' }));
  };

  const switchCompanionMode = (mode) => {
    setCompanionMode(mode);
    setProviderId(null);
    setSearchQuery('');
    setTab((s) => ({ ...s, companionBuyer: 'home' }));
  };

  // Show landing page before anything else
  if (showLanding) {
    return <LandingPage onEnter={() => setShowLanding(false)} lang={lang} setLang={setLang} />;
  }

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
    return <LoginScreen onLogin={setUser} onSignUp={() => setShowSignUp(true)} onBack={() => setShowLanding(true)} lang={lang} setLang={setLang} />;
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
  const setCompBuyerTab = (id) => {
    setTab((s) => ({ ...s, companionBuyer: id }));
    if (id !== 'search' && id !== 'providerDetail') setProviderId(null);
  };

  // Tab helper for elder-in-buyer-mode
  const setElderBuyerTab = (id) => {
    setTab((s) => ({ ...s, elderBuyer: id }));
    if (id !== 'search' && id !== 'providerDetail') setProviderId(null);
  };

  // Shared buyer-flow body resolver — used by elder-buyer, requestor, and companion-buyer
  const resolveBuyerBody = (currentTab, setTabFn, tabKey) => {
    const goToProvider = (id) => { setProviderId(id); setTab((s) => ({ ...s, [tabKey]: 'providerDetail' })); };
    const goBack = () => setTab((s) => ({ ...s, [tabKey]: searchQuery ? 'search' : 'home' }));
    if (currentTab === 'search')
      return (
        <RequestorSearch
          query={searchQuery}
          onBack={() => setTabFn('home')}
          onProvider={goToProvider}
        />
      );
    if (currentTab === 'providerDetail')
      return <ProviderDetail providerId={providerId} onBack={goBack} />;
    if (currentTab === 'bookings') return <RequestorBookings />;
    if (currentTab === 'profile') return <RequestorProfile />;
    return (
      <RequestorHome
        onSearch={(q) => { setSearchQuery(q); setTabFn('search'); }}
        onProvider={goToProvider}
      />
    );
  };

  // Resolve active tabs + body per persona
  let body, tabs, activeTab, onTabChange;
  if (persona === 'elder' && elderMode === 'buyer') {
    tabs = REQUESTOR_TABS;
    activeTab = tab.elderBuyer === 'providerDetail' ? 'home' : tab.elderBuyer;
    onTabChange = setElderBuyerTab;
    body = resolveBuyerBody(tab.elderBuyer, setElderBuyerTab, 'elderBuyer');
  } else if (persona === 'elder') {
    tabs = ELDER_TABS;
    activeTab = tab.elder;
    onTabChange = setElderTab;
    if (tab.elder === 'dashboard')
      body = <ElderDashboard onAddListing={() => setElderTab('listings')} />;
    else if (tab.elder === 'listings')
      body = <ElderListings onAddListing={() => setElderTab('voice')} />;
    else if (tab.elder === 'voice')
      body = <ElderVoice onConfirm={() => setElderTab('listings')} />;
    else if (tab.elder === 'earnings') body = <ElderEarnings />;
    else if (tab.elder === 'language')
      body = (
        <ElderLanguage
          lang={lang}
          setLang={setLang}
          onContinue={() => setElderTab('profile')}
        />
      );
    else body = <ElderProfile onChangeLanguage={() => setElderTab('language')} />;
  } else if (persona === 'requestor') {
    tabs = REQUESTOR_TABS;
    activeTab = tab.requestor === 'providerDetail' ? 'home' : tab.requestor;
    onTabChange = setReqTab;
    body = resolveBuyerBody(tab.requestor, setReqTab, 'requestor');
  } else if (persona === 'companion' && companionMode === 'buyer') {
    tabs = REQUESTOR_TABS;
    activeTab = tab.companionBuyer === 'providerDetail' ? 'home' : tab.companionBuyer;
    onTabChange = setCompBuyerTab;
    body = resolveBuyerBody(tab.companionBuyer, setCompBuyerTab, 'companionBuyer');
  } else {
    tabs = COMPANION_TABS;
    activeTab = tab.companion;
    onTabChange = setCompTab;
    if (tab.companion === 'alerts') body = <CompanionAlerts />;
    else if (tab.companion === 'profile') body = <CompanionProfile />;
    else body = <CompanionDashboard />;
  }

  // Map 'voice' and 'language' sub-screens back to their parent nav tab so the
  // bottom bar always has an active highlight even on hidden sub-screens.
  const ELDER_SUB_SCREEN_PARENT = { voice: 'listings', language: 'profile' };
  const resolvedActiveTab =
    persona === 'elder' && ELDER_SUB_SCREEN_PARENT[activeTab]
      ? ELDER_SUB_SCREEN_PARENT[activeTab]
      : activeTab;

  const tabItems = tabs
    .filter((x) => !x.hidden)
    .map((x) => ({
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
                  <GingerLogo size={32} />
                </span>
                <span className="brand-text">Ginger Gig</span>
              </a>

              {/* Mode toggle — shown for elder and companion personas */}
              {persona === 'elder' && (
                <div className="elder-mode-toggle">
                  <button
                    data-active={elderMode === 'provider'}
                    onClick={() => switchElderMode('provider')}
                    title="Switch to provider mode — offer your services"
                  >
                    Offering
                  </button>
                  <button
                    data-active={elderMode === 'buyer'}
                    onClick={() => switchElderMode('buyer')}
                    title="Switch to buyer mode — find a service near you"
                  >
                    Finding
                  </button>
                </div>
              )}
              {persona === 'companion' && (
                <div className="elder-mode-toggle">
                  <button
                    data-active={companionMode === 'carer'}
                    onClick={() => switchCompanionMode('carer')}
                    title="Switch to carer view — watch over mum"
                  >
                    Caring
                  </button>
                  <button
                    data-active={companionMode === 'buyer'}
                    onClick={() => switchCompanionMode('buyer')}
                    title="Switch to buyer mode — find a service near you"
                  >
                    Finding
                  </button>
                </div>
              )}

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
                <LanguagePicker lang={lang} setLang={setLang} />

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
                    className="user-name"
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

          {/* Mode toggle — mobile version, sits just below the top bar */}
          {persona === 'elder' && (
            <div className="elder-mode-toggle-mobile">
              <button
                data-active={elderMode === 'provider'}
                onClick={() => switchElderMode('provider')}
              >
                <Icon name="list" size={15} strokeWidth={elderMode === 'provider' ? 2.2 : 1.75} />
                Offering services
              </button>
              <button
                data-active={elderMode === 'buyer'}
                onClick={() => switchElderMode('buyer')}
              >
                <Icon name="search" size={15} strokeWidth={elderMode === 'buyer' ? 2.2 : 1.75} />
                Finding services
              </button>
            </div>
          )}
          {persona === 'companion' && (
            <div className="elder-mode-toggle-mobile">
              <button
                data-active={companionMode === 'carer'}
                onClick={() => switchCompanionMode('carer')}
              >
                <Icon name="heart" size={15} strokeWidth={companionMode === 'carer' ? 2.2 : 1.75} />
                Caring for mum
              </button>
              <button
                data-active={companionMode === 'buyer'}
                onClick={() => switchCompanionMode('buyer')}
              >
                <Icon name="search" size={15} strokeWidth={companionMode === 'buyer' ? 2.2 : 1.75} />
                Finding services
              </button>
            </div>
          )}

          {/* Main */}
          <main className="content-frame" key={`${persona}-${elderMode}-${companionMode}-${activeTab}`}>
            <div className="screen-wrap">{body}</div>
          </main>

          <SiteFooter />

          {/* Mobile bottom nav */}
          <nav
            className="mobile-bottom-nav"
            style={{ gridTemplateColumns: `repeat(${tabItems.length}, 1fr)` }}
          >
            {tabItems.map((it) => (
              <button
                key={it.id}
                data-active={resolvedActiveTab === it.id}
                onClick={() => onTabChange(it.id)}
              >
                <Icon
                  name={it.icon}
                  size={22}
                  strokeWidth={resolvedActiveTab === it.id ? 2.2 : 1.75}
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
