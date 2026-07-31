import { useEffect, useRef } from "react";

// Six-box OTP input with autofocus advance, auto-backspace, and full paste
// support. Styled to the editorial hairline aesthetic.
export const OtpBoxes = ({
  value,
  onChange,
  onComplete,
  disabled = false,
  invalid = false,
  autoFocus = true,
  testId = "otp-input",
}) => {
  const inputsRef = useRef([]);
  const digits = value.padEnd(6, " ").slice(0, 6).split("");

  useEffect(() => {
    if (autoFocus && inputsRef.current[0]) {
      inputsRef.current[0].focus();
    }
  }, [autoFocus]);

  const setAt = (i, d) => {
    const arr = value.padEnd(6, " ").split("");
    arr[i] = d;
    const next = arr.join("").replace(/\s+$/g, "");
    onChange(next);
    return next;
  };

  const handleChange = (i, raw) => {
    const clean = raw.replace(/\D/g, "");
    if (!clean) return;
    if (clean.length > 1) {
      // paste-like into single box
      const next = clean.slice(0, 6);
      onChange(next);
      const focusIdx = Math.min(next.length, 5);
      inputsRef.current[focusIdx]?.focus();
      if (next.length === 6) onComplete?.(next);
      return;
    }
    const next = setAt(i, clean);
    if (i < 5) inputsRef.current[i + 1]?.focus();
    if (next.length === 6 && !next.includes(" ")) onComplete?.(next);
  };

  const handleKeyDown = (i, e) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (value[i]) {
        setAt(i, " ");
      } else if (i > 0) {
        inputsRef.current[i - 1]?.focus();
        const arr = value.padEnd(6, " ").split("");
        arr[i - 1] = " ";
        onChange(arr.join("").replace(/\s+$/g, ""));
      }
    } else if (e.key === "ArrowLeft" && i > 0) {
      e.preventDefault();
      inputsRef.current[i - 1]?.focus();
    } else if (e.key === "ArrowRight" && i < 5) {
      e.preventDefault();
      inputsRef.current[i + 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = (e.clipboardData?.getData("text") || "").replace(/\D/g, "");
    if (!pasted) return;
    e.preventDefault();
    const next = pasted.slice(0, 6);
    onChange(next);
    const focusIdx = Math.min(next.length, 5);
    inputsRef.current[focusIdx]?.focus();
    if (next.length === 6) onComplete?.(next);
  };

  return (
    <div
      className="flex items-center gap-2"
      data-testid={testId}
      onPaste={handlePaste}
      role="group"
      aria-label="6 digit verification code"
    >
      {digits.map((d, i) => (
        <input
          key={i}
          ref={(el) => (inputsRef.current[i] = el)}
          value={d.trim()}
          inputMode="numeric"
          autoComplete={i === 0 ? "one-time-code" : "off"}
          pattern="[0-9]*"
          maxLength={6}
          onChange={(e) => handleChange(i, e.target.value)}
          onKeyDown={(e) => handleKeyDown(i, e)}
          onFocus={(e) => e.target.select()}
          disabled={disabled}
          aria-label={`Digit ${i + 1}`}
          aria-invalid={invalid || undefined}
          data-testid={`${testId}-${i}`}
          className={`otp-slot w-10 shrink-0 h-10 text-center text-xl font-serif-display bg-transparent border-b-[1.5px] focus:outline-none transition-colors ${
            invalid
              ? "border-red-500 text-red-400"
              : "border-white/30 text-white focus:border-white"
          }`}
        />
      ))}
    </div>
  );
};
