import React, { useState } from 'react';
import {
  GraduationCap,
  Briefcase,
  Layers,
  ArrowRight,
  Check,
  Lock,
  X,
} from 'lucide-react';
import { useAuthStore } from '@/store/useAuthStore';

export const OnboardingWizard: React.FC = () => {
  const { isOnboardingOpen, setOnboardingOpen, completeOnboarding } = useAuthStore();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [selectedRole, setSelectedRole] = useState<'student' | 'pro' | 'hybrid'>('student');
  const [selectedAccounts, setSelectedAccounts] = useState<string[]>(['google', 'microsoft']);

  if (!isOnboardingOpen) return null;

  const handleNext = () => {
    if (step < 3) {
      setStep((prev) => (prev + 1) as 1 | 2 | 3);
    } else {
      completeOnboarding({
        role: selectedRole,
        primaryAccount: selectedAccounts[0] || 'google',
      });
    }
  };

  const toggleAccountChoice = (key: string) => {
    setSelectedAccounts((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-[#0f1626] border border-border/80 rounded-3xl max-w-xl w-full p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Subtle accent backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 bg-sky-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header & Step progress */}
        <div className="flex items-center justify-between pb-4 border-b border-border/40">
          <div>
            <span className="text-[11px] font-mono text-primary uppercase tracking-wider font-semibold">
              Step {step} of 3 &middot; Quick Setup
            </span>
            <h3 className="font-heading font-bold text-xl text-white mt-0.5">
              Welcome to UnifyHub
            </h3>
          </div>

          <button
            onClick={() => setOnboardingOpen(false)}
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Step 1: Select Role */}
        {step === 1 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-heading font-semibold text-base text-foreground">
                How will you primarily use UnifyHub?
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                We will optimize your dashboard views, deadlines, and smart reminders accordingly.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole('student')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedRole === 'student'
                    ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50'
                    : 'border-border/60 bg-card/40 hover:bg-card'
                }`}
              >
                <div className="p-2 rounded-xl bg-sky-500/20 text-sky-400 w-fit mb-3">
                  <GraduationCap className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Student</h5>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Classroom assignments, course exams & timetables.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('pro')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedRole === 'pro'
                    ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50'
                    : 'border-border/60 bg-card/40 hover:bg-card'
                }`}
              >
                <div className="p-2 rounded-xl bg-indigo-500/20 text-indigo-400 w-fit mb-3">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Professional</h5>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Meetings, GitHub issues, Outlook & client emails.
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedRole('hybrid')}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  selectedRole === 'hybrid'
                    ? 'border-sky-500 bg-sky-500/10 ring-1 ring-sky-500/50'
                    : 'border-border/60 bg-card/40 hover:bg-card'
                }`}
              >
                <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 w-fit mb-3">
                  <Layers className="w-5 h-5" />
                </div>
                <div>
                  <h5 className="font-heading font-bold text-sm text-foreground">Hybrid</h5>
                  <p className="text-[11px] text-muted-foreground mt-1 leading-snug">
                    Full personal, university & work combination.
                  </p>
                </div>
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Connect Accounts */}
        {step === 2 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-heading font-semibold text-base text-foreground">
                Connect your primary daily platforms
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                All providers use read-only OAuth tokens. You can add or pause accounts anytime.
              </p>
            </div>

            <div className="space-y-2.5">
              {[
                { key: 'google', name: 'Google Workspace & Classroom', desc: 'Gmail, Calendar, Drive, and Classroom assignments' },
                { key: 'microsoft', name: 'Microsoft 365 & Outlook', desc: 'University Outlook mail, Calendar, and Teams meetings' },
                { key: 'canvas', name: 'Canvas / Moodle LMS', desc: 'Course assignments, due dates, and grade notices' },
                { key: 'github', name: 'GitHub & Developer Tools', desc: 'Assigned issues, PR reviews, and milestones' },
              ].map((provider) => {
                const isSelected = selectedAccounts.includes(provider.key);

                return (
                  <button
                    key={provider.key}
                    type="button"
                    onClick={() => toggleAccountChoice(provider.key)}
                    className={`w-full p-3.5 rounded-2xl border flex items-center justify-between text-left transition-all cursor-pointer ${
                      isSelected
                        ? 'border-sky-500/60 bg-sky-500/10 shadow-sm'
                        : 'border-border/50 bg-card/30 hover:bg-card/70'
                    }`}
                  >
                    <div>
                      <h5 className="font-heading font-semibold text-sm text-foreground">
                        {provider.name}
                      </h5>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        {provider.desc}
                      </p>
                    </div>

                    <div
                      className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 ${
                        isSelected
                          ? 'bg-sky-500 border-sky-500 text-slate-950 font-bold'
                          : 'border-border text-transparent'
                      }`}
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 3: Default Workspaces Confirmation */}
        {step === 3 && (
          <div className="space-y-4">
            <div>
              <h4 className="font-heading font-semibold text-base text-foreground">
                Your Saved Workspaces Are Ready
              </h4>
              <p className="text-xs text-muted-foreground mt-1">
                UnifyHub has pre-configured 4 views so you can focus without tab switching:
              </p>
            </div>

            <div className="space-y-2 font-mono text-xs">
              <div className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-sky-400" />
                  All Combined (Full master stream)
                </span>
                <span className="text-muted-foreground">Enabled</span>
              </div>
              <div className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-amber-400" />
                  College & Courses (Canvas + University Outlook)
                </span>
                <span className="text-muted-foreground">Enabled</span>
              </div>
              <div className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-indigo-400" />
                  Tech Work (GitHub + Work Calendar)
                </span>
                <span className="text-muted-foreground">Enabled</span>
              </div>
              <div className="p-3 rounded-xl bg-card/40 border border-border/40 flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-400" />
                  Personal Life (Personal Gmail + Flights/Bills)
                </span>
                <span className="text-muted-foreground">Enabled</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2">
              <Lock className="w-4 h-4 shrink-0" />
              <span>Read-only permissions active. You can customize workspaces anytime.</span>
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="flex items-center justify-between pt-4 border-t border-border/40">
          {step > 1 ? (
            <button
              onClick={() => setStep((prev) => (prev - 1) as 1 | 2 | 3)}
              className="text-xs font-mono text-muted-foreground hover:text-foreground cursor-pointer"
            >
              Back
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNext}
            className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-medium text-xs flex items-center gap-2 hover:bg-primary/90 transition-all cursor-pointer"
          >
            <span>{step === 3 ? 'Launch Command Center' : 'Continue'}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
