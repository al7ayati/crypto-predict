import React, { useState } from "react";
import {
  ArrowRight,
  TrendingUp,
  Eye,
  EyeOff,
  LockKeyhole,
  Mail,
  ShieldCheck,
  UserRound
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth } from "../firebase";

const errorMessages = {
  "auth/email-already-in-use":
    "This email is already registered. Please sign in instead.",
  "auth/invalid-email": "Invalid email address format.",
  "auth/weak-password": "Password must be at least 8 characters long.",
  "auth/invalid-credential": "Invalid email or password.",
  "auth/user-not-found": "Account not found. Please sign up first.",
  "auth/wrong-password": "Invalid email or password.",
  "auth/too-many-requests":
    "Too many failed attempts. Please try again later.",
  "auth/network-request-failed":
    "Network error. Check your connection and try again.",
  "auth/operation-not-allowed":
    "Email and password authentication is not enabled in Firebase Console.",
  "auth/unauthorized-domain":
    "This website domain is not authorized in Firebase Authentication settings.",
  "auth/invalid-api-key":
    "The Firebase API key is invalid. Check your local environment configuration.",
  "auth/app-not-authorized":
    "This application is not authorized to use Firebase Authentication."
};

export default function AuthPage() {
  const [mode, setMode] = useState("sign-in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  const isSignUp = mode === "sign-up";
  const isReset = mode === "reset";

  const changeMode = (nextMode) => {
    setMode(nextMode);
    setError("");
    setNotice("");
    setPassword("");
    setConfirmPassword("");
    setShowPassword(false);
    setShowConfirmPassword(false);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (busy) return;
    setError("");
    setNotice("");

    const cleanEmail = email.trim();
    if (!cleanEmail) {
      setError("Please enter your email address.");
      return;
    }
    if (isSignUp) {
      if (!username.trim()) {
        setError("Please enter a username.");
        return;
      }
      if (password.length < 8) {
        setError("Password must be at least 8 characters long.");
        return;
      }
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
    }

    setBusy(true);
    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, cleanEmail);
        setNotice(
          "If an account exists for this email address, a password reset link will be sent. Please check your inbox and spam folder."
        );
      } else if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(
          auth,
          cleanEmail,
          password
        );
        await updateProfile(credential.user, {
          displayName: username.trim()
        });
        setNotice("Account created successfully! Loading your workspace...");
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (requestError) {
      console.error("Firebase Auth Error:", requestError.code, requestError.message);
      setError(
        errorMessages[requestError.code] ||
          "An unexpected error occurred. Please try again."
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-showcase">
        <div className="auth-brand">
          <span className="brand-mark">
            <TrendingUp size={22} />
          </span>
          <span>
            CRYPTO<span className="brand-light">PREDICT</span>
          </span>
        </div>

        <div className="showcase-copy">
          <span className="eyebrow">
            <span className="status-dot" /> CRYPTO ANALYTICS WORKSPACE
          </span>
          <h1>
            See the market.
            <br />
            <span>Understand the signal.</span>
          </h1>
          <p>
            A unified workspace to track market data, evaluate models, and
            explore digital asset trends.
          </p>
        </div>

        <div className="showcase-chart" aria-label="Illustrative market chart">
          <div className="chart-heading">
            <div>
              <span className="muted-label">MARKET MOVEMENT</span>
              <strong>Signal overview</strong>
            </div>
            <span className="chart-period">30D</span>
          </div>
          <svg
            viewBox="0 0 520 160"
            role="img"
            aria-label="Illustrative upward market line"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B8CFF" stopOpacity=".34" />
                <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path
              d="M0 127 C25 118 28 130 51 103 S82 108 104 88 S141 98 163 68 S198 88 222 76 S254 85 278 52 S314 61 336 48 S373 65 395 30 S433 39 454 24 S493 34 520 8 L520 160 L0 160 Z"
              fill="url(#chartFill)"
            />
            <path
              d="M0 127 C25 118 28 130 51 103 S82 108 104 88 S141 98 163 68 S198 88 222 76 S254 85 278 52 S314 61 336 48 S373 65 395 30 S433 39 454 24 S493 34 520 8"
              fill="none"
              stroke="#86AEFF"
              strokeWidth="3"
              strokeLinecap="round"
            />
            <path
              d="M0 145 H520 M0 105 H520 M0 65 H520 M0 25 H520"
              stroke="#FFFFFF"
              strokeOpacity=".11"
              strokeDasharray="4 7"
            />
          </svg>
          <div className="chart-footer">
            <span>Historical data</span>
            <span>Forecast insights</span>
            <span>Model evaluation</span>
          </div>
        </div>

        <div className="showcase-trust">
          <span>
            <ShieldCheck size={16} /> Personal account
          </span>
          <span>
            <LockKeyhole size={16} /> Secure sign-in
          </span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <span className="brand-mark">
            <TrendingUp size={20} />
          </span>
          <strong>CRYPTO PREDICT</strong>
        </div>
        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow auth-eyebrow">
              {isSignUp
                ? "GET STARTED"
                : isReset
                ? "ACCOUNT RECOVERY"
                : "WELCOME BACK"}
            </span>
            <h2>
              {isSignUp
                ? "Create your account"
                : isReset
                ? "Reset your password"
                : "Sign in"}
            </h2>
            <p>
              {isSignUp
                ? "Sign up with your email and choose a username for your workspace."
                : isReset
                ? "We will send a password reset link to your registered email."
                : "Sign in to access market overviews and analytical insights."}
            </p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <label className="form-field">
                <span>Username</span>
                <div className="input-wrap">
                  <UserRound size={18} />
                  <input
                    type="text"
                    autoComplete="username"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="e.g. johndoe"
                    required
                  />
                </div>
              </label>
            )}

            <label className="form-field">
              <span>Email Address</span>
              <div className="input-wrap">
                <Mail size={18} />
                <input
                  type="email"
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="name@example.com"
                  required
                />
              </div>
            </label>

            {!isReset && (
              <label className="form-field">
                <span>Password</span>
                <div className="input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showPassword ? "text" : "password"}
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder={
                      isSignUp ? "At least 8 characters" : "Enter your password"
                    }
                    minLength={isSignUp ? 8 : 1}
                    required
                  />
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 8px",
                      color: "#6b7280"
                    }}
                    onClick={() => setShowPassword(!showPassword)}

                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}

            {isSignUp && (
              <label className="form-field">
                <span>Confirm Password</span>
                <div className="input-wrap">
                  <LockKeyhole size={18} />
                  <input
                    type={showConfirmPassword ? "text" : "password"}
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(event) => setConfirmPassword(event.target.value)}
                    placeholder="Re-enter your password"
                    minLength={8}
                    required
                  />
                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      padding: "0 8px",
                      color: "#6b7280"
                    }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}

                    aria-label={
                      showConfirmPassword
                        ? "Hide confirm password"
                        : "Show confirm password"
                    }
                  >
                    {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </label>
            )}

            {mode === "sign-in" && (
              <div className="form-options">
                <span className="remember-note">
                  <ShieldCheck size={15} /> Secure connection
                </span>
                <button
                  type="button"
                  className="text-button"
                  onClick={() => changeMode("reset")}
                >
                  Forgot password?
                </button>
              </div>
            )}

            {error && (
              <div role="alert" className="form-message form-error">
                {error}
              </div>
            )}
            {notice && (
              <div role="status" className="form-message form-success">
                {notice}
              </div>
            )}

            <button className="auth-submit" type="submit" disabled={busy}>
              <span>
                {busy
                  ? "Processing..."
                  : isSignUp
                  ? "Create Account"
                  : isReset
                  ? "Send Reset Link"
                  : "Sign In"}
              </span>
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-switch">
            {isSignUp ? (
              <>
                Already have an account?{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => changeMode("sign-in")}
                >
                  Sign In
                </button>
              </>
            ) : isReset ? (
              <>
                Remembered your password?{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => changeMode("sign-in")}
                >
                  Back to Sign In
                </button>
              </>
            ) : (
              <>
                Don't have an account?{" "}
                <button
                  type="button"
                  className="text-button"
                  onClick={() => changeMode("sign-up")}
                >
                  Sign Up
                </button>
              </>
            )}
          </div>
          <p className="auth-disclaimer">
            Predictive data is for educational purposes only and does not
            constitute financial advice.
          </p>
        </div>
      </section>
    </div>
  );
}