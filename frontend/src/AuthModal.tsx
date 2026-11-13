import React, { useState } from "react";
import { X, CheckCircle2, ShieldCheck, ArrowLeft, ArrowRight, Building2, User, KeyRound, Sparkles } from "lucide-react";
import { useAuth, DEMO_ACCOUNTS, UserSession } from "./auth";

type Step =
  | "choose"
  | "donor-register"
  | "donor-complete"
  | "org-step1"
  | "org-step2"
  | "org-complete"
  | "signin";

export function AuthModal({
  isOpen,
  initialStep = "choose",
  onClose,
  onComplete,
}: {
  isOpen: boolean;
  initialStep?: Step;
  onClose: () => void;
  onComplete?: (session: UserSession) => void;
}) {
  const { login, registerDonor, registerOrganization } = useAuth();
  const [step, setStep] = useState<Step>(initialStep);

  // Form states
  const [fullName, setFullName] = useState("Maya Santos");
  const [email, setEmail] = useState("maya.santos@example.com");
  const [password, setPassword] = useState("••••••••••••");
  const [orgName, setOrgName] = useState("Community Care Network");
  const [orgDesc, setOrgDesc] = useState(
    "We help local families access nutritious meals, essential supplies, and support when they need it most."
  );

  // Completed session state for display
  const [createdSession, setCreatedSession] = useState<UserSession | null>(null);

  if (!isOpen) return null;

  function handleDonorSubmit(e: React.FormEvent) {
    e.preventDefault();
    const session = registerDonor(fullName, email);
    setCreatedSession(session);
    setStep("donor-complete");
  }

  function handleOrgStep1Submit(e: React.FormEvent) {
    e.preventDefault();
    setStep("org-step2");
  }

  function handleOrgStep2Submit(e: React.FormEvent) {
    e.preventDefault();
    const session = registerOrganization(fullName, email, orgName, orgDesc);
    setCreatedSession(session);
    setStep("org-complete");
  }

  function handleQuickLogin(account: UserSession) {
    login(account);
    if (onComplete) onComplete(account);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-evergreen/60 p-4 backdrop-blur-sm overflow-y-auto">
      <div className="relative w-full max-w-md rounded-2xl bg-[#fbfcf8] p-6 shadow-2xl ring-1 ring-evergreen/15 sm:p-8 my-8">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-evergreen/10 pb-4">
          <div className="flex items-center gap-2.5 font-bold text-evergreen">
            <img src="/logo.png" alt="GiveClear" className="h-7 w-7 rounded-full object-contain shadow-sm" />
            <span className="text-body font-extrabold">GiveClear</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs font-semibold text-evergreen/60 uppercase tracking-wider">
              Secure registration
            </span>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-evergreen/50 hover:bg-evergreen/10 hover:text-evergreen"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* STEP 1: CHOOSE ACCOUNT TYPE */}
        {step === "choose" && (
          <div className="mt-6 space-y-6">
            <div className="space-y-1">
              <p className="text-xs font-bold uppercase tracking-wider text-evergreen/60">
                Welcome to GiveClear
              </p>
              <h2 className="text-hero font-extrabold text-evergreen leading-tight">
                How will you use GiveClear?
              </h2>
              <p className="text-small text-evergreen/70">
                Choose the account that's right for you.
              </p>
            </div>

            <div className="space-y-4">
              {/* Option A: Donor */}
              <div className="rounded-2xl border-2 border-evergreen/20 bg-white p-5 space-y-3 transition hover:border-evergreen">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-evergreen">
                    <User className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-body text-evergreen">I want to donate</h3>
                </div>
                <p className="text-xs text-evergreen/75 leading-relaxed">
                  Support causes as an individual and track your donations. No organization needed.
                </p>
                <button
                  onClick={() => setStep("donor-register")}
                  className="btn btn-primary w-full text-small py-2.5"
                >
                  Register as a donor
                </button>
              </div>

              {/* Option B: Organization */}
              <div className="rounded-2xl border-2 border-evergreen/20 bg-white p-5 space-y-3 transition hover:border-evergreen">
                <div className="flex items-center gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-mint text-evergreen">
                    <Building2 className="h-5 w-5" />
                  </div>
                  <h3 className="font-bold text-body text-evergreen">I represent an organization</h3>
                </div>
                <p className="text-xs text-evergreen/75 leading-relaxed">
                  Create an owner account and register your organization's name, mission, and donation drives.
                </p>
                <button
                  onClick={() => setStep("org-step1")}
                  className="btn btn-primary w-full text-small py-2.5"
                >
                  Register an organization
                </button>
              </div>
            </div>

            <div className="text-center pt-2">
              <button
                onClick={() => setStep("signin")}
                className="text-small font-semibold text-evergreen underline hover:text-passed"
              >
                Already have an account? Sign in
              </button>
            </div>
          </div>
        )}

        {/* STEP 2: DONOR REGISTER */}
        {step === "donor-register" && (
          <form onSubmit={handleDonorSubmit} className="mt-6 space-y-5">
            <div>
              <p className="text-xs font-bold text-passed mb-1">Donor account · Your details</p>
              <h2 className="text-page font-bold text-evergreen">Register as a donor</h2>
              <p className="text-xs text-evergreen/70 mt-1">
                Create a personal account to donate and follow your impact.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  className="field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Maya Santos"
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">The name on your donor profile.</p>
              </div>

              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya.santos@example.com"
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">Used to sign in and receive account updates.</p>
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="field font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">Use at least 12 characters.</p>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Create donor account
            </button>

            <div className="flex flex-col gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => setStep("signin")}
                className="font-semibold text-evergreen underline"
              >
                Already have an account? Sign in
              </button>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="btn btn-secondary py-2 text-xs"
              >
                Change account type
              </button>
            </div>
          </form>
        )}

        {/* STEP 3: DONOR COMPLETE */}
        {step === "donor-complete" && createdSession && (
          <div className="mt-6 space-y-6">
            <span className="inline-block rounded-lg bg-mint/80 px-3 py-1 text-xs font-bold text-passed">
              Donor account created
            </span>

            <div className="space-y-2">
              <h2 className="text-hero font-extrabold text-evergreen">You're ready, {createdSession.name}</h2>
              <p className="text-small text-evergreen/80">
                Your personal account is ready. Find a cause and start making a difference.
              </p>
            </div>

            <div className="rounded-xl border border-evergreen/15 bg-white p-4">
              <p className="text-[11px] font-bold uppercase tracking-wider text-evergreen/60">DONOR</p>
              <p className="text-section font-bold text-evergreen">{createdSession.name}</p>
              <p className="text-xs text-evergreen/70">{createdSession.email}</p>
            </div>

            <button
              onClick={() => {
                if (onComplete) onComplete(createdSession);
                onClose();
              }}
              className="btn btn-primary w-full"
            >
              Explore campaigns
            </button>
            <p className="text-center text-xs text-evergreen/60">
              You can update these details in your settings.
            </p>
          </div>
        )}

        {/* STEP 4: ORG STEP 1 (PERSONAL DETAILS) */}
        {step === "org-step1" && (
          <form onSubmit={handleOrgStep1Submit} className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-passed mb-1.5">
                <span>Organization · Step 1 of 2</span>
                <span className="text-evergreen/60">50%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-evergreen/10 mb-3">
                <div className="h-full bg-passed w-1/2" />
              </div>

              <h2 className="text-page font-bold text-evergreen">Your personal details</h2>
              <p className="text-xs text-evergreen/70 mt-1">
                Create your owner account, then add your organization.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Full name</label>
                <input
                  type="text"
                  className="field"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Maya Santos"
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">Your name as the account owner.</p>
              </div>

              <div>
                <label className="label">Email address</label>
                <input
                  type="email"
                  className="field"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="maya.santos@example.com"
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">Used to sign in and receive account updates.</p>
              </div>

              <div>
                <label className="label">Password</label>
                <input
                  type="password"
                  className="field font-mono"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">Use at least 12 characters.</p>
              </div>
            </div>

            <button type="submit" className="btn btn-primary w-full">
              Continue to organization
            </button>

            <div className="flex flex-col gap-2 text-center text-xs">
              <button
                type="button"
                onClick={() => setStep("signin")}
                className="font-semibold text-evergreen underline"
              >
                Already have an account? Sign in
              </button>
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="btn btn-secondary py-2 text-xs"
              >
                Change account type
              </button>
            </div>
          </form>
        )}

        {/* STEP 5: ORG STEP 2 (ORGANIZATION DETAILS) */}
        {step === "org-step2" && (
          <form onSubmit={handleOrgStep2Submit} className="mt-6 space-y-5">
            <div>
              <div className="flex items-center justify-between text-xs font-bold text-passed mb-1.5">
                <span>Step 2 of 2 · Organization</span>
                <span className="text-passed">100%</span>
              </div>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-evergreen/10 mb-3">
                <div className="h-full bg-passed w-full" />
              </div>

              <h2 className="text-page font-bold text-evergreen">Your organization</h2>
              <p className="text-xs text-evergreen/70 mt-1">
                Tell us who you represent and what your organization does.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="label">Organization name</label>
                <input
                  type="text"
                  className="field"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  placeholder="Community Care Network"
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">Use the name people know your organization by.</p>
              </div>

              <div>
                <label className="label">Organization description</label>
                <textarea
                  className="field min-h-24 py-2"
                  value={orgDesc}
                  onChange={(e) => setOrgDesc(e.target.value)}
                  placeholder="A short description of your mission and who you help."
                  required
                />
                <p className="mt-1 text-xs text-evergreen/60">A short description of your mission and who you help.</p>
              </div>

              <p className="rounded-lg bg-mint/50 p-2.5 text-xs text-evergreen font-medium">
                You'll be the account owner for this organization.
              </p>
            </div>

            <div className="space-y-2">
              <button type="submit" className="btn btn-primary w-full">
                Create organization
              </button>
              <button
                type="button"
                onClick={() => setStep("org-step1")}
                className="btn btn-secondary w-full text-xs py-2"
              >
                Back to your details
              </button>
            </div>
          </form>
        )}

        {/* STEP 6: ORG COMPLETE */}
        {step === "org-complete" && createdSession && (
          <div className="mt-6 space-y-6">
            <span className="inline-block rounded-lg bg-mint/80 px-3 py-1 text-xs font-bold text-passed">
              Organization registered
            </span>

            <div className="space-y-2">
              <h2 className="text-hero font-extrabold text-evergreen">You're ready, {createdSession.name}</h2>
              <p className="text-small text-evergreen/80">
                Your account and organization are set up. Welcome to GiveClear.
              </p>
            </div>

            <div className="rounded-xl border border-evergreen/15 bg-white p-4 space-y-3">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wider text-evergreen/60">ACCOUNT OWNER</p>
                <p className="text-body font-bold text-evergreen">{createdSession.name}</p>
                <p className="text-xs text-evergreen/70">{createdSession.email}</p>
              </div>
              <div className="border-t border-evergreen/10 pt-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-evergreen/60">ORGANIZATION</p>
                <p className="text-body font-bold text-evergreen">{createdSession.organizationName}</p>
                <p className="text-xs text-evergreen/70">{createdSession.organizationDescription}</p>
              </div>
            </div>

            <button
              onClick={() => {
                if (onComplete) onComplete(createdSession);
                onClose();
              }}
              className="btn btn-primary w-full"
            >
              Go to organization
            </button>
            <p className="text-center text-xs text-evergreen/60">
              You can update these details in your settings.
            </p>
          </div>
        )}

        {/* STEP 7: SIGN IN VIEW */}
        {step === "signin" && (
          <div className="mt-6 space-y-5">
            <div>
              <h2 className="text-page font-bold text-evergreen">Sign in to GiveClear</h2>
              <p className="text-xs text-evergreen/70 mt-1">
                Choose an account or sign in with your credentials.
              </p>
            </div>

            {/* 1-Click Fast Logins */}
            <div className="space-y-2">
              <p className="text-xs font-bold text-evergreen/70 flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-wait" />
                Select Account to Sign In:
              </p>
              <div className="space-y-2">
                {DEMO_ACCOUNTS.map((acc) => (
                  <button
                    key={acc.id}
                    onClick={() => handleQuickLogin(acc)}
                    className="flex w-full items-center justify-between rounded-xl border border-evergreen/20 bg-white p-3 text-left transition hover:border-passed hover:bg-mint/20"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        {acc.role === "organization" ? (
                          <span className="rounded bg-mint px-1.5 py-0.5 text-[10px] font-bold text-evergreen">
                            ORGANIZATION
                          </span>
                        ) : (
                          <span className="rounded bg-paper px-1.5 py-0.5 text-[10px] font-bold text-evergreen">
                            DONOR
                          </span>
                        )}
                        <span className="font-bold text-small text-evergreen">
                          {acc.organizationName || acc.name}
                        </span>
                      </div>
                      <p className="text-xs text-evergreen/60 mt-0.5">
                        {acc.name} · {acc.email}
                      </p>
                    </div>
                    <ArrowRight className="h-4 w-4 text-evergreen/40" />
                  </button>
                ))}
              </div>
            </div>

            <div className="border-t border-evergreen/10 pt-3 text-center">
              <button
                type="button"
                onClick={() => setStep("choose")}
                className="text-small font-semibold text-evergreen underline hover:text-passed"
              >
                Don't have an account? Register now
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

