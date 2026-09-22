import { useState, type CSSProperties } from "react";
import { ACCOUNTS, User } from "@/types/auth";
import logoTSU from "src/imports/LOGO_TSU_png.png";

const IconEye = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z" />
  </svg>
);
const IconEyeOff = ({ className = "" }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M12 7c2.76 0 5 2.24 5 5 0 .65-.13 1.26-.36 1.83l2.92 2.92c1.51-1.26 2.7-2.89 3.43-4.75-1.73-4.39-6-7.5-11-7.5-1.4 0-2.74.25-3.98.7l2.16 2.16C10.74 7.13 11.35 7 12 7zM2 4.27l2.28 2.28.46.46A11.804 11.804 0 0 0 1 12c1.73 4.39 6 7.5 11 7.5 1.55 0 3.03-.3 4.38-.84l.42.42L19.73 22 21 20.73 3.27 3 2 4.27zM7.53 9.8l1.55 1.55c-.05.21-.08.43-.08.65 0 1.66 1.34 3 3 3 .22 0 .44-.03.65-.08l1.55 1.55c-.67.33-1.41.53-2.2.53-2.76 0-5-2.24-5-5 0-.79.2-1.53.53-2.2zm4.31-.78 3.15 3.15.02-.16c0-1.66-1.34-3-3-3l-.17.01z" />
  </svg>
);

const ROLE_HINTS: Record<string, { label: string; color: string; badgeStyle: CSSProperties }> = {
  full:       { label: "Akses Penuh",       color: "border border-gray-200 bg-gray-50",     badgeStyle: { background: "var(--tsu-teal)", color: "#fff" } },
  pengawasan: { label: "Modul Pengawasan",  color: "border border-gray-200 bg-gray-50",     badgeStyle: { background: "var(--tsu-teal)", color: "#fff" } },
  backoffice: { label: "Modul Back Office", color: "border border-gray-200 bg-gray-50",     badgeStyle: { background: "var(--tsu-gold)", color: "var(--tsu-teal-dark)" } },
  auditee:    { label: "Auditee",           color: "border border-purple-100 bg-purple-50", badgeStyle: { background: "#7c3aed", color: "#fff" } },
  rektor:     { label: "Rektor — Lihat Saja", color: "border border-red-100 bg-red-50",    badgeStyle: { background: "#dc2626", color: "#fff" } },
};

export default function Login({ onLogin }: { onLogin: (user: User) => void }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    setTimeout(() => {
      const user = ACCOUNTS.find(
        (a) => a.email === email.trim() && a.password === password
      );
      if (user) {
        onLogin(user);
      } else {
        setError("Email atau password salah. Coba lagi.");
        setLoading(false);
      }
    }, 600);
  }

  function quickLogin(acc: User) {
    setEmail(acc.email);
    setPassword(acc.password);
    setError("");
  }

  return (
    <div
      className="min-h-screen flex"
      style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 60%, var(--tsu-teal-mid) 100%)" }}
    >
      {/* Left panel — branding */}
      <div className="hidden lg:flex flex-col justify-between w-1/2 p-12 relative overflow-hidden">
        {/* Decorative circles */}
        <div className="absolute -top-24 -left-24 w-96 h-96 rounded-full opacity-10 bg-white" />
        <div className="absolute bottom-0 right-0 w-64 h-64 rounded-full opacity-5 bg-white" />

        <div className="relative z-10">
          <div className="mb-12">
            <div className="bg-white rounded-2xl px-5 py-3 inline-block mb-4">
              <img src={logoTSU} alt="Tiga Serangkai University" className="h-10 object-contain" />
            </div>
            <div>
              <div className="text-white font-bold text-lg leading-tight" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                SISTEM INFORMASI SPI
              </div>
              <div className="text-blue-300 text-sm">Universitas Tiga Serangkai</div>
            </div>
          </div>

          <h2
            className="text-4xl font-black text-white leading-tight mb-4"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Satuan Pengawas<br />Internal
          </h2>
          <p className="text-blue-200 text-sm leading-relaxed max-w-sm">
            Platform terpadu untuk pengawasan, audit, tindak lanjut, dan administrasi internal kampus Universitas Tiga Serangkai.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 grid grid-cols-2 gap-3">
          {[
            { icon: "🛡️", text: "Manajemen Risiko" },
            { icon: "📋", text: "Program Audit" },
            { icon: "✅", text: "Tindak Lanjut (RTL)" },
            { icon: "📂", text: "Arsip & Dokumen" },
          ].map((f) => (
            <div key={f.text} className="flex items-center gap-2 bg-white/10 rounded-xl px-3 py-2">
              <span className="text-lg">{f.icon}</span>
              <span className="text-white text-xs font-medium">{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Right panel — login form */}
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-md">
          <div className="bg-white rounded-2xl shadow-2xl p-8">
            {/* Mobile logo */}
            <div className="lg:hidden mb-6">
              <img src={logoTSU} alt="Tiga Serangkai University" className="h-8 object-contain object-left mb-2" />
              <div className="font-bold text-gray-700 text-sm">SISTEM INFORMASI SPI</div>
              <div className="text-gray-400 text-xs">Universitas Tiga Serangkai</div>
            </div>

            <h3
              className="text-2xl font-black text-gray-800 mb-1"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Masuk ke Akun
            </h3>
            <p className="text-sm text-gray-400 mb-6">Gunakan kredensial yang diberikan admin</p>

            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Email</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="email@spi.tsu.ac.id"
                  required
                  className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1.5">Password</label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    required
                    className="w-full border border-gray-200 rounded-xl px-4 py-2.5 pr-10 text-sm text-gray-700 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-100 transition-all"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPass ? <IconEyeOff className="w-4 h-4" /> : <IconEye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="text-xs text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl font-bold text-sm text-white transition-all disabled:opacity-60"
                style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark), var(--tsu-teal))" }}
              >
                {loading ? "Memverifikasi..." : "Masuk"}
              </button>
            </form>

            {/* Demo accounts */}
            <div className="mt-6">
              <div className="flex items-center gap-2 mb-3">
                <div className="flex-1 h-px bg-gray-100" />
                <span className="text-[10px] text-gray-400 font-medium">AKUN DEMO</span>
                <div className="flex-1 h-px bg-gray-100" />
              </div>
              <div className="flex flex-col gap-2">
                {ACCOUNTS.map((acc) => {
                  const hint = ROLE_HINTS[acc.role];
                  return (
                    <button
                      key={acc.email}
                      onClick={() => quickLogin(acc)}
                      className={`flex items-center gap-3 border rounded-xl px-3 py-2.5 text-left hover:shadow-sm transition-all ${hint.color}`}
                    >
                      <div className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold flex-shrink-0" style={hint.badgeStyle}>
                        {acc.initials}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold truncate">{acc.name}</div>
                        <div className="text-[10px] opacity-70">{acc.email}</div>
                      </div>
                      <span className="text-[9px] font-bold opacity-60 flex-shrink-0">{hint.label}</span>
                    </button>
                  );
                })}
              </div>
              <p className="text-[10px] text-gray-400 text-center mt-2">Klik akun untuk mengisi otomatis</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
