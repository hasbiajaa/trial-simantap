import { useState } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type Status = "active" | "ui" | "backend";

interface SubItem { label: string; status: Status; }
interface MenuItem { label: string; sub: SubItem[]; default?: boolean; }

// ─── Sitemap data ─────────────────────────────────────────────────────────────

const AUTH_ITEMS: SubItem[] = [
  { label: "Form Login — email + password", status: "active" },
  { label: "4 akun demo (full · pengawasan · backoffice · auditee)", status: "active" },
  { label: "Popup Reminder setelah login — Level 1 (hardcoded, role-filtered)", status: "active" },
  { label: "Popup Reminder Level 2 — dari response POST /auth/login (backend)", status: "backend" },
  { label: "Notifikasi 🔔 — modal full-screen, badge unread count, tandai dibaca", status: "active" },
  { label: "Credit footer sidebar — WebDev SPI-TSU · V1.0", status: "active" },
  { label: "Logout — reset state user", status: "active" },
  { label: "Session auth CI4 Shield — POST /auth/login, GET /auth/me", status: "backend" },
];

const PW_MENUS: MenuItem[] = [
  {
    label: "Ringkasan",
    default: true,
    sub: [
      { label: "Indeks Komposit Pengawasan + radar chart (full/pengawasan)", status: "active" },
      { label: "KPI strip 4 kartu — audit aktif, temuan open, RTL selesai, skor risiko", status: "active" },
      { label: "Grafik tren audit bulanan (bar chart)", status: "active" },
      { label: "Tabel audit berjalan + progress bar + alert urgent", status: "active" },
      { label: "View auditee: KPI unit + audit berjalan + RTL + riwayat selesai", status: "active" },
    ],
  },
  {
    label: "Risiko",
    sub: [
      { label: "Temuan Risiko — scatter chart + tabel + filter unit", status: "active" },
      { label: "Pemetaan Risiko — heat map 5×5 (kemungkinan × dampak)", status: "active" },
      { label: "Auditee: panel temuan expandable per RTL + progress bar", status: "active" },
    ],
  },
  {
    label: "Audit",
    sub: [
      { label: "Rencana & Laporan Audit — tabel + form LHA", status: "active" },
      { label: "Entry Meeting → Draft Temuan → Exit Meeting (step indicator)", status: "active" },
      { label: "Kertas Kerja Audit (KKA) — tabel + upload dokumen", status: "active" },
    ],
  },
  {
    label: "RTL",
    sub: [
      { label: "Tindak Lanjut — waterfall chart + area chart + tabel filter status", status: "active" },
      { label: "Verifikasi RTL — tabel bukti + Terima / Tolak", status: "active" },
      { label: "Auditee: panduan + upload bukti + tandai selesai", status: "active" },
    ],
  },
  {
    label: "Riwayat per Unit",
    sub: [
      { label: "Riwayat per Unit — tab per unit kerja + daftar audit selesai", status: "active" },
      { label: "Temuan Berulang — bar chart frekuensi + daftar", status: "active" },
    ],
  },
  {
    label: "Kalender Pengawasan",
    sub: [
      { label: "Jadwal Audit — heatmap aktivitas + kalender grid + agenda + filter tipe", status: "active" },
      { label: "Deadline & Reminder — list prioritas + tandai selesai", status: "active" },
      { label: "Auditee: kalender unit + daftar jadwal prioritas + tandai selesai", status: "active" },
    ],
  },
];

const BO_MENUS: MenuItem[] = [
  {
    label: "Ringkasan ★",
    default: true,
    sub: [
      { label: "KPI strip 4 kartu — surat terproses, rapat, auditor, arsip", status: "active" },
      { label: "Mini panel Administrasi — 4 stat (surat masuk/keluar, rapat, arsip)", status: "active" },
      { label: "Mini panel PKPT — 4 stat + progress bar realisasi", status: "active" },
      { label: "Mini panel SDM Auditor — 4 stat (total, sertifikasi, skor, pelatihan)", status: "active" },
      { label: "Mini bar chart Anggaran — rencana vs realisasi per komponen", status: "active" },
      { label: "Panel Agenda Mendatang — 3 rapat/event terdekat", status: "active" },
      { label: "Panel Deadline & Reminder — 3 item teratas", status: "active" },
    ],
  },
  {
    label: "Administrasi",
    sub: [
      { label: "Jadwal Rapat — tabel 6 baris + tambah rapat", status: "active" },
      { label: "Surat Masuk & Keluar — tab toggle + line chart + tabel status", status: "active" },
      { label: "Arsip Dokumen Audit — grid kartu + search + filter + Unduh / Detail / Edit / Hapus", status: "active" },
    ],
  },
  {
    label: "Perencanaan Audit",
    sub: [
      { label: "Audit Universe — scatter chart risiko vs urgensi + tabel 8 unit", status: "active" },
      { label: "PKPT — progress bar realisasi + tabel anggaran", status: "active" },
      { label: "Risk Register — tabel skor otomatis (kemungkinan × dampak)", status: "active" },
    ],
  },
  {
    label: "Manajemen SDM",
    sub: [
      { label: "Kompetensi Auditor — skill matrix (auditor × area kompetensi)", status: "active" },
      { label: "Riwayat Penugasan — tabel + filter auditor", status: "active" },
      { label: "Jadwal Pelatihan — tabel + daftarkan pelatihan", status: "active" },
    ],
  },
  {
    label: "Regulasi & SOP",
    sub: [
      { label: "Pedoman Audit — grid kartu 6 item + search", status: "active" },
      { label: "Peraturan Internal — grid + filter tahun", status: "active" },
      { label: "Standar Audit — list + detail panel + tandai dipelajari", status: "active" },
    ],
  },
  {
    label: "Kalender BO",
    sub: [
      { label: "Jadwal Rapat — kalender grid + Agenda Mendatang + Overdue + Deadline Mendatang", status: "active" },
      { label: "Siklus Audit — Gantt bar chart horizontal per unit (12 bulan)", status: "active" },
    ],
  },
  {
    label: "Perencanaan Anggaran",
    sub: [
      { label: "Rencana Anggaran — grouped bar chart + tabel detail 10 komponen", status: "active" },
      { label: "Realisasi Anggaran — area chart + tabel selisih warna merah/hijau", status: "active" },
      { label: "Laporan Keuangan — tabel semester + catatan + ekspor Excel/PDF", status: "active" },
    ],
  },
];

// ─── Sitemap components ───────────────────────────────────────────────────────

const DOT_COLOR: Record<Status, string> = {
  active:  "bg-emerald-500",
  ui:      "bg-amber-400",
  backend: "bg-slate-300",
};

function Dot({ s }: { s: Status }) {
  return <span className={`inline-block w-2 h-2 rounded-full flex-shrink-0 ${DOT_COLOR[s]}`} />;
}

function SitemapLeaf({ label, status }: SubItem) {
  return (
    <div className="flex items-start gap-2 py-[3px]">
      <Dot s={status} />
      <span className="text-[11px] text-gray-600 leading-relaxed">{label}</span>
    </div>
  );
}

function SitemapMenu({
  item,
  accentBadge,
}: {
  item: MenuItem;
  accentBadge: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className="mb-1">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-2 px-2 py-1.5 rounded-lg text-left hover:bg-black/5 transition-colors"
      >
        <span className="text-[10px] text-gray-400 font-mono w-3">{open ? "▾" : "▸"}</span>
        <span className="text-xs font-semibold text-gray-800 flex-1">{item.label}</span>
        {item.default && (
          <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${accentBadge}`}>default</span>
        )}
        <span className="text-[9px] text-gray-400">{item.sub.length}×</span>
      </button>
      {open && (
        <div className="ml-7 pl-3 border-l border-gray-200 flex flex-col gap-0">
          {item.sub.map((s, i) => <SitemapLeaf key={i} {...s} />)}
        </div>
      )}
    </div>
  );
}

function ModuleCard({
  icon, label, role, menus, borderColor, bg, accentBadge,
}: {
  icon: string; label: string; role: string; menus: MenuItem[];
  borderColor: string; bg: string; accentBadge: string;
}) {
  const [open, setOpen] = useState(true);
  return (
    <div className={`rounded-xl border ${borderColor} overflow-hidden`}>
      <button
        onClick={() => setOpen(o => !o)}
        className={`w-full flex items-center gap-3 px-4 py-3 ${bg} text-left`}
      >
        <span className="text-2xl leading-none">{icon}</span>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-gray-800">{label}</div>
          <div className="text-[10px] text-gray-500 mt-0.5">Role: {role}</div>
        </div>
        <span className="text-xs text-gray-400">{open ? "▾" : "▸"}</span>
      </button>
      {open && (
        <div className="p-3 bg-white/60">
          {menus.map((m, i) => <SitemapMenu key={i} item={m} accentBadge={accentBadge} />)}
        </div>
      )}
    </div>
  );
}

function SitemapView() {
  return (
    <div className="flex flex-col gap-4 max-w-5xl mx-auto px-4 pb-8">
      {/* Root */}
      <div className="rounded-xl bg-gray-800 px-6 py-4 text-center shadow-sm">
        <div className="text-xl font-black text-white tracking-tight">🏛️ SIMSPI TSU</div>
        <div className="text-[11px] text-gray-400 mt-1">Sistem Informasi Satuan Pengawas Internal — Universitas Tama Siswa</div>
        <div className="flex justify-center gap-4 mt-2 text-[10px] text-gray-400">
          <span>React 19 + Vite 8 + TypeScript</span>
          <span>·</span>
          <span>Backend: CodeIgniter 4 + CI4 Shield + MySQL 8</span>
        </div>
      </div>

      {/* Auth block */}
      <div className="rounded-xl border border-slate-200 overflow-hidden">
        <div className="flex items-center gap-3 px-4 py-3 bg-slate-100">
          <span className="text-2xl">🔐</span>
          <div>
            <div className="text-sm font-black text-gray-800">Login & Autentikasi</div>
            <div className="text-[10px] text-gray-500">Semua role · CI4 Shield Session Auth</div>
          </div>
        </div>
        <div className="px-4 py-3 bg-white flex flex-col gap-0.5">
          {AUTH_ITEMS.map((a, i) => <SitemapLeaf key={i} {...a} />)}
        </div>
      </div>

      {/* Modules */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ModuleCard
          icon="🔍" label="Modul Pengawasan SPI"
          role="full · pengawasan · auditee"
          menus={PW_MENUS}
          borderColor="border-teal-200" bg="bg-teal-50"
          accentBadge="bg-teal-100 text-teal-700"
        />
        <ModuleCard
          icon="🗂️" label="Modul Back Office SPI"
          role="full · backoffice"
          menus={BO_MENUS}
          borderColor="border-amber-200" bg="bg-amber-50"
          accentBadge="bg-amber-100 text-amber-700"
        />
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 px-4 py-3 bg-white rounded-xl border border-gray-100 text-xs text-gray-500">
        <span className="font-bold text-gray-700">Legenda:</span>
        {[
          { c: "bg-emerald-500", l: "✅ Aktif — UI + logika berfungsi" },
          { c: "bg-amber-400",   l: "🟡 UI Ada — tampilan ada, belum ke database" },
          { c: "bg-slate-300",   l: "⬜ Perlu Backend — butuh API + database" },
        ].map(({ c, l }) => (
          <div key={l} className="flex items-center gap-1.5">
            <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${c}`} />
            <span>{l}</span>
          </div>
        ))}
        <span className="ml-auto text-[10px] text-gray-400">★ = halaman default saat modul dibuka</span>
      </div>
    </div>
  );
}

// ─── Wireframe helpers ────────────────────────────────────────────────────────

const B = ({ h = "h-3", w = "w-full", bg = "bg-gray-200", rx = "rounded", className = "" }) => (
  <div className={`${h} ${w} ${bg} ${rx} flex-shrink-0 ${className}`} />
);
const Lbl = ({ t, className = "" }: { t: string; className?: string }) => (
  <div className={`text-[7px] font-mono text-gray-400 leading-tight ${className}`}>{t}</div>
);
const Section = ({ label, children, border = "border-gray-200", className = "" }: {
  label: string; children?: React.ReactNode; border?: string; className?: string;
}) => (
  <div className={`border ${border} rounded p-1.5 flex flex-col gap-1 ${className}`}>
    <Lbl t={label} />
    {children}
  </div>
);

// ─── Page wireframes ──────────────────────────────────────────────────────────

function WLogin() {
  return (
    <div className="w-full h-full flex overflow-hidden rounded-lg border border-gray-200 bg-white text-[8px]">
      {/* Brand panel */}
      <div className="w-[42%] bg-slate-700 p-4 flex flex-col gap-2 flex-shrink-0">
        <div className="flex items-center gap-2">
          <B w="w-8" h="h-8" bg="bg-slate-500" rx="rounded-full" />
          <B w="w-20" h="h-3" bg="bg-slate-500" />
        </div>
        <B h="h-5" bg="bg-slate-500" className="w-3/4 mt-2" />
        <B h="h-2" bg="bg-slate-600 mt-1" />
        <B h="h-2" bg="bg-slate-600" className="w-4/5" />
        <B h="h-2" bg="bg-slate-600" className="w-5/6" />
        <div className="flex-1" />
        <B h="h-2" bg="bg-slate-600" className="w-2/3" />
        <B h="h-2" bg="bg-slate-600" className="w-1/2" />
      </div>
      {/* Form panel */}
      <div className="flex-1 flex flex-col justify-center px-5 gap-1.5">
        <B h="h-5" bg="bg-gray-800" className="w-1/2 mb-1" />
        <B h="h-2" bg="bg-gray-300" className="w-1/4" />
        <B h="h-7" bg="bg-gray-100" rx="rounded border border-gray-300" />
        <B h="h-2" bg="bg-gray-300" className="w-1/4 mt-0.5" />
        <B h="h-7" bg="bg-gray-100" rx="rounded border border-gray-300" />
        <div className="h-7 rounded mt-1" style={{ background: "var(--tsu-teal)" }} />
        <div className="flex items-center gap-1 my-1">
          <B h="h-px" bg="bg-gray-200" />
          <Lbl t="Akun Demo" className="flex-shrink-0 mx-1" />
          <B h="h-px" bg="bg-gray-200" />
        </div>
        <div className="grid grid-cols-2 gap-1">
          {["Full Access","Pengawasan","Back Office","Auditee"].map(l => (
            <div key={l} className="h-6 border border-gray-200 rounded bg-gray-50 flex items-center px-2">
              <Lbl t={l} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function WShell({ children }: { children?: React.ReactNode }) {
  return (
    <div className="w-full h-full flex overflow-hidden rounded-lg border border-gray-200 bg-white text-[8px]">
      {/* Sidebar */}
      <div className="w-[14%] flex-shrink-0 bg-gray-800 flex flex-col gap-1 p-2">
        <B w="w-full" h="h-6" bg="bg-gray-600" className="mb-1" />
        {["🔍 Pengawasan","🗂️ Back Office"].map(l => (
          <div key={l} className="h-5 rounded bg-gray-700 px-1 flex items-center">
            <Lbl t={l} className="text-gray-400" />
          </div>
        ))}
        <div className="border-t border-gray-700 my-1" />
        {[1,2,3,4,5].map(i => <B key={i} h="h-4" bg="bg-gray-700" />)}
        <div className="flex-1" />
        <B h="h-4" bg="bg-gray-700" />
        <Lbl t="WebDev SPI-TSU · V1.0" className="text-gray-600 text-center" />
      </div>
      {/* Main */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {/* Topbar */}
        <div className="flex items-center gap-2 px-3 py-1.5 bg-white border-b border-gray-100 flex-shrink-0">
          <B h="h-3" bg="bg-gray-200" className="w-32" />
          <div className="flex-1" />
          <B h="h-4" w="w-12" bg="bg-amber-200" rx="rounded-full" />
          <B h="h-4" w="w-4" bg="bg-gray-200" rx="rounded-full" />
          <B h="h-4" w="w-4" bg="bg-gray-200" rx="rounded-full" />
        </div>
        {/* Sub-menu strip */}
        <div className="flex gap-1 px-3 py-1.5 border-b border-gray-100 bg-gray-50 flex-shrink-0">
          {[1,2,3,4].map(i => <B key={i} h="h-4" w="w-16" bg={i===1?"bg-teal-200":"bg-gray-200"} />)}
        </div>
        {/* Content */}
        <div className="flex-1 overflow-hidden p-3">
          {children ?? <B h="h-full" bg="bg-gray-100" />}
        </div>
      </div>
    </div>
  );
}

function WPwRingkasan() {
  return (
    <WShell>
      <div className="flex flex-col gap-2 h-full">
        {/* KPI strip */}
        <div className="grid grid-cols-4 gap-1.5 flex-shrink-0">
          {["Audit Aktif","Temuan Open","RTL Selesai","Skor Risiko"].map(l => (
            <div key={l} className="border border-gray-200 rounded p-1.5 bg-white">
              <B h="h-5" bg="bg-gray-800" className="w-1/2 mb-1" />
              <Lbl t={l} />
            </div>
          ))}
        </div>
        {/* Charts row */}
        <div className="grid grid-cols-3 gap-1.5 flex-shrink-0">
          <div className="col-span-2 border border-gray-200 rounded p-1.5 bg-white">
            <Lbl t="Tren Audit Bulanan (bar chart)" className="mb-1" />
            <div className="flex items-end gap-0.5 h-14">
              {[6,9,5,11,8,7,10,6,9,4,8,7].map((h,i) => (
                <div key={i} className="flex-1 rounded-t" style={{ height: `${h*5}px`, background: "var(--tsu-teal)", opacity: 0.6 + i*0.03 }} />
              ))}
            </div>
          </div>
          <div className="border border-red-100 rounded p-1.5 bg-red-50">
            <Lbl t="⚠ Alert Urgent" className="text-red-400 mb-1" />
            {[1,2,3].map(i => <B key={i} h="h-3" bg="bg-red-200" className="mb-1" />)}
          </div>
        </div>
        {/* Audit table */}
        <div className="flex-1 border border-gray-200 rounded p-1.5 bg-white min-h-0">
          <Lbl t="Tabel Audit Berjalan" className="mb-1" />
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-1 mb-1">
              <B h="h-2.5" className="w-16" />
              <B h="h-2.5" className="flex-1" />
              <div className="w-20 h-2 bg-gray-100 rounded-full overflow-hidden flex-shrink-0">
                <div className="h-full rounded-full" style={{ width: `${20+i*15}%`, background: "var(--tsu-teal)" }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </WShell>
  );
}

function WBoRingkasan() {
  return (
    <WShell>
      <div className="flex flex-col gap-2 h-full">
        {/* KPI */}
        <div className="grid grid-cols-4 gap-1.5 flex-shrink-0">
          {["Surat Terproses","Rapat Terlaksana","Auditor Sertifikasi","Dokumen Terarsip"].map(l => (
            <div key={l} className="border border-gray-200 rounded p-1.5 bg-white">
              <B h="h-5" bg="bg-gray-800" className="w-1/2 mb-1" />
              <Lbl t={l} />
            </div>
          ))}
        </div>
        {/* Row 2 */}
        <div className="grid grid-cols-2 gap-1.5 flex-shrink-0">
          {["Administrasi (4 stat)","PKPT — progress 50%"].map((l, i) => (
            <div key={l} className="border border-gray-200 rounded p-1.5 bg-white">
              <Lbl t={l} className="mb-1" />
              <div className="grid grid-cols-2 gap-1">
                {[1,2,3,4].map(j => <B key={j} h="h-5" bg="bg-gray-100" rx="rounded border border-gray-200" />)}
              </div>
              {i === 1 && <div className="mt-1 h-1.5 bg-gray-100 rounded-full overflow-hidden"><div className="h-full bg-green-400 rounded-full" style={{ width: "50%" }} /></div>}
            </div>
          ))}
        </div>
        {/* Row 3 */}
        <div className="grid grid-cols-2 gap-1.5 flex-1 min-h-0">
          <div className="border border-gray-200 rounded p-1.5 bg-white">
            <Lbl t="Agenda Mendatang" className="mb-1" />
            {[1,2,3].map(i => (
              <div key={i} className="flex gap-1 mb-1">
                <B h="h-5" w="w-8" bg="bg-teal-100" rx="rounded" />
                <div className="flex-1"><B h="h-2.5" /><B h="h-2" bg="bg-gray-100" className="mt-0.5 w-3/4" /></div>
              </div>
            ))}
          </div>
          <div className="border border-gray-200 rounded p-1.5 bg-white">
            <Lbl t="Deadline & Reminder" className="mb-1" />
            {[1,2,3].map(i => (
              <div key={i} className={`flex gap-1 mb-1 pl-1 rounded border-l-2 ${i===1?"border-red-400":"border-amber-300"}`}>
                <div className="flex-1"><B h="h-2.5" /><B h="h-2" bg="bg-gray-100" className="mt-0.5 w-2/3" /></div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </WShell>
  );
}

function WRtlAuditee() {
  return (
    <WShell>
      <div className="flex flex-col gap-2 h-full">
        {/* Banner auditee */}
        <div className="border border-purple-200 bg-purple-50 rounded p-2 flex-shrink-0">
          <Lbl t="📋 Tindak Lanjut Rekomendasi — BAAK" className="text-purple-600 font-bold" />
          <B h="h-2" bg="bg-purple-200" className="mt-1 w-2/3" />
        </div>
        {/* KPI strip auditee */}
        <div className="grid grid-cols-3 gap-1.5 flex-shrink-0">
          {["Total RTL","Dalam Proses","Terlambat"].map(l => (
            <div key={l} className="border border-gray-200 rounded p-1.5 bg-white">
              <B h="h-4" bg="bg-gray-800" className="w-1/2 mb-1" />
              <Lbl t={l} />
            </div>
          ))}
        </div>
        {/* RTL table */}
        <div className="flex-1 border border-gray-200 rounded p-1.5 bg-white min-h-0 overflow-hidden">
          <Lbl t="Daftar RTL — Rekomendasi Audit Aktif" className="mb-1" />
          {[
            { w: "60%", s: "Dalam Proses", c: "bg-blue-200" },
            { w: "20%", s: "Belum", c: "bg-gray-200" },
            { w: "90%", s: "Selesai", c: "bg-green-200" },
            { w: "40%", s: "Dalam Proses", c: "bg-blue-200" },
          ].map((r, i) => (
            <div key={i} className="flex items-center gap-1.5 mb-1.5">
              <B h="h-2" className="w-24" />
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className={`h-full rounded-full ${r.c}`} style={{ width: r.w }} />
              </div>
              <B h="h-4" w="w-10" bg="bg-gray-100" rx="rounded border border-gray-200" />
              <B h="h-4" w="w-14" bg="bg-teal-100" rx="rounded border border-teal-200" />
            </div>
          ))}
        </div>
        <Lbl t="[Upload Bukti] → file picker → simpan ke backend" className="text-teal-500 text-center" />
      </div>
    </WShell>
  );
}

function WKalenderBO() {
  return (
    <WShell>
      <div className="flex flex-col gap-2 h-full">
        {/* Calendar grid */}
        <div className="border border-gray-200 rounded p-1.5 bg-white flex-shrink-0">
          <Lbl t="Kalender — Mei 2025" className="mb-1" />
          <div className="grid grid-cols-7 gap-0.5">
            {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d => <Lbl key={d} t={d} className="text-center" />)}
            {Array.from({ length: 4 }).map((_,i) => <div key={`e${i}`} />)}
            {Array.from({ length: 31 }).map((_,i) => (
              <div key={i} className={`h-5 rounded text-center flex items-center justify-center ${i+1===22?"bg-indigo-600":i+1===26?"bg-purple-200":i+1===10||i+1===15?"bg-red-200":"bg-gray-50"}`}>
                <Lbl t={`${i+1}`} className={i+1===22?"text-white":""} />
              </div>
            ))}
          </div>
        </div>
        {/* Agenda Mendatang */}
        <div className="border border-gray-200 rounded p-1.5 bg-white flex-shrink-0">
          <div className="flex items-center justify-between mb-1">
            <Lbl t="Agenda Mendatang (rapat + deadline)" />
            <div className="h-4 w-16 rounded" style={{ background: "var(--tsu-teal)", opacity: 0.7 }} />
          </div>
          {[1,2,3].map(i => (
            <div key={i} className="flex items-center gap-1.5 mb-1">
              <B h="h-5" w="w-10" bg="bg-teal-50" rx="rounded border border-teal-100" />
              <div className="flex-1"><B h="h-2.5" /><B h="h-2" bg="bg-gray-100" className="mt-0.5 w-1/2" /></div>
              <div className="flex gap-0.5">
                <B h="h-4" w="w-6" bg="bg-gray-100" />
                <B h="h-4" w="w-6" bg="bg-gray-100" />
                <B h="h-4" w="w-8" bg="bg-red-50" />
              </div>
            </div>
          ))}
        </div>
        {/* Deadline */}
        <div className="flex-1 border border-red-100 rounded p-1.5 bg-red-50 min-h-0">
          <Lbl t="🔴 Overdue + Deadline Mendatang" className="text-red-400 mb-1" />
          {[1,2].map(i => (
            <div key={i} className="flex items-center gap-1.5 mb-1 pl-1 border-l-2 border-red-400 bg-white rounded-r p-1">
              <div className="flex-1"><B h="h-2.5" /><B h="h-2" bg="bg-gray-100" className="mt-0.5 w-2/3" /></div>
              <B h="h-4" w="w-16" bg="bg-green-100" rx="rounded border border-green-200" />
            </div>
          ))}
        </div>
      </div>
    </WShell>
  );
}

// ─── Layout tab ───────────────────────────────────────────────────────────────

const PAGES = [
  { id: "login",       label: "Login",                         icon: "🔐", desc: "Halaman autentikasi dua panel" },
  { id: "pw-ring",     label: "Pengawasan → Ringkasan",        icon: "🔍", desc: "Dashboard utama + KPI + tren + tabel" },
  { id: "bo-ring",     label: "Back Office → Ringkasan ★",     icon: "📊", desc: "Halaman default BO — 7 panel ringkasan" },
  { id: "rtl-aud",     label: "RTL → Auditee view",            icon: "✅", desc: "Banner unit + KPI + tabel + upload bukti" },
  { id: "kal-bo",      label: "Kalender BO → Jadwal Rapat",    icon: "📅", desc: "Kalender + Agenda Mendatang + Overdue" },
];

function LayoutView() {
  const [sel, setSel] = useState("login");

  const WF: Record<string, React.ReactNode> = {
    login:   <WLogin />,
    "pw-ring": <WPwRingkasan />,
    "bo-ring": <WBoRingkasan />,
    "rtl-aud": <WRtlAuditee />,
    "kal-bo":  <WKalenderBO />,
  };

  const cur = PAGES.find(p => p.id === sel)!;

  return (
    <div className="flex gap-4 max-w-5xl mx-auto px-4 pb-8">
      {/* Page list */}
      <div className="w-52 flex-shrink-0 flex flex-col gap-1">
        <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest px-2 mb-1">Halaman</div>
        {PAGES.map(p => (
          <button
            key={p.id}
            onClick={() => setSel(p.id)}
            className={`flex items-start gap-2 px-3 py-2.5 rounded-xl text-left transition-all ${
              sel === p.id
                ? "bg-white border border-gray-200 shadow-sm"
                : "hover:bg-white/60"
            }`}
          >
            <span className="text-base leading-none flex-shrink-0 mt-0.5">{p.icon}</span>
            <div>
              <div className="text-[11px] font-semibold text-gray-800">{p.label}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{p.desc}</div>
            </div>
          </button>
        ))}

        <div className="mt-4 px-2">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-widest mb-2">Legenda Warna</div>
          {[
            { bg: "bg-gray-800", l: "Header / judul utama" },
            { bg: "bg-gray-200", l: "Blok konten / teks" },
            { bg: "bg-gray-100", l: "Form input / surface" },
            { bg: "bg-teal-200", l: "Aksi utama / terpilih" },
            { bg: "bg-red-100",  l: "Alert / overdue" },
            { bg: "bg-purple-100", l: "Auditee-specific" },
          ].map(({ bg, l }) => (
            <div key={l} className="flex items-center gap-2 mb-1.5">
              <span className={`w-5 h-3 rounded flex-shrink-0 border border-black/5 ${bg}`} />
              <span className="text-[10px] text-gray-500">{l}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Wireframe display */}
      <div className="flex-1 flex flex-col gap-3">
        <div className="flex items-center gap-2">
          <span className="text-xl">{cur.icon}</span>
          <div>
            <div className="text-sm font-black text-gray-800">{cur.label}</div>
            <div className="text-xs text-gray-400">{cur.desc}</div>
          </div>
          <span className="ml-auto text-[10px] text-gray-400 font-mono bg-gray-100 px-2 py-1 rounded-full">Low-fidelity wireframe</span>
        </div>
        <div className="w-full bg-gray-50 rounded-xl border border-gray-200 p-3" style={{ aspectRatio: "16/10" }}>
          {WF[sel]}
        </div>
        <div className="text-[10px] text-gray-400 text-center">
          Klik nama halaman di kiri untuk beralih wireframe · Skala: representatif, bukan piksel-presisi
        </div>
      </div>
    </div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export default function Wireframe({ onClose }: { onClose: () => void }) {
  const [tab, setTab] = useState<"sitemap" | "layout">("sitemap");

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-5xl mx-auto px-4 py-3 flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 text-xs font-semibold text-gray-500 hover:text-gray-800 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100"
          >
            ← Kembali ke App
          </button>
          <div className="w-px h-4 bg-gray-200" />
          <div>
            <span className="text-sm font-black text-gray-800">📐 Wireframe Dokumen</span>
            <span className="ml-2 text-[10px] font-mono text-gray-400 bg-gray-100 px-2 py-0.5 rounded-full">SIMSPI TSU v43</span>
          </div>
          <div className="flex-1" />
          {/* Tab switcher */}
          <div className="flex items-center gap-1 bg-gray-100 rounded-xl p-1">
            {[
              { id: "sitemap", label: "🗺 Sitemap" },
              { id: "layout",  label: "📄 Page Layout" },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id as typeof tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.id
                    ? "bg-white shadow-sm text-gray-800"
                    : "text-gray-500 hover:text-gray-700"
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </header>

      {/* Description bar */}
      <div className="border-b border-gray-100 bg-white">
        <div className="max-w-5xl mx-auto px-4 py-2 text-[11px] text-gray-400">
          {tab === "sitemap"
            ? "Peta navigasi lengkap — semua modul, menu, sub-menu, dan status implementasi fitur"
            : "Wireframe layout low-fidelity untuk halaman-halaman utama aplikasi"
          }
        </div>
      </div>

      {/* Content */}
      <div className="py-6">
        {tab === "sitemap" ? <SitemapView /> : <LayoutView />}
      </div>
    </div>
  );
}
