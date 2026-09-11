import { useState } from "react";
import { User } from "@/types/auth";
import Login from "@/pages/Login";
import Dashboard from "@/pages/Dashboard";
import Wireframe from "@/pages/Wireframe";

// ── Tipe reminder ─────────────────────────────────────────────────────────────
export interface Reminder {
  id: number;
  judul: string;
  isi: string;
  tipe: "deadline" | "rapat" | "rtl" | "audit" | "info";
  prioritas: "kritis" | "tinggi" | "sedang" | "normal";
  tanggal_acuan: string | null;
}

// ── LEVEL 1: Generator reminder dari data hardcoded ──────────────────────────
// CATATAN LEVEL 2: Ganti fungsi ini dengan satu API call:
//   const res = await api.post("/auth/login", { email, password });
//   return res.data.reminders;  ← langsung dari backend
function generateReminders(user: User): Reminder[] {
  const reminders: Reminder[] = [];

  // ── Data simulasi (ganti dengan data real dari DB di Level 2) ────────────
  const rtlDeadlines = [
    { id: 1, judul: "SOP Penerimaan Mahasiswa",    unit: "BAAK",     batas: "2026-09-09", status: "Dalam Proses" },
    { id: 2, judul: "Aset Gedung di SIMAK",         unit: "Sarpras",  batas: "2026-09-11", status: "Belum" },
    { id: 3, judul: "Belanja Modal Tanpa BA",        unit: "Sarpras",  batas: "2026-09-06", status: "Belum" },
    { id: 4, judul: "Laporan Keuangan Q2",           unit: "Keuangan", batas: "2026-09-20", status: "Dalam Proses" },
    { id: 5, judul: "Arsip Mahasiswa Keluar",        unit: "BAAK",     batas: "2026-09-15", status: "Selesai" },
  ];

  const rapatMendatang = [
    { id: 1, judul: "Rapat Tinjauan Manajemen", tanggal: "2026-09-08" },
    { id: 2, judul: "Koordinasi Program Audit", tanggal: "2026-09-09" },
  ];

  const rtlMenungguVerif = 3; // jumlah RTL yang buktinya sudah diupload auditee
  const auditTertinggal  = 1; // jumlah audit berjalan dengan progres < 50%

  const today   = new Date();
  today.setHours(0, 0, 0, 0);
  const in7days = new Date(today); in7days.setDate(today.getDate() + 7);
  const tomorrow = new Date(today); tomorrow.setDate(today.getDate() + 1);

  const fmt = (d: Date) => d.toISOString().split("T")[0];

  // ── 1. RTL hampir / sudah deadline ────────────────────────────────────────
  if (["full", "pengawasan", "auditee"].includes(user.role)) {
    rtlDeadlines
      .filter(r => {
        if (r.status === "Selesai") return false;
        const batas = new Date(r.batas);
        // Auditee hanya lihat RTL unitnya sendiri
        if (user.role === "auditee" && r.unit !== user.unit) return false;
        return batas <= in7days;
      })
      .forEach((r, i) => {
        const batas = new Date(r.batas);
        const sisa  = Math.round((batas.getTime() - today.getTime()) / 86400000);
        const sisaLabel = sisa < 0
          ? `${Math.abs(sisa)} hari lalu (terlambat!)`
          : sisa === 0 ? "hari ini" : `${sisa} hari lagi`;
        const prioritas = sisa < 0 ? "kritis" : sisa <= 3 ? "tinggi" : "sedang";

        reminders.push({
          id: 100 + i,
          judul: `⏰ Deadline RTL: ${r.judul}`,
          isi: `Batas waktu tindak lanjut "${r.judul}" (${r.unit}) adalah ${sisaLabel}.`,
          tipe: "deadline",
          prioritas,
          tanggal_acuan: r.batas,
        });
      });
  }

  // ── 2. Rapat hari ini / besok ─────────────────────────────────────────────
  if (["full", "pengawasan", "backoffice"].includes(user.role)) {
    rapatMendatang
      .filter(r => r.tanggal === fmt(today) || r.tanggal === fmt(tomorrow))
      .forEach((r, i) => {
        const label = r.tanggal === fmt(today) ? "HARI INI" : "besok";
        reminders.push({
          id: 200 + i,
          judul: `📅 Rapat ${label}: ${r.judul}`,
          isi: `Rapat "${r.judul}" dijadwalkan ${label}. Pastikan kehadiran dan persiapan materi.`,
          tipe: "rapat",
          prioritas: r.tanggal === fmt(today) ? "tinggi" : "sedang",
          tanggal_acuan: r.tanggal,
        });
      });
  }

  // ── 3. RTL menunggu verifikasi (auditor) ──────────────────────────────────
  if (["full", "pengawasan"].includes(user.role) && rtlMenungguVerif > 0) {
    reminders.push({
      id: 300,
      judul: `✅ ${rtlMenungguVerif} RTL menunggu verifikasi`,
      isi: `Ada ${rtlMenungguVerif} tindak lanjut yang sudah diunggah auditee dan perlu diverifikasi segera.`,
      tipe: "rtl",
      prioritas: "tinggi",
      tanggal_acuan: null,
    });
  }

  // ── 4. Audit tertinggal (auditor) ─────────────────────────────────────────
  if (["full", "pengawasan"].includes(user.role) && auditTertinggal > 0) {
    reminders.push({
      id: 400,
      judul: `🔍 ${auditTertinggal} audit berjalan tertinggal`,
      isi: `Ada ${auditTertinggal} audit yang progresnya di bawah 50% padahal sudah berjalan lebih dari 2 minggu.`,
      tipe: "audit",
      prioritas: "sedang",
      tanggal_acuan: null,
    });
  }

  // ── 5. Rekomendasi baru untuk auditee ─────────────────────────────────────
  if (user.role === "auditee" && user.unit) {
    const rekBaru = rtlDeadlines.filter(
      r => r.unit === user.unit && r.status === "Belum"
    ).length;
    if (rekBaru > 0) {
      reminders.push({
        id: 500,
        judul: `📝 ${rekBaru} rekomendasi belum ditindaklanjuti`,
        isi: `Unit ${user.unit} memiliki ${rekBaru} rekomendasi yang statusnya masih "Belum" dan perlu segera ditindaklanjuti.`,
        tipe: "rtl",
        prioritas: "tinggi",
        tanggal_acuan: null,
      });
    }
  }

  // Urutkan: kritis → tinggi → sedang → normal
  const order: Record<string, number> = { kritis: 0, tinggi: 1, sedang: 2, normal: 3 };
  return reminders.sort((a, b) => order[a.prioritas] - order[b.prioritas]);
}

// ── Warna per tipe dan prioritas ──────────────────────────────────────────────
const TIPE_ICON: Record<string, string> = {
  deadline: "⏰", rapat: "📅", rtl: "✅", audit: "🔍", info: "ℹ️",
};
const PRIORITAS_STYLE: Record<string, { bar: string; badge: string; border: string }> = {
  kritis: { bar: "bg-red-500",    badge: "bg-red-50 text-red-600 border-red-100",    border: "border-red-200" },
  tinggi: { bar: "bg-orange-400", badge: "bg-orange-50 text-orange-600 border-orange-100", border: "border-orange-200" },
  sedang: { bar: "bg-amber-400",  badge: "bg-amber-50 text-amber-700 border-amber-100",  border: "border-amber-200" },
  normal: { bar: "bg-teal-400",   badge: "bg-teal-50 text-teal-700 border-teal-100",   border: "border-teal-200" },
};

// ── Popup Reminder ────────────────────────────────────────────────────────────
function ReminderPopup({ user, reminders, onClose }: {
  user: User;
  reminders: Reminder[];
  onClose: () => void;
}) {
  const kritis = reminders.filter(r => r.prioritas === "kritis").length;
  const tinggi = reminders.filter(r => r.prioritas === "tinggi").length;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(15,23,42,0.6)", backdropFilter: "blur(6px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col"
        style={{ maxHeight: "min(88vh, 580px)" }}>

        {/* Header */}
        <div className="flex-shrink-0 px-5 py-4"
          style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center text-xl flex-shrink-0">
                🔔
              </div>
              <div>
                <div className="text-sm font-black text-white leading-tight">
                  Selamat datang, {user.name.split(",")[0]}!
                </div>
                <div className="text-[10px] text-white/70 mt-0.5">
                  {reminders.length} hal perlu perhatianmu hari ini
                  {kritis > 0 && <span className="ml-1 font-bold text-red-300">· {kritis} kritis</span>}
                  {tinggi > 0 && <span className="ml-1 font-bold text-orange-300">· {tinggi} mendesak</span>}
                </div>
              </div>
            </div>
            <button onClick={onClose}
              className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold transition-colors flex-shrink-0 mt-0.5">
              ✕
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-2">
          {reminders.length === 0 && (
            <div className="py-12 text-center">
              <div className="text-3xl mb-2">🎉</div>
              <div className="text-sm font-bold text-gray-700">Semua beres!</div>
              <div className="text-xs text-gray-400 mt-1">Tidak ada hal yang perlu ditindaklanjuti hari ini.</div>
            </div>
          )}
          {reminders.map(r => {
            const ps = PRIORITAS_STYLE[r.prioritas];
            return (
              <div key={r.id} className={`flex items-start gap-3 rounded-xl border p-3 ${ps.border} bg-white`}>
                <div className={`w-1 self-stretch rounded-full flex-shrink-0 ${ps.bar}`} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-[11px] font-bold text-gray-800 leading-tight">{r.judul}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full border capitalize flex-shrink-0 ${ps.badge}`}>
                      {r.prioritas}
                    </span>
                  </div>
                  <p className="text-[10px] text-gray-500 mt-1 leading-relaxed">{r.isi}</p>
                  {r.tanggal_acuan && (
                    <p className="text-[9px] text-gray-400 mt-1">
                      📅 {new Date(r.tanggal_acuan).toLocaleDateString("id-ID", { weekday:"long", day:"numeric", month:"long", year:"numeric" })}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="flex-shrink-0 px-4 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between gap-3">
          <span className="text-[10px] text-gray-400">
            {kritis > 0
              ? `⚠ Ada ${kritis} item kritis yang perlu segera ditangani`
              : "Semua item terlihat. Klik Lanjut untuk masuk."}
          </span>
          <button onClick={onClose}
            className="text-xs font-bold px-4 py-2 rounded-xl text-white flex-shrink-0 transition-all hover:opacity-90"
            style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark), var(--tsu-teal))" }}>
            Lanjut ke Dashboard →
          </button>
        </div>
      </div>
    </div>
  );
}

// ── App root ──────────────────────────────────────────────────────────────────
export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [showReminder, setShowReminder] = useState(false);
  const [showWireframe, setShowWireframe] = useState(
    () => window.location.hash === "#wireframe"
  );

  function handleLogin(loggedUser: User) {
    const generated = generateReminders(loggedUser);
    setUser(loggedUser);
    setReminders(generated);
    if (generated.length > 0) setShowReminder(true);
  }

  function openWireframe() {
    window.location.hash = "#wireframe";
    setShowWireframe(true);
  }

  function closeWireframe() {
    window.location.hash = "";
    setShowWireframe(false);
  }

  if (showWireframe) return <Wireframe onClose={closeWireframe} />;

  if (!user) {
    return <Login onLogin={handleLogin} />;
  }

  return (
    <>
      <Dashboard user={user} onLogout={() => { setUser(null); setShowReminder(false); }} />
      {showReminder && (
        <ReminderPopup
          user={user}
          reminders={reminders}
          onClose={() => setShowReminder(false)}
        />
      )}
    </>
  );
}
