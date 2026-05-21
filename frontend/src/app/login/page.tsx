"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/useAuth";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const [mounted, setMounted] = useState(false);
  const { login, isAuthenticated } = useAuth();
  const router = useRouter();

  useEffect(() => { setTimeout(() => setMounted(true), 0); }, []);
  useEffect(() => {
    if (isAuthenticated === true) router.push("/");
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    const success = await login(password);
    setLoading(false);
    if (success) {
      router.push("/");
    } else {
      setError("รหัสผ่านไม่ถูกต้อง กรุณาลองใหม่");
      setShake(true);
      setTimeout(() => setShake(false), 600);
    }
  };

  if (isAuthenticated === null || isAuthenticated === true) {
    return <div style={{ minHeight: "100vh", background: "#0a0e27" }} />;
  }

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "linear-gradient(135deg, #0a0e27 0%, #1a0a2e 40%, #0d1b3e 100%)",
      fontFamily: "'Inter', 'Segoe UI', sans-serif",
      position: "relative",
      overflow: "hidden",
    }}>
      {/* Animated Background Orbs */}
      <div style={{
        position: "absolute", top: "10%", left: "15%", width: 300, height: 300,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.15) 0%, transparent 70%)",
        animation: "float 8s ease-in-out infinite", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "15%", right: "10%", width: 250, height: 250,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(16,185,129,0.12) 0%, transparent 70%)",
        animation: "float 6s ease-in-out infinite reverse", pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", top: "50%", left: "60%", width: 180, height: 180,
        borderRadius: "50%", background: "radial-gradient(circle, rgba(236,72,153,0.1) 0%, transparent 70%)",
        animation: "float 10s ease-in-out infinite", pointerEvents: "none",
      }} />

      {/* Login Card */}
      <form onSubmit={handleSubmit} style={{
        opacity: mounted ? 1 : 0,
        transform: mounted ? "translateY(0)" : "translateY(30px)",
        transition: "all 0.8s cubic-bezier(0.16, 1, 0.3, 1)",
        background: "rgba(255,255,255,0.06)",
        backdropFilter: "blur(20px)",
        WebkitBackdropFilter: "blur(20px)",
        border: "1px solid rgba(255,255,255,0.1)",
        borderRadius: 24,
        padding: "48px 40px",
        width: 420,
        maxWidth: "90vw",
        boxShadow: "0 25px 60px rgba(0,0,0,0.5), 0 0 100px rgba(99,102,241,0.08)",
        position: "relative",
        zIndex: 10,
        animation: shake ? "shake 0.5s ease-in-out" : "none",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            fontSize: 52, marginBottom: 8,
            filter: "drop-shadow(0 4px 20px rgba(99,102,241,0.4))",
          }}>🏢</div>
          <h1 style={{
            fontSize: 28, fontWeight: 800, margin: 0,
            background: "linear-gradient(135deg, #e0e7ff, #c7d2fe, #a5b4fc)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            letterSpacing: -0.5,
          }}>Sovereign System</h1>
          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: 14, marginTop: 6, fontWeight: 400 }}>
            ระบบจัดการธุรกิจครอบครัว
          </p>
        </div>

        {/* Password Input */}
        <div style={{ marginBottom: 24, position: "relative" }}>
          <div style={{
            position: "absolute", left: 16, top: "50%", transform: "translateY(-50%)",
            fontSize: 18, opacity: 0.5, pointerEvents: "none",
          }}>🔒</div>
          <input
            type="password"
            value={password}
            onChange={e => { setPassword(e.target.value); setError(""); }}
            placeholder="พิมพ์รหัสผ่าน..."
            autoComplete="current-password"
            autoFocus
            style={{
              width: "100%", padding: "16px 16px 16px 48px",
              background: "rgba(255,255,255,0.07)",
              border: error ? "1.5px solid rgba(239,68,68,0.6)" : "1.5px solid rgba(255,255,255,0.12)",
              borderRadius: 14, fontSize: 16, color: "#fff",
              outline: "none", transition: "all 0.3s ease",
              boxSizing: "border-box",
            }}
            onFocus={e => e.target.style.borderColor = "rgba(99,102,241,0.6)"}
            onBlur={e => e.target.style.borderColor = error ? "rgba(239,68,68,0.6)" : "rgba(255,255,255,0.12)"}
          />
        </div>

        {/* Error Message */}
        {error && (
          <div style={{
            background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.25)",
            borderRadius: 10, padding: "10px 14px", marginBottom: 20,
            color: "#fca5a5", fontSize: 13, textAlign: "center",
          }}>⚠️ {error}</div>
        )}

        {/* Login Button */}
        <button type="submit" disabled={loading || !password} style={{
          width: "100%", padding: "16px",
          background: loading || !password
            ? "rgba(255,255,255,0.08)"
            : "linear-gradient(135deg, #059669, #0d9488, #0891b2)",
          border: "none", borderRadius: 14, fontSize: 16, fontWeight: 700,
          color: loading || !password ? "rgba(255,255,255,0.3)" : "#fff",
          cursor: loading || !password ? "not-allowed" : "pointer",
          transition: "all 0.3s ease",
          boxShadow: loading || !password ? "none" : "0 8px 30px rgba(5,150,105,0.3)",
          letterSpacing: 0.5,
        }}>
          {loading ? "⏳ กำลังตรวจสอบ..." : "🔓 เข้าสู่ระบบ"}
        </button>

        {/* Footer */}
        <p style={{
          textAlign: "center", marginTop: 28, fontSize: 12,
          color: "rgba(255,255,255,0.25)",
        }}>
          Sovereign Dormitory System v2.0
        </p>
      </form>

      {/* CSS Animations */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translate(0, 0); }
          33% { transform: translate(30px, -20px); }
          66% { transform: translate(-20px, 15px); }
        }
        @keyframes shake {
          0%, 100% { transform: translateX(0); }
          10%, 50%, 90% { transform: translateX(-6px); }
          30%, 70% { transform: translateX(6px); }
        }
        input::placeholder { color: rgba(255,255,255,0.3); }
      `}</style>
    </div>
  );
}
