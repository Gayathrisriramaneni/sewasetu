import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { Footer } from './components/Footer';
import { AccessibilityToolbar, TextSize } from './components/AccessibilityToolbar';
import { HomeView } from './views/HomeView';
import { ApplyWizardView } from './views/ApplyWizardView';
import { ConfirmationView } from './views/ConfirmationView';
import { StatusLoginView } from './views/StatusLoginView';
import { ApplicationDetailView } from './views/ApplicationDetailView';
import { ResetPasswordView } from './views/ResetPasswordView';
import { AdminLoginView } from './views/AdminLoginView';
import { AdminDashboardView } from './views/AdminDashboardView';
import { AdminListView } from './views/AdminListView';
import { AdminDetailView } from './views/AdminDetailView';
import { AboutView } from './views/AboutView';
import { StaticInfoView } from './views/StaticInfoView';
import { GatewayView } from './views/GatewayView';
import { EvalDashboardView } from './views/EvalDashboardView';
import { store } from './data/store';
import { Application } from './types';
import { Language, translations } from './services/localization';
import { MessageSquare, X, Shield, RefreshCw } from 'lucide-react';

export const App: React.FC = () => {
  const [currentRoute, setCurrentRoute] = useState<string>(() => {
    return window.location.pathname || '/';
  });

  const [submittedApp, setSubmittedApp] = useState<{ appNo: string; appId: number } | null>(null);
  const [loggedCitizenApp, setLoggedCitizenApp] = useState<Application | null>(null);
  const [adminLoggedIn, setAdminLoggedIn] = useState<boolean>(false);
  const [showSmsModal, setShowSmsModal] = useState<boolean>(false);
  const [unreadSmsCount, setUnreadSmsCount] = useState<number>(0);
  const [applicationsCount, setApplicationsCount] = useState<number>(() => store.getApplications().length);

  // Accessibility & Multi-persona state
  const [textSize, setTextSize] = useState<TextSize>('normal');
  const [highContrast, setHighContrast] = useState<boolean>(false);
  const [language, setLanguage] = useState<Language>('en');
  const [kioskMode, setKioskMode] = useState<boolean>(false);

  // Apply high-contrast class to body
  useEffect(() => {
    if (highContrast) {
      document.body.classList.add('high-contrast');
    } else {
      document.body.classList.remove('high-contrast');
    }
  }, [highContrast]);

  // Sync route on popstate
  useEffect(() => {
    const onPopState = () => {
      setCurrentRoute(window.location.pathname || '/');
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  // Update counts on store changes
  useEffect(() => {
    const updateStats = () => {
      setApplicationsCount(store.getApplications().length);
      const msgs = store.getSmsMessages();
      setUnreadSmsCount(msgs.length);
    };

    updateStats();
    const unsubscribe = store.subscribe(updateStats);
    return () => unsubscribe();
  }, []);

  const navigate = (route: string) => {
    setCurrentRoute(route);
    try {
      window.history.pushState({}, '', route);
    } catch {
      // fallback
    }
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleApplicationSuccess = (appNo: string, appId: number) => {
    setSubmittedApp({ appNo, appId });
    navigate(`/confirmation?id=${appId}`);
  };

  // CSC Kiosk / Family Helper: One-click session cleanup to prevent data leakage
  const handleClearSession = () => {
    if (window.confirm("Clear active citizen session? This resets all draft inputs and verified sessions to protect the citizen's privacy.")) {
      setLoggedCitizenApp(null);
      setSubmittedApp(null);
      navigate('/');
      alert("Session data cleared successfully. Safe for next citizen.");
    }
  };

  const renderContent = () => {
    // 0. Evaluation Dashboard route
    if (currentRoute === '/eval-dashboard' || currentRoute === '/eval-dashboard/' || currentRoute === '/eval') {
      return <EvalDashboardView navigate={navigate} />;
    }

    // 1. Gateway route
    if (currentRoute === '/__gateway' || currentRoute === '/__gateway/' || currentRoute === '/gateway') {
      return <GatewayView onBack={() => navigate('/')} />;
    }

    // 2. Confirmation route
    if (currentRoute.startsWith('/confirmation')) {
      const urlParams = new URLSearchParams(window.location.search);
      const idFromUrl = urlParams.get('id');
      const appId = submittedApp?.appId || (idFromUrl ? parseInt(idFromUrl, 10) : 1);
      const app = store.getApplicationById(appId);
      const appNo = submittedApp?.appNo || app?.application_no || 'SSP26000000';

      return (
        <ConfirmationView
          appNo={appNo}
          appId={appId}
          navigate={navigate}
        />
      );
    }

    // 3. Apply route
    if (currentRoute === '/apply' || currentRoute.startsWith('/form') || currentRoute === '/verify' || currentRoute === '/upload' || currentRoute === '/declaration') {
      return (
        <ApplyWizardView
          navigate={navigate}
          onSuccess={handleApplicationSuccess}
          language={language}
          onResetDraft={handleClearSession}
        />
      );
    }

    // 4. Status portal login
    if (currentRoute === '/status') {
      return (
        <StatusLoginView
          navigate={navigate}
          onLoginSuccess={(app) => {
            setLoggedCitizenApp(app);
          }}
        />
      );
    }

    // 5. Reset password
    if (currentRoute === '/status/reset') {
      return <ResetPasswordView navigate={navigate} />;
    }

    // 6. View application by ID (citizen) with authorization checks
    if (currentRoute.startsWith('/application/')) {
      const idStr = currentRoute.replace('/application/', '').split('?')[0];
      const appId = parseInt(idStr, 10);

      // Enforce ownership & authorization using mobile (primary) or email
      const citizenIdentity = loggedCitizenApp?.mobile || loggedCitizenApp?.email;
      const authResult = store.getApplicationByIdAuthorized(appId, citizenIdentity, adminLoggedIn);

      if (!authResult.success || !authResult.application) {
        return (
          <div className="space-y-4">
            <div className="flash-msg">
              {authResult.error || "Application record not found or access denied."}
            </div>
            <p className="text-xs text-slate-600">
              For security and confidentiality under data protection rules, citizens can only view their own registered application.
            </p>
            <button onClick={() => navigate('/status')} className="btn-gov">
              Back to Status Login
            </button>
          </div>
        );
      }

      return (
        <ApplicationDetailView
          application={authResult.application}
          onLogout={() => {
            setLoggedCitizenApp(null);
            navigate('/status');
          }}
          navigate={navigate}
        />
      );
    }

    // 7. Admin Login
    if (currentRoute === '/admin') {
      if (adminLoggedIn) {
        return <AdminDashboardView navigate={navigate} onLogout={() => setAdminLoggedIn(false)} />;
      }
      return (
        <AdminLoginView
          onLoginSuccess={() => setAdminLoggedIn(true)}
          navigate={navigate}
        />
      );
    }

    // 8. Admin Dashboard
    if (currentRoute === '/admin/dashboard') {
      if (!adminLoggedIn) {
        return (
          <AdminLoginView
            onLoginSuccess={() => setAdminLoggedIn(true)}
            navigate={navigate}
          />
        );
      }
      return (
        <AdminDashboardView
          navigate={navigate}
          onLogout={() => {
            setAdminLoggedIn(false);
            navigate('/admin');
          }}
        />
      );
    }

    // 9. Admin Applications List
    if (currentRoute.startsWith('/admin/applications')) {
      if (!adminLoggedIn) {
        return (
          <AdminLoginView
            onLoginSuccess={() => setAdminLoggedIn(true)}
            navigate={navigate}
          />
        );
      }
      const searchParams = new URLSearchParams(window.location.search);
      const statusParam = searchParams.get('status') || 'PENDING';
      return <AdminListView initialStatus={statusParam} navigate={navigate} />;
    }

    // 10. Admin View Application Detail
    if (currentRoute.startsWith('/admin/application/')) {
      if (!adminLoggedIn) {
        return (
          <AdminLoginView
            onLoginSuccess={() => setAdminLoggedIn(true)}
            navigate={navigate}
          />
        );
      }
      const idStr = currentRoute.replace('/admin/application/', '').split('?')[0];
      const appId = parseInt(idStr, 10);
      return <AdminDetailView appId={appId} navigate={navigate} />;
    }

    // 11. About page
    if (currentRoute === '/about') {
      return <AboutView navigate={navigate} />;
    }

    // 12. Static info pages
    if (currentRoute === '/rti') {
      return <StaticInfoView type="rti" navigate={navigate} />;
    }
    if (currentRoute === '/grievance') {
      return <StaticInfoView type="grievance" navigate={navigate} />;
    }
    if (currentRoute === '/pension-rules') {
      return <StaticInfoView type="rules" navigate={navigate} />;
    }
    if (currentRoute === '/contact') {
      return <StaticInfoView type="contact" navigate={navigate} />;
    }

    // Default: HomeView
    return (
      <HomeView
        navigate={navigate}
        applicationsCount={applicationsCount}
      />
    );
  };

  const textScaleClass =
    textSize === 'xlarge'
      ? 'text-scale-xlarge'
      : textSize === 'large'
      ? 'text-scale-large'
      : 'text-scale-normal';

  return (
    <div className={`min-h-screen flex flex-col justify-between ${textScaleClass}`}>
      <div>
        {/* Top Accessibility & Kiosk Toolbar */}
        <AccessibilityToolbar
          textSize={textSize}
          setTextSize={setTextSize}
          highContrast={highContrast}
          setHighContrast={setHighContrast}
          language={language}
          setLanguage={setLanguage}
          kioskMode={kioskMode}
          setKioskMode={setKioskMode}
          onClearSession={handleClearSession}
        />

        {/* CSC Kiosk Warning Banner */}
        {kioskMode && (
          <div className="bg-amber-500 text-slate-950 px-4 py-1.5 text-xs font-semibold flex items-center justify-between border-b border-amber-600">
            <div className="flex items-center gap-2 max-w-[1000px] mx-auto w-full">
              <Shield className="w-4 h-4 shrink-0" />
              <span>{translations[language].kioskBanner}</span>
              <button
                type="button"
                onClick={handleClearSession}
                className="ml-auto bg-slate-900 text-white hover:bg-black px-2.5 py-0.5 rounded text-[11px] font-bold cursor-pointer"
              >
                {translations[language].clearKioskSession}
              </button>
            </div>
          </div>
        )}

        <Header
          currentRoute={currentRoute}
          navigate={navigate}
          unreadSmsCount={unreadSmsCount}
          openSmsConsole={() => setShowSmsModal(true)}
          adminLoggedIn={adminLoggedIn}
        />

        <main className="portal-container" id="main-content" tabIndex={-1}>
          {renderContent()}
        </main>
      </div>

      <Footer navigate={navigate} />

      {/* Floating quick button to open SMS gateway console */}
      <button
        onClick={() => setShowSmsModal(true)}
        className="fixed bottom-4 right-4 z-40 bg-amber-500 hover:bg-amber-600 text-slate-900 font-bold px-3 py-2 rounded-full shadow-lg flex items-center gap-2 border-2 border-amber-600 transition-all cursor-pointer text-xs"
        title="View simulated Message Gateway inbox & OTPs"
      >
        <MessageSquare className="w-4 h-4 text-slate-950" />
        <span>Message Inbox</span>
        {unreadSmsCount > 0 && (
          <span className="bg-slate-900 text-amber-300 px-1.5 py-0.2 rounded-full text-[10px]">
            {unreadSmsCount}
          </span>
        )}
      </button>

      {/* SMS Gateway Modal Drawer */}
      {showSmsModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-3 sm:p-6 backdrop-blur-xs">
          <div className="bg-white rounded-lg shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden border border-slate-300">
            <div className="bg-[#1a3c6e] text-white px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-amber-400" />
                <span>PurvSMS Gateway Console (Live Simulation)</span>
              </div>
              <button
                onClick={() => setShowSmsModal(false)}
                className="text-white/80 hover:text-white p-1 rounded hover:bg-white/10 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto">
              <GatewayView isModal={true} />
            </div>

            <div className="bg-slate-100 px-4 py-2 text-right border-t border-slate-200">
              <button
                onClick={() => setShowSmsModal(false)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded text-xs font-semibold hover:bg-slate-900 cursor-pointer"
              >
                Close Console
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
