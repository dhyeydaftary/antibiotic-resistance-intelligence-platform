import { useMemo, useRef, useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { AuthLayout } from "@/components/auth/AuthLayout";
import { FormHeader } from "@/components/auth/FormHeader";
import { TextInput } from "@/components/auth/TextInput";
import { PasswordInput } from "@/components/auth/PasswordInput";
import { Checkbox } from "@/components/auth/Checkbox";
import { PrimaryButton } from "@/components/auth/Button";
import { Banner } from "@/components/auth/Banner";
import { PasswordChecklist } from "@/components/auth/PasswordChecklist";
import { StrengthMeter } from "@/components/auth/StrengthMeter";
import { EMAIL_RE, evaluatePassword } from "@/utils/validators";
import { signup } from "@/api/authApi";
import usePageTitle from '../hooks/usePageTitle';

function SignupPage() {
  usePageTitle('Sign Up');

  const navigate = useNavigate();
  const nameRef = useRef(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [terms, setTerms] = useState(false);
  const [privacy, setPrivacy] = useState(false);
  const [errors, setErrors] = useState({});
  const [globalError, setGlobalError] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    nameRef.current?.focus();
  }, []);

  const pwEval = useMemo(() => evaluatePassword(password), [password]);

  const validate = () => {
    const e = {};
    if (!name.trim()) e.name = "Name is required";
    if (!email) e.email = "Email address is required";
    else if (!EMAIL_RE.test(email))
      e.email = "Please enter a valid email address";
    if (!password) e.password = "Password is required";
    else if (!pwEval.allPassed) e.password = "Password is too weak";
    if (!confirm) e.confirm = "Please confirm your password";
    else if (confirm !== password) e.confirm = "Passwords do not match";
    if (!terms) e.terms = "Please accept the Terms & Conditions";
    if (!privacy) e.privacy = "Please accept the Privacy Policy";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const onSubmit = async (ev) => {
    ev.preventDefault();
    setGlobalError(null);
    if (!validate()) return;
    setLoading(true);
    const res = await signup({ name, email, password });
    setLoading(false);
    if (res.ok) {
      sessionStorage.setItem("amr:pending-email", email);
      toast.success("Account created. Check your inbox for the code.");
      navigate("/verify-email");
      return;
    }
    if (res.field === "email") setErrors({ email: res.message });
    else setGlobalError({ title: res.message, tone: "error" });
  };

  return (
    <AuthLayout sideLabel="Create account">
      <FormHeader
        kicker="New · Researcher registration"
        title={
          <>
            Begin your <span className="text-accent-blue">inquiry</span> into resistance.
          </>
        }
        subtitle="Create an account to run predictions across 15 antibiotics on a validated public dataset."
      />

      {globalError ? (
        <div className="mb-6">
          <Banner
            tone={globalError.tone}
            title={globalError.title}
            testId="signup-banner"
          />
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
          <StrengthMeter
            strength={pwEval.strength}
            strengthIndex={pwEval.strengthIndex}
          />
          <PasswordChecklist
            results={pwEval.results}
            testId="signup-password-checklist"
          />
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

        <div className="space-y-3 pt-2">
          <Checkbox
            checked={terms}
            onCheckedChange={setTerms}
            error={errors.terms}
            testId="signup-terms"
            label={
              <>
                I agree to the{" "}
                <Link to="/terms" className="text-accent-blue transition-colors hover:text-accent-blue-hover">
                  Terms &amp; Conditions
                </Link>
                .
              </>
            }
          />
          <Checkbox
            checked={privacy}
            onCheckedChange={setPrivacy}
            error={errors.privacy}
            testId="signup-privacy"
            label={
              <>
                I&rsquo;ve read and accept the{" "}
                <Link to="/privacy" className="text-accent-blue transition-colors hover:text-accent-blue-hover">
                  Privacy Policy
                </Link>
                .
              </>
            }
          />
        </div>

        <PrimaryButton
          type="submit"
          loading={loading}
          loadingText="Creating account…"
          testId="signup-submit"
        >
          Create account
        </PrimaryButton>
      </form>

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