import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { TextInput } from "@/components/auth/TextInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { OtpBoxes } from "@/components/auth/OtpBoxes";
import { PrimaryButton, GhostButton } from "@/components/auth/Button";
import { Banner } from "@/components/auth/Banner";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { StrengthMeter } from "@/components/auth/StrengthMeter";
import { EMAIL_RE, evaluatePassword } from "@/utils/validators";
import {
  forgotPassword,
  verifyResetOtp,
  resendOtp,
  resetPassword,
} from "@/api/authApi";

const CODE_TTL_SECONDS = 90;
const RESEND_COOLDOWN_SECONDS = 30;

const STEPS = ["Email", "Code", "New password", "Done"];

function ForgotPasswordPage() {
  const navigate = useNavigate();
  const emailRef = useRef(null);

  const [step, setStep] = useState(0);
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const [errors, setErrors] = useState({});
  const [banner, setBanner] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(CODE_TTL_SECONDS);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);
  const [invalidOtp, setInvalidOtp] = useState(false);

  useEffect(() => {
    if (step === 0) emailRef.current?.focus();
  }, [step]);

  useEffect(() => {
    if (step !== 1 || expiresIn <= 0) return;
    const t = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, expiresIn]);

  useEffect(() => {
    if (step !== 1 || resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [step, resendIn]);

  const pwEval = useMemo(() => evaluatePassword(password), [password]);

  const submitEmail = async (ev) => {
    ev.preventDefault();
    setBanner(null);
    const e = {};
    if (!email) e.email = "Email address is required";
    else if (!EMAIL_RE.test(email))
      e.email = "Please enter a valid email address";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const res = await forgotPassword({ email });
    setLoading(false);
    if (!res.ok) {
      setErrors({ email: res.message });
      return;
    }
    setExpiresIn(CODE_TTL_SECONDS);
    setResendIn(RESEND_COOLDOWN_SECONDS);
    setStep(1);
    toast.success(`Recovery code sent to ${email}.`);
  };

  const submitOtp = async (finalCode) => {
    const c = finalCode ?? code;
    if (c.length !== 6) return;
    setBanner(null);
    setInvalidOtp(false);
    setLoading(true);
    const res = await verifyResetOtp({ email, code: c });
    setLoading(false);
    if (res.ok) {
      setStep(2);
      return;
    }
    setInvalidOtp(true);
    setBanner({
      tone: "error",
      title: res.error === "expired" ? "Code has expired" : "Incorrect code",
      description:
        res.error === "expired"
          ? "Request a new code to continue."
          : "Please re-check the six digits.",
    });
  };

  const doResend = async () => {
    setResending(true);
    setBanner(null);
    setInvalidOtp(false);
    setCode("");
    const res = await resendOtp({ email });
    setResending(false);
    if (res.ok) {
      setExpiresIn(CODE_TTL_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      toast.success("New code sent.");
    }
  };

  const submitReset = async (ev) => {
    ev.preventDefault();
    setBanner(null);
    const e = {};
    if (!password) e.password = "Password is required";
    else if (!pwEval.allPassed) e.password = "Password is too weak";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    setErrors(e);
    if (Object.keys(e).length) return;
    setLoading(true);
    const res = await resetPassword({ email, code, password });
    setLoading(false);
    if (!res.ok) {
      setBanner({ tone: "error", title: res.message });
      return;
    }
    setStep(3);
    toast.success("Password reset. You can now sign in.");
    setTimeout(() => navigate("/login"), 1400);
  };

  const mm = String(Math.floor(expiresIn / 60)).padStart(2, "0");
  const ss = String(expiresIn % 60).padStart(2, "0");

  return (
    <AuthLayout sideLabel="RECOVER ACCESS">
      <div className="mb-8" aria-label="Recovery progress">
        <ol
          className="flex flex-wrap items-center gap-x-3 gap-y-2 font-mono-label text-ink-muted"
          data-testid="fp-progress"
        >
          {STEPS.map((label, i) => (
            <li key={label} className="flex items-center gap-3">
              <span
                className={`inline-flex h-5 w-5 items-center justify-center border text-[11px] font-semibold ${
                  i < step
                    ? "bg-white border-white text-panel"
                    : i === step
                      ? "border-accent-blue text-accent-blue"
                      : "border-white/25 text-white/30"
                }`}
              >
                {i + 1}
              </span>
              <span className={i === step ? "text-white font-medium" : i < step ? "text-white/60" : "text-white/30"}>
                {label}
              </span>
              {i < STEPS.length - 1 ? (
                <span aria-hidden="true" className="w-6 h-px bg-hairline" />
              ) : null}
            </li>
          ))}
        </ol>
      </div>

      {banner ? (
        <div className="mb-6">
          <Banner
            tone={banner.tone}
            title={banner.title}
            description={banner.description}
            testId="fp-banner"
          />
        </div>
      ) : null}

      {step === 0 ? (
        <>
          <FormHeader
            kicker="STEP 01 · IDENTIFY YOUR ACCOUNT"
            title={
              <>
                Reset your <em className="italic">password.</em>
              </>
            }
            subtitle="We'll send a six-digit code to your registered email."
          />
          <form onSubmit={submitEmail} noValidate className="space-y-6" data-testid="fp-email-form">
            <TextInput
              ref={emailRef}
              label="EMAIL ADDRESS"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={errors.email}
              testId="fp-email"
              placeholder="you@lab.org"
            />
            <PrimaryButton
              type="submit"
              loading={loading}
              loadingText="Sending code…"
              testId="fp-send-code"
            >
              Send code
            </PrimaryButton>
          </form>
        </>
      ) : null}

      {step === 1 ? (
        <>
          <FormHeader
            kicker="STEP 02 · VERIFY IT'S YOU"
            title={
              <>
                Enter the <em className="italic">recovery</em> code.
              </>
            }
            subtitle={
              <>
                We sent it to{" "}
                <span className="text-white font-medium">{email}</span>.
              </>
            }
          />
          <form
            onSubmit={(e) => {
              e.preventDefault();
              submitOtp();
            }}
            className="space-y-6"
            data-testid="fp-otp-form"
          >
            <OtpBoxes
              value={code}
              onChange={setCode}
              onComplete={(c) => submitOtp(c)}
              invalid={invalidOtp}
              disabled={loading || expiresIn === 0}
              testId="fp-otp"
            />
            <div className="flex items-center justify-between font-mono-label text-ink-muted">
              <span data-testid="fp-countdown">
                EXPIRES IN {mm}:{ss}
              </span>
              <button
                type="button"
                onClick={doResend}
                disabled={resending || resendIn > 0}
                className="amr-link disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed text-ink-soft hover:text-ink"
                data-testid="fp-resend"
              >
                {resending
                  ? "SENDING…"
                  : resendIn > 0
                    ? `RESEND IN ${resendIn}s`
                    : "RESEND CODE"}
              </button>
            </div>
            <PrimaryButton
              type="submit"
              loading={loading}
              loadingText="Verifying…"
              disabled={code.length !== 6 || expiresIn === 0}
              testId="fp-verify"
            >
              Verify code
            </PrimaryButton>
          </form>
        </>
      ) : null}

      {step === 2 ? (
        <>
          <FormHeader
            kicker="STEP 03 · SET A NEW PASSWORD"
            title={
              <>
                Choose a <em className="italic">stronger</em> secret.
              </>
            }
            subtitle="Your new password must meet every requirement below."
          />
          <form onSubmit={submitReset} noValidate className="space-y-6" data-testid="fp-reset-form">
            <div>
              <PasswordInput
                label="NEW PASSWORD"
                autoComplete="new-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                error={errors.password}
                testId="fp-new-password"
                placeholder="••••••••"
              />
              <StrengthMeter
                strength={pwEval.strength}
                strengthIndex={pwEval.strengthIndex}
              />
              <PasswordChecklist results={pwEval.results} testId="fp-checklist" />
            </div>
            <PasswordInput
              label="CONFIRM PASSWORD"
              autoComplete="new-password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              error={errors.confirm}
              testId="fp-confirm"
              placeholder="••••••••"
            />
            <PrimaryButton
              type="submit"
              loading={loading}
              loadingText="Resetting password…"
              testId="fp-reset"
            >
              Reset password
            </PrimaryButton>
          </form>
        </>
      ) : null}

      {step === 3 ? (
        <div data-testid="fp-success">
          <FormHeader
            kicker="COMPLETE"
            title={
              <>
                Your password has been <em className="italic">reset.</em>
              </>
            }
            subtitle="Redirecting you to the sign-in screen…"
          />
          <Banner
            tone="success"
            title="Password reset successfully."
            description="You can now sign in with your new credentials."
          />
          <div className="mt-6">
            <Link
              to="/login"
              className="font-mono-label amr-link text-ink"
              data-testid="fp-go-login"
            >
              GO TO SIGN IN →
            </Link>
          </div>
        </div>
      ) : null}

      <div className="mt-8 pt-6 border-t hairline flex items-center justify-between">
        <span className="text-[13.5px] text-ink-muted">
          Remembered your password?
        </span>
        <Link
          to="/login"
          className="font-mono-label amr-link text-white/70 hover:text-white"
          data-testid="fp-back-login"
        >
          BACK TO SIGN IN →
        </Link>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;
