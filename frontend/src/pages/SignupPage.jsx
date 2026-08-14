import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import {
  createUserWithEmailAndPassword,
  updateProfile,
  sendEmailVerification,
  signInWithPopup,
} from "firebase/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { TextInput } from "@/components/auth/TextInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Checkbox } from "@/components/auth/Checkbox";
import { PrimaryButton, GhostButton } from "@/components/auth/Button";
import { SocialButton } from "@/components/auth/SocialButton";
import { Banner } from "@/components/auth/Banner";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { StrengthMeter } from "@/components/auth/StrengthMeter";
import { EMAIL_RE, evaluatePassword } from "@/utils/validators";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { exchangeFirebaseSession } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";
import usePageTitle from '../hooks/usePageTitle';

// ===================================================================
// Route: /signup. Per ADR-0005, Firebase owns authentication directly.
// Email/password signup calls Firebase's createUserWithEmailAndPassword,
// then sends its own verification email (not our old OTP) and holds on
// this page's "check your email" state -- the Gateway's /session route
// rejects an unverified email, so there's a real, enforced gate here, not
// just a UI nicety.
//
// Google/GitHub buttons live on this page only (not Login) -- Firebase's
// popup sign-in creates-or-returns an account transparently either way,
// so "signup" and "login" are the same call for those providers; the
// distinction only matters for password accounts.
// ===================================================================

// Maps Firebase's own error codes to messages worth showing a user,
// rather than surfacing raw codes like "auth/email-already-in-use".
function firebaseErrorMessage(err) {
  switch (err?.code) {
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password is too weak.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/popup-closed-by-user":
      return null; // user cancelled -- not an error worth showing
    default:
      return "Something went wrong. Please try again.";
  }
}

function SignupPage() {
  usePageTitle('Sign Up');

  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const nameRef = useRef(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [socialLoading, setSocialLoading] = useState(null);
  const [awaitingVerification, setAwaitingVerification] = useState(null); // holds email once shown

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const pwEval = useMemo(() => evaluatePassword(password), [password]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email) e.email = "Email address is required";
    else if (!EMAIL_RE.test(email)) e.email = "Please enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (!pwEval.allPassed) e.password = "Password is too weak";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    if (!consent) e.consent = "Please accept the Terms & Conditions and Privacy Policy to continue";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setGlobalError(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: name.trim() });
      await sendEmailVerification(cred.user);
      setAwaitingVerification(email);
    } catch (err) {
      const message = firebaseErrorMessage(err);
      if (message) setGlobalError({ title: message, tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onSocialSignIn = async (provider, name) => {
    // Google/GitHub bypass the email/password form's validate() entirely
    // (they're a separate submit path), so the consent gate has to be
    // re-checked here -- otherwise this is the one path that could reach
    // Firebase's popup without ever accepting the Terms/Privacy Policy.
    if (!consent) {
      setErrors((prev) => ({ ...prev, consent: "Please accept the Terms & Conditions and Privacy Policy to continue" }));
      toast.error("Please accept the Terms & Conditions and Privacy Policy first.");
      return;
    }
    setGlobalError(null);
    setSocialLoading(name);
    try {
      const cred = await signInWithPopup(auth, provider);
      const idToken = await cred.user.getIdToken();
      const res = await exchangeFirebaseSession({ idToken });
      if (res.ok) {
        authLogin(res.token, res.user, true);
        toast.success("Signed in.");
        navigate("/home");
      } else {
        setGlobalError({ title: res.message, tone: "error" });
      }
    } catch (err) {
      const message = firebaseErrorMessage(err);
      if (message) setGlobalError({ title: message, tone: "error" });
    } finally {
      setSocialLoading(null);
    }
  };

  // Holding state after a password signup -- Firebase's verification
  // email was sent; the account is real but the Gateway won't issue a
  // session until it's confirmed.
  if (awaitingVerification) {
    return (
      <AuthLayout sideLabel="Check your email">
        <FormHeader
          kicker="One step left"
          title={<>Verify your <span className="text-accent-blue">email</span>.</>}
          subtitle={`We sent a verification link to ${awaitingVerification}. Click it, then come back here and sign in.`}
        />
        <GhostButton onClick={() => navigate("/login")} testId="go-to-login">
          Go to sign in →
        </GhostButton>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout sideLabel="Create account">
      <FormHeader
        kicker="New · Researcher registration"
        title={<>Begin your <span className="text-accent-blue">inquiry</span> into resistance.</>}
        subtitle="Create an account to run predictions across 15 antibiotics on a validated public dataset."
      />

      {globalError ? (
        <div className="mb-6">
          <Banner tone={globalError.tone} title={globalError.title} testId="signup-banner" />
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="signup-form">
        <TextInput
          ref={nameRef}
          label="Full name"
          required
          autoComplete="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          error={errors.name}
          testId="signup-name"
          placeholder="Ada Lovelace"
        />
        <TextInput
          label="Email address"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          testId="signup-email"
          placeholder="you@lab.org"
        />
        <div>
          <PasswordInput
            label="Password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            testId="signup-password"
            placeholder="••••••••"
          />
          <StrengthMeter strength={pwEval.strength} strengthIndex={pwEval.strengthIndex} />
          <PasswordChecklist results={pwEval.results} testId="signup-password-checklist" />
        </div>
        <PasswordInput
          label="Confirm password"
          required
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          error={errors.confirm}
          testId="signup-confirm"
          placeholder="••••••••"
        />

        <div className="pt-1">
          <Checkbox
            checked={consent}
            onCheckedChange={(value) => {
              setConsent(value);
              if (value) setErrors((prev) => ({ ...prev, consent: undefined }));
            }}
            error={errors.consent}
            testId="signup-consent"
            label={
              <>
                I agree to the{" "}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue transition-colors hover:text-accent-blue-hover"
                >
                  Terms &amp; Conditions
                </Link>{" "}
                and{" "}
                <Link
                  to="/privacy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-accent-blue transition-colors hover:text-accent-blue-hover"
                >
                  Privacy Policy
                </Link>
                .
              </>
            }
          />
        </div>

        <PrimaryButton type="submit" loading={loading} loadingText="Creating account…" testId="signup-submit">
          Create account
        </PrimaryButton>
      </form>

      <div className="my-6 flex items-center gap-3">
        <div className="h-px flex-1 bg-panel-border" />
        <span className="font-mono text-[10px] uppercase tracking-wider text-onpanel-faint">or</span>
        <div className="h-px flex-1 bg-panel-border" />
      </div>

      <div className="space-y-3">
        <SocialButton
          provider="google"
          onClick={() => onSocialSignIn(googleProvider, "google")}
          loading={socialLoading === "google"}
          disabled={socialLoading !== null}
          testId="signup-google"
        />
        <SocialButton
          provider="github"
          onClick={() => onSocialSignIn(githubProvider, "github")}
          loading={socialLoading === "github"}
          disabled={socialLoading !== null}
          testId="signup-github"
        />
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-panel-border pt-6">
        <span className="font-sans text-[13.5px] text-onpanel-muted">
          Already have an account?
        </span>
        <Link
          to="/login"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent-blue transition-colors hover:text-accent-blue-hover"
          data-testid="login-link"
        >
          Login →
        </Link>
      </div>
    </AuthLayout>
  );
}

export default SignupPage;