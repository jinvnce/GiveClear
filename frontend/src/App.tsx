import { useCallback, useEffect, useMemo, useState } from "react";
import { Building2, HeartHandshake, Loader2, ShieldCheck, Smartphone } from "lucide-react";
import { Campaign, loadCampaigns } from "./chain";
import { useWallet } from "./wallet";
import { Banner, Notice } from "./ui";
import { OrganizerPage } from "./OrganizerPage";
import { useAuth } from "./auth";
import { AuthModal } from "./AuthModal";
import { OnboardingModal } from "./OnboardingModal";
import { DonorMobileView } from "./DonorMobileView";
import { OrganizerMobileView } from "./OrganizerMobileView";

type View = { name: "donor" } | { name: "organizer" };

export default function App() {
  const wallet = useWallet();
  const { user, logout } = useAuth();
  const [view, setView] = useState<View>({ name: "donor" });
  const [campaigns, setCampaigns] = useState<Campaign[] | null>(null);
  const [error, setError] = useState("");

  // Auth modal controls
  const [showAuth, setShowAuth] = useState(false);
  const [authStep, setAuthStep] = useState<"choose" | "signin" | "org-step1">("choose");

  // Onboarding walkthrough controls
  const [showOnboarding, setShowOnboarding] = useState(() => {
    return !localStorage.getItem("giveclear_onboarding_seen");
  });

  const refresh = useCallback(async () => {
    try {
      setCampaigns(await loadCampaigns());
      setError("");
    } catch {
      setError("We could not load campaigns. Check your connection and the contract address in the .env file, then reload.");
    }
  }, []);
  useEffect(() => {
    refresh();
  }, [refresh]);

  const navBtn = (active: boolean) => `btn ${active ? "btn-primary" : "btn-secondary"}`;

  function handleOpenOrganizer() {
    if (!user || user.role !== "organization") {
      setAuthStep("org-step1");
      setShowAuth(true);
    }
    setView({ name: "organizer" });
  }

  return (
    <>
      <Banner />
      <header className="border-b border-evergreen/10 bg-white">
        <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-3 px-5 py-3">
          <button onClick={() => setView({ name: "donor" })} className="flex min-h-12 items-center gap-2.5 text-section font-extrabold text-evergreen" aria-label="GiveClear home">
            <img src="/logo.png" alt="GiveClear" className="h-8 w-8 rounded-full object-contain shadow-sm" />
            <span>GiveClear</span>
          </button>
          <nav aria-label="Main" className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setShowOnboarding(true)}
              className="btn btn-secondary text-xs py-2 px-3"
              title="How it works"
            >
              How it works
            </button>
            <button
              className={navBtn(view.name === "donor")}
              onClick={() => setView({ name: "donor" })}
              aria-current={view.name === "donor" ? "page" : undefined}
            >
              <Smartphone aria-hidden className="h-4 w-4" />
              Donor App
            </button>
            <button
              className={navBtn(view.name === "organizer")}
              onClick={handleOpenOrganizer}
              aria-current={view.name === "organizer" ? "page" : undefined}
            >
              <Building2 aria-hidden className="h-4 w-4" />
              Organizer App
            </button>

            {/* Auth Session Indicator / Sign In Button */}
            {user ? (
              <div className="flex items-center gap-2 rounded-xl bg-paper px-3 py-1.5 border border-evergreen/15 text-xs">
                <div className="flex items-center gap-1.5">
                  {user.role === "organization" ? (
                    <span className="rounded bg-mint px-1.5 py-0.5 text-[10px] font-bold text-evergreen">ORG</span>
                  ) : (
                    <span className="rounded bg-white px-1.5 py-0.5 text-[10px] font-bold text-evergreen">DONOR</span>
                  )}
                  <span className="font-bold text-evergreen truncate max-w-[130px]">
                    {user.organizationName || user.name}
                  </span>
                </div>
                <button
                  onClick={logout}
                  className="ml-1 text-[11px] font-semibold text-attention hover:underline"
                  title="Sign out"
                >
                  Sign out
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthStep("choose");
                  setShowAuth(true);
                }}
                className="btn btn-secondary text-xs py-2 px-3"
              >
                Sign in / Register
              </button>
            )}
          </nav>
        </div>
      </header>

      <main className="mx-auto max-w-[1120px] px-3 py-6">
        {error && <Notice kind="error" title="Could not load">{error}</Notice>}
        {!campaigns && !error && (
          <p className="flex items-center justify-center gap-2 py-12"><Loader2 aria-hidden className="h-5 w-5 animate-spin" /> Loading GiveClear...</p>
        )}

        {/* DONOR MOBILE VIEW: 402px Phone Layout Matching Figma */}
        {view.name === "donor" && campaigns && (
          <div className="flex justify-center">
            <DonorMobileView
              campaigns={campaigns}
              wallet={wallet}
              onCampaignUpdated={refresh}
              onSwitchToOrganizer={handleOpenOrganizer}
              onOpenAuth={() => {
                setAuthStep("choose");
                setShowAuth(true);
              }}
            />
          </div>
        )}

        {/* Organization / Admin Side: 402px Mobile Admin Matching Figma */}
        {view.name === "organizer" && campaigns && (
          <div className="flex justify-center">
            <OrganizerMobileView
              campaigns={campaigns}
              wallet={wallet}
              onChanged={refresh}
              onOpenAuth={() => {
                setAuthStep("org-step1");
                setShowAuth(true);
              }}
            />
          </div>
        )}
      </main>

      {/* Registration & Login Modal */}
      <AuthModal
        isOpen={showAuth}
        initialStep={authStep}
        onClose={() => setShowAuth(false)}
        onComplete={(session) => {
          if (session.role === "organization") {
            setView({ name: "organizer" });
          } else {
            setView({ name: "donor" });
          }
        }}
      />

      {/* 3-Step Onboarding Walkthrough */}
      <OnboardingModal
        isOpen={showOnboarding}
        onClose={() => {
          setShowOnboarding(false);
          localStorage.setItem("giveclear_onboarding_seen", "true");
        }}
        onGetStarted={() => {
          setShowOnboarding(false);
          localStorage.setItem("giveclear_onboarding_seen", "true");
          setAuthStep("choose");
          setShowAuth(true);
        }}
      />
    </>
  );
}
