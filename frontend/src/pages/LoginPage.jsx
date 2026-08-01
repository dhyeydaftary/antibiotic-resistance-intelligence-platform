import { useEffect, useRef, useState, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { TextInput } from "@/components/auth/TextInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Checkbox } from "@/components/auth/Checkbox";
import { PrimaryButton } from "@/components/auth/Button";
import { Banner } from "@/components/auth/Banner";
import { EMAIL_RE } from "@/utils/validators";
import { login } from "@/api/authApi";
import { useAuth } from "@/context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [touched, setTouched] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  // Same pattern as PredictionInputPage: errors derive from current values,
  // but only DISPLAY once a field has been touched (blurred) — so errors
  // show inline as the user moves through the form, not only on submit.
  const fieldErrors = useMemo(() => {
    const errors = {};
    if (!email) errors.email = "Email address is required";
    else if (!EMAIL_RE.test(email)) errors.email = "Please enter a valid email address";
    if (!password) errors.password = "Password is required";
    return errors;
  }, [email, password]);

  const isFormValid = Object.keys(fieldErrors).length === 0;

  function handleBlur(field) {
    // Deferred via setTimeout: if blur fires because the user clicked
    // something else (like the Sign Up link) rather than another form
    // field, updating state synchronously here can cause React to
    // re-render and recreate that link's DOM node in the same event
    // cycle — the browser's pending click then targets a node that no
    // longer exists, silently swallowing the first click. Pushing the
    // update to the next tick lets the click/navigation finish first.
    setTimeout(() => {
      setTouched((prev) => ({ ...prev, [field]: true }));
    }, 0);
  }

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setGlobalError(null);
    setTouched({ email: true, password: true });
    if (!isFormValid) return;

    setLoading(true);
    const res = await login({ email, password, remember });
    setLoading(false);
    if (res.ok) {
      authLogin(res.token, res.user, remember);
      toast.success("Signed in.");
      navigate("/home");
      return;
    }
    if (res.error === "not_verified") {
      setGlobalError({
        title: res.message,
        description: "We can re-send the code from the verification screen.",
        tone: "error",
      });
      sessionStorage.setItem("amr:pending-email", res.email);
    } else {
      setGlobalError({ title: res.message, tone: "error" });
    }
  };

  return (
    <AuthLayout sideLabel="Sign in">
      <FormHeader
        kicker="Access · Secure portal"
        title={
          <>
            Sign in to your <span className="text-accent-blue">research</span> workspace.
          </>
        }
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
          {globalError.title?.toLowerCase().includes("not verified") ? (
            <button
              type="button"
              onClick={() => navigate("/verify-email")}
              className="mt-3 font-mono text-[11px] font-medium uppercase tracking-[0.1em] text-accent-blue transition-colors hover:text-accent-blue-hover"
              data-testid="go-verify-link"
            >
              Go to verification →
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

        <PrimaryButton
          type="submit"
          loading={loading}
          loadingText="Authenticating…"
          testId="login-submit"
        >
          Sign in
        </PrimaryButton>
      </form>

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