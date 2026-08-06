import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { OtpBoxes } from "@/components/auth/OtpBoxes";
import { PrimaryButton, GhostButton } from "@/components/auth/Button";
import { Banner } from "@/components/auth/Banner";
import { verifyOtp, resendOtp } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";
import usePageTitle from '../hooks/usePageTitle';

// ===================================================================
// Route: /verify-email (gated by GuestRoute). Second half of signup —
// reads the pending email from sessionStorage (set by SignupPage),
// submits the 6-digit OTP via api/authApi.js's verifyOtp(). On success
// the backend has just created the real User and issued a token, so
// this auto-logs the user in (AuthContext.login) and redirects to
// /home — no separate login step required after verification.
// Countdown timers here are purely cosmetic UX (mirroring the real
// server-side OTP_TTL/lockout in gateway/utils/otpUtil.js); the actual
// expiry/attempt-limit enforcement happens server-side regardless of
// what this UI displays.
// ===================================================================
const CODE_TTL_SECONDS = 90;
const RESEND_COOLDOWN_SECONDS = 30;

function VerifyEmailPage() {
  usePageTitle('Verify Email');
  
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const email = useMemo(
    () => sessionStorage.getItem("amr:pending-email") || "you@lab.org",
    [],
  );

  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [expiresIn, setExpiresIn] = useState(CODE_TTL_SECONDS);
  const [resendIn, setResendIn] = useState(RESEND_COOLDOWN_SECONDS);
  const [banner, setBanner] = useState(null);
  const [invalid, setInvalid] = useState(false);

  // Ticks the displayed "code expires in" countdown once per second.
  useEffect(() => {
    if (expiresIn <= 0) return;
    const t = setInterval(() => setExpiresIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [expiresIn]);

  // Ticks the "resend available in" cooldown countdown once per second.
  useEffect(() => {
    if (resendIn <= 0) return;
    const t = setInterval(() => setResendIn((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [resendIn]);

  // Submits the OTP; on success auto-logs in and redirects to /home.
  const doVerify = async (finalCode) => {
    const c = finalCode ?? code;
    if (c.length !== 6) return;
    setBanner(null);
    setInvalid(false);
    setLoading(true);
    const res = await verifyOtp({ email, code: c });
    setLoading(false);
    if (res.ok) {
      authLogin(res.token, res.user);
      sessionStorage.removeItem("amr:pending-email");
      setBanner({
        tone: "success",
        title: "Email verified.",
        description: "Redirecting to your workspace…",
      });
      toast.success("Verified — welcome to AMR-Insight.");
      setTimeout(() => navigate("/home"), 900);
      return;
    }
    setInvalid(true);
    setBanner({
      tone: "error",
      title: res.error === "expired" ? "Code has expired" : "Incorrect code",
      description:
        res.error === "expired"
          ? "Request a new code to continue."
          : "Please check the six digits and try again.",
    });
  };

  // Requests a fresh OTP and resets both countdowns on success.
  const doResend = async () => {
    setResending(true);
    setBanner(null);
    setInvalid(false);
    setCode("");
    const res = await resendOtp({ email });
    setResending(false);
    if (res.ok) {
      setExpiresIn(CODE_TTL_SECONDS);
      setResendIn(RESEND_COOLDOWN_SECONDS);
      toast.success(`A new code was sent to ${email}.`);
    } else {
      setBanner({
        tone: "error",
        title: res.message || "Couldn't resend the code",
      });
    }
  };

  // Abandons this pending signup and sends the user back to sign up again.
  const changeEmail = () => {
    sessionStorage.removeItem("amr:pending-email");
    navigate("/signup");
  };

  const mm = String(Math.floor(expiresIn / 60)).padStart(2, "0");
  const ss = String(expiresIn % 60).padStart(2, "0");

  return (
    <AuthLayout sideLabel="VERIFY EMAIL">
      <FormHeader
        kicker="STEP 02 · CONFIRM IDENTITY"
        title={
          <>
            Enter the <em className="italic">six-digit</em> code.
          </>
        }
        subtitle={
          <>
            We sent it to{" "}
            <span className="text-ink font-medium">{email}</span>. The code
            expires in a few minutes.
          </>
        }
      />

      {banner ? (
        <div className="mb-6">
          <Banner
            tone={banner.tone}
            title={banner.title}
            description={banner.description}
            testId="verify-banner"
          />
        </div>
      ) : null}

      <form
        onSubmit={(e) => {
          e.preventDefault();
          doVerify();
        }}
        className="space-y-6"
        data-testid="verify-form"
      >
        <OtpBoxes
          value={code}
          onChange={setCode}
          onComplete={(c) => doVerify(c)}
          invalid={invalid}
          disabled={loading || expiresIn === 0}
          testId="verify-otp"
        />

        <div className="flex items-center justify-between font-mono-label text-ink-muted">
          <span data-testid="verify-countdown">
            EXPIRES IN {mm}:{ss}
          </span>
          <button
            type="button"
            onClick={doResend}
            disabled={resending || resendIn > 0}
            className="amr-link disabled:no-underline disabled:opacity-60 disabled:cursor-not-allowed text-ink-soft hover:text-ink"
            data-testid="verify-resend"
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
          testId="verify-submit"
        >
          Verify
        </PrimaryButton>
      </form>

      <div className="mt-8 pt-6 border-t hairline flex items-center justify-between">
        <span className="text-[13.5px] text-ink-muted">
          Wrong email address?
        </span>
        <GhostButton
          onClick={changeEmail}
          testId="verify-change-email"
          className="font-mono-label text-ink px-0"
        >
          CHANGE EMAIL →
        </GhostButton>
      </div>
    </AuthLayout>
  );
}

export default VerifyEmailPage;
