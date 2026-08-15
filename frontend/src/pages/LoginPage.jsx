import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { signInWithEmailAndPassword, sendEmailVerification, signInWithRedirect } from "firebase/auth";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { TextInput } from "@/components/auth/TextInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Checkbox } from "@/components/auth/Checkbox";
import { PrimaryButton } from "@/components/auth/Button";
import { SocialButton } from "@/components/auth/SocialButton";
import { Banner } from "@/components/auth/Banner";
import { EMAIL_RE } from "@/utils/validators";
import { auth, googleProvider, githubProvider } from "@/lib/firebase";
import { exchangeFirebaseSession } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";
import usePageTitle from '../hooks/usePageTitle';

// ===================================================================
// Route: /login (gated by GuestRoute). Email/password form, plus
// Google/GitHub buttons -- both providers live on Login AND Signup, since
// an account created via Google/GitHub has no password at all (Firebase's
// OAuth-based sign-in never sets one), so a password-only Login page
// would leave those users with no way back in. Firebase's signInWithRedirect
// is the same call either way (creates-or-returns transparently), so
// showing it here needs no new logic, just the same buttons Signup uses.
//
// signInWithRedirect navigates the whole page away to the provider and
// back -- it never returns a credential here. onSocialSignIn's only job is
// starting that navigation; completing it (exchanging the credential for a
// Gateway session, toast, redirect to /home) happens once, app-wide, in
// AuthContext.jsx's getRedirectResult effect, since this component isn't
// guaranteed to still be mounted -- or even be the page the browser lands
// back on -- when the provider returns control.
// ===================================================================

function firebaseErrorMessage(err) {
  switch (err?.code) {
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "Invalid email or password.";
    case "auth/too-many-requests":
      return "Too many attempts. Please wait a moment and try again.";
    default:
      return "Something went wrong. Please try again.";
  }
}

function LoginPage() {
  usePageTitle('Login');

  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [unverifiedFirebaseUser, setUnverifiedFirebaseUser] = useState(null);
  const [socialLoading, setSocialLoading] = useState(null);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const fieldErrors = useMemo(() => {
    const errors = {};
    if (!email) errors.email = "Email address is required";
    else if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address";
    if (!password) errors.password = "Password is required";
    return errors;
  }, [email, password]);

  const isFormValid = Object.keys(fieldErrors).length === 0;

  function handleBlur(field) {
    setTimeout(() => {
      setTouched((prev) => ({ ...prev, [field]: true }));
    }, 0);
  }

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setGlobalError(null);
    setUnverifiedFirebaseUser(null);
    setTouched({ email: true, password: true });
    if (!isFormValid) return;

    setLoading(true);
    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      const idToken = await cred.user.getIdToken();
      const res = await exchangeFirebaseSession({ idToken });

      if (res.ok) {
        authLogin(res.token, res.user, remember);
        toast.success("Signed in.");
        navigate("/home");
        return;
      }

      if (res.code === "EMAIL_NOT_VERIFIED") {
        setGlobalError({
          title: res.message,
          description: "We can re-send the verification email.",
          tone: "error",
        });
        setUnverifiedFirebaseUser(cred.user);
      } else {
        setGlobalError({ title: res.message, tone: "error" });
      }
    } catch (err) {
      setGlobalError({ title: firebaseErrorMessage(err), tone: "error" });
    } finally {
      setLoading(false);
    }
  };

  const onResendVerification = async () => {
    if (!unverifiedFirebaseUser) return;
    setResending(true);
    try {
      await sendEmailVerification(unverifiedFirebaseUser);
      toast.success("Verification email sent.");
    } catch {
      toast.error("Could not resend right now. Please try again shortly.");
    } finally {
      setResending(false);
    }
  };

  // Starts the redirect and nothing else -- see the file-level comment for
  // why the rest of the flow doesn't live here anymore. The only failure
  // this try/catch can actually observe is signInWithRedirect itself
  // rejecting before the page ever navigates away (e.g. a misconfigured
  // provider); once navigation begins, this component may already be gone.
  const onSocialSignIn = async (provider, name) => {
    setGlobalError(null);
    setUnverifiedFirebaseUser(null);
    setSocialLoading(name);
    try {
      await signInWithRedirect(auth, provider);
    } catch (err) {
      const message = firebaseErrorMessage(err);
      if (message) setGlobalError({ title: message, tone: "error" });
      setSocialLoading(null);
    }
  };

  return (
    <AuthLayout sideLabel="Sign in">
      <FormHeader
        kicker="Access · Secure portal"
        title={<>Sign in to your <span className="text-accent-blue">research</span> workspace.</>}
        subtitle="Enter your credentials to continue to the AMR-Insight console."
      />

      {globalError ? (
        <div className="mb-6">
          <Banner
            tone={globalError.tone}
            title={globalError.title}
            description={globalError.description}
            testId="login-banner"
          />
          {unverifiedFirebaseUser ? (
            <button
              type="button"
              onClick={onResendVerification}
              disabled={resending}
              className="mt-3 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent-blue transition-colors hover:text-accent-blue-hover disabled:opacity-60"
              data-testid="resend-verification-link"
            >
              {resending ? "Sending…" : "Resend verification email →"}
            </button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="login-form">
        <TextInput
          ref={emailRef}
          label="Email address"
          required
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          onBlur={() => handleBlur("email")}
          error={touched.email ? fieldErrors.email : null}
          testId="login-email"
          placeholder="you@lab.org"
        />
        <PasswordInput
          label="Password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onBlur={() => handleBlur("password")}
          error={touched.password ? fieldErrors.password : null}
          testId="login-password"
          placeholder="••••••••"
        />

        <div className="flex items-center justify-between pt-1">
          <Checkbox
            checked={remember}
            onCheckedChange={setRemember}
            label="Remember me on this device"
            testId="login-remember"
          />
          <Link
            to="/forgot-password"
            className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-onpanel-muted transition-colors hover:text-onpanel-ink"
            data-testid="forgot-password-link"
          >
            Forgot password?
          </Link>
        </div>

        <PrimaryButton type="submit" loading={loading} loadingText="Authenticating…" testId="login-submit">
          Sign in
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
          testId="login-google"
        />
        <SocialButton
          provider="github"
          onClick={() => onSocialSignIn(githubProvider, "github")}
          loading={socialLoading === "github"}
          disabled={socialLoading !== null}
          testId="login-github"
        />
      </div>

      <div className="mt-8 flex items-center justify-between border-t border-panel-border pt-6">
        <span className="font-sans text-[13.5px] text-onpanel-muted">
          Don&rsquo;t have an account?
        </span>
        <Link
          to="/signup"
          className="font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent-blue transition-colors hover:text-accent-blue-hover"
          data-testid="signup-link"
        >
          Sign up →
        </Link>
      </div>
    </AuthLayout>
  );
}

export default LoginPage;