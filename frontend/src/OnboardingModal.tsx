import React, { useState } from "react";
import { Check, ArrowRight, X } from "lucide-react";

interface OnboardingProps {
  isOpen: boolean;
  onClose: () => void;
  onGetStarted: () => void;
}

export function OnboardingModal({ isOpen, onClose, onGetStarted }: OnboardingProps) {
  const [slide, setSlide] = useState<number>(1);

  if (!isOpen) return null;

  function handleSkip() {
    onClose();
    onGetStarted();
  }

  function handleFinish() {
    onClose();
    onGetStarted();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-evergreen/75 p-3 backdrop-blur-md overflow-y-auto">
      <div className="relative w-full max-w-[420px] rounded-3xl bg-[#fbfcf8] p-6 sm:p-7 shadow-2xl ring-1 ring-evergreen/15 my-6 flex flex-col justify-between min-h-[640px]">
        {/* Top App Header */}
        <div className="flex items-center justify-between border-b border-evergreen/10 pb-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="GiveClear" className="h-6 w-6 rounded-full object-contain" />
            <span className="font-extrabold text-evergreen text-body">GiveClear</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-[11px] font-semibold text-evergreen/60 uppercase tracking-wider">
              Give with confidence
            </span>
            <button
              onClick={handleSkip}
              className="text-xs font-bold text-evergreen/80 hover:text-evergreen hover:underline"
            >
              Skip
            </button>
          </div>
        </div>

        {/* SLIDE 1: TRANSPARENT */}
        {slide === 1 && (
          <div className="py-4 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-evergreen/60">
                01 · TRANSPARENT
              </p>
              <h2 className="text-hero font-extrabold text-evergreen leading-tight">
                Know where your giving goes.
              </h2>
              <p className="text-small text-evergreen/75 leading-relaxed">
                See recorded spending, supplier payments, and receipts in one clear view.
              </p>
            </div>

            {/* Example Card 1 */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-evergreen/50">
                EXAMPLE · HOW IT WORKS
              </p>
              <div className="rounded-2xl border border-evergreen/15 bg-white p-5 shadow-sm space-y-3">
                <div>
                  <p className="text-xs text-evergreen/70">Recorded spending</p>
                  <p className="text-hero font-black text-evergreen">18,000</p>
                  <p className="text-xs text-evergreen/60 font-medium">mUSD · confirmed payments</p>
                </div>
                <div className="space-y-1.5 border-t border-evergreen/10 pt-3 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-evergreen">9,600 mUSD · Food pack essentials</span>
                  </div>
                  <div className="flex items-center justify-between text-evergreen/70">
                    <span>8,400 mUSD · Other payments</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Pagination & Next Button */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-6 rounded-full bg-evergreen" />
                  <span className="h-1.5 w-1.5 rounded-full bg-evergreen/20" />
                  <span className="h-1.5 w-1.5 rounded-full bg-evergreen/20" />
                </div>
                <span className="text-xs text-evergreen/60 font-medium">1 of 3</span>
              </div>

              <button
                type="button"
                onClick={() => setSlide(2)}
                className="btn btn-primary w-full text-small font-bold py-3"
              >
                Next
              </button>
            </div>
          </div>
        )}

        {/* SLIDE 2: VERIFIED */}
        {slide === 2 && (
          <div className="py-4 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-evergreen/60">
                02 · VERIFIED
              </p>
              <h2 className="text-hero font-extrabold text-evergreen leading-tight">
                Backed by real evidence.
              </h2>
              <p className="text-small text-evergreen/75 leading-relaxed">
                Review receipts checked against recorded amounts and eligible items.
              </p>
            </div>

            {/* Example Card 2 */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-evergreen/50">
                EXAMPLE · HOW IT WORKS
              </p>
              <div className="rounded-2xl border border-evergreen/15 bg-white p-5 shadow-sm space-y-3">
                <div>
                  <p className="text-small font-bold text-evergreen">Food pack essentials</p>
                  <p className="text-page font-black text-evergreen">9,600 mUSD</p>
                  <p className="text-xs text-evergreen/70">Rice & cooking oil</p>
                  <p className="text-[11px] text-evergreen/50">Receipt #018 · 12 Nov 2026</p>
                </div>

                <div className="rounded-xl bg-mint/50 px-3 py-2 text-xs font-bold text-passed flex items-center gap-1.5">
                  <Check className="h-4 w-4" />
                  Receipt details match
                </div>

                <div className="text-[11px] text-evergreen/75 space-y-0.5 border-t border-evergreen/10 pt-2">
                  <p className="font-bold text-passed">Amount matched · Items eligible</p>
                  <p className="text-evergreen/60">Open the receipt to see the evidence behind the payment.</p>
                </div>
              </div>
            </div>

            {/* Pagination & Navigation */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-evergreen/20" />
                  <span className="h-1.5 w-6 rounded-full bg-evergreen" />
                  <span className="h-1.5 w-1.5 rounded-full bg-evergreen/20" />
                </div>
                <span className="text-xs text-evergreen/60 font-medium">2 of 3</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSlide(1)}
                  className="btn btn-secondary text-small font-bold py-3"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={() => setSlide(3)}
                  className="btn btn-primary text-small font-bold py-3"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}

        {/* SLIDE 3: TRACKABLE */}
        {slide === 3 && (
          <div className="py-4 space-y-4 flex-1 flex flex-col justify-between">
            <div className="space-y-2">
              <p className="text-xs font-bold uppercase tracking-wider text-evergreen/60">
                03 · TRACKABLE
              </p>
              <h2 className="text-hero font-extrabold text-evergreen leading-tight">
                Follow your gift, step by step.
              </h2>
              <p className="text-small text-evergreen/75 leading-relaxed">
                Trace donations through payment records and supporting receipts.
              </p>
            </div>

            {/* Example Card 3 */}
            <div className="space-y-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-evergreen/50">
                EXAMPLE · HOW IT WORKS
              </p>
              <div className="rounded-2xl border border-evergreen/15 bg-white p-5 shadow-sm space-y-3">
                <p className="text-small font-bold text-evergreen">Your donation journey</p>

                <div className="space-y-2 text-xs">
                  <div>
                    <div className="rounded-lg bg-mint/40 px-2.5 py-1 text-passed font-bold flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Donation received
                    </div>
                    <p className="text-[11px] text-evergreen/60 pl-2 pt-0.5">Payment confirmation recorded</p>
                  </div>

                  <div>
                    <div className="rounded-lg bg-mint/40 px-2.5 py-1 text-passed font-bold flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Supplier paid
                    </div>
                    <p className="text-[11px] text-evergreen/60 pl-2 pt-0.5">Transaction recorded on BSC</p>
                  </div>

                  <div>
                    <div className="rounded-lg bg-mint/40 px-2.5 py-1 text-passed font-bold flex items-center gap-1.5">
                      <Check className="h-3.5 w-3.5" />
                      Receipt available
                    </div>
                    <p className="text-[11px] text-evergreen/60 pl-2 pt-0.5">Supporting evidence ready to view</p>
                  </div>
                </div>

                <p className="text-[11px] text-evergreen/70 border-t border-evergreen/10 pt-2 italic">
                  One clear trail from giving to spending.
                </p>
              </div>
            </div>

            {/* Pagination & Get Started Button */}
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between">
                <div className="flex gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-evergreen/20" />
                  <span className="h-1.5 w-1.5 rounded-full bg-evergreen/20" />
                  <span className="h-1.5 w-6 rounded-full bg-evergreen" />
                </div>
                <span className="text-xs text-evergreen/60 font-medium">3 of 3</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSlide(2)}
                  className="btn btn-secondary text-small font-bold py-3"
                >
                  Back
                </button>
                <button
                  type="button"
                  onClick={handleFinish}
                  className="btn btn-primary text-small font-bold py-3"
                >
                  Get started
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

