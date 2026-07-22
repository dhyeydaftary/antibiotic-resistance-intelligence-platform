export const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const PASSWORD_RULES = [
  { key: "length", label: "At least 8 characters", test: (v) => v.length >= 8 },
  { key: "upper", label: "One uppercase letter", test: (v) => /[A-Z]/.test(v) },
  { key: "lower", label: "One lowercase letter", test: (v) => /[a-z]/.test(v) },
  { key: "number", label: "One number", test: (v) => /[0-9]/.test(v) },
  {
    key: "special",
    label: "One special character",
    test: (v) => /[^A-Za-z0-9]/.test(v),
  },
];

export function evaluatePassword(pw) {
  const results = PASSWORD_RULES.map((r) => ({ ...r, passed: r.test(pw) }));
  const passedCount = results.filter((r) => r.passed).length;

  let strength = "empty";
  let strengthIndex = 0;
  if (pw.length === 0) {
    strength = "empty";
    strengthIndex = 0;
  } else if (passedCount <= 2) {
    strength = "Weak";
    strengthIndex = 1;
  } else if (passedCount === 3) {
    strength = "Fair";
    strengthIndex = 2;
  } else if (passedCount === 4) {
    strength = "Good";
    strengthIndex = 3;
  } else {
    strength = "Strong";
    strengthIndex = 4;
  }

  return {
    results,
    passedCount,
    strength,
    strengthIndex,
    allPassed: passedCount === PASSWORD_RULES.length,
  };
}
