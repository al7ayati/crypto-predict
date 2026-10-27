import React, { useState } from "react";
import {
  ArrowRight, ChartNoAxesCombined, LockKeyhole, Mail, ShieldCheck, UserRound
} from "lucide-react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile
} from "firebase/auth";
import { auth } from "../firebase";

const errorMessages = {
  "auth/email-already-in-use": "อีเมลนี้มีบัญชีอยู่แล้ว ลองเข้าสู่ระบบแทน",
  "auth/invalid-email": "รูปแบบอีเมลไม่ถูกต้อง",
  "auth/weak-password": "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร",
  "auth/invalid-credential": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "auth/user-not-found": "ไม่พบบัญชีนี้ กรุณาสมัครสมาชิกก่อน",
  "auth/wrong-password": "อีเมลหรือรหัสผ่านไม่ถูกต้อง",
  "auth/too-many-requests": "ลองใหม่อีกครั้งภายหลัง เนื่องจากมีการพยายามเข้าสู่ระบบหลายครั้ง",
  "auth/network-request-failed": "เชื่อมต่อเครือข่ายไม่ได้ ตรวจสอบอินเทอร์เน็ตแล้วลองใหม่",
  "auth/operation-not-allowed": "ยังไม่ได้เปิดใช้งาน Email/Password ใน Firebase Console"
};

export default function AuthPage() {
  const [mode, setMode] = useState("sign-in");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
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
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError("");
    setNotice("");

    const cleanEmail = email.trim();
    if (isSignUp) {
      if (!username.trim()) {
        setError("กรุณาตั้งชื่อผู้ใช้");
        return;
      }
      if (password.length < 8) {
        setError("รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร");
        return;
      }
      if (password !== confirmPassword) {
        setError("รหัสผ่านทั้งสองช่องไม่ตรงกัน");
        return;
      }
    }

    setBusy(true);
    try {
      if (isReset) {
        await sendPasswordResetEmail(auth, cleanEmail);
        setNotice("ส่งลิงก์ตั้งรหัสผ่านใหม่ไปยังอีเมลแล้ว กรุณาตรวจสอบกล่องจดหมาย");
      } else if (isSignUp) {
        const credential = await createUserWithEmailAndPassword(auth, cleanEmail, password);
        await updateProfile(credential.user, { displayName: username.trim() });
        setNotice("สร้างบัญชีสำเร็จ กำลังเปิดพื้นที่วิเคราะห์ของคุณ");
      } else {
        await signInWithEmailAndPassword(auth, cleanEmail, password);
      }
    } catch (requestError) {
      setError(errorMessages[requestError.code] || "ทำรายการไม่สำเร็จ กรุณาตรวจสอบข้อมูลแล้วลองอีกครั้ง");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="auth-screen">
      <section className="auth-showcase">
        <div className="auth-brand">
          <span className="brand-mark"><ChartNoAxesCombined size={22} /></span>
          <span>CRYPTO<span className="brand-light">PREDICT</span></span>
        </div>

        <div className="showcase-copy">
          <span className="eyebrow"><span className="status-dot" /> CRYPTO ANALYTICS WORKSPACE</span>
          <h1>See the market.<br /><span>Understand the signal.</span></h1>
          <p>พื้นที่เดียวสำหรับติดตามข้อมูลราคา ตรวจสอบโมเดล และสำรวจแนวโน้มของสินทรัพย์ดิจิทัล</p>
        </div>

        <div className="showcase-chart" aria-label="Illustrative market chart">
          <div className="chart-heading">
            <div><span className="muted-label">MARKET MOVEMENT</span><strong>Signal overview</strong></div>
            <span className="chart-period">30D</span>
          </div>
          <svg viewBox="0 0 520 160" role="img" aria-label="Illustrative upward market line" preserveAspectRatio="none">
            <defs>
              <linearGradient id="chartFill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#5B8CFF" stopOpacity=".34" />
                <stop offset="100%" stopColor="#5B8CFF" stopOpacity="0" />
              </linearGradient>
            </defs>
            <path d="M0 127 C25 118 28 130 51 103 S82 108 104 88 S141 98 163 68 S198 88 222 76 S254 85 278 52 S314 61 336 48 S373 65 395 30 S433 39 454 24 S493 34 520 8 L520 160 L0 160 Z" fill="url(#chartFill)" />
            <path d="M0 127 C25 118 28 130 51 103 S82 108 104 88 S141 98 163 68 S198 88 222 76 S254 85 278 52 S314 61 336 48 S373 65 395 30 S433 39 454 24 S493 34 520 8" fill="none" stroke="#86AEFF" strokeWidth="3" strokeLinecap="round" />
            <path d="M0 145 H520 M0 105 H520 M0 65 H520 M0 25 H520" stroke="#FFFFFF" strokeOpacity=".11" strokeDasharray="4 7" />
          </svg>
          <div className="chart-footer"><span>Historical data</span><span>Forecast insights</span><span>Model evaluation</span></div>
        </div>

        <div className="showcase-trust">
          <span><ShieldCheck size={16} /> Personal account</span>
          <span><LockKeyhole size={16} /> Secure sign-in</span>
        </div>
      </section>

      <section className="auth-form-side">
        <div className="auth-mobile-brand">
          <span className="brand-mark"><ChartNoAxesCombined size={20} /></span>
          <strong>CRYPTO PREDICT</strong>
        </div>
        <div className="auth-card">
          <div className="auth-heading">
            <span className="eyebrow auth-eyebrow">{isSignUp ? "GET STARTED" : isReset ? "ACCOUNT RECOVERY" : "WELCOME BACK"}</span>
            <h2>{isSignUp ? "สร้างบัญชีของคุณ" : isReset ? "ตั้งรหัสผ่านใหม่" : "เข้าสู่ระบบ"}</h2>
            <p>{isSignUp ? "สมัครด้วยอีเมล แล้วตั้งชื่อผู้ใช้สำหรับพื้นที่ของคุณ" : isReset ? "เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปยังอีเมลของคุณ" : "ลงชื่อเข้าใช้เพื่อดูภาพรวมตลาดและผลวิเคราะห์"}</p>
          </div>

          <form className="auth-form" onSubmit={handleSubmit}>
            {isSignUp && (
              <label className="form-field">
                <span>ชื่อผู้ใช้ (Username)</span>
                <div className="input-wrap">
                  <UserRound size={18} />
                  <input autoComplete="username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="เช่น abbas" required />
                </div>
              </label>
            )}

            <label className="form-field">
              <span>อีเมล</span>
              <div className="input-wrap">
                <Mail size={18} />
                <input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="you@example.com" required />
              </div>
            </label>

            {!isReset && (
              <label className="form-field">
                <span>รหัสผ่าน</span>
                <div className="input-wrap">
                  <LockKeyhole size={18} />
                  <input type="password" autoComplete={isSignUp ? "new-password" : "current-password"} value={password} onChange={(event) => setPassword(event.target.value)} placeholder={isSignUp ? "อย่างน้อย 8 ตัวอักษร" : "กรอกรหัสผ่าน"} minLength={isSignUp ? 8 : 1} required />
                </div>
              </label>
            )}

            {isSignUp && (
              <label className="form-field">
                <span>ยืนยันรหัสผ่าน</span>
                <div className="input-wrap">
                  <LockKeyhole size={18} />
                  <input type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="กรอกรหัสผ่านอีกครั้ง" minLength={8} required />
                </div>
              </label>
            )}

            {mode === "sign-in" && (
              <div className="form-options">
                <span className="remember-note"><ShieldCheck size={15} /> เข้าสู่ระบบอย่างปลอดภัย</span>
                <button type="button" className="text-button" onClick={() => changeMode("reset")}>ลืมรหัสผ่าน?</button>
              </div>
            )}

            {error && <div role="alert" className="form-message form-error">{error}</div>}
            {notice && <div role="status" className="form-message form-success">{notice}</div>}

            <button className="auth-submit" type="submit" disabled={busy}>
              <span>{busy ? "กำลังดำเนินการ..." : isSignUp ? "สร้างบัญชี" : isReset ? "ส่งลิงก์ตั้งรหัสผ่าน" : "เข้าสู่ระบบ"}</span>
              {!busy && <ArrowRight size={18} />}
            </button>
          </form>

          <div className="auth-switch">
            {isSignUp ? (
              <>มีบัญชีแล้ว? <button type="button" className="text-button" onClick={() => changeMode("sign-in")}>เข้าสู่ระบบ</button></>
            ) : isReset ? (
              <>จำรหัสผ่านได้แล้ว? <button type="button" className="text-button" onClick={() => changeMode("sign-in")}>กลับไปเข้าสู่ระบบ</button></>
            ) : (
              <>ยังไม่มีบัญชี? <button type="button" className="text-button" onClick={() => changeMode("sign-up")}>สมัครสมาชิก</button></>
            )}
          </div>
          <p className="auth-disclaimer">ข้อมูลการคาดการณ์มีไว้เพื่อการศึกษา ไม่ใช่คำแนะนำการลงทุน</p>
        </div>
      </section>
    </div>
  );
}
