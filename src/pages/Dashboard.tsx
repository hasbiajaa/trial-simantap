import React, { useState, createContext, useContext, useMemo } from "react";
const logoTSU = "/LOGO_TSU.png";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area,
  LineChart, Line, Legend,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { User } from "@/types/auth";

const UserCtx = createContext<User | null>(null);

// ── Shared Rapat state ────────────────────────────────────────────────────────

export interface Rapat {
  id: number;
  judul: string;
  tgl: string;
  jam: string;
  tempat: string;
  peserta: string[]; // list nama peserta / unit yang terlibat
  status: "Terjadwal" | "Selesai" | "Batal";
}

// Daftar peserta yang bisa dipilih di form
const PESERTA_INTERNAL = ["Ketua SPI", "Tim Auditor", "Staf Back Office"];
const UNIT_KERJA_LIST = [
  "BAAK","BAKPU","BAUK","Sarpras","SDM","BPU",
  "D3-DKV","D3-DPT","D3-SI","D3-TI",
  "F. Sains & Humaniora","F. Teknik","Sekolah Vokasi",
  "KUI","LPM","LPPM","Perpustakaan","PMB",
  "S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi",
  "S1-ReKom","S1-Sistem Informasi","Marcomm","PIKDI",
];

// Mapping peserta → role notifikasi
function pesertaToRoles(peserta: string[]): string[] {
  const roles = new Set<string>();
  peserta.forEach(p => {
    if (p === "Ketua SPI")        roles.add("full");
    if (p === "Tim Auditor")      roles.add("pengawasan");
    if (p === "Staf Back Office") roles.add("backoffice");
    if (p === "Rektor")           roles.add("rektor");
    if (UNIT_KERJA_LIST.includes(p)) roles.add("auditee");
  });
  return Array.from(roles);
}

function pesertaLabel(peserta: string[]): string {
  if (peserta.length === 0) return "—";
  if (peserta.length <= 3) return peserta.join(", ");
  return `${peserta.slice(0, 2).join(", ")} +${peserta.length - 2} lainnya`;
}

const RAPAT_AWAL: Rapat[] = [
  { id:1, judul:"Rapat Tinjauan Manajemen SPI",  tgl:"22 Mei 2025", jam:"09.00", tempat:"Ruang Rapat A",  peserta:["Ketua SPI","Tim Auditor"],        status:"Terjadwal" },
  { id:2, judul:"Koordinasi Program Audit 2025", tgl:"28 Mei 2025", jam:"10.00", tempat:"Online / Zoom",  peserta:["Ketua SPI","Tim Auditor","Staf Back Office"], status:"Terjadwal" },
  { id:3, judul:"Evaluasi RTL Semester I",       tgl:"3 Jun 2025",  jam:"13.00", tempat:"Ruang Rapat B",  peserta:["Ketua SPI","Tim Auditor","BAAK","LPPM","Sarpras"], status:"Terjadwal" },
  { id:4, judul:"Rapat Penutupan Audit LPPM",    tgl:"10 Mei 2025", jam:"09.00", tempat:"Ruang LPPM",     peserta:["Tim Auditor","LPPM"],              status:"Selesai"   },
  { id:5, judul:"Kick-off Audit Keuangan",       tgl:"5 Mei 2025",  jam:"08.30", tempat:"Ruang Keuangan", peserta:["Tim Auditor","BAUK"],              status:"Selesai"   },
  { id:6, judul:"Rapat Koordinasi Lintas Unit",  tgl:"2 Apr 2025",  jam:"14.00", tempat:"Aula Utama",     peserta:[...PESERTA_INTERNAL,...UNIT_KERJA_LIST], status:"Batal" },
];

interface RapatCtxType {
  rapatList: Rapat[];
  addRapat: (r: Omit<Rapat, "id" | "status">) => void;
  batalkanRapat: (id: number) => void;
}

const RapatCtx = createContext<RapatCtxType>({
  rapatList: RAPAT_AWAL,
  addRapat: () => {},
  batalkanRapat: () => {},
});

// ── Audit context (shared laporanList + rencanaList) ──────────────────────────
type LaporanItem = { no: string; unit: string; tgl: string; temuan: number; rekomendasi: number; status: string; link: string | null };
type RencanaItem = { no: string; unit: string; jenis: string; tim: string; anggaran: string; tglMulai: string; status: string };
interface AuditCtxType {
  laporanList: LaporanItem[];
  setLaporanList: React.Dispatch<React.SetStateAction<LaporanItem[]>>;
  rencanaList: RencanaItem[];
  setRencanaList: React.Dispatch<React.SetStateAction<RencanaItem[]>>;
}
const LAPORAN_AWAL: LaporanItem[] = [
  { no: "LHA-001/SPI/IV/2025", unit: "Fakultas Teknik", tgl: "10 Apr 2025", temuan: 3, rekomendasi: 5, status: "Diterima", link: "https://drive.google.com/file/lha-001-spi-2025" },
  { no: "LHA-002/SPI/IV/2025", unit: "LPPM",            tgl: "25 Apr 2025", temuan: 2, rekomendasi: 3, status: "Diterima", link: "https://drive.google.com/file/lha-002-spi-2025" },
  { no: "LHA-003/SPI/V/2025",  unit: "BAAK",            tgl: "Draft",       temuan: 2, rekomendasi: 4, status: "Draft",    link: null },
];
const RENCANA_AWAL: RencanaItem[] = [
  { no: "PA-001", unit: "Sarpras",       jenis: "Kinerja",   tim: "Budi S., Ratna D.", anggaran: "Rp 4.500.000", tglMulai: "5 Mei 2025",  status: "Disetujui" },
  { no: "PA-002", unit: "Keuangan",      jenis: "Keuangan",  tim: "Ratna D., Andi P.", anggaran: "Rp 3.200.000", tglMulai: "20 Mei 2025", status: "Disetujui" },
  { no: "PA-003", unit: "Kemahasiswaan", jenis: "Kinerja",   tim: "Andi P., Siti A.",  anggaran: "Rp 2.800.000", tglMulai: "1 Jun 2025",  status: "Draft" },
  { no: "PA-004", unit: "Perpustakaan",  jenis: "Kepatuhan", tim: "Siti A.",            anggaran: "Rp 1.500.000", tglMulai: "15 Jun 2025", status: "Draft" },
];
const RIWAYAT_HISTORIS: Record<string, { tahun: string; jenis: string; ketua: string; temuan: number; rtl: number; status: string }[]> = {
  "Fakultas Teknik": [
    { tahun:"2024", jenis:"Kepatuhan", ketua:"Ratna D.", temuan:2, rtl:2, status:"Selesai" },
    { tahun:"2023", jenis:"Kinerja",   ketua:"Budi S.",  temuan:4, rtl:4, status:"Selesai" },
  ],
  "LPPM": [
    { tahun:"2024", jenis:"Kinerja",   ketua:"Andi P.",  temuan:3, rtl:3, status:"Selesai" },
  ],
  "BAAK": [
    { tahun:"2023", jenis:"Kepatuhan", ketua:"Budi S.",  temuan:3, rtl:3, status:"Selesai" },
  ],
  "Sarpras": [
    { tahun:"2024", jenis:"Keuangan",  ketua:"Ratna D.", temuan:3, rtl:3, status:"Selesai" },
    { tahun:"2022", jenis:"Kinerja",   ketua:"Budi S.",  temuan:5, rtl:5, status:"Selesai" },
  ],
  "Kemahasiswaan": [
    { tahun:"2023", jenis:"Kepatuhan", ketua:"Siti A.",  temuan:2, rtl:2, status:"Selesai" },
  ],
};
const AuditCtx = createContext<AuditCtxType>({
  laporanList: LAPORAN_AWAL, setLaporanList: () => {},
  rencanaList: RENCANA_AWAL, setRencanaList: () => {},
});

// ── Icons ─────────────────────────────────────────────────────────────────────
const Ic = (path: string) =>
  ({ className = "" }: { className?: string }) => (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor"><path d={path} /></svg>
  );

const IconShield     = Ic("M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z");
const IconClipboard  = Ic("M19 3h-4.18C14.4 1.84 13.3 1 12 1s-2.4.84-2.82 2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 0c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm2 14H7v-2h7v2zm3-4H7v-2h10v2zm0-4H7V7h10v2z");
const IconCheck      = Ic("M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z");
const IconMail       = Ic("M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z");
const IconGroup      = Ic("M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z");
const IconFolder     = Ic("M10 4H4c-1.1 0-1.99.9-1.99 2L2 18c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V8c0-1.1-.9-2-2-2h-8l-2-2z");
const IconBell       = Ic("M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z");
const IconMenu       = Ic("M3 18h18v-2H3v2zm0-5h18v-2H3v2zm0-7v2h18V6H3z");
const IconArrow      = Ic("M10 6L8.59 7.41 13.17 12l-4.58 4.59L10 18l6-6z");
const IconChevron    = Ic("M7.41 8.59L12 13.17l4.59-4.58L18 10l-6 6-6-6 1.41-1.41z");
const IconCalendar   = Ic("M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z");
const IconSettings   = Ic("M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z");
const IconDashboard  = Ic("M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z");
const IconLogout     = Ic("M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z");
const IconWallet     = Ic("M21 7.28V5c0-1.1-.9-2-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.28A2 2 0 0 0 22 15v-6a2 2 0 0 0-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z M16 13.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z");

// ── Static data ───────────────────────────────────────────────────────────────

const rtlData    = [{ name: "Selesai", value: 18, color: "#22c55e" }, { name: "Proses", value: 14, color: "#f59e0b" }, { name: "Terlambat", value: 6, color: "#ef4444" }];
const auditBar   = [{ name: "Perencanaan", value: 12 }, { name: "Pelaksanaan", value: 18 }, { name: "Pelaporan", value: 14 }, { name: "Tindak Lanjut", value: 9 }];
const suratData  = [{ name: "Surat Masuk", value: 22, color: "#3b82f6" }, { name: "Surat Keluar", value: 28, color: "#14b8a6" }, { name: "Disposisi", value: 6, color: "#f59e0b" }];

const risikoDonut = [
  { name: "Tinggi", value: 3, color: "#ef4444" },
  { name: "Sedang", value: 4, color: "#f59e0b" },
  { name: "Rendah", value: 1, color: "#22c55e" },
];
const risikoPerUnit = [
  { unit: "Keuangan",      tinggi: 1, sedang: 0, rendah: 0 },
  { unit: "Sarpras",       tinggi: 1, sedang: 0, rendah: 0 },
  { unit: "Kemahasiswaan", tinggi: 1, sedang: 0, rendah: 0 },
  { unit: "BAAK",          tinggi: 0, sedang: 1, rendah: 0 },
  { unit: "LPPM",          tinggi: 0, sedang: 1, rendah: 0 },
  { unit: "Prodi Mnj.",    tinggi: 0, sedang: 1, rendah: 0 },
  { unit: "Humas",         tinggi: 0, sedang: 0, rendah: 1 },
  { unit: "Perpustakaan",  tinggi: 0, sedang: 0, rendah: 1 },
];

const auditTahapDonut = [
  { name: "Rencana",      value: 1, color: "#cbd5e1" },
  { name: "Entry Meeting",value: 1, color: "#3b82f6" },
  { name: "KKA",          value: 1, color: "#0e8080" },
  { name: "Draft Temuan", value: 1, color: "#f5a623" },
];
const auditPerUnit = [
  { unit: "Sarpras",       progress: 50, tahap: "KKA",          color: "#0e8080" },
  { unit: "BAAK",          progress: 75, tahap: "Draft Temuan",  color: "#f5a623" },
  { unit: "Keuangan",      progress: 20, tahap: "Entry Meeting", color: "#3b82f6" },
  { unit: "Kemahasiswaan", progress: 8,  tahap: "Rencana",       color: "#cbd5e1" },
];

const riwayatDonut = [
  { name: "Selesai",  value: 9, color: "#22c55e" },
  { name: "Berjalan", value: 2, color: "#f5a623" },
  { name: "Rencana",  value: 2, color: "#cbd5e1" },
];
const riwayatPerUnit = [
  { unit: "Fak. Teknik",   selesai: 3, berjalan: 0, rencana: 0 },
  { unit: "Sarpras",       selesai: 2, berjalan: 1, rencana: 0 },
  { unit: "LPPM",          selesai: 2, berjalan: 0, rencana: 0 },
  { unit: "BAAK",          selesai: 1, berjalan: 1, rencana: 0 },
  { unit: "Kemahasiswaan", selesai: 1, berjalan: 0, rencana: 1 },
  { unit: "Keuangan",      selesai: 0, berjalan: 1, rencana: 0 },
];
const rtlPerUnit = [
  { unit: "Fak. Hukum",    selesai: 0, proses: 1, terlambat: 1 },
  { unit: "LPPM",          selesai: 1, proses: 2, terlambat: 1 },
  { unit: "Sarpras",       selesai: 2, proses: 1, terlambat: 1 },
  { unit: "Fak. Teknik",   selesai: 3, proses: 1, terlambat: 0 },
  { unit: "BAAK",          selesai: 0, proses: 1, terlambat: 0 },
  { unit: "Kemahasiswaan", selesai: 1, proses: 0, terlambat: 0 },
];

// Radar data — risk profile per unit (4 dimensions)
const risikoRadarUnits = [
  { unit: "Keuangan",      Keuangan: 3, Operasional: 1, Kepatuhan: 1, Teknologi: 0 },
  { unit: "Sarpras",       Keuangan: 1, Operasional: 3, Kepatuhan: 1, Teknologi: 0 },
  { unit: "BAAK",          Keuangan: 0, Operasional: 1, Kepatuhan: 2, Teknologi: 1 },
  { unit: "LPPM",          Keuangan: 0, Operasional: 2, Kepatuhan: 1, Teknologi: 0 },
  { unit: "Kemahasiswaan", Keuangan: 2, Operasional: 0, Kepatuhan: 1, Teknologi: 0 },
];
const risikoRadarDimensions = ["Keuangan","Operasional","Kepatuhan","Teknologi"];

// Audit funnel data
const auditFunnelData = [
  { name: "Audit Universe",  value: 24, fill: "#0e8080" },
  { name: "PKPT / Rencana",  value: 15, fill: "#1a9090" },
  { name: "Sedang Berjalan", value: 8,  fill: "#f5a623" },
  { name: "Draft Temuan",    value: 5,  fill: "#3b82f6" },
  { name: "LHA Diterbitkan", value: 3,  fill: "#22c55e" },
];

// Audit gantt data
const auditGanttData = [
  { unit: "Sarpras",       mulai: 1,  durasi: 25, tahap: "KKA",           color: "#0e8080" },
  { unit: "BAAK",          mulai: 3,  durasi: 20, tahap: "Draft Temuan",  color: "#f5a623" },
  { unit: "Keuangan",      mulai: 18, durasi: 35, tahap: "Entry Meeting", color: "#3b82f6" },
  { unit: "Kemahasiswaan", mulai: 28, durasi: 30, tahap: "Rencana",       color: "#cbd5e1" },
  { unit: "LPPM",          mulai: 23, durasi: 28, tahap: "Pelaporan",     color: "#22c55e" },
];

// RTL area trend (bulanan)
const rtlTrendBulanan = [
  { bulan: "Jan", selesai: 2,  proses: 5,  terlambat: 3 },
  { bulan: "Feb", selesai: 4,  proses: 6,  terlambat: 4 },
  { bulan: "Mar", selesai: 6,  proses: 8,  terlambat: 5 },
  { bulan: "Apr", selesai: 9,  proses: 10, terlambat: 5 },
  { bulan: "Mei", selesai: 12, proses: 12, terlambat: 6 },
];

// RTL waterfall
const rtlWaterfallData = [
  { name: "Awal Tahun", base: 0,  value: 30, color: "#64748b", isTotal: true  },
  { name: "+ Baru",     base: 30, value: 8,  color: "#ef4444", isTotal: false },
  { name: "− Selesai",  base: 20, value: 18, color: "#22c55e", isTotal: false },
  { name: "Sisa RTL",   base: 0,  value: 20, color: "#f59e0b", isTotal: true  },
];

// Riwayat multi-line (temuan per tahun)
const riwayatTrenTemuan = [
  { tahun: "2022", FakTeknik: 4, LPPM: 0, BAAK: 0, Sarpras: 5, Keuangan: 0, Kemahasiswaan: 0 },
  { tahun: "2023", FakTeknik: 4, LPPM: 0, BAAK: 3, Sarpras: 0, Keuangan: 0, Kemahasiswaan: 2 },
  { tahun: "2024", FakTeknik: 2, LPPM: 3, BAAK: 0, Sarpras: 3, Keuangan: 0, Kemahasiswaan: 0 },
  { tahun: "2025", FakTeknik: 3, LPPM: 2, BAAK: 2, Sarpras: 4, Keuangan: 0, Kemahasiswaan: 0 },
];
const riwayatLineColors = ["#0e8080","#f5a623","#3b82f6","#ef4444","#8b5cf6","#22c55e"];
const riwayatLineUnits = [
  { key: "FakTeknik",      label: "Fak. Teknik" },
  { key: "LPPM",           label: "LPPM" },
  { key: "BAAK",           label: "BAAK" },
  { key: "Sarpras",        label: "Sarpras" },
  { key: "Keuangan",       label: "Keuangan" },
  { key: "Kemahasiswaan",  label: "Kemahasiswaan" },
];

// Kalender heatmap data (May 2025, intensity per day)
const kalHeatmap: Record<number, number> = {
  1:1, 5:3, 8:1, 10:3, 12:2, 15:3, 18:2, 19:2, 20:2, 22:3, 23:1, 26:3, 28:2, 31:2,
};

// Back office: surat trend
const suratTrend = [
  { bulan: "Jan", masuk: 8,  keluar: 10 },
  { bulan: "Feb", masuk: 12, keluar: 14 },
  { bulan: "Mar", masuk: 10, keluar: 12 },
  { bulan: "Apr", masuk: 15, keluar: 16 },
  { bulan: "Mei", masuk: 22, keluar: 28 },
];

// Back office: audit universe bubble chart
const auditUniverseBubble = [
  { unit: "Sarpras",       risiko: 4, dampak: 4, temuan: 4 },
  { unit: "Keuangan",      risiko: 3, dampak: 5, temuan: 3 },
  { unit: "BAAK",          risiko: 3, dampak: 3, temuan: 2 },
  { unit: "LPPM",          risiko: 2, dampak: 3, temuan: 2 },
  { unit: "Kemahasiswaan", risiko: 4, dampak: 2, temuan: 1 },
  { unit: "Humas",         risiko: 1, dampak: 2, temuan: 1 },
  { unit: "Perpustakaan",  risiko: 2, dampak: 1, temuan: 1 },
  { unit: "Fak. Teknik",   risiko: 3, dampak: 4, temuan: 3 },
];

// Back office: SDM radar
const sdmRadarAuditors = [
  { subject: "Audit Keuangan",  Budi: 4, Ratna: 3, Andi: 2, Siti: 3, fullMark: 5 },
  { subject: "Audit Kinerja",   Budi: 3, Ratna: 4, Andi: 4, Siti: 2, fullMark: 5 },
  { subject: "Audit Kepatuhan", Budi: 5, Ratna: 3, Andi: 3, Siti: 4, fullMark: 5 },
  { subject: "Analisis Risiko", Budi: 4, Ratna: 5, Andi: 3, Siti: 3, fullMark: 5 },
  { subject: "Pelaporan",       Budi: 3, Ratna: 4, Andi: 5, Siti: 4, fullMark: 5 },
  { subject: "Teknologi",       Budi: 2, Ratna: 3, Andi: 4, Siti: 5, fullMark: 5 },
];

// Back office: anggaran waterfall
const anggaranWaterfall = [
  { name: "Anggaran",     base: 0,   value: 185, color: "#0e8080", isTotal: true  },
  { name: "Q1 Realisasi", base: 140, value: 45,  color: "#22c55e", isTotal: false },
  { name: "Q2 Realisasi", base: 95,  value: 45,  color: "#22c55e", isTotal: false },
  { name: "Sisa",         base: 0,   value: 95,  color: "#f59e0b", isTotal: true  },
];
const anggaranTrend = [
  { bulan: "Jan", rencana: 30, realisasi: 28 },
  { bulan: "Feb", rencana: 30, realisasi: 32 },
  { bulan: "Mar", rencana: 35, realisasi: 30 },
  { bulan: "Apr", rencana: 40, realisasi: 38 },
  { bulan: "Mei", rencana: 50, realisasi: 42 },
];

const auditRows = [
  { no: 1, unit: "Fakultas Teknik",   jenis: "Kinerja",    status: "Pelaksanaan",   progress: 65 },
  { no: 2, unit: "LPPM",              jenis: "Kepatuhan",  status: "Pelaporan",     progress: 90 },
  { no: 3, unit: "BAAK",              jenis: "Kinerja",    status: "Perencanaan",   progress: 30 },
  { no: 4, unit: "Prodi Manajemen",   jenis: "Kepatuhan",  status: "Verifikasi RTL",progress: 45 },
];
const rtlRows = [
  { no: 1, unit: "Fakultas Hukum", temuan: "SOP Tidak Lengkap",      tgl: "10 Mei 2025" },
  { no: 2, unit: "LPPM",          temuan: "Dokumentasi Kegiatan",    tgl: "15 Mei 2025" },
  { no: 3, unit: "Sarpras",       temuan: "Pengelolaan Aset",        tgl: "18 Mei 2025" },
];
const agendaList = [
  { icon: <IconCalendar className="w-4 h-4" />, color: "bg-blue-100 text-blue-600",   title: "Rapat Tinjauan Manajemen SPI", sub: "Rapat Internal",     tgl: "22 Mei 2025", jam: "09.00 WIB" },
  { icon: <IconMail     className="w-4 h-4" />, color: "bg-teal-100 text-teal-600",   title: "Tindak Lanjut Hasil Audit",    sub: "Surat Keluar",       tgl: "23 Mei 2025", jam: "10.00 WIB" },
  { icon: <IconClipboard className="w-4 h-4" />,color: "bg-purple-100 text-purple-600",title: "Audit Pendahuluan LPPM",      sub: "Audit Kinerja",      tgl: "26 Mei 2025", jam: "09.00 WIB" },
];

const kpiData = [
  {
    kategori: "1", label: "Audit & Assurance", icon: "📋",
    accent: "#3b82f6", lightBg: "#eff6ff", textCls: "text-blue-600",
    items: [
      { kode:"1a", label:"Realisasi Program Audit Tahunan",       target:90,  bobot:4, real:87, arah:"atas"  },
      { kode:"1b", label:"Audit Selesai Tepat Waktu",             target:90,  bobot:4, real:92, arah:"atas"  },
      { kode:"1c", label:"LHA Diterbitkan Tepat Waktu",           target:90,  bobot:4, real:85, arah:"atas"  },
      { kode:"1d", label:"Unit Diaudit Sesuai Rencana",           target:100, bobot:3, real:90, arah:"atas"  },
    ],
  },
  {
    kategori: "2", label: "Kepatuhan & Tata Kelola", icon: "🏛️",
    accent: "#0e8080", lightBg: "#f0fdfa", textCls: "text-teal-600",
    items: [
      { kode:"2a", label:"Unit Memenuhi Ketentuan Tata Kelola",   target:85,  bobot:4, real:82, arah:"atas"  },
      { kode:"2b", label:"Kelengkapan Dokumen Tata Kelola",       target:90,  bobot:4, real:88, arah:"atas"  },
      { kode:"2c", label:"Kepatuhan terhadap SOP",               target:85,  bobot:4, real:83, arah:"atas"  },
      { kode:"2d", label:"Temuan Ketidakpatuhan",                target:10,  bobot:3, real:8,  arah:"bawah" },
    ],
  },
  {
    kategori: "3", label: "Pengendalian Internal", icon: "🔒",
    accent: "#7c3aed", lightBg: "#f5f3ff", textCls: "text-purple-600",
    items: [
      { kode:"3a", label:"Unit dengan Pengendalian Memadai",      target:80,  bobot:4, real:78, arah:"atas"  },
      { kode:"3b", label:"Kelemahan Pengendalian Diperbaiki",     target:80,  bobot:4, real:82, arah:"atas"  },
      { kode:"3c", label:"Unit Melaksanakan Self-Assessment",     target:80,  bobot:4, real:75, arah:"atas"  },
    ],
  },
  {
    kategori: "4", label: "Manajemen Risiko", icon: "🛡️",
    accent: "#f59e0b", lightBg: "#fffbeb", textCls: "text-amber-600",
    items: [
      { kode:"4a", label:"Unit Memiliki Risk Register",           target:100, bobot:4, real:100, arah:"atas" },
      { kode:"4b", label:"Risiko Prioritas Memiliki Mitigasi",   target:80,  bobot:4, real:82, arah:"atas"  },
      { kode:"4c", label:"Pelaksanaan Mitigasi Risiko",          target:80,  bobot:4, real:78, arah:"atas"  },
      { kode:"4d", label:"Risiko Tinggi Dimonitor Berkala",      target:100, bobot:3, real:95, arah:"atas"  },
    ],
  },
  {
    kategori: "5", label: "Tindak Lanjut Audit", icon: "✅",
    accent: "#22c55e", lightBg: "#f0fdf4", textCls: "text-green-600",
    items: [
      { kode:"5a", label:"Rekomendasi Audit Ditindaklanjuti",    target:80,  bobot:5, real:83, arah:"atas"  },
      { kode:"5b", label:"Temuan Selesai Tepat Waktu",           target:80,  bobot:5, real:78, arah:"atas"  },
      { kode:"5c", label:"Temuan Berulang",                      target:10,  bobot:5, real:8,  arah:"bawah" },
      { kode:"5d", label:"Rekomendasi Diverifikasi SPI",         target:90,  bobot:5, real:91, arah:"atas"  },
    ],
  },
  {
    kategori: "6", label: "Pengawasan Keuangan & Aset", icon: "💰",
    accent: "#0ea5e9", lightBg: "#f0f9ff", textCls: "text-sky-600",
    items: [
      { kode:"6a", label:"LPJ Lengkap dan Tepat Waktu",          target:90,  bobot:3, real:88, arah:"atas"  },
      { kode:"6b", label:"Kesesuaian Realisasi dengan RAB",      target:90,  bobot:3, real:91, arah:"atas"  },
      { kode:"6c", label:"Tindak Lanjut Temuan Keuangan",        target:90,  bobot:3, real:87, arah:"atas"  },
      { kode:"6d", label:"Aset Terinventarisasi",                target:95,  bobot:3, real:92, arah:"atas"  },
    ],
  },
  {
    kategori: "7", label: "Kinerja & Efektivitas Organisasi", icon: "📈",
    accent: "#ec4899", lightBg: "#fdf2f8", textCls: "text-pink-600",
    items: [
      { kode:"7a", label:"Unit Mencapai Target Kinerja",         target:80,  bobot:2, real:76, arah:"atas"  },
      { kode:"7b", label:"Program Mencapai Target Output",       target:80,  bobot:2, real:78, arah:"atas"  },
      { kode:"7c", label:"Rekomendasi Efisiensi Dilaksanakan",   target:80,  bobot:3, real:81, arah:"atas"  },
      { kode:"7d", label:"Rekomendasi Audit Kinerja Ditindaklanjuti", target:80, bobot:4, real:80, arah:"atas" },
    ],
  },
];
const kpiBackoffice = [
  { label: "Surat Terproses",     icon: <IconMail      className="w-5 h-5" />, bg: "bg-teal-100 text-teal-600",    target: 56,  real: 50,  sat: "Surat",    trend: +12 },
  { label: "Rapat Terlaksana",    icon: <IconGroup     className="w-5 h-5" />, bg: "bg-purple-100 text-purple-600",target: 20,  real: 18,  sat: "Rapat",    trend: +5  },
  { label: "Auditor Bersertifikat",icon: <IconShield   className="w-5 h-5" />, bg: "bg-blue-100 text-blue-600",   target: 10,  real: 8,   sat: "Orang",    trend: +1  },
  { label: "Dokumen Terarsip",    icon: <IconFolder    className="w-5 h-5" />, bg: "bg-sky-100 text-sky-600",     target: 150, real: 124, sat: "Dok",      trend: +18 },
];

const navGroups = [
  {
    key: "pengawasan",
    section: "MODUL PENGAWASAN SPI",
    items: [
      { label: "Ringkasan",              sectionKey: "ringkasan", icon: <IconDashboard  className="w-4 h-4" />, children: [] },
      { label: "Risiko",                 sectionKey: "risiko",    icon: <IconShield     className="w-4 h-4" />, children: ["Temuan Risiko", "Pemetaan Risiko"] },
      { label: "Audit",                  sectionKey: "audit",     icon: <IconClipboard  className="w-4 h-4" />, children: ["Rencana & Laporan Audit", "Entry Meeting – Draft – Exit", "Kertas Kerja Audit (KKA)"] },
      { label: "RTL",                    sectionKey: "rtl",       icon: <IconCheck      className="w-4 h-4" />, children: ["Tindak Lanjut (RTL)", "Verifikasi RTL"] },
      { label: "Riwayat Audit per Unit", sectionKey: "riwayat",   icon: <IconFolder     className="w-4 h-4" />, children: ["Riwayat per Unit", "Temuan Berulang"] },
      { label: "Kalender Pengawasan",    sectionKey: "kalender",  icon: <IconCalendar   className="w-4 h-4" />, children: ["Jadwal Audit", "Deadline & Reminder"] },
    ],
  },
  {
    key: "backoffice",
    section: "MODUL BACK OFFICE SPI",
    items: [
      { label: "Ringkasan",         sectionKey: "R", icon: <IconDashboard className="w-4 h-4" />, children: [] },
      { label: "Administrasi",      sectionKey: "A", icon: <IconMail      className="w-4 h-4" />, children: ["Jadwal Rapat", "Surat Masuk & Keluar", "Arsip Dokumen Audit"] },
      { label: "Perencanaan Audit", sectionKey: "B", icon: <IconClipboard className="w-4 h-4" />, children: ["Audit Universe", "PKPT", "Risk Register"] },
      { label: "Manajemen SDM",     sectionKey: "C", icon: <IconGroup     className="w-4 h-4" />, children: ["Kompetensi Auditor", "Riwayat Penugasan", "Jadwal Pelatihan"] },
      { label: "Regulasi & SOP",    sectionKey: "D", icon: <IconFolder    className="w-4 h-4" />, children: ["Pedoman Audit", "Peraturan Internal"] },
      { label: "Perencanaan Anggaran",   sectionKey: "G", icon: <IconWallet    className="w-4 h-4" />, children: ["Rencana Anggaran", "Realisasi Anggaran", "Laporan Keuangan"] },
      { label: "Kalender",               sectionKey: "F", icon: <IconCalendar  className="w-4 h-4" />, children: ["Jadwal Rapat", "Siklus Audit"] },
    ],
  },
];

// ── Reusable sub-components ───────────────────────────────────────────────────

function NavItem({
  label, icon, isActive, onNavigate,
}: {
  label: string; icon: React.ReactNode; children?: string[];
  isActive?: boolean; onNavigate?: () => void;
}) {
  return (
    <button
      onClick={() => onNavigate?.()}
      className="w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm font-medium transition-all"
      style={isActive
        ? { background: "rgba(255,255,255,0.15)", color: "#fff" }
        : { color: "rgba(255,255,255,0.75)" }}
    >
      <span style={{ color: isActive ? "var(--tsu-gold)" : "rgba(255,255,255,0.5)" }}>{icon}</span>
      <span className="flex-1 text-left text-xs">{label}</span>
      {isActive && <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: "var(--tsu-gold)" }} />}
    </button>
  );
}

function KpiCard({ label, icon, bg, target, real, sat, trend }: { label: string; icon: React.ReactNode; bg: string; target: number; real: number; sat: string; trend: number }) {
  const pct = Math.round((real / target) * 100);
  const status = pct >= 90 ? { label: "Baik", cls: "text-green-600 bg-green-50" } : pct >= 70 ? { label: "Cukup", cls: "text-yellow-600 bg-yellow-50" } : { label: "Kurang", cls: "text-red-600 bg-red-50" };
  const bar   = pct >= 90 ? "#22c55e" : pct >= 70 ? "#f59e0b" : "#ef4444";
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${bg}`}>{icon}</div>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${status.cls}`}>{status.label}</span>
      </div>
      <div>
        <div className="text-xs text-gray-500 font-medium leading-tight mb-1">{label}</div>
        <div className="flex items-end gap-1">
          <span className="text-2xl font-black text-gray-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{real}</span>
          <span className="text-xs text-gray-400 mb-1">/ {target} {sat}</span>
        </div>
      </div>
      <div>
        <div className="flex justify-between text-[10px] text-gray-400 mb-1">
          <span>Realisasi</span>
          <span className="font-semibold text-gray-600">{pct}%</span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2">
          <div className="h-2 rounded-full transition-all" style={{ width: `${Math.min(pct, 100)}%`, background: bar }} />
        </div>
      </div>
      <div className="flex items-center gap-1 text-[10px]">
        <span className={trend >= 0 ? "text-green-600 font-semibold" : "text-red-500 font-semibold"}>
          {trend >= 0 ? "▲" : "▼"} {Math.abs(trend)}{sat === "%" ? "%" : ""}
        </span>
        <span className="text-gray-400">vs periode lalu</span>
      </div>
    </div>
  );
}

function StatCard({ icon, iconBg, label, value, sub }: { icon: React.ReactNode; iconBg: string; label: string; value: number; sub: string }) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className={`w-10 h-10 rounded-lg flex items-center justify-center text-white ${iconBg}`}>{icon}</div>
        <span className="text-xs font-bold tracking-widest text-gray-500 uppercase">{label}</span>
      </div>
      <div className="text-3xl font-bold text-gray-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{value}</div>
      <div className="text-xs text-gray-400">{sub}</div>
      <button className="mt-auto flex items-center gap-1 text-xs font-semibold hover:opacity-80 transition-opacity" style={{ color: "var(--tsu-teal)" }}>
        Lihat Detail <IconArrow className="w-3 h-3" />
      </button>
    </div>
  );
}

// ── Pengawasan section data ───────────────────────────────────────────────────

const pwSections = [
  { key: "ringkasan", label: "Ringkasan",              icon: "📊" },
  { key: "risiko",    label: "Risiko",                 icon: "🛡️" },
  { key: "audit",     label: "Audit",                  icon: "📋" },
  { key: "rtl",       label: "RTL",                    icon: "✅" },
  { key: "riwayat",   label: "Riwayat Audit per Unit", icon: "📁" },
  { key: "kalender",  label: "Kalender Pengawasan",    icon: "📅" },
];

// ── Pengawasan sub-sections ───────────────────────────────────────────────────

function KpiPengawasanPanel() {
  const [popupKat, setPopupKat] = useState<string | null>(null);

  const statusItem = (item: typeof kpiData[0]["items"][0]) => {
    if (item.arah === "bawah") {
      if (item.real <= item.target) return "Baik";
      if (item.real <= item.target * 1.3) return "Cukup";
      return "Kurang";
    }
    const pct = (item.real / item.target) * 100;
    if (pct >= 100) return "Baik";
    if (pct >= 80) return "Cukup";
    return "Kurang";
  };

  const katScore = (kat: typeof kpiData[0]) => {
    const scores = kat.items.map(it =>
      it.arah === "bawah"
        ? it.real <= it.target ? 100 : Math.max(0, 100 - (it.real - it.target) * 10)
        : Math.min(100, Math.round((it.real / it.target) * 100))
    );
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const totalBobot = kpiData.flatMap(k => k.items).reduce((s, i) => s + i.bobot, 0);
  const indeks = Math.round(kpiData.flatMap(k => k.items).reduce((s, it) => {
    const score = it.arah === "bawah"
      ? (it.real <= it.target ? 100 : Math.max(0, 100 - (it.real - it.target) * 10))
      : Math.min(100, (it.real / it.target) * 100);
    return s + score * it.bobot;
  }, 0) / totalBobot);

  const popupData = kpiData.find(k => k.kategori === popupKat) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header + indeks */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">KPI Pengawasan — 7 Kategori · 25 Indikator</h3>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl border" style={{ borderColor: "var(--tsu-teal)", background: "var(--tsu-teal-light)" }}>
          <span className="text-[10px] font-bold" style={{ color: "var(--tsu-teal)" }}>Indeks Komposit</span>
          <span className="text-sm font-black" style={{ color: "var(--tsu-teal-dark)" }}>{indeks}%</span>
        </div>
      </div>

      {/* Horizontal slider */}
      <div className="overflow-x-auto pb-2 -mx-1 px-1">
        <div className="flex gap-3" style={{ width: "max-content" }}>
          {kpiData.map(kat => {
            const score = katScore(kat);
            const color = score >= 90 ? "#22c55e" : score >= 75 ? "#f59e0b" : "#ef4444";
            return (
              <button key={kat.kategori}
                onClick={() => setPopupKat(kat.kategori)}
                className="flex flex-col bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md transition-all text-left"
                style={{ width: 148, flexShrink: 0 }}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-lg">{kat.icon}</span>
                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>{score}%</span>
                </div>
                <div className="text-[10px] font-bold text-gray-700 leading-tight mb-2 flex-1">{kat.label}</div>
                <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                  <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
                </div>
                <div className="text-[9px] text-gray-400">{kat.items.length} indikator · {kat.items.reduce((s, i) => s + i.bobot, 0)}%</div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Popup modal detail */}
      {popupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setPopupKat(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100" style={{ background: popupData.lightBg }}>
              <span className="text-xl">{popupData.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: popupData.accent }}>Kategori {popupData.kategori}</div>
                <div className="text-sm font-black text-gray-800 leading-tight">{popupData.label}</div>
              </div>
              <button onClick={() => setPopupKat(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0">✕</button>
            </div>
            <div className="divide-y divide-gray-50 max-h-96 overflow-y-auto">
              {popupData.items.map(it => {
                const status = statusItem(it);
                const pct = it.arah === "bawah"
                  ? (it.real <= it.target ? 100 : Math.max(0, 100 - (it.real - it.target) * 10))
                  : Math.min(100, Math.round((it.real / it.target) * 100));
                const barColor = status === "Baik" ? "#22c55e" : status === "Cukup" ? "#f59e0b" : "#ef4444";
                const badgeCls = status === "Baik" ? "bg-green-50 text-green-600" : status === "Cukup" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500";
                return (
                  <div key={it.kode} className="px-5 py-3">
                    <div className="flex items-start justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-[10px] font-black flex-shrink-0" style={{ color: popupData.accent }}>{it.kode}</span>
                        <span className="text-[11px] font-semibold text-gray-700 leading-tight">{it.label}</span>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeCls}`}>{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 w-8 text-right flex-shrink-0">{it.real}%</span>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1">
                      Target: {it.arah === "bawah" ? "≤" : "≥"}{it.target}% · Bobot {it.bobot}%
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setPopupKat(null)}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PwRingkasan() {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  return (
    <div className="flex flex-col gap-4">
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}>🏛️</div>
          <div>
            <div className="text-sm font-black text-purple-800">Unit: {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Anda masuk sebagai auditee. Hanya data yang berkaitan dengan unit <strong>{myUnit}</strong> yang ditampilkan.</div>
          </div>
        </div>
      )}
      {/* ── Urgent-alerts strip (non-auditee only) ── */}
      {!myUnit && (
        <div className="flex gap-2 flex-wrap">
          {[
            { icon: "🔴", label: "3 RTL Terlambat",                  color: "bg-red-50 border-red-200 text-red-700"    },
            { icon: "⏰", label: "2 Deadline ≤7 Hari",               color: "bg-amber-50 border-amber-200 text-amber-700" },
            { icon: "⚠️", label: "3 Risiko Tinggi Belum Ditindak",   color: "bg-orange-50 border-orange-200 text-orange-700" },
          ].map(a => (
            <div key={a.label} className={`flex items-center gap-1.5 text-[10px] font-semibold px-3 py-1.5 rounded-full border ${a.color}`}>
              <span>{a.icon}</span><span>{a.label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── KPI 7 Kategori (non-auditee only) ── */}
      {!myUnit && <KpiPengawasanPanel />}

      {/* ── 4 module summary charts (non-auditee) ── */}
      {!myUnit && (() => {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Chart 1 — Risiko */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700">🛡️ Risiko — Sebaran Tingkat</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>8 Temuan</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <ResponsiveContainer width="38%" height={110}>
                  <PieChart>
                    <Pie data={risikoDonut} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                      {risikoDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <text x="50%" y="45%" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">8</text>
                    <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill="#64748b">Risiko</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 flex flex-col gap-1.5">
                  {risikoDonut.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-[10px] text-gray-600 flex-1">{d.name}</span>
                      <span className="text-[10px] font-bold text-gray-700">{d.value}</span>
                      <span className="text-[9px] text-gray-400">({Math.round(d.value / 8 * 100)}%)</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Detail per Unit Kerja</span>
                  <div className="flex gap-2 ml-auto">
                    {risikoDonut.map(d => (
                      <div key={d.name} className="flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full" style={{ background: d.color }} />
                        <span className="text-[8px] text-gray-400">{d.name}</span>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="flex flex-col gap-1.5">
                  {risikoPerUnit.map(row => {
                    const total = row.tinggi + row.sedang + row.rendah;
                    const bars = [
                      { val: row.tinggi, color: "#ef4444", label: "Tinggi" },
                      { val: row.sedang, color: "#f59e0b", label: "Sedang" },
                      { val: row.rendah, color: "#22c55e", label: "Rendah" },
                    ];
                    return (
                      <div key={row.unit} className="flex items-center gap-2">
                        <span className="text-[10px] text-gray-600 w-20 flex-shrink-0">{row.unit}</span>
                        <div className="flex-1 flex h-3 rounded-full overflow-hidden gap-px">
                          {bars.map(b => b.val > 0 && (
                            <div key={b.label} className="h-full" title={`${b.label}: ${b.val}`}
                              style={{ width: `${(b.val / total) * 100}%`, background: b.color, minWidth: 4 }} />
                          ))}
                        </div>
                        <div className="flex gap-1 flex-shrink-0 min-w-[40px] justify-end">
                          {bars.map(b => b.val > 0 && (
                            <span key={b.label} className="text-[9px] font-bold" style={{ color: b.color }}>{b.val}</span>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chart 2 — Audit */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700">📋 Audit — Progress Berjalan</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>4 Unit</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <ResponsiveContainer width="38%" height={110}>
                  <PieChart>
                    <Pie data={auditTahapDonut} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                      {auditTahapDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <text x="50%" y="45%" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">4</text>
                    <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill="#64748b">Audit</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 flex flex-col gap-1.5">
                  {auditTahapDonut.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-[10px] text-gray-600 flex-1">{d.name}</span>
                      <span className="text-[10px] font-bold text-gray-700">{d.value}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="border-t border-gray-100 pt-3">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Progress per Unit Kerja</span>
                </div>
                <div className="flex flex-col gap-2">
                  {auditPerUnit.map(a => (
                    <div key={a.unit}>
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-[10px] text-gray-600">{a.unit}</span>
                        <span className="text-[9px] font-semibold px-1.5 py-0.5 rounded-full"
                          style={{ background: a.color === "#cbd5e1" ? "#f1f5f9" : `${a.color}18`, color: a.color === "#cbd5e1" ? "#94a3b8" : a.color }}>
                          {a.tahap}
                        </span>
                      </div>
                      <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${a.progress}%`, background: a.color }} />
                      </div>
                      <div className="text-right text-[9px] text-gray-400 mt-0.5">{a.progress}%</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart 3 — RTL */}
            {(() => {
              const statusMeta = [
                { key: "selesai" as const,   label: "Selesai",   color: "#22c55e" },
                { key: "proses" as const,     label: "Proses",    color: "#3b82f6" },
                { key: "terlambat" as const,  label: "Terlambat", color: "#ef4444" },
              ];
              return (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-700">✅ RTL — Status per Unit Kerja</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-gold-light)", color: "#a0620a" }}>38 Total</span>
                  </div>

                  {/* Donut + legend row */}
                  <div className="flex items-center gap-3 mb-4">
                    <ResponsiveContainer width="38%" height={110}>
                      <PieChart>
                        <Pie data={rtlData} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                          {rtlData.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <text x="50%" y="45%" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">38</text>
                        <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill="#64748b">RTL</text>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 flex flex-col gap-1.5">
                      {rtlData.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-[10px] text-gray-600 flex-1">{d.name}</span>
                          <span className="text-[10px] font-bold text-gray-700">{d.value}</span>
                          <span className="text-[9px] text-gray-400">({Math.round(d.value / 38 * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Per-unit breakdown */}
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Detail per Unit Kerja</span>
                      <div className="flex gap-2 ml-auto">
                        {statusMeta.map(s => (
                          <div key={s.key} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: s.color }} />
                            <span className="text-[8px] text-gray-400">{s.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {rtlPerUnit.map(row => {
                        const total = row.selesai + row.proses + row.terlambat;
                        return (
                          <div key={row.unit}>
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[10px] text-gray-600 w-24 flex-shrink-0">{row.unit}</span>
                              <div className="flex-1 flex h-3 rounded-full overflow-hidden gap-px">
                                {statusMeta.map(s => row[s.key] > 0 && (
                                  <div key={s.key} className="h-full" title={`${s.label}: ${row[s.key]}`}
                                    style={{ width: `${(row[s.key] / total) * 100}%`, background: s.color, minWidth: 4 }} />
                                ))}
                                {total === 0 && <div className="h-full w-full bg-gray-100 rounded-full" />}
                              </div>
                              <div className="flex gap-1.5 flex-shrink-0 min-w-[60px] justify-end">
                                {statusMeta.map(s => row[s.key] > 0 && (
                                  <span key={s.key} className="text-[9px] font-bold" style={{ color: s.color }}>{row[s.key]}</span>
                                ))}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

            {/* Chart 4 — Riwayat Audit per Unit */}
            {(() => {
              const riwayatMeta = [
                { key: "selesai"  as const, label: "Selesai",  color: "#22c55e" },
                { key: "berjalan" as const, label: "Berjalan", color: "#f5a623" },
                { key: "rencana"  as const, label: "Rencana",  color: "#cbd5e1" },
              ];
              const totalAudit = riwayatDonut.reduce((s, d) => s + d.value, 0);
              return (
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-700">📁 Riwayat Audit per Unit</h3>
                    <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>6 Unit</span>
                  </div>
                  <div className="flex items-center gap-3 mb-4">
                    <ResponsiveContainer width="38%" height={110}>
                      <PieChart>
                        <Pie data={riwayatDonut} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                          {riwayatDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                        </Pie>
                        <text x="50%" y="45%" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">{totalAudit}</text>
                        <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill="#64748b">Audit</text>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="flex-1 flex flex-col gap-1.5">
                      {riwayatDonut.map(d => (
                        <div key={d.name} className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                          <span className="text-[10px] text-gray-600 flex-1">{d.name}</span>
                          <span className="text-[10px] font-bold text-gray-700">{d.value}</span>
                          <span className="text-[9px] text-gray-400">({Math.round(d.value / totalAudit * 100)}%)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="border-t border-gray-100 pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Detail per Unit Kerja</span>
                      <div className="flex gap-2 ml-auto">
                        {riwayatMeta.map(m => (
                          <div key={m.key} className="flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: m.color }} />
                            <span className="text-[8px] text-gray-400">{m.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {riwayatPerUnit.map(row => {
                        const total = row.selesai + row.berjalan + row.rencana;
                        return (
                          <div key={row.unit} className="flex items-center gap-2">
                            <span className="text-[10px] text-gray-600 w-20 flex-shrink-0">{row.unit}</span>
                            <div className="flex-1 flex h-3 rounded-full overflow-hidden gap-px">
                              {riwayatMeta.map(m => row[m.key] > 0 && (
                                <div key={m.key} className="h-full" title={`${m.label}: ${row[m.key]}`}
                                  style={{ width: `${(row[m.key] / total) * 100}%`, background: m.color, minWidth: 4 }} />
                              ))}
                            </div>
                            <span className="text-[9px] text-gray-500 flex-shrink-0 w-6 text-right font-bold">{total}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              );
            })()}

          </div>
        );
      })()}

      {/* ── Auditee unit view ── */}
      {myUnit && (() => {
        const auditeeRisiko = [
          { id: "R-003", deskripsi: "SOP penerimaan mahasiswa tidak diperbarui",  kategori: "Kepatuhan",   tingkat: "Sedang",  status: "Proses"         },
          { id: "R-009", deskripsi: "Arsip mahasiswa keluar tidak terdigitalisasi",kategori: "Operasional", tingkat: "Rendah",  status: "Belum Ditindak" },
        ].filter(r => myUnit === "BAAK").concat(
          myUnit === "Sarpras" ? [
            { id: "R-002", deskripsi: "Pengelolaan aset tidak terdokumentasi",     kategori: "Operasional", tingkat: "Tinggi",  status: "Proses"         },
            { id: "R-010", deskripsi: "Belanja modal tidak disertai BA serah terima",kategori: "Keuangan",  tingkat: "Sedang",  status: "Belum Ditindak" },
          ] : myUnit === "Keuangan" ? [
            { id: "R-001", deskripsi: "Ketidaksesuaian pencatatan aset tetap",     kategori: "Keuangan",    tingkat: "Tinggi",  status: "Belum Ditindak" },
          ] : []
        );

        const rtlAuditee = [
          { no: 1, rekomendasi: "Perbarui SOP penerimaan mahasiswa sesuai Permendikbud 2023", batas: "30 Jun 2025", progres: 60,  status: "Proses"  },
          { no: 2, rekomendasi: "Digitalisasi arsip mahasiswa keluar 2020–2024",               batas: "31 Agt 2025", progres: 0,   status: "Belum"   },
          { no: 3, rekomendasi: "Penyusunan laporan pertanggungjawaban kegiatan UKM",          batas: "15 Jul 2025", progres: 100, status: "Selesai" },
        ];

        const auditBerjalan = { nama: "Audit Kepatuhan 2025", ketua: "Budi Santoso, S.E.", mulai: "1 Apr 2025", perkiraan: "30 Jun 2025", tahap: "Lapangan", progres: 65 };
        const auditSelesai  = [
          { nama: "Audit Kepatuhan 2023", ketua: "Ratna Dewi, M.Ak.", selesai: "Des 2023", temuan: 3, rtlSelesai: 3 },
          { nama: "Audit Kinerja 2022",   ketua: "Budi Santoso, S.E.",selesai: "Okt 2022", temuan: 2, rtlSelesai: 2 },
        ];

        const tingkatColor = (t: string) => t === "Tinggi" ? "bg-red-50 text-red-600" : t === "Sedang" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600";
        const statusRtlColor = (s: string) => s === "Selesai" ? "bg-green-50 text-green-600" : s === "Proses" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500";

        return (
          <div className="flex flex-col gap-4">
            {/* KPI strip auditee */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Audit Aktif",       val: 1,   color: "text-purple-600" },
                { label: "Total Temuan",       val: auditeeRisiko.length, color: "text-amber-600" },
                { label: "RTL Selesai",        val: 1,   color: "text-green-600"  },
                { label: "RTL Belum Selesai",  val: 2,   color: "text-red-600"    },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Audit berjalan */}
            <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700">🔍 Audit Sedang Berjalan</h4>
                <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-600">Tahap: {auditBerjalan.tahap}</span>
              </div>
              <div className="flex flex-col gap-2 p-3 rounded-xl border border-purple-100" style={{ background: "#f5f3ff" }}>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-purple-800">{auditBerjalan.nama}</div>
                    <div className="text-[10px] text-purple-500 mt-0.5">Ketua: {auditBerjalan.ketua}</div>
                    <div className="text-[10px] text-purple-400 mt-0.5">{auditBerjalan.mulai} — {auditBerjalan.perkiraan}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-black text-purple-700">{auditBerjalan.progres}%</div>
                    <div className="text-[9px] text-purple-400">Progres</div>
                  </div>
                </div>
                <div className="w-full bg-purple-100 rounded-full h-2">
                  <div className="h-2 rounded-full bg-purple-500 transition-all" style={{ width: `${auditBerjalan.progres}%` }} />
                </div>
              </div>
            </div>

            {/* Risiko & temuan unit */}
            {auditeeRisiko.length > 0 && (
              <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
                <h4 className="text-xs font-bold text-gray-700 mb-3">⚠ Temuan Risiko Unit {myUnit}</h4>
                <div className="flex flex-col gap-2">
                  {auditeeRisiko.map(r => (
                    <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50">
                      <span className="text-[9px] font-mono text-gray-400 flex-shrink-0">{r.id}</span>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-medium text-gray-700">{r.deskripsi}</div>
                        <div className="text-[9px] text-gray-400 mt-0.5">{r.kategori}</div>
                      </div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${tingkatColor(r.tingkat)}`}>{r.tingkat}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${r.status === "Proses" ? "bg-blue-50 text-blue-600" : r.status === "Selesai" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{r.status}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RTL unit */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-700 mb-3">📋 Tindak Lanjut Rekomendasi (RTL) — {myUnit}</h4>
              <div className="flex flex-col gap-3">
                {rtlAuditee.map(r => (
                  <div key={r.no} className="flex flex-col gap-1.5 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-mono text-gray-400 flex-shrink-0 mt-0.5">#{r.no}</span>
                      <div className="flex-1 text-xs text-gray-700 font-medium leading-snug">{r.rekomendasi}</div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusRtlColor(r.status)}`}>{r.status}</span>
                    </div>
                    <div className="flex items-center gap-2 pl-4">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full transition-all" style={{ width: `${r.progres}%`, background: r.progres === 100 ? "#22c55e" : r.progres > 0 ? "#3b82f6" : "#e2e8f0" }} />
                      </div>
                      <span className="text-[9px] text-gray-500 flex-shrink-0">{r.progres}%</span>
                      <span className="text-[9px] text-gray-400 flex-shrink-0">Batas: {r.batas}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Riwayat audit selesai */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-700 mb-3">📁 Riwayat Audit Unit {myUnit}</h4>
              <div className="flex flex-col gap-2">
                {auditSelesai.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <span className="text-xl">✅</span>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-700">{a.nama}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Ketua: {a.ketua} · Selesai: {a.selesai}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold text-green-600">{a.rtlSelesai}/{a.temuan} RTL</div>
                      <div className="text-[9px] text-gray-400">ditindaklanjuti</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function PwRisiko({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const activeRisiko = subSection === "Pemetaan Risiko" ? "peta" : "temuan";
  const [filterRisiko, setFilterRisiko] = useState("Semua");
  const [tambahModal, setTambahModal] = useState<string | null>(null);

  const [temuan, setTemuan] = useState([
    { id: "R-001", unit: "Keuangan & Akuntansi",  deskripsi: "Ketidaksesuaian pencatatan aset tetap",          kategori: "Keuangan",      tingkat: "Tinggi",  status: "Belum Ditindak" },
    { id: "R-002", unit: "Sarpras",               deskripsi: "Pengelolaan aset tidak terdokumentasi",           kategori: "Operasional",   tingkat: "Tinggi",  status: "Proses" },
    { id: "R-003", unit: "BAAK",                  deskripsi: "SOP penerimaan mahasiswa tidak diperbarui",       kategori: "Kepatuhan",     tingkat: "Sedang",  status: "Proses" },
    { id: "R-004", unit: "LPPM",                  deskripsi: "Dokumentasi kegiatan penelitian tidak lengkap",   kategori: "Operasional",   tingkat: "Sedang",  status: "Selesai" },
    { id: "R-005", unit: "Humas & Marketing",     deskripsi: "Pengelolaan data alumni tanpa prosedur baku",     kategori: "Teknologi",     tingkat: "Rendah",  status: "Selesai" },
    { id: "R-006", unit: "Prodi Manajemen",       deskripsi: "Laporan akreditasi tidak diarsipkan dengan baik", kategori: "Kepatuhan",     tingkat: "Sedang",  status: "Belum Ditindak" },
    { id: "R-007", unit: "Perpustakaan",          deskripsi: "Sistem katalog tidak terintegrasi dengan SIAKAD", kategori: "Teknologi",     tingkat: "Rendah",  status: "Proses" },
    { id: "R-008", unit: "Kemahasiswaan",         deskripsi: "Pertanggungjawaban dana kegiatan UKM tidak tepat waktu", kategori: "Keuangan", tingkat: "Tinggi", status: "Belum Ditindak" },
  ]);

  const tingkatColor: Record<string, string> = {
    Tinggi: "bg-red-50 text-red-600 border border-red-200",
    Sedang: "bg-amber-50 text-amber-600 border border-amber-200",
    Rendah: "bg-green-50 text-green-600 border border-green-200",
  };
  const statusColor: Record<string, string> = {
    "Belum Ditindak": "bg-red-50 text-red-600",
    Proses:           "bg-blue-50 text-blue-600",
    Selesai:          "bg-green-50 text-green-600",
  };
  const kategoriColor: Record<string, string> = {
    Keuangan:    "bg-purple-50 text-purple-600",
    Operasional: "bg-orange-50 text-orange-600",
    Kepatuhan:   "bg-teal-50 text-teal-600",
    Teknologi:   "bg-sky-50 text-sky-600",
  };

  const baseTemuan = myUnit ? temuan.filter(r => r.unit === myUnit) : temuan;
  const visibleTemuan = filterRisiko === "Semua"         ? baseTemuan
    : filterRisiko === "Tinggi"         ? baseTemuan.filter(r => r.tingkat === "Tinggi")
    : filterRisiko === "Sedang"         ? baseTemuan.filter(r => r.tingkat === "Sedang")
    : filterRisiko === "Rendah"         ? baseTemuan.filter(r => r.tingkat === "Rendah")
    : filterRisiko === "Belum Ditindak" ? baseTemuan.filter(r => r.status === "Belum Ditindak")
    : filterRisiko === "Proses"         ? baseTemuan.filter(r => r.status === "Proses")
    : baseTemuan.filter(r => r.status === "Selesai");

  const byTingkat = ["Tinggi", "Sedang", "Rendah"].map(t => ({
    label: t, count: visibleTemuan.filter(r => r.tingkat === t).length,
    color: t === "Tinggi" ? "#ef4444" : t === "Sedang" ? "#f59e0b" : "#22c55e",
  }));

  const byKategori = ["Keuangan","Operasional","Kepatuhan","Teknologi"].map(k => ({
    label: k, count: visibleTemuan.filter(r => r.kategori === k).length,
  }));

  return (
    <div className="flex flex-col gap-4">
      {/* Diagram ringkasan risiko */}
      {!myUnit && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700">🛡️ Diagram Risiko — Sebaran per Unit Kerja</h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>8 Temuan</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <ResponsiveContainer width="30%" height={120}>
              <PieChart>
                <Pie data={risikoDonut} cx="50%" cy="50%" innerRadius={34} outerRadius={52} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {risikoDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <text x="50%" y="45%" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">8</text>
                <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill="#64748b">Temuan</text>
              </PieChart>
            </ResponsiveContainer>
            <div className="flex-1 grid grid-cols-3 gap-2">
              {risikoDonut.map(d => (
                <div key={d.name} className="flex flex-col items-center justify-center rounded-xl py-2" style={{ background: `${d.color}12` }}>
                  <span className="text-xl font-black" style={{ color: d.color }}>{d.value}</span>
                  <span className="text-[9px] font-semibold text-gray-500 mt-0.5">{d.name}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="border-t border-gray-100 pt-3">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Detail per Unit Kerja</span>
              <div className="flex gap-3 ml-auto">
                {risikoDonut.map(d => (
                  <div key={d.name} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full" style={{ background: d.color }} />
                    <span className="text-[9px] text-gray-400">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-1.5">
              {risikoPerUnit.map(row => {
                const total = row.tinggi + row.sedang + row.rendah;
                const bars = [
                  { val: row.tinggi, color: "#ef4444", label: "Tinggi" },
                  { val: row.sedang, color: "#f59e0b", label: "Sedang" },
                  { val: row.rendah, color: "#22c55e", label: "Rendah" },
                ];
                return (
                  <div key={row.unit} className="flex items-center gap-2">
                    <span className="text-[10px] text-gray-600 w-24 flex-shrink-0">{row.unit}</span>
                    <div className="flex-1 flex h-3 rounded-full overflow-hidden gap-px">
                      {bars.map(b => b.val > 0 && (
                        <div key={b.label} className="h-full" title={`${b.label}: ${b.val}`}
                          style={{ width: `${(b.val / total) * 100}%`, background: b.color, minWidth: 4 }} />
                      ))}
                    </div>
                    <div className="flex gap-1 flex-shrink-0 min-w-[36px] justify-end">
                      {bars.map(b => b.val > 0 && (
                        <span key={b.label} className="text-[9px] font-bold" style={{ color: b.color }}>{b.val}</span>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ── Auditee: header + stat khusus unit ── */}
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}>🛡️</div>
          <div>
            <div className="text-sm font-black text-purple-800">Manajemen Risiko — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Menampilkan seluruh temuan risiko dan status tindak lanjut untuk unit <strong>{myUnit}</strong>.</div>
          </div>
        </div>
      )}

      {/* Summary strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {byTingkat.map(t => (
          <div key={t.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center gap-3">
            <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-black" style={{ background: t.color }}>{t.count}</div>
            <div>
              <div className="text-[10px] text-gray-400">Risiko</div>
              <div className="text-xs font-bold text-gray-700">{t.label}</div>
            </div>
          </div>
        ))}
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm flex items-center gap-3 md:col-span-1 col-span-2">
          <div className="flex-1">
            <div className="text-[10px] text-gray-400 mb-1">Per Kategori</div>
            <div className="flex gap-2 flex-wrap">
              {byKategori.map(k => (
                <span key={k.label} className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${kategoriColor[k.label]}`}>{k.label} ({k.count})</span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ── Auditee: detail RTL per temuan ── */}
      {myUnit && (() => {
        const rtlPerTemuan: Record<string, { rekomendasi: string; batas: string; progres: number; status: string }[]> = {
          "R-003": [
            { rekomendasi: "Perbarui SOP penerimaan mahasiswa sesuai Permendikbud 2023", batas: "30 Jun 2025", progres: 60,  status: "Proses"   },
            { rekomendasi: "Sosialisasi SOP yang diperbarui kepada staf BAAK",            batas: "31 Jul 2025", progres: 0,   status: "Belum"    },
          ],
          "R-009": [
            { rekomendasi: "Digitalisasi arsip mahasiswa keluar 2020–2024",               batas: "31 Agt 2025", progres: 0,   status: "Belum"    },
          ],
          "R-002": [
            { rekomendasi: "Lengkapi dokumen BA serah terima aset 2019–2024",             batas: "30 Jun 2025", progres: 40,  status: "Proses"   },
            { rekomendasi: "Implementasi sistem manajemen aset berbasis digital",          batas: "31 Des 2025", progres: 10,  status: "Proses"   },
          ],
          "R-010": [
            { rekomendasi: "Buat prosedur wajib BA untuk setiap pengadaan barang",        batas: "30 Jul 2025", progres: 0,   status: "Belum"    },
          ],
          "R-001": [
            { rekomendasi: "Rekonsiliasi seluruh pencatatan aset tetap periode 2022–2024",batas: "30 Jun 2025", progres: 25,  status: "Proses"   },
            { rekomendasi: "Pelaporan hasil rekonsiliasi ke Wakil Rektor II",              batas: "15 Jul 2025", progres: 0,   status: "Belum"    },
          ],
        };
        return (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">📋 Detail RTL per Temuan Risiko</h4>
            <div className="flex flex-col gap-3">
              {visibleTemuan.map(r => {
                const rtls = rtlPerTemuan[r.id] ?? [];
                return (
                  <div key={r.id} className="rounded-xl border border-gray-100 overflow-hidden">
                    {/* Header temuan */}
                    <div className={`flex items-center gap-2 px-3 py-2 ${r.tingkat === "Tinggi" ? "bg-red-50" : r.tingkat === "Sedang" ? "bg-amber-50" : "bg-green-50"}`}>
                      <span className="text-[9px] font-mono text-gray-400">{r.id}</span>
                      <span className="text-xs font-semibold text-gray-700 flex-1">{r.deskripsi}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${tingkatColor[r.tingkat]}`}>{r.tingkat}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${statusColor[r.status]}`}>{r.status}</span>
                    </div>
                    {/* RTL list */}
                    {rtls.length > 0 ? (
                      <div className="divide-y divide-gray-50">
                        {rtls.map((rtl, j) => (
                          <div key={j} className="px-3 py-2 flex flex-col gap-1">
                            <div className="flex items-start gap-2">
                              <span className="text-[9px] font-bold text-gray-400 mt-0.5 flex-shrink-0">→</span>
                              <span className="text-xs text-gray-600 flex-1 leading-snug">{rtl.rekomendasi}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${rtl.status === "Selesai" ? "bg-green-50 text-green-600" : rtl.status === "Proses" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>{rtl.status}</span>
                            </div>
                            <div className="flex items-center gap-2 pl-3.5">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                                <div className="h-1.5 rounded-full transition-all" style={{ width: `${rtl.progres}%`, background: rtl.progres === 100 ? "#22c55e" : rtl.progres > 0 ? "#3b82f6" : "#e2e8f0" }} />
                              </div>
                              <span className="text-[9px] text-gray-400 flex-shrink-0">{rtl.progres}%</span>
                              <span className="text-[9px] text-gray-400 flex-shrink-0 whitespace-nowrap">Batas: {rtl.batas}</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="px-3 py-2 text-[10px] text-gray-400 italic">Belum ada RTL yang ditetapkan.</div>
                    )}
                  </div>
                );
              })}
              {visibleTemuan.length === 0 && (
                <div className="text-center py-6 text-xs text-gray-400">Tidak ada temuan untuk filter yang dipilih.</div>
              )}
            </div>
          </div>
        );
      })()}

      {activeRisiko === "temuan" && (
        <div className="flex flex-col gap-4">
          {/* Grouped bar — risiko per unit per dimensi */}
          {!myUnit && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700">📊 Temuan Risiko per Unit & Dimensi</h4>
                <div className="flex gap-2">
                  {[{c:"#8b5cf6",l:"Keuangan"},{c:"#f5a623",l:"Operasional"},{c:"#0e8080",l:"Kepatuhan"},{c:"#3b82f6",l:"Teknologi"}].map(d=>(
                    <div key={d.l} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{background:d.c}}/>
                      <span className="text-[8px] text-gray-400">{d.l}</span>
                    </div>
                  ))}
                </div>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <BarChart data={risikoRadarUnits} barSize={8} barGap={2} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis dataKey="unit" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                  <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} domain={[0,4]} />
                  <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                  <Bar dataKey="Keuangan"    name="Keuangan"    fill="#8b5cf6" radius={[3,3,0,0]} />
                  <Bar dataKey="Operasional" name="Operasional" fill="#f5a623" radius={[3,3,0,0]} />
                  <Bar dataKey="Kepatuhan"   name="Kepatuhan"   fill="#0e8080" radius={[3,3,0,0]} />
                  <Bar dataKey="Teknologi"   name="Teknologi"   fill="#3b82f6" radius={[3,3,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}
          {/* filter bar */}
          <div className="flex gap-2 flex-wrap">
            {["Semua","Tinggi","Sedang","Rendah","Belum Ditindak","Proses","Selesai"].map(f => (
              <button key={f} onClick={() => setFilterRisiko(f)}
                className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                style={filterRisiko === f
                  ? { background: "var(--tsu-teal)", color: "#fff", borderColor: "var(--tsu-teal)" }
                  : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                {f}
              </button>
            ))}
          </div>

          {/* existing table card */}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <div className="p-4 border-b border-gray-100 flex items-center justify-between">
              <h4 className="text-xs font-bold text-gray-700">Daftar Temuan Risiko — Tahun 2025</h4>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>{visibleTemuan.length} Temuan</span>
                {!myUnit && canEdit && (
                  <button onClick={() => setTambahModal("Tambah Temuan")} className="text-[10px] font-semibold px-3 py-1 rounded-lg text-white flex items-center gap-1"
                    style={{ background: "var(--tsu-teal)" }}>
                    + Tambah Temuan
                  </button>
                )}
              </div>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["ID","Unit Kerja","Deskripsi Temuan","Kategori","Tingkat Risiko","Status","Aksi"].map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleTemuan.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500">{r.id}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">{r.unit}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[240px]">{r.deskripsi}</td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${kategoriColor[r.kategori]}`}>{r.kategori}</span></td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tingkatColor[r.tingkat]}`}>{r.tingkat}</span></td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-2.5">
                      {r.status !== "Selesai" && (
                        <button onClick={() => setTambahModal(`tl-${r.id}`)} className="text-[9px] font-bold px-2 py-1 rounded-lg text-white whitespace-nowrap"
                          style={{ background: "var(--tsu-teal)" }}>
                          Tindak Lanjut →
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {activeRisiko === "peta" && (
        <div className="flex flex-col gap-4">
          {/* Score grid — risiko unit × dimensi */}
          {!myUnit && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700">📋 Matriks Risiko per Unit & Dimensi</h4>
                <div className="flex gap-2">
                  {[{bg:"#fef2f2",c:"#ef4444",l:"Tinggi (≥3)"},{bg:"#fffbeb",c:"#f59e0b",l:"Sedang (1-2)"},{bg:"#f0fdf4",c:"#22c55e",l:"Rendah (0)"}].map(s=>(
                    <div key={s.l} className="flex items-center gap-1">
                      <span className="w-3 h-3 rounded" style={{background:s.bg,border:`1px solid ${s.c}30`}}/>
                      <span className="text-[8px] text-gray-400">{s.l}</span>
                    </div>
                  ))}
                </div>
              </div>
              {(() => {
                const dims = risikoRadarDimensions;
                const cellStyle = (v: number) => v >= 3
                  ? { bg: "#fef2f2", text: "#b91c1c", border: "#fecaca" }
                  : v >= 1
                  ? { bg: "#fffbeb", text: "#92400e", border: "#fed7aa" }
                  : { bg: "#f8fafc", text: "#94a3b8", border: "#e2e8f0" };
                return (
                  <div>
                    <div className="flex gap-1 mb-1 pl-24">
                      {dims.map(d => <div key={d} className="flex-1 text-center text-[9px] font-bold text-gray-500">{d}</div>)}
                    </div>
                    {risikoRadarUnits.map(u => (
                      <div key={u.unit} className="flex items-center gap-1 mb-1">
                        <span className="text-[10px] text-gray-600 w-24 flex-shrink-0 font-medium">{u.unit}</span>
                        {dims.map(d => {
                          const v = u[d as keyof typeof u] as number;
                          const s = cellStyle(v);
                          return (
                            <div key={d} className="flex-1 h-8 rounded-lg flex items-center justify-center text-xs font-black border"
                              style={{ background: s.bg, color: s.text, borderColor: s.border }}>
                              {v > 0 ? v : "—"}
                            </div>
                          );
                        })}
                      </div>
                    ))}
                  </div>
                );
              })()}
            </div>
          )}
          {/* color-coding info card */}
          <div className="rounded-xl border border-blue-100 p-3 flex items-start gap-3" style={{ background: "#eff6ff" }}>
            <span className="text-base flex-shrink-0">ℹ️</span>
            <div className="text-[10px] text-blue-800 leading-relaxed">
              <span className="font-bold">Panduan Warna Pemetaan Risiko: </span>
              <span className="font-semibold text-red-600">Merah</span> = risiko ekstrem/tinggi, perlu tindakan segera. &nbsp;
              <span className="font-semibold text-amber-600">Kuning</span> = risiko sedang, perlu perhatian dan monitoring. &nbsp;
              <span className="font-semibold text-green-600">Hijau</span> = risiko rendah/sangat rendah, dapat diterima dengan kontrol yang ada.
            </div>
          </div>

          {/* existing heatmap card */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-4">Pemetaan Risiko — Heat Map</h4>
          <div className="flex gap-6 items-start">
            {/* Heat map grid */}
            <div className="flex-1">
              <div className="flex items-end gap-1 mb-1">
                <div className="w-20 text-right text-[9px] text-gray-400 pr-2">Dampak ↑</div>
                <div className="flex-1 grid grid-cols-3 gap-1 text-center">
                  {["Rendah","Sedang","Tinggi"].map(l => <div key={l} className="text-[9px] text-gray-400 font-medium">{l}</div>)}
                </div>
              </div>
              {[
                { prob: "Tinggi",  cells: [{ color:"bg-amber-200", items:["R-003"] }, { color:"bg-red-200", items:["R-001","R-008"] }, { color:"bg-red-300", items:["R-002"] }] },
                { prob: "Sedang",  cells: [{ color:"bg-green-200", items:["R-005"] }, { color:"bg-amber-200",items:["R-004","R-006"]}, { color:"bg-red-200", items:[] }] },
                { prob: "Rendah",  cells: [{ color:"bg-green-100", items:["R-007"] }, { color:"bg-green-200",items:[]             }, { color:"bg-amber-200",items:[]}] },
              ].map(row => (
                <div key={row.prob} className="flex items-stretch gap-1 mb-1">
                  <div className="w-20 text-right text-[9px] text-gray-400 pr-2 flex items-center justify-end">{row.prob}</div>
                  <div className="flex-1 grid grid-cols-3 gap-1">
                    {row.cells.map((cell, ci) => (
                      <div key={ci} className={`${cell.color} rounded-lg p-2 min-h-[52px] flex flex-wrap gap-1 content-start`}>
                        {cell.items.map(id => <span key={id} className="text-[9px] bg-white/70 rounded px-1 font-mono font-bold text-gray-600">{id}</span>)}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              <div className="flex gap-1 ml-20 mt-1 text-center">
                {["Rendah","Sedang","Tinggi"].map(l => <div key={l} className="flex-1 text-[9px] text-gray-400">{l}</div>)}
              </div>
              <div className="text-center text-[9px] text-gray-400 ml-20 mt-0.5">Kemungkinan →</div>
            </div>
            {/* Legend */}
            <div className="flex flex-col gap-2 text-[10px] flex-shrink-0">
              {[{color:"bg-red-300",l:"Ekstrem"},{color:"bg-red-200",l:"Tinggi"},{color:"bg-amber-200",l:"Sedang"},{color:"bg-green-200",l:"Rendah"},{color:"bg-green-100",l:"Sangat Rendah"}].map(lg=>(
                <div key={lg.l} className="flex items-center gap-2"><span className={`w-3 h-3 rounded ${lg.color}`}/><span className="text-gray-500">{lg.l}</span></div>
              ))}
            </div>
          </div>
          </div>
        </div>
      )}

      {tambahModal?.startsWith("tl-") && (
        <TambahFormModal title={`Tindak Lanjut — ${tambahModal.replace("tl-","")}`} fields={[
          { key:"pic",     label:"Penanggung Jawab",    type:"text" },
          { key:"rencana", label:"Rencana Tindak Lanjut", type:"textarea" },
          { key:"target",  label:"Target Selesai",      type:"date" },
          { key:"link",    label:"Link Bukti / Dokumen (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setTemuan(prev => prev.map(t => tambahModal === `tl-${t.id}` ? { ...t, status: "Proses" } : t))}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Temuan" && (
        <TambahFormModal title="Tambah Temuan Risiko" fields={[
          { key:"kode",    label:"Kode Temuan",     type:"text",   placeholder:"R-009" },
          { key:"unit",    label:"Unit Kerja",      type:"select", options:["Keuangan & Akuntansi","Sarpras","BAAK","LPPM","Humas & Marketing","Prodi Manajemen","Perpustakaan","Kemahasiswaan"] },
          { key:"deskripsi",label:"Deskripsi Temuan", type:"textarea" },
          { key:"kategori",label:"Kategori",        type:"select", options:["Keuangan","Operasional","Kepatuhan","Teknologi"] },
          { key:"tingkat", label:"Tingkat Risiko",  type:"select", options:["Tinggi","Sedang","Rendah"] },
        ]}
        onSave={(v) => setTemuan(prev => [{ id: v.kode || `R-${String(prev.length + 1).padStart(3,"0")}`, unit: v.unit || "-", deskripsi: v.deskripsi || "-", kategori: v.kategori || "-", tingkat: v.tingkat || "Sedang", status: "Belum Ditindak" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

// ── Audit page 1: Rencana & Laporan ──────────────────────────────────────────
function AuditPageRencana() {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const [filterRencana, setFilterRencana] = useState("Semua");
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [showLHAModal, setShowLHAModal] = useState(false);
  const [lhaSaved, setLhaSaved] = useState(false);
  const [lhaStep, setLhaStep] = useState<"form" | "confirm" | "saved">("form");
  const [lhaForm, setLhaForm] = useState({ noLHA: "", unit: "", tanggal: "", linkDokumen: "", catatan: "" });
  const proses = [
    { key: "rencana", label: "Rencana Audit", icon: "📝" },
    { key: "entry",   label: "Entry Meeting",  icon: "🤝" },
    { key: "kka",     label: "KKA",            icon: "🗃️" },
    { key: "draft",   label: "Draft & Konfirmasi", icon: "📨" },
    { key: "exit",    label: "Exit Meeting",   icon: "🏁" },
    { key: "laporan", label: "Laporan (LHA)",  icon: "📄" },
  ];
  const tahapIndex: Record<string, number> = { rencana:0, entry:1, kka:2, draft:3, exit:4, laporan:5 };

  const auditBerjalan = [
    { unit: "Sarpras",       tahap: "kka",     jenis: "Kinerja",   ketua: "Budi S.",  mulai: "5 Mei",  target: "30 Mei" },
    { unit: "Keuangan",      tahap: "entry",   jenis: "Keuangan",  ketua: "Ratna D.", mulai: "20 Mei", target: "25 Jun" },
    { unit: "BAAK",          tahap: "draft",   jenis: "Kepatuhan", ketua: "Budi S.",  mulai: "1 Apr",  target: "20 Mei" },
    { unit: "Kemahasiswaan", tahap: "rencana", jenis: "Kinerja",   ketua: "Andi P.",  mulai: "1 Jun",  target: "31 Jul" },
  ];

  const { laporanList, setLaporanList, rencanaList, setRencanaList } = useContext(AuditCtx);

  const visibleAuditBerjalan = myUnit ? auditBerjalan.filter(a => a.unit === myUnit) : auditBerjalan;
  const visibleRencana = myUnit ? rencanaList.filter(r => r.unit === myUnit) : rencanaList;
  const visibleLaporan = myUnit ? laporanList.filter(l => l.unit === myUnit) : laporanList;

  const visibleRencanaFiltered = filterRencana === "Semua"
    ? visibleRencana
    : visibleRencana.filter(r => r.status === filterRencana);

  return (
    <div className="flex flex-col gap-4">
      {/* Auditee header */}
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}>📋</div>
          <div>
            <div className="text-sm font-black text-purple-800">Modul Audit — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Hanya menampilkan rencana, proses, dan laporan audit yang berkaitan dengan unit <strong>{myUnit}</strong>.</div>
          </div>
        </div>
      )}

      {/* 3-stat summary strip (non-auditee) */}
      {!myUnit && <div className="flex flex-wrap gap-2">
        {[
          { label: "Disetujui", count: 2, cls: "bg-green-50 text-green-700 border-green-200"  },
          { label: "Draft",     count: 2, cls: "bg-gray-100 text-gray-600 border-gray-200"     },
          { label: "Selesai",   count: 3, cls: "bg-teal-50 text-teal-700 border-teal-200"      },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-semibold ${s.cls}`}>
            <span className="text-sm font-black">{s.count}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>}

      {/* Auditee: stat khusus unit */}
      {myUnit && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {[
            { label: "Audit Aktif",     val: visibleAuditBerjalan.length, color: "text-purple-600" },
            { label: "Total LHA",       val: visibleLaporan.length,        color: "text-teal-600"   },
            { label: "Total Temuan",    val: visibleLaporan.reduce((s,l)=>s+l.temuan,0), color: "text-amber-600" },
            { label: "Rencana Audit",   val: visibleRencana.length,        color: "text-blue-600"   },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}

      {/* Funnel chart + Gantt timeline */}
      {!myUnit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Funnel */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">🔻 Funnel Alur Audit</h4>
            <div className="flex flex-col gap-1.5">
              {auditFunnelData.map((d) => {
                const maxVal = auditFunnelData[0].value;
                const pct = (d.value / maxVal) * 100;
                return (
                  <div key={d.name} className="flex items-center gap-2">
                    <span className="text-[9px] text-gray-500 w-28 flex-shrink-0 text-right">{d.name}</span>
                    <div className="flex-1 flex justify-center">
                      <div className="h-7 rounded-md flex items-center justify-center transition-all"
                        style={{ width: `${pct}%`, background: d.fill, minWidth: 40 }}>
                        <span className="text-white text-[10px] font-black">{d.value}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Gantt timeline */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">📅 Gantt — Jadwal Audit (Hari ke-)</h4>
            <div className="flex flex-col gap-2">
              {auditGanttData.map(row => (
                <div key={row.unit} className="flex items-center gap-2">
                  <span className="text-[10px] text-gray-600 w-20 flex-shrink-0">{row.unit}</span>
                  <div className="flex-1 relative h-5 bg-gray-100 rounded">
                    <div className="absolute h-full rounded flex items-center px-1.5"
                      style={{ left: `${(row.mulai / 60) * 100}%`, width: `${(row.durasi / 60) * 100}%`, background: row.color, minWidth: 4 }}>
                      <span className="text-white text-[8px] font-bold truncate">{row.tahap}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-between text-[9px] text-gray-400 mt-1 pl-20 pr-0">
              {["Hari 1","Hari 20","Hari 40","Hari 60"].map(l => <span key={l}>{l}</span>)}
            </div>
          </div>
        </div>
      )}

      {/* Progress tracker */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 mb-3">Status Audit Berjalan{myUnit ? ` — ${myUnit}` : ""}</h4>
        <div className="flex flex-col gap-3">
          {visibleAuditBerjalan.map((a, i) => {
            const idx = tahapIndex[a.tahap];
            return (
              <div key={i} className="border border-gray-100 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="text-xs font-bold text-gray-700">{a.unit}</span>
                    <span className="ml-2 text-[10px] text-gray-400">Audit {a.jenis} · Ketua: {a.ketua}</span>
                  </div>
                  <span className="text-[10px] text-gray-400">{a.mulai} – {a.target}</span>
                </div>
                <div className="flex gap-0.5 mb-1">
                  {proses.map((p, pi) => (
                    <div key={p.key} className="flex-1 h-2 rounded-full first:rounded-l-full last:rounded-r-full"
                      style={{ background: pi < idx ? "var(--tsu-teal)" : pi === idx ? "var(--tsu-gold)" : "#e2e8f0" }} />
                  ))}
                </div>
                <div className="flex justify-between text-[9px] text-gray-400 px-0.5">
                  {proses.map(p => <span key={p.key} className="text-center flex-1 truncate">{p.icon}</span>)}
                </div>
                <div className="text-[10px] mt-1 font-semibold" style={{ color: "var(--tsu-teal)" }}>
                  Tahap saat ini: {proses.find(p=>p.key===a.tahap)?.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Rencana Audit */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h4 className="text-xs font-bold text-gray-700">📝 Rencana Audit (Program Audit){myUnit ? ` — ${myUnit}` : ""}</h4>
          {!myUnit && canEdit && <button onClick={() => setTambahModal("Tambah Rencana Audit")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5"
            style={{ background: "var(--tsu-teal)" }}>
            + Tambah Rencana
          </button>}
        </div>
        {/* Filter pills */}
        <div className="px-4 py-2 border-b border-gray-50 flex gap-2">
          {["Semua","Disetujui","Draft"].map(f => (
            <button key={f} onClick={() => setFilterRencana(f)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
              style={filterRencana === f
                ? { background: "var(--tsu-teal)", color: "#fff", borderColor: "var(--tsu-teal)" }
                : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
              {f}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                {["No PA","Unit Kerja","Jenis Audit","Tim Auditor","Anggaran","Tgl Mulai","Status"].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRencanaFiltered.map((r,i)=>(
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500 font-bold">{r.no}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{r.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{r.jenis}</td>
                  <td className="px-4 py-3 text-gray-500">{r.tim}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{r.anggaran}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.tglMulai}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status==="Disetujui"?"bg-green-50 text-green-600":"bg-gray-100 text-gray-500"}`}>{r.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Laporan Audit */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h4 className="text-xs font-bold text-gray-700">📄 Laporan Hasil Audit (LHA){myUnit ? ` — ${myUnit}` : ""}</h4>
          {!myUnit && canEdit && <button onClick={() => setShowLHAModal(true)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5"
            style={{ background: "var(--tsu-teal)" }}>
            + Buat LHA
          </button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                {["No LHA","Unit Kerja","Tgl Terbit","Temuan","Rekomendasi","Status","Aksi"].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleLaporan.map((l,i)=>(
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{l.no}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{l.unit}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.tgl}</td>
                  <td className="px-4 py-3 text-center font-black text-red-500">{l.temuan}</td>
                  <td className="px-4 py-3 text-center font-black text-amber-600">{l.rekomendasi}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${l.status==="Diterima"?"bg-green-50 text-green-600":"bg-gray-100 text-gray-500"}`}>{l.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {l.status === "Diterima" && l.link && (
                      <div className="flex items-center gap-2">
                        <a href={l.link} target="_blank" rel="noreferrer"
                          className="text-[10px] font-semibold flex items-center gap-1 hover:opacity-80"
                          style={{ color: "var(--tsu-teal)" }}>
                          ↗ Buka LHA
                        </a>
                      </div>
                    )}
                    {l.status === "Draft" && (
                      <span className="text-[9px] text-gray-300 italic">Belum ada link</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* + Buat LHA modal */}
      {showLHAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4" style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => { if (lhaStep !== "saved") { setShowLHAModal(false); setLhaStep("form"); } }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800">📄 Buat Laporan Hasil Audit (LHA)</h4>
              <button onClick={() => { setShowLHAModal(false); setLhaSaved(false); setLhaStep("form"); }} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
            </div>
            {lhaStep === "form" && (
              <div>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">No LHA</label>
                    <input type="text" placeholder="Contoh: LHA-004/SPI/VI/2025"
                      value={lhaForm.noLHA} onChange={e => setLhaForm(p => ({ ...p, noLHA: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Unit Kerja</label>
                    <select value={lhaForm.unit} onChange={e => setLhaForm(p => ({ ...p, unit: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400">
                      <option value="">-- Pilih Unit --</option>
                      {["Sarpras","Keuangan","BAAK","Kemahasiswaan","LPPM","Perpustakaan","Humas"].map(u => (
                        <option key={u} value={u}>{u}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Tanggal Terbit</label>
                    <input type="date" value={lhaForm.tanggal} onChange={e => setLhaForm(p => ({ ...p, tanggal: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Link Dokumen (Google Drive)</label>
                    <input type="url" placeholder="https://drive.google.com/..."
                      value={lhaForm.linkDokumen} onChange={e => setLhaForm(p => ({ ...p, linkDokumen: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Catatan</label>
                    <textarea rows={3} value={lhaForm.catatan} onChange={e => setLhaForm(p => ({ ...p, catatan: e.target.value }))}
                      placeholder="Catatan tambahan..."
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 resize-none" />
                  </div>
                </div>
                <div className="flex gap-2 mt-4 justify-end">
                  <button onClick={() => setShowLHAModal(false)}
                    className="text-xs font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                    Batal
                  </button>
                  <button onClick={() => setLhaStep("confirm")} disabled={!lhaForm.noLHA.trim() || !lhaForm.unit}
                    className="text-xs font-semibold px-4 py-2 rounded-lg text-white disabled:opacity-40"
                    style={{ background: "var(--tsu-teal)" }}>
                    Simpan LHA
                  </button>
                </div>
              </div>
            )}
            {lhaStep === "confirm" && (
              <>
                <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
                  <span className="text-lg flex-shrink-0">⚠️</span>
                  <div>
                    <p className="text-xs font-bold text-amber-800 mb-1">Cek link sebelum menyimpan</p>
                    <p className="text-[11px] text-amber-700 leading-relaxed">Pastikan link Google Drive LHA sudah diatur ke <strong>publik (anyone with the link)</strong> agar bisa dibuka tanpa login. Kalau belum, klik <strong>Kembali</strong> dan perbaiki dulu.</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setLhaStep("form")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">← Kembali</button>
                  <button onClick={() => {
                    setLaporanList(prev => [{ no: lhaForm.noLHA || "LHA-NEW", unit: lhaForm.unit || "-", tgl: lhaForm.tanggal || "-", temuan: 0, rekomendasi: 0, status: "Draft", link: lhaForm.linkDokumen || null }, ...prev]);
                    setLhaSaved(true); setLhaStep("saved");
                  }} className="text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
                    Sudah Sesuai, Simpan
                  </button>
                </div>
              </>
            )}
            {lhaStep === "saved" && (
              <>
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-4">
                  <span className="text-base">✅</span>
                  <p className="text-xs font-semibold text-green-700">LHA berhasil disimpan!</p>
                </div>
                <div className="flex justify-end">
                  <button onClick={() => { setShowLHAModal(false); setLhaSaved(false); setLhaStep("form"); }}
                    className="text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
                    Tutup
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {tambahModal === "Tambah Rencana Audit" && (
        <TambahFormModal title="Tambah Rencana Audit" fields={[
          { key:"unit",   label:"Unit Kerja",         type:"select", options:["BAAK","LPPM","Sarpras","Keuangan","Kemahasiswaan","Fak. Teknik","Fak. Hukum"] },
          { key:"jenis",  label:"Jenis Audit",        type:"select", options:["Kinerja","Kepatuhan","Keuangan","Investigatif"] },
          { key:"periode",label:"Periode Rencana",    type:"text",   placeholder:"Q3 2025" },
          { key:"ketua",  label:"Ketua Tim Auditor",  type:"text" },
        ]}
        onSave={(v) => setRencanaList(prev => [{ no: `PA-${String(prev.length + 1).padStart(3,"0")}`, unit: v.unit || "-", jenis: v.jenis || "-", tim: v.ketua || "-", anggaran: "-", tglMulai: v.periode || "-", status: "Draft" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

// ── Audit page 2: Entry – Draft – Exit ───────────────────────────────────────
function AuditPageLapangan() {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const [activeStep, setActiveStep] = useState<"entry"|"draft"|"exit">("entry");
  const [tambahModal, setTambahModal] = useState<string | null>(null);

  const steps = [
    { key: "entry" as const, label: "Entry Meeting",              icon: "🤝", desc: "Rapat pembukaan sebelum kerja lapangan" },
    { key: "draft" as const, label: "Draft Temuan & Konfirmasi", icon: "📨", desc: "Klarifikasi temuan kepada auditee" },
    { key: "exit"  as const, label: "Exit Meeting",               icon: "🏁", desc: "Rapat penutupan & kesepakatan temuan" },
  ];

  const [entryList, setEntryList] = useState([
    { unit: "Sarpras",  tgl: "5 Mei 2025",  peserta: "Kepala Sarpras, Tim Audit SPI",   notulen: "Ada",    ba: "Ada",   statusEntry: "Terlaksana" },
    { unit: "Keuangan", tgl: "20 Mei 2025", peserta: "Kabag Keuangan, Tim Audit SPI",   notulen: "Ada",    ba: "Proses",statusEntry: "Dijadwalkan" },
    { unit: "BAAK",     tgl: "2 Apr 2025",  peserta: "Kabag BAAK, Dekan, Tim Audit SPI",notulen: "Ada",    ba: "Ada",   statusEntry: "Terlaksana" },
  ]);
  const [draftList, setDraftList] = useState([
    { unit: "BAAK", no: "DT-001", temuan: "SOP Penerimaan Mahasiswa Tidak Diperbarui", tglKirim: "15 Mei 2025", disposisi: "Setuju",     catatan: "Akan diperbarui pada Q3 2025" },
    { unit: "BAAK", no: "DT-002", temuan: "Arsip Mahasiswa Keluar Tidak Terstruktur",  tglKirim: "15 Mei 2025", disposisi: "Keberatan",  catatan: "Mengajukan klarifikasi data tambahan" },
    { unit: "Sarpras", no: "DT-003", temuan: "Aset Gedung Tidak Tercatat di SIMAK",    tglKirim: "18 Mei 2025", disposisi: "Menunggu",   catatan: "—" },
    { unit: "Sarpras", no: "DT-004", temuan: "Belanja Modal Tanpa Berita Acara",       tglKirim: "18 Mei 2025", disposisi: "Setuju",     catatan: "BA sedang disiapkan" },
  ]);
  const [exitList, setExitList] = useState([
    { unit: "BAAK",           tgl: "19 Mei 2025", kehadiran: "Dekan, Kabag BAAK, Tim Audit", temuanSepakat: 2, ba: "Ditandatangani", tindakLanjut: "Unit menyepakati perbaikan SOP penerimaan mhs paling lambat Q3 2025. Arsip mahasiswa keluar akan distrukturisasi dalam 30 hari." },
    { unit: "Fakultas Teknik",tgl: "2 Apr 2025",  kehadiran: "Dekan, Kabag, Tim Audit",      temuanSepakat: 3, ba: "Ditandatangani", tindakLanjut: "Tiga temuan disepakati dengan RTL: rekonsiliasi aset (14 hari), pembaruan SOP (30 hari), dan pelatihan staf (60 hari)." },
  ]);

  const visibleEntry = myUnit ? entryList.filter(e => e.unit === myUnit) : entryList;
  const visibleDraft = myUnit ? draftList.filter(d => d.unit === myUnit) : draftList;
  const visibleExit  = myUnit ? exitList.filter(e => e.unit === myUnit) : exitList;

  // Unit progress summary data
  const unitProgressSummary = [
    { unit: "Sarpras",       step: "KKA",          color: "#0e8080" },
    { unit: "BAAK",          step: "Draft Temuan",  color: "#f5a623" },
    { unit: "Keuangan",      step: "Entry Meeting", color: "#3b82f6" },
    { unit: "Kemahasiswaan", step: "Rencana",       color: "#cbd5e1" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Unit progress summary chips */}
      {!myUnit && (
        <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
          <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Progres Unit Audit Berjalan</div>
          <div className="flex flex-wrap gap-2">
            {unitProgressSummary.map(u => (
              <div key={u.unit} className="flex items-center gap-1.5 rounded-full px-3 py-1 border text-[10px] font-semibold"
                style={{ background: `${u.color}12`, borderColor: `${u.color}40`, color: u.color === "#cbd5e1" ? "#64748b" : u.color }}>
                <span className="font-black">{u.unit}</span>
                <span className="opacity-60">—</span>
                <span>{u.step}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step switcher */}
      <div className="flex gap-0 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
        {steps.map((s, i) => (
          <button key={s.key} onClick={() => setActiveStep(s.key)}
            className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-xs font-bold transition-all relative"
            style={activeStep === s.key
              ? { background: "var(--tsu-teal)", color: "#fff" }
              : { color: "#6b7280" }}
          >
            <span>{s.icon}</span>
            <span className="hidden sm:inline">{s.label}</span>
            {i < steps.length - 1 && activeStep !== s.key && activeStep !== steps[i+1].key && (
              <span className="absolute -right-0.5 text-gray-300 z-10">›</span>
            )}
          </button>
        ))}
      </div>
      <p className="text-xs text-gray-400 -mt-2 px-1">{steps.find(s=>s.key===activeStep)?.desc}</p>

      {/* Entry Meeting */}
      {activeStep === "entry" && (
        <div className="flex flex-col gap-3">
          {!myUnit && canEdit && <div className="flex justify-end">
            <button onClick={() => setTambahModal("Tambah Entry Meeting")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
              + Tambah Entry Meeting
            </button>
          </div>}
          {visibleEntry.map((e,i)=>(
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div>
                    <div className="text-sm font-bold text-gray-800">{e.unit}</div>
                    <div className="text-[10px] text-gray-400 mt-0.5">{e.tgl}</div>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ml-2 ${
                    e.statusEntry === "Terlaksana"  ? "bg-green-50 text-green-600 border border-green-200"  :
                    e.statusEntry === "Dijadwalkan" ? "bg-blue-50 text-blue-600 border border-blue-200"     :
                    "bg-gray-100 text-gray-500"}`}>
                    {e.statusEntry}
                  </span>
                </div>
                <div className="flex gap-2">
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${e.notulen==="Ada"?"bg-green-50 text-green-600 border border-green-200":"bg-gray-50 text-gray-400"}`}>
                    📋 Notulen: {e.notulen}
                  </span>
                  <span className={`text-[9px] font-bold px-2 py-1 rounded-lg ${e.ba==="Ada"?"bg-green-50 text-green-600 border border-green-200":"bg-amber-50 text-amber-600 border border-amber-200"}`}>
                    📄 Berita Acara: {e.ba}
                  </span>
                </div>
              </div>
              <div className="text-[10px] text-gray-500 bg-gray-50 rounded-lg px-3 py-2">
                👥 Peserta: {e.peserta}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Draft Temuan */}
      {activeStep === "draft" && (
        <div className="flex flex-col gap-3">
          {!myUnit && canEdit && <div className="flex justify-end">
            <button onClick={() => setTambahModal("Tambah Draft Temuan")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
              + Tambah Draft Temuan
            </button>
          </div>}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["No","Unit","Temuan","Tgl Kirim","Respons Auditee","Catatan Auditee"].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDraft.map((d,i)=>(
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-500">{d.no}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{d.unit}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px]">{d.temuan}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{d.tglKirim}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap
                        ${d.disposisi==="Setuju"?"bg-green-50 text-green-600":
                          d.disposisi==="Keberatan"?"bg-red-50 text-red-600":
                          "bg-gray-100 text-gray-500"}`}>{d.disposisi}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[10px] italic">{d.catatan}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Exit Meeting */}
      {activeStep === "exit" && (
        <div className="flex flex-col gap-3">
          {!myUnit && canEdit && <div className="flex justify-end">
            <button onClick={() => setTambahModal("Tambah Exit Meeting")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
              + Tambah Exit Meeting
            </button>
          </div>}
          {visibleExit.map((e,i)=>(
            <div key={i} className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <div className="text-sm font-bold text-gray-800">{e.unit}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{e.tgl}</div>
                </div>
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border
                  ${e.ba==="Ditandatangani"?"bg-green-50 text-green-600 border-green-200":"bg-amber-50 text-amber-600 border-amber-200"}`}>
                  ✍ BA: {e.ba}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-[10px] mb-2">
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-400">Kehadiran:</span>
                  <div className="text-gray-700 font-medium mt-0.5">{e.kehadiran}</div>
                </div>
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-400">Hasil:</span>
                  <div className="font-bold mt-0.5" style={{ color: "var(--tsu-teal)" }}>{e.temuanSepakat} temuan disepakati</div>
                </div>
              </div>
              <div className="rounded-lg p-3 text-[10px]" style={{ background: "var(--tsu-teal-light)" }}>
                <div className="font-bold mb-1" style={{ color: "var(--tsu-teal-dark)" }}>🤝 Tindak Lanjut yang Disepakati:</div>
                <div style={{ color: "var(--tsu-teal-dark)" }}>{e.tindakLanjut}</div>
              </div>
            </div>
          ))}
        </div>
      )}

      {tambahModal === "Tambah Entry Meeting" && (
        <TambahFormModal title="Tambah Entry Meeting" fields={[
          { key:"unit",    label:"Unit Kerja",                              type:"select", options:["Sarpras","Keuangan","BAAK","LPPM","Fak. Teknik","Kemahasiswaan"] },
          { key:"tgl",     label:"Tanggal Pelaksanaan",                     type:"date" },
          { key:"peserta", label:"Peserta (Auditor & Auditee)",             type:"text" },
          { key:"link",    label:"Link Notulen / Berita Acara (Google Drive)", type:"url" },
        ]}
        onSave={(v) => setEntryList(prev => [{ unit: v.unit || "-", tgl: v.tgl || "-", peserta: v.peserta || "-", notulen: v.link ? "Ada" : "Belum", ba: "Proses", statusEntry: "Dijadwalkan" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Draft Temuan" && (
        <TambahFormModal title="Tambah Draft Temuan" fields={[
          { key:"no",       label:"No Draft Temuan",                        type:"text",   placeholder:"DT-005" },
          { key:"unit",     label:"Unit Kerja",                             type:"select", options:["Sarpras","Keuangan","BAAK","LPPM","Fak. Teknik","Kemahasiswaan"] },
          { key:"temuan",   label:"Deskripsi Temuan",                       type:"textarea" },
          { key:"tglKirim", label:"Tanggal Kirim Konfirmasi",               type:"date" },
          { key:"link",     label:"Link Dokumen Konfirmasi (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setDraftList(prev => [{ unit: v.unit || "-", no: v.no || `DT-${String(prev.length + 1).padStart(3,"0")}`, temuan: v.temuan || "-", tglKirim: v.tglKirim || "-", disposisi: "Menunggu", catatan: "—" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Exit Meeting" && (
        <TambahFormModal title="Tambah Exit Meeting" fields={[
          { key:"unit",      label:"Unit Kerja",                              type:"select", options:["Sarpras","Keuangan","BAAK","LPPM","Fak. Teknik","Kemahasiswaan"] },
          { key:"tgl",       label:"Tanggal Pelaksanaan",                     type:"date" },
          { key:"kehadiran", label:"Peserta yang Hadir",                      type:"text" },
          { key:"link",      label:"Link BA Exit Meeting (Google Drive)",      type:"url" },
        ]}
        onSave={(v) => setExitList(prev => [{ unit: v.unit || "-", tgl: v.tgl || "-", kehadiran: v.kehadiran || "-", temuanSepakat: 0, ba: v.link ? "Ditandatangani" : "Proses", tindakLanjut: "-" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

// ── Audit page 3: KKA Link ───────────────────────────────────────────────────
function AuditPageKKA() {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [linkMap, setLinkMap] = useState<Record<string, string>>({});
  const [editingLink, setEditingLink] = useState<{ key: string; value: string } | null>(null);
  const [filterUnit, setFilterUnit] = useState(myUnit ?? "Semua");
  const [catatanAuditor, setCatatanAuditor] = useState<Record<string, string>>({});

  const [kkaList, setKkaList] = useState([
    { id: "KKA-S-01", unit: "Sarpras",  pengujian: "Inventarisasi Aset",      auditor: "Budi S.",  statusAudit: "Selesai",  linkAuditor: "https://drive.google.com/file/kka-s-01-auditor", linkAuditee: "https://drive.google.com/file/bukti-inventaris" },
    { id: "KKA-S-02", unit: "Sarpras",  pengujian: "Belanja Modal 2024",       auditor: "Ratna D.", statusAudit: "Berjalan", linkAuditor: "https://drive.google.com/file/kka-s-02-auditor", linkAuditee: null },
    { id: "KKA-S-03", unit: "Sarpras",  pengujian: "Penghapusan Aset",         auditor: "Ratna D.", statusAudit: "Berjalan", linkAuditor: null,                                               linkAuditee: null },
    { id: "KKA-B-01", unit: "BAAK",     pengujian: "Prosedur Penerimaan Mhs",  auditor: "Budi S.",  statusAudit: "Selesai",  linkAuditor: "https://drive.google.com/file/kka-b-01-auditor", linkAuditee: "https://drive.google.com/file/sop-admisi-2024" },
    { id: "KKA-B-02", unit: "BAAK",     pengujian: "Arsip Mahasiswa Keluar",   auditor: "Budi S.",  statusAudit: "Berjalan", linkAuditor: "https://drive.google.com/file/kka-b-02-draft",   linkAuditee: null },
    { id: "KKA-K-01", unit: "Keuangan", pengujian: "Rekonsiliasi Kas & Bank",  auditor: "Ratna D.", statusAudit: "Berjalan", linkAuditor: null,                                               linkAuditee: null },
  ]);

  const baseList = myUnit ? kkaList.filter(k => k.unit === myUnit) : kkaList;
  const units = myUnit ? [myUnit] : ["Semua", ...Array.from(new Set(kkaList.map(k => k.unit)))];
  const filtered = myUnit ? baseList : (filterUnit === "Semua" ? kkaList : kkaList.filter(k => k.unit === filterUnit));

  function LinkCell({ id, role, existingLink, canEdit }: { id: string; role: "auditor"|"auditee"; existingLink: string|null; canEdit: boolean }) {
    const key = `${id}-${role}`;
    const savedLink = linkMap[key] ?? existingLink;
    return (
      <div className="flex flex-col gap-1">
        {savedLink ? (
          <div className="flex items-center gap-1.5 flex-wrap">
            <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 rounded-lg px-2 py-1 max-w-[140px]">
              <span className="text-[9px]">🔗</span>
              <span className="text-[9px] text-gray-500 truncate">Link tersedia</span>
            </div>
            <a href={savedLink} target="_blank" rel="noreferrer"
              className="text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 hover:opacity-80 transition-opacity"
              style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>
              ↗ Buka
            </a>
          </div>
        ) : (
          <span className="text-[9px] text-gray-300 italic">Belum ada link</span>
        )}
        {canEdit && (
          <button onClick={() => setEditingLink({ key, value: savedLink ?? "" })}
            className="text-[9px] font-bold px-2 py-1 rounded-lg border border-dashed flex items-center gap-1 w-fit hover:opacity-80 transition-opacity"
            style={{ borderColor: "var(--tsu-teal)", color: "var(--tsu-teal)" }}>
            🔗 {savedLink ? "Ganti Link" : "Isi Link"}
          </button>
        )}
      </div>
    );
  }

  const selesaiCount = filtered.filter(k => k.statusAudit === "Selesai").length;
  const berjalanCount = filtered.filter(k => k.statusAudit === "Berjalan").length;
  const menungguCount = filtered.filter(k => k.statusAudit === "Menunggu").length;

  return (
    <div className="flex flex-col gap-4">
      {/* Summary stat bar */}
      <div className="flex gap-3 flex-wrap">
        {[
          { label: "Selesai",  count: selesaiCount,  cls: "bg-green-50 text-green-700 border-green-200"  },
          { label: "Berjalan", count: berjalanCount,  cls: "bg-amber-50 text-amber-700 border-amber-200"  },
          { label: "Menunggu", count: menungguCount,  cls: "bg-gray-100 text-gray-600 border-gray-200"    },
        ].map(s => (
          <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-semibold ${s.cls}`}>
            <span className="text-sm font-black">{s.count}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Filter + info */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {!myUnit && (
          <div className="flex gap-2 flex-wrap">
            {units.map(u => (
              <button key={u} onClick={() => setFilterUnit(u)}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                style={filterUnit === u
                  ? { background: "var(--tsu-teal)", color: "#fff" }
                  : { background: "#f8fafc", color: "#64748b", border: "1px solid #e2e8f0" }}
              >{u}</button>
            ))}
          </div>
        )}
        {myUnit && (
          <div className="text-xs font-semibold px-3 py-1.5 rounded-lg" style={{ background: "#f5f3ff", color: "#7c3aed" }}>
            🏛️ Unit: {myUnit}
          </div>
        )}
        <div className="text-[10px] text-gray-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          ⚠ Dokumen Auditor = file kertas kerja internal. Dokumen Auditee = bukti/data dari unit yang diaudit.
        </div>
      </div>

      {/* KKA table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-700">🗃️ Kertas Kerja Audit — {myUnit ?? filterUnit}</h4>
          {!myUnit && canEdit && <button onClick={() => setTambahModal("Tambah KKA")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
            + Tambah KKA
          </button>}
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-gray-50 text-left">
                {(myUnit
                  ? ["No KKA","Program Pengujian","Status","Link Auditor","Link Auditee"]
                  : ["No KKA","Unit","Program Pengujian","Auditor","Status","Link Auditor","Link Auditee","Catatan Auditor"]
                ).map(h=>(
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((k)=>(
                <tr key={k.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors align-top">
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500 font-bold whitespace-nowrap">{k.id}</td>
                  {!myUnit && <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{k.unit}</td>}
                  <td className="px-4 py-3 text-gray-600">{k.pengujian}</td>
                  {!myUnit && <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{k.auditor}</td>}
                  <td className="px-4 py-3 whitespace-nowrap">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                      k.statusAudit === "Selesai"  ? "bg-green-50 text-green-600"  :
                      k.statusAudit === "Berjalan" ? "bg-amber-50 text-amber-600"  :
                      "bg-gray-100 text-gray-500"}`}>
                      {k.statusAudit}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <LinkCell id={k.id} role="auditor" existingLink={k.linkAuditor} canEdit={!myUnit && canEdit} />
                  </td>
                  <td className="px-4 py-3">
                    <LinkCell id={k.id} role="auditee" existingLink={k.linkAuditee} canEdit={canEdit} />
                  </td>
                  {!myUnit && canEdit && (
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        placeholder="Tambah catatan..."
                        value={catatanAuditor[k.id] ?? ""}
                        onChange={e => setCatatanAuditor(prev => ({ ...prev, [k.id]: e.target.value }))}
                        className="w-36 border border-gray-200 rounded-lg px-2 py-1 text-[9px] text-gray-700 focus:outline-none focus:border-teal-400"
                      />
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {tambahModal === "Tambah KKA" && (
        <TambahFormModal title="Tambah KKA" fields={[
          { key:"noKKA",       label:"No KKA",                              type:"text",   placeholder:"KKA-001" },
          { key:"unit",        label:"Unit Kerja",                          type:"select", options:["Sarpras","Keuangan","BAAK","LPPM","Fak. Teknik","Kemahasiswaan"] },
          { key:"program",     label:"Program Pengujian",                   type:"textarea" },
          { key:"auditor",     label:"Auditor Penanggung Jawab",            type:"text" },
          { key:"linkAuditor", label:"Link Dokumen Auditor (Google Drive)", type:"url" },
          { key:"linkAuditee", label:"Link Bukti Auditee (Google Drive)",   type:"url", required:false },
        ]}
        onSave={(v) => setKkaList(prev => [{ id: v.noKKA || `KKA-NEW-${prev.length + 1}`, unit: v.unit || "-", pengujian: v.program || "-", auditor: v.auditor || "-", statusAudit: "Baru", linkAuditor: (v.linkAuditor || null) as string | null, linkAuditee: (v.linkAuditee || null) as string | null } as typeof prev[0], ...prev])}
        onClose={() => setTambahModal(null)} />
      )}

      {/* Modal input link */}
      {editingLink && (
        <LinkModal
          title="Isi Link Dokumen KKA"
          value={editingLink.value}
          onChange={v => setEditingLink(p => p ? { ...p, value: v } : null)}
          onSave={() => {
            if (editingLink.value.trim()) {
              setLinkMap(prev => ({ ...prev, [editingLink.key]: editingLink.value.trim() }));
            }
          }}
          onClose={() => setEditingLink(null)}
        />
      )}
    </div>
  );
}

// ── PwAudit shell driven by top-strip subSection ─────────────────────────────
function PwAudit({ subSection }: { subSection: string }) {
  return (
    <div className="flex flex-col gap-4">
      {subSection === "Entry Meeting – Draft – Exit" && <AuditPageLapangan />}
      {subSection === "Kertas Kerja Audit (KKA)"    && <AuditPageKKA />}
      {(subSection === "Rencana & Laporan Audit" || !subSection) && <AuditPageRencana />}
    </div>
  );
}


function PwRTL({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const showVerif = subSection === "Verifikasi RTL";
  const [filterRTL, setFilterRTL] = useState("Semua");
  const [selesaiToggle, setSelesaiToggle] = useState<Record<number, boolean>>({});
  const [buktiLinks, setBuktiLinks] = useState<Record<number, string>>({});
  const [editingBukti, setEditingBukti] = useState<{ no: number; value: string } | null>(null);
  const [verifCatatan, setVerifCatatan] = useState<Record<number, string>>({});
  const [verifResult, setVerifResult]   = useState<Record<number, "Diterima"|"Ditolak"|undefined>>({});

  // "today" fixed at 22 May 2025 for days-remaining calculation
  const today2025 = new Date(2025, 4, 22); // month 0-indexed
  function sisaHari(tglStr: string): number {
    const parts = tglStr.split(" ");
    const monthMap: Record<string, number> = {
      Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Sep:8, Okt:9, Nov:10, Des:11,
    };
    const d = parseInt(parts[0]);
    const m = monthMap[parts[1]] ?? 0;
    const y = parseInt(parts[2]);
    const target = new Date(y, m, d);
    return Math.round((target.getTime() - today2025.getTime()) / (1000 * 60 * 60 * 24));
  }

  const allRTL = [
    ...rtlRows.map(r=>({...r, statusRTL: "Terlambat"})),
    { no:4, unit:"Fakultas Teknik", temuan:"Rekonsiliasi Aset Q1",   tgl:"31 Mei 2025", statusRTL:"Proses"  },
    { no:5, unit:"LPPM",            temuan:"Revisi SOP Penelitian",   tgl:"15 Jun 2025", statusRTL:"Proses"  },
    { no:6, unit:"Kemahasiswaan",   temuan:"Laporan Kegiatan UKM Q1", tgl:"30 Jun 2025", statusRTL:"Selesai" },
    { no:7, unit:"BAAK",            temuan:"Arsip Mahasiswa Keluar",  tgl:"20 Jun 2025", statusRTL:"Proses"  },
  ];
  const allVerifikasi = [
    { unit:"Kemahasiswaan", temuan:"Laporan Kegiatan UKM Q1", tglSelesai:"25 Mei 2025", bukti:"Laporan PDF",     verifikator:"Ratna D.", hasil:"Diterima"  },
    { unit:"LPPM",          temuan:"Update Profil Riset",     tglSelesai:"10 Mei 2025", bukti:"Screenshot SINTA", verifikator:"Budi S.", hasil:"Diterima"  },
    { unit:"BAAK",          temuan:"Arsip Mahasiswa Keluar",  tglSelesai:"—",           bukti:"Menunggu",         verifikator:"—",       hasil:"Menunggu" },
  ];

  const baseRTL2 = myUnit ? allRTL.filter(r => r.unit === myUnit) : allRTL;
  const rtlRows2 = filterRTL === "Semua"     ? baseRTL2
    : filterRTL === "Terlambat" ? baseRTL2.filter(r => r.statusRTL === "Terlambat")
    : filterRTL === "Proses"    ? baseRTL2.filter(r => r.statusRTL === "Proses")
    : baseRTL2.filter(r => r.statusRTL === "Selesai");
  const verRows  = myUnit ? allVerifikasi.filter(v => v.unit === myUnit) : allVerifikasi;

  return (
    <div className="flex flex-col gap-4">
      {/* Auditee header */}
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}>📌</div>
          <div className="flex-1">
            <div className="text-sm font-black text-purple-800">Tindak Lanjut Rekomendasi (RTL) — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Selesaikan setiap rekomendasi sebelum batas waktu dan upload bukti penyelesaian.</div>
          </div>
        </div>
      )}
      {myUnit && !showVerif && (
        <div className="grid grid-cols-3 gap-3">
          {[
            { label: "Total RTL",    val: baseRTL2.length,                                    color: "text-gray-700"   },
            { label: "Proses",       val: baseRTL2.filter(r=>r.statusRTL==="Proses").length,   color: "text-blue-600"   },
            { label: "Terlambat",    val: baseRTL2.filter(r=>r.statusRTL==="Terlambat").length,color: "text-red-600"    },
          ].map(s => (
            <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
              <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      )}
      {myUnit && !showVerif && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-700">
          💡 <strong>Cara menyelesaikan RTL:</strong> Klik <em>Isi Link Bukti</em> pada baris RTL yang sedang berjalan, tempel link Google Drive atau tautan dokumen bukti tindak lanjut, lalu tunggu verifikasi dari SPI.
        </div>
      )}

      {/* Area + Waterfall charts */}
      {!showVerif && !myUnit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Area chart trend */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">📈 Tren RTL per Bulan</h4>
            <ResponsiveContainer width="100%" height={150}>
              <AreaChart data={rtlTrendBulanan} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradSelesai" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradTerlambat" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ef4444" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ef4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Area type="monotone" dataKey="selesai" name="Selesai" stroke="#22c55e" strokeWidth={2} fill="url(#gradSelesai)" />
                <Area type="monotone" dataKey="terlambat" name="Terlambat" stroke="#ef4444" strokeWidth={2} fill="url(#gradTerlambat)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Grouped bar — RTL per unit */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">📊 Status RTL per Unit Kerja</h4>
              <div className="flex gap-2">
                {[{c:"#22c55e",l:"Selesai"},{c:"#3b82f6",l:"Proses"},{c:"#ef4444",l:"Terlambat"}].map(s=>(
                  <div key={s.l} className="flex items-center gap-1">
                    <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{background:s.c}}/>
                    <span className="text-[8px] text-gray-400">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <BarChart data={rtlPerUnit} barSize={7} barGap={2} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="unit" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Bar dataKey="selesai"   name="Selesai"   fill="#22c55e" radius={[3,3,0,0]} />
                <Bar dataKey="proses"    name="Proses"    fill="#3b82f6" radius={[3,3,0,0]} />
                <Bar dataKey="terlambat" name="Terlambat" fill="#ef4444" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Tindak Lanjut */}
      {!showVerif && <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-700">Daftar Tindak Lanjut (RTL){myUnit ? ` — ${myUnit}` : ""}</h4>
        </div>
        {!myUnit && (
        <div className="flex gap-3 mb-3">
          {rtlData.map(d=>(
            <div key={d.name} className="flex-1 text-center">
              <div className="text-xl font-black" style={{ color: d.color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{d.value}</div>
              <div className="text-[9px] text-gray-400">{d.name}</div>
            </div>
          ))}
        </div>
        )}
        {/* Filter pills */}
        <div className="flex gap-2 flex-wrap mb-3">
          {["Semua","Terlambat","Proses","Selesai"].map(f => (
            <button key={f} onClick={() => setFilterRTL(f)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
              style={filterRTL === f
                ? { background: f === "Terlambat" ? "#ef4444" : "var(--tsu-teal)", color: "#fff", borderColor: f === "Terlambat" ? "#ef4444" : "var(--tsu-teal)" }
                : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
              {f}
            </button>
          ))}
        </div>
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left border-b border-gray-100">
            {["No","Unit Kerja","Temuan","Jatuh Tempo","Sisa Hari","Status","Aksi"].map(h=><th key={h} className="pb-2 text-[10px] text-gray-400 font-semibold whitespace-nowrap pr-3">{h}</th>)}
          </tr></thead>
          <tbody>
            {rtlRows2.map((r,i)=>{
              const sisa = sisaHari(r.tgl);
              const isLate = r.statusRTL === "Terlambat";
              const markedSelesai = selesaiToggle[r.no];
              return (
                <tr key={i} className={`border-b border-gray-50 last:border-0 ${isLate && !markedSelesai ? "bg-red-50" : ""}`}>
                  <td className="py-1.5 text-gray-500 pr-3">{r.no}</td>
                  <td className="py-1.5 font-medium text-gray-700 pr-3">{r.unit}</td>
                  <td className="py-1.5 text-gray-500 text-[10px] pr-3">{r.temuan}</td>
                  <td className="py-1.5 text-gray-500 text-[10px] whitespace-nowrap pr-3">{r.tgl}</td>
                  <td className="py-1.5 pr-3 whitespace-nowrap">
                    <span className={`text-[9px] font-bold ${sisa < 0 ? "text-red-600" : sisa <= 7 ? "text-amber-600" : "text-gray-500"}`}>
                      {sisa < 0 ? `${Math.abs(sisa)}h lewat` : `${sisa} hari`}
                    </span>
                  </td>
                  <td className="py-1.5 pr-3">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                      markedSelesai || r.statusRTL === "Selesai" ? "bg-green-50 text-green-600" :
                      r.statusRTL === "Terlambat" ? "bg-red-50 text-red-600" :
                      "bg-blue-50 text-blue-600"}`}>
                      {markedSelesai ? "Selesai" : r.statusRTL}
                    </span>
                  </td>
                  <td className="py-1.5">
                    <div className="flex flex-col gap-1">
                      {myUnit && r.statusRTL === "Proses" && !markedSelesai && (
                        <>
                          {buktiLinks[r.no] ? (
                            <div className="flex items-center gap-1">
                              <a href={buktiLinks[r.no]} target="_blank" rel="noreferrer"
                                className="text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 hover:opacity-80"
                                style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>
                                ↗ Buka Bukti
                              </a>
                              {canEdit && <button onClick={() => setEditingBukti({ no: r.no, value: buktiLinks[r.no] })}
                                className="text-[9px] text-gray-400 hover:text-gray-600 underline">ganti</button>}
                            </div>
                          ) : canEdit ? (
                            <button onClick={() => setEditingBukti({ no: r.no, value: "" })}
                              className="text-[9px] font-bold px-2 py-1 rounded-lg border border-dashed whitespace-nowrap"
                              style={{ borderColor: "var(--tsu-teal)", color: "var(--tsu-teal)" }}>
                              🔗 Isi Link Bukti
                            </button>
                          ) : null}
                        </>
                      )}
                      {!myUnit && canEdit && (r.statusRTL === "Proses" || r.statusRTL === "Terlambat") && !markedSelesai && (
                        <button onClick={() => setSelesaiToggle(p => ({ ...p, [r.no]: true }))}
                          className="text-[9px] font-bold px-2 py-1 rounded-lg text-white whitespace-nowrap"
                          style={{ background: "#22c55e" }}>
                          ✓ Tandai Selesai
                        </button>
                      )}
                      {!myUnit && buktiLinks[r.no] && (
                        <a href={buktiLinks[r.no]} target="_blank" rel="noreferrer"
                          className="text-[9px] text-teal-600 hover:underline flex items-center gap-0.5">
                          🔗 Lihat Bukti
                        </a>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
      </div>}

      {/* Modal input link bukti RTL */}
      {editingBukti && (
        <LinkModal
          title="Link Bukti RTL"
          description="Tempel link Google Drive atau tautan dokumen bukti tindak lanjut."
          value={editingBukti.value}
          onChange={v => setEditingBukti(p => p ? { ...p, value: v } : null)}
          onSave={() => {
            if (editingBukti.value.trim()) {
              setBuktiLinks(prev => ({ ...prev, [editingBukti.no]: editingBukti.value.trim() }));
            }
          }}
          onClose={() => setEditingBukti(null)}
        />
      )}

      {/* Verifikasi RTL */}
      {showVerif && <div className="flex flex-col gap-4">
        {/* Summary strip */}
        <div className="flex gap-3 flex-wrap">
          {[
            { label: "Diterima", count: verRows.filter(v => (verifResult[verRows.indexOf(v)] ?? v.hasil) === "Diterima").length, cls: "bg-green-50 text-green-700 border-green-200" },
            { label: "Ditolak",  count: verRows.filter(v => verifResult[verRows.indexOf(v)] === "Ditolak").length,               cls: "bg-red-50 text-red-700 border-red-200"     },
            { label: "Menunggu", count: verRows.filter(v => !verifResult[verRows.indexOf(v)] && v.hasil === "Menunggu").length,  cls: "bg-gray-100 text-gray-600 border-gray-200" },
          ].map(s => (
            <div key={s.label} className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-semibold ${s.cls}`}>
              <span className="text-sm font-black">{s.count}</span><span>{s.label}</span>
            </div>
          ))}
        </div>

        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">Verifikasi RTL{myUnit ? ` — ${myUnit}` : ""}</h4>
          <div className="flex flex-col gap-3">
            {verRows.map((v,i)=>{
              const currentHasil = verifResult[i] ?? v.hasil;
              const isMenunggu = currentHasil === "Menunggu" && !verifResult[i];
              return (
                <div key={i} className="border border-gray-100 rounded-xl p-4 flex flex-col md:flex-row gap-4">
                  {/* left — temuan detail */}
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-xs font-bold text-gray-700">{v.unit}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${
                        currentHasil === "Diterima" ? "bg-green-50 text-green-600" :
                        currentHasil === "Ditolak"  ? "bg-red-50 text-red-600"    :
                        "bg-gray-100 text-gray-500"}`}>{currentHasil}</span>
                    </div>
                    <div className="text-[10px] font-semibold text-gray-700 mb-2">{v.temuan}</div>
                    <div className="flex flex-wrap gap-3 text-[10px] text-gray-400">
                      <span>📎 Bukti: <strong className="text-gray-600">{v.bukti}</strong></span>
                      <span>👤 Verifikator: <strong className="text-gray-600">{v.verifikator}</strong></span>
                      {v.tglSelesai !== "—" && <span>📅 {v.tglSelesai}</span>}
                    </div>
                  </div>

                  {/* right — verification actions (non-auditee, Menunggu only) */}
                  {!myUnit && isMenunggu && (
                    <div className="flex flex-col gap-2 flex-shrink-0 min-w-[180px]">
                      <textarea rows={2} value={verifCatatan[i] ?? ""}
                        onChange={e => setVerifCatatan(p => ({ ...p, [i]: e.target.value }))}
                        placeholder="Catatan verifikasi..."
                        className="w-full border border-gray-200 rounded-lg px-2 py-1 text-[9px] text-gray-700 focus:outline-none focus:border-teal-400 resize-none" />
                      <div className="flex gap-2">
                        <button onClick={() => setVerifResult(p => ({ ...p, [i]: "Diterima" }))}
                          className="flex-1 text-[9px] font-bold py-1.5 rounded-lg text-white bg-green-500 hover:bg-green-600 transition-colors">
                          ✓ Terima
                        </button>
                        <button onClick={() => setVerifResult(p => ({ ...p, [i]: "Ditolak" }))}
                          className="flex-1 text-[9px] font-bold py-1.5 rounded-lg text-white bg-red-500 hover:bg-red-600 transition-colors">
                          ✗ Tolak
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>}
    </div>
  );
}

function PwRiwayat({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const units = ["Fakultas Teknik","LPPM","BAAK","Sarpras","Keuangan","Kemahasiswaan"];
  const [activeUnit, setActiveUnit] = useState(myUnit ?? units[0]);
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const { laporanList, rencanaList } = useContext(AuditCtx);

  const riwayat = useMemo(() => {
    const result: Record<string, { tahun: string; jenis: string; ketua: string; temuan: number; rtl: number; status: string }[]> = {};
    Object.entries(RIWAYAT_HISTORIS).forEach(([unit, entries]) => { result[unit] = [...entries]; });

    // Derive from laporanList (LHAs — most recent audits)
    laporanList.forEach(l => {
      const rencana = rencanaList.find(r => r.unit === l.unit);
      const tahun = l.tgl.match(/\d{4}/)?.[0] ?? "2025";
      const entry = {
        tahun,
        jenis: rencana?.jenis ?? "Umum",
        ketua: rencana?.tim.split(",")[0].trim() ?? "—",
        temuan: l.temuan,
        rtl: l.rekomendasi,
        status: l.status === "Diterima" ? "Selesai" : "Berjalan",
      };
      if (!result[l.unit]) result[l.unit] = [];
      result[l.unit].unshift(entry);
    });

    // Derive from rencanaList (active plans without LHA yet)
    const laporanUnits = new Set(laporanList.map(l => l.unit));
    rencanaList.filter(r => r.status === "Disetujui" && !laporanUnits.has(r.unit)).forEach(r => {
      const tahun = r.tglMulai.match(/\d{4}/)?.[0] ?? "2025";
      const entry = { tahun, jenis: r.jenis, ketua: r.tim.split(",")[0].trim(), temuan: 0, rtl: 0, status: "Berjalan" };
      if (!result[r.unit]) result[r.unit] = [];
      result[r.unit].unshift(entry);
    });

    return result;
  }, [laporanList, rencanaList]);

  const berulang = [
    { temuan:"Dokumentasi tidak lengkap",     units:["LPPM","BAAK","Kemahasiswaan"], frekuensi:3, rekomendasi:"Perlu SOP baku dokumentasi dan monitoring rutin per kuartal.", tren:"Meningkat" as const },
    { temuan:"Aset tidak terdokumentasi",      units:["Sarpras","Keuangan"],         frekuensi:2, rekomendasi:"Integrasikan sistem SIMAK dengan checklist audit tahunan.",     tren:"Stabil"    as const },
    { temuan:"SOP tidak diperbarui",           units:["BAAK","Kemahasiswaan"],       frekuensi:2, rekomendasi:"Jadwalkan review SOP wajib setiap awal tahun akademik.",        tren:"Stabil"    as const },
    { temuan:"Laporan terlambat",              units:["Kemahasiswaan","LPPM"],       frekuensi:2, rekomendasi:"Tetapkan penanggung jawab pelaporan dan reminder otomatis.",   tren:"Meningkat" as const },
  ];

  const showBerulang = subSection === "Temuan Berulang";
  const unitBerulang = myUnit ? berulang.filter(b => b.units.includes(myUnit)) : berulang;

  return (
    <div className="flex flex-col gap-4">
      {/* Auditee: header + ringkasan khusus unit */}
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}>📁</div>
          <div>
            <div className="text-sm font-black text-purple-800">Riwayat Audit — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Rekam jejak seluruh audit yang pernah dilaksanakan di unit <strong>{myUnit}</strong>, termasuk temuan berulang.</div>
          </div>
        </div>
      )}
      {myUnit && !showBerulang && (() => {
        const unitRiwayat = riwayat[myUnit] ?? [];
        const totalTemuan = unitRiwayat.reduce((s,r)=>s+r.temuan,0);
        const totalRTL    = unitRiwayat.reduce((s,r)=>s+r.rtl,0);
        return (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-3 gap-3">
              {[
                { label: "Total Audit",    val: unitRiwayat.length, color: "text-purple-600" },
                { label: "Total Temuan",   val: totalTemuan,         color: "text-amber-600"  },
                { label: "RTL Selesai",    val: totalRTL,            color: "text-green-600"  },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-700 mb-3">Daftar Audit — {myUnit}</h4>
              <div className="flex flex-col gap-2">
                {unitRiwayat.map((r, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm flex-shrink-0 ${r.status==="Selesai"?"bg-green-100":r.status==="Berjalan"?"bg-amber-100":"bg-gray-100"}`}>
                      {r.status==="Selesai"?"✅":r.status==="Berjalan"?"🔍":"📋"}
                    </div>
                    <div className="flex-1">
                      <div className="text-xs font-semibold text-gray-700">Audit {r.jenis} {r.tahun}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Ketua: {r.ketua}</div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs font-bold" style={{ color: r.temuan>0?"var(--tsu-gold)":"#94a3b8" }}>{r.temuan} temuan</div>
                      <div className="text-[9px] text-gray-400">{r.rtl} RTL</div>
                    </div>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${r.status==="Selesai"?"bg-green-50 text-green-600":r.status==="Berjalan"?"bg-amber-50 text-amber-600":"bg-gray-100 text-gray-500"}`}>{r.status}</span>
                  </div>
                ))}
              </div>
            </div>
            {unitBerulang.length > 0 && (
              <div className="bg-white rounded-xl border border-amber-100 p-4 shadow-sm">
                <h4 className="text-xs font-bold text-amber-700 mb-3">⚠ Temuan Berulang di Unit {myUnit}</h4>
                <div className="flex flex-col gap-3">
                  {unitBerulang.map((b, i) => (
                    <div key={i} className="p-3 rounded-xl border border-amber-100 bg-amber-50">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-gray-700">{b.temuan}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${b.tren==="Meningkat"?"bg-red-100 text-red-600":"bg-gray-100 text-gray-500"}`}>{b.tren}</span>
                        <span className="text-[9px] text-gray-400">{b.frekuensi}× muncul</span>
                      </div>
                      <div className="text-[10px] text-gray-600 mt-1 leading-relaxed">💡 {b.rekomendasi}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* Diagram riwayat */}
      {!showBerulang && !myUnit && (() => {
        const riwayatMeta = [
          { key: "selesai"  as const, label: "Selesai",  color: "#22c55e" },
          { key: "berjalan" as const, label: "Berjalan", color: "#f5a623" },
          { key: "rencana"  as const, label: "Rencana",  color: "#cbd5e1" },
        ];
        const totalAudit = riwayatDonut.reduce((s, d) => s + d.value, 0);
        return (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">📁 Diagram Riwayat Audit per Unit Kerja</h4>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>{totalAudit} Audit Total</span>
            </div>
            <div className="flex items-center gap-4 mb-4">
              <ResponsiveContainer width="30%" height={120}>
                <PieChart>
                  <Pie data={riwayatDonut} cx="50%" cy="50%" innerRadius={34} outerRadius={52} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                    {riwayatDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <text x="50%" y="45%" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">{totalAudit}</text>
                  <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill="#64748b">Audit</text>
                </PieChart>
              </ResponsiveContainer>
              <div className="flex-1 grid grid-cols-3 gap-2">
                {riwayatDonut.map(d => (
                  <div key={d.name} className="flex flex-col items-center justify-center rounded-xl py-2" style={{ background: d.color === "#cbd5e1" ? "#f1f5f9" : `${d.color}12` }}>
                    <span className="text-xl font-black" style={{ color: d.color === "#cbd5e1" ? "#94a3b8" : d.color }}>{d.value}</span>
                    <span className="text-[9px] font-semibold text-gray-500 mt-0.5">{d.name}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="border-t border-gray-100 pt-3">
              <div className="flex items-center gap-2 mb-2">
                <span className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Detail per Unit Kerja</span>
                <div className="flex gap-3 ml-auto">
                  {riwayatMeta.map(m => (
                    <div key={m.key} className="flex items-center gap-1">
                      <span className="w-2 h-2 rounded-full" style={{ background: m.color }} />
                      <span className="text-[9px] text-gray-400">{m.label}</span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                {riwayatPerUnit.map(row => {
                  const total = row.selesai + row.berjalan + row.rencana;
                  return (
                    <div key={row.unit} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 w-24 flex-shrink-0">{row.unit}</span>
                      <div className="flex-1 flex h-3 rounded-full overflow-hidden gap-px">
                        {riwayatMeta.map(m => row[m.key] > 0 && (
                          <div key={m.key} className="h-full" title={`${m.label}: ${row[m.key]}`}
                            style={{ width: `${(row[m.key] / total) * 100}%`, background: m.color, minWidth: 4 }} />
                        ))}
                      </div>
                      <span className="text-[9px] font-bold text-gray-500 flex-shrink-0 w-6 text-right">{total}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        );
      })()}

      {/* Line chart + Heatmap */}
      {!showBerulang && !myUnit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Multi-line trend */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-1">📈 Tren Temuan per Unit (per Tahun)</h4>
            <div className="flex flex-wrap gap-2 mb-2">
              {riwayatLineUnits.map((u, i) => (
                <div key={u.key} className="flex items-center gap-1">
                  <span className="w-3 h-0.5 inline-block rounded" style={{ background: riwayatLineColors[i] }} />
                  <span className="text-[8px] text-gray-400">{u.label}</span>
                </div>
              ))}
            </div>
            <ResponsiveContainer width="100%" height={150}>
              <LineChart data={riwayatTrenTemuan} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="tahun" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                {riwayatLineUnits.map((u, i) => (
                  <Line key={u.key} type="monotone" dataKey={u.key} name={u.label}
                    stroke={riwayatLineColors[i]} strokeWidth={2} dot={{ r: 3, fill: riwayatLineColors[i] }}
                    activeDot={{ r: 5 }} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Heatmap unit × tahun */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">🔥 Heatmap Intensitas Audit</h4>
            {(() => {
              const tahuns = ["2022","2023","2024","2025"];
              const heatData: Record<string, Record<string, number>> = {
                FakTeknik:     { "2022": 4, "2023": 4, "2024": 2, "2025": 3 },
                LPPM:          { "2022": 0, "2023": 0, "2024": 3, "2025": 2 },
                BAAK:          { "2022": 0, "2023": 3, "2024": 0, "2025": 2 },
                Sarpras:       { "2022": 5, "2023": 0, "2024": 3, "2025": 4 },
                Keuangan:      { "2022": 0, "2023": 0, "2024": 0, "2025": 0 },
                Kemahasiswaan: { "2022": 0, "2023": 2, "2024": 0, "2025": 0 },
              };
              const intensity = (v: number) => {
                if (v === 0) return { bg: "#f8fafc", text: "#cbd5e1" };
                if (v <= 1) return { bg: "#d1fae5", text: "#065f46" };
                if (v <= 2) return { bg: "#6ee7b7", text: "#065f46" };
                if (v <= 3) return { bg: "#34d399", text: "#064e3b" };
                return { bg: "#059669", text: "#fff" };
              };
              return (
                <div>
                  <div className="flex gap-1 mb-1 pl-20">
                    {tahuns.map(t => <div key={t} className="flex-1 text-center text-[9px] font-bold text-gray-400">{t}</div>)}
                  </div>
                  {riwayatLineUnits.map(u => (
                    <div key={u.key} className="flex items-center gap-1 mb-1">
                      <span className="text-[9px] text-gray-500 w-20 flex-shrink-0 text-right pr-2">{u.label}</span>
                      {tahuns.map(t => {
                        const v = heatData[u.key]?.[t] ?? 0;
                        const s = intensity(v);
                        return (
                          <div key={t} className="flex-1 h-7 rounded flex items-center justify-center text-[10px] font-black"
                            style={{ background: s.bg, color: s.text }} title={`${u.label} ${t}: ${v} temuan`}>
                            {v > 0 ? v : "·"}
                          </div>
                        );
                      })}
                    </div>
                  ))}
                  <div className="flex items-center gap-1 mt-2 justify-end">
                    {[0,1,2,3,4].map(v => {
                      const s = intensity(v === 0 ? 0 : v === 1 ? 1 : v === 2 ? 2 : v === 3 ? 3 : 5);
                      return <div key={v} className="w-4 h-4 rounded" style={{ background: s.bg }} />;
                    })}
                    <span className="text-[8px] text-gray-400 ml-1">Rendah → Tinggi</span>
                  </div>
                </div>
              );
            })()}
          </div>
        </div>
      )}

      {/* Unit selector + timeline */}
      {!showBerulang && <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-700">Riwayat Audit {myUnit ? `— ${myUnit}` : "per Unit"}</h4>
          <div className="flex gap-2">
            <button onClick={() => {
              const rows: string[] = [];
              Object.entries(riwayat).forEach(([unit, list]) => list.forEach(r => rows.push(`${unit},${r.tahun},${r.jenis},${r.ketua},${r.temuan},${r.rtl},${r.status}`)));
              const csv = ["Unit,Tahun,Jenis,Ketua Tim,Temuan,RTL,Status", ...rows].join("\n");
              const a = document.createElement("a"); a.href = "data:text/csv;charset=utf-8," + encodeURIComponent(csv); a.download = "riwayat-audit.csv"; a.click();
            }} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border flex items-center gap-1.5 hover:opacity-80 transition-opacity"
              style={{ borderColor: "var(--tsu-teal)", color: "var(--tsu-teal)" }}>
              ⬇ Export Riwayat
            </button>
          </div>
        </div>
        {!myUnit && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {units.map(u=>(
            <button key={u} onClick={()=>setActiveUnit(u)}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-lg transition-all"
              style={activeUnit===u
                ? { background:"var(--tsu-teal)", color:"#fff" }
                : { background:"var(--tsu-teal-light)", color:"var(--tsu-teal)" }}
            >{u}</button>
          ))}
        </div>
        )}
        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />
          <div className="flex flex-col gap-4 pl-10">
            {(riwayat[activeUnit]||[]).map((r,i)=>(
              <div key={i} className="relative">
                <div className="absolute -left-6 top-1 w-3 h-3 rounded-full border-2 border-white" style={{ background: r.status==="Selesai"?"var(--tsu-teal)":r.status==="Berjalan"?"var(--tsu-gold)":"#cbd5e1" }} />
                <div className="border border-gray-100 rounded-xl p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-black" style={{ color:"var(--tsu-teal)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{r.tahun}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status==="Selesai"?"bg-green-50 text-green-600":r.status==="Berjalan"?"bg-amber-50 text-amber-600":"bg-gray-100 text-gray-500"}`}>{r.status}</span>
                  </div>
                  <div className="text-[10px] text-gray-500 mb-2">Audit {r.jenis} · Ketua Tim: {r.ketua}</div>
                  {r.temuan > 0 && (
                    <div className="flex gap-3 text-[10px]">
                      <span className="text-red-500 font-semibold">{r.temuan} Temuan</span>
                      <span className="text-gray-400">·</span>
                      <span className="font-semibold" style={{ color:"var(--tsu-teal)" }}>{r.rtl} RTL</span>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
        {/* Aggregate stats below timeline */}
        {(() => {
          const unitRiwayat = riwayat[activeUnit] || [];
          const totalAudits   = unitRiwayat.length;
          const totalTemuan   = unitRiwayat.reduce((s, r) => s + r.temuan, 0);
          const selesaiCount  = unitRiwayat.filter(r => r.status === "Selesai").length;
          const completionPct = totalAudits > 0 ? Math.round((selesaiCount / totalAudits) * 100) : 0;
          return (
            <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4">
              {[
                { label: "Total Audit",       val: totalAudits,          color: "var(--tsu-teal)"  },
                { label: "Total Temuan",       val: totalTemuan,          color: "#ef4444"           },
                { label: "Tingkat Selesai",    val: `${completionPct}%`,  color: "#22c55e"           },
              ].map(s => (
                <div key={s.label} className="flex items-center gap-2">
                  <span className="text-xl font-black" style={{ color: s.color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{s.val}</span>
                  <span className="text-[10px] text-gray-400">{s.label}</span>
                </div>
              ))}
            </div>
          );
        })()}
      </div>}

      {/* Temuan berulang */}
      {showBerulang && <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-bold text-gray-700">Temuan Berulang</h4>
          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Lintas Unit</span>
        </div>
        {/* brief summary stat */}
        <p className="text-[10px] text-gray-500 mb-3">
          <span className="font-bold text-red-600">{berulang.length} temuan berulang</span> ditemukan di{" "}
          <span className="font-bold text-gray-700">{new Set(berulang.flatMap(b => b.units)).size} unit</span> berbeda dalam 3 tahun terakhir.
        </p>
        <div className="flex flex-col gap-3">
          {berulang.map((b,i)=>(
            <div key={i} className="border border-gray-100 rounded-xl p-3">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-gray-700">{b.temuan}</span>
                <div className="flex items-center gap-2">
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${b.tren === "Meningkat" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>
                    {b.tren === "Meningkat" ? "↑ Meningkat" : "→ Stabil"}
                  </span>
                  <span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{b.frekuensi}x</span>
                </div>
              </div>
              <div className="flex flex-wrap gap-1 mb-2">
                {b.units.map(u=><span key={u} className="text-[9px] px-1.5 py-0.5 rounded" style={{ background:"var(--tsu-teal-light)", color:"var(--tsu-teal)" }}>{u}</span>)}
              </div>
              <div className="rounded-lg px-3 py-2 text-[10px]" style={{ background: "#fffbeb" }}>
                <span className="font-bold text-amber-700">💡 Rekomendasi: </span>
                <span className="text-amber-800">{b.rekomendasi}</span>
              </div>
            </div>
          ))}
        </div>
      </div>}

    </div>
  );
}

function PwKalender({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";

  const [agendaFilter, setAgendaFilter]   = useState("Semua");
  const [deadlineFilter, setDeadlineFilter] = useState("Semua");
  const [doneDeadlines, setDoneDeadlines] = useState<Record<string, boolean>>({});

  const events: Record<number, { label: string; type: string }[]> = {
    5:  [{ label:"Audit Sarpras mulai",      type:"audit"    }],
    10: [{ label:"Deadline RTL Fak. Hukum",  type:"deadline" }],
    15: [{ label:"Deadline RTL LPPM",        type:"deadline" }],
    18: [{ label:"Deadline RTL Sarpras",     type:"deadline" }],
    19: [{ label:"Exit Meeting BAAK",        type:"meeting"  }],
    20: [{ label:"Entry Meeting Keuangan",   type:"meeting"  }],
    22: [{ label:"Rapat Tinjauan Manajemen", type:"rapat"    }],
    26: [{ label:"Audit Pendahuluan LPPM",   type:"audit"    }],
    28: [{ label:"Koordinasi Program Audit", type:"rapat"    }],
    31: [{ label:"Target LHA Sarpras",       type:"deadline" }],
  };
  const typeStyle: Record<string, { dot: string; badge: string }> = {
    audit:    { dot:"bg-teal-500",  badge:"bg-teal-50 text-teal-700"  },
    deadline: { dot:"bg-red-500",   badge:"bg-red-50 text-red-600"    },
    meeting:  { dot:"bg-amber-400", badge:"bg-amber-50 text-amber-700"},
    rapat:    { dot:"bg-purple-500",badge:"bg-purple-50 text-purple-700"},
  };
  const today = 22;

  const agenda = Object.entries(events).sort(([a],[b])=>+a-+b).map(([day, evs])=>({ day:+day, evs }));

  const showDeadline = subSection === "Deadline & Reminder";

  // Auditee-specific events per unit
  const unitEvents: Record<string, { day: number; label: string; type: string }[]> = {
    BAAK: [
      { day: 8,  label: "Entry Meeting Audit BAAK",       type: "meeting"  },
      { day: 12, label: "Pengumpulan Dokumen BAAK",        type: "audit"    },
      { day: 19, label: "Exit Meeting BAAK",               type: "meeting"  },
      { day: 26, label: "Deadline Respons RTL #1",         type: "deadline" },
      { day: 30, label: "Deadline Respons RTL #2",         type: "deadline" },
    ],
    Sarpras: [
      { day: 5,  label: "Audit Sarpras Mulai",             type: "audit"    },
      { day: 10, label: "Pengumpulan Data Sarpras",        type: "audit"    },
      { day: 18, label: "Deadline RTL Sarpras",            type: "deadline" },
      { day: 23, label: "Klarifikasi Temuan Sarpras",      type: "meeting"  },
      { day: 31, label: "Target Selesai LHA Sarpras",      type: "deadline" },
    ],
    Keuangan: [
      { day: 3,  label: "Persiapan Dokumen Keuangan",      type: "audit"    },
      { day: 20, label: "Entry Meeting Keuangan",          type: "meeting"  },
      { day: 25, label: "Penyerahan Laporan Keuangan",     type: "deadline" },
      { day: 28, label: "Rapat Pembahasan Temuan",         type: "rapat"    },
    ],
    LPPM: [
      { day: 10, label: "Deadline RTL LPPM",               type: "deadline" },
      { day: 15, label: "Verifikasi Dokumen LPPM",         type: "audit"    },
      { day: 26, label: "Audit Pendahuluan LPPM",          type: "audit"    },
      { day: 29, label: "Koordinasi Riset & Pengabdian",   type: "rapat"    },
    ],
  };

  if (myUnit) {
    const myEvs = unitEvents[myUnit] ?? [];
    const todayRef = 22;
    type AuditeeEv = typeof myEvs[number] & { sisa: number; priority: "Kritis"|"Tinggi"|"Sedang"|"Normal" };
    const enriched: AuditeeEv[] = myEvs.map(ev => {
      const sisa = ev.day - todayRef;
      const priority: "Kritis"|"Tinggi"|"Sedang"|"Normal" =
        sisa < 0  ? "Kritis" :
        sisa <= 3 ? "Tinggi" :
        sisa <= 7 ? "Sedang" : "Normal";
      return { ...ev, sisa, priority };
    }).sort((a, b) => a.sisa - b.sisa);

    const priorityCls: Record<string, string> = {
      Kritis: "bg-red-50 border-red-200 text-red-700",
      Tinggi: "bg-orange-50 border-orange-200 text-orange-700",
      Sedang: "bg-amber-50 border-amber-200 text-amber-700",
      Normal: "bg-teal-50 border-teal-200 text-teal-700",
    };

    const upcoming  = enriched.filter(e => e.sisa >= 0);
    const overdue   = enriched.filter(e => e.sisa < 0);
    const nextEvent = upcoming[0];

    return (
      <div className="flex flex-col gap-4">
        {/* Unit banner */}
        <div className="rounded-xl border border-purple-100 bg-gradient-to-r from-purple-50 to-white p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: "var(--tsu-teal-light)" }}>📅</div>
          <div>
            <div className="text-xs font-bold text-gray-800">Kalender Audit — Unit {myUnit}</div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              {upcoming.length} jadwal mendatang · {overdue.length} sudah lewat · Mei 2025
            </div>
          </div>
          {nextEvent && (
            <div className="ml-auto text-right">
              <div className="text-[9px] text-gray-400">Jadwal terdekat</div>
              <div className="text-[10px] font-bold" style={{ color: "var(--tsu-teal)" }}>{nextEvent.label}</div>
              <div className="text-[9px] text-gray-500">
                {nextEvent.sisa === 0 ? "Hari ini!" : `${nextEvent.sisa} hari lagi`}
              </div>
            </div>
          )}
        </div>

        {/* Mini calendar grid for unit */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">🗓️ Kalender Unit {myUnit} — Mei 2025</h4>
          <div className="grid grid-cols-7 gap-1 mb-1">
            {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d=>(
              <div key={d} className="text-center text-[9px] font-bold text-gray-400 py-1">{d}</div>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-1">
            {Array.from({length:3}).map((_,i)=><div key={`e${i}`}/>)}
            {Array.from({length:31},(_,i)=>i+1).map(d => {
              const dayEvs = myEvs.filter(e => e.day === d);
              const isToday = d === todayRef;
              return (
                <div key={d} className={`rounded-lg p-1 min-h-[42px] ${isToday ? "outline outline-2 outline-teal-500" : ""}`}
                  style={isToday ? { background: "var(--tsu-teal-light)" } : {}}>
                  <div className={`text-[10px] font-semibold text-center ${isToday ? "font-black" : "text-gray-500"}`}
                    style={isToday ? { color: "var(--tsu-teal)" } : {}}>{d}</div>
                  <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                    {dayEvs.map((ev,i) => (
                      <span key={i} className={`w-2 h-2 rounded-full ${typeStyle[ev.type]?.dot ?? "bg-gray-400"}`} title={ev.label} />
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Jadwal list */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">📋 Daftar Jadwal — Unit {myUnit}</h4>
          <div className="flex flex-col gap-2">
            {enriched.map((ev, i) => {
              const key = `unit-${ev.day}-${i}`;
              const done = doneDeadlines[key];
              return (
                <div key={key} className={`flex items-center gap-3 rounded-xl border p-3 transition-opacity ${done ? "opacity-40" : ""} ${priorityCls[ev.priority]}`}>
                  <div className="flex-shrink-0 text-center w-10">
                    <div className="text-sm font-black leading-none" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{ev.day}</div>
                    <div className="text-[9px] opacity-70">Mei</div>
                  </div>
                  <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${typeStyle[ev.type]?.dot ?? "bg-gray-400"}`} />
                  <div className="flex-1">
                    <div className="text-[10px] font-semibold leading-tight">{ev.label}</div>
                    <div className="text-[9px] mt-0.5 opacity-70">
                      {ev.sisa < 0 ? `${Math.abs(ev.sisa)} hari lalu · ${ev.priority}` :
                       ev.sisa === 0 ? "Hari ini!" :
                       `${ev.sisa} hari lagi · ${ev.priority}`}
                      {" · "}<span className="capitalize">{ev.type}</span>
                    </div>
                  </div>
                  {canEdit && <button onClick={() => setDoneDeadlines(p => ({ ...p, [key]: !p[key] }))}
                    className={`text-[9px] font-bold px-2 py-1 rounded-lg border flex-shrink-0 transition-colors ${done ? "bg-green-50 text-green-600 border-green-200" : "bg-white border-gray-200 text-gray-500 hover:bg-green-50 hover:text-green-600"}`}>
                    {done ? "✓ Selesai" : "Tandai Selesai"}
                  </button>}
                </div>
              );
            })}
            {enriched.length === 0 && <p className="text-[10px] text-gray-400 py-4 text-center">Belum ada jadwal untuk unit ini.</p>}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      {/* Heatmap calendar */}
      {!showDeadline && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700">🔥 Heatmap Aktivitas — Mei 2025</h4>
            <div className="flex items-center gap-2">
              {[{bg:"#f8fafc",label:"Tidak ada"},{bg:"#6ee7b7",label:"Rendah"},{bg:"#059669",label:"Padat"}].map(l=>(
                <div key={l.label} className="flex items-center gap-1">
                  <div className="w-3 h-3 rounded" style={{ background: l.bg, border: "1px solid #e2e8f0" }} />
                  <span className="text-[8px] text-gray-400">{l.label}</span>
                </div>
              ))}
            </div>
          </div>
          {(() => {
            const days = Array.from({length: 31}, (_, i) => i + 1);
            const intStyle = (v: number) => {
              if (!v) return { bg: "#f8fafc", border: "#e2e8f0" };
              if (v === 1) return { bg: "#d1fae5", border: "#6ee7b7" };
              if (v === 2) return { bg: "#6ee7b7", border: "#34d399" };
              return { bg: "#059669", border: "#047857" };
            };
            return (
              <div>
                <div className="grid grid-cols-7 gap-1 mb-1">
                  {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d=>(
                    <div key={d} className="text-center text-[9px] font-bold text-gray-400">{d}</div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({length:4}).map((_,i)=><div key={`e${i}`}/>)}
                  {days.map(d => {
                    const v = kalHeatmap[d] ?? 0;
                    const s = intStyle(v);
                    return (
                      <div key={d} className="h-8 rounded-lg flex flex-col items-center justify-center cursor-default transition-transform hover:scale-110"
                        style={{ background: s.bg, border: `1px solid ${s.border}` }}
                        title={v > 0 ? `${d} Mei: ${v} kegiatan` : `${d} Mei`}>
                        <span className="text-[9px] font-semibold" style={{ color: v >= 3 ? "#fff" : "#64748b" }}>{d}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })()}
        </div>
      )}

      {/* Agenda Bulan Ini */}
      {!showDeadline && (() => {
        const agendaItems = Object.entries(events)
          .sort(([a],[b]) => +a - +b)
          .flatMap(([day, evs]) => evs.map(ev => ({ day: +day, ...ev })));
        const filteredAgenda = agendaFilter === "Semua" ? agendaItems
          : agendaItems.filter(a => {
              if (agendaFilter === "Audit")    return a.type === "audit";
              if (agendaFilter === "Rapat")    return a.type === "rapat" || a.type === "meeting";
              if (agendaFilter === "Deadline") return a.type === "deadline";
              return true;
            });
        return (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">📋 Agenda Bulan Ini — Mei 2025</h4>
              <div className="flex gap-1.5">
                {["Semua","Audit","Rapat","Deadline"].map(f => (
                  <button key={f} onClick={() => setAgendaFilter(f)}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                    style={agendaFilter === f
                      ? { background: "var(--tsu-teal)", color: "#fff", borderColor: "var(--tsu-teal)" }
                      : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {filteredAgenda.map((ev, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-shrink-0 text-center w-8">
                    <div className="text-sm font-black leading-none" style={{ color:"var(--tsu-teal)", fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{ev.day}</div>
                    <div className="text-[9px] text-gray-400">Mei</div>
                  </div>
                  <div className="flex-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${typeStyle[ev.type]?.dot ?? "bg-gray-400"}`} />
                    <span className={`flex-1 text-[10px] font-medium px-2 py-1 rounded-lg ${typeStyle[ev.type]?.badge ?? "bg-gray-50 text-gray-600"}`}>{ev.label}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full capitalize ${typeStyle[ev.type]?.badge ?? "bg-gray-50 text-gray-500"}`}>{ev.type}</span>
                  </div>
                </div>
              ))}
              {filteredAgenda.length === 0 && <p className="text-[10px] text-gray-400 py-2 text-center">Tidak ada agenda untuk filter ini.</p>}
            </div>
          </div>
        );
      })()}

      {/* Calendar */}
      {!showDeadline && <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-xs font-bold text-gray-700">Kalender Pengawasan — Mei 2025</h4>
          <div className="flex flex-wrap gap-2">
            {Object.entries(typeStyle).map(([t,s])=>(
              <div key={t} className="flex items-center gap-1 text-[9px]">
                <span className={`w-2 h-2 rounded-full ${s.dot}`}/>
                <span className="text-gray-500 capitalize">{t}</span>
              </div>
            ))}
          </div>
        </div>
        <div className="grid grid-cols-7 gap-1 mb-1">
          {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d=>(
            <div key={d} className="text-center text-[9px] font-bold text-gray-400 py-1">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {Array.from({length:3}).map((_,i)=><div key={`e${i}`}/>)}
          {Array.from({length:31},(_,i)=>i+1).map(d=>(
            <div key={d} className={`rounded-lg p-1 min-h-[42px] ${d===today?"outline outline-2 outline-teal-500":""}`} style={d===today?{background:"var(--tsu-teal-light)"}:{}}>
              <div className={`text-[10px] font-semibold text-center ${d===today?"font-black":"text-gray-500"}`} style={d===today?{color:"var(--tsu-teal)"}:{}}>{d}</div>
              <div className="flex flex-wrap justify-center gap-0.5 mt-0.5">
                {events[d]?.map((ev,i)=>(
                  <span key={i} className={`w-2 h-2 rounded-full ${typeStyle[ev.type].dot}`} title={ev.label}/>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>}

      {/* Agenda / Deadline list */}
      {showDeadline && (() => {
        // Compute priority: Kritis = overdue, Tinggi = ≤3 days, Sedang = ≤7 days, Normal = rest
        type PriItem = { day: number; label: string; type: string; sisa: number; priority: "Kritis"|"Tinggi"|"Sedang"|"Normal" };
        const todayDay = 22; // fixed reference day in May 2025
        const allDl: PriItem[] = Object.entries(events)
          .flatMap(([day, evs]) => evs.map(ev => {
            const sisa = +day - todayDay;
            const priority: "Kritis"|"Tinggi"|"Sedang"|"Normal" =
              sisa < 0  ? "Kritis" :
              sisa <= 3 ? "Tinggi" :
              sisa <= 7 ? "Sedang" : "Normal";
            return { day: +day, ...ev, sisa, priority };
          }))
          .sort((a, b) => a.sisa - b.sisa); // overdue first, then by proximity

        const filterOrder = ["Semua","Kritis","Tinggi","Sedang","Normal"];
        const filtered = deadlineFilter === "Semua" ? allDl : allDl.filter(d => d.priority === deadlineFilter);

        const priorityCls: Record<string, string> = {
          Kritis: "bg-red-50 border-red-200 text-red-700",
          Tinggi: "bg-orange-50 border-orange-200 text-orange-700",
          Sedang: "bg-amber-50 border-amber-200 text-amber-700",
          Normal: "bg-gray-50 border-gray-200 text-gray-600",
        };

        return (
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Deadline & Reminder — Mei 2025</h4>
              <div className="flex gap-1.5">
                {filterOrder.map(f => (
                  <button key={f} onClick={() => setDeadlineFilter(f)}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                    style={deadlineFilter === f
                      ? { background: "var(--tsu-teal)", color: "#fff", borderColor: "var(--tsu-teal)" }
                      : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2 overflow-y-auto max-h-[500px]">
              {filtered.map((item, i) => {
                const key = `${item.day}-${i}`;
                const done = doneDeadlines[key];
                return (
                  <div key={key} className={`flex items-center gap-3 rounded-xl border p-2 transition-opacity ${done ? "opacity-40" : ""} ${priorityCls[item.priority]}`}>
                    <div className="flex-shrink-0 text-center w-10">
                      <div className="text-base font-black leading-none" style={{ fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{item.day}</div>
                      <div className="text-[8px] opacity-70">Mei</div>
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] font-semibold leading-tight">{item.label}</div>
                      <div className="text-[9px] mt-0.5 opacity-70">
                        {item.sisa < 0 ? `${Math.abs(item.sisa)} hari lalu` :
                         item.sisa === 0 ? "Hari ini!" :
                         `${item.sisa} hari lagi`}
                        {" · "}<span className="font-bold">{item.priority}</span>
                      </div>
                    </div>
                    {canEdit && <button onClick={() => setDoneDeadlines(p => ({ ...p, [key]: !p[key] }))}
                      className={`text-[9px] font-bold px-2 py-1 rounded-lg border flex-shrink-0 transition-colors ${done ? "bg-green-50 text-green-600 border-green-200" : "bg-white border-gray-200 text-gray-500 hover:bg-green-50 hover:text-green-600"}`}>
                      {done ? "✓ Selesai" : "Tandai Selesai"}
                    </button>}
                  </div>
                );
              })}
              {filtered.length === 0 && <p className="text-[10px] text-gray-400 py-4 text-center">Tidak ada item untuk filter ini.</p>}
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function TabPengawasan({ section, subSection }: { section: string; subSection: string }) {
  const [laporanList, setLaporanList] = useState<LaporanItem[]>(LAPORAN_AWAL);
  const [rencanaList, setRencanaList] = useState<RencanaItem[]>(RENCANA_AWAL);
  return (
    <AuditCtx.Provider value={{ laporanList, setLaporanList, rencanaList, setRencanaList }}>
      <div className="flex flex-col gap-4">
        {section === "ringkasan" && <PwRingkasan />}
        {section === "risiko"    && <PwRisiko    subSection={subSection} />}
        {section === "audit"     && <PwAudit     subSection={subSection} />}
        {section === "rtl"       && <PwRTL       subSection={subSection} />}
        {section === "riwayat"   && <PwRiwayat   subSection={subSection} />}
        {section === "kalender"  && <PwKalender  subSection={subSection} />}
      </div>
    </AuditCtx.Provider>
  );
}

// ── Back Office section data ──────────────────────────────────────────────────

const boSections = [
  { key: "R", label: "Ringkasan Back Office",           icon: "📊", color: "bg-teal-600" },
  { key: "A", label: "Administrasi & Kesekretariatan", icon: "📬", color: "bg-teal-500" },
  { key: "B", label: "Perencanaan Audit",               icon: "📋", color: "bg-blue-500" },
  { key: "C", label: "Manajemen SDM Auditor",           icon: "👥", color: "bg-purple-500" },
  { key: "D", label: "Perpustakaan Regulasi & SOP",     icon: "📚", color: "bg-amber-500" },
  { key: "F", label: "Kalender Terintegrasi",           icon: "📅", color: "bg-indigo-500" },
  { key: "G", label: "Perencanaan Anggaran",            icon: "💰", color: "bg-emerald-600" },
];

// ── Shared link-input modal (with before/after reminders) ─────────────────────
function LinkModal({
  title, description = "Tempel link Google Drive atau tautan dokumen lainnya.",
  value, onChange, onSave, onClose,
}: {
  title: string; description?: string;
  value: string; onChange: (v: string) => void;
  onSave: () => void; onClose: () => void;
}) {
  const [step, setStep] = useState<"form" | "confirm" | "saved">("form");

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={() => { if (step !== "saved") onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-800">🔗 {title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        {step === "form" && (
          <>
            <p className="text-[10px] text-gray-400 mb-3">{description}</p>
            <input
              type="url"
              placeholder="https://drive.google.com/..."
              value={value}
              onChange={e => onChange(e.target.value)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 mb-4"
              autoFocus
            />
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={() => setStep("confirm")} disabled={!value.trim()}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
                style={{ background: "var(--tsu-teal)" }}>
                Simpan Link
              </button>
            </div>
          </>
        )}
        {step === "confirm" && (
          <>
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Cek akses link sebelum menyimpan</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">Pastikan link sudah diatur ke <strong>publik (anyone with the link)</strong> agar bisa dibuka tanpa login. Kalau belum, klik <strong>Kembali</strong> dan perbaiki dulu.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep("form")} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">← Kembali</button>
              <button onClick={() => { onSave(); setStep("saved"); }}
                className="text-xs font-bold px-4 py-1.5 rounded-lg text-white"
                style={{ background: "var(--tsu-teal)" }}>
                Sudah Sesuai, Simpan
              </button>
            </div>
          </>
        )}
        {step === "saved" && (
          <>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-4">
              <span className="text-base">✅</span>
              <p className="text-xs font-semibold text-green-700">Link berhasil disimpan!</p>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Tutup</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Generic "tambah item + link" modal used by stub Add buttons
function TambahItemModal({
  title, namaLabel = "Nama / Judul", onClose,
}: {
  title: string; namaLabel?: string; onClose: () => void;
}) {
  const [nama, setNama]   = useState("");
  const [link, setLink]   = useState("");
  const [saved, setSaved] = useState(false);

  function handleSave() {
    setSaved(true);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.35)" }}
      onClick={() => { if (!saved) onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-sm mx-4" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h4 className="text-sm font-bold text-gray-800">➕ {title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        {!saved ? (
          <>
            <div className="flex flex-col gap-3 mb-3">
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{namaLabel}</label>
                <input type="text" placeholder={`Masukkan ${namaLabel.toLowerCase()}...`}
                  value={nama} onChange={e => setNama(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400"
                  autoFocus />
              </div>
              <div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Link Dokumen (Google Drive)</label>
                <input type="url" placeholder="https://drive.google.com/..."
                  value={link} onChange={e => setLink(e.target.value)}
                  className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400" />
              </div>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 mb-3">
              <span className="text-xs flex-shrink-0">⚠️</span>
              <p className="text-[10px] text-amber-700 leading-relaxed">Pastikan akses link ke <strong>public</strong> (tidak privat) sebelum menyimpan.</p>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose}
                className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={handleSave} disabled={!nama.trim()}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
                style={{ background: "var(--tsu-teal)" }}>
                Simpan
              </button>
            </div>
          </>
        ) : (
          <>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-3">
              <span className="text-base">✅</span>
              <p className="text-xs font-semibold text-green-700">Data berhasil disimpan!</p>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
              <span className="text-xs flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-[10px] text-amber-700 leading-relaxed"><strong>Pastikan akses link public dan link sudah sesuai</strong> — cek kembali apakah dokumen bisa dibuka tanpa login.</p>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose}
                className="text-xs font-bold px-4 py-1.5 rounded-lg text-white"
                style={{ background: "var(--tsu-teal)" }}>
                Tutup
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

type TFMField =
  | { key: string; label: string; type: "text" | "url" | "date" | "textarea"; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: "select"; options: string[]; required?: boolean };

function TambahFormModal({ title, fields, onClose, onSave }: { title: string; fields: TFMField[]; onClose: () => void; onSave?: (vals: Record<string, string>) => void }) {
  const [vals, setVals] = useState<Record<string, string>>({});
  const [step, setStep] = useState<"form" | "confirm" | "saved">("form");
  const hasLink = fields.some(f => f.type === "url");
  const requiredFilled = fields
    .filter(f => f.required !== false && f.type !== "url")
    .every(f => (vals[f.key] ?? "").trim());
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));

  function handleSimpan() {
    if (hasLink) { setStep("confirm"); } else { onSave?.(vals); setStep("saved"); }
  }
  function handleSesuai() { onSave?.(vals); setStep("saved"); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={() => { if (step !== "saved") onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md mx-4 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-800">➕ {title}</h4>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        {step === "form" && (
          <>
            <div className="flex flex-col gap-3 mb-3">
              {fields.map(f => (
                <div key={f.key}>
                  <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">{f.label}</label>
                  {f.type === "select" ? (
                    <select value={vals[f.key] ?? ""} onChange={e => set(f.key, e.target.value)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 bg-white">
                      <option value="">— Pilih —</option>
                      {f.options.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : f.type === "textarea" ? (
                    <textarea value={vals[f.key] ?? ""} onChange={e => set(f.key, e.target.value)} rows={3}
                      placeholder={f.placeholder ?? `Masukkan ${f.label.toLowerCase()}...`}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 resize-none" />
                  ) : (
                    <input type={f.type} value={vals[f.key] ?? ""} onChange={e => set(f.key, e.target.value)}
                      placeholder={f.type === "url" ? "https://drive.google.com/..." : (f.placeholder ?? `Masukkan ${f.label.toLowerCase()}...`)}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400" />
                  )}
                </div>
              ))}
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={onClose} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={handleSimpan} disabled={!requiredFilled}
                className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40"
                style={{ background: "var(--tsu-teal)" }}>
                Simpan
              </button>
            </div>
          </>
        )}
        {step === "confirm" && (
          <>
            <div className="flex items-start gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-4">
              <span className="text-lg flex-shrink-0">⚠️</span>
              <div>
                <p className="text-xs font-bold text-amber-800 mb-1">Cek link sebelum menyimpan</p>
                <p className="text-[11px] text-amber-700 leading-relaxed">Pastikan link Google Drive sudah diatur ke <strong>publik (anyone with the link)</strong> sehingga bisa dibuka tanpa login. Kalau belum, klik <strong>Kembali</strong> dan perbaiki dulu.</p>
              </div>
            </div>
            <div className="flex gap-2 justify-end">
              <button onClick={() => setStep("form")} className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">← Kembali</button>
              <button onClick={handleSesuai}
                className="text-xs font-bold px-4 py-1.5 rounded-lg text-white"
                style={{ background: "var(--tsu-teal)" }}>
                Sudah Sesuai, Simpan
              </button>
            </div>
          </>
        )}
        {step === "saved" && (
          <>
            <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2.5 mb-4">
              <span className="text-base">✅</span>
              <p className="text-xs font-semibold text-green-700">Data berhasil disimpan!</p>
            </div>
            <div className="flex justify-end">
              <button onClick={onClose} className="text-xs font-bold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Tutup</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function SectionRingkasan() {
  const { rapatList } = useContext(RapatCtx);
  const komponenAnggaran = [
    { komponen: "Honorarium", rencana: 55, realisasi: 48 },
    { komponen: "Perj. Dinas", rencana: 40, realisasi: 32 },
    { komponen: "ATK & Cetak", rencana: 25, realisasi: 22 },
    { komponen: "Konsumsi",    rencana: 30, realisasi: 28 },
    { komponen: "Lain-lain",   rencana: 35, realisasi: 12 },
  ];
  const agendaMendatang = rapatList.filter(r => r.status === "Terjadwal").slice(0, 3);
  const deadlineMendatang = [
    { label: "RTL Terlambat — Fakultas Hukum",  deadline: "10 Mei", tag: "Overdue",  prioritas: "Kritis" },
    { label: "Audit Pendahuluan LPPM",           deadline: "26 Mei", tag: "Audit",    prioritas: "Tinggi" },
    { label: "Pengumpulan PKPT Semester II",     deadline: "30 Jun", tag: "Rencana",  prioritas: "Normal" },
  ];
  const tagColor = (t: string) =>
    t === "Overdue" ? "bg-red-100 text-red-600" : t === "Audit" ? "bg-purple-100 text-purple-600" :
    t === "Rapat"   ? "bg-blue-100 text-blue-600" : t === "RTL" ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500";
  const priColor = (p: string) =>
    p === "Kritis" ? "text-red-600 bg-red-50" : p === "Tinggi" ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-100";

  return (
    <div className="flex flex-col gap-4">
      {/* KPI Strip */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">KPI Modul Back Office</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {kpiBackoffice.map((k) => <KpiCard key={k.label} {...k} />)}
        </div>
      </div>

      {/* Row 1: Administrasi + Perencanaan Audit */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Administrasi */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-1">📬 Administrasi</h4>
          <p className="text-[10px] text-gray-400 mb-3">Ringkasan surat & rapat bulan ini</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: "Surat Masuk",   val: "28", color: "text-teal-600" },
              { label: "Surat Keluar",  val: "22", color: "text-blue-600" },
              { label: "Rapat Selesai", val: "4",  color: "text-purple-600" },
              { label: "Arsip Dokumen", val: "124", color: "text-gray-700" },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-gray-50">
                <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-[9px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Perencanaan Audit */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-1">📋 Perencanaan Audit (PKPT)</h4>
          <p className="text-[10px] text-gray-400 mb-3">Progres program kerja tahun ini</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {[
              { label: "Total Program",   val: "6", color: "text-gray-700" },
              { label: "Selesai",         val: "2", color: "text-green-600" },
              { label: "Berjalan",        val: "1", color: "text-blue-600" },
              { label: "Direncanakan",    val: "3", color: "text-amber-600" },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-gray-50">
                <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-[9px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <div className="flex-1 bg-gray-100 rounded-full h-2">
              <div className="h-2 rounded-full bg-green-500" style={{ width: "50%" }} />
            </div>
            <span className="text-[10px] text-gray-400 flex-shrink-0">50% terlaksana</span>
          </div>
        </div>
      </div>

      {/* Row 2: SDM + Anggaran */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SDM Auditor */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-1">👥 Manajemen SDM Auditor</h4>
          <p className="text-[10px] text-gray-400 mb-3">Kompetensi & sertifikasi tim auditor</p>
          <div className="grid grid-cols-2 gap-2">
            {[
              { label: "Total Auditor",       val: "4",   color: "text-gray-700" },
              { label: "Tersertifikasi",      val: "3",   color: "text-green-600" },
              { label: "Rata-rata Skor",      val: "3.4", color: "text-blue-600" },
              { label: "Pelatihan Pending",   val: "2",   color: "text-amber-600" },
            ].map(s => (
              <div key={s.label} className="text-center p-2 rounded-lg bg-gray-50">
                <div className={`text-xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-[9px] text-gray-400">{s.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Anggaran */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-1">💰 Perencanaan Anggaran</h4>
          <p className="text-[10px] text-gray-400 mb-2">Rencana vs realisasi per komponen</p>
          <ResponsiveContainer width="100%" height={120}>
            <BarChart data={komponenAnggaran} barSize={10} barGap={2} margin={{ top: 2, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
              <XAxis dataKey="komponen" tick={{ fontSize: 7, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="Jt" />
              <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, border: "none" }} formatter={(v: unknown, name: unknown) => [`Rp ${v} Jt`, name === "rencana" ? "Rencana" : "Realisasi"]} />
              <Bar dataKey="rencana"   fill="#cbd5e1" radius={[2,2,0,0]} />
              <Bar dataKey="realisasi" fill="var(--tsu-teal)" radius={[2,2,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Row 3: Agenda Mendatang + Deadline */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Agenda */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">📅 Agenda Mendatang</h4>
          <div className="flex flex-col gap-2">
            {agendaMendatang.length === 0 && (
              <div className="text-center py-4 text-[10px] text-gray-400">Belum ada agenda mendatang.</div>
            )}
            {agendaMendatang.map((a) => (
              <div key={a.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex-shrink-0 text-center bg-teal-50 rounded-lg px-2 py-1 min-w-[48px]">
                  <div className="text-[10px] text-teal-600 font-bold leading-tight">{a.tgl.split(" ").slice(0,2).join(" ")}</div>
                  <div className="text-[9px] text-teal-400">{a.jam}</div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700 truncate">{a.judul}</div>
                  <div className="text-[9px] text-gray-400 truncate">{a.tempat} · {pesertaLabel(a.peserta)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Deadline */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-3">⏰ Deadline & Reminder</h4>
          <div className="flex flex-col gap-2">
            {deadlineMendatang.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-semibold text-gray-700 truncate">{d.label}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="text-[9px] text-gray-400">{d.deadline}</span>
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tagColor(d.tag)}`}>{d.tag}</span>
                  </div>
                </div>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full flex-shrink-0 ${priColor(d.prioritas)}`}>{d.prioritas}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function FormTambahRapat({ onSave, onCancel }: { onSave: (r: Omit<Rapat,"id"|"status">) => void; onCancel: () => void }) {
  const [judul,   setJudul]  = useState("");
  const [tgl,     setTgl]    = useState("");
  const [jam,     setJam]    = useState("");
  const [tempat,  setTempat] = useState("");
  const [peserta, setPeserta] = useState<string[]>(["Ketua SPI", "Tim Auditor", "Staf Back Office"]);

  function toggle(item: string) {
    setPeserta(prev =>
      prev.includes(item) ? prev.filter(p => p !== item) : [...prev, item]
    );
  }

  function toggleAll(list: string[]) {
    const allSelected = list.every(i => peserta.includes(i));
    if (allSelected) {
      setPeserta(prev => prev.filter(p => !list.includes(p)));
    } else {
      setPeserta(prev => [...new Set([...prev, ...list])]);
    }
  }

  function handleSave() {
    if (!judul || !tgl || !jam || peserta.length === 0) return;
    onSave({ judul, tgl, jam, tempat: tempat || "TBD", peserta });
    setJudul(""); setTgl(""); setJam(""); setTempat("");
    setPeserta(["Ketua SPI", "Tim Auditor", "Staf Back Office"]);
  }

  const allUnitsSelected = UNIT_KERJA_LIST.every(u => peserta.includes(u));
  const allInternalSelected = PESERTA_INTERNAL.every(p => peserta.includes(p));

  return (
    <div className="border border-teal-200 rounded-xl p-4 bg-teal-50 flex flex-col gap-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-teal-800">Form Tambah Rapat Baru</div>
        {peserta.length > 0 && (
          <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full bg-teal-100 text-teal-700">
            {peserta.length} peserta dipilih
          </span>
        )}
      </div>

      {/* Info dasar */}
      <div className="grid grid-cols-2 gap-3">
        <div className="col-span-2">
          <label className="block text-[10px] font-semibold text-gray-600 mb-1">Judul Rapat *</label>
          <input value={judul} onChange={e => setJudul(e.target.value)} placeholder="Misal: Rapat Tinjauan Manajemen SPI"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400 transition-all bg-white" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-600 mb-1">Tanggal *</label>
          <input type="date" value={tgl} onChange={e => setTgl(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400 transition-all bg-white" />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-gray-600 mb-1">Jam *</label>
          <input type="time" value={jam} onChange={e => setJam(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400 transition-all bg-white" />
        </div>
        <div className="col-span-2">
          <label className="block text-[10px] font-semibold text-gray-600 mb-1">Tempat</label>
          <input value={tempat} onChange={e => setTempat(e.target.value)} placeholder="Ruang Rapat A / Online / Zoom"
            className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400 transition-all bg-white" />
        </div>
      </div>

      {/* Checklist peserta */}
      <div>
        <div className="text-[10px] font-semibold text-gray-600 mb-2">
          Peserta * <span className="text-gray-400 font-normal">(yang dicentang akan mendapat notifikasi rapat ini)</span>
        </div>

        {/* Internal SPI */}
        <div className="bg-white rounded-lg border border-gray-200 p-3 mb-2">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-700">🏢 Internal SPI</span>
            <button onClick={() => toggleAll(PESERTA_INTERNAL)}
              className="text-[9px] font-semibold text-teal-600 hover:underline">
              {allInternalSelected ? "Hapus semua" : "Pilih semua"}
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {PESERTA_INTERNAL.map(p => (
              <label key={p} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={peserta.includes(p)} onChange={() => toggle(p)}
                  className="accent-teal-600 w-3 h-3" />
                <span className="text-[10px] text-gray-700">{p}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Unit Kerja */}
        <div className="bg-white rounded-lg border border-gray-200 p-3">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[10px] font-bold text-gray-700">🏫 Unit Kerja (26 unit)</span>
            <button onClick={() => toggleAll(UNIT_KERJA_LIST)}
              className="text-[9px] font-semibold text-teal-600 hover:underline">
              {allUnitsSelected ? "Hapus semua" : "Pilih semua"}
            </button>
          </div>
          <div className="grid grid-cols-3 gap-x-3 gap-y-1.5">
            {UNIT_KERJA_LIST.map(u => (
              <label key={u} className="flex items-center gap-1.5 cursor-pointer">
                <input type="checkbox" checked={peserta.includes(u)} onChange={() => toggle(u)}
                  className="accent-teal-600 w-3 h-3 flex-shrink-0" />
                <span className="text-[10px] text-gray-700 truncate">{u}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        <button onClick={handleSave}
          disabled={!judul || !tgl || !jam || peserta.length === 0}
          className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40 transition-opacity"
          style={{ background:"var(--tsu-teal)" }}>
          Simpan & Kirim Notif ke {peserta.length} Peserta
        </button>
        <button onClick={onCancel}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
          Batal
        </button>
      </div>
    </div>
  );
}

function SectionA({ subSection }: { subSection: string }) {
  const active = subSection || "Jadwal Rapat";
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const { rapatList, addRapat, batalkanRapat } = useContext(RapatCtx);
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [suratTab, setSuratTab] = useState<"Masuk" | "Keluar">("Masuk");
  const [arsipSearch, setArsipSearch] = useState("");
  const [arsipFilter, setArsipFilter] = useState("Semua");
  const [showRapatForm, setShowRapatForm] = useState(false);

  const [suratMasuk, setSuratMasuk] = useState([
    { no: "001/SPI/V/2025",  tgl: "20 Mei 2025", perihal: "Undangan Rapat Koordinasi",       dari: "Rektorat",          disposisi: "Diproses", link: null as string | null },
    { no: "005/SPI/V/2025",  tgl: "19 Mei 2025", perihal: "Permintaan Data Audit BAAK",       dari: "BAAK",              disposisi: "Selesai",  link: null as string | null },
    { no: "009/EXT/V/2025",  tgl: "17 Mei 2025", perihal: "Laporan Hasil Pemeriksaan BPK",    dari: "BPK RI",            disposisi: "Arsip",    link: null as string | null },
    { no: "011/SPI/V/2025",  tgl: "15 Mei 2025", perihal: "Nota Dinas Evaluasi RTL",          dari: "Wakil Rektor II",   disposisi: "Diproses", link: null as string | null },
    { no: "014/SPI/IV/2025", tgl: "10 Apr 2025", perihal: "Undangan Workshop Audit Internal", dari: "BPKP Perwakilan",   disposisi: "Selesai",  link: null as string | null },
  ]);

  const [suratKeluar, setSuratKeluar] = useState([
    { no: "012/SPI/V/2025",  tgl: "19 Mei 2025", perihal: "Pemberitahuan Audit BAAK",         kepada: "Kepala BAAK",        disposisi: "Terkirim", link: null as string | null },
    { no: "015/SPI/V/2025",  tgl: "18 Mei 2025", perihal: "Surat Tugas Audit Lapangan",        kepada: "Tim Auditor",        disposisi: "Terkirim", link: null as string | null },
    { no: "018/SPI/V/2025",  tgl: "16 Mei 2025", perihal: "LHA Fakultas Teknik 2024",          kepada: "Dekan Fak. Teknik",  disposisi: "Diterima", link: null as string | null },
    { no: "020/SPI/V/2025",  tgl: "14 Mei 2025", perihal: "Rekomendasi Tindak Lanjut Sarpras", kepada: "Kepala Sarpras",     disposisi: "Diterima", link: null as string | null },
    { no: "022/SPI/IV/2025", tgl: "8 Apr 2025",  perihal: "Permohonan Data Anggaran 2025",     kepada: "Kepala Keuangan",    disposisi: "Terkirim", link: null as string | null },
  ]);

  const [arsipBase, setArsipBase] = useState([
    { nama: "LHA Fakultas Teknik 2024",      unit: "Fak. Teknik",   tahun: "2024", tipe: "LHA",    tipeIcon: "LHA",   link: "https://drive.google.com/file/lha-fak-teknik-2024" },
    { nama: "KKA LPPM Audit Kinerja 2024",   unit: "LPPM",          tahun: "2024", tipe: "KKA",    tipeIcon: "KKA",   link: "https://drive.google.com/file/kka-lppm-2024" },
    { nama: "Notulen Rapat 20 Mei 2025",     unit: "SPI",           tahun: "2025", tipe: "Notulen",tipeIcon: "NOTUl", link: "https://drive.google.com/file/notulen-rapat-mei-2025" },
    { nama: "Laporan RTL Sarpras Q1 2025",   unit: "Sarpras",       tahun: "2025", tipe: "RTL",    tipeIcon: "RTL",   link: "https://drive.google.com/file/rtl-sarpras-q1-2025" },
    { nama: "LHA BAAK Audit Kepatuhan 2023", unit: "BAAK",          tahun: "2023", tipe: "LHA",    tipeIcon: "LHA",   link: "https://drive.google.com/file/lha-baak-2023" },
    { nama: "KKA Keuangan Semester II 2024", unit: "Keuangan",      tahun: "2024", tipe: "KKA",    tipeIcon: "KKA",   link: "https://drive.google.com/file/kka-keuangan-s2-2024" },
    { nama: "RTL Audit Humas 2024",          unit: "Humas",         tahun: "2024", tipe: "RTL",    tipeIcon: "RTL",   link: "https://drive.google.com/file/rtl-humas-2024" },
    { nama: "Notulen Exit Meeting LPPM",     unit: "LPPM",          tahun: "2025", tipe: "Notulen",tipeIcon: "NOTU",  link: "https://drive.google.com/file/notulen-exit-lppm-2025" },
  ]);
  const arsipDoks = arsipBase.filter(d =>
    (arsipFilter === "Semua" || d.tipe === arsipFilter) &&
    d.nama.toLowerCase().includes(arsipSearch.toLowerCase())
  );

  const statusBadge = (s: string) =>
    s === "Terjadwal" ? "bg-blue-50 text-blue-600" :
    s === "Selesai"   ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600";

  return (
    <div className="flex flex-col gap-4">
      {/* Jadwal Rapat */}
      {active === "Jadwal Rapat" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-xs font-bold text-gray-700">Jadwal Rapat</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">{rapatList.length} rapat terdaftar</p>
            </div>
            {canEdit && <button onClick={() => setShowRapatForm(v => !v)} className="flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
              + Tambah Rapat
            </button>}
          </div>
          {showRapatForm && canEdit && (
            <FormTambahRapat
              onSave={r => { addRapat(r); setShowRapatForm(false); }}
              onCancel={() => setShowRapatForm(false)}
            />
          )}
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["No", "Judul Rapat", "Tanggal", "Jam", "Peserta", "Status", "Aksi"].map(h => (
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rapatList.map((r, idx) => (
                  <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 text-gray-400 text-[10px]">{idx + 1}</td>
                    <td className="py-2 pr-3 font-medium text-gray-700">{r.judul}</td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{r.tgl}</td>
                    <td className="py-2 pr-3 text-gray-500">{r.jam}</td>
                    <td className="py-2 pr-3 text-gray-500 max-w-[140px] truncate">{pesertaLabel(r.peserta)}</td>
                    <td className="py-2 pr-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}>{r.status}</span>
                    </td>
                    <td className="py-2">
                      <div className="flex gap-1">
                        <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Detail</button>
                        {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Edit</button>}
                        {canEdit && r.status === "Terjadwal" && (
                          <button onClick={() => batalkanRapat(r.id)} className="text-[9px] px-2 py-1 rounded border border-red-100 text-red-500 hover:bg-red-50">Batalkan</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Surat Masuk & Keluar */}
      {active === "Surat Masuk & Keluar" && (
        <div className="flex flex-col gap-4">
          {/* Chart tren */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">📬 Tren Surat per Bulan</h4>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={suratTrend} margin={{ top: 4, right: 4, left: -24, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} />
                <Line type="monotone" dataKey="masuk" name="Surat Masuk" stroke="#3b82f6" strokeWidth={2.5} dot={{ r: 3 }} />
                <Line type="monotone" dataKey="keluar" name="Surat Keluar" stroke="#0e8080" strokeWidth={2.5} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex gap-4 mt-1 justify-center">
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 bg-blue-500 rounded inline-block"/><span className="text-[9px] text-gray-400">Surat Masuk</span></div>
              <div className="flex items-center gap-1.5"><span className="w-3 h-0.5 inline-block rounded" style={{background:"var(--tsu-teal)"}}/><span className="text-[9px] text-gray-400">Surat Keluar</span></div>
            </div>
          </div>
          {/* Tabel surat */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div className="flex gap-1">
                {(["Masuk", "Keluar"] as const).map(t => (
                  <button key={t} onClick={() => setSuratTab(t)}
                    className={`text-[10px] font-semibold px-3 py-1 rounded-full transition-colors ${suratTab === t ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}
                    style={suratTab === t ? { background: "var(--tsu-teal)" } : {}}>
                    Surat {t}
                  </button>
                ))}
              </div>
              {canEdit && <button onClick={() => setTambahModal(suratTab === "Masuk" ? "Surat Masuk" : "Surat Keluar")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
                + {suratTab === "Masuk" ? "Tambah Surat Masuk" : "Tambah Surat Keluar"}
              </button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["No. Surat", "Tanggal", "Perihal", suratTab === "Masuk" ? "Dari" : "Kepada", "Disposisi", "Aksi"].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(suratTab === "Masuk" ? suratMasuk : suratKeluar).map((s, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] font-mono text-gray-500 whitespace-nowrap">{s.no}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{s.tgl}</td>
                      <td className="py-2 pr-3 text-gray-700 max-w-[180px] truncate">{s.perihal}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{"dari" in s ? s.dari : s.kepada}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.disposisi === "Selesai" || s.disposisi === "Diterima" ? "bg-green-50 text-green-600" : s.disposisi === "Arsip" ? "bg-gray-100 text-gray-500" : "bg-amber-50 text-amber-600"}`}>{s.disposisi}</span>
                      </td>
                      <td className="py-2">
                        <div className="flex gap-1">
                          <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Lihat</button>
                          <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Arsip</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Arsip Dokumen Audit */}
      {active === "Arsip Dokumen Audit" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-gray-700">Arsip Dokumen Audit</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Dokumen diakses via link Google Drive</p>
            </div>
            {canEdit && <button onClick={() => setTambahModal("Tambah Dokumen Arsip")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
              + Tambah Dokumen
            </button>}
          </div>
          <div className="flex gap-2 mb-3">
            <input value={arsipSearch} onChange={e => setArsipSearch(e.target.value)}
              placeholder="Cari dokumen..." className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400" />
            <select value={arsipFilter} onChange={e => setArsipFilter(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none">
              {["Semua", "LHA", "KKA", "RTL", "Notulen"].map(f => <option key={f}>{f}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {arsipDoks.map((d, i) => (
              <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${d.tipe === "LHA" ? "bg-teal-50 text-teal-600" : d.tipe === "KKA" ? "bg-purple-50 text-purple-600" : d.tipe === "RTL" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                  🔗
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{d.nama}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.tipe === "LHA" ? "bg-teal-50 text-teal-600" : d.tipe === "KKA" ? "bg-purple-50 text-purple-600" : d.tipe === "RTL" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>{d.tipe}</span>
                    <span className="text-[9px] text-gray-400">{d.unit} · {d.tahun}</span>
                  </div>
                </div>
                <div className="flex flex-col gap-1 flex-shrink-0">
                  <a href={d.link} target="_blank" rel="noreferrer"
                    className="text-[9px] px-2 py-1 rounded border text-center hover:opacity-80 transition-opacity"
                    style={{ borderColor: "var(--tsu-teal)", color: "var(--tsu-teal)" }}>
                    ↗ Buka
                  </a>
                  {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-amber-200 hover:bg-amber-50 text-amber-600">Edit</button>}
                  {canEdit && <button onClick={() => setArsipBase(prev => prev.filter(a => a.nama !== d.nama))} className="text-[9px] px-2 py-1 rounded border border-red-100 hover:bg-red-50 text-red-500">Hapus</button>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tambahModal === "Surat Masuk" && (
        <TambahFormModal title="Tambah Surat Masuk" fields={[
          { key:"no",        label:"No Surat",              type:"text",   placeholder:"001/SPI/VI/2025" },
          { key:"tgl",       label:"Tanggal",               type:"date" },
          { key:"perihal",   label:"Perihal",               type:"text" },
          { key:"dari",      label:"Dari (Pengirim)",       type:"text" },
          { key:"disposisi", label:"Disposisi",             type:"select", options:["Diproses","Selesai","Arsip"] },
          { key:"link",      label:"Link Scan Surat (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setSuratMasuk(prev => [{ no: v.no || "-", tgl: v.tgl || "-", perihal: v.perihal || "-", dari: v.dari || "-", disposisi: v.disposisi || "Diproses", link: v.link || null }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Surat Keluar" && (
        <TambahFormModal title="Tambah Surat Keluar" fields={[
          { key:"no",        label:"No Surat",              type:"text",   placeholder:"012/SPI/VI/2025" },
          { key:"tgl",       label:"Tanggal",               type:"date" },
          { key:"perihal",   label:"Perihal",               type:"text" },
          { key:"kepada",    label:"Kepada (Tujuan)",       type:"text" },
          { key:"link",      label:"Link Draft Surat (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setSuratKeluar(prev => [{ no: v.no || "-", tgl: v.tgl || "-", perihal: v.perihal || "-", kepada: v.kepada || "-", disposisi: "Terkirim", link: v.link || null }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Dokumen Arsip" && (
        <TambahFormModal title="Tambah Dokumen Arsip" fields={[
          { key:"nama",  label:"Nama Dokumen",            type:"text" },
          { key:"unit",  label:"Unit Kerja",              type:"select", options:["Fak. Teknik","LPPM","BAAK","Sarpras","Keuangan","Kemahasiswaan","SPI","Humas"] },
          { key:"tahun", label:"Tahun",                   type:"select", options:["2025","2024","2023","2022"] },
          { key:"tipe",  label:"Tipe Dokumen",            type:"select", options:["LHA","KKA","RTL","Notulen"] },
          { key:"link",  label:"Link Dokumen (Google Drive)", type:"url" },
        ]}
        onSave={(v) => setArsipBase(prev => [{ nama: v.nama || "-", unit: v.unit || "-", tahun: v.tahun || "-", tipe: v.tipe || "-", tipeIcon: v.tipe || "-", link: v.link || "#" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

function SectionB({ subSection }: { subSection: string }) {
  const active = subSection || "Audit Universe";
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const levelBadge = (l: string) =>
    l === "Tinggi" ? "bg-red-50 text-red-600" : l === "Sedang" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600";

  const [universeData, setUniverseData] = useState([
    { no: 1, unit: "BAAK",               kategori: "Layanan Akademik", terakhir: "Apr 2024", frekuensi: "Tahunan",    risiko: "Sedang", status: "Aktif" },
    { no: 2, unit: "LPPM",               kategori: "Penelitian",       terakhir: "Mar 2025", frekuensi: "Tahunan",    risiko: "Rendah", status: "Aktif" },
    { no: 3, unit: "Sarpras",            kategori: "Infrastruktur",    terakhir: "Jan 2025", frekuensi: "Semesteran", risiko: "Tinggi", status: "Aktif" },
    { no: 4, unit: "Keuangan & Akunt.",  kategori: "Keuangan",         terakhir: "Feb 2025", frekuensi: "Semesteran", risiko: "Tinggi", status: "Aktif" },
    { no: 5, unit: "Humas & Marketing",  kategori: "Promosi",          terakhir: "Okt 2024", frekuensi: "2 Tahunan",  risiko: "Rendah", status: "Aktif" },
    { no: 6, unit: "Fak. Teknik",        kategori: "Akademik",         terakhir: "Mei 2025", frekuensi: "Tahunan",    risiko: "Sedang", status: "Aktif" },
    { no: 7, unit: "Fak. Hukum",         kategori: "Akademik",         terakhir: "Des 2024", frekuensi: "Tahunan",    risiko: "Sedang", status: "Aktif" },
    { no: 8, unit: "Kemahasiswaan",       kategori: "Layanan Mhs",      terakhir: "Sep 2024", frekuensi: "2 Tahunan",  risiko: "Rendah", status: "Tidak Aktif" },
  ]);

  const [pkptData, setPkptData] = useState([
    { no: 1, program: "Audit Kinerja Akademik",       unit: "BAAK",              periode: "Q1 2025", ketua: "Budi Santoso",  anggaran: 18.5, status: "Selesai"      },
    { no: 2, program: "Audit Kepatuhan LPPM",          unit: "LPPM",              periode: "Q1 2025", ketua: "Ratna Dewi",    anggaran: 12.0, status: "Selesai"      },
    { no: 3, program: "Audit Keuangan Sarpras",        unit: "Sarpras",           periode: "Q2 2025", ketua: "Budi Santoso",  anggaran: 22.0, status: "Berjalan"     },
    { no: 4, program: "Audit SOP Kemahasiswaan",       unit: "Kemahasiswaan",     periode: "Q2 2025", ketua: "Andi Prasetyo", anggaran: 9.5,  status: "Direncanakan" },
    { no: 5, program: "Audit Kinerja Fak. Teknik",    unit: "Fak. Teknik",       periode: "Q3 2025", ketua: "Ratna Dewi",    anggaran: 15.0, status: "Direncanakan" },
    { no: 6, program: "Audit Kepatuhan Keuangan",      unit: "Keuangan & Akunt.", periode: "Q3 2025", ketua: "Budi Santoso",  anggaran: 20.0, status: "Direncanakan" },
  ]);

  const [riskData, setRiskData] = useState([
    { no: 1, id: "RSK-001", uraian: "Ketidaksesuaian laporan keuangan",       kategori: "Keuangan",    kemungkinan: 4, dampak: 5, pengendalian: "Rekonsiliasi bulanan", status: "Terbuka"  },
    { no: 2, id: "RSK-002", uraian: "Pengelolaan aset tidak tercatat",         kategori: "Aset",         kemungkinan: 4, dampak: 4, pengendalian: "Inventarisasi rutin",   status: "Terbuka"  },
    { no: 3, id: "RSK-003", uraian: "SOP penerimaan mahasiswa tidak dipatuhi", kategori: "Kepatuhan",    kemungkinan: 3, dampak: 4, pengendalian: "Review SOP tahunan",    status: "Proses"   },
    { no: 4, id: "RSK-004", uraian: "Dokumentasi penelitian tidak lengkap",    kategori: "Operasional",  kemungkinan: 3, dampak: 3, pengendalian: "Checklist dokumen",     status: "Proses"   },
    { no: 5, id: "RSK-005", uraian: "Keterlambatan pelaporan RTL",             kategori: "Kepatuhan",    kemungkinan: 3, dampak: 3, pengendalian: "Monitoring mingguan",   status: "Proses"   },
    { no: 6, id: "RSK-006", uraian: "Akses sistem informasi tidak terkontrol", kategori: "Teknologi",    kemungkinan: 2, dampak: 4, pengendalian: "Review hak akses",      status: "Selesai"  },
    { no: 7, id: "RSK-007", uraian: "Pengelolaan data alumni tidak terstruktur",kategori: "Operasional", kemungkinan: 2, dampak: 2, pengendalian: "SOP pengelolaan data",  status: "Selesai"  },
  ]);

  const pkptStat = [
    { label: "Total Program", val: 6,  color: "text-gray-700" },
    { label: "Berjalan",      val: 1,  color: "text-blue-600" },
    { label: "Selesai",       val: 2,  color: "text-green-600" },
    { label: "Direncanakan",  val: 3,  color: "text-amber-600" },
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Audit Universe */}
      {active === "Audit Universe" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-1">
              <h4 className="text-xs font-bold text-gray-700">🫧 Audit Universe — Risiko × Dampak × Temuan</h4>
              <span className="text-[10px] text-gray-400">Ukuran = jumlah temuan</span>
            </div>
            <ResponsiveContainer width="100%" height={180}>
              <ScatterChart margin={{ top: 8, right: 16, left: -16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" dataKey="risiko" name="Tingkat Risiko" domain={[0, 5]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} label={{ value: "Risiko →", position: "insideBottomRight", offset: 0, style: { fontSize: 9, fill: "#94a3b8" } }} />
                <YAxis type="number" dataKey="dampak" name="Dampak" domain={[0, 6]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} label={{ value: "Dampak", angle: -90, position: "insideLeft", style: { fontSize: 9, fill: "#94a3b8" } }} />
                <ZAxis type="number" dataKey="temuan" range={[40, 400]} name="Temuan" />
                <Tooltip cursor={{ strokeDasharray: "3 3" }} contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={((val: unknown, name: unknown) => [`${val}`, `${name ?? ""}`]) as never} />
                <Scatter data={auditUniverseBubble} fill="var(--tsu-teal)" fillOpacity={0.7}>
                  {auditUniverseBubble.map((entry, i) => (
                    <Cell key={i} fill={entry.risiko >= 4 ? "#ef4444" : entry.risiko >= 3 ? "#f5a623" : "#0e8080"} fillOpacity={0.75} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
            <div className="flex gap-3 justify-center mt-1">
              {[{c:"#ef4444",l:"Risiko Tinggi (≥4)"},{c:"#f5a623",l:"Risiko Sedang (3)"},{c:"#0e8080",l:"Risiko Rendah (<3)"}].map(lg=>(
                <div key={lg.l} className="flex items-center gap-1"><span className="w-2 h-2 rounded-full flex-shrink-0" style={{background:lg.c}}/><span className="text-[9px] text-gray-400">{lg.l}</span></div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Daftar Audit Universe</h4>
              {canEdit && <button onClick={() => setTambahModal("Tambah Unit Kerja")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Unit</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["No","Unit Kerja","Kategori","Terakhir Diaudit","Frekuensi","Risiko","Status","Aksi"].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {universeData.map(u=>(
                    <tr key={u.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] text-gray-400">{u.no}</td>
                      <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{u.unit}</td>
                      <td className="py-2 pr-3 text-gray-500">{u.kategori}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{u.terakhir}</td>
                      <td className="py-2 pr-3 text-gray-500">{u.frekuensi}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${levelBadge(u.risiko)}`}>{u.risiko}</span></td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${u.status === "Aktif" ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500"}`}>{u.status}</span></td>
                      <td className="py-2"><div className="flex gap-1">
                        {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Edit</button>}
                        {canEdit && <button onClick={() => setUniverseData(prev => prev.filter(x => x.no !== u.no))} className="text-[9px] px-2 py-1 rounded border border-red-100 hover:bg-red-50 text-red-500">Hapus</button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* PKPT */}
      {active === "PKPT" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-gray-700">Program Kerja Pengawasan Tahunan (PKPT) 2025</h4>
                <div className="flex items-center gap-2 mt-1">
                  <div className="w-32 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: "50%" }} />
                  </div>
                  <span className="text-[10px] text-gray-400">3 dari 6 program terlaksana</span>
                </div>
              </div>
              {canEdit && <button onClick={() => setTambahModal("Tambah Program Audit")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Program</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["No","Program Audit","Unit Sasaran","Periode","Auditor Ketua","Anggaran (Rp Jt)","Status","Aksi"].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pkptData.map(p=>(
                    <tr key={p.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] text-gray-400">{p.no}</td>
                      <td className="py-2 pr-3 font-medium text-gray-700">{p.program}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.unit}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.periode}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.ketua}</td>
                      <td className="py-2 pr-3 text-gray-700 font-semibold">{p.anggaran.toFixed(1)}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === "Selesai" ? "bg-green-50 text-green-600" : p.status === "Berjalan" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>{p.status}</span></td>
                      <td className="py-2"><div className="flex gap-1">
                        {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Edit</button>}
                        <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Detail</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Risk Register */}
      {active === "Risk Register" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-gray-700">Risk Register</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Skor = Kemungkinan × Dampak</p>
            </div>
            {canEdit && <button onClick={() => setTambahModal("Tambah Risiko")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Risiko</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["No","ID","Uraian Risiko","Kategori","Kemung.","Dampak","Skor","Level","Pengendalian","Status","Aksi"].map(h=>(
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {riskData.map(r=>{
                  const skor = r.kemungkinan * r.dampak;
                  const level = skor >= 15 ? "Tinggi" : skor >= 9 ? "Sedang" : "Rendah";
                  return (
                    <tr key={r.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] text-gray-400">{r.no}</td>
                      <td className="py-2 pr-3 text-[10px] font-mono text-gray-500">{r.id}</td>
                      <td className="py-2 pr-3 text-gray-700 max-w-[160px]">{r.uraian}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{r.kategori}</td>
                      <td className="py-2 pr-3 text-center font-semibold text-gray-700">{r.kemungkinan}</td>
                      <td className="py-2 pr-3 text-center font-semibold text-gray-700">{r.dampak}</td>
                      <td className="py-2 pr-3 text-center font-black" style={{ color: level === "Tinggi" ? "#ef4444" : level === "Sedang" ? "#f59e0b" : "#22c55e" }}>{skor}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${levelBadge(level)}`}>{level}</span></td>
                      <td className="py-2 pr-3 text-gray-500 max-w-[140px] truncate">{r.pengendalian}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status === "Selesai" ? "bg-green-50 text-green-600" : r.status === "Proses" ? "bg-blue-50 text-blue-600" : "bg-amber-50 text-amber-600"}`}>{r.status}</span></td>
                      <td className="py-2"><div className="flex gap-1">
                        {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Edit</button>}
                        {canEdit && <button onClick={() => setRiskData(prev => prev.filter(x => x.id !== r.id))} className="text-[9px] px-2 py-1 rounded border border-red-100 hover:bg-red-50 text-red-500">Hapus</button>}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tambahModal === "Tambah Unit Kerja" && (
        <TambahFormModal title="Tambah Unit Kerja" fields={[
          { key:"unit",      label:"Nama Unit Kerja",  type:"text" },
          { key:"kategori",  label:"Kategori",         type:"select", options:["Layanan Akademik","Penelitian","Infrastruktur","Keuangan","Promosi","Akademik","Layanan Mhs"] },
          { key:"frekuensi", label:"Frekuensi Audit",  type:"select", options:["Tahunan","Semesteran","2 Tahunan"] },
          { key:"risiko",    label:"Tingkat Risiko",   type:"select", options:["Tinggi","Sedang","Rendah"] },
        ]}
        onSave={(v) => setUniverseData(prev => [{ no: prev.length + 1, unit: v.unit || "-", kategori: v.kategori || "-", terakhir: "-", frekuensi: v.frekuensi || "Tahunan", risiko: v.risiko || "Sedang", status: "Aktif" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Program Audit" && (
        <TambahFormModal title="Tambah Program Audit" fields={[
          { key:"program",  label:"Nama Program Audit", type:"text" },
          { key:"unit",     label:"Unit Kerja",          type:"select", options:["BAAK","LPPM","Sarpras","Keuangan & Akunt.","Kemahasiswaan","Fak. Teknik","Fak. Hukum"] },
          { key:"periode",  label:"Periode",             type:"text",   placeholder:"Q1 2025" },
          { key:"ketua",    label:"Ketua Tim Auditor",   type:"text" },
          { key:"anggaran", label:"Anggaran (Rp Jt)",    type:"text",   placeholder:"0.0" },
        ]}
        onSave={(v) => setPkptData(prev => [{ no: prev.length + 1, program: v.program || "-", unit: v.unit || "-", periode: v.periode || "-", ketua: v.ketua || "-", anggaran: parseFloat(v.anggaran) || 0, status: "Direncanakan" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Risiko" && (
        <TambahFormModal title="Tambah Risiko" fields={[
          { key:"id",          label:"ID Risiko",            type:"text",   placeholder:"RSK-008" },
          { key:"uraian",      label:"Uraian Risiko",        type:"textarea" },
          { key:"kategori",    label:"Kategori",             type:"select", options:["Keuangan","Aset","Kepatuhan","Operasional","Teknologi"] },
          { key:"kemungkinan", label:"Kemungkinan (1-5)",    type:"text",   placeholder:"1–5" },
          { key:"dampak",      label:"Dampak (1-5)",         type:"text",   placeholder:"1–5" },
          { key:"pengendalian",label:"Rencana Pengendalian", type:"text" },
        ]}
        onSave={(v) => setRiskData(prev => [{ no: prev.length + 1, id: v.id || `RSK-${String(prev.length + 1).padStart(3,"0")}`, uraian: v.uraian || "-", kategori: v.kategori || "-", kemungkinan: parseInt(v.kemungkinan) || 1, dampak: parseInt(v.dampak) || 1, pengendalian: v.pengendalian || "-", status: "Terbuka" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

function SectionC({ subSection }: { subSection: string }) {
  const active = subSection || "Kompetensi Auditor";
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [filterAuditor, setFilterAuditor] = useState("Semua");

  const [auditorList, setAuditorList] = useState([
    { nama: "Budi Santoso, S.E.",   inisial: "BS", jabatan: "Auditor Madya",  sertif: "CIA, CISA", diperbarui: "Jan 2025", status: "Aktif"  },
    { nama: "Ratna Dewi, M.Ak.",    inisial: "RD", jabatan: "Auditor Muda",   sertif: "CPA",       diperbarui: "Feb 2025", status: "Aktif"  },
    { nama: "Andi Prasetyo, S.Kom.",inisial: "AP", jabatan: "Auditor Muda",   sertif: "CISA",      diperbarui: "Mar 2025", status: "Aktif"  },
    { nama: "Siti Aisyah, S.E.",    inisial: "SA", jabatan: "Auditor Pertama",sertif: "—",         diperbarui: "Apr 2025", status: "Proses" },
  ]);

  const penugasanData = [
    { no: 1, auditor: "Budi Santoso",  program: "Audit Kinerja Akademik",    unit: "BAAK",          peran: "Ketua Tim", periode: "Jan–Mar 2025", beban: 45, status: "Selesai"  },
    { no: 2, auditor: "Ratna Dewi",    program: "Audit Kinerja Akademik",    unit: "BAAK",          peran: "Anggota",   periode: "Jan–Mar 2025", beban: 30, status: "Selesai"  },
    { no: 3, auditor: "Andi Prasetyo", program: "Audit Kepatuhan LPPM",      unit: "LPPM",          peran: "Anggota",   periode: "Feb–Mar 2025", beban: 28, status: "Selesai"  },
    { no: 4, auditor: "Budi Santoso",  program: "Audit Keuangan Sarpras",    unit: "Sarpras",       peran: "Ketua Tim", periode: "Apr–Jun 2025", beban: 60, status: "Berjalan" },
    { no: 5, auditor: "Siti Aisyah",   program: "Audit Keuangan Sarpras",    unit: "Sarpras",       peran: "Anggota",   periode: "Apr–Jun 2025", beban: 40, status: "Berjalan" },
    { no: 6, auditor: "Ratna Dewi",    program: "Audit Kinerja Fak. Teknik", unit: "Fak. Teknik",   peran: "Ketua Tim", periode: "Q3 2025",      beban: 50, status: "Rencana"  },
    { no: 7, auditor: "Andi Prasetyo", program: "Audit Kinerja Fak. Teknik", unit: "Fak. Teknik",   peran: "Anggota",   periode: "Q3 2025",      beban: 35, status: "Rencana"  },
    { no: 8, auditor: "Siti Aisyah",   program: "Audit Kepatuhan Keuangan",  unit: "Keuangan",      peran: "Anggota",   periode: "Q3 2025",      beban: 40, status: "Rencana"  },
  ];

  const [pelatihanData, setPelatihanData] = useState([
    { no: 1, judul: "Workshop Audit Berbasis Risiko", peserta: "Budi, Ratna",    tgl: "10 Jun 2025", penyelenggara: "BPKP Pusat",   anggaran: 4.5, status: "Terdaftar" },
    { no: 2, judul: "Pelatihan CISA Online",          peserta: "Siti Aisyah",    tgl: "15 Jul 2025", penyelenggara: "ISACA",         anggaran: 8.0, status: "Terdaftar" },
    { no: 3, judul: "Seminar Standar Audit 2025",     peserta: "Semua Auditor",  tgl: "2 Agt 2025",  penyelenggara: "IAPI",          anggaran: 6.5, status: "Terdaftar" },
    { no: 4, judul: "Diklat Auditor Madya",           peserta: "Budi Santoso",   tgl: "Sep 2025",    penyelenggara: "BPKP",          anggaran: 12.0,status: "Rencana"   },
    { no: 5, judul: "Workshop Forensik Audit",        peserta: "Ratna, Andi",    tgl: "Okt 2025",    penyelenggara: "IIA Indonesia",  anggaran: 5.0, status: "Rencana"   },
    { no: 6, judul: "Pelatihan GRC Internal",         peserta: "Semua Auditor",  tgl: "Nov 2025",    penyelenggara: "Internal SPI",  anggaran: 2.5, status: "Selesai"   },
  ]);

  const auditorNames = ["Semua", ...Array.from(new Set(penugasanData.map(p => p.auditor)))];
  const filteredPenugasan = filterAuditor === "Semua" ? penugasanData : penugasanData.filter(p => p.auditor === filterAuditor);

  const auditors = [
    { key: "Budi",  label: "Budi S." },
    { key: "Ratna", label: "Ratna D." },
    { key: "Andi",  label: "Andi P." },
    { key: "Siti",  label: "Siti A." },
  ];
  const cellStyle = (v: number) => v >= 4 ? { bg: "#dcfce7", text: "#166534" } : v >= 2 ? { bg: "#fef9c3", text: "#854d0e" } : { bg: "#fee2e2", text: "#991b1b" };

  return (
    <div className="flex flex-col gap-4">
      {/* Kompetensi Auditor */}
      {active === "Kompetensi Auditor" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">🎯 Matriks Kompetensi Auditor</h4>
              <div className="flex gap-2">
                {[{bg:"#dcfce7",l:"Mahir (4-5)"},{bg:"#fef9c3",l:"Cukup (2-3)"},{bg:"#fee2e2",l:"Perlu Latih (≤1)"}].map(s=>(
                  <div key={s.l} className="flex items-center gap-1">
                    <span className="w-3 h-3 rounded" style={{background:s.bg}}/>
                    <span className="text-[8px] text-gray-400">{s.l}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex gap-1 mb-1 pl-36">
              {auditors.map(a => <div key={a.key} className="flex-1 text-center text-[9px] font-bold text-gray-600">{a.label}</div>)}
            </div>
            {sdmRadarAuditors.map(row => (
              <div key={row.subject} className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-gray-600 w-36 flex-shrink-0">{row.subject}</span>
                {auditors.map(a => {
                  const v = row[a.key as keyof typeof row] as number;
                  const s = cellStyle(v);
                  return <div key={a.key} className="flex-1 h-8 rounded-lg flex items-center justify-center font-black text-sm" style={{ background: s.bg, color: s.text }}>{v}</div>;
                })}
              </div>
            ))}
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Data Auditor & Sertifikasi</h4>
              {canEdit && <button onClick={() => setTambahModal("Tambah Auditor")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Auditor</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Nama","Jabatan","Sertifikasi","Terakhir Diperbarui","Status","Aksi"].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {auditorList.map((a, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-purple-100 text-purple-700 text-[10px] font-bold flex items-center justify-center flex-shrink-0">{a.inisial}</div>
                          <span className="font-medium text-gray-700 whitespace-nowrap">{a.nama}</span>
                        </div>
                      </td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{a.jabatan}</td>
                      <td className="py-2 pr-3 text-gray-700 font-semibold">{a.sertif}</td>
                      <td className="py-2 pr-3 text-gray-500">{a.diperbarui}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${a.status === "Aktif" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>{a.status}</span></td>
                      <td className="py-2"><div className="flex gap-1">
                        {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Edit</button>}
                        <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Detail</button>
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Riwayat Penugasan */}
      {active === "Riwayat Penugasan" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700">Riwayat Penugasan Auditor</h4>
            <select value={filterAuditor} onChange={e => setFilterAuditor(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none">
              {auditorNames.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["No","Nama Auditor","Program Audit","Unit Sasaran","Peran","Periode","Beban (hari)","Status"].map(h=>(
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPenugasan.map(p => (
                  <tr key={p.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 text-[10px] text-gray-400">{p.no}</td>
                    <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{p.auditor}</td>
                    <td className="py-2 pr-3 text-gray-600">{p.program}</td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.unit}</td>
                    <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.peran === "Ketua Tim" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500"}`}>{p.peran}</span></td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.periode}</td>
                    <td className="py-2 pr-3 text-center font-semibold text-gray-700">{p.beban}</td>
                    <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.status === "Selesai" ? "bg-green-50 text-green-600" : p.status === "Berjalan" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>{p.status}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Jadwal Pelatihan */}
      {active === "Jadwal Pelatihan" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h4 className="text-xs font-bold text-gray-700">Jadwal Pelatihan & Pengembangan SDM</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">3 pelatihan mendatang</p>
            </div>
            {canEdit && <button onClick={() => setTambahModal("Daftarkan Pelatihan")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Daftarkan Pelatihan</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["No","Nama Pelatihan","Peserta","Tanggal","Penyelenggara","Anggaran (Rp Jt)","Status","Aksi"].map(h=>(
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pelatihanData.map(t => (
                  <tr key={t.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 text-[10px] text-gray-400">{t.no}</td>
                    <td className="py-2 pr-3 font-medium text-gray-700">{t.judul}</td>
                    <td className="py-2 pr-3 text-gray-500">{t.peserta}</td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{t.tgl}</td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{t.penyelenggara}</td>
                    <td className="py-2 pr-3 font-semibold text-gray-700">{t.anggaran.toFixed(1)}</td>
                    <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${t.status === "Selesai" ? "bg-green-50 text-green-600" : t.status === "Terdaftar" ? "bg-blue-50 text-blue-600" : "bg-gray-100 text-gray-500"}`}>{t.status}</span></td>
                    <td className="py-2"><div className="flex gap-1">
                      <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Detail</button>
                      {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Batal</button>}
                    </div></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {tambahModal === "Tambah Auditor" && (
        <TambahFormModal title="Tambah Data Auditor" fields={[
          { key:"nama",    label:"Nama Lengkap & Gelar",  type:"text" },
          { key:"jabatan", label:"Jabatan",               type:"select", options:["Auditor Madya","Auditor Muda","Auditor Pertama","Ketua SPI"] },
          { key:"sertif",  label:"Sertifikasi (jika ada)",type:"text",   placeholder:"CIA, CISA, CPA..." },
        ]}
        onSave={(v) => {
          const inisial = (v.nama || "").split(" ").map((w: string) => w[0]).slice(0,2).join("").toUpperCase() || "??";
          setAuditorList(prev => [{ nama: v.nama || "-", inisial, jabatan: v.jabatan || "-", sertif: v.sertif || "—", diperbarui: new Date().toLocaleDateString("id-ID",{month:"short",year:"numeric"}), status: "Aktif" }, ...prev]);
        }}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Daftarkan Pelatihan" && (
        <TambahFormModal title="Daftarkan Pelatihan" fields={[
          { key:"judul",        label:"Judul Pelatihan / Seminar",  type:"text" },
          { key:"peserta",      label:"Peserta",                    type:"text", placeholder:"Nama auditor yang ikut..." },
          { key:"tgl",          label:"Tanggal Pelaksanaan",        type:"text", placeholder:"Jun 2025" },
          { key:"penyelenggara",label:"Penyelenggara",              type:"text" },
          { key:"anggaran",     label:"Anggaran (Rp Jt)",           type:"text", placeholder:"0.0" },
          { key:"link",         label:"Link Info / Sertifikat (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setPelatihanData(prev => [{ no: prev.length + 1, judul: v.judul || "-", peserta: v.peserta || "-", tgl: v.tgl || "-", penyelenggara: v.penyelenggara || "-", anggaran: parseFloat(v.anggaran) || 0, status: "Terdaftar" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

function SectionD({ subSection }: { subSection: string }) {
  const active = subSection || "Pedoman Audit";
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterTahun, setFilterTahun] = useState("Semua");
  const [selectedStandar, setSelectedStandar] = useState(0);

  const [pedomanBase, setPedomanBase] = useState([
    { icon: "📋", judul: "Pedoman Audit Internal SPI",    deskripsi: "Panduan pelaksanaan audit internal sesuai standar AAIPI",         versi: "v3.1", berlaku: "Jan 2025", link: "https://drive.google.com/file/pedoman-audit-internal-spi" },
    { icon: "⚖️", judul: "Kode Etik Auditor Internal",    deskripsi: "Prinsip dan aturan perilaku auditor internal universitas",        versi: "v2.0", berlaku: "Jan 2025", link: "https://drive.google.com/file/kode-etik-auditor" },
    { icon: "📝", judul: "SOP Pelaksanaan Audit Kinerja", deskripsi: "Prosedur standar operasional audit kinerja unit kerja",           versi: "v1.5", berlaku: "Feb 2025", link: "https://drive.google.com/file/sop-audit-kinerja" },
    { icon: "🔍", judul: "SOP Audit Kepatuhan",           deskripsi: "Prosedur audit kepatuhan terhadap regulasi dan kebijakan",        versi: "v1.2", berlaku: "Feb 2025", link: "https://drive.google.com/file/sop-audit-kepatuhan" },
    { icon: "📊", judul: "Panduan Kertas Kerja Audit",    deskripsi: "Format dan panduan pengisian kertas kerja audit (KKA)",           versi: "v2.3", berlaku: "Mar 2025", link: "https://drive.google.com/file/panduan-kka" },
    { icon: "🎯", judul: "Pedoman Audit Berbasis Risiko", deskripsi: "Kerangka audit berbasis risiko untuk perencanaan dan pelaksanaan", versi: "v1.0", berlaku: "Apr 2025", link: "https://drive.google.com/file/pedoman-audit-risiko" },
  ]);
  const pedomanList = pedomanBase.filter(d => d.judul.toLowerCase().includes(search.toLowerCase()));

  const [peraturanBase, setPeraturanBase] = useState([
    { nomor: "Peraturan Rektor No. 12/2024",    judul: "Tata Kelola Pengawasan Internal",        instansi: "Rektor",        terbit: "Des 2024", status: "Berlaku", link: "https://drive.google.com/file/peraturan-rektor-12-2024" as string | null },
    { nomor: "Permendikbud No. 63/2021",         judul: "Standar Nasional Pendidikan Tinggi",     instansi: "Kemdikbud",     terbit: "2021",     status: "Berlaku", link: "https://drive.google.com/file/permendikbud-63-2021" as string | null },
    { nomor: "Peraturan BPK No. 1/2017",         judul: "Standar Pemeriksaan Keuangan Negara",   instansi: "BPK RI",        terbit: "2017",     status: "Berlaku", link: "https://drive.google.com/file/peraturan-bpk-1-2017" as string | null },
    { nomor: "Permendagri No. 78/2012",          judul: "Tata Kearsipan di Lingkungan Kemendagri",instansi: "Kemendagri",    terbit: "2012",     status: "Berlaku", link: "https://drive.google.com/file/permendagri-78-2012" as string | null },
    { nomor: "Peraturan Rektor No. 5/2022",      judul: "Manajemen Risiko Universitas",           instansi: "Rektor",        terbit: "2022",     status: "Dicabut", link: null as string | null },
  ]);
  const peraturanList = peraturanBase.filter(d => filterTahun === "Semua" || d.terbit.includes(filterTahun));

  const standarList = [
    { judul: "IPPF — International Professional Practices Framework", isi: "Kerangka praktik profesional internasional yang dikeluarkan IIA, mencakup standar, kode etik, dan panduan implementasi audit internal global.", link: "https://drive.google.com/file/ippf-framework" },
    { judul: "Standar Audit AAIPI 2023",                               isi: "Standar audit internal yang diterbitkan Asosiasi Auditor Internal Pemerintah Indonesia, wajib diterapkan oleh SPI perguruan tinggi negeri.",  link: "https://drive.google.com/file/standar-aaipi-2023" },
    { judul: "SPIP — Sistem Pengendalian Intern Pemerintah",           isi: "Kerangka pengendalian intern berdasarkan PP No. 60/2008 yang menjadi acuan tata kelola dan pengawasan di lingkungan instansi pemerintah.",  link: "https://drive.google.com/file/spip-pp-60-2008" },
    { judul: "IIA Standard 2100 — Nature of Work",                     isi: "Standar yang mengatur lingkup pekerjaan audit internal: evaluasi manajemen risiko, pengendalian, dan tata kelola organisasi.",                link: "https://drive.google.com/file/iia-standard-2100" },
    { judul: "SNI ISO 31000:2018 — Manajemen Risiko",                  isi: "Standar nasional Indonesia untuk manajemen risiko, memberikan panduan prinsip, kerangka kerja, dan proses manajemen risiko.",                link: "https://drive.google.com/file/sni-iso-31000-2018" },
    { judul: "COSO ERM Framework 2017",                                isi: "Kerangka manajemen risiko perusahaan dari Committee of Sponsoring Organizations yang mengintegrasikan strategi, kinerja, dan risiko.",         link: "https://drive.google.com/file/coso-erm-2017" },
  ];
  const [dipelajari, setDipelajari] = useState<boolean[]>(standarList.map(() => false));

  return (
    <div className="flex flex-col gap-4">
      {/* Pedoman Audit */}
      {active === "Pedoman Audit" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700">Pedoman Audit Internal</h4>
            {canEdit && <button onClick={() => setTambahModal("Tambah Pedoman")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Pedoman</button>}
          </div>
          <input value={search} onChange={e => setSearch(e.target.value)}
            placeholder="Cari pedoman..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:border-teal-400" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {pedomanList.map((d, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="flex items-start gap-2">
                  <span className="text-xl flex-shrink-0">{d.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700 leading-tight">{d.judul}</div>
                    <div className="text-[9px] text-gray-400 mt-1 leading-relaxed">{d.deskripsi}</div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
                  <div className="flex gap-1.5">
                    <span className="text-[9px] text-gray-400">{d.versi}</span>
                    <span className="text-[9px] text-gray-300">·</span>
                    <span className="text-[9px] text-gray-400">{d.berlaku}</span>
                  </div>
                  <a href={d.link} target="_blank" rel="noreferrer"
                    className="text-[9px] font-semibold px-2 py-1 rounded border border-teal-200 text-teal-600 hover:bg-teal-50">
                    ↗ Buka Link
                  </a>
                </div>
              </div>
            ))}
          </div>
          {/* Standar Referensi — merged from Standar Audit */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide mb-3">Standar Referensi</div>
            <div className="flex flex-col gap-2">
              {standarList.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700 leading-tight">{s.judul}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{s.isi}</div>
                  </div>
                  <a href={s.link} target="_blank" rel="noreferrer"
                    className="text-[9px] font-semibold px-2 py-1 rounded border border-teal-200 text-teal-600 hover:bg-teal-50 flex-shrink-0">
                    ↗ Buka
                  </a>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Peraturan Internal */}
      {active === "Peraturan Internal" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700">Peraturan Internal & Eksternal</h4>
            <div className="flex items-center gap-2">
              <select value={filterTahun} onChange={e => setFilterTahun(e.target.value)}
                className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none">
                {["Semua","2025","2024","2022","2021","2017","2012"].map(t=><option key={t}>{t}</option>)}
              </select>
              {canEdit && <button onClick={() => setTambahModal("Tambah Peraturan")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>+ Tambah Peraturan</button>}
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {peraturanList.map((r, i) => (
              <div key={i} className="flex flex-col gap-2 p-3 rounded-xl border border-gray-100 hover:shadow-md transition-shadow">
                <div className="text-[10px] font-mono font-semibold text-teal-700 bg-teal-50 px-2 py-1 rounded">{r.nomor}</div>
                <div className="text-xs font-medium text-gray-700 leading-tight">{r.judul}</div>
                <div className="flex items-center justify-between mt-auto pt-1 border-t border-gray-50">
                  <div className="flex gap-1.5 items-center">
                    <span className="text-[9px] text-gray-400">{r.instansi} · {r.terbit}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status === "Berlaku" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-500"}`}>{r.status}</span>
                    {r.link && (
                      <a href={r.link} target="_blank" rel="noreferrer"
                        className="text-[9px] font-semibold px-2 py-0.5 rounded border border-teal-200 text-teal-600 hover:bg-teal-50">
                        ↗ Buka
                      </a>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tambahModal === "Tambah Pedoman" && (
        <TambahFormModal title="Tambah Pedoman / SOP" fields={[
          { key:"judul",    label:"Judul Pedoman / SOP",          type:"text" },
          { key:"deskripsi",label:"Deskripsi Singkat",             type:"textarea" },
          { key:"versi",    label:"Versi",                         type:"text", placeholder:"v1.0" },
          { key:"berlaku",  label:"Berlaku Sejak",                 type:"text", placeholder:"Jan 2025" },
          { key:"link",     label:"Link Dokumen (Google Drive)",   type:"url" },
        ]}
        onSave={(v) => setPedomanBase(prev => [{ icon: "📄", judul: v.judul || "-", deskripsi: v.deskripsi || "-", versi: v.versi || "v1.0", berlaku: v.berlaku || "-", link: v.link || "#" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Peraturan" && (
        <TambahFormModal title="Tambah Peraturan" fields={[
          { key:"nomor",    label:"Nomor Peraturan",               type:"text", placeholder:"Peraturan Rektor No. X/YYYY" },
          { key:"judul",    label:"Judul",                         type:"text" },
          { key:"instansi", label:"Instansi Penerbit",             type:"text" },
          { key:"terbit",   label:"Tahun Terbit",                  type:"text", placeholder:"2025" },
          { key:"status",   label:"Status",                        type:"select", options:["Berlaku","Dicabut"] },
          { key:"link",     label:"Link Dokumen (Google Drive)",   type:"url", required:false },
        ]}
        onSave={(v) => setPeraturanBase(prev => [{ nomor: v.nomor || "-", judul: v.judul || "-", instansi: v.instansi || "-", terbit: v.terbit || "-", status: v.status || "Berlaku", link: v.link || null }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

function SectionF({ subSection }: { subSection: string }) {
  const active = subSection || "Jadwal Rapat";
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const { rapatList, addRapat, batalkanRapat } = useContext(RapatCtx);
  const today = 22;
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const [doneIds, setDoneIds] = useState<number[]>([]);
  const [showRapatForm, setShowRapatForm] = useState(false);

  const rapatMendatang = rapatList.filter(r => r.status === "Terjadwal");

  const events: Record<number, { label: string; color: string }[]> = {
    26: [{ label: "Audit LPPM",     color: "bg-purple-500" }],
    10: [{ label: "Deadline RTL",   color: "bg-red-500" }],
    15: [{ label: "Deadline RTL",   color: "bg-red-500" }],
    18: [{ label: "Deadline RTL",   color: "bg-amber-500" }],
  };

  const siklusData = [
    { unit: "BAAK",              start: 1, dur: 2 },
    { unit: "LPPM",              start: 2, dur: 2 },
    { unit: "Sarpras",           start: 4, dur: 3 },
    { unit: "Keuangan",          start: 5, dur: 3 },
    { unit: "Fak. Teknik",       start: 7, dur: 2 },
    { unit: "Kemahasiswaan",     start: 9, dur: 2 },
  ];
  const ganttData = siklusData.map(d => ({ name: d.unit, mulai: d.start, durasi: d.dur }));

  const reminders = [
    { id: 1, label: "RTL Terlambat — Fakultas Hukum",  deadline: "10 Mei 2025", tag: "Overdue",  prioritas: "Kritis"  },
    { id: 2, label: "RTL Terlambat — LPPM",            deadline: "15 Mei 2025", tag: "Overdue",  prioritas: "Kritis"  },
    { id: 3, label: "RTL Terlambat — Sarpras",         deadline: "18 Mei 2025", tag: "RTL",      prioritas: "Tinggi"  },
    { id: 4, label: "Audit Pendahuluan LPPM",          deadline: "26 Mei 2025", tag: "Audit",    prioritas: "Tinggi"  },
    { id: 5, label: "Koordinasi Program Audit 2025",   deadline: "28 Mei 2025", tag: "Rapat",    prioritas: "Normal"  },
    { id: 6, label: "Pengumpulan PKPT Semester II",    deadline: "30 Jun 2025", tag: "Rencana",  prioritas: "Normal"  },
  ];
  const overdue    = reminders.filter(r => r.tag === "Overdue" && !doneIds.includes(r.id));
  const mendatang  = reminders.filter(r => r.tag !== "Overdue" && !doneIds.includes(r.id));

  const tagColor = (t: string) =>
    t === "Overdue" ? "bg-red-100 text-red-600" : t === "Audit" ? "bg-purple-100 text-purple-600" :
    t === "Rapat"   ? "bg-blue-100 text-blue-600" : t === "RTL" ? "bg-amber-100 text-amber-600" : "bg-gray-100 text-gray-500";
  const priColor = (p: string) =>
    p === "Kritis" ? "text-red-600 bg-red-50" : p === "Tinggi" ? "text-amber-600 bg-amber-50" : "text-gray-500 bg-gray-100";

  return (
    <div className="flex flex-col gap-4">
      {/* Jadwal Rapat */}
      {active === "Jadwal Rapat" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Kalender — Mei 2025</h4>
              <div className="flex gap-2 text-[10px]">
                {[{c:"bg-blue-500",l:"Rapat"},{c:"bg-purple-500",l:"Audit"},{c:"bg-red-500",l:"Deadline"}].map(lg=>(
                  <div key={lg.l} className="flex items-center gap-1"><span className={`w-2 h-2 rounded-full ${lg.c}`}/><span className="text-gray-500">{lg.l}</span></div>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-7 gap-1 mb-1">
              {["Min","Sen","Sel","Rab","Kam","Jum","Sab"].map(d=>(
                <div key={d} className="text-center text-[9px] font-bold text-gray-400 py-1">{d}</div>
              ))}
            </div>
            <div className="grid grid-cols-7 gap-1">
              {Array.from({length:4}).map((_,i)=><div key={`e${i}`}/>)}
              {days.map(d => (
                <div key={d} className={`rounded-lg p-1 min-h-[36px] text-center ${d === today ? "bg-indigo-600" : "hover:bg-gray-50"}`}>
                  <div className={`text-[10px] font-semibold ${d === today ? "text-white" : "text-gray-600"}`}>{d}</div>
                  {events[d]?.map((ev, i) => (
                    <div key={i} className={`w-1.5 h-1.5 rounded-full ${ev.color} mx-auto mt-0.5`} title={ev.label} />
                  ))}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Agenda Mendatang</h4>
              {canEdit && <button onClick={() => setShowRapatForm(v => !v)} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Rapat</button>}
            </div>
            {showRapatForm && (
              <FormTambahRapat
                onSave={r => { addRapat(r); setShowRapatForm(false); }}
                onCancel={() => setShowRapatForm(false)}
              />
            )}
            <div className="flex flex-col gap-2">
              {rapatMendatang.length === 0 && (
                <div className="text-center py-6 text-[10px] text-gray-400">Belum ada agenda mendatang.</div>
              )}
              {rapatMendatang.map((r) => (
                <div key={r.id} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 text-center bg-teal-50 rounded-lg px-2 py-1.5 min-w-[52px]">
                    <div className="text-[10px] text-teal-600 font-bold leading-tight">{r.tgl.split(" ").slice(0,2).join(" ")}</div>
                    <div className="text-[9px] text-teal-400">{r.jam}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700">{r.judul}</div>
                    <div className="text-[10px] text-gray-400">{r.tempat} · {pesertaLabel(r.peserta)}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Detail</button>
                    {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Edit</button>}
                    {canEdit && <button onClick={() => batalkanRapat(r.id)} className="text-[9px] px-2 py-1 rounded border border-red-100 text-red-500 hover:bg-red-50">Batalkan</button>}
                  </div>
                </div>
              ))}
            </div>
          </div>
          {/* Deadline & Reminder — merged into Jadwal Rapat */}
          {overdue.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-red-600 mb-3">🔴 Overdue ({overdue.length})</h4>
              <div className="flex flex-col gap-2">
                {overdue.map(r => (
                  <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl border-l-4 border-red-400 bg-red-50">
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-700">{r.label}</div>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <span className="text-[9px] text-gray-400">{r.deadline}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tagColor(r.tag)}`}>{r.tag}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${priColor(r.prioritas)}`}>{r.prioritas}</span>
                      </div>
                    </div>
                    {canEdit && <button onClick={() => setDoneIds(prev => [...prev, r.id])}
                      className="text-[9px] font-semibold px-2 py-1 rounded border border-green-200 text-green-600 hover:bg-green-50 flex-shrink-0">Tandai Selesai</button>}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">📅 Deadline Mendatang ({mendatang.length})</h4>
            <div className="flex flex-col gap-2">
              {mendatang.map(r => (
                <div key={r.id} className="flex items-center gap-3 p-2.5 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700">{r.label}</div>
                    <div className="flex items-center gap-1.5 mt-0.5">
                      <span className="text-[9px] text-gray-400">{r.deadline}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${tagColor(r.tag)}`}>{r.tag}</span>
                      <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${priColor(r.prioritas)}`}>{r.prioritas}</span>
                    </div>
                  </div>
                  {canEdit && <button onClick={() => setDoneIds(prev => [...prev, r.id])}
                    className="text-[9px] font-semibold px-2 py-1 rounded border border-gray-200 text-gray-600 hover:bg-gray-100 flex-shrink-0">Tandai Selesai</button>}
                </div>
              ))}
              {mendatang.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Semua deadline selesai 🎉</p>}
            </div>
            {doneIds.length > 0 && (
              <div className="text-center mt-2">
                <button onClick={() => setDoneIds([])} className="text-[10px] text-gray-400 hover:text-gray-600 underline">Reset semua ({doneIds.length} selesai)</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Siklus Audit */}
      {active === "Siklus Audit" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <h4 className="text-xs font-bold text-gray-700 mb-1">Siklus Audit Tahunan 2025 — Timeline per Unit</h4>
          <p className="text-[10px] text-gray-400 mb-3">Setiap bar menunjukkan periode pelaksanaan audit (dalam bulan)</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={ganttData} layout="vertical" margin={{ top: 4, right: 16, left: 72, bottom: 4 }} barSize={18}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
              <XAxis type="number" domain={[0, 12]} tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => ["","Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"][v] || ""} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 10, fill: "#374151" }} axisLine={false} tickLine={false} width={68} />
              <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }}
                formatter={(v: unknown, name: unknown) => [name === "mulai" ? `Mulai bulan ke-${v}` : `${v} bulan`, name === "mulai" ? "Mulai" : "Durasi"]} />
              <Bar dataKey="mulai" stackId="a" fill="transparent" radius={0} />
              <Bar dataKey="durasi" stackId="a" fill="var(--tsu-teal)" radius={[4,4,4,4]} />
            </BarChart>
          </ResponsiveContainer>
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-3 gap-2">
            {siklusData.map((d, i) => (
              <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-xs">
                <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "var(--tsu-teal)" }} />
                <span className="font-medium text-gray-700">{d.unit}</span>
                <span className="text-gray-400 ml-auto">{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"][d.start - 1]}–{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"][d.start + d.dur - 2]}</span>
              </div>
            ))}
          </div>
        </div>
      )}

    </div>
  );
}

function TabBackoffice({ section, subSection }: { section: string; subSection: string }) {
  return (
    <div className="flex flex-col gap-4">
      {section === "R" && <SectionRingkasan />}
      {section === "A" && <SectionA subSection={subSection} />}
      {section === "B" && <SectionB subSection={subSection} />}
      {section === "C" && <SectionC subSection={subSection} />}
      {section === "D" && <SectionD subSection={subSection} />}
      {section === "F" && <SectionF subSection={subSection} />}
      {section === "G" && <SectionG subSection={subSection} />}
    </div>
  );
}

function SectionG({ subSection }: { subSection: string }) {
  const active = subSection || "Rencana Anggaran";
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const [catatan, setCatatan] = useState("Realisasi anggaran berjalan sesuai rencana. Komponen lain-lain perlu evaluasi karena penyerapan masih rendah.");
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [laporanLinks, setLaporanLinks] = useState([
    { label: "Laporan Excel Semester I",   icon: "📊", link: "https://docs.google.com/spreadsheets/d/laporan-keuangan-s1-2025", color: "border-green-200 text-green-700 hover:bg-green-50" },
    { label: "Laporan PDF Semester II",    icon: "📄", link: "https://drive.google.com/file/laporan-pdf-s2-2024",              color: "border-red-200 text-red-600 hover:bg-red-50"      },
    { label: "Ringkasan Anggaran Tahunan", icon: "📋", link: "https://docs.google.com/spreadsheets/d/ringkasan-anggaran-2025",  color: "border-blue-200 text-blue-600 hover:bg-blue-50"   },
  ]);

  const komponenAnggaran = [
    { komponen: "Honorarium", rencana: 55, realisasi: 48 },
    { komponen: "Perj. Dinas", rencana: 40, realisasi: 32 },
    { komponen: "ATK & Cetak", rencana: 25, realisasi: 22 },
    { komponen: "Konsumsi",    rencana: 30, realisasi: 28 },
    { komponen: "Lain-lain",   rencana: 35, realisasi: 12 },
  ];

  const [rencanaDetail, setRencanaDetail] = useState([
    { no: 1, komponen: "Honorarium",    sub: "Honor Ketua Tim Audit",      jumlah: 24.0, sumber: "DIPA",     status: "Disetujui" },
    { no: 2, komponen: "Honorarium",    sub: "Honor Anggota Tim Audit",    jumlah: 31.0, sumber: "DIPA",     status: "Disetujui" },
    { no: 3, komponen: "Perj. Dinas",   sub: "Transport Audit Lapangan",   jumlah: 25.0, sumber: "DIPA",     status: "Disetujui" },
    { no: 4, komponen: "Perj. Dinas",   sub: "Akomodasi Audit Luar Kota",  jumlah: 15.0, sumber: "DIPA",     status: "Revisi"    },
    { no: 5, komponen: "ATK & Cetak",   sub: "Alat Tulis Kantor",          jumlah: 10.0, sumber: "Internal", status: "Disetujui" },
    { no: 6, komponen: "ATK & Cetak",   sub: "Cetak Laporan & Formulir",   jumlah: 15.0, sumber: "Internal", status: "Draft"     },
    { no: 7, komponen: "Konsumsi",      sub: "Konsumsi Rapat Internal",    jumlah: 12.0, sumber: "Internal", status: "Disetujui" },
    { no: 8, komponen: "Konsumsi",      sub: "Konsumsi Exit Meeting",      jumlah: 18.0, sumber: "DIPA",     status: "Draft"     },
    { no: 9, komponen: "Lain-lain",     sub: "Biaya Pelatihan Eksternal",  jumlah: 20.0, sumber: "DIPA",     status: "Revisi"    },
    { no:10, komponen: "Lain-lain",     sub: "Langganan Aplikasi Audit",   jumlah: 15.0, sumber: "Internal", status: "Disetujui" },
  ]);
  const totalRencana = rencanaDetail.reduce((s, d) => s + d.jumlah, 0);

  const realisasiDetail = komponenAnggaran.map(k => {
    const selisih = k.realisasi - k.rencana;
    const pct = Math.round((k.realisasi / k.rencana) * 100);
    return { ...k, selisih, pct, status: pct >= 95 ? "Sesuai" : pct >= 70 ? "Kurang" : "Jauh" };
  });

  const semesterData = [
    { semester: "Sem I 2024",  rencana: 92.0,  realisasi: 78.5,  pct: 85,  status: "Baik"     },
    { semester: "Sem II 2024", rencana: 93.0,  realisasi: 88.2,  pct: 95,  status: "Baik"     },
    { semester: "Sem I 2025",  rencana: 185.0, realisasi: 142.0, pct: 77,  status: "Perhatian"},
  ];

  return (
    <div className="flex flex-col gap-4">
      {/* Rencana Anggaran */}
      {active === "Rencana Anggaran" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">📊 Rencana vs Realisasi per Komponen</h4>
              <div className="flex gap-3">
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm bg-slate-300"/><span className="text-[8px] text-gray-400">Rencana</span></div>
                <div className="flex items-center gap-1"><span className="w-2 h-2 rounded-sm" style={{background:"var(--tsu-teal)"}}/><span className="text-[8px] text-gray-400">Realisasi</span></div>
              </div>
            </div>
            <ResponsiveContainer width="100%" height={160}>
              <BarChart data={komponenAnggaran} barSize={14} barGap={3} margin={{ top: 4, right: 4, left: -12, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="komponen" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" Jt" />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={(v: unknown, name: unknown) => [`Rp ${v} Jt`, name === "rencana" ? "Rencana" : "Realisasi"]} />
                <Bar dataKey="rencana"   fill="#cbd5e1" radius={[3,3,0,0]} />
                <Bar dataKey="realisasi" fill="var(--tsu-teal)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <div>
                <h4 className="text-xs font-bold text-gray-700">Detail Rencana Anggaran 2025</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Total Rencana: <span className="font-bold text-gray-700">Rp {totalRencana.toFixed(1)} Jt</span></p>
              </div>
              {canEdit && <button onClick={() => setTambahModal("Tambah Komponen Anggaran")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Komponen</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["No","Komponen","Sub-Komponen","Jumlah (Rp Jt)","Sumber Dana","Status","Aksi"].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rencanaDetail.map(r => (
                    <tr key={r.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] text-gray-400">{r.no}</td>
                      <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{r.komponen}</td>
                      <td className="py-2 pr-3 text-gray-600">{r.sub}</td>
                      <td className="py-2 pr-3 font-semibold text-gray-700">{r.jumlah.toFixed(1)}</td>
                      <td className="py-2 pr-3 text-gray-500">{r.sumber}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status === "Disetujui" ? "bg-green-50 text-green-600" : r.status === "Revisi" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>{r.status}</span></td>
                      <td className="py-2"><div className="flex gap-1">
                        {canEdit && <button className="text-[9px] px-2 py-1 rounded border border-gray-200 hover:bg-gray-50 text-gray-600">Edit</button>}
                        {canEdit && <button onClick={() => setRencanaDetail(prev => prev.filter(x => x.no !== r.no))} className="text-[9px] px-2 py-1 rounded border border-red-100 hover:bg-red-50 text-red-500">Hapus</button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Realisasi Anggaran */}
      {active === "Realisasi Anggaran" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">📈 Tren Realisasi vs Rencana (Rp Jt)</h4>
            <ResponsiveContainer width="100%" height={160}>
              <AreaChart data={anggaranTrend} margin={{ top: 4, right: 4, left: -16, bottom: 0 }}>
                <defs>
                  <linearGradient id="gradRencanaG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#94a3b8" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#94a3b8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gradRealisasiG" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#0e8080" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#0e8080" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="bulan" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit=" Jt" />
                <Tooltip contentStyle={{ fontSize: 10, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.08)" }} formatter={((v: unknown, name: unknown) => [`Rp ${v} Jt`, name === "rencana" ? "Rencana" : "Realisasi"]) as never} />
                <Area type="monotone" dataKey="rencana" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" fill="url(#gradRencanaG)" />
                <Area type="monotone" dataKey="realisasi" stroke="var(--tsu-teal)" strokeWidth={2.5} fill="url(#gradRealisasiG)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Realisasi vs Rencana per Komponen</h4>
              {canEdit && <button onClick={() => setTambahModal("Tambah Komponen Realisasi")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Komponen</button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["Komponen","Rencana (Rp Jt)","Realisasi (Rp Jt)","Selisih (Rp Jt)","%","Status"].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-4 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {realisasiDetail.map((r, i) => (
                    <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-4 font-medium text-gray-700">{r.komponen}</td>
                      <td className="py-2 pr-4 text-gray-600">{r.rencana.toFixed(1)}</td>
                      <td className="py-2 pr-4 font-semibold" style={{ color: "var(--tsu-teal)" }}>{r.realisasi.toFixed(1)}</td>
                      <td className={`py-2 pr-4 font-bold ${r.selisih < 0 ? "text-red-500" : "text-green-600"}`}>{r.selisih > 0 ? "+" : ""}{r.selisih.toFixed(1)}</td>
                      <td className="py-2 pr-4">
                        <div className="flex items-center gap-1.5">
                          <div className="w-12 bg-gray-100 rounded-full h-1.5">
                            <div className="h-1.5 rounded-full" style={{ width: `${Math.min(r.pct, 100)}%`, background: r.pct >= 95 ? "#22c55e" : r.pct >= 70 ? "#f59e0b" : "#ef4444" }} />
                          </div>
                          <span className="text-[10px] text-gray-600">{r.pct}%</span>
                        </div>
                      </td>
                      <td className="py-2"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status === "Sesuai" ? "bg-green-50 text-green-600" : r.status === "Kurang" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600"}`}>{r.status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Laporan Keuangan */}
      {active === "Laporan Keuangan" && (
        <div className="flex flex-col gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-700 mb-3">Ringkasan Anggaran per Semester</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-100">
                      {["Semester","Rencana (Jt)","Realisasi (Jt)","%","Status"].map(h=>(
                        <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {semesterData.map((s, i) => (
                      <tr key={i} className="border-b border-gray-50 last:border-0">
                        <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{s.semester}</td>
                        <td className="py-2 pr-3 text-gray-600">{s.rencana.toFixed(1)}</td>
                        <td className="py-2 pr-3 font-semibold" style={{ color: "var(--tsu-teal)" }}>{s.realisasi.toFixed(1)}</td>
                        <td className="py-2 pr-3 font-bold text-gray-700">{s.pct}%</td>
                        <td className="py-2"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${s.status === "Baik" ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>{s.status}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-50 text-[10px] text-gray-400">
                Diperbarui: 22 Mei 2025 · Sumber: Sistem Keuangan Universitas
              </div>
            </div>
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-bold text-gray-700">Link Laporan Keuangan</h4>
                  <p className="text-[10px] text-gray-400 mt-0.5">Akses laporan yang tersimpan di Google Drive / Sheets</p>
                </div>
                {canEdit && <button onClick={() => setTambahModal("Tambah Link Laporan")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>+ Tambah Laporan</button>}
              </div>
              <div className="flex flex-col gap-2">
                {laporanLinks.map(b => (
                  <a key={b.label} href={b.link} target="_blank" rel="noreferrer"
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${b.color}`}>
                    <span>{b.icon}</span>{b.label}
                    <span className="ml-auto text-[9px] opacity-60">↗ Buka</span>
                  </a>
                ))}
              </div>
              <div className="mt-1">
                <label className="text-[10px] font-semibold text-gray-500 block mb-1">Catatan Keuangan</label>
                <textarea value={catatan} onChange={e => setCatatan(e.target.value)} rows={4}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 resize-none focus:outline-none focus:border-teal-400" />
                <div className="text-[9px] text-gray-400 mt-1">Terakhir disimpan: 22 Mei 2025, 10.42 WIB</div>
              </div>
            </div>
          </div>
        </div>
      )}
      {tambahModal === "Tambah Komponen Anggaran" && (
        <TambahFormModal title="Tambah Komponen Anggaran" fields={[
          { key:"komponen", label:"Komponen",          type:"text" },
          { key:"sub",      label:"Sub-Komponen",      type:"text" },
          { key:"jumlah",   label:"Jumlah (Rp Jt)",    type:"text", placeholder:"0.0" },
          { key:"sumber",   label:"Sumber Dana",       type:"select", options:["DIPA","BOPTN","PNBP","Dana Mandiri"] },
        ]}
        onSave={(v) => setRencanaDetail(prev => [{ no: prev.length + 1, komponen: v.komponen || "-", sub: v.sub || "-", jumlah: parseFloat(v.jumlah) || 0, sumber: v.sumber || "DIPA", status: "Draft" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Komponen Realisasi" && (
        <TambahFormModal title="Tambah Komponen Realisasi" fields={[
          { key:"komponen", label:"Komponen",          type:"text" },
          { key:"sub",      label:"Sub-Komponen",      type:"text" },
          { key:"jumlah",   label:"Jumlah Realisasi (Rp Jt)", type:"text", placeholder:"0.0" },
          { key:"sumber",   label:"Sumber Dana",       type:"select", options:["DIPA","BOPTN","PNBP","Dana Mandiri"] },
          { key:"link",     label:"Link Dokumen Pendukung (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setLaporanLinks(prev => [{ label: `${v.komponen || "Komponen"} — ${v.sub || ""}`.trim().replace(/—\s*$/, ""), icon: "📊", link: v.link || "#", color: "border-teal-200 text-teal-700 hover:bg-teal-50" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Link Laporan" && (
        <TambahFormModal title="Tambah Laporan Keuangan" fields={[
          { key:"label",   label:"Nama Laporan",                       type:"text",   placeholder:"Laporan Excel Semester I 2025" },
          { key:"format",  label:"Format",                             type:"select", options:["📊 Excel / Sheets","📄 PDF","📋 Ringkasan"] },
          { key:"semester",label:"Periode / Semester",                 type:"text",   placeholder:"Sem I 2025" },
          { key:"link",    label:"Link Laporan (Google Sheets / Drive)",type:"url" },
        ]}
        onSave={(v) => {
          const icon = v.format?.startsWith("📊") ? "📊" : v.format?.startsWith("📄") ? "📄" : "📋";
          setLaporanLinks(prev => [{ label: `${v.label || "Laporan"} ${v.semester || ""}`.trim(), icon, link: v.link || "#", color: "border-teal-200 text-teal-700 hover:bg-teal-50" }, ...prev]);
        }}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

function IndeksKomposit() {
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-wrap items-center gap-4" style={{ borderLeft: "4px solid var(--tsu-teal)" }}>
      {[
        { label: "Kepatuhan",             val: "85,2%" },
        { label: "Pengendalian Internal", val: "82,7%" },
        { label: "Manajemen Risiko",      val: "78,4%" },
        { label: "Efektivitas RTL",       val: "83,1%" },
      ].map((m) => (
        <div key={m.label} className="flex items-center gap-2 flex-1 min-w-[100px]">
          <div className="flex-1">
            <div className="text-[10px] text-gray-400">{m.label}</div>
            <div className="text-lg font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--tsu-teal)" }}>{m.val}</div>
          </div>
        </div>
      ))}
      <div className="border-l border-gray-100 pl-4 text-center flex-shrink-0">
        <div className="text-[10px] font-bold" style={{ color: "var(--tsu-teal-dark)" }}>Indeks Komposit</div>
        <div className="text-2xl font-black" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--tsu-gold)" }}>82,4%</div>
        <div className="text-xs font-semibold" style={{ color: "var(--tsu-teal)" }}>Baik</div>
      </div>
    </div>
  );
}

// ── Pengaturan Sistem ─────────────────────────────────────────────────────────

const DEMO_USERS_EXT = [
  { id:1, nama:"Setiyowati, S.Kom., M.Kom.", email:"ketua@spi.tsu.ac.id",       role:"full",       unit:"—",       jabatan:"Ketua SPI",           aktif:true },
  { id:2, nama:"Budi Santoso, S.E.",         email:"auditor@spi.tsu.ac.id",     role:"pengawasan", unit:"—",       jabatan:"Auditor Internal",    aktif:true },
  { id:3, nama:"Dewi Rahayu, A.Md.",         email:"backoffice@spi.tsu.ac.id",  role:"backoffice", unit:"—",       jabatan:"Staff Back Office",   aktif:true },
  { id:4, nama:"Ahmad Fauzi, S.Pd.",         email:"baak@auditee.tsu.ac.id",    role:"auditee",    unit:"BAAK",    jabatan:"Kabag BAAK",          aktif:true },
  { id:5, nama:"Rina Kusuma, S.E.",          email:"keuangan@auditee.tsu.ac.id",role:"auditee",    unit:"Keuangan",jabatan:"Kabag Keuangan",      aktif:true },
  { id:6, nama:"Hendra Wijaya, S.T.",        email:"sarpras@auditee.tsu.ac.id", role:"auditee",    unit:"Sarpras", jabatan:"Kabag Sarpras",       aktif:true },
  { id:7, nama:"Siti Nurhaliza, M.Pd.",      email:"akademik@auditee.tsu.ac.id",role:"auditee",    unit:"Akademik",jabatan:"Kabag Akademik",      aktif:false },
];

const ROLE_LABEL_MAP: Record<string,string> = {
  full:"Akses Penuh", pengawasan:"Pengawasan", backoffice:"Back Office", auditee:"Auditee",
};

const NOTIF_PREFS_DEFAULT: Record<string, Record<string,boolean>> = {
  full: {
    "Deadline RTL hampir tiba (≤ 7 hari)": true,
    "RTL menunggu verifikasi auditee": true,
    "Audit berjalan tertinggal (progres < 50%)": true,
    "Rapat hari ini / besok": true,
    "Rekomendasi baru dari audit selesai": true,
    "Laporan audit siap ditinjau": true,
  },
  pengawasan: {
    "Deadline RTL hampir tiba (≤ 7 hari)": true,
    "RTL menunggu verifikasi auditee": true,
    "Audit berjalan tertinggal (progres < 50%)": true,
    "Rapat hari ini / besok": true,
    "Rekomendasi baru dari audit selesai": true,
    "Laporan audit siap ditinjau": true,
  },
  backoffice: {
    "Rapat hari ini / besok": true,
    "Deadline administrasi (surat, arsip)": true,
    "Pengingat siklus audit mendekati jadwal": true,
    "Anggaran mendekati batas realisasi": false,
  },
  auditee: {
    "Deadline tindak lanjut (RTL) hampir tiba": true,
    "Rekomendasi baru masuk ke unit": true,
    "Rapat yang melibatkan unit Anda": true,
    "Pengingat RTL yang belum ada progres": true,
    "Status verifikasi RTL (diterima / ditolak)": true,
  },
};

function PengaturanSistem({ user, onClose }: { user: User; onClose: () => void }) {
  const tabs = [
    { id:"profil", label:"👤 Profil & Akun" },
    ...(user.role === "full" ? [
      { id:"users",  label:"👥 Manajemen User" },
      { id:"config", label:"⚙️ Konfigurasi Sistem" },
    ] : []),
    { id:"notif", label:"🔔 Preferensi Notifikasi" },
  ];

  const [tab, setTab] = useState("profil");

  // Profil
  const [namaEdit, setNamaEdit]         = useState(user.name);
  const [emailEdit, setEmailEdit]       = useState(user.email);
  const [pwLama, setPwLama]             = useState("");
  const [pwBaru, setPwBaru]             = useState("");
  const [pwKonfirmasi, setPwKonfirmasi] = useState("");
  const [profilSaved, setProfilSaved]   = useState(false);
  const [pwSaved, setPwSaved]           = useState(false);
  const [prefSaved, setPrefSaved]       = useState(false);

  function saveProfilHandler() {
    setProfilSaved(true);
    setTimeout(() => setProfilSaved(false), 2000);
  }

  // Manajemen User
  const [userList, setUserList]           = useState(DEMO_USERS_EXT);
  const [showAddForm, setShowAddForm]     = useState(false);
  const [userFilter, setUserFilter]       = useState("semua");
  const [newUser, setNewUser]             = useState({ nama:"", email:"", role:"auditee", unit:"", jabatan:"" });

  const filteredUsers = userFilter === "semua" ? userList : userList.filter(u => u.role === userFilter);

  function toggleAktif(id: number) {
    setUserList(prev => prev.map(u => u.id === id ? { ...u, aktif: !u.aktif } : u));
  }
  function addUserHandler() {
    if (!newUser.nama || !newUser.email) return;
    setUserList(prev => [...prev, { ...newUser, id: prev.length + 1, aktif: true }]);
    setNewUser({ nama:"", email:"", role:"auditee", unit:"", jabatan:"" });
    setShowAddForm(false);
  }

  // Konfigurasi
  const [namaSystem, setNamaSystem]       = useState("SIMSPI TSU");
  const [namaInstitusi, setNamaInstitusi] = useState("Universitas Tiga Serangkai");
  const [tahunAnggaran, setTahunAnggaran] = useState("2026");
  const [periodeAudit, setPeriodeAudit]   = useState("2026");
  const [configSaved, setConfigSaved]     = useState(false);

  function saveConfigHandler() {
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }

  // Notifikasi
  const [notifPrefs, setNotifPrefs] = useState<Record<string,boolean>>(
    NOTIF_PREFS_DEFAULT[user.role] ?? {}
  );
  function toggleNotif(key: string) {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background:"rgba(15,23,42,0.65)", backdropFilter:"blur(6px)" }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full flex overflow-hidden"
        style={{ maxWidth:"900px", height:"min(90vh,640px)" }}>

        {/* Sidebar kiri */}
        <div className="w-56 flex-shrink-0 flex flex-col border-r border-white/10"
          style={{ background:"linear-gradient(180deg,var(--tsu-teal-dark) 0%,var(--tsu-teal) 100%)" }}>
          <div className="px-4 py-5 border-b border-white/10">
            <div className="text-sm font-black text-white">⚙️ Pengaturan</div>
            <div className="text-[10px] text-white/60 mt-0.5">SIMSPI TSU</div>
          </div>
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${user.avatarColor}`}>
                {user.initials}
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-white truncate">{user.name.split(",")[0]}</div>
                <div className="text-[9px] text-white/60">{user.jabatan}</div>
              </div>
            </div>
          </div>
          <nav className="flex-1 px-2 py-3 flex flex-col gap-0.5">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-semibold transition-all ${
                  tab === t.id ? "bg-white/20 text-white" : "text-white/70 hover:bg-white/10 hover:text-white"
                }`}>
                {t.label}
              </button>
            ))}
          </nav>
          <div className="px-4 py-4 border-t border-white/10">
            <button onClick={onClose}
              className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-lg text-xs font-semibold text-white/80 hover:bg-white/10 transition-colors">
              ✕ Tutup
            </button>
          </div>
        </div>

        {/* Konten kanan */}
        <div className="flex-1 overflow-y-auto">

          {/* ── Profil & Akun ── */}
          {tab === "profil" && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-base font-black text-gray-800">Profil & Akun</h2>
                <p className="text-xs text-gray-400 mt-0.5">Informasi akun dan kredensial login Anda</p>
              </div>

              <div className="flex items-center gap-4">
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white ${user.avatarColor}`}>
                  {user.initials}
                </div>
                <div>
                  <button className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                    Ganti Foto
                  </button>
                  <p className="text-[10px] text-gray-400 mt-1">JPG, PNG — maks 2 MB</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Lengkap</label>
                  <input value={namaEdit} onChange={e => setNamaEdit(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">
                    Email
                    {user.role === "auditee" && (
                      <span className="ml-1 text-[9px] text-orange-500 font-normal">(dikunci oleh admin)</span>
                    )}
                  </label>
                  <input value={emailEdit} onChange={e => setEmailEdit(e.target.value)}
                    disabled={user.role === "auditee"}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all disabled:bg-gray-50 disabled:text-gray-400 disabled:cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Jabatan</label>
                  <input value={user.jabatan} disabled
                    className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit Kerja</label>
                  <input value={user.unit ?? "—"} disabled
                    className="w-full border border-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400 bg-gray-50 cursor-not-allowed" />
                </div>
              </div>

              <div className="flex justify-end">
                <button onClick={saveProfilHandler}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                  style={{ background:"linear-gradient(135deg,var(--tsu-teal-dark),var(--tsu-teal))" }}>
                  {profilSaved ? "✓ Tersimpan" : "Simpan Perubahan"}
                </button>
              </div>

              <hr className="border-gray-100" />

              <div>
                <h3 className="text-sm font-bold text-gray-800 mb-3">Ganti Password</h3>
                <div className="flex flex-col gap-3 max-w-sm">
                  {[
                    { label:"Password Lama", val:pwLama, set:setPwLama, ph:"••••••••" },
                    { label:"Password Baru", val:pwBaru, set:setPwBaru, ph:"Min. 8 karakter" },
                    { label:"Konfirmasi Password Baru", val:pwKonfirmasi, set:setPwKonfirmasi, ph:"Ulangi password baru" },
                  ].map(({ label, val, set, ph }) => (
                    <div key={label}>
                      <label className="block text-xs font-semibold text-gray-600 mb-1.5">{label}</label>
                      <input type="password" value={val} onChange={e => set(e.target.value)} placeholder={ph}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
                    </div>
                  ))}
                  {pwBaru && pwKonfirmasi && pwBaru !== pwKonfirmasi && (
                    <p className="text-[10px] text-red-500">Password baru tidak cocok.</p>
                  )}
                  <button onClick={() => {
                    if (pwBaru && pwBaru === pwKonfirmasi) {
                      setPwSaved(true); setPwLama(""); setPwBaru(""); setPwKonfirmasi("");
                      setTimeout(() => setPwSaved(false), 2500);
                    }
                  }} disabled={!pwLama || !pwBaru || pwBaru !== pwKonfirmasi}
                    className="text-xs font-bold px-4 py-2 rounded-xl bg-gray-800 text-white hover:bg-gray-700 transition-colors w-fit disabled:opacity-40">
                    {pwSaved ? "✓ Password diubah" : "Ubah Password"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ── Manajemen User ── */}
          {tab === "users" && user.role === "full" && (
            <div className="p-6 flex flex-col gap-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-base font-black text-gray-800">Manajemen User</h2>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {userList.length} akun terdaftar · {userList.filter(u => u.aktif).length} aktif
                  </p>
                </div>
                <button onClick={() => setShowAddForm(v => !v)}
                  className="text-xs font-bold px-3 py-2 rounded-xl text-white flex-shrink-0 hover:opacity-90 transition-all"
                  style={{ background:"linear-gradient(135deg,var(--tsu-teal-dark),var(--tsu-teal))" }}>
                  + Tambah User
                </button>
              </div>

              {showAddForm && (
                <div className="border border-teal-200 rounded-xl p-4 bg-teal-50 flex flex-col gap-3">
                  <div className="text-xs font-bold text-teal-800">Form Tambah User Baru</div>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { label:"Nama Lengkap *", key:"nama", ph:"Nama + gelar" },
                      { label:"Email *",         key:"email", ph:"email@tsu.ac.id" },
                      { label:"Jabatan",         key:"jabatan", ph:"Misal: Auditor Internal" },
                    ].map(({ label, key, ph }) => (
                      <div key={key}>
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">{label}</label>
                        <input value={(newUser as Record<string,string>)[key]}
                          onChange={e => setNewUser(p => ({ ...p, [key]: e.target.value }))}
                          placeholder={ph}
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400 transition-all" />
                      </div>
                    ))}
                    <div>
                      <label className="block text-[10px] font-semibold text-gray-600 mb-1">Role *</label>
                      <select value={newUser.role} onChange={e => setNewUser(p => ({ ...p, role: e.target.value }))}
                        className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-teal-400 transition-all">
                        <option value="pengawasan">Pengawasan</option>
                        <option value="backoffice">Back Office</option>
                        <option value="auditee">Auditee</option>
                      </select>
                    </div>
                    {newUser.role === "auditee" && (
                      <div className="col-span-2">
                        <label className="block text-[10px] font-semibold text-gray-600 mb-1">Unit Kerja *</label>
                        <input value={newUser.unit} onChange={e => setNewUser(p => ({ ...p, unit: e.target.value }))}
                          placeholder="Misal: BAAK, Keuangan, Sarpras..."
                          className="w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400 transition-all" />
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <button onClick={addUserHandler}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white"
                      style={{ background:"var(--tsu-teal)" }}>
                      Tambahkan
                    </button>
                    <button onClick={() => setShowAddForm(false)}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                      Batal
                    </button>
                  </div>
                </div>
              )}

              <div className="flex gap-1 flex-wrap">
                {["semua","full","pengawasan","backoffice","auditee"].map(f => (
                  <button key={f} onClick={() => setUserFilter(f)}
                    className={`text-[10px] font-semibold px-2.5 py-1 rounded-full transition-all ${
                      userFilter === f ? "text-white" : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                    }`}
                    style={userFilter === f ? { background:"var(--tsu-teal)" } : {}}>
                    {f === "semua" ? "Semua" : ROLE_LABEL_MAP[f]}
                  </button>
                ))}
              </div>

              <div className="border border-gray-100 rounded-xl overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["Nama & Email","Role","Unit","Status","Aksi"].map(h => (
                        <th key={h} className="text-left px-4 py-2.5 font-semibold text-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u.id} className={`border-b border-gray-50 transition-colors ${u.aktif ? "hover:bg-gray-50" : "opacity-50 bg-gray-50/60"}`}>
                        <td className="px-4 py-3">
                          <div className="font-semibold text-gray-800">{u.nama}</div>
                          <div className="text-[10px] text-gray-400">{u.email}</div>
                        </td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            u.role === "full"       ? "bg-orange-50 text-orange-600" :
                            u.role === "pengawasan" ? "bg-teal-50 text-teal-700" :
                            u.role === "backoffice" ? "bg-amber-50 text-amber-700" :
                            "bg-purple-50 text-purple-700"
                          }`}>{ROLE_LABEL_MAP[u.role]}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.unit || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            u.aktif ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                          }`}>{u.aktif ? "Aktif" : "Nonaktif"}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <button className="text-[9px] font-semibold px-2 py-1 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-600">
                              Edit
                            </button>
                            <button onClick={() => toggleAktif(u.id)}
                              className={`text-[9px] font-semibold px-2 py-1 rounded-lg border transition-colors ${
                                u.aktif
                                  ? "border-red-100 text-red-500 hover:bg-red-50"
                                  : "border-green-100 text-green-600 hover:bg-green-50"
                              }`}>
                              {u.aktif ? "Nonaktifkan" : "Aktifkan"}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ── Konfigurasi Sistem ── */}
          {tab === "config" && user.role === "full" && (
            <div className="p-6 flex flex-col gap-6">
              <div>
                <h2 className="text-base font-black text-gray-800">Konfigurasi Sistem</h2>
                <p className="text-xs text-gray-400 mt-0.5">Pengaturan global yang berlaku untuk semua pengguna</p>
              </div>

              <div className="flex flex-col gap-4 max-w-lg">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Sistem</label>
                  <input value={namaSystem} onChange={e => setNamaSystem(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Nama Institusi</label>
                  <input value={namaInstitusi} onChange={e => setNamaInstitusi(e.target.value)}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Tahun Anggaran Aktif</label>
                    <select value={tahunAnggaran} onChange={e => setTahunAnggaran(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 transition-all">
                      {["2024","2025","2026","2027"].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1.5">Periode Audit Aktif</label>
                    <select value={periodeAudit} onChange={e => setPeriodeAudit(e.target.value)}
                      className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:border-teal-400 transition-all">
                      {["2024","2025","2026","2027"].map(y => <option key={y}>{y}</option>)}
                    </select>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Logo Institusi</label>
                  <div onClick={() => (document.getElementById("logo-upload-input") as HTMLInputElement)?.click()}
                    className="border-2 border-dashed border-gray-200 rounded-xl p-6 flex flex-col items-center gap-2 hover:border-teal-300 transition-colors cursor-pointer">
                    <input id="logo-upload-input" type="file" accept="image/png,image/svg+xml" className="hidden"
                      onChange={e => { if (e.target.files?.[0]) { alert(`Logo "${e.target.files[0].name}" berhasil diunggah.`); e.target.value = ""; } }} />
                    <div className="text-2xl">🖼️</div>
                    <div className="text-xs text-gray-400">Klik untuk unggah logo</div>
                    <div className="text-[10px] text-gray-300">PNG, SVG — maks 1 MB</div>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button onClick={saveConfigHandler}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                  style={{ background:"linear-gradient(135deg,var(--tsu-teal-dark),var(--tsu-teal))" }}>
                  {configSaved ? "✓ Konfigurasi Tersimpan" : "Simpan Konfigurasi"}
                </button>
              </div>

              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 max-w-lg">
                <div className="text-xs font-bold text-amber-800 mb-1">ℹ️ Catatan Level 1</div>
                <p className="text-[10px] text-amber-700 leading-relaxed">
                  Perubahan konfigurasi belum tersimpan ke database. Akan berlaku permanen setelah backend terhubung (Level 2).
                </p>
              </div>
            </div>
          )}

          {/* ── Preferensi Notifikasi ── */}
          {tab === "notif" && (
            <div className="p-6 flex flex-col gap-5">
              <div>
                <h2 className="text-base font-black text-gray-800">Preferensi Notifikasi</h2>
                <p className="text-xs text-gray-400 mt-0.5">Atur jenis notifikasi yang ingin Anda terima</p>
              </div>

              <div className="flex flex-col gap-2">
                {Object.entries(notifPrefs).map(([key, val]) => (
                  <div key={key} className="flex items-center justify-between px-4 py-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                    <span className="text-xs font-semibold text-gray-700">{key}</span>
                    <button onClick={() => toggleNotif(key)}
                      className={`relative w-10 h-5 rounded-full transition-all flex-shrink-0 ${val ? "bg-teal-500" : "bg-gray-200"}`}>
                      <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow-sm transition-all ${val ? "left-5" : "left-0.5"}`} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <button onClick={() => { setPrefSaved(true); setTimeout(() => setPrefSaved(false), 2000); }}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                  style={{ background:"linear-gradient(135deg,var(--tsu-teal-dark),var(--tsu-teal))" }}>
                  {prefSaved ? "✓ Preferensi disimpan" : "Simpan Preferensi"}
                </button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  );
}

// ── Rektor Executive Dashboard ────────────────────────────────────────────────

function RektorDashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const { rapatList } = useContext(RapatCtx);
  const [showLogout, setShowLogout] = useState(false);

  const kpiCards = [
    { label: "Indeks Komposit",     value: "82,4%",  sub: "↑ 3,5 poin dari Q1 (78,9%)",  icon: "🎯", color: { bg: "from-teal-500 to-teal-700",   badge: "bg-teal-100 text-teal-700"   }, trend: "up"      },
    { label: "Program Audit Selesai",value: "3 / 6", sub: "50% program terlaksana",       icon: "✅", color: { bg: "from-blue-500 to-blue-700",   badge: "bg-blue-100 text-blue-700"   }, trend: "neutral" },
    { label: "RTL Dituntaskan",     value: "12 / 18",sub: "67% rekomendasi selesai",      icon: "📋", color: { bg: "from-purple-500 to-purple-700",badge: "bg-purple-100 text-purple-700"}, trend: "up"     },
    { label: "Penyerapan Anggaran", value: "67%",    sub: "Rp 127,8 Jt dari Rp 191 Jt",  icon: "💰", color: { bg: "from-amber-500 to-amber-600",  badge: "bg-amber-100 text-amber-700" }, trend: "down"    },
  ];

  // ── Tren Q1 → Q2 ──────────────────────────────────────────────────────────
  const trendData = [
    { metrik: "Indeks Komposit",      q1: 78.9, q2: 82.4, satuan: "%",   naik: true  },
    { metrik: "Temuan Kritis",        q1: 6,    q2: 4,    satuan: " item",naik: true  },
    { metrik: "RTL Selesai",          q1: 7,    q2: 12,   satuan: " item",naik: true  },
    { metrik: "Penyerapan Anggaran",  q1: 58,   q2: 67,   satuan: "%",   naik: true  },
    { metrik: "Audit Selesai",        q1: 1,    q2: 3,    satuan: " prog",naik: true  },
  ];

  // ── Temuan kritis per unit ─────────────────────────────────────────────────
  const temuanKritis = [
    { unit: "Sarpras",       temuan: "Belanja Modal Tanpa BA",              level: "Tinggi",  status: "Terlambat", batas: "6 Sep 2025"  },
    { unit: "Sarpras",       temuan: "Aset Gedung Belum di SIMAK",          level: "Tinggi",  status: "Dalam Proses","batas": "11 Sep 2025" },
    { unit: "BAAK",          temuan: "SOP Penerimaan Mahasiswa Belum Revisi",level: "Sedang", status: "Dalam Proses","batas": "9 Sep 2025"  },
    { unit: "Keuangan",      temuan: "Laporan Keuangan Q2 Terlambat",       level: "Tinggi",  status: "Dalam Proses","batas": "20 Sep 2025" },
    { unit: "BAAK",          temuan: "Arsip Mahasiswa Keluar Tidak Lengkap", level: "Sedang", status: "Selesai",    batas: "—"           },
  ];

  const auditUnits = [
    { unit: "BAAK",          program: "Audit Kinerja Akademik",    status: "Selesai",  temuan: 5, rtlSelesai: 4, rtlTotal: 5,  lha: true  },
    { unit: "Sarpras",       program: "Audit Keuangan Sarpras",    status: "Berjalan", temuan: 8, rtlSelesai: 3, rtlTotal: 8,  lha: false },
    { unit: "LPPM",          program: "Audit Kepatuhan LPPM",      status: "Selesai",  temuan: 3, rtlSelesai: 3, rtlTotal: 3,  lha: true  },
    { unit: "Fak. Teknik",   program: "Audit Kinerja Fak. Teknik", status: "Rencana",  temuan: 0, rtlSelesai: 0, rtlTotal: 0,  lha: false },
    { unit: "Keuangan",      program: "Audit Kepatuhan Keuangan",  status: "Rencana",  temuan: 0, rtlSelesai: 0, rtlTotal: 0,  lha: false },
    { unit: "Kemahasiswaan", program: "Audit Kinerja Mhs",         status: "Rencana",  temuan: 0, rtlSelesai: 0, rtlTotal: 0,  lha: false },
  ];

  const lhaList = [
    { judul: "LHA Audit Kinerja BAAK 2025",   tgl: "12 Mei 2025",  unit: "BAAK",   status: "Final", link: "https://drive.google.com/file/lha-baak-2025"   },
    { judul: "LHA Audit Kepatuhan LPPM 2025", tgl: "28 Mar 2025",  unit: "LPPM",   status: "Final", link: "https://drive.google.com/file/lha-lppm-2025"   },
    { judul: "LHA Audit Sarpras Q1 2025",     tgl: "15 Feb 2025",  unit: "Sarpras",status: "Draft", link: "https://drive.google.com/file/lha-sarpras-2025" },
  ];

  const rapatMendatang = rapatList.filter(r => r.status === "Terjadwal").slice(0, 4);

  const statusBadge = (s: string) =>
    s === "Selesai"      ? "bg-green-100 text-green-700"   :
    s === "Berjalan"     ? "bg-blue-100 text-blue-700"     :
    s === "Draft"        ? "bg-amber-100 text-amber-700"   :
    s === "Final"        ? "bg-teal-100 text-teal-700"     :
    s === "Dalam Proses" ? "bg-blue-100 text-blue-700"     :
    s === "Terlambat"    ? "bg-red-100 text-red-700"       :
                           "bg-gray-100 text-gray-500";

  const levelBadge = (l: string) =>
    l === "Tinggi" ? "bg-red-100 text-red-700" :
    l === "Sedang" ? "bg-amber-100 text-amber-700" :
                     "bg-green-100 text-green-700";

  // simple SVG mini bar for trend
  const TrendBar = ({ q1, q2, max }: { q1: number; q2: number; max: number }) => {
    const w = 80;
    const h = 28;
    const b1 = Math.round((q1 / max) * w);
    const b2 = Math.round((q2 / max) * w);
    return (
      <svg width={w} height={h} className="flex-shrink-0">
        <rect x={0} y={h - 10} width={b1} height={10} rx={3} fill="#cbd5e1" />
        <rect x={0} y={0}      width={b2} height={10} rx={3} fill="var(--tsu-teal)" />
        <text x={b1 + 2} y={h - 2}  fontSize={8} fill="#94a3b8">Q1</text>
        <text x={b2 + 2} y={10}     fontSize={8} fill="var(--tsu-teal)">Q2</text>
      </svg>
    );
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ fontFamily: "'Inter', sans-serif", background: "#f1f5f9" }}>
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-6 py-3 shadow-sm"
        style={{ background: "linear-gradient(90deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
        <div className="flex items-center gap-3">
          <img src={logoTSU} alt="TSU" className="h-8 bg-white rounded-lg px-2 py-1 object-contain" />
          <div>
            <div className="text-[10px] font-bold text-white leading-tight tracking-widest uppercase">Sistem Informasi SPI</div>
            <div className="text-[9px] text-blue-300">Universitas Tiga Serangkai</div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right hidden sm:block">
            <div className="text-xs font-bold text-white">{user.name}</div>
            <div className="text-[10px] text-blue-300">{user.jabatan}</div>
          </div>
          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white ${user.avatarColor}`}>
            {user.initials}
          </div>
          <div className="h-4 w-px bg-white/20" />
          <button onClick={() => setShowLogout(true)}
            className="text-[10px] font-semibold text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors">
            Keluar
          </button>
        </div>
      </header>

      {/* Page body */}
      <main className="flex-1 overflow-y-auto p-4 sm:p-6">
        {/* Page title */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-black text-gray-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                Dashboard Pengawasan
              </h1>
              <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-red-100 text-red-700">Lihat Saja</span>
            </div>
            <p className="text-xs text-gray-400 mt-0.5">Ringkasan hasil pengawasan internal — hanya akses baca</p>
          </div>
          <div className="text-right hidden sm:block">
            <div className="text-[10px] text-gray-400">Per</div>
            <div className="text-xs font-bold text-gray-600">September 2025</div>
          </div>
        </div>

        {/* KPI grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
          {kpiCards.map((k) => (
            <div key={k.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100 relative overflow-hidden">
              <div className={`absolute -top-4 -right-4 w-20 h-20 rounded-full opacity-5 bg-gradient-to-br ${k.color.bg}`} />
              <div className="flex items-start justify-between mb-2">
                <span className="text-xl">{k.icon}</span>
                <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${k.color.badge}`}>
                  {k.trend === "up" ? "↑" : k.trend === "down" ? "↓" : "—"}
                </span>
              </div>
              <div className="text-2xl font-black text-gray-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{k.value}</div>
              <div className="text-[10px] font-semibold text-gray-500 mt-0.5">{k.label}</div>
              <div className="text-[9px] text-gray-400 mt-0.5 leading-tight">{k.sub}</div>
            </div>
          ))}
        </div>

        {/* ── Tren Q1 → Q2 ────────────────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm mb-5 overflow-hidden">
          <div className="px-4 pt-4 pb-3 border-b border-gray-100 flex items-center gap-2">
            <span className="text-base">📈</span>
            <div>
              <div className="text-sm font-bold text-gray-700">Tren Kinerja Pengawasan</div>
              <div className="text-[10px] text-gray-400">Perbandingan Q1 2025 vs Q2 2025</div>
            </div>
            <div className="ml-auto flex items-center gap-3 text-[9px] text-gray-400">
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm bg-slate-300" />Q1</span>
              <span className="flex items-center gap-1"><span className="inline-block w-3 h-2 rounded-sm" style={{ background: "var(--tsu-teal)" }} />Q2</span>
            </div>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 divide-x divide-gray-50">
            {trendData.map((t) => {
              const maxVal = Math.max(t.q1, t.q2) * 1.2;
              const delta = t.q2 - t.q1;
              return (
                <div key={t.metrik} className="px-4 py-4 flex flex-col gap-2">
                  <div className="text-[10px] font-semibold text-gray-500 leading-tight">{t.metrik}</div>
                  <TrendBar q1={t.q1} q2={t.q2} max={maxVal} />
                  <div className="flex items-end gap-1.5">
                    <span className="text-base font-black text-gray-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>
                      {t.q2}{t.satuan}
                    </span>
                    <span className={`text-[9px] font-bold pb-0.5 ${t.naik ? "text-green-600" : "text-red-500"}`}>
                      {delta > 0 ? "+" : ""}{typeof delta === "number" && !Number.isInteger(delta) ? delta.toFixed(1) : delta}{t.satuan}
                    </span>
                  </div>
                  <div className="text-[9px] text-gray-400">dari {t.q1}{t.satuan} (Q1)</div>
                </div>
              );
            })}
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Left column */}
          <div className="lg:col-span-2 flex flex-col gap-4">
            {/* Temuan kritis per unit */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">⚠️ Rekap Temuan Kritis Per Unit</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Temuan dengan level risiko Tinggi & Sedang yang masih terbuka</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Unit", "Temuan", "Level", "Status RTL", "Batas"].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-gray-400 px-4 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {temuanKritis.map((t, i) => (
                      <tr key={i} className={`border-b border-gray-50 transition-colors ${t.status === "Terlambat" ? "bg-red-50/40 hover:bg-red-50" : "hover:bg-gray-50"}`}>
                        <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{t.unit}</td>
                        <td className="px-4 py-2.5 text-gray-600 max-w-[180px]">{t.temuan}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${levelBadge(t.level)}`}>{t.level}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadge(t.status)}`}>{t.status}</span>
                        </td>
                        <td className={`px-4 py-2.5 text-[10px] whitespace-nowrap ${t.status === "Terlambat" ? "font-bold text-red-600" : "text-gray-400"}`}>{t.batas}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Riwayat Audit Keseluruhan */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">🗂️ Riwayat Audit Keseluruhan</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Seluruh program audit yang pernah dilaksanakan</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Tahun", "Unit Kerja", "Jenis Audit", "Ketua Tim", "Temuan", "RTL", "Status", "LHA"].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-gray-400 px-4 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { tahun:"2025", unit:"BAAK",          jenis:"Kinerja",    ketua:"Budi Santoso",  temuan:5,  rtl:"4/5",  status:"Selesai",  lha:true  },
                      { tahun:"2025", unit:"LPPM",           jenis:"Kepatuhan",  ketua:"Ratna Dewi",    temuan:3,  rtl:"3/3",  status:"Selesai",  lha:true  },
                      { tahun:"2025", unit:"Sarpras",        jenis:"Keuangan",   ketua:"Budi Santoso",  temuan:8,  rtl:"3/8",  status:"Berjalan", lha:false },
                      { tahun:"2024", unit:"BAAK",           jenis:"Kepatuhan",  ketua:"Ratna Dewi",    temuan:4,  rtl:"4/4",  status:"Selesai",  lha:true  },
                      { tahun:"2024", unit:"Keuangan",       jenis:"Keuangan",   ketua:"Budi Santoso",  temuan:7,  rtl:"7/7",  status:"Selesai",  lha:true  },
                      { tahun:"2024", unit:"Fak. Teknik",    jenis:"Kinerja",    ketua:"Andi Prasetyo", temuan:3,  rtl:"2/3",  status:"Selesai",  lha:true  },
                      { tahun:"2024", unit:"Kemahasiswaan",  jenis:"Kinerja",    ketua:"Siti Aisyah",   temuan:2,  rtl:"2/2",  status:"Selesai",  lha:true  },
                      { tahun:"2023", unit:"LPPM",           jenis:"Kepatuhan",  ketua:"Ratna Dewi",    temuan:5,  rtl:"5/5",  status:"Selesai",  lha:true  },
                      { tahun:"2023", unit:"Sarpras",        jenis:"Keuangan",   ketua:"Budi Santoso",  temuan:9,  rtl:"8/9",  status:"Selesai",  lha:true  },
                      { tahun:"2023", unit:"BAAK",           jenis:"Kinerja",    ketua:"Andi Prasetyo", temuan:3,  rtl:"3/3",  status:"Selesai",  lha:true  },
                    ].map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-gray-500 whitespace-nowrap">{r.tahun}</td>
                        <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{r.unit}</td>
                        <td className="px-4 py-2.5 text-gray-500">{r.jenis}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.ketua}</td>
                        <td className="px-4 py-2.5 text-center font-bold text-gray-700">{r.temuan}</td>
                        <td className="px-4 py-2.5 text-center text-gray-600">{r.rtl}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}>{r.status}</span>
                        </td>
                        <td className="px-4 py-2.5">
                          {r.lha
                            ? <span className="text-[9px] font-bold text-teal-600">✓ Ada</span>
                            : <span className="text-[9px] text-gray-300">Belum</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Audit per unit */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">📊 Status Audit Per Unit Kerja</h2>
                <p className="text-[10px] text-gray-400 mt-0.5">Program audit tahun 2025</p>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-50">
                      {["Unit Kerja", "Program Audit", "Status", "Temuan", "RTL", "LHA"].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-gray-400 px-4 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {auditUnits.map((u, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap">{u.unit}</td>
                        <td className="px-4 py-2.5 text-gray-500 max-w-[160px] truncate">{u.program}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadge(u.status)}`}>{u.status}</span>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-gray-700">{u.temuan || "—"}</td>
                        <td className="px-4 py-2.5">
                          {u.rtlTotal > 0 ? (
                            <div className="flex items-center gap-1.5">
                              <div className="flex-1 bg-gray-100 rounded-full h-1.5 min-w-[40px]">
                                <div className="h-1.5 rounded-full bg-green-500 transition-all"
                                  style={{ width: `${(u.rtlSelesai / u.rtlTotal) * 100}%` }} />
                              </div>
                              <span className="text-[9px] text-gray-500 whitespace-nowrap">{u.rtlSelesai}/{u.rtlTotal}</span>
                            </div>
                          ) : <span className="text-[9px] text-gray-300">—</span>}
                        </td>
                        <td className="px-4 py-2.5">
                          {u.lha
                            ? <span className="text-[9px] font-bold text-teal-600">✓ Ada</span>
                            : <span className="text-[9px] text-gray-300">Belum</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* LHA Terbaru */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">📄 Laporan Hasil Audit (LHA) Terbaru</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {lhaList.map((l, i) => (
                  <div key={i} className="flex items-center gap-3 px-4 py-3">
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-sm flex-shrink-0"
                      style={{ background: "var(--tsu-teal-light)" }}>
                      📋
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-gray-700 truncate">{l.judul}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{l.unit} · {l.tgl}</div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadge(l.status)}`}>{l.status}</span>
                      <a href={l.link} target="_blank" rel="noreferrer"
                        className="text-[9px] font-bold px-2 py-1 rounded-lg flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>
                        ↗ Buka
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Right column */}
          <div className="flex flex-col gap-4">
            {/* Rapat mendatang */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm">
              <div className="px-4 pt-4 pb-3 border-b border-gray-100">
                <h2 className="text-sm font-bold text-gray-700">📅 Rapat Mendatang</h2>
              </div>
              <div className="divide-y divide-gray-50">
                {rapatMendatang.length === 0 && (
                  <p className="text-[10px] text-gray-400 text-center py-6">Belum ada jadwal rapat.</p>
                )}
                {rapatMendatang.map((r) => (
                  <div key={r.id} className="px-4 py-3">
                    <div className="text-xs font-semibold text-gray-700 truncate">{r.judul}</div>
                    <div className="text-[9px] text-gray-400 mt-1">{r.tgl} · {r.jam}</div>
                    <div className="text-[9px] text-gray-400 mt-0.5 truncate">{r.tempat}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Anggaran progress */}
            <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
              <h2 className="text-sm font-bold text-gray-700 mb-3">💰 Realisasi Anggaran Q2</h2>
              {[
                { label: "SDM & Pelatihan",    real: 82 },
                { label: "Operasional Audit",  real: 71 },
                { label: "Teknologi & Sistem", real: 55 },
                { label: "Lain-lain",          real: 30 },
              ].map((a) => (
                <div key={a.label} className="mb-2.5">
                  <div className="flex justify-between text-[10px] mb-1">
                    <span className="text-gray-600">{a.label}</span>
                    <span className={`font-semibold ${a.real >= 70 ? "text-green-600" : a.real >= 50 ? "text-amber-600" : "text-red-500"}`}>{a.real}%</span>
                  </div>
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div className="h-1.5 rounded-full transition-all"
                      style={{ width: `${a.real}%`, background: a.real >= 70 ? "#22c55e" : a.real >= 50 ? "#f59e0b" : "#ef4444" }} />
                  </div>
                </div>
              ))}
              <div className="mt-3 pt-3 border-t border-gray-100 flex justify-between text-[10px] text-gray-400">
                <span>Total realisasi</span>
                <span className="font-bold text-gray-600">Rp 127,8 Jt / Rp 191 Jt</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Logout confirm */}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-2xl mb-3">👋</div>
            <div className="font-bold text-gray-800 mb-1">Keluar dari sistem?</div>
            <div className="text-sm text-gray-500 mb-5">Sesi Anda akan berakhir dan Anda perlu masuk kembali.</div>
            <div className="flex gap-2">
              <button onClick={() => setShowLogout(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50">
                Batal
              </button>
              <button onClick={onLogout}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white"
                style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark), var(--tsu-teal))" }}>
                Ya, Keluar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Dashboard shell ───────────────────────────────────────────────────────────

export default function Dashboard({ user, onLogout }: { user: User; onLogout: () => void }) {
  const [sidebarOpen, setSidebarOpen]             = useState(true);
  const [showNotifModal, setShowNotifModal]       = useState(false);
  const [showSettings, setShowSettings]           = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rapatList, setRapatList]                 = useState<Rapat[]>(RAPAT_AWAL);
  const [readNotifIds, setReadNotifIds] = useState<Set<number>>(new Set());

  type Notif = { id: number; icon: string; title: string; body: string; time: string; tag: string; roles: string[] };
  const [allNotifs, setAllNotifs] = useState<Notif[]>([
    { id:1,  icon:"⚠️", title:"RTL Sarpras jatuh tempo",              body:"Tindak lanjut rekomendasi R-003 batas akhir 3 hari lagi.",         time:"5 mnt lalu",  tag:"Deadline", roles:["full","pengawasan"] },
    { id:2,  icon:"✅", title:"Audit BAAK selesai",                    body:"LHA sudah diterbitkan dan tersedia di modul Riwayat.",              time:"1 jam lalu",  tag:"Audit",    roles:["full","pengawasan","rektor"] },
    { id:3,  icon:"📅", title:"Rapat Tinjauan Manajemen besok",        body:"Rapat dijadwalkan pukul 09.00 — Ruang Sidang Utama.",              time:"2 jam lalu",  tag:"Rapat",    roles:["full","pengawasan","backoffice","auditee","rektor"] },
    { id:4,  icon:"📋", title:"PKPT baru diunggah",                    body:"Rencana Kerja Pengawasan Tahunan 2025 telah diperbarui.",           time:"3 jam lalu",  tag:"Info",     roles:["full","backoffice"] },
    { id:5,  icon:"👤", title:"Auditor baru ditambahkan",              body:"Dwi Santoso, CISA — telah terdaftar di modul SDM.",                time:"Kemarin",     tag:"SDM",      roles:["full","backoffice"] },
    { id:6,  icon:"🗑️", title:"Jadwal pemusnahan dokumen menunggu",    body:"3 arsip menunggu persetujuan pemusnahan di modul Retensi.",        time:"4 jam lalu",  tag:"Arsip",    roles:["full","backoffice"] },
    { id:7,  icon:"💰", title:"Realisasi anggaran kurang dari 80%",    body:"Penyerapan anggaran Q2 masih 67% — perlu evaluasi segera.",        time:"Hari ini",    tag:"Anggaran", roles:["full","backoffice","rektor"] },
    { id:8,  icon:"📝", title:"Rekomendasi baru dari auditor",         body:"2 rekomendasi baru pada audit BAAK perlu ditindaklanjuti.",        time:"6 mnt lalu",  tag:"RTL",      roles:["auditee"] },
    { id:9,  icon:"⏰", title:"Deadline RTL #2 dalam 4 hari",          body:"Mohon segera unggah bukti tindak lanjut sebelum batas waktu.",    time:"30 mnt lalu", tag:"Deadline", roles:["auditee"] },
    { id:10, icon:"📢", title:"Jadwal audit unit Anda ditetapkan",     body:"Audit unit dijadwalkan mulai 5 Juni 2025.",                        time:"1 hari lalu", tag:"Audit",    roles:["auditee"] },
    { id:11, icon:"🔔", title:"Verifikasi RTL disetujui",              body:"Tindak lanjut R-001 telah diverifikasi dan diterima auditor.",     time:"2 jam lalu",  tag:"RTL",      roles:["auditee"] },
    { id:12, icon:"📊", title:"Laporan Pengawasan Q2 tersedia",        body:"Ringkasan hasil audit dan status RTL semester I sudah dapat dilihat di dashboard.", time:"1 hari lalu", tag:"Audit", roles:["rektor"] },
    { id:13, icon:"🎯", title:"Indeks Komposit naik ke 82,4%",         body:"Skor pengawasan meningkat dari Q1 (78,9%) berdasarkan 5 dimensi audit.",          time:"3 hari lalu", tag:"Info",  roles:["rektor"] },
  ]);

  function addRapat(r: Omit<Rapat, "id" | "status">) {
    const newId = Date.now();
    setRapatList(prev => [{ ...r, id: newId, status: "Terjadwal" }, ...prev]);
    const notifRoles = pesertaToRoles(r.peserta);
    setAllNotifs(prev => [{
      id: newId,
      icon: "📅",
      title: `Rapat baru: ${r.judul}`,
      body: `${r.tgl} · ${r.jam} · ${r.tempat} · Peserta: ${pesertaLabel(r.peserta)}`,
      time: "Baru saja",
      tag: "Rapat",
      roles: notifRoles.length > 0 ? notifRoles : ["full"],
    }, ...prev]);
  }

  function batalkanRapat(id: number) {
    setRapatList(prev => prev.map(r => r.id === id ? { ...r, status: "Batal" } : r));
  }

  const myNotifs = allNotifs.filter(n => n.roles.includes(user.role));
  const unreadCount = myNotifs.filter(n => !readNotifIds.has(n.id)).length;
  const notifTagColor: Record<string,string> = {
    Deadline:"bg-red-50 text-red-600",   Audit:"bg-teal-50 text-teal-700",
    Rapat:"bg-purple-50 text-purple-700", Info:"bg-blue-50 text-blue-600",
    SDM:"bg-amber-50 text-amber-700",    RTL:"bg-orange-50 text-orange-700",
    Arsip:"bg-rose-50 text-rose-600",    Anggaran:"bg-emerald-50 text-emerald-700",
  };

  const defaultModule = user.role === "backoffice" ? "backoffice" : "pengawasan";
  const defaultSection = user.role === "backoffice" ? "R" : "ringkasan";
  const isReadOnly = user.role === "rektor";
  const defaultItem = navGroups.find(g => g.key === defaultModule)?.items.find(i => i.sectionKey === defaultSection);

  const [activeModule, setActiveModule]     = useState(defaultModule);
  const [activeSection, setActiveSection]   = useState(defaultSection);
  const [activeSubSection, setActiveSubSection] = useState(defaultItem?.children?.[0] ?? "");

  const canAccess = (key: string) => {
    if (user.role === "full")       return true;
    if (user.role === "rektor")     return true;          // lihat semua, read-only
    if (user.role === "pengawasan") return key === "pengawasan";
    if (user.role === "backoffice") return key === "backoffice";
    if (user.role === "auditee")    return key === "pengawasan";
    return false;
  };

  function navigate(module: string, section: string) {
    setActiveModule(module);
    setActiveSection(section);
    const firstChild = navGroups.find(g => g.key === module)?.items.find(i => i.sectionKey === section)?.children?.[0] ?? "";
    setActiveSubSection(firstChild);
  }

  const activeNavItem = navGroups.find(g => g.key === activeModule)?.items.find(i => i.sectionKey === activeSection);
  const activeChildren = activeNavItem?.children ?? [];

  const roleBadge = ({
    full:        { label: "Akses Penuh",                          style: { background: "var(--tsu-teal-light)", color: "var(--tsu-teal-dark)" } },
    rektor:      { label: "Rektor — Lihat Saja",                  style: { background: "#fef2f2", color: "#991b1b" } },
    pengawasan:  { label: "Modul Pengawasan",                     style: { background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" } },
    backoffice:  { label: "Back Office",                          style: { background: "var(--tsu-gold-light)", color: "#a0620a" } },
    auditee:     { label: `Auditee — ${user.unit ?? "Unit"}`,     style: { background: "#f5f3ff", color: "#7c3aed" } },
  } as Record<string, { label: string; style: React.CSSProperties }>)[user.role];

  const activeLabel = [...navGroups.flatMap(g => g.items)].find(
    i => i.sectionKey === activeSection
  )?.label ?? "Dashboard SPI";

  if (user.role === "rektor") {
    return (
      <RapatCtx.Provider value={{ rapatList, addRapat, batalkanRapat }}>
        <UserCtx.Provider value={user}>
          <RektorDashboard user={user} onLogout={onLogout} />
        </UserCtx.Provider>
      </RapatCtx.Provider>
    );
  }

  return (
    <RapatCtx.Provider value={{ rapatList, addRapat, batalkanRapat }}>
    <UserCtx.Provider value={user}>
    <div className="flex h-full overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: "#f1f5f9" }}>
      {/* Sidebar */}
      <aside
        className="flex-shrink-0 flex flex-col overflow-y-auto transition-all duration-300"
        style={{ width: sidebarOpen ? "240px" : "0px", minWidth: sidebarOpen ? "240px" : "0px", background: "linear-gradient(180deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}
      >
        <div className="flex flex-col px-4 py-4 border-b border-white/10 gap-2">
          <div className="bg-white rounded-xl px-3 py-2">
            <img src={logoTSU} alt="Tiga Serangkai University" className="h-8 w-full object-contain object-left" />
          </div>
          <div>
            <div className="text-[10px] font-bold text-white leading-tight">SISTEM INFORMASI SPI</div>
            <div className="text-[9px] text-blue-300 leading-tight mt-0.5">UNIVERSITAS TIGA SERANGKAI</div>
          </div>
        </div>

        <nav className="flex-1 px-3 py-4 flex flex-col gap-4">
          {user.role === "auditee" && user.unit && (
            <div className="rounded-xl px-3 py-2 mb-1" style={{ background: "rgba(124,58,237,0.15)" }}>
              <div className="text-[9px] font-bold text-purple-200 uppercase tracking-widest mb-0.5">Unit Anda</div>
              <div className="text-xs font-black text-white">{user.unit}</div>
            </div>
          )}
          {(false as boolean) && (
            <div className="rounded-xl px-3 py-2 mb-1" style={{ background: "rgba(220,38,38,0.15)" }}>
              <div className="text-[9px] font-bold text-red-200 uppercase tracking-widest mb-0.5">Mode Akses</div>
              <div className="text-xs font-black text-white">Lihat Saja</div>
              <div className="text-[9px] text-red-200 mt-0.5 leading-tight">Tidak dapat mengubah data sistem</div>
            </div>
          )}
          {navGroups.filter((g) => canAccess(g.key)).map((group) => (
            <div key={group.key}>
              <div className="text-[10px] font-bold tracking-widest px-3 mb-2 uppercase" style={{ color: "var(--tsu-gold)" }}>{group.section}</div>
              <div className="flex flex-col gap-0.5">
                {group.items.map((item) => (
                  <NavItem
                    key={item.label}
                    label={item.label}
                    icon={item.icon}
                    children={item.children}
                    isActive={activeModule === group.key && activeSection === item.sectionKey}
                    onNavigate={() => navigate(group.key, item.sectionKey)}
                  />
                ))}
              </div>
            </div>
          ))}

          <div className="mt-auto flex flex-col gap-0.5 pt-4 border-t border-white/10">
            <button onClick={() => setShowSettings(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-teal-100 hover:bg-white/10 transition-colors">
              <IconSettings className="w-4 h-4 text-teal-300" /> Pengaturan Sistem
            </button>
            <button onClick={() => setShowLogoutConfirm(true)} className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium text-red-300 hover:bg-red-500/20 transition-colors">
              <IconLogout className="w-4 h-4" /> Keluar
            </button>
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-center gap-1.5">
              <span className="text-[9px] text-white/40">WebDev SPI-TSU</span>
              <span className="text-[9px] text-white/20">·</span>
              <span className="text-[9px] font-bold text-white/50">V1.0</span>
            </div>
          </div>
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Topbar */}
        <header className="flex-shrink-0 bg-white border-b border-gray-200 flex items-center gap-4 px-6 py-3">
          <button onClick={() => setSidebarOpen(!sidebarOpen)} className="text-gray-500 hover:text-gray-700 transition-colors">
            <IconMenu className="w-5 h-5" />
          </button>
          <div className="flex-1">
            <h1 className="text-xl font-bold text-gray-800" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeLabel}</h1>
            <p className="text-xs text-gray-400">{activeModule === "pengawasan" ? "Modul Pengawasan SPI" : "Modul Back Office SPI"}</p>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2">
            <span>Periode:</span>
            <span className="font-semibold text-gray-700">Tahun 2025</span>
            <IconCalendar className="w-4 h-4 text-gray-400" />
          </div>
          <div className="relative">
            <button onClick={() => setShowNotifModal(true)}
              className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 transition-colors">
              <IconBell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-red-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount}
                </span>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-white font-bold text-xs ${user.avatarColor}`}>
              {user.initials}
            </div>
            <div>
              <div className="text-xs font-semibold text-gray-700 leading-tight">{user.name}</div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={roleBadge.style}>{roleBadge.label}</span>
              </div>
            </div>
            <IconChevron className="w-4 h-4 text-gray-400" />
          </div>
        </header>

        {/* Sub-nav strip */}
        {activeChildren.length > 0 && (
          <div className="flex-shrink-0 bg-white border-b border-gray-100 px-5 py-2 shadow-sm">
            <div className="flex gap-1 flex-wrap">
              {activeChildren.map(child => (
                <button key={child}
                  onClick={() => setActiveSubSection(child)}
                  className="flex items-center gap-1.5 px-4 py-1.5 rounded-full text-xs font-semibold transition-all"
                  style={activeSubSection === child
                    ? { background: "var(--tsu-teal)", color: "#fff", boxShadow: "0 2px 8px rgba(14,128,128,0.3)" }
                    : { color: "#64748b", background: "transparent" }}
                >
                  {child}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Content */}
        <main className="flex-1 overflow-y-auto p-5">
          {/* Indeks komposit shown for full-access & rektor on pengawasan ringkasan */}
          {user.role === "full" && activeModule === "pengawasan" && activeSection === "ringkasan" && (
            <div className="mb-4"><IndeksKomposit /></div>
          )}
          {activeModule === "pengawasan" && <TabPengawasan section={activeSection} subSection={activeSubSection} />}
          {activeModule === "backoffice" && <TabBackoffice section={activeSection} subSection={activeSubSection} />}
        </main>
      </div>

      {/* Notification modal — rendered at root so fixed overlay covers full viewport */}
      {showNotifModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowNotifModal(false); }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden flex flex-col"
            style={{ maxHeight: "min(90vh, 600px)" }}>
            {/* Modal header */}
            <div className="flex items-center justify-between px-5 py-4 flex-shrink-0"
              style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center">
                  <IconBell className="w-5 h-5 text-white" />
                </div>
                <div>
                  <div className="text-sm font-black text-white leading-tight">Notifikasi</div>
                  <div className="text-[10px] text-white/70">
                    {unreadCount > 0 ? `${unreadCount} belum dibaca` : "Semua sudah dibaca"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                {unreadCount > 0 && (
                  <button onClick={() => setReadNotifIds(new Set(myNotifs.map(n => n.id)))}
                    className="text-[10px] font-semibold text-white/80 hover:text-white underline underline-offset-2 transition-colors">
                    Tandai semua dibaca
                  </button>
                )}
                <button onClick={() => setShowNotifModal(false)}
                  className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold transition-colors">
                  ✕
                </button>
              </div>
            </div>

            {/* Notif list */}
            <div className="overflow-y-auto flex-1 divide-y divide-gray-50">
              {myNotifs.length === 0 && (
                <div className="py-16 text-center text-gray-400 text-xs">Tidak ada notifikasi untuk akun Anda.</div>
              )}
              {myNotifs.map(n => {
                const isRead = readNotifIds.has(n.id);
                return (
                  <button key={n.id}
                    onClick={() => setReadNotifIds(p => { const s = new Set(p); s.add(n.id); return s; })}
                    className={`w-full text-left flex items-start gap-3 px-5 py-4 transition-colors hover:bg-gray-50 ${isRead ? "opacity-55" : ""}`}>
                    <span className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${isRead ? "bg-transparent" : ""}`}
                      style={isRead ? {} : { background: "var(--tsu-teal)" }} />
                    <div className="w-9 h-9 rounded-xl flex items-center justify-center text-lg flex-shrink-0"
                      style={{ background: "var(--tsu-teal-light)" }}>
                      {n.icon}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <span className={`text-xs leading-tight ${isRead ? "font-medium text-gray-500" : "font-bold text-gray-800"}`}>{n.title}</span>
                        <span className={`text-[9px] font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0 ${notifTagColor[n.tag] ?? "bg-gray-50 text-gray-500"}`}>{n.tag}</span>
                      </div>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-relaxed">{n.body}</p>
                      <p className="text-[9px] text-gray-400 mt-1">{n.time}</p>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Footer */}
            <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 flex items-center justify-between flex-shrink-0">
              <span className="text-[10px] text-gray-400">
                {myNotifs.filter(n => readNotifIds.has(n.id)).length} / {myNotifs.length} sudah dibaca
              </span>
              <button onClick={() => { setReadNotifIds(new Set()); setShowNotifModal(false); }}
                className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white text-gray-600 hover:bg-gray-100 transition-colors">
                Reset & Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>

    {/* Modal Pengaturan Sistem */}
    {showSettings && (
      <PengaturanSistem user={user} onClose={() => setShowSettings(false)} />
    )}

    {/* Konfirmasi Keluar */}
    {showLogoutConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background:"rgba(15,23,42,0.6)", backdropFilter:"blur(6px)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-2xl">
              🚪
            </div>
            <div>
              <h3 className="text-base font-black text-gray-800">Yakin ingin keluar?</h3>
              <p className="text-xs text-gray-500 mt-2 leading-relaxed">
                Pastikan semua pekerjaan sudah tersimpan sebelum keluar — input yang belum disimpan akan hilang dan sesi Anda akan berakhir.
              </p>
            </div>
          </div>

          <div className="px-6 py-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 flex items-start gap-2">
              <span className="text-amber-500 flex-shrink-0 mt-0.5">⚠️</span>
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Periksa kembali: form yang sedang diisi, data RTL yang belum disubmit, atau rapat yang belum disimpan.
              </p>
            </div>
          </div>

          <div className="px-6 pb-6 flex gap-2">
            <button
              onClick={() => setShowLogoutConfirm(false)}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
              Batal, Kembali
            </button>
            <button
              onClick={onLogout}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-red-500 hover:bg-red-600 transition-colors">
              Ya, Keluar
            </button>
          </div>
        </div>
      </div>
    )}
    </UserCtx.Provider>
    </RapatCtx.Provider>
  );
}
