import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { sendPasswordResetEmail } from "firebase/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { TextInput } from "@/components/auth/TextInput";
import { PrimaryButton, GhostButton } from "@/components/auth/Button";
import { Banner } from "@/components/auth/Banner";
import { EMAIL_RE } from "@/utils/validators";
import { auth } from "@/lib/firebase";
import usePageTitle from '../hooks/usePageTitle';

// ===================================================================
// Route: /forgot-password. Per ADR-0005, password reset is entirely
// Firebase's responsibility now -- this page just triggers Firebase's
// own reset-link email (sendPasswordResetEmail) and shows a confirmation
// state. No OTP-code UI, no separate verify/reset steps: Firebase hosts
// its own reset page at the link it sends.
//
// Deliberately doesn't reveal whether the email actually has an account
// (same response either way) -- matches this app's existing
// enumeration-safety standard, though the exact mechanism is now
// Firebase's, not this app's own code.
// ===================================================================
function ForgotPasswordPage() {
  usePageTitle('Forgot Password');

  const navigate = useNavigate();
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setError(null);
    if (!email || !EMAIL_RE.test(email)) {
      setError("Please enter a valid email address");
      return;
    }

    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email);
    } catch (err) {
      // auth/user-not-found is deliberately treated the same as success --
      // revealing it would let an attacker enumerate which emails have
      // accounts. Only a genuinely different, non-enumeration error
      // (rate-limited, invalid email format Firebase itself catches)
      // surfaces differently.
      if (err?.code !== "auth/user-not-found") {
        setLoading(false);
        setError("Something went wrong. Please try again.");
        return;
      }
    }
    setLoading(false);
    setSent(true);
  };

  if (sent) {
    return (
      <AuthLayout sideLabel="Check your email">
        <FormHeader
          kicker="Reset requested"
          title={<>Check your <span className="text-accent-blue">inbox</span>.</>}
          subtitle={`If an account exists for ${email}, a password reset link is on its way.`}
        />
        <GhostButton onClick={() => navigate("/login")} testId="back-to-login">
          Back to sign in →
        </GhostButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout sideLabel="Reset password">
      <FormHeader
        kicker="Account recovery"
        title={<>Forgot your <span className="text-accent-blue">password</span>?</>}
        subtitle="Enter your email and we'll send you a link to reset it."
      />

      {error ? (
        <div className="mb-6">
          <Banner tone="error" title={error} testId="forgot-password-banner" />
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="forgot-password-form">
        <TextInput
          ref={emailRef}
          label="Email address"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          testId="forgot-password-email"
          placeholder="you@lab.org"
        />

        <PrimaryButton type="submit" loading={loading} loadingText="Sending…" testId="forgot-password-submit">
          Send reset link
        </PrimaryButton>
      </form>

      <div className="mt-8 flex items-center justify-between border-t border-panel-border pt-6">
        <span className="font-sans text-[13.5px] text-onpanel-muted">Remembered it?</span>
        <Link
          to="/login"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent-blue transition-colors hover:text-accent-blue-hover"
          data-testid="login-link"
        >
          Sign in →
        </Link>
      </div>
    </AuthLayout>
  );
}

export default ForgotPasswordPage;