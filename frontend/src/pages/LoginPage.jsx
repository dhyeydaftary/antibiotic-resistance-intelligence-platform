import { useEffect, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { TextInput } from "@/components/auth/TextInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Checkbox } from "@/components/auth/Checkbox";
import { PrimaryButton } from "@/components/auth/Button";
import { Banner } from "@/components/auth/Banner";
import { DemoHint } from "@/components/auth/DemoHint";
import { EMAIL_RE } from "@/utils/validators";
import { login } from "@/utils/mockAuthApi";
import { useAuth } from "@/context/AuthContext";

function LoginPage() {
  const navigate = useNavigate();
  const { login: authLogin } = useAuth();
  const emailRef = useRef(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    emailRef.current?.focus();
  }, []);

  const validate = () => {
    const e = {};
    if (!email) e.email = "Email address is required";
    else if (!EMAIL_RE.test(email))
      e.email = "Please enter a valid email address";
    if (!password) e.password = "Password is required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setGlobalError(null);
    if (!validate()) return;
    setLoading(true);
    const res = await login({ email, password });
    setLoading(false);
    if (res.ok) {
      authLogin(res.token, { email: res.email });
      toast.success("Signed in.");
      navigate("/home");
      return;
    }
    if (res.field === "email") setErrors({ email: res.message });
    else if (res.field === "password") setErrors({ password: res.message });
    else if (res.error === "not_verified") {
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
    <AuthLayout sideLabel="SIGN IN">
      <FormHeader
        kicker="ACCESS · SECURE PORTAL"
        title={
          <>
            Sign in to your <em className="italic">research</em> workspace.
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
              className="mt-3 font-mono-label amr-link text-ink"
              data-testid="go-verify-link"
            >
              GO TO VERIFICATION →
            </button>
          ) : null}
        </div>
      ) : null}

      <form onSubmit={onSubmit} noValidate className="space-y-6" data-testid="login-form">
        <TextInput
          ref={emailRef}
          label="EMAIL ADDRESS"
          type="email"
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={errors.email}
          testId="login-email"
          placeholder="you@lab.org"
        />
        <PasswordInput
          label="PASSWORD"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
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
            className="font-mono-label amr-link text-ink-soft"
            data-testid="forgot-password-link"
          >
            FORGOT PASSWORD?
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

      <div className="mt-8 pt-6 border-t hairline flex items-center justify-between">
        <span className="text-[13.5px] text-ink-muted">
          Don&rsquo;t have an account?
        </span>
        <Link
          to="/signup"
          className="font-mono-label amr-link text-ink"
          data-testid="signup-link"
        >
          SIGN UP →
        </Link>
      </div>

      <DemoHint>
        <p>demo@example.com &nbsp;/&nbsp; Password1!  →  success</p>
        <p>unverified@example.com &nbsp;/&nbsp; Password1!  →  not verified</p>
        <p>anything@else.com  →  email not found</p>
        <p>demo@example.com &nbsp;/&nbsp; wrong  →  incorrect password</p>
        <p>5+ failures in a row  →  rate-limited</p>
      </DemoHint>
    </AuthLayout>
  );
}

export default LoginPage;
