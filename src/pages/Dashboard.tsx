import React, { useState, useEffect, createContext, useContext, useMemo } from "react";
const logoTSU = "/LOGO_TSU.png";
import {
  PieChart, Pie, Cell, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  ScatterChart, Scatter, ZAxis,
  AreaChart, Area, ComposedChart,
  LineChart, Line, Legend,
  CartesianGrid, ReferenceLine,
} from "recharts";
import { User, ACCOUNTS, AppConfig, makeInitials } from "@/types/auth";

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
  auditNo?: string;   // relasi eksplisit ke Rencana Audit (khusus Entry Meeting dari Persiapan Audit)
}

// Daftar peserta yang bisa dipilih di form
const PESERTA_INTERNAL = ["Kepala SPI", "Tim Auditor", "Staf Back Office"];
const UNIT_KERJA_LIST = [
  "BAAK","BAKPU","BAUK","Sarpras","SDM","BPU",
  "D3-DKV","D3-DPT","D3-SI","D3-TI",
  "Fak. Sains & Hum.","Fak. Teknik","Fak. Vokasi",
  "KUI","LPM","LPPM","Perpustakaan","PMB",
  "S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi",
  "S1-ReKom","S1-Sistem Informasi","Marcomm","PIKD",
];

// Mapping peserta → role notifikasi
function pesertaToRoles(peserta: string[]): string[] {
  const roles = new Set<string>();
  peserta.forEach(p => {
    if (p === "Kepala SPI")        roles.add("full");
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
  { id:1, judul:"Rapat Tinjauan Manajemen SPI",  tgl:"22 Mei 2025", jam:"09.00", tempat:"Ruang Rapat A",  peserta:["Kepala SPI","Tim Auditor"],        status:"Terjadwal" },
  { id:2, judul:"Koordinasi Program Audit 2025", tgl:"28 Mei 2025", jam:"10.00", tempat:"Online / Zoom",  peserta:["Kepala SPI","Tim Auditor","Staf Back Office"], status:"Terjadwal" },
  { id:3, judul:"Evaluasi RTL Semester I",       tgl:"3 Jun 2025",  jam:"13.00", tempat:"Ruang Rapat B",  peserta:["Kepala SPI","Tim Auditor","BAAK","LPPM","Sarpras"], status:"Terjadwal" },
  { id:4, judul:"Rapat Penutupan Audit LPPM",    tgl:"10 Mei 2025", jam:"09.00", tempat:"Ruang LPPM",     peserta:["Tim Auditor","LPPM"],              status:"Selesai"   },
  { id:5, judul:"Kick-off Audit Keuangan",       tgl:"5 Mei 2025",  jam:"08.30", tempat:"Ruang Keuangan", peserta:["Tim Auditor","BAUK"],              status:"Selesai"   },
  { id:6, judul:"Rapat Koordinasi Lintas Unit",  tgl:"2 Apr 2025",  jam:"14.00", tempat:"Aula Utama",     peserta:[...PESERTA_INTERNAL,...UNIT_KERJA_LIST], status:"Batal" },
  { id:7, judul:"Entry Meeting PA-002 — BAUK",   tgl:"26 Mei 2025", jam:"09.00", tempat:"Ruang Rapat BAUK", peserta:["Kepala SPI","Tim Auditor","Staf Back Office","BAUK"], status:"Terjadwal", auditNo:"PA-002" },
];

interface RapatCtxType {
  rapatList: Rapat[];
  addRapat: (r: Omit<Rapat, "id" | "status">) => void;
  batalkanRapat: (id: number) => void;
  selesaiRapat: (id: number) => void;
  updateRapat: (id: number, r: Omit<Rapat, "id" | "status">) => void;
}

const RapatCtx = createContext<RapatCtxType>({
  rapatList: RAPAT_AWAL,
  addRapat: () => {},
  batalkanRapat: () => {},
  selesaiRapat: () => {},
  updateRapat: () => {},
});

type SuratKeluarItem = { no: string; tgl: string; perihal: string; kepada: string; disposisi: string; link: string | null; auditNo?: string; jenis?: "Pemberitahuan" | "Tugas" };
const SURAT_KELUAR_AWAL: SuratKeluarItem[] = [
  { no: "012/SPI/V/2025",  tgl: "19 Mei 2025", perihal: "Pemberitahuan Audit BAAK",          kepada: "Kepala BAAK",        disposisi: "Terkirim", link: "https://drive.google.com/file/pemberitahuan-audit-baak-2025", auditNo: "PA-005", jenis: "Pemberitahuan" },
  { no: "015/SPI/V/2025",  tgl: "18 Mei 2025", perihal: "Surat Tugas Audit Lapangan",        kepada: "Tim Auditor",        disposisi: "Terkirim", link: null, auditNo: "PA-001", jenis: "Tugas" },
  { no: "016/SPI/V/2025",  tgl: "17 Mei 2025", perihal: "Pemberitahuan Audit Sarpras",       kepada: "Kepala Sarpras",     disposisi: "Terkirim", link: "https://drive.google.com/file/pemberitahuan-audit-sarpras-2025", auditNo: "PA-001", jenis: "Pemberitahuan" },
  { no: "018/SPI/V/2025",  tgl: "16 Mei 2025", perihal: "LHA Fakultas Teknik 2024",          kepada: "Dekan Fak. Teknik",  disposisi: "Diterima", link: null },
  { no: "020/SPI/V/2025",  tgl: "14 Mei 2025", perihal: "Rekomendasi Tindak Lanjut Sarpras", kepada: "Kepala Sarpras",     disposisi: "Diterima", link: null },
  { no: "021/SPI/V/2025",  tgl: "21 Mei 2025", perihal: "Pemberitahuan Audit BAUK",          kepada: "Kepala BAUK",        disposisi: "Terkirim", link: null, auditNo: "PA-002", jenis: "Pemberitahuan" },
  { no: "022/SPI/IV/2025", tgl: "8 Apr 2025",  perihal: "Permohonan Data Anggaran 2025",     kepada: "Kepala Keuangan",    disposisi: "Terkirim", link: null },
];
const SuratKeluarCtx = createContext<{ suratKeluar: SuratKeluarItem[]; setSuratKeluar: React.Dispatch<React.SetStateAction<SuratKeluarItem[]>> }>({
  suratKeluar: SURAT_KELUAR_AWAL, setSuratKeluar: () => {},
});

// ── Temuan Risiko → RTL → Verifikasi (store bersama) ─────────────────────────
type TemuanRisiko = { id: string; auditNo: string; unit: string; deskripsi: string; kategori: string; tingkat: string; status: string };
type HasilVerif = "Menunggu" | "Diterima" | "Ditolak";
type RtlItem = {
  id: number; temuanId: string; unit: string; rencana: string; pic: string; target: string;
  link: string | null; progres: number; bukti: string | null; hasil: HasilVerif | null;
  catatan: string; verifikator: string; tglSelesai: string;
  tlStatus?: "Open" | "Close" | "Diterima" | "Progres";
};
type RtlStatus = "Selesai" | "Menunggu Verifikasi" | "Terlambat" | "Proses";

const TEMUAN_AWAL: TemuanRisiko[] = [
  { id: "R-001", auditNo: "PA-002", unit: "BAUK",         deskripsi: "Ketidaksesuaian pencatatan aset tetap",          kategori: "Keuangan",    tingkat: "Tinggi", status: "Belum Ditindak" },
  { id: "R-002", auditNo: "PA-001", unit: "Sarpras",      deskripsi: "Pengelolaan aset tidak terdokumentasi",          kategori: "Operasional", tingkat: "Tinggi", status: "Proses" },
  { id: "R-003", auditNo: "PA-005", unit: "BAAK",         deskripsi: "SOP penerimaan mahasiswa tidak diperbarui",      kategori: "Kepatuhan",   tingkat: "Sedang", status: "Proses" },
  { id: "R-004", auditNo: "PA-006", unit: "LPPM",         deskripsi: "Dokumentasi kegiatan penelitian tidak lengkap",  kategori: "Operasional", tingkat: "Sedang", status: "Selesai" },
  { id: "R-005", auditNo: "PA-007", unit: "Marcomm",      deskripsi: "Pengelolaan data alumni tanpa prosedur baku",    kategori: "Teknologi",   tingkat: "Rendah", status: "Selesai" },
  { id: "R-006", auditNo: "PA-008", unit: "S1-Manajemen", deskripsi: "Laporan akreditasi tidak diarsipkan dengan baik",kategori: "Kepatuhan",   tingkat: "Sedang", status: "Belum Ditindak" },
  { id: "R-007", auditNo: "PA-004", unit: "Perpustakaan", deskripsi: "Sistem katalog tidak terintegrasi dengan SIAKAD",kategori: "Teknologi",   tingkat: "Rendah", status: "Proses" },
  { id: "R-008", auditNo: "PA-003", unit: "LPM",          deskripsi: "Pertanggungjawaban dana kegiatan UKM tidak tepat waktu", kategori: "Keuangan", tingkat: "Tinggi", status: "Belum Ditindak" },
  { id: "R-009", auditNo: "PA-005", unit: "BAAK",         deskripsi: "Arsip mahasiswa keluar tidak terdigitalisasi",   kategori: "Operasional", tingkat: "Rendah", status: "Proses" },
  { id: "R-010", auditNo: "PA-001", unit: "Sarpras",      deskripsi: "Belanja modal tidak disertai BA serah terima",   kategori: "Keuangan",    tingkat: "Sedang", status: "Belum Ditindak" },
];

const RTL_AWAL: RtlItem[] = [
  { id: 1, temuanId: "R-002", unit: "Sarpras",      rencana: "Lengkapi dokumen BA serah terima aset 2019–2024",        pic: "Kabag Sarpras",  target: "18 Mei 2025", link: null, progres: 40,  bukti: null, hasil: null, catatan: "", verifikator: "—", tglSelesai: "—", tlStatus: "Progres" },
  { id: 2, temuanId: "R-003", unit: "BAAK",         rencana: "Perbarui SOP penerimaan mahasiswa sesuai Permendikbud 2023", pic: "Kabag BAAK", target: "30 Jun 2025", link: null, progres: 60,  bukti: null, hasil: null, catatan: "", verifikator: "—", tglSelesai: "—", tlStatus: "Progres" },
  { id: 3, temuanId: "R-004", unit: "LPPM",         rencana: "Lengkapi dokumentasi kegiatan penelitian",               pic: "Kepala LPPM",    target: "15 Mei 2025", link: null, progres: 100, bukti: "https://drive.google.com/file/rtl-lppm-dokumentasi", hasil: "Diterima", catatan: "Bukti lengkap.", verifikator: "Budi S.",  tglSelesai: "10 Mei 2025", tlStatus: "Close" },
  { id: 4, temuanId: "R-005", unit: "Marcomm",      rencana: "Susun prosedur baku pengelolaan data alumni",            pic: "Kabag Marcomm",  target: "10 Mei 2025", link: null, progres: 100, bukti: "https://drive.google.com/file/rtl-marcomm-sop-alumni", hasil: "Diterima", catatan: "SOP sudah disahkan.", verifikator: "Ratna D.", tglSelesai: "8 Mei 2025", tlStatus: "Close" },
  { id: 5, temuanId: "R-007", unit: "Perpustakaan", rencana: "Integrasikan sistem katalog dengan SIAKAD",              pic: "Kepala Perpustakaan", target: "15 Jun 2025", link: null, progres: 30, bukti: null, hasil: null, catatan: "", verifikator: "—", tglSelesai: "—", tlStatus: "Diterima" },
  { id: 6, temuanId: "R-009", unit: "BAAK",         rencana: "Digitalisasi arsip mahasiswa keluar 2020–2024",          pic: "Kabag BAAK",     target: "20 Jun 2025", link: null, progres: 100, bukti: "https://drive.google.com/file/rtl-baak-arsip", hasil: null, catatan: "", verifikator: "—", tglSelesai: "—", tlStatus: "Progres" },
];
const RTL_TODAY = new Date(2025, 4, 22);
const RTL_TODAY_LABEL = "22 Mei 2025";
const BULAN_IDX: Record<string, number> = { Jan:0, Feb:1, Mar:2, Apr:3, Mei:4, Jun:5, Jul:6, Agu:7, Sep:8, Okt:9, Nov:10, Des:11 };

function sisaHariRtl(tgl: string): number {
  const [d, m, y] = tgl.split(" ");
  const target = new Date(parseInt(y), BULAN_IDX[m] ?? 0, parseInt(d));
  return Math.round((target.getTime() - RTL_TODAY.getTime()) / 86400000);
}

// Auditor dianggap ditugaskan bila namanya cocok dengan salah satu anggota tim Rencana Audit.
// Tim disimpan sebagai teks singkat, mis. "Budi S., Ratna D." → cocokkan nama depan + inisial nama kedua.
function isAuditorDitugaskan(userName: string, tim: string): boolean {
  const [first, second] = userName.replace(/,.*$/, "").trim().toLowerCase().split(/\s+/);
  if (!first) return false;
  return tim.split(",").some(t => {
    const [f, s] = t.trim().toLowerCase().split(/\s+/);
    return f === first && (!s || !second || s[0] === second[0]);
  });
}

// Status Tindak Lanjut (sub menu Tindak Lanjut):
// Diterima = RTL sudah dibahas di exit meeting, belum ada aktivitas tindak lanjut
// Progres  = tindak lanjut berjalan sesuai RTL, belum selesai
// Close    = tindak lanjut selesai dilaksanakan (diverifikasi SPI)
// Open     = temuan berulang setelah tindak lanjut dilakukan (verifikasi ditolak)
type TlStatus = "Open" | "Close" | "Diterima" | "Progres";
const TL_STATUS_LIST: TlStatus[] = ["Diterima", "Progres", "Open", "Close"];
const TL_STATUS_STYLE: Record<TlStatus, { cls: string; color: string; desc: string }> = {
  Diterima: { cls: "bg-sky-50 text-sky-600",     color: "#0ea5e9", desc: "Terbahas di exit meeting, belum ada aktivitas" },
  Progres:  { cls: "bg-amber-50 text-amber-600", color: "#f59e0b", desc: "Dijalankan sesuai RTL, belum selesai" },
  Open:     { cls: "bg-red-50 text-red-600",     color: "#ef4444", desc: "Temuan berulang setelah tindak lanjut" },
  Close:    { cls: "bg-green-50 text-green-600", color: "#22c55e", desc: "Tindak lanjut selesai dilaksanakan" },
};
function rtlTlStatus(r: RtlItem): TlStatus {
  if (r.tlStatus) return r.tlStatus;
  if (r.hasil === "Diterima") return "Close";
  if (r.hasil === "Ditolak") return "Open";
  if (r.bukti) return "Progres";
  return "Diterima";
}

function rtlEffStatus(r: RtlItem): RtlStatus {
  if (r.hasil === "Diterima") return "Selesai";
  if (r.bukti && r.hasil === "Menunggu") return "Menunggu Verifikasi";
  return sisaHariRtl(r.target) < 0 ? "Terlambat" : "Proses";
}

interface TemuanCtxType {
  temuanList: TemuanRisiko[];
  rtlList: RtlItem[];
  addTemuan: (t: Omit<TemuanRisiko, "status">) => void;
  ajukanRtl: (temuanId: string, v: { rencana: string; pic: string; target: string; link: string | null }) => void;
  setProgresRtl: (id: number, progres: number) => void;
  kirimBukti: (id: number, link: string) => void;
  verifikasiRtl: (id: number, hasil: "Diterima" | "Ditolak", catatan: string, verifikator: string) => void;
  setTlStatusRtl: (id: number, status: TlStatus) => void;
  updateRtl: (id: number, patch: { rencana: string; pic: string; target: string; link: string | null; bukti: string | null }) => void;
  tambahRtl: (temuanId: string, v: { rencana: string; pic: string; target: string; link: string | null; bukti: string | null }) => void;
}

const TemuanCtx = createContext<TemuanCtxType>({
  temuanList: TEMUAN_AWAL,
  rtlList: RTL_AWAL,
  addTemuan: () => {},
  ajukanRtl: () => {},
  setProgresRtl: () => {},
  kirimBukti: () => {},
  verifikasiRtl: () => {},
  setTlStatusRtl: () => {},
  updateRtl: () => {},
  tambahRtl: () => {},
});

// ── Audit context (shared laporanList + rencanaList) ──────────────────────────
type LaporanItem = { no: string; unit: string; tgl: string; temuan: number; rekomendasi: number; status: string; link: string | null; auditNo?: string; revisiKe?: number; riwayatRevisi?: { tgl: string; catatan: string }[] };
// checklist: 5 butir CHECKLIST_RENCANA; siapJadwal: auditor mengonfirmasi checklist lengkap → gate Penjadwalan Entry Meeting
type RencanaItem = { no: string; unit: string; jenis: string; tim: string; anggaran: string; tglMulai: string; status: string; pkptNo?: number; checklist?: boolean[]; siapJadwal?: boolean };
interface AuditCtxType {
  laporanList: LaporanItem[];
  setLaporanList: React.Dispatch<React.SetStateAction<LaporanItem[]>>;
  rencanaList: RencanaItem[];
  setRencanaList: React.Dispatch<React.SetStateAction<RencanaItem[]>>;
}
const LAPORAN_AWAL: LaporanItem[] = [
  { no: "LHA-001/SPI/IV/2025", unit: "Fak. Teknik", tgl: "10 Apr 2025", temuan: 3, rekomendasi: 5, status: "Diterima", link: "https://drive.google.com/file/lha-001-spi-2025" },
  { no: "LHA-002/SPI/IV/2025", auditNo: "PA-006", unit: "LPPM",            tgl: "25 Apr 2025", temuan: 2, rekomendasi: 3, status: "Diterima", link: "https://drive.google.com/file/lha-002-spi-2025" },
  { no: "LHA-003/SPI/V/2025",  auditNo: "PA-005", unit: "BAAK",            tgl: "Draft",       temuan: 2, rekomendasi: 4, status: "Draft",    link: null },
];
const RENCANA_AWAL: RencanaItem[] = [
  { no: "PA-001", unit: "Sarpras",       jenis: "Kinerja",   tim: "Budi S., Ratna D.", anggaran: "Rp 4.500.000", tglMulai: "5 Mei 2025",  status: "Disetujui", pkptNo: 3 },
  { no: "PA-002", unit: "BAUK",      jenis: "Keuangan",  tim: "Ratna D., Andi P.", anggaran: "Rp 3.200.000", tglMulai: "20 Mei 2025", status: "Disetujui", pkptNo: 4, checklist: [true, true, true, true, true], siapJadwal: true },
  { no: "PA-003", unit: "LPM", jenis: "Kinerja",   tim: "Andi P., Siti A.",  anggaran: "Rp 2.800.000", tglMulai: "1 Jun 2025",  status: "Disetujui", pkptNo: 5, checklist: [true, true, true, true, true], siapJadwal: true },
  { no: "PA-004", unit: "Perpustakaan",  jenis: "Kepatuhan", tim: "Siti A.",            anggaran: "Rp 1.500.000", tglMulai: "15 Jun 2025", status: "Draft", pkptNo: 7 },
  { no: "PA-005", unit: "BAAK",          jenis: "Kepatuhan", tim: "Budi S., Siti A.",   anggaran: "Rp 2.500.000", tglMulai: "3 Mar 2025",  status: "Disetujui", pkptNo: 1 },
  { no: "PA-006", unit: "LPPM",          jenis: "Kinerja",   tim: "Andi P., Ratna D.",  anggaran: "Rp 2.800.000", tglMulai: "10 Feb 2025", status: "Disetujui", pkptNo: 2 },
  { no: "PA-007", unit: "Marcomm",       jenis: "Kepatuhan", tim: "Siti A.",            anggaran: "Rp 1.200.000", tglMulai: "17 Feb 2025", status: "Disetujui" },
  { no: "PA-008", unit: "S1-Manajemen",  jenis: "Kepatuhan", tim: "Ratna D.",           anggaran: "Rp 1.500.000", tglMulai: "24 Mar 2025", status: "Disetujui" },
];
const RIWAYAT_HISTORIS: Record<string, { tahun: string; jenis: string; ketua: string; temuan: number; rtl: number; status: string }[]> = {
  "Fak. Teknik": [
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
  "LPM": [
    { tahun:"2023", jenis:"Kepatuhan", ketua:"Siti A.",  temuan:2, rtl:2, status:"Selesai" },
  ],
};
const AuditCtx = createContext<AuditCtxType>({
  laporanList: LAPORAN_AWAL, setLaporanList: () => {},
  rencanaList: RENCANA_AWAL, setRencanaList: () => {},
});

// ── PKPT (Program Kerja Pengawasan Tahunan) ─────────────────────────────────
// approval = alur persetujuan Ketua (Kepala SPI / role "full"); tahap pelaksanaan diturunkan dari Rencana Audit terkait.
type PkptApproval = "Draft" | "Diajukan" | "Disetujui" | "Revisi";
type PkptItem = { no: number; program: string; unit: string; periode: string; ketua: string; anggaran: number; approval: PkptApproval; catatanKetua?: string; riskId?: string };
const PKPT_AWAL: PkptItem[] = [
  { no: 1,  program: "Audit Kepatuhan Akademik",     unit: "BAAK",           periode: "Q1 2025", ketua: "Budi Santoso",  anggaran: 18.5, approval: "Disetujui" },
  { no: 2,  program: "Audit Kinerja LPPM",           unit: "LPPM",           periode: "Q1 2025", ketua: "Andi Prasetyo", anggaran: 12.0, approval: "Disetujui" },
  { no: 3,  program: "Audit Kinerja Sarpras",        unit: "Sarpras",        periode: "Q2 2025", ketua: "Budi Santoso",  anggaran: 22.0, approval: "Disetujui", riskId: "RSK-002" },
  { no: 4,  program: "Audit Keuangan BAUK",          unit: "BAUK",           periode: "Q2 2025", ketua: "Ratna Dewi",    anggaran: 20.0, approval: "Disetujui", riskId: "RSK-001" },
  { no: 5,  program: "Audit SOP Kemahasiswaan",      unit: "LPM",            periode: "Q2 2025", ketua: "Andi Prasetyo", anggaran: 9.5,  approval: "Disetujui" },
  { no: 6,  program: "Audit Kinerja Fak. Teknik",    unit: "Fak. Teknik",    periode: "Q3 2025", ketua: "Ratna Dewi",    anggaran: 15.0, approval: "Disetujui" },
  { no: 7,  program: "Audit Kepatuhan Perpustakaan", unit: "Perpustakaan",   periode: "Q2 2025", ketua: "Siti Aisyah",   anggaran: 6.0,  approval: "Disetujui" },
  { no: 8,  program: "Audit Kepatuhan Keuangan",     unit: "BAUK",           periode: "Q3 2025", ketua: "Budi Santoso",  anggaran: 20.0, approval: "Revisi",
    catatanKetua: "Ruang lingkup tumpang tindih dengan Audit Keuangan BAUK Q2. Persempit ke pengelolaan kas kecil dan turunkan anggaran maksimal Rp 15 Jt." },
  { no: 9,  program: "Audit Kinerja S1-Informatika", unit: "S1-Informatika", periode: "Q4 2025", ketua: "Ratna Dewi",    anggaran: 10.0, approval: "Diajukan" },
  { no: 10, program: "Audit Tata Kelola PMB",        unit: "PMB",            periode: "Q3 2025", ketua: "Siti Aisyah",   anggaran: 8.0,  approval: "Draft" },
];
const PKPT_APPROVAL_STYLE: Record<PkptApproval, { cls: string; label: string }> = {
  Draft:     { cls: "bg-gray-100 text-gray-500",   label: "Draft" },
  Diajukan:  { cls: "bg-amber-50 text-amber-600",  label: "Diajukan ke Ketua" },
  Disetujui: { cls: "bg-green-50 text-green-600",  label: "Disetujui" },
  Revisi:    { cls: "bg-red-50 text-red-600",      label: "Revisi" },
};
const PkptCtx = createContext<{ pkptList: PkptItem[]; setPkptList: React.Dispatch<React.SetStateAction<PkptItem[]>> }>({
  pkptList: PKPT_AWAL, setPkptList: () => {},
});
function nextPaNo(list: RencanaItem[]): string {
  const n = Math.max(0, ...list.map(r => parseInt(r.no.replace(/\D/g, "")) || 0)) + 1;
  return `PA-${String(n).padStart(3, "0")}`;
}
// Rencana Audit lolos gate Penjadwalan Entry Meeting: disetujui Ketua + checklist 5/5 dikonfirmasi auditor
function rencanaSiapJadwal(r: RencanaItem): boolean {
  return r.status === "Disetujui" && !!r.siapJadwal && (r.checklist ?? []).filter(Boolean).length === CHECKLIST_RENCANA.length;
}
// Entry Meeting aktif (bukan Batal) yang terkait eksplisit ke nomor Rencana Audit
function entryMeetingOf(rapatList: Rapat[], auditNo: string): Rapat | undefined {
  return rapatList.find(x => x.auditNo === auditNo && x.status !== "Batal");
}

// ── Store bersama siklus lapangan (auditor ⇄ auditee) ───────────────────────
type DraftTemuan = { unit: string; no: string; temuan: string; tglKirim: string; disposisi: string; catatanAuditor: string; catatanAuditee: string; auditNo?: string; kategori?: string; tingkat?: string; revisiKe?: number };
const DRAFT_AWAL: DraftTemuan[] = [
  { unit: "BAAK", no: "DT-001", temuan: "SOP Penerimaan Mahasiswa Tidak Diperbarui", tglKirim: "15 Mei 2025", disposisi: "Setuju",     catatanAuditor: "Mohon SOP direvisi sesuai regulasi terbaru", catatanAuditee: "Akan diperbarui pada Q3 2025" },
  { unit: "BAAK", no: "DT-002", temuan: "Arsip Mahasiswa Keluar Tidak Terstruktur",  tglKirim: "15 Mei 2025", disposisi: "Keberatan",  catatanAuditor: "Arsip perlu ditata ulang per angkatan", catatanAuditee: "Mengajukan klarifikasi data tambahan" },
  { unit: "Sarpras", no: "DT-003", temuan: "Aset Gedung Tidak Tercatat di SIMAK",    tglKirim: "18 Mei 2025", disposisi: "Menunggu",   catatanAuditor: "Segera lengkapi pencatatan aset", catatanAuditee: "—" },
  { unit: "Sarpras", no: "DT-004", temuan: "Belanja Modal Tanpa Berita Acara",       tglKirim: "18 Mei 2025", disposisi: "Setuju",     catatanAuditor: "Lampirkan berita acara setiap belanja modal", catatanAuditee: "BA sedang disiapkan" },
];
type DokLink = Record<string, { name: string; url: string }>;
// Persetujuan tanggal Entry Meeting per rapat (id rapat → pihak yang sudah setuju)
type JadwalSetuju = Record<number, { auditor?: boolean; auditee?: boolean }>;
type PenutupanAudit = { status: "Open" | "Close"; tgl: string; oleh: string; residualKe?: string };
type ResidualRisk = { id: string; auditNo: string; unit: string; uraian: string; kategori: string; tingkat: string; tgl: string };
interface LapanganCtxType {
  penutupan: Record<string, PenutupanAudit>; setPenutupan: React.Dispatch<React.SetStateAction<Record<string, PenutupanAudit>>>;
  residualList: ResidualRisk[]; setResidualList: React.Dispatch<React.SetStateAction<ResidualRisk[]>>;
  draftList: DraftTemuan[]; setDraftList: React.Dispatch<React.SetStateAction<DraftTemuan[]>>;
  uploadDocs: DokLink; setUploadDocs: React.Dispatch<React.SetStateAction<DokLink>>;
  jadwalSetuju: JadwalSetuju; setJadwalSetuju: React.Dispatch<React.SetStateAction<JadwalSetuju>>;
}
const LapanganCtx = createContext<LapanganCtxType>({
  penutupan: {}, setPenutupan: () => {}, residualList: [], setResidualList: () => {},
  draftList: DRAFT_AWAL, setDraftList: () => {}, uploadDocs: {}, setUploadDocs: () => {}, jadwalSetuju: {}, setJadwalSetuju: () => {},
});
const DOK_DIPERLUKAN = ["Struktur Organisasi Unit", "SOP / Pedoman Unit", "Daftar Dokumen Pendukung"];

type NavFn = (module: string, section: string, subSection: string, suratTab?: "Masuk" | "Keluar") => void;
const NavCtx = createContext<NavFn>(() => {});
type NotifPayload = { title: string; body: string; tag: string; roles: string[]; unit?: string };
const NotifyCtx = createContext<(n: NotifPayload) => void>(() => {});

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
const IconBook       = Ic("M18 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zM6 4h5v8l-2.5-1.5L6 12V4z");
const IconAlert      = Ic("M1 21h22L12 2 1 21zm12-3h-2v-2h2v2zm0-4h-2v-4h2v4z");
const IconClock      = Ic("M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z");
const IconDoc        = Ic("M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z");
const IconCalendar   = Ic("M20 3h-1V1h-2v2H7V1H5v2H4c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 18H4V8h16v13z");
const IconSettings   = Ic("M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.09.63-.09.94s.02.64.07.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z");
const IconDashboard  = Ic("M3 13h8V3H3v10zm0 8h8v-6H3v6zm10 0h8V11h-8v10zm0-18v6h8V3h-8z");
const IconLogout     = Ic("M17 7l-1.41 1.41L18.17 11H8v2h10.17l-2.58 2.58L17 17l5-5zM4 5h8V3H4c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h8v-2H4V5z");
const IconWallet     = Ic("M21 7.28V5c0-1.1-.9-2-2-2H5C3.9 3 3 3.9 3 5v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.28A2 2 0 0 0 22 15v-6a2 2 0 0 0-1-1.72zM20 9v6h-7V9h7zM5 19V5h14v2h-6c-1.1 0-2 .9-2 2v6c0 1.1.9 2 2 2h6v2H5z M16 13.5c.83 0 1.5-.67 1.5-1.5s-.67-1.5-1.5-1.5-1.5.67-1.5 1.5.67 1.5 1.5 1.5z");

// ── Tombol aksi ikon (mata = detail, pensil = edit, rantai = tautan, tempat sampah = hapus, X merah = batalkan, centang hijau = setujui) ──
type AksiKind = "detail" | "edit" | "link" | "hapus" | "batal" | "setujui";
const AKSI_STYLE: Record<AksiKind, string> = {
  detail:  "border-gray-200 text-gray-400 hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500",
  edit:    "border-gray-200 text-gray-400 hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500",
  link:    "border-teal-100 text-teal-500 hover:bg-teal-50 hover:border-teal-200 hover:text-teal-700",
  hapus:   "border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600",
  batal:   "border-red-100 text-red-400 hover:bg-red-50 hover:border-red-200 hover:text-red-600",
  setujui: "border-green-100 text-green-500 hover:bg-green-50 hover:border-green-200 hover:text-green-700",
};
const AKSI_ACTIVE: Record<AksiKind, string> = {
  detail:  "bg-blue-50 border-blue-200 text-blue-600",
  edit:    "bg-amber-50 border-amber-200 text-amber-600",
  link:    "bg-teal-50 border-teal-200 text-teal-700",
  hapus:   "bg-red-50 border-red-200 text-red-600",
  batal:   "bg-red-50 border-red-200 text-red-600",
  setujui: "bg-green-500 border-green-500 text-white",
};
function AksiSvg({ kind }: { kind: AksiKind }) {
  const p = { viewBox: "0 0 16 16", className: "w-3.5 h-3.5", fill: "none", stroke: "currentColor", strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (kind === "detail")  return <svg {...p} strokeWidth="1.5"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>;
  if (kind === "edit")    return <svg {...p} strokeWidth="1.5"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg>;
  if (kind === "link")    return <svg {...p} strokeWidth="1.5"><path d="M6.5 9.5a3.5 3.5 0 0 0 4.95 0l1.41-1.41a3.5 3.5 0 0 0-4.95-4.95L7.09 4.5"/><path d="M9.5 6.5a3.5 3.5 0 0 0-4.95 0L3.14 7.91a3.5 3.5 0 0 0 4.95 4.95L9.91 11.5"/></svg>;
  if (kind === "hapus")   return <svg {...p} strokeWidth="1.5"><path d="M2.5 4h11"/><path d="M6 4V2.5h4V4"/><path d="M3.75 4l.75 9.5h7l.75-9.5"/><path d="M6.5 7v4M9.5 7v4"/></svg>;
  if (kind === "batal")   return <svg {...p} strokeWidth="2"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg>;
  return <svg {...p} strokeWidth="2"><polyline points="2.5,8.5 6.5,12.5 13.5,4"/></svg>;
}
function AksiBtn({ kind, title, onClick, href, disabled, active, className = "" }: {
  kind: AksiKind; title: string; onClick?: () => void; href?: string | null; disabled?: boolean; active?: boolean; className?: string;
}) {
  const cls = `w-7 h-7 flex-shrink-0 inline-flex items-center justify-center rounded-lg border transition-colors disabled:opacity-30 disabled:cursor-not-allowed ${active ? AKSI_ACTIVE[kind] : AKSI_STYLE[kind]} ${className}`;
  if (href) return <a href={href} target="_blank" rel="noreferrer" title={title} aria-label={title} className={cls}><AksiSvg kind={kind} /></a>;
  return <button type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled} aria-pressed={active} className={cls}><AksiSvg kind={kind} /></button>;
}

// ── Static data ───────────────────────────────────────────────────────────────

const rtlData    = [{ name: "Selesai", value: 18, color: "#22c55e" }, { name: "Proses", value: 14, color: "#f59e0b" }, { name: "Terlambat", value: 6, color: "#ef4444" }];
const auditBar   = [{ name: "Perencanaan", value: 12 }, { name: "Pelaksanaan", value: 18 }, { name: "Pelaporan", value: 14 }, { name: "Tindak Lanjut", value: 9 }];
const suratData  = [{ name: "Surat Masuk", value: 22, color: "#3b82f6" }, { name: "Surat Keluar", value: 28, color: "#14b8a6" }, { name: "Disposisi", value: 6, color: "#f59e0b" }];

function buildRisikoStats(list: TemuanRisiko[]) {
  const risikoDonut = [
    { name: "Tinggi", value: list.filter(t => t.tingkat === "Tinggi").length, color: "#ef4444" },
    { name: "Sedang", value: list.filter(t => t.tingkat === "Sedang").length, color: "#f59e0b" },
    { name: "Rendah", value: list.filter(t => t.tingkat === "Rendah").length, color: "#22c55e" },
  ];
  const units = Array.from(new Set(list.map(t => t.unit)));
  const risikoPerUnit = units.map(unit => ({
    unit,
    tinggi: list.filter(t => t.unit === unit && t.tingkat === "Tinggi").length,
    sedang: list.filter(t => t.unit === unit && t.tingkat === "Sedang").length,
    rendah: list.filter(t => t.unit === unit && t.tingkat === "Rendah").length,
  })).sort((a, b) => (b.tinggi * 100 + b.sedang * 10 + b.rendah) - (a.tinggi * 100 + a.sedang * 10 + a.rendah));
  return { risikoDonut, risikoPerUnit, totalTemuan: list.length };
}

const auditTahapDonut = [
  { name: "Rencana",      value: 1, color: "#cbd5e1" },
  { name: "Entry Meeting",value: 1, color: "#3b82f6" },
  { name: "KKA",          value: 1, color: "#0e8080" },
  { name: "Draft Temuan", value: 1, color: "#f5a623" },
];
const auditPerUnit = [
  { unit: "Sarpras",       progress: 50, tahap: "KKA",          color: "#0e8080" },
  { unit: "BAAK",          progress: 75, tahap: "Draft Temuan",  color: "#f5a623" },
  { unit: "BAUK",          progress: 20, tahap: "Entry Meeting", color: "#3b82f6" },
  { unit: "LPM",           progress: 8,  tahap: "Rencana",       color: "#cbd5e1" },
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
  { unit: "LPM",           selesai: 1, berjalan: 0, rencana: 1 },
  { unit: "BAUK",          selesai: 0, berjalan: 1, rencana: 0 },
];
const rtlPerUnit = [
  { unit: "Marcomm",       selesai: 0, proses: 1, terlambat: 1 },
  { unit: "LPPM",          selesai: 1, proses: 2, terlambat: 1 },
  { unit: "Sarpras",       selesai: 2, proses: 1, terlambat: 1 },
  { unit: "Fak. Teknik",   selesai: 3, proses: 1, terlambat: 0 },
  { unit: "BAAK",          selesai: 0, proses: 1, terlambat: 0 },
  { unit: "LPM",           selesai: 1, proses: 0, terlambat: 0 },
];

// Radar data — risk profile per unit (4 dimensions)
const risikoRadarUnits = [
  { unit: "BAUK",          Keuangan: 3, Operasional: 1, Kepatuhan: 1, Teknologi: 0 },
  { unit: "Sarpras",       Keuangan: 1, Operasional: 3, Kepatuhan: 1, Teknologi: 0 },
  { unit: "BAAK",          Keuangan: 0, Operasional: 1, Kepatuhan: 2, Teknologi: 1 },
  { unit: "LPPM",          Keuangan: 0, Operasional: 2, Kepatuhan: 1, Teknologi: 0 },
  { unit: "LPM",           Keuangan: 2, Operasional: 0, Kepatuhan: 1, Teknologi: 0 },
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
  { unit: "BAUK",          mulai: 18, durasi: 35, tahap: "Entry Meeting", color: "#3b82f6" },
  { unit: "LPM",           mulai: 28, durasi: 30, tahap: "Rencana",       color: "#cbd5e1" },
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
  { tahun: "2022", FakTeknik: 4, LPPM: 0, BAAK: 0, Sarpras: 5, BAUK: 0, LPM: 0 },
  { tahun: "2023", FakTeknik: 4, LPPM: 0, BAAK: 3, Sarpras: 0, BAUK: 0, LPM: 2 },
  { tahun: "2024", FakTeknik: 2, LPPM: 3, BAAK: 0, Sarpras: 3, BAUK: 0, LPM: 0 },
  { tahun: "2025", FakTeknik: 3, LPPM: 2, BAAK: 2, Sarpras: 4, BAUK: 0, LPM: 0 },
];
const riwayatLineColors = ["#0e8080","#f5a623","#3b82f6","#ef4444","#8b5cf6","#22c55e"];
const riwayatLineUnits = [
  { key: "FakTeknik",      label: "Fak. Teknik" },
  { key: "LPPM",           label: "LPPM" },
  { key: "BAAK",           label: "BAAK" },
  { key: "Sarpras",        label: "Sarpras" },
  { key: "BAUK",           label: "BAUK" },
  { key: "LPM",            label: "LPM" },
];

// Kalender heatmap data (May 2025, intensity per day)
const kalHeatmap: Record<number, number> = {
  1:1, 5:3, 8:1, 10:3, 12:2, 15:3, 18:2, 19:2, 20:2, 22:3, 23:1, 26:3, 28:2, 31:2,
};

// Activity heatmap — full year 2025 (month 1-12 → day → intensity 0-3)
const yearActivity: Record<number, Record<number, number>> = {
  1:  { 6:1, 8:2, 13:1, 15:2, 20:1, 22:2, 27:1, 29:3 },
  2:  { 3:1, 7:2, 10:1, 14:3, 17:1, 21:2, 24:2, 28:3 },
  3:  { 3:2, 5:1, 10:3, 12:2, 17:2, 19:1, 24:3, 26:1, 31:2 },
  4:  { 2:1, 7:2, 9:1, 14:3, 16:2, 21:2, 23:1, 28:3 },
  5:  { 1:1, 5:3, 8:1, 10:3, 12:2, 15:3, 18:2, 19:2, 20:2, 22:3, 23:1, 26:3, 28:2, 31:2 },
  6:  { 2:1, 5:2, 9:1, 12:3, 16:2, 19:2, 23:1, 26:3, 30:1 },
  7:  { 1:1, 4:2, 7:1, 10:3, 14:2, 17:2, 21:1, 24:3, 28:2, 31:1 },
  8:  { 4:2, 7:1, 11:3, 13:1, 18:2, 20:1, 25:3, 27:2 },
  9:  { 1:1, 4:2, 8:3, 10:1, 15:2, 17:1, 22:3, 24:2, 29:1 },
  10: { 1:1, 6:2, 8:3, 13:1, 16:2, 20:1, 23:3, 27:2, 29:1 },
  11: { 3:1, 6:2, 10:3, 12:1, 17:2, 19:1, 24:3, 26:2 },
  12: { 1:1, 4:2, 8:3, 10:1, 15:2, 17:1, 22:3, 24:2, 29:1 },
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
  { unit: "BAUK",          risiko: 3, dampak: 5, temuan: 3 },
  { unit: "BAAK",          risiko: 3, dampak: 3, temuan: 2 },
  { unit: "LPPM",          risiko: 2, dampak: 3, temuan: 2 },
  { unit: "LPM",           risiko: 4, dampak: 2, temuan: 1 },
  { unit: "Marcomm",       risiko: 1, dampak: 2, temuan: 1 },
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

const auditRows = [
  { no: 1, unit: "Fak. Teknik",        jenis: "Kinerja",    status: "Pelaksanaan",   progress: 65 },
  { no: 2, unit: "LPPM",              jenis: "Kepatuhan",  status: "Pelaporan",     progress: 90 },
  { no: 3, unit: "BAAK",              jenis: "Kinerja",    status: "Perencanaan",   progress: 30 },
  { no: 4, unit: "S1-Manajemen",      jenis: "Kepatuhan",  status: "Verifikasi RTL",progress: 45 },
];
const rtlRows = [
  { no: 1, unit: "Marcomm",        temuan: "SOP Tidak Lengkap",      tgl: "10 Mei 2025" },
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
    kategori: "1", label: "Audit & Assurance", icon: "",
    accent: "#3b82f6", lightBg: "#eff6ff", textCls: "text-blue-600",
    items: [
      { kode:"1a", label:"Realisasi Program Audit Tahunan",       target:90,  bobot:4, real:87, arah:"atas"  },
      { kode:"1b", label:"Audit Selesai Tepat Waktu",             target:90,  bobot:4, real:92, arah:"atas"  },
      { kode:"1c", label:"LHA Diterbitkan Tepat Waktu",           target:90,  bobot:4, real:85, arah:"atas"  },
      { kode:"1d", label:"Unit Diaudit Sesuai Rencana",           target:100, bobot:3, real:90, arah:"atas"  },
    ],
  },
  {
    kategori: "2", label: "Kepatuhan & Tata Kelola", icon: "",
    accent: "#0e8080", lightBg: "#f0fdfa", textCls: "text-teal-600",
    items: [
      { kode:"2a", label:"Unit Memenuhi Ketentuan Tata Kelola",   target:85,  bobot:4, real:82, arah:"atas"  },
      { kode:"2b", label:"Kelengkapan Dokumen Tata Kelola",       target:90,  bobot:4, real:88, arah:"atas"  },
      { kode:"2c", label:"Kepatuhan terhadap SOP",               target:85,  bobot:4, real:83, arah:"atas"  },
      { kode:"2d", label:"Temuan Ketidakpatuhan",                target:10,  bobot:3, real:8,  arah:"bawah" },
    ],
  },
  {
    kategori: "3", label: "Pengendalian Internal", icon: "",
    accent: "#7c3aed", lightBg: "#f5f3ff", textCls: "text-purple-600",
    items: [
      { kode:"3a", label:"Unit dengan Pengendalian Memadai",      target:80,  bobot:4, real:78, arah:"atas"  },
      { kode:"3b", label:"Kelemahan Pengendalian Diperbaiki",     target:80,  bobot:4, real:82, arah:"atas"  },
      { kode:"3c", label:"Unit Melaksanakan Self-Assessment",     target:80,  bobot:4, real:75, arah:"atas"  },
    ],
  },
  {
    kategori: "4", label: "Manajemen Risiko", icon: "",
    accent: "#f59e0b", lightBg: "#fffbeb", textCls: "text-amber-600",
    items: [
      { kode:"4a", label:"Unit Memiliki Risk Register",           target:100, bobot:4, real:100, arah:"atas" },
      { kode:"4b", label:"Risiko Prioritas Memiliki Mitigasi",   target:80,  bobot:4, real:82, arah:"atas"  },
      { kode:"4c", label:"Pelaksanaan Mitigasi Risiko",          target:80,  bobot:4, real:78, arah:"atas"  },
      { kode:"4d", label:"Risiko Tinggi Dimonitor Berkala",      target:100, bobot:3, real:95, arah:"atas"  },
    ],
  },
  {
    kategori: "5", label: "Tindak Lanjut Audit", icon: "",
    accent: "#22c55e", lightBg: "#f0fdf4", textCls: "text-green-600",
    items: [
      { kode:"5a", label:"Rekomendasi Audit Ditindaklanjuti",    target:80,  bobot:5, real:83, arah:"atas"  },
      { kode:"5b", label:"Temuan Selesai Tepat Waktu",           target:80,  bobot:5, real:78, arah:"atas"  },
      { kode:"5c", label:"Temuan Berulang",                      target:10,  bobot:5, real:8,  arah:"bawah" },
      { kode:"5d", label:"Rekomendasi Diverifikasi SPI",         target:90,  bobot:5, real:91, arah:"atas"  },
    ],
  },
  {
    kategori: "6", label: "Pengawasan Keuangan & Aset", icon: "",
    accent: "#0ea5e9", lightBg: "#f0f9ff", textCls: "text-sky-600",
    items: [
      { kode:"6a", label:"LPJ Lengkap dan Tepat Waktu",          target:90,  bobot:3, real:88, arah:"atas"  },
      { kode:"6b", label:"Kesesuaian Realisasi dengan RAB",      target:90,  bobot:3, real:91, arah:"atas"  },
      { kode:"6c", label:"Tindak Lanjut Temuan Keuangan",        target:90,  bobot:3, real:87, arah:"atas"  },
      { kode:"6d", label:"Aset Terinventarisasi",                target:95,  bobot:3, real:92, arah:"atas"  },
    ],
  },
  {
    kategori: "7", label: "Kinerja & Efektivitas Organisasi", icon: "",
    accent: "#ec4899", lightBg: "#fdf2f8", textCls: "text-pink-600",
    items: [
      { kode:"7a", label:"Unit Mencapai Target Kinerja",         target:80,  bobot:2, real:76, arah:"atas"  },
      { kode:"7b", label:"Program Mencapai Target Output",       target:80,  bobot:2, real:78, arah:"atas"  },
      { kode:"7c", label:"Rekomendasi Efisiensi Dilaksanakan",   target:80,  bobot:3, real:81, arah:"atas"  },
      { kode:"7d", label:"Rekomendasi Audit Kinerja Ditindaklanjuti", target:80, bobot:4, real:80, arah:"atas" },
    ],
  },
];

type KpiItem = { arah: string; target: number; real: number; bobot: number };
type KpiKategori = { items: KpiItem[] };

const skorItemKpi = (it: KpiItem) =>
  it.arah === "bawah"
    ? (it.real <= it.target ? 100 : Math.max(0, 100 - (it.real - it.target) * 10))
    : Math.min(100, Math.round((it.real / it.target) * 100));

const skorKategoriKpi = (kat: KpiKategori) =>
  Math.round(kat.items.reduce((s, it) => s + skorItemKpi(it), 0) / kat.items.length);

// Indeks komposit = rata-rata skor 7 kategori KPI Pengawasan
function hitungIndeksKomposit(data: KpiKategori[]): number | null {
  const kats = data.filter(k => k.items.length);
  if (!kats.length) return null;
  return Math.round((kats.reduce((s, k) => s + skorKategoriKpi(k), 0) / kats.length) * 10) / 10;
}

// Skala BR-18; tindakan_manajemen nanti dari tabel indeks_kategori
const INDEKS_KATEGORI = [
  { min: 85, max: 100, label: "Sangat Efektif",        tindakan: "Pertahankan dan lakukan perbaikan pada indikator yang belum tercapai" },
  { min: 75, max: 84,  label: "Efektif",               tindakan: "Pertahankan dan lakukan perbaikan pada indikator yang belum tercapai" },
  { min: 60, max: 74,  label: "Perlu Peningkatan",     tindakan: "Pertahankan dan lakukan perbaikan pada indikator yang belum tercapai" },
  { min: 0,  max: 59,  label: "Perlu Perhatian Serius", tindakan: "Pertahankan dan lakukan perbaikan pada indikator yang belum tercapai" },
];
const getKategoriIndeks = (nilai: number) =>
  INDEKS_KATEGORI.find(k => Math.floor(nilai) >= k.min && Math.floor(nilai) <= k.max) ?? INDEKS_KATEGORI[INDEKS_KATEGORI.length - 1];
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
      { label: "Audit",                  sectionKey: "audit",     icon: <IconClipboard  className="w-4 h-4" />, children: ["Rencana Audit", "Penugasan & Jadwal", "Entry Meeting", "Pelaksanaan & Temuan", "Exit Meeting & LHA"] },
      { label: "Risiko",                 sectionKey: "risiko",    icon: <IconShield     className="w-4 h-4" />, children: ["Temuan Risiko", "Pemetaan Risiko"] },
      { label: "RTL",                    sectionKey: "rtl",       icon: <IconCheck      className="w-4 h-4" />, children: ["Rencana Tindak Lanjut", "Monitoring Tindak Lanjut"] },
      { label: "Riwayat Audit per Unit", sectionKey: "riwayat",   icon: <IconFolder     className="w-4 h-4" />, children: ["Riwayat per Unit", "Temuan Berulang"] },
      { label: "Regulasi & SOP",         sectionKey: "regulasi",  icon: <IconBook       className="w-4 h-4" />, children: ["Pedoman Audit", "Peraturan Internal"] },
      { label: "Kalender Pengawasan",    sectionKey: "kalender",  icon: <IconCalendar   className="w-4 h-4" />, children: ["Kalender Pengawasan", "Siklus Audit"] },
    ],
  },
  {
    key: "backoffice",
    section: "MODUL BACK OFFICE SPI",
    items: [
      // Siklus utama mengikuti flowchart: Perencanaan (Universe → Risk Register → PKPT → Persiapan) → Administrasi → Kalender;
      // menu pendukung (SDM, Regulasi & SOP, Anggaran) berada paling bawah, tetap dalam modul Back Office tanpa sub-judul
      { label: "Ringkasan",         sectionKey: "R", icon: <IconDashboard className="w-4 h-4" />, children: [] },
      { label: "Perencanaan Audit", sectionKey: "B", icon: <IconClipboard className="w-4 h-4" />, children: ["Audit Universe", "Risk Register", "PKPT", "Persiapan Audit"] },
      { label: "Administrasi",      sectionKey: "A", icon: <IconMail      className="w-4 h-4" />, children: ["Surat Masuk & Keluar", "Arsip Dokumen Audit"] },
      { label: "Kalender",          sectionKey: "F", icon: <IconCalendar  className="w-4 h-4" />, children: [] },
      { label: "Manajemen SDM",     sectionKey: "C", icon: <IconGroup     className="w-4 h-4" />, children: ["Kompetensi Auditor", "Riwayat Penugasan", "Jadwal Pelatihan"] },
      { label: "Regulasi & SOP",    sectionKey: "D", icon: <IconFolder    className="w-4 h-4" />, children: ["Pedoman Audit", "Peraturan Internal"] },
      { label: "Perencanaan Anggaran", sectionKey: "G", icon: <IconWallet className="w-4 h-4" />, children: ["Rencana Anggaran", "Realisasi Anggaran", "Laporan Keuangan"] },
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

function ConfirmModal({ message, confirmLabel = "Ya, Hapus", onConfirm, onCancel }: {
  message: string; confirmLabel?: string; onConfirm: () => void; onCancel: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }}
      onClick={onCancel}>
      <div className="bg-white rounded-2xl shadow-2xl w-72 mx-4 p-6 text-center" onClick={e => e.stopPropagation()}>
        <div className="text-3xl mb-3"></div>
        <div className="text-sm font-bold text-gray-800 mb-1">{message}</div>
        <div className="text-xs text-gray-400 mb-5">Tindakan ini tidak dapat dibatalkan.</div>
        <div className="flex gap-2">
          <button onClick={onCancel}
            className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
            Batal
          </button>
          <button onClick={onConfirm}
            className="flex-1 text-xs font-semibold py-2 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors">
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>
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
      <AksiBtn kind="detail" title="Lihat Detail" className="mt-auto" />
    </div>
  );
}

// ── Pengawasan section data ───────────────────────────────────────────────────

const pwSections = [
  { key: "ringkasan", label: "Ringkasan",              icon: "" },
  { key: "audit",     label: "Audit",                  icon: "" },
  { key: "risiko",    label: "Risiko",                 icon: "" },
  { key: "rtl",       label: "RTL",                    icon: "" },
  { key: "riwayat",   label: "Riwayat Audit per Unit", icon: "" },
  { key: "regulasi",  label: "Regulasi & SOP",         icon: "" },
  { key: "kalender",  label: "Kalender Pengawasan",    icon: "" },
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

  const katScore = skorKategoriKpi;

  const popupData = kpiData.find(k => k.kategori === popupKat) ?? null;

  return (
    <div className="flex flex-col gap-3">
      {/* Header + indeks */}
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-bold text-gray-700">KPI Pengawasan — 7 Kategori · 25 Indikator</h3>
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
  const [chartDetail, setChartDetail] = useState<string|null>(null);
  const navigateTo = useContext(NavCtx);
  const { temuanList, rtlList } = useContext(TemuanCtx);
  const { risikoDonut, risikoPerUnit, totalTemuan } = buildRisikoStats(temuanList);
  return (
    <div className="flex flex-col gap-4">
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}></div>
          <div>
            <div className="text-sm font-black text-purple-800">Unit: {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Anda masuk sebagai auditee. Hanya data yang berkaitan dengan unit <strong>{myUnit}</strong> yang ditampilkan.</div>
          </div>
        </div>
      )}
      {/* ── KPI 7 Kategori (non-auditee only) ── */}
      {!myUnit && <KpiPengawasanPanel />}

      {/* ── 4 module summary charts (non-auditee) ── */}
      {!myUnit && (() => {
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Chart 1 — Risiko */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartDetail("risiko")}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700">Risiko — Sebaran Tingkat</h3>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>{totalTemuan} Temuan</span>
              </div>
              <div className="flex items-center gap-3 mb-4">
                <ResponsiveContainer width="38%" height={110}>
                  <PieChart>
                    <Pie data={risikoDonut} cx="50%" cy="50%" innerRadius={32} outerRadius={48} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                      {risikoDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                    </Pie>
                    <text x="50%" y="45%" textAnchor="middle" fontSize="15" fontWeight="700" fill="#1e293b">{totalTemuan}</text>
                    <text x="50%" y="58%" textAnchor="middle" fontSize="7.5" fill="#64748b">Risiko</text>
                  </PieChart>
                </ResponsiveContainer>
                <div className="flex-1 flex flex-col gap-1.5">
                  {risikoDonut.map(d => (
                    <div key={d.name} className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: d.color }} />
                      <span className="text-[10px] text-gray-600 flex-1">{d.name}</span>
                      <span className="text-[10px] font-bold text-gray-700">{d.value}</span>
                      <span className="text-[9px] text-gray-400">({Math.round(d.value / Math.max(totalTemuan, 1) * 100)}%)</span>
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
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartDetail("audit")}>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-gray-700">Audit — Progress Berjalan</h3>
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
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartDetail("rtl")}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-700">RTL — Status per Unit Kerja</h3>
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
                <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm cursor-pointer hover:shadow-md transition-shadow" onClick={() => setChartDetail("riwayat")}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-xs font-bold text-gray-700">Riwayat Audit per Unit</h3>
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
        const auditeeRisiko = temuanList.filter(t => t.unit === myUnit);
        const rtlAuditee = rtlList.filter(r => r.unit === myUnit).map(r => ({
          no: r.id, rekomendasi: r.rencana, batas: r.target,
          tlStatus: rtlTlStatus(r),
        }));

        const auditBerjalan = { nama: "Audit Kepatuhan 2025", ketua: "Budi Santoso, S.E.", mulai: "1 Apr 2025", perkiraan: "30 Jun 2025", tahap: "Lapangan", progres: 65 };
        const auditSelesai  = [
          { nama: "Audit Kepatuhan 2023", ketua: "Ratna Dewi, M.Ak.", selesai: "Des 2023", temuan: 3, rtlSelesai: 3 },
          { nama: "Audit Kinerja 2022",   ketua: "Budi Santoso, S.E.",selesai: "Okt 2022", temuan: 2, rtlSelesai: 2 },
        ];

        const tingkatColor = (t: string) => t === "Tinggi" ? "bg-red-50 text-red-600" : t === "Sedang" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600";
        const statusRtlColor = (s: string) => s === "Selesai" ? "bg-green-50 text-green-600" : s === "Proses" ? "bg-blue-50 text-blue-600" : s === "Terlambat" ? "bg-red-50 text-red-600" : s === "Menunggu Verifikasi" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500";

        return (
          <div className="flex flex-col gap-4">
            {/* Stepper 8 tahap */}
            {(() => {
              const tahapAktif = 2; // Draft Temuan
              const steps: { label: string; nav: [string, string, string] }[] = [
                { label: "Pemberitahuan",      nav: ["pengawasan", "audit", "Pemberitahuan & Jadwal"] },
                { label: "Entry Meeting",      nav: ["pengawasan", "audit", "Entry Meeting"] },
                { label: "Draft Temuan",       nav: ["pengawasan", "audit", "Draft Temuan & Konfirmasi"] },
                { label: "KKA",                nav: ["pengawasan", "audit", "Draft Temuan & Konfirmasi"] },
                { label: "Exit Meeting & LHA", nav: ["pengawasan", "audit", "Exit Meeting"] },
                { label: "RTL",                nav: ["pengawasan", "rtl", "Tindak Lanjut (RTL)"] },
                { label: "Pemantauan",         nav: ["pengawasan", "kalender", "Kalender Pengawasan"] },
                { label: "Riwayat",            nav: ["pengawasan", "riwayat", ""] },
              ];
              return (
                <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-xs font-bold text-gray-700">Alur Tahapan Pengawasan</h4>
                    <span className="text-[9px] text-gray-400">Klik tahap untuk membuka menu terkait</span>
                  </div>
                  <ol className="flex items-start overflow-x-auto pb-1">
                    {steps.map((s, i) => {
                      const done = i < tahapAktif;
                      const active = i === tahapAktif;
                      return (
                        <li key={s.label} className="flex items-start flex-1 min-w-[84px]">
                          <button onClick={() => navigateTo(...s.nav)}
                            aria-current={active ? "step" : undefined}
                            className="flex flex-col items-center gap-1.5 w-full group">
                            <span className={`w-8 h-8 rounded-full flex items-center justify-center text-[11px] font-bold transition-all group-hover:scale-110 ${active ? "text-white ring-4 ring-purple-100" : done ? "bg-purple-100 text-purple-700" : "bg-gray-100 text-gray-400 group-hover:bg-gray-200"}`}
                              style={active ? { background: "#7c3aed" } : {}}>
                              {done ? "✓" : i + 1}
                            </span>
                            <span className={`text-[10px] leading-tight text-center px-1 ${active ? "font-bold text-purple-700" : done ? "font-semibold text-gray-600" : "text-gray-400"}`}>{s.label}</span>
                            {active && <span className="text-[8px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">Sedang berjalan</span>}
                          </button>
                          {i < steps.length - 1 && (
                            <span className={`h-0.5 w-4 mt-4 flex-shrink-0 rounded-full ${i < tahapAktif ? "bg-purple-300" : "bg-gray-200"}`} />
                          )}
                        </li>
                      );
                    })}
                  </ol>
                </div>
              );
            })()}

            {/* KPI strip auditee */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Audit Aktif",       val: 1,   color: "text-purple-600" },
                { label: "Total Temuan",       val: auditeeRisiko.length, color: "text-amber-600" },
                { label: "RTL Selesai",        val: rtlAuditee.filter(r => r.tlStatus === "Close").length,  color: "text-green-600"  },
                { label: "RTL Belum Selesai",  val: rtlAuditee.filter(r => r.tlStatus !== "Close").length,  color: "text-amber-600"    },
              ].map(s => (
                <div key={s.label} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
                  <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Risiko per kategori — klik untuk ke menu Risiko */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                { k: "Keuangan",    c: "#8b5cf6" },
                { k: "Operasional", c: "#f97316" },
                { k: "Kepatuhan",   c: "#0e8080" },
                { k: "Teknologi",   c: "#0ea5e9" },
              ].map(({ k, c }) => {
                const items = auditeeRisiko.filter(t => t.kategori === k);
                const tinggi = items.filter(t => t.tingkat === "Tinggi").length;
                return (
                  <button key={k} onClick={() => navigateTo("pengawasan", "risiko", "Temuan Risiko")}
                    className="group text-left bg-white rounded-xl border border-gray-100 p-3 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all"
                    style={{ borderTop: `3px solid ${c}` }}>
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold uppercase tracking-wide" style={{ color: c }}>{k}</span>
                      <span className="text-[10px] text-gray-300 group-hover:text-gray-500 transition-colors">→</span>
                    </div>
                    <div className="text-2xl font-black text-gray-800 mt-1">{items.length}</div>
                    <div className="text-[10px] text-gray-400">Temuan{tinggi > 0 && <span className="text-red-500 font-semibold"> · {tinggi} Tinggi</span>}</div>
                  </button>
                );
              })}
            </div>

            {/* Audit berjalan */}
            <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700">Audit Sedang Berjalan</h4>
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
                <h4 className="text-xs font-bold text-gray-700 mb-3">Temuan Risiko Unit {myUnit}</h4>
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
              <h4 className="text-xs font-bold text-gray-700 mb-3">Tindak Lanjut Rekomendasi (RTL) — {myUnit}</h4>
              <div className="flex flex-col gap-3">
                {rtlAuditee.length === 0 && <div className="text-center py-4 text-xs text-gray-400">Belum ada RTL untuk unit ini.</div>}
                {rtlAuditee.map(r => (
                  <div key={r.no} className="flex flex-col gap-1.5 p-3 rounded-xl border border-gray-100">
                    <div className="flex items-start gap-2">
                      <span className="text-[9px] font-mono text-gray-400 flex-shrink-0 mt-0.5">#{r.no}</span>
                      <div className="flex-1 text-xs text-gray-700 font-medium leading-snug">{r.rekomendasi}</div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${TL_STATUS_STYLE[r.tlStatus].cls}`}>{r.tlStatus}</span>
                    </div>
                    <div className="text-[10px] text-gray-400 pl-4">
                      Batas: {r.batas}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Riwayat audit selesai */}
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-gray-700 mb-3">Riwayat Audit Unit {myUnit}</h4>
              <div className="flex flex-col gap-2">
                {auditSelesai.map((a, i) => (
                  <div key={i} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 bg-gray-50">
                    <span className="text-xl"></span>
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

      {chartDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setChartDetail(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4"
              style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
              <div className="text-sm font-black text-white">
                {chartDetail === "risiko"  && "Detail Sebaran Risiko"}
                {chartDetail === "audit"   && "Detail Progress Audit"}
                {chartDetail === "rtl"     && "Detail Status RTL"}
                {chartDetail === "riwayat" && "Detail Riwayat Audit per Unit"}
              </div>
              <button onClick={() => setChartDetail(null)} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold">✕</button>
            </div>
            <div className="p-5">
              {chartDetail === "risiko" && (
                <div className="flex flex-col gap-3">
                  {[
                    { unit:"BAUK",    tinggi:2, sedang:1, rendah:0 },
                    { unit:"BAAK",    tinggi:1, sedang:1, rendah:1 },
                    { unit:"Sarpras", tinggi:1, sedang:1, rendah:0 },
                  ].map(r => {
                    const total = r.tinggi + r.sedang + r.rendah;
                    return (
                      <div key={r.unit} className="bg-gray-50 rounded-xl p-3">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-bold text-gray-700">{r.unit}</span>
                          <span className="text-[9px] text-gray-400">{total} risiko</span>
                        </div>
                        <div className="flex gap-2 text-[9px]">
                          {r.tinggi > 0 && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">{r.tinggi} Tinggi</span>}
                          {r.sedang > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">{r.sedang} Sedang</span>}
                          {r.rendah > 0 && <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">{r.rendah} Rendah</span>}
                        </div>
                      </div>
                    );
                  })}
                  <div className="bg-red-50 rounded-xl p-3 border border-red-100 text-[10px] text-red-700">3 risiko tinggi memerlukan tindak lanjut segera</div>
                </div>
              )}
              {chartDetail === "audit" && (
                <div className="flex flex-col gap-3">
                  {[
                    { unit:"BAAK",    tahap:"Laporan",      progress:90, color:"#22c55e" },
                    { unit:"Sarpras", tahap:"Lapangan",     progress:60, color:"#3b82f6" },
                    { unit:"BAUK",    tahap:"Entry Meeting", progress:20, color:"#3b82f6" },
                    { unit:"LPPM",    tahap:"Selesai",      progress:100,color:"#22c55e" },
                  ].map(a => (
                    <div key={a.unit} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700">{a.unit}</span>
                        <span className="text-[9px] font-semibold px-2 py-0.5 rounded-full" style={{ background:`${a.color}18`, color:a.color }}>{a.tahap}</span>
                      </div>
                      <div className="h-2.5 bg-gray-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width:`${a.progress}%`, background:a.color }} />
                      </div>
                      <div className="text-right text-[9px] text-gray-400 mt-1">{a.progress}%</div>
                    </div>
                  ))}
                </div>
              )}
              {chartDetail === "rtl" && (
                <div className="flex flex-col gap-3">
                  {[
                    { unit:"BAAK",    selesai:4, proses:2, terlambat:1 },
                    { unit:"Sarpras", selesai:3, proses:1, terlambat:2 },
                    { unit:"LPPM",    selesai:5, proses:0, terlambat:0 },
                    { unit:"BAUK",    selesai:0, proses:3, terlambat:0 },
                  ].map(r => (
                    <div key={r.unit} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-bold text-gray-700">{r.unit}</span>
                        <span className="text-[9px] text-gray-400">{r.selesai+r.proses+r.terlambat} RTL</span>
                      </div>
                      <div className="flex gap-2 text-[9px]">
                        {r.selesai > 0 && <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">{r.selesai} Selesai</span>}
                        {r.proses > 0 && <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 font-semibold">{r.proses} Proses</span>}
                        {r.terlambat > 0 && <span className="px-2 py-0.5 rounded-full bg-red-50 text-red-600 font-semibold">{r.terlambat} Terlambat</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {chartDetail === "riwayat" && (
                <div className="flex flex-col gap-3">
                  {[
                    { unit:"BAAK",       selesai:2, berjalan:1, rencana:0 },
                    { unit:"Sarpras",    selesai:1, berjalan:1, rencana:0 },
                    { unit:"LPPM",       selesai:2, berjalan:0, rencana:0 },
                    { unit:"Fak.Teknik", selesai:0, berjalan:0, rencana:1 },
                    { unit:"BAUK",       selesai:0, berjalan:0, rencana:1 },
                    { unit:"LPM",        selesai:0, berjalan:0, rencana:1 },
                  ].map(r => (
                    <div key={r.unit} className="bg-gray-50 rounded-xl p-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-gray-700">{r.unit}</span>
                        <div className="flex gap-2 text-[9px]">
                          {r.selesai > 0 && <span className="px-2 py-0.5 rounded-full bg-green-50 text-green-600 font-semibold">{r.selesai} Selesai</span>}
                          {r.berjalan > 0 && <span className="px-2 py-0.5 rounded-full bg-amber-50 text-amber-600 font-semibold">{r.berjalan} Berjalan</span>}
                          {r.rencana > 0 && <span className="px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 font-semibold">{r.rencana} Rencana</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PwRisiko({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const activeRisiko = subSection === "Pemetaan Risiko" ? "peta" : "temuan";
  const [detailTemuan, setDetailTemuan] = useState<string | null>(null);
  const [filterRisiko, setFilterRisiko] = useState("Semua");
  const [tambahModal, setTambahModal] = useState<string | null>(null);

  const { temuanList: temuan, rtlList, addTemuan, ajukanRtl } = useContext(TemuanCtx);
  const { rencanaList } = useContext(AuditCtx);
  const [filterAudit, setFilterAudit] = useState("Semua");
  const rtlOf = (id: string) => rtlList.find(x => x.temuanId === id);
  const { risikoDonut, risikoPerUnit, totalTemuan } = buildRisikoStats(temuan);

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

  const baseTemuan = (myUnit ? temuan.filter(r => r.unit === myUnit) : temuan).filter(r => filterAudit === "Semua" || r.auditNo === filterAudit);
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
      {/* Diagram ringkasan risiko (hanya sub menu Temuan Risiko) */}
      {!myUnit && activeRisiko === "temuan" && (
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-xs font-bold text-gray-700">Diagram Risiko — Sebaran per Unit Kerja</h4>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>{totalTemuan} Temuan</span>
          </div>
          <div className="flex items-center gap-4 mb-4">
            <ResponsiveContainer width="30%" height={120}>
              <PieChart>
                <Pie data={risikoDonut} cx="50%" cy="50%" innerRadius={34} outerRadius={52} dataKey="value" startAngle={90} endAngle={-270} strokeWidth={0}>
                  {risikoDonut.map((e, i) => <Cell key={i} fill={e.color} />)}
                </Pie>
                <text x="50%" y="45%" textAnchor="middle" fontSize="16" fontWeight="700" fill="#1e293b">{totalTemuan}</text>
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
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}></div>
          <div>
            <div className="text-sm font-black text-purple-800">Manajemen Risiko — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Menampilkan seluruh temuan risiko dan status tindak lanjut untuk unit <strong>{myUnit}</strong>.</div>
          </div>
        </div>
      )}

      {/* Summary strip (auditee: dipindah ke Ringkasan) */}
      {!myUnit && activeRisiko === "temuan" && <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
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
      </div>}

      {activeRisiko === "temuan" && (
        <div className="flex flex-col gap-4">
          {/* Grouped bar — risiko per unit per dimensi */}
          {!myUnit && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700">Temuan Risiko per Unit & Dimensi</h4>
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
                <select value={filterAudit} onChange={e => setFilterAudit(e.target.value)}
                  className="text-[10px] border border-gray-200 rounded-lg px-2 py-1 text-gray-600 bg-white focus:outline-none focus:border-teal-400">
                  <option value="Semua">Semua Audit</option>
                  {Array.from(new Set((myUnit ? temuan.filter(t => t.unit === myUnit) : temuan).map(t => t.auditNo))).map(no => {
                    const a = rencanaList.find(x => x.no === no);
                    return <option key={no} value={no}>{no}{a ? ` — ${a.unit}` : ""} ({temuan.filter(t => t.auditNo === no).length} temuan)</option>;
                  })}
                </select>
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>{visibleTemuan.length} Temuan</span>
              </div>
            </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {(myUnit ? ["ID","Temuan","Tingkat Risiko","Status","Aksi"] : ["ID","Audit","Unit Kerja","Deskripsi Temuan","Kategori","Tingkat Risiko","Status","RTL"]).map(h => (
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {myUnit && visibleTemuan.map(r => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500">{r.id}</td>
                    <td className="px-4 py-2.5 text-gray-700 font-medium max-w-[320px]"><div className="truncate" title={r.deskripsi}>{r.deskripsi}</div></td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tingkatColor[r.tingkat]}`}>{r.tingkat}</span></td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-2.5">
                      <div className="flex items-center gap-1.5">
                        <AksiBtn kind="detail" title="Lihat Detail" onClick={() => setDetailTemuan(r.id)} />
                        {!rtlOf(r.id) && canEdit && r.status !== "Selesai" && (
                          <button onClick={() => setTambahModal(`tl-${r.id}`)} className="text-[9px] font-bold px-2 py-1 rounded-lg text-white whitespace-nowrap"
                            style={{ background: "var(--tsu-teal)" }}>Tindak Lanjut →</button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {visibleTemuan.length === 0 && (
                  <tr><td colSpan={8} className="py-6 text-center text-xs text-gray-400">Tidak ada temuan untuk filter yang dipilih.</td></tr>
                )}
                {!myUnit && visibleTemuan.map((r) => (
                  <tr key={r.id} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500">{r.id}</td>
                    <td className="px-4 py-2.5 font-mono text-[10px] text-gray-500 whitespace-nowrap">{r.auditNo}</td>
                    <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">{r.unit}</td>
                    <td className="px-4 py-2.5 text-gray-600 max-w-[240px]">
                      {r.deskripsi}
                      {(() => { const x = rtlOf(r.id); return x ? (
                        <div className="mt-1 flex items-start gap-1 text-[9px] text-blue-600 leading-snug">
                          <span className="flex-shrink-0">→</span>
                          <span className="flex-1">{x.rencana} <span className="text-gray-400">· PIC {x.pic} · target {x.target}</span></span>
                        </div>
                      ) : null; })()}
                    </td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${kategoriColor[r.kategori]}`}>{r.kategori}</span></td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tingkatColor[r.tingkat]}`}>{r.tingkat}</span></td>
                    <td className="px-4 py-2.5"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor[r.status]}`}>{r.status}</span></td>
                    <td className="px-4 py-2.5">
                      {(() => {
                        const x = rtlOf(r.id);
                        // Status & dokumen RTL diambil dari menu RTL (dikirim auditee)
                        if (!x) return <span className="text-[9px] text-gray-300 italic whitespace-nowrap">Belum ada RTL</span>;
                        const tl = rtlTlStatus(x);
                        return (
                          <div className="flex items-center gap-1.5">
                            <span title={TL_STATUS_STYLE[tl].desc} className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${TL_STATUS_STYLE[tl].cls}`}>{tl}</span>
                            {x.link ? <AksiBtn kind="link" title="Buka Dokumen RTL" href={x.link} /> : <span className="text-[9px] text-gray-300 italic whitespace-nowrap">Tanpa link</span>}
                          </div>
                        );
                      })()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          </div>
        </div>
      )}

      {(activeRisiko === "peta" || myUnit) && (
        <div className="flex flex-col gap-4">
          {/* Score grid — risiko unit × dimensi */}
          {!myUnit && (
            <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <h4 className="text-xs font-bold text-gray-700">Matriks Risiko per Unit & Dimensi</h4>
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
            <span className="text-base flex-shrink-0">ℹ</span>
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
              {(() => {
                // Posisi [baris kemungkinan, kolom dampak]; temuan tanpa posisi ditempatkan berdasarkan tingkat risiko
                const POS: Record<string, [number, number]> = { "R-003":[0,0], "R-001":[0,1], "R-008":[0,1], "R-002":[0,2], "R-005":[1,0], "R-004":[1,1], "R-006":[1,1], "R-007":[2,0] };
                const posOf = (t: TemuanRisiko): [number, number] => POS[t.id] ?? (t.tingkat === "Tinggi" ? [0,1] : t.tingkat === "Sedang" ? [1,1] : [2,0]);
                const list = myUnit ? temuan.filter(t => t.unit === myUnit) : temuan;
                const colors = [["bg-amber-200","bg-red-200","bg-red-300"],["bg-green-200","bg-amber-200","bg-red-200"],["bg-green-100","bg-green-200","bg-amber-200"]];
                return ["Tinggi","Sedang","Rendah"].map((prob, ri) => (
                  <div key={prob} className="flex items-stretch gap-1 mb-1">
                    <div className="w-20 text-right text-[9px] text-gray-400 pr-2 flex items-center justify-end">{prob}</div>
                    <div className="flex-1 grid grid-cols-3 gap-1">
                      {colors[ri].map((color, ci) => (
                        <div key={ci} className={`${color} rounded-lg p-1.5 min-h-[64px] flex flex-col gap-1`}>
                          {list.filter(t => { const [r, c] = posOf(t); return r === ri && c === ci; }).map(t => (
                            <button key={t.id} onClick={() => setDetailTemuan(t.id)} title={t.deskripsi}
                              className="text-left bg-white/80 hover:bg-white rounded-md px-1.5 py-1 shadow-sm transition-colors">
                              <div className="flex items-center gap-1">
                                <span className="text-[9px] font-mono font-bold text-gray-700">{t.id}</span>
                                <span className={`text-[8px] font-bold px-1 rounded ${kategoriColor[t.kategori] ?? "bg-gray-100 text-gray-500"}`}>{t.kategori}</span>
                              </div>
                              <div className="text-[9px] text-gray-600 leading-tight line-clamp-2 mt-0.5">{t.deskripsi}</div>
                            </button>
                          ))}
                        </div>
                      ))}
                    </div>
                  </div>
                ));
              })()}
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

      {detailTemuan && (() => {
        const t = temuan.find(x => x.id === detailTemuan);
        if (!t) return null;
        const x = rtlOf(t.id);
        const audit = rencanaList.find(a => a.no === t.auditNo);
        const row = (k: string, v: React.ReactNode) => (
          <div className="flex justify-between gap-4 py-2 border-b border-gray-50 last:border-0">
            <span className="text-[10px] text-gray-400 flex-shrink-0">{k}</span>
            <span className="text-[11px] text-gray-700 font-medium text-right">{v}</span>
          </div>
        );
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={() => setDetailTemuan(null)}>
            <div className="absolute inset-0 bg-black/30" />
            <div role="dialog" aria-modal="true" className="relative w-full max-w-md max-h-[85vh] bg-white rounded-2xl shadow-2xl flex flex-col overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="p-5 border-b border-gray-100 flex items-start gap-3">
                <div className="flex-1">
                  <div className="text-[10px] font-mono text-gray-400">{t.id} · {t.auditNo}</div>
                  <h3 className="text-sm font-bold text-gray-800 mt-1 leading-snug">{t.deskripsi}</h3>
                  <div className="flex gap-1.5 mt-2">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${tingkatColor[t.tingkat]}`}>{t.tingkat}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor[t.status]}`}>{t.status}</span>
                  </div>
                </div>
                <button onClick={() => setDetailTemuan(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Tutup">×</button>
              </div>
              <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
                <section>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Informasi Temuan</h4>
                  {row("Unit Kerja", t.unit)}
                  {row("Audit", audit ? `${t.auditNo} — ${audit.jenis}` : t.auditNo)}
                  {row("Tim Auditor", audit?.tim ?? "—")}
                  {row("Kategori", <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${kategoriColor[t.kategori] ?? ""}`}>{t.kategori}</span>)}
                  {row("Tingkat Risiko", t.tingkat)}
                  {row("Status Temuan", t.status)}
                </section>
                <section>
                  <h4 className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Rencana Tindak Lanjut</h4>
                  {x ? (<>
                    {row("Rencana", x.rencana)}
                    {row("PIC", x.pic)}
                    {row("Target Selesai", x.target)}
                    {row("Status RTL", <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${TL_STATUS_STYLE[rtlTlStatus(x)].cls}`}>{rtlTlStatus(x)}</span>)}
                    <div className="flex gap-2 mt-3">
                      {x.link && <AksiBtn kind="link" title="Buka Dokumen RTL" href={x.link} />}
                      {x.bukti && <AksiBtn kind="link" title="Buka Bukti Pelaksanaan" href={x.bukti} />}
                    </div>
                  </>) : (
                    <div className="text-[11px] text-gray-400 italic py-2">Belum ada RTL yang ditetapkan.</div>
                  )}
                </section>
              </div>
              {!x && canEdit && t.status !== "Selesai" && (
                <div className="p-4 border-t border-gray-100">
                  <button onClick={() => { setDetailTemuan(null); setTambahModal(`tl-${t.id}`); }} className="w-full text-xs font-bold py-2 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Susun Tindak Lanjut →</button>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {tambahModal?.startsWith("tl-") && (
        <TambahFormModal title={`Tindak Lanjut — ${tambahModal.replace("tl-","")}`} fields={[
          { key:"pic",     label:"Penanggung Jawab",    type:"text" },
          { key:"rencana", label:"Rencana Tindak Lanjut", type:"textarea" },
          { key:"target",  label:"Target Selesai",      type:"date" },
          { key:"link",    label:"Link Dokumen Pendukung (Google Drive, opsional)", type:"url", required:false },
        ]}
        onSave={(v) => ajukanRtl(tambahModal.replace("tl-",""), { rencana: v.rencana || "-", pic: v.pic || "-", target: v.target || "", link: v.link?.trim() || null })}
        onClose={() => setTambahModal(null)} />
      )}
    </div>
  );
}

// ── Audit page 1: Rencana & Laporan ──────────────────────────────────────────
const CHECKLIST_RENCANA = ["Tujuan & ruang lingkup audit ditetapkan", "Tim auditor & pembagian tugas ditetapkan", "Anggaran & jadwal pelaksanaan sesuai PKPT", "Program audit (prosedur pengujian) disusun", "Risiko utama unit dari Risk Register diidentifikasi"];

function AuditPageRencana({ view }: { view?: "rencana" | "lha" } = {}) {
  const user = useContext(UserCtx);
  const [checklistNo, setChecklistNo] = useState<string | null>(null);
  const [teruskanPkpt, setTeruskanPkpt] = useState<number | null>(null);
  const { pkptList } = useContext(PkptCtx);
  const isAuditor = user?.role === "pengawasan";
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const isKepala = user?.role === "full";
  const [filterRencana, setFilterRencana] = useState("Semua");
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ msg: string; fn: () => void } | null>(null);
  const [showLHAModal, setShowLHAModal] = useState(false);
  const [lhaSaved, setLhaSaved] = useState(false);
  const [lhaStep, setLhaStep] = useState<"form" | "confirm" | "saved">("form");
  const [lhaForm, setLhaForm] = useState({ noLHA: "", auditNo: "", tanggal: "", linkDokumen: "", catatan: "" });
  const [revisiLHANo, setRevisiLHANo] = useState<string|null>(null);
  const [revisiCatatan, setRevisiCatatan] = useState("");
  const [ajukanUlangNo, setAjukanUlangNo] = useState<string|null>(null);
  const [ajukanUlangLink, setAjukanUlangLink] = useState("");
  const notify = useContext(NotifyCtx);
  const proses = [
    { key: "rencana", label: "Rencana Audit", icon: "" },
    { key: "entry",   label: "Entry Meeting",  icon: "" },
    { key: "kka",     label: "KKA",            icon: "" },
    { key: "draft",   label: "Draft & Konfirmasi", icon: "" },
    { key: "exit",    label: "Exit Meeting",   icon: "" },
    { key: "laporan", label: "Laporan (LHA)",  icon: "" },
  ];
  const tahapIndex: Record<string, number> = { rencana:0, entry:1, kka:2, draft:3, exit:4, laporan:5 };

  const auditBerjalan = [
    { unit: "Sarpras",       tahap: "kka",     jenis: "Kinerja",   ketua: "Budi S.",  mulai: "5 Mei",  target: "30 Mei" },
    { unit: "BAUK",          tahap: "entry",   jenis: "Keuangan",  ketua: "Ratna D.", mulai: "20 Mei", target: "25 Jun" },
    { unit: "BAAK",          tahap: "draft",   jenis: "Kepatuhan", ketua: "Budi S.",  mulai: "1 Apr",  target: "20 Mei" },
    { unit: "LPM",           tahap: "rencana", jenis: "Kinerja",   ketua: "Andi P.",  mulai: "1 Jun",  target: "31 Jul" },
  ];

  const { laporanList, setLaporanList, rencanaList, setRencanaList } = useContext(AuditCtx);

  const visibleAuditBerjalan = myUnit ? auditBerjalan.filter(a => a.unit === myUnit) : auditBerjalan;
  const visibleRencana = myUnit ? rencanaList.filter(r => r.unit === myUnit) : rencanaList;
  const visibleLaporan = myUnit ? laporanList.filter(l => l.unit === myUnit) : laporanList;

  // PKPT disetujui Ketua yang belum memiliki Rencana Audit — hanya Auditor yang meneruskan
  const pkptSiap = pkptList.filter(p => p.approval === "Disetujui" && !rencanaList.some(r => r.pkptNo === p.no));
  function toggleChecklist(no: string, idx: number) {
    setRencanaList(prev => prev.map(x => {
      if (x.no !== no) return x;
      const cl = x.checklist ?? CHECKLIST_RENCANA.map(() => false);
      const next = cl.map((c, k) => k === idx ? !c : c);
      // checklist berubah → konfirmasi siap jadwal harus diulang bila tidak lagi lengkap
      return { ...x, checklist: next, siapJadwal: next.every(Boolean) ? x.siapJadwal : false };
    }));
  }

  const visibleRencanaFiltered = filterRencana === "Semua"
    ? visibleRencana
    : visibleRencana.filter(r => r.status === filterRencana);

  return (
    <div className="flex flex-col gap-4">
      {/* Auditee header */}
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}></div>
          <div>
            <div className="text-sm font-black text-purple-800">Modul Audit — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Hanya menampilkan rencana, proses, dan laporan audit yang berkaitan dengan unit <strong>{myUnit}</strong>.</div>
          </div>
        </div>
      )}

      {view !== "lha" && <>
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
            <h4 className="text-xs font-bold text-gray-700 mb-3">Funnel Alur Audit</h4>
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
            <h4 className="text-xs font-bold text-gray-700 mb-3">Gantt — Jadwal Audit (Hari ke-)</h4>
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
                <div className="text-[10px] mt-1 font-semibold" style={{ color: "var(--tsu-teal)" }}>
                  Tahap saat ini: {proses.find(p=>p.key===a.tahap)?.label}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* PKPT disetujui Ketua → diteruskan Auditor menjadi Rencana Audit */}
      {!myUnit && (
        <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100 flex-wrap">
            <div>
              <h4 className="text-xs font-bold text-gray-700">PKPT Disetujui — Menunggu Rencana Audit</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Program yang telah disetujui Ketua. Auditor meneruskannya menjadi Rencana Audit (Draft) untuk dirinci dan diajukan.</p>
            </div>
            <span className="text-[10px] font-bold px-2.5 py-1 rounded-full bg-sky-50 text-sky-700">{pkptSiap.length} program</span>
          </div>
          {pkptSiap.length === 0
            ? <div className="px-4 py-5 text-center text-[10px] text-gray-400">Semua PKPT disetujui sudah memiliki Rencana Audit.</div>
            : <div className="divide-y divide-gray-50">
              {pkptSiap.map(p => (
                <div key={p.no} className="flex items-center justify-between gap-3 px-4 py-2.5 flex-wrap">
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-gray-700">PKPT #{p.no} · {p.program}</div>
                    <div className="text-[10px] text-gray-400">{p.unit} · {p.periode} · Ketua tim {p.ketua} · Rp {p.anggaran.toFixed(1)} Jt{p.riskId ? ` · ${p.riskId}` : ""}</div>
                  </div>
                  {isAuditor
                    ? <button onClick={() => setTeruskanPkpt(p.no)} className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>Teruskan ke Rencana Audit</button>
                    : <span className="text-[9px] text-gray-400 italic whitespace-nowrap">Diteruskan oleh Auditor</span>}
                </div>
              ))}
            </div>}
        </div>
      )}

      {/* Rencana Audit */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h4 className="text-xs font-bold text-gray-700">Rencana Audit (Program Audit){myUnit ? ` — ${myUnit}` : ""}</h4>
          {!myUnit && canEdit && <button onClick={() => setTambahModal("Tambah Rencana Audit")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1.5"
            style={{ background: "var(--tsu-teal)" }}>
            + Tambah Rencana
          </button>}
        </div>
        {/* Filter pills */}
        <div className="px-4 py-2 border-b border-gray-50 flex gap-2">
          {["Semua","Draft","Diajukan","Disetujui"].map(f => (
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
                {["No PA","Unit Kerja","Jenis Audit","Tim Auditor","Anggaran","Tgl Mulai","Status","Aksi"].map(h=>(
                  <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {visibleRencanaFiltered.map((r,i)=>(
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 font-mono text-[10px] text-gray-500 font-bold">{r.no}{r.pkptNo !== undefined && <div className="font-sans font-semibold text-[9px] text-teal-600">dari PKPT #{r.pkptNo}</div>}</td>
                  <td className="px-4 py-3 font-semibold text-gray-700">{r.unit}</td>
                  <td className="px-4 py-3 text-gray-500">{r.jenis}</td>
                  <td className="px-4 py-3 text-gray-500">{r.tim}</td>
                  <td className="px-4 py-3 text-gray-600 font-medium">{r.anggaran}</td>
                  <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{r.tglMulai}</td>
                  <td className="px-4 py-3">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status==="Disetujui"?"bg-green-50 text-green-600":r.status==="Diajukan"?"bg-amber-50 text-amber-600":"bg-gray-100 text-gray-500"}`}>{r.status === "Diajukan" ? "Menunggu Ketua" : r.status}</span>
                  </td>
                  <td className="px-4 py-3">
                    {!myUnit && canEdit && (
                      <div className="flex items-center gap-1.5">
                        {/* Auditor mengajukan, Ketua (Kepala SPI) menyetujui, lalu checklist */}
                        {r.status === "Draft" && !isKepala && (
                          <button onClick={() => { setRencanaList(prev => prev.map(x => x.no === r.no ? { ...x, status: "Diajukan" } : x)); notify({ title: `Rencana Audit ${r.no} diajukan`, body: `${r.unit} (${r.jenis}) menunggu persetujuan Ketua.`, tag: "Audit", roles: ["full"] }); }}
                            className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>Ajukan ke Ketua</button>
                        )}
                        {(r.status === "Diajukan" || r.status === "Draft") && isKepala && (
                          <AksiBtn kind="setujui" title="Setujui Rencana Audit"
                            onClick={() => { setRencanaList(prev => prev.map(x => x.no === r.no ? { ...x, status: "Disetujui" } : x)); notify({ title: `Rencana Audit ${r.no} disetujui`, body: `${r.unit}: lanjutkan checklist & penjadwalan Entry Meeting.`, tag: "Audit", roles: ["pengawasan", "backoffice"] }); }} />
                        )}
                        {r.status === "Diajukan" && !isKepala && (
                          <span className="text-[9px] text-amber-600 italic whitespace-nowrap">Menunggu Ketua</span>
                        )}
                        {r.status === "Disetujui" && (() => { const n = (r.checklist ?? []).filter(Boolean).length; return (
                          <button onClick={() => setChecklistNo(r.no)}
                            className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border whitespace-nowrap ${rencanaSiapJadwal(r) ? "bg-green-50 text-green-700 border-green-200" : n === CHECKLIST_RENCANA.length ? "bg-amber-50 text-amber-700 border-amber-200" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}>
                            {rencanaSiapJadwal(r) ? "Siap Entry Meeting" : `Checklist ${n}/${CHECKLIST_RENCANA.length}`}
                          </button>
                        ); })()}
                        <AksiBtn kind="batal" title="Batalkan Rencana Audit"
                          onClick={() => setPendingDelete({ msg: `Batalkan rencana audit "${r.no} — ${r.unit}"?`, fn: () => setRencanaList(prev => prev.filter(x => x.no !== r.no)) })} />
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </>}
      {view !== "rencana" && <>
      {/* Laporan Audit */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <h4 className="text-xs font-bold text-gray-700">Laporan Hasil Audit (LHA){myUnit ? ` — ${myUnit}` : ""}</h4>
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
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${l.status==="Diterima"?"bg-green-50 text-green-600":l.status==="Revisi"?"bg-amber-50 text-amber-600":"bg-gray-100 text-gray-500"}`}>{l.status}</span>
                    {!!l.revisiKe && <span className="ml-1 text-[9px] text-gray-400">· Revisi ke-{l.revisiKe}</span>}
                    {l.status==="Revisi" && l.riwayatRevisi && l.riwayatRevisi.length>0 && (
                      <div className="mt-1 max-w-[220px] text-[10px] text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1">
                        <span className="font-bold">Catatan: </span>{l.riwayatRevisi[l.riwayatRevisi.length-1].catatan}
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {/* Link buka dokumen */}
                      {l.status === "Diterima" && l.link && (
                        <AksiBtn kind="link" title="Buka Dokumen LHA" href={l.link} />
                      )}
                      {/* Setujui/Revisi LHA hanya oleh Kepala SPI; Auditor membuat & mengajukan ulang */}
                      {isKepala && l.status === "Draft" && (
                        <AksiBtn kind="setujui" title="Setujui LHA"
                          onClick={() => { notify({ title: `LHA ${l.no} disetujui`, body: `LHA ${l.unit} telah diterima dan tersedia di Riwayat.`, tag: "Audit", roles: ["full", "pengawasan", "rektor"] }); setLaporanList(prev => prev.map(x => x.no === l.no ? { ...x, status: "Diterima", tgl: new Date().toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) } : x)); }}
                        />
                      )}
                      {!myUnit && canEdit && l.status === "Revisi" && (
                        <button
                          onClick={() => { setAjukanUlangNo(l.no); setAjukanUlangLink(l.link ?? ""); }}
                          className="text-[9px] font-bold px-2.5 py-1 rounded-lg text-white whitespace-nowrap"
                          style={{ background: "var(--tsu-teal)" }}>
                          ↻ Ajukan Ulang
                        </button>
                      )}
                      {isKepala && l.status === "Draft" && (
                        <button
                          onClick={() => { setRevisiLHANo(l.no); setRevisiCatatan(""); }}
                          className="text-[9px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100 transition-colors whitespace-nowrap">
                          ↩ Revisi
                        </button>
                      )}
                      {!myUnit && canEdit && !isKepala && l.status === "Draft" && (
                        <span className="text-[9px] text-gray-400 italic whitespace-nowrap">Menunggu persetujuan Kepala SPI</span>
                      )}
                      {(!canEdit || myUnit) && l.status !== "Diterima" && (
                        <span className="text-[9px] text-gray-300 italic">—</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      </>}
      {checklistNo && (() => {
        const r = rencanaList.find(x => x.no === checklistNo);
        const cl = r?.checklist ?? CHECKLIST_RENCANA.map(() => false);
        const lengkap = cl.every(Boolean);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={() => setChecklistNo(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              <div>
                <div className="text-sm font-black text-gray-800">Checklist Rencana Audit</div>
                <p className="text-[10px] text-gray-400 mt-0.5">{checklistNo}{r ? ` — ${r.unit} (${r.jenis})` : ""}</p>
              </div>
              <div className="flex flex-col gap-1.5">
                {CHECKLIST_RENCANA.map((item, idx) => (
                  <label key={item} className="flex items-start gap-2.5 rounded-lg border border-gray-100 px-3 py-2 text-xs text-gray-700 cursor-pointer hover:bg-gray-50">
                    <input type="checkbox" className="mt-0.5 accent-teal-600" checked={cl[idx]} disabled={!canEdit || !!myUnit}
                      onChange={() => toggleChecklist(checklistNo, idx)} />
                    <span className={cl[idx] ? "line-through text-gray-400" : ""}>{item}</span>
                  </label>
                ))}
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-semibold text-gray-500">{cl.filter(Boolean).length}/{CHECKLIST_RENCANA.length} terpenuhi{r?.siapJadwal ? " · siap Entry Meeting" : ""}</span>
                {lengkap && r && !r.siapJadwal && canEdit && !myUnit
                  ? <button onClick={() => {
                      setRencanaList(prev => prev.map(x => x.no === r.no ? { ...x, siapJadwal: true } : x));
                      notify({ title: `${r.no} siap dijadwalkan Entry Meeting`, body: `Checklist ${r.unit} lengkap. Back Office dapat menjadwalkan Entry Meeting di Persiapan Audit.`, tag: "Audit", roles: ["backoffice", "full"] });
                      setChecklistNo(null);
                    }} className="text-xs font-bold px-4 py-2 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Konfirmasi Siap Dijadwalkan</button>
                  : <button onClick={() => setChecklistNo(null)} className="text-xs font-bold px-4 py-2 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Selesai</button>}
              </div>
            </div>
          </div>
        );
      })()}
      {teruskanPkpt !== null && (() => {
        const p = pkptList.find(x => x.no === teruskanPkpt);
        if (!p) return null;
        return (
          <TambahFormModal title={`Teruskan PKPT #${p.no} ke Rencana Audit`}
            initial={{ jenis: /keuangan/i.test(p.program) ? "Keuangan" : /kinerja/i.test(p.program) ? "Kinerja" : "Kepatuhan", tim: p.ketua, anggaran: `Rp ${(p.anggaran * 1_000_000).toLocaleString("id-ID")}` }}
            fields={[
              { key: "jenis",    label: "Jenis Audit",            type: "select", options: ["Kepatuhan", "Kinerja", "Keuangan"] },
              { key: "tim",      label: "Tim Auditor",            type: "text", placeholder: "Ratna D., Andi P." },
              { key: "anggaran", label: "Anggaran",               type: "text" },
              { key: "tglMulai", label: "Tanggal Mulai",          type: "date" },
            ]}
            onSave={v => {
              const no = nextPaNo(rencanaList);
              setRencanaList(prev => [...prev, { no, unit: p.unit, jenis: v.jenis || "Kepatuhan", tim: v.tim || p.ketua, anggaran: v.anggaran || "-", tglMulai: v.tglMulai ? tglIsoToId(v.tglMulai) : p.periode, status: "Draft", pkptNo: p.no }]);
              notify({ title: `PKPT #${p.no} diteruskan menjadi ${no}`, body: `${p.unit}: Rencana Audit Draft disusun Auditor, menunggu diajukan ke Ketua.`, tag: "Audit", roles: ["full", "backoffice"] });
            }}
            onClose={() => setTeruskanPkpt(null)} />
        );
      })()}
      {/* + Buat LHA modal */}
      {showLHAModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4" style={{ background: "rgba(0,0,0,0.35)" }}
          onClick={() => { if (lhaStep !== "saved") { setShowLHAModal(false); setLhaStep("form"); } }}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 w-full max-w-md mx-4 my-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-sm font-bold text-gray-800">Buat Laporan Hasil Audit (LHA)</h4>
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
                    <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Audit yang Dilaporkan</label>
                    <select value={lhaForm.auditNo} onChange={e => setLhaForm(p => ({ ...p, auditNo: e.target.value }))}
                      className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400">
                      <option value="">-- Pilih Audit --</option>
                      {rencanaList.map(a => (
                        <option key={a.no} value={a.no}>{a.no} — {a.unit} ({a.jenis})</option>
                      ))}
                    </select>
                    <p className="text-[9px] text-gray-400 mt-1">Jumlah temuan dan rekomendasi dihitung otomatis dari Temuan Risiko audit ini.</p>
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
                  <button onClick={() => setLhaStep("confirm")} disabled={!lhaForm.noLHA.trim() || !lhaForm.auditNo}
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
                  <span className="text-lg flex-shrink-0"></span>
                  <div>
                    <p className="text-xs font-bold text-amber-800 mb-1">Cek link sebelum menyimpan</p>
                    <p className="text-[11px] text-amber-700 leading-relaxed">Pastikan link Google Drive LHA sudah diatur ke <strong>publik (anyone with the link)</strong> agar bisa dibuka tanpa login. Kalau belum, klik <strong>Kembali</strong> dan perbaiki dulu.</p>
                  </div>
                </div>
                <div className="flex gap-2 justify-end">
                  <button onClick={() => setLhaStep("form")}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">← Kembali</button>
                  <button onClick={() => {
                    setLaporanList(prev => [{ no: lhaForm.noLHA || "LHA-NEW", auditNo: lhaForm.auditNo, unit: rencanaList.find(a => a.no === lhaForm.auditNo)?.unit ?? "-", tgl: lhaForm.tanggal || "-", temuan: 0, rekomendasi: 0, status: "Draft", link: lhaForm.linkDokumen || null }, ...prev]);
                    notify({ title: `LHA ${lhaForm.noLHA || "baru"} diajukan`, body: "LHA menunggu persetujuan Kepala SPI.", tag: "Audit", roles: ["full"] });
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
                  <span className="text-base"></span>
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
          { key:"unit",     label:"Unit Kerja",         type:"select", options:["BAAK","BAKPU","BAUK","Sarpras","SDM","BPU","D3-DKV","D3-DPT","D3-SI","D3-TI","Fak. Sains & Hum.","Fak. Teknik","Fak. Vokasi","KUI","LPM","LPPM","Perpustakaan","PMB","S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi","S1-ReKom","S1-Sistem Informasi","Marcomm","PIKD"] },
          { key:"jenis",    label:"Jenis Audit",        type:"select", options:["Kinerja","Kepatuhan","Keuangan","Investigatif"] },
          { key:"periode",  label:"Periode Rencana",    type:"text",   placeholder:"Q3 2025" },
          { key:"ketua",    label:"Ketua Tim Auditor",  type:"text" },
          { key:"anggaran", label:"Anggaran (Rp)",      type:"text",   placeholder:"Contoh: Rp 4.500.000" },
        ]}
        onSave={(v) => setRencanaList(prev => [{ no: `PA-${String(prev.length + 1).padStart(3,"0")}`, unit: v.unit || "-", jenis: v.jenis || "-", tim: v.ketua || "-", anggaran: v.anggaran || "-", tglMulai: v.periode || "-", status: "Draft" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {pendingDelete && (
        <ConfirmModal
          message={pendingDelete.msg}
          onConfirm={() => { pendingDelete.fn(); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {ajukanUlangNo && (() => {
        const lha = laporanList.find(x => x.no === ajukanUlangNo);
        if (!lha) return null;
        const last = lha.riwayatRevisi?.[lha.riwayatRevisi.length-1];
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
            onClick={() => setAjukanUlangNo(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4" style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
                <div className="text-sm font-black text-white">↻ Ajukan Ulang LHA</div>
                <button onClick={() => setAjukanUlangNo(null)} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold">✕</button>
              </div>
              <div className="p-5 flex flex-col gap-4">
                {last && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[10px] text-amber-700">
                    <div className="font-bold mb-0.5">Catatan revisi ({last.tgl})</div>{last.catatan}
                  </div>
                )}
                <div>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Link Dokumen LHA Terbaru (Google Drive)</label>
                  <input value={ajukanUlangLink} onChange={e => setAjukanUlangLink(e.target.value)} placeholder="https://drive.google.com/..."
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100" />
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      notify({ title: `LHA ${lha.no} diajukan ulang`, body: `${lha.unit}: revisi ke-${lha.revisiKe ?? 1} menunggu persetujuan Kepala SPI.`, tag: "Audit", roles: ["full", "pengawasan"] });
                      setLaporanList(prev => prev.map(x => x.no === ajukanUlangNo ? { ...x, status: "Draft", link: ajukanUlangLink.trim() || x.link } : x));
                      setAjukanUlangNo(null);
                    }}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "var(--tsu-teal)" }}>
                    Ajukan Ulang
                  </button>
                  <button onClick={() => setAjukanUlangNo(null)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {revisiLHANo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setRevisiLHANo(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
              <div className="text-sm font-black text-white">↩ Form Revisi LHA</div>
              <button onClick={() => setRevisiLHANo(null)} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-[10px] text-amber-700">
                <span className="font-bold">No LHA: </span>{revisiLHANo} akan dikembalikan untuk direvisi.
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Catatan Revisi / Alasan</label>
                <textarea
                  value={revisiCatatan}
                  onChange={e => setRevisiCatatan(e.target.value)}
                  placeholder="Tuliskan catatan atau alasan revisi..."
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100 transition-all resize-none" />
              </div>
              <div className="flex gap-2">
                <button
                  disabled={!revisiCatatan.trim()}
                  onClick={() => {
                    const tgl = new Date().toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"});
                    const catatan = revisiCatatan.trim();
                    const target = laporanList.find(x => x.no === revisiLHANo);
                    if (target) notify({ title: `LHA ${target.no} perlu direvisi`, body: `${target.unit}: ${catatan}`, tag: "Audit", roles: ["full", "pengawasan"] });
                    setLaporanList(prev => prev.map(x => x.no === revisiLHANo ? { ...x, status: "Revisi", revisiKe: (x.revisiKe ?? 0) + 1, riwayatRevisi: [...(x.riwayatRevisi ?? []), { tgl, catatan }] } : x));
                    setRevisiLHANo(null);
                    setRevisiCatatan("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-amber-500 hover:bg-amber-600 transition-colors disabled:opacity-40 disabled:cursor-not-allowed">
                  ↩ Konfirmasi Revisi
                </button>
                <button onClick={() => setRevisiLHANo(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit page 2: Entry – Draft – Exit ───────────────────────────────────────
function AuditPageLapangan({ fixedStep }: { fixedStep?: "entry"|"draft"|"exit" } = {}) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const [activeStep, setActiveStep] = useState<"entry"|"draft"|"exit">(fixedStep ?? "entry");
  const [linkDraft, setLinkDraft] = useState<Record<string, string>>({});
  const { draftList, setDraftList, uploadDocs, setUploadDocs } = useContext(LapanganCtx);
  const { addTemuan } = useContext(TemuanCtx);
  const { rencanaList } = useContext(AuditCtx);
  const notify = useContext(NotifyCtx);
  const [revisiDraft, setRevisiDraft] = useState<{ no: string; temuan: string; catatan: string } | null>(null);
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [editEntryState, setEditEntryState] = useState<{ idx: number; field: "notulen"|"ba"|"presensi" } | null>(null);
  const [editEntryLink, setEditEntryLink] = useState("");

  const steps = [
    { key: "entry" as const, label: "Entry Meeting",              icon: "", desc: "Rapat pembukaan sebelum kerja lapangan" },
    { key: "draft" as const, label: "Draft Temuan & Konfirmasi", icon: "", desc: "Klarifikasi temuan kepada auditee" },
    { key: "exit"  as const, label: "Exit Meeting",               icon: "", desc: "Rapat penutupan & kesepakatan temuan" },
  ];

  const [entryList, setEntryList] = useState<{
    unit: string; tgl: string; notulen: string; ba: string; statusEntry: string;
    linkNotulen: string | null; linkBA: string | null; linkPresensi: string | null;
    lingkup?: string; tujuan?: string; metodologi?: string; jadwal?: string;
  }[]>([
    { unit: "Sarpras",  tgl: "5 Mei 2025",  notulen: "Ada",    ba: "Ada",   statusEntry: "Terlaksana",  linkNotulen: "https://drive.google.com/file/notulen-entry-sarpras", linkBA: "https://drive.google.com/file/ba-entry-sarpras",  linkPresensi: "https://drive.google.com/file/presensi-entry-sarpras", lingkup: "Pengelolaan aset tetap & belanja modal TA 2024", tujuan: "Menilai keandalan pencatatan dan pengamanan aset", metodologi: "Uji petik dokumen, inspeksi fisik, wawancara", jadwal: "5 – 30 Mei 2025" },
    { unit: "BAUK",     tgl: "20 Mei 2025", notulen: "Ada",    ba: "Proses",statusEntry: "Dijadwalkan", linkNotulen: "https://drive.google.com/file/notulen-entry-bauk",    linkBA: null,                                              linkPresensi: "https://drive.google.com/file/presensi-entry-bauk"    },
    { unit: "BAAK",     tgl: "2 Apr 2025",  notulen: "Ada",    ba: "Ada",   statusEntry: "Terlaksana",  linkNotulen: "https://drive.google.com/file/notulen-entry-baak",    linkBA: "https://drive.google.com/file/ba-entry-baak",     linkPresensi: "https://drive.google.com/file/presensi-entry-baak", lingkup: "Layanan administrasi akademik & arsip mahasiswa", tujuan: "Menilai kepatuhan terhadap SOP akademik", metodologi: "Reviu SOP, uji kepatuhan, wawancara", jadwal: "1 Apr – 20 Mei 2025" },
  ]);
  const [exitEdit, setExitEdit] = useState<{ idx: number; linkPresensi: string; linkBA: string; temuanSepakat: string; tindakLanjut: string } | null>(null);
  const [detailDraft, setDetailDraft] = useState<string | null>(null);
  const [dispoModal, setDispoModal] = useState<{ no: string; status: "Setuju"|"Keberatan"; catatan: string } | null>(null);
  const [exitList, setExitList] = useState<{
    unit: string; tgl: string; linkPresensi: string | null; linkBA: string | null; temuanSepakat: number;
    ba: string; tindakLanjut: string; catatan: string;
  }[]>([
    { unit: "BAAK",        tgl: "19 Mei 2025", linkPresensi: "https://drive.google.com/file/presensi-exit-baak", linkBA: "https://drive.google.com/file/ba-exit-baak", temuanSepakat: 2, ba: "Ditandatangani", tindakLanjut: "Unit menyepakati perbaikan SOP penerimaan mhs paling lambat Q3 2025. Arsip mahasiswa keluar akan distrukturisasi dalam 30 hari.", catatan: "Semua pihak hadir, proses berjalan lancar." },
    { unit: "Fak. Teknik", tgl: "2 Apr 2025",  linkPresensi: "https://drive.google.com/file/presensi-exit-fak-teknik", linkBA: "https://drive.google.com/file/ba-exit-fak-teknik", temuanSepakat: 3, ba: "Ditandatangani", tindakLanjut: "Tiga temuan disepakati dengan RTL: rekonsiliasi aset (14 hari), pembaruan SOP (30 hari), dan pelatihan staf (60 hari).",       catatan: "Dekan menyetujui seluruh rekomendasi." },
  ]);

  const visibleEntry = myUnit ? entryList.filter(e => e.unit === myUnit) : entryList;
  const visibleDraft = myUnit ? draftList.filter(d => d.unit === myUnit) : draftList;
  const visibleExit  = myUnit ? exitList.filter(e => e.unit === myUnit) : exitList;

  // Unit progress summary data
  const unitProgressSummary = [
    { unit: "Sarpras",       step: "KKA",          color: "#0e8080" },
    { unit: "BAAK",          step: "Draft Temuan",  color: "#f5a623" },
    { unit: "BAUK",          step: "Entry Meeting", color: "#3b82f6" },
    { unit: "LPM",           step: "Rencana",       color: "#cbd5e1" },
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
      {!fixedStep && <div className="flex gap-0 bg-white rounded-xl border border-gray-100 p-1 shadow-sm">
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
      </div>}
      {!fixedStep && <p className="text-xs text-gray-400 -mt-2 px-1">{steps.find(s=>s.key===activeStep)?.desc}</p>}

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
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                {([["notulen", "Notulen", e.linkNotulen], ["ba", "Berita Acara", e.linkBA], ["presensi", "Scan Presensi", e.linkPresensi]] as ["notulen" | "ba" | "presensi", string, string | null][]).map(([field, label, url]) => (
                  <div key={field} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-gray-400 block mb-0.5">{label}:</span>
                      {url
                        ? <span className="font-semibold" style={{ color: "var(--tsu-teal)" }}>Tersedia</span>
                        : <span className="text-gray-400 italic">{field === "ba" && e.ba === "Proses" ? "Proses" : "Belum diunggah"}</span>}
                    </div>
                    {url
                      ? <AksiBtn kind="link" title={`Buka ${label}`} href={url} />
                      : !myUnit && canEdit
                        ? <AksiBtn kind="edit" title={`Isi link ${label}`} onClick={() => { setEditEntryState({ idx: i, field }); setEditEntryLink(""); }} />
                        : null}
                  </div>
                ))}
              </div>
              <div className="mt-3 border-t border-gray-100 pt-3">
                <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Dokumen Kesepakatan</div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[10px]">
                  {([["Ruang Lingkup", e.lingkup], ["Tujuan", e.tujuan], ["Metodologi", e.metodologi], ["Jadwal", e.jadwal]] as [string, string | undefined][]).map(([k, v]) => (
                    <div key={k} className="bg-gray-50 rounded-lg px-3 py-2">
                      <span className="text-gray-400 block mb-0.5">{k}</span>
                      <span className={v ? "text-gray-700 font-medium" : "text-gray-400 italic"}>{v || "Belum diisi"}</span>
                    </div>
                  ))}
                </div>
              </div>
              {!myUnit && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="flex items-center justify-between mb-2">
                    <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Permintaan Dokumen</div>
                    <span className="text-[9px] font-semibold text-gray-400">{DOK_DIPERLUKAN.filter(l => uploadDocs[`${e.unit}|${l}`]).length}/{DOK_DIPERLUKAN.length} dikirim auditee</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DOK_DIPERLUKAN.map(label => {
                      const f = uploadDocs[`${e.unit}|${label}`];
                      return (
                        <div key={label} className={`rounded-lg px-3 py-2 flex items-center justify-between gap-2 border ${f ? "border-teal-100 bg-teal-50/40" : "border-dashed border-gray-200"}`}>
                          <div className="min-w-0">
                            <div className="text-[10px] font-semibold text-gray-600">{label}</div>
                            <div className={`text-[9px] ${f ? "font-semibold text-teal-700" : "text-gray-400 italic"}`}>{f ? "Dikirim auditee" : "Menunggu auditee"}</div>
                          </div>
                          {f && <AksiBtn kind="link" title={`Buka ${label}`} href={f.url} />}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
              {myUnit && canEdit && (
                <div className="mt-3 border-t border-gray-100 pt-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-2">Link Dokumen yang Diperlukan (Google Drive)</div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {DOK_DIPERLUKAN.map(label => {
                      const key = `${e.unit}|${label}`;
                      const f = uploadDocs[key];
                      return (
                        <div key={label} className="rounded-lg border border-dashed border-purple-200 bg-purple-50/40 px-3 py-2">
                          <div className="text-[10px] font-semibold text-gray-600 mb-1">{label}</div>
                          {f ? (
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[10px] font-semibold text-purple-700">Tersimpan</span>
                              <div className="flex gap-1">
                                <AksiBtn kind="link" title={`Buka ${label}`} href={f.url} />
                                <AksiBtn kind="hapus" title={`Hapus link ${label}`} onClick={() => setUploadDocs(prev => { const n = { ...prev }; delete n[key]; return n; })} />
                              </div>
                            </div>
                          ) : (
                            <div className="flex gap-1">
                              <input type="url" value={linkDraft[key] ?? ""} onChange={ev => setLinkDraft(prev => ({ ...prev, [key]: ev.target.value }))}
                                placeholder="https://drive.google.com/..."
                                className="flex-1 min-w-0 border border-gray-200 rounded-md px-2 py-1 text-[10px] focus:outline-none focus:border-purple-400" />
                              <button disabled={!/^https?:\/\/\S+$/.test((linkDraft[key] ?? "").trim())}
                                onClick={() => { const u = (linkDraft[key] ?? "").trim(); setUploadDocs(prev => ({ ...prev, [key]: { name: "Buka dokumen", url: u } })); setLinkDraft(prev => { const n = { ...prev }; delete n[key]; return n; }); }}
                                className="text-[10px] font-bold px-2 py-1 rounded-md text-white disabled:opacity-40" style={{ background: "#7c3aed" }}>Simpan</button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Draft Temuan */}
      {activeStep === "draft" && (
        <div className="flex flex-col gap-3">
          {!myUnit && canEdit && <div className="flex justify-end">
            <button onClick={() => setTambahModal("Tambah Draft Temuan")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
              + Input Temuan
            </button>
          </div>}
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
            <table className="w-full text-xs">
              <thead>
                <tr className="bg-gray-50 text-left">
                  {["No","Unit","Temuan","Tgl Kirim","Catatan Auditor","Respons Auditee","Catatan Auditee",...(canEdit ? ["Aksi"] : [])].map(h=>(
                    <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {visibleDraft.map((d,i)=>(
                  <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                    <td className="px-4 py-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{d.no}{(d.revisiKe ?? 0) > 0 && <div className="font-sans text-[9px] font-semibold text-amber-600">Revisi ke-{d.revisiKe}</div>}</td>
                    <td className="px-4 py-3 font-semibold text-gray-700 whitespace-nowrap">{d.unit}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-[200px]">{d.temuan}</td>
                    <td className="px-4 py-3 text-gray-400 whitespace-nowrap">{d.tglKirim}</td>
                    <td className="px-4 py-3 text-gray-500 text-[10px] italic max-w-[180px]">{d.catatanAuditor}</td>
                    <td className="px-4 py-3">
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap
                        ${d.disposisi==="Setuju"?"bg-green-50 text-green-600":
                          d.disposisi==="Keberatan"?"bg-red-50 text-red-600":
                          "bg-gray-100 text-gray-500"}`}>{d.disposisi}</span>
                    </td>
                    <td className="px-4 py-3 text-gray-500 text-[10px] italic max-w-[180px]">{d.catatanAuditee}</td>
                    {myUnit && canEdit && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="flex gap-1.5">
                          <AksiBtn kind="detail" title="Lihat Detail" onClick={() => setDetailDraft(d.no)} />
                          <AksiBtn kind="setujui" title="Terima" disabled={d.disposisi !== "Menunggu"} onClick={() => setDispoModal({ no: d.no, status: "Setuju", catatan: "" })} />
                          <AksiBtn kind="batal" title="Keberatan" disabled={d.disposisi !== "Menunggu"} onClick={() => setDispoModal({ no: d.no, status: "Keberatan", catatan: "" })} />
                        </div>
                      </td>
                    )}
                    {!myUnit && canEdit && (
                      <td className="px-4 py-3 whitespace-nowrap">
                        {d.disposisi === "Keberatan"
                          ? <button onClick={() => setRevisiDraft({ no: d.no, temuan: d.temuan, catatan: d.catatanAuditor })}
                              className="text-[10px] font-bold px-2.5 py-1 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100">Revisi & Kirim Ulang</button>
                          : <AksiBtn kind="detail" title="Lihat Detail" onClick={() => setDetailDraft(d.no)} />}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {myUnit && <AuditPageKKA />}
          {!myUnit && <AuditPageKKA approved={draftList.filter(d => d.disposisi === "Setuju")} />}
          {revisiDraft && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={() => setRevisiDraft(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                <div>
                  <div className="text-sm font-black text-gray-800">Revisi Temuan {revisiDraft.no}</div>
                  <p className="text-[10px] text-gray-400 mt-0.5">Sanggahan auditee: <span className="italic text-gray-600">{draftList.find(x => x.no === revisiDraft.no)?.catatanAuditee}</span></p>
                </div>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Deskripsi Temuan
                  <textarea rows={3} value={revisiDraft.temuan} onChange={e => setRevisiDraft(m => m ? { ...m, temuan: e.target.value } : m)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal normal-case tracking-normal text-gray-700 focus:outline-none focus:border-teal-400" />
                </label>
                <label className="text-[10px] font-bold text-gray-500 uppercase tracking-wide">Catatan Auditor
                  <textarea rows={3} value={revisiDraft.catatan} onChange={e => setRevisiDraft(m => m ? { ...m, catatan: e.target.value } : m)}
                    className="mt-1 w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-normal normal-case tracking-normal text-gray-700 focus:outline-none focus:border-teal-400" />
                </label>
                <div className="flex gap-2">
                  <button disabled={!revisiDraft.temuan.trim()} onClick={() => {
                    const d = draftList.find(x => x.no === revisiDraft.no);
                    setDraftList(prev => prev.map(x => x.no === revisiDraft.no ? { ...x, temuan: revisiDraft.temuan.trim(), catatanAuditor: revisiDraft.catatan.trim() || "—", disposisi: "Menunggu", catatanAuditee: "—", revisiKe: (x.revisiKe ?? 0) + 1, tglKirim: new Date().toLocaleDateString("id-ID",{day:"numeric",month:"short",year:"numeric"}) } : x));
                    if (d) notify({ title: `Temuan ${d.no} direvisi`, body: `Auditor mengirim ulang temuan untuk dikonfirmasi.`, tag: "Audit", roles: ["auditee"], unit: d.unit });
                    setRevisiDraft(null);
                  }} className="flex-1 text-xs font-bold py-2 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--tsu-teal)" }}>Kirim Ulang ke Auditee</button>
                  <button onClick={() => setRevisiDraft(null)} className="text-xs font-semibold px-4 py-2 rounded-lg bg-gray-100 text-gray-600">Batal</button>
                </div>
              </div>
            </div>
          )}
          {detailDraft && (() => {
            const d = draftList.find(x => x.no === detailDraft);
            if (!d) return null;
            return (
              <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={() => setDetailDraft(null)}>
                <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center justify-between">
                    <h4 className="text-sm font-bold text-gray-800">Detail Draft Temuan {d.no}</h4>
                    <button onClick={() => setDetailDraft(null)} className="text-gray-400 hover:text-gray-600">✕</button>
                  </div>
                  {[["Unit", d.unit], ["Temuan", d.temuan], ["Tgl Kirim", d.tglKirim], ["Catatan Auditor", d.catatanAuditor], ["Respons Auditee", d.disposisi], ["Catatan Auditee", d.catatanAuditee]].map(([k, v]) => (
                    <div key={k}><div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{k}</div><div className="text-xs text-gray-700">{v}</div></div>
                  ))}
                </div>
              </div>
            );
          })()}
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
                <div className="flex items-center gap-2">
                {!myUnit && canEdit && !(e.linkPresensi && e.linkBA && e.tindakLanjut !== "-" && e.temuanSepakat > 0) && (
                  <AksiBtn kind="edit" title="Lengkapi Exit Meeting"
                    onClick={() => { const idx = exitList.indexOf(e); setExitEdit({ idx, linkPresensi: e.linkPresensi ?? "", linkBA: e.linkBA ?? "", temuanSepakat: String(e.temuanSepakat), tindakLanjut: e.tindakLanjut === "-" ? "" : e.tindakLanjut }); }} />
                )}
                <span className={`text-[9px] font-bold px-2 py-1 rounded-lg border
                  ${e.ba==="Ditandatangani"?"bg-green-50 text-green-600 border-green-200":"bg-amber-50 text-amber-600 border-amber-200"}`}>
                  BA: {e.ba}
                </span>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[10px] mb-2">
                {([["Berita Acara", e.linkBA], ["Scan Presensi", e.linkPresensi]] as [string, string | null][]).map(([label, url]) => (
                  <div key={label} className="bg-gray-50 rounded-lg px-3 py-2 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <span className="text-gray-400 block mb-0.5">{label}:</span>
                      {url
                        ? <span className="font-semibold" style={{ color: "var(--tsu-teal)" }}>Tersedia</span>
                        : <span className="text-gray-400 italic">Belum diunggah</span>}
                    </div>
                    {url && <AksiBtn kind="link" title={`Buka ${label}`} href={url} />}
                  </div>
                ))}
                <div className="bg-gray-50 rounded-lg px-3 py-2">
                  <span className="text-gray-400">Hasil:</span>
                  <div className="font-bold mt-0.5" style={{ color: "var(--tsu-teal)" }}>{e.temuanSepakat} temuan disepakati</div>
                </div>
              </div>
              <div className="rounded-lg p-3 text-[10px] mb-2" style={{ background: "var(--tsu-teal-light)" }}>
                <div className="font-bold mb-1" style={{ color: "var(--tsu-teal-dark)" }}>Tindak Lanjut yang Disepakati:</div>
                <div style={{ color: "var(--tsu-teal-dark)" }}>{e.tindakLanjut === "-" ? "Belum diisi" : e.tindakLanjut}</div>
              </div>
              {e.catatan && e.catatan !== "—" && (
                <div className="bg-gray-50 rounded-lg px-3 py-2 text-[10px]">
                  <span className="text-gray-400 font-semibold">Catatan Auditor: </span>
                  <span className="text-gray-600">{e.catatan}</span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {tambahModal === "Tambah Entry Meeting" && (
        <TambahFormModal title="Tambah Entry Meeting" fields={[
          { key:"unit",        label:"Unit Kerja",                                  type:"select", options:["BAAK","BAKPU","BAUK","Sarpras","SDM","BPU","D3-DKV","D3-DPT","D3-SI","D3-TI","Fak. Sains & Hum.","Fak. Teknik","Fak. Vokasi","KUI","LPM","LPPM","Perpustakaan","PMB","S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi","S1-ReKom","S1-Sistem Informasi","Marcomm","PIKD"] },
          { key:"tgl",         label:"Tanggal Pelaksanaan",                         type:"date" },
          { key:"linkNotulen", label:"Link Notulen Rapat (Google Drive)",           type:"url",  required: false },
          { key:"linkBA",      label:"Link Berita Acara (Google Drive)",            type:"url",  required: false },
          { key:"linkPresensi",label:"Link Scan Presensi (Google Drive)",           type:"url",  required: false },
          { key:"lingkup",     label:"Ruang Lingkup",                               type:"textarea", required: false },
          { key:"tujuan",      label:"Tujuan Audit",                                type:"textarea", required: false },
          { key:"metodologi",  label:"Metodologi",                                  type:"text", required: false },
          { key:"jadwal",      label:"Jadwal Pelaksanaan",                          type:"text", placeholder:"1 – 30 Jun 2025", required: false },
        ]}
        onSave={(v) => setEntryList(prev => [{
          lingkup: v.lingkup || undefined, tujuan: v.tujuan || undefined, metodologi: v.metodologi || undefined, jadwal: v.jadwal || undefined,
          unit: v.unit || "-",
          tgl: v.tgl || "-",
          notulen: v.linkNotulen ? "Ada" : "Belum",
          ba: v.linkBA ? "Ada" : "Proses",
          statusEntry: "Dijadwalkan",
          linkNotulen: v.linkNotulen || null,
          linkBA: v.linkBA || null,
          linkPresensi: v.linkPresensi || null,
        }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {editEntryState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }}
          onClick={() => setEditEntryState(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
              <div className="text-sm font-black text-white">
                {editEntryState.field === "notulen"  && "Isi Link Notulen"}
                {editEntryState.field === "ba"       && "Isi Link Berita Acara"}
                {editEntryState.field === "presensi" && "Isi Link Scan Presensi"}
              </div>
              <button onClick={() => setEditEntryState(null)} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-4">
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Link Google Drive</label>
                <input
                  type="url"
                  value={editEntryLink}
                  onChange={e => setEditEntryLink(e.target.value)}
                  placeholder="https://drive.google.com/..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    if (!editEntryLink.trim()) return;
                    const { idx, field } = editEntryState;
                    setEntryList(prev => prev.map((e, i) => {
                      if (i !== idx) return e;
                      if (field === "notulen")  return { ...e, notulen: "Ada",   linkNotulen: editEntryLink };
                      if (field === "ba")       return { ...e, ba: "Ada",        linkBA: editEntryLink };
                      if (field === "presensi") return { ...e, linkPresensi: editEntryLink };
                      return e;
                    }));
                    setEditEntryState(null);
                    setEditEntryLink("");
                  }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-colors"
                  style={{ background: "var(--tsu-teal)" }}>
                  ✓ Simpan Link
                </button>
                <button onClick={() => setEditEntryState(null)}
                  className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50 transition-colors">
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {dispoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)" }} onClick={() => setDispoModal(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-black text-gray-800 mb-1">Disposisi {dispoModal.status} — {dispoModal.no}</div>
            <p className="text-[10px] text-gray-400 mb-3">Tuliskan catatan auditee untuk draft temuan ini.</p>
            <textarea rows={4} value={dispoModal.catatan} onChange={e => setDispoModal(m => m ? { ...m, catatan: e.target.value } : m)}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-400" placeholder="Catatan auditee" />
            <div className="flex gap-2 mt-3">
              <button onClick={() => {
                setDraftList(prev => prev.map(x => x.no === dispoModal.no ? { ...x, disposisi: dispoModal.status, catatanAuditee: dispoModal.catatan.trim() || "—" } : x));
                const d = draftList.find(x => x.no === dispoModal.no);
                // Temuan yang disetujui auditee tercatat ke Temuan Risiko (dasar KKA & RTL)
                if (d && dispoModal.status === "Setuju" && d.auditNo) addTemuan({ id: d.no, auditNo: d.auditNo, unit: d.unit, deskripsi: d.temuan, kategori: d.kategori ?? "Operasional", tingkat: d.tingkat ?? "Sedang" });
                if (d) notify({ title: `Temuan ${d.no} ${dispoModal.status === "Setuju" ? "disetujui" : "disanggah"} auditee`, body: dispoModal.catatan.trim() || d.temuan, tag: "Audit", roles: ["pengawasan", "full"] });
                setDispoModal(null);
              }} className="flex-1 text-xs font-bold py-2 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Kirim Disposisi</button>
              <button onClick={() => setDispoModal(null)} className="text-xs font-semibold px-4 py-2 rounded-lg bg-gray-100 text-gray-600">Batal</button>
            </div>
          </div>
        </div>
      )}
      {tambahModal === "Tambah Draft Temuan" && (
        <TambahFormModal title="Input Temuan Audit" fields={[
          { key:"audit",    label:"Audit",                                  type:"select",   options: rencanaList.filter(a => a.status === "Disetujui").map(a => `${a.no} — ${a.unit} (${a.jenis})`) },
          { key:"no",       label:"No Temuan",                              type:"text",     placeholder:"DT-005" },
          { key:"temuan",   label:"Deskripsi Temuan",                       type:"textarea" },
          { key:"kategori", label:"Kategori",                               type:"select",   options:["Keuangan","Operasional","Kepatuhan","Teknologi"] },
          { key:"tingkat",  label:"Tingkat Risiko",                         type:"select",   options:["Tinggi","Sedang","Rendah"] },
          { key:"tglKirim", label:"Tanggal Kirim Konfirmasi",               type:"date" },
          { key:"link",     label:"Link Dokumen Konfirmasi (Google Drive)", type:"url",      required:false },
          { key:"catatan",  label:"Catatan Auditor",                        type:"textarea", required:false },
        ]}
        onSave={(v) => { const a = rencanaList.find(x => x.no === (v.audit || "").split(" — ")[0]); setDraftList(prev => [{ unit: a?.unit ?? "-", auditNo: a?.no, kategori: v.kategori || "Operasional", tingkat: v.tingkat || "Sedang", no: v.no || `DT-${String(prev.length + 1).padStart(3,"0")}`, temuan: v.temuan || "-", tglKirim: v.tglKirim || "-", disposisi: "Menunggu", catatanAuditor: v.catatan || "—", catatanAuditee: "—" }, ...prev]); if (a) notify({ title: "Temuan baru perlu dikonfirmasi", body: `${v.temuan || "Temuan"} — mohon disetujui atau disanggah.`, tag: "Audit", roles: ["auditee"], unit: a.unit }); }}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Exit Meeting" && (
        <TambahFormModal title="Tambah Exit Meeting" fields={[
          { key:"unit",         label:"Unit Kerja",                              type:"select",   options:["BAAK","BAKPU","BAUK","Sarpras","SDM","BPU","D3-DKV","D3-DPT","D3-SI","D3-TI","Fak. Sains & Hum.","Fak. Teknik","Fak. Vokasi","KUI","LPM","LPPM","Perpustakaan","PMB","S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi","S1-ReKom","S1-Sistem Informasi","Marcomm","PIKD"] },
          { key:"tgl",          label:"Tanggal Pelaksanaan",                     type:"date" },
          { key:"linkPresensi", label:"Link Scan Presensi (Google Drive)",       type:"url",      required:false },
          { key:"link",         label:"Link BA Exit Meeting (Google Drive)",      type:"url",      required:false },
          { key:"temuanSepakat",label:"Jumlah Temuan yang Disepakati",           type:"text",     placeholder:"0", required:false },
          { key:"tindakLanjut", label:"Tindak Lanjut yang Disepakati",           type:"textarea", required:false },
          { key:"catatan",      label:"Catatan Auditor",                         type:"textarea", required:false },
        ]}
        onSave={(v) => setExitList(prev => [{
          unit: v.unit || "-",
          tgl: v.tgl || "-",
          linkPresensi: v.linkPresensi || null,
          linkBA: v.link || null,
          temuanSepakat: parseInt(v.temuanSepakat) || 0,
          ba: v.link ? "Ditandatangani" : "Proses",
          tindakLanjut: v.tindakLanjut?.trim() || "-",
          catatan: v.catatan || "—",
        }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {exitEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.55)", backdropFilter: "blur(4px)" }} onClick={() => setExitEdit(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between px-5 py-4" style={{ background: "linear-gradient(135deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
              <div className="text-sm font-black text-white">Lengkapi Exit Meeting — {exitList[exitEdit.idx]?.unit}</div>
              <button onClick={() => setExitEdit(null)} className="w-7 h-7 rounded-lg bg-white/15 hover:bg-white/30 flex items-center justify-center text-white text-sm font-bold">✕</button>
            </div>
            <div className="p-5 flex flex-col gap-3">
              {([
                { k: "linkPresensi", label: "Link Scan Presensi (Google Drive)", ph: "https://drive.google.com/..." },
                { k: "linkBA", label: "Link BA Exit Meeting (Google Drive)", ph: "https://drive.google.com/..." },
                { k: "temuanSepakat", label: "Jumlah Temuan yang Disepakati", ph: "0" },
              ] as const).map(f => (
                <div key={f.k}>
                  <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">{f.label}</label>
                  <input value={exitEdit[f.k]} onChange={e => setExitEdit(m => m ? { ...m, [f.k]: e.target.value } : m)} placeholder={f.ph}
                    disabled={f.k === "temuanSepakat" ? exitList[exitEdit.idx].temuanSepakat > 0 : !!exitList[exitEdit.idx][f.k]}
                    className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 disabled:bg-gray-50 disabled:text-gray-400" />
                </div>
              ))}
              <div>
                <label className="block text-[10px] font-bold text-gray-500 uppercase tracking-wide mb-1">Tindak Lanjut yang Disepakati</label>
                <textarea rows={3} value={exitEdit.tindakLanjut} onChange={e => setExitEdit(m => m ? { ...m, tindakLanjut: e.target.value } : m)}
                  disabled={exitList[exitEdit.idx].tindakLanjut !== "-"}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-xs text-gray-700 focus:outline-none focus:border-teal-400 disabled:bg-gray-50 disabled:text-gray-400" />
              </div>
              <p className="text-[10px] text-gray-400">Hanya isian yang belum terisi yang dapat diisi; data yang sudah terisi tidak dapat diubah. Status BA otomatis menjadi Ditandatangani setelah link BA terisi.</p>
              <div className="flex gap-2">
                <button onClick={() => {
                  const m = exitEdit;
                  setExitList(prev => prev.map((x, i) => i !== m.idx ? x : {
                    ...x,
                    linkPresensi: m.linkPresensi.trim() || null,
                    linkBA: m.linkBA.trim() || null,
                    ba: m.linkBA.trim() ? "Ditandatangani" : "Proses",
                    temuanSepakat: parseInt(m.temuanSepakat) || 0,
                    tindakLanjut: m.tindakLanjut.trim() || "-",
                  }));
                  setExitEdit(null);
                }} className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white" style={{ background: "var(--tsu-teal)" }}>Simpan</button>
                <button onClick={() => setExitEdit(null)} className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Audit page 3: KKA Link ───────────────────────────────────────────────────
function AuditPageKKA({ approved }: { approved?: DraftTemuan[] } = {}) {
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
    { id: "KKA-K-01", unit: "BAUK",     pengujian: "Rekonsiliasi Kas & Bank",  auditor: "Ratna D.", statusAudit: "Berjalan", linkAuditor: null,                                               linkAuditee: null },
  ]);

  const baseList = myUnit ? kkaList.filter(k => k.unit === myUnit) : kkaList;
  const units = myUnit ? [myUnit] : ["Semua", ...Array.from(new Set(kkaList.map(k => k.unit)))];
  const filtered = myUnit ? baseList : (filterUnit === "Semua" ? kkaList : kkaList.filter(k => k.unit === filterUnit));

  function LinkCell({ id, role, existingLink, canEdit, locked }: { id: string; role: "auditor"|"auditee"; existingLink: string|null; canEdit: boolean; locked?: boolean }) {
    const key = `${id}-${role}`;
    const savedLink = linkMap[key] ?? existingLink;
    return (
      <div className="flex items-center gap-1">
        {savedLink ? (
          <AksiBtn kind="link" title="Buka Link" href={savedLink} />
        ) : (
          <span className="text-[9px] text-gray-300 italic">Belum ada link</span>
        )}
        {canEdit && !locked && (
          <AksiBtn kind="edit" title={savedLink ? "Ganti Link" : "Isi Link"} onClick={() => setEditingLink({ key, value: savedLink ?? "" })} />
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
            Unit: {myUnit}
          </div>
        )}
        <div className="text-[10px] text-gray-400 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
          Dokumen Auditor = file kertas kerja internal. Dokumen Auditee = bukti/data dari unit yang diaudit.
        </div>
      </div>

      {/* KKA table */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
          <h4 className="text-xs font-bold text-gray-700">Kertas Kerja Audit — {myUnit ?? filterUnit}</h4>
          {!myUnit && canEdit && <button disabled={approved !== undefined && approved.length === 0} title={approved && approved.length === 0 ? "Belum ada temuan yang disetujui auditee" : undefined} onClick={() => setTambahModal("Tambah KKA")} className="text-xs font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--tsu-teal)" }}>
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
                    <LinkCell id={k.id} role="auditor" existingLink={k.linkAuditor} canEdit={!myUnit && canEdit} locked={k.statusAudit === "Selesai"} />
                  </td>
                  <td className="px-4 py-3">
                    <LinkCell id={k.id} role="auditee" existingLink={k.linkAuditee} canEdit={!!myUnit} locked={k.statusAudit === "Selesai"} />
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
          ...(approved ? [{ key:"temuan", label:"Temuan yang Disetujui Auditee", type:"select" as const, options: approved.map(d => `${d.no} — ${d.unit} — ${d.temuan}`) }] : []),
          ...(approved ? [] : [{ key:"unit",        label:"Unit Kerja",                          type:"select" as const, options:["BAAK","BAKPU","BAUK","Sarpras","SDM","BPU","D3-DKV","D3-DPT","D3-SI","D3-TI","Fak. Sains & Hum.","Fak. Teknik","Fak. Vokasi","KUI","LPM","LPPM","Perpustakaan","PMB","S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi","S1-ReKom","S1-Sistem Informasi","Marcomm","PIKD"] }]),
          { key:"program",     label:"Program Pengujian",                   type:"textarea" },
          { key:"auditor",     label:"Auditor Penanggung Jawab",            type:"text" },
          { key:"linkAuditor", label:"Link Dokumen Auditor (Google Drive)", type:"url" },
          { key:"linkAuditee", label:"Link Bukti Auditee (Google Drive)",   type:"url", required:false },
        ]}
        onSave={(v) => setKkaList(prev => [{ id: v.noKKA || `KKA-NEW-${prev.length + 1}`, unit: (approved ? approved.find(d => d.no === (v.temuan || "").split(" — ")[0])?.unit : v.unit) || "-", pengujian: v.program || "-", auditor: v.auditor || "-", statusAudit: "Baru", linkAuditor: (v.linkAuditor || null) as string | null, linkAuditee: (v.linkAuditee || null) as string | null } as typeof prev[0], ...prev])}
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

function AuditPageLHA() {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const { laporanList } = useContext(AuditCtx);
  const rows = myUnit ? laporanList.filter(l => l.unit === myUnit) : laporanList;
  return (
    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <h4 className="text-xs font-bold text-gray-700">Laporan Hasil Audit (LHA){myUnit ? ` — ${myUnit}` : ""}</h4>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="bg-gray-50 text-left">
            {["No LHA","Unit Kerja","Tgl Terbit","Temuan","Rekomendasi","Status","Dokumen"].map(h => <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
          </tr></thead>
          <tbody>
            {rows.map(l => (
              <tr key={l.no} className="border-t border-gray-50 hover:bg-gray-50">
                <td className="px-4 py-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{l.no}</td>
                <td className="px-4 py-3 font-semibold text-gray-700">{l.unit}</td>
                <td className="px-4 py-3 text-gray-500 whitespace-nowrap">{l.tgl}</td>
                <td className="px-4 py-3 text-center font-black text-red-500">{l.temuan}</td>
                <td className="px-4 py-3 text-center font-black text-amber-600">{l.rekomendasi}</td>
                <td className="px-4 py-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${l.status==="Diterima"?"bg-green-50 text-green-600":l.status==="Revisi"?"bg-amber-50 text-amber-600":"bg-gray-100 text-gray-500"}`}>{l.status}</span></td>
                <td className="px-4 py-3">{l.link
                  ? <AksiBtn kind="link" title="Buka Dokumen LHA" href={l.link} />
                  : <span className="text-[10px] text-gray-300">Belum ada link</span>}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-xs text-gray-400">Belum ada LHA.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ── Penugasan & Jadwal (auditor) — pasangan "Pemberitahuan & Jadwal" auditee ──
function PenugasanJadwalPanel() {
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const { suratKeluar } = useContext(SuratKeluarCtx);
  const { rapatList } = useContext(RapatCtx);
  const { rencanaList } = useContext(AuditCtx);
  const { jadwalSetuju, setJadwalSetuju } = useContext(LapanganCtx);
  const notify = useContext(NotifyCtx);
  const rencana = rencanaList.filter(r => r.status === "Disetujui");
  // Surat Tugas hanya yang sudah dikirim Back Office (Draft belum terlihat)
  const suratTugas = suratKeluar.filter(s => (s.jenis ? s.jenis === "Tugas" : /tugas/i.test(s.perihal)) && s.disposisi !== "Draft");
  const rapat = rapatList.filter(r => r.auditNo && r.status !== "Batal");
  const chip = (ok?: boolean) => ok ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500";
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700">Surat Tugas Auditor</h4>
        <p className="text-[10px] text-gray-400 mb-3">Bersumber dari Surat Keluar Back Office yang ditujukan ke Tim Auditor.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100">
              {["No. Surat","Audit","Tanggal","Perihal","Kepada","Status","Dokumen"].map(h => <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {suratTugas.map(s => (
                <tr key={s.no} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{s.no}</td>
                  <td className="py-2 pr-3 font-mono text-[10px] text-teal-700 font-bold whitespace-nowrap">{s.auditNo ?? "—"}</td>
                  <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{s.tgl}</td>
                  <td className="py-2 pr-3 font-medium text-gray-700">{s.perihal}</td>
                  <td className="py-2 pr-3 text-gray-500">{s.kepada}</td>
                  <td className="py-2 pr-3"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{s.disposisi}</span></td>
                  <td className="py-2">{s.link ? <AksiBtn kind="link" title="Buka Surat Tugas" href={s.link} /> : <span className="text-[10px] text-gray-300">Belum ada link</span>}</td>
                </tr>
              ))}
              {suratTugas.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-xs text-gray-400">Belum ada surat tugas.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700">Jadwal Entry Meeting</h4>
        <p className="text-[10px] text-gray-400 mb-3">Dijadwalkan Back Office. Entry Meeting dapat dilaksanakan setelah tanggal disetujui auditor dan auditee.</p>
        <div className="flex flex-col gap-2">
          {rapat.map(r => {
            const st = jadwalSetuju[r.id] ?? {};
            return (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-gray-100">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-gray-700">{r.judul} <span className="ml-1 font-mono text-[9px] font-bold text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">{r.auditNo}</span></div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{r.tgl} · {r.jam} WIB · {r.tempat}</div>
                  <div className="flex gap-1.5 mt-1.5">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${chip(st.auditor)}`}>Auditor: {st.auditor ? "Setuju" : "Belum"}</span>
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${chip(st.auditee)}`}>Auditee: {st.auditee ? "Setuju" : "Belum"}</span>
                  </div>
                </div>
                {canEdit && r.status === "Terjadwal" && (st.auditor
                  ? <span className="text-[10px] font-semibold text-green-600">Tanggal disetujui</span>
                  : <button onClick={() => { setJadwalSetuju(prev => ({ ...prev, [r.id]: { ...prev[r.id], auditor: true } })); notify({ title: `Auditor menyetujui jadwal ${r.judul}`, body: `${r.tgl} · ${r.jam} WIB`, tag: "Rapat", roles: ["backoffice", "full"] }); }}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Setujui Tanggal</button>)}
                {r.status !== "Terjadwal" && <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">{r.status}</span>}
              </div>
            );
          })}
          {rapat.length === 0 && <div className="text-center py-6 text-xs text-gray-400">Belum ada Entry Meeting yang dijadwalkan.</div>}
        </div>
      </div>
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 mb-3">Penugasan dari Rencana Audit Disetujui</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100">
              {["No PA","Unit Kerja","Jenis Audit","Tim Auditor","Tgl Mulai"].map(h => <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {rencana.map(r => (
                <tr key={r.no} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 font-bold">{r.no}</td>
                  <td className="py-2 pr-3 font-semibold text-gray-700">{r.unit}</td>
                  <td className="py-2 pr-3 text-gray-600">{r.jenis}</td>
                  <td className="py-2 pr-3 text-gray-500">{r.tim}</td>
                  <td className="py-2 text-gray-500 whitespace-nowrap">{r.tglMulai}</td>
                </tr>
              ))}
              {rencana.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-xs text-gray-400">Belum ada rencana audit yang disetujui.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ── Checklist pelaksanaan (prosedur & risk assessment) ───────────────────────
const CHECKLIST_PELAKSANAAN = ["Prosedur & SOP unit direviu", "Risk assessment unit dilakukan", "Program audit (pengujian) dijalankan", "Dokumen auditee diverifikasi", "Bukti audit didokumentasikan"];
function ChecklistPelaksanaanPanel() {
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const { rencanaList } = useContext(AuditCtx);
  const audits = rencanaList.filter(r => r.status === "Disetujui");
  const [sel, setSel] = useState(audits[0]?.no ?? "");
  const [cek, setCek] = useState<Record<string, boolean[]>>({});
  const cl = cek[sel] ?? CHECKLIST_PELAKSANAAN.map(() => false);
  const n = cl.filter(Boolean).length;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
        <div>
          <h4 className="text-xs font-bold text-gray-700">Checklist Prosedur & Risk Assessment</h4>
          <p className="text-[10px] text-gray-400">Selesaikan pemeriksaan sebelum menginput temuan.</p>
        </div>
        <div className="flex items-center gap-2">
          <select value={sel} onChange={e => setSel(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-[10px] text-gray-600 focus:outline-none">
            {audits.map(a => <option key={a.no} value={a.no}>{a.no} — {a.unit}</option>)}
          </select>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${n === CHECKLIST_PELAKSANAAN.length ? "bg-green-50 text-green-600" : "bg-amber-50 text-amber-600"}`}>{n}/{CHECKLIST_PELAKSANAAN.length}</span>
        </div>
      </div>
      {audits.length === 0 ? <div className="text-center py-4 text-xs text-gray-400">Belum ada rencana audit yang disetujui.</div> : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          {CHECKLIST_PELAKSANAAN.map((item, idx) => (
            <label key={item} className={`flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px] cursor-pointer ${cl[idx] ? "border-teal-100 bg-teal-50/50 text-teal-800" : "border-gray-100 text-gray-600 hover:bg-gray-50"}`}>
              <input type="checkbox" className="mt-0.5 accent-teal-600" checked={cl[idx]} disabled={!canEdit}
                onChange={() => setCek(prev => ({ ...prev, [sel]: cl.map((c, k) => k === idx ? !c : c) }))} />
              {item}
            </label>
          ))}
        </div>
      )}
    </div>
  );
}

// ── PwAudit shell driven by top-strip subSection ─────────────────────────────
function PwAudit({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  if (user?.role === "auditee") {
    return (
      <div className="flex flex-col gap-4">
        {subSection === "Pemberitahuan & Jadwal" && user.unit ? <PemberitahuanJadwalPanel unit={user.unit} />
          : subSection === "Draft Temuan & Konfirmasi" ? <AuditPageLapangan key="draft" fixedStep="draft" />
          : subSection === "Exit Meeting" ? <><AuditPageLapangan key="exit" fixedStep="exit" /><AuditPageLHA /></>
          : <AuditPageLapangan key="entry" fixedStep="entry" />}
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-4">
      {(subSection === "Rencana Audit" || !subSection) && <AuditPageRencana view="rencana" />}
      {subSection === "Penugasan & Jadwal"   && <PenugasanJadwalPanel />}
      {subSection === "Entry Meeting"        && <AuditPageLapangan key="entry" fixedStep="entry" />}
      {subSection === "Pelaksanaan & Temuan" && <><ChecklistPelaksanaanPanel /><AuditPageLapangan key="draft" fixedStep="draft" /></>}
      {subSection === "Exit Meeting & LHA"   && <><AuditPageLapangan key="exit" fixedStep="exit" /><AuditPageRencana view="lha" /></>}
    </div>
  );
}


function PwRTL({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  if (!myUnit && subSection === "Monitoring Tindak Lanjut") return <MonitoringTLPanel />;
  return <PwRTLList />;
}

// ── Monitoring Tindak Lanjut + Penutupan Audit (auditor) ─────────────────────
function MonitoringTLPanel() {
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const { rtlList, temuanList, setTlStatusRtl } = useContext(TemuanCtx);
  const { rencanaList } = useContext(AuditCtx);
  const { penutupan, setPenutupan, residualList, setResidualList } = useContext(LapanganCtx);
  const notify = useContext(NotifyCtx);
  const [confirm, setConfirm] = useState<{ title: string; body: string; label: string; tone: "teal" | "red" | "amber"; fn: () => void } | null>(null);
  const [filterUnit, setFilterUnit] = useState("Semua");
  const rtlCode = (id: number) => `RTL-${String(id).padStart(3, "0")}`;
  const temuanOf = (id: string) => temuanList.find(t => t.id === id);
  const today = () => new Date().toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });

  const units = ["Semua", ...Array.from(new Set(rtlList.map(r => r.unit)))];
  const rows = filterUnit === "Semua" ? rtlList : rtlList.filter(r => r.unit === filterUnit);

  // Rekap per audit: temuan, RTL, dan berapa yang sudah Close
  const audits = Array.from(new Set(temuanList.map(t => t.auditNo))).filter(no => no && no !== "-").map(no => {
    const temuan = temuanList.filter(t => t.auditNo === no);
    const rtl = rtlList.filter(r => temuan.some(t => t.id === r.temuanId));
    // Tuntas = RTL sudah Close, atau pelaksanaan 100% (siap ditutup lewat Penutupan Audit)
    const closed = temuan.filter(t => rtl.some(r => r.temuanId === t.id && (rtlTlStatus(r) === "Close" || r.progres === 100)));
    const residual = temuan.filter(t => !closed.includes(t));
    return { no, unit: rencanaList.find(r => r.no === no)?.unit ?? temuan[0]?.unit ?? "-", temuan, rtl, closed, residual };
  });

  const toneCls = { teal: "var(--tsu-teal)", red: "#ef4444", amber: "#f59e0b" };

  return (
    <div className="flex flex-col gap-4">
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {TL_STATUS_LIST.map(st => (
          <div key={st} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
            <div className="text-2xl font-black" style={{ color: TL_STATUS_STYLE[st].color }}>{rtlList.filter(r => rtlTlStatus(r) === st).length}</div>
            <div className="text-[10px] font-semibold text-gray-600">{st}</div>
            <div className="text-[9px] text-gray-400 leading-snug">{TL_STATUS_STYLE[st].desc}</div>
          </div>
        ))}
      </div>

      {/* Pemantauan pelaksanaan */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div>
            <h4 className="text-xs font-bold text-gray-700">Pemantauan Pelaksanaan Tindak Lanjut</h4>
            <p className="text-[10px] text-gray-400">Periksa progres & bukti pelaksanaan dari auditee, lalu perbarui status (Diterima / Progres). Status Open / Close ditetapkan melalui Penutupan Audit.</p>
          </div>
          <select value={filterUnit} onChange={e => setFilterUnit(e.target.value)} className="border border-gray-200 rounded-lg px-2 py-1 text-[10px] text-gray-600 focus:outline-none">
            {units.map(u => <option key={u} value={u}>{u === "Semua" ? "Semua Unit" : u}</option>)}
          </select>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="text-left border-b border-gray-100">
              {["ID RTL","Unit","Temuan & RTL","Progres","Jatuh Tempo","Bukti","Status"].map(h => <th key={h} className="pb-2 text-[10px] text-gray-400 font-semibold whitespace-nowrap pr-3">{h}</th>)}
            </tr></thead>
            <tbody>
              {rows.map(r => {
                const tl = rtlTlStatus(r);
                const sisa = sisaHariRtl(r.target);
                return (
                  <tr key={r.id} className={`border-b border-gray-50 last:border-0 ${tl !== "Close" && sisa < 0 ? "bg-red-50/60" : ""}`}>
                    <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{rtlCode(r.id)}</td>
                    <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{r.unit}</td>
                    <td className="py-2 pr-3 max-w-[260px]">
                      <div className="text-[10px] text-gray-600 truncate" title={temuanOf(r.temuanId)?.deskripsi}><span className="font-mono text-gray-400">{r.temuanId}</span> · {temuanOf(r.temuanId)?.deskripsi ?? "—"}</div>
                      <div className="text-[10px] text-gray-400 truncate">→ {r.rencana}</div>
                    </td>
                    <td className="py-2 pr-3 w-28">
                      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden"><div className="h-full rounded-full" style={{ width: `${r.progres}%`, background: r.progres === 100 ? "#22c55e" : "var(--tsu-teal)" }} /></div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{r.progres}%</div>
                    </td>
                    <td className="py-2 pr-3 whitespace-nowrap">
                      <div className="text-[10px] text-gray-600">{r.target}</div>
                      {tl !== "Close" && <div className={`text-[9px] font-bold ${sisa < 0 ? "text-red-600" : sisa <= 7 ? "text-amber-600" : "text-gray-400"}`}>{sisa < 0 ? `${Math.abs(sisa)} hari lewat` : `${sisa} hari lagi`}</div>}
                    </td>
                    <td className="py-2 pr-3">{r.bukti ? <AksiBtn kind="link" title="Buka Bukti Pelaksanaan" href={r.bukti} /> : <span className="text-[9px] text-gray-300 italic whitespace-nowrap">Belum ada</span>}</td>
                    <td className="py-2">
                      {canEdit && (tl === "Diterima" || tl === "Progres") ? (
                        <select value={tl} onChange={e => {
                          const next = e.target.value as TlStatus;
                          setConfirm({ title: `Ubah status ${rtlCode(r.id)}?`, body: `Status tindak lanjut ${r.unit} akan diubah dari "${tl}" menjadi "${next}". Auditee akan menerima notifikasi.`, label: "Ya, Ubah Status", tone: "teal",
                            fn: () => { setTlStatusRtl(r.id, next); notify({ title: `Status ${rtlCode(r.id)}: ${next}`, body: r.rencana, tag: "RTL", roles: ["auditee"], unit: r.unit }); } });
                        }} className={`text-[10px] font-bold border rounded-lg px-1.5 py-1 focus:outline-none ${TL_STATUS_STYLE[tl].cls}`} style={{ borderColor: `${TL_STATUS_STYLE[tl].color}55` }}>
                          {(["Diterima", "Progres"] as TlStatus[]).map(st => <option key={st} value={st}>{st}</option>)}
                        </select>
                      ) : <span title={tl === "Open" || tl === "Close" ? "Ditetapkan melalui Penutupan Audit" : undefined} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${TL_STATUS_STYLE[tl].cls}`}>{tl}</span>}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-xs text-gray-400">Belum ada tindak lanjut untuk dipantau.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      {/* Penutupan Audit */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700">Penutupan Audit</h4>
        <p className="text-[10px] text-gray-400 mb-3">Tetapkan status akhir per audit. <strong className="text-green-600">Close</strong> = seluruh temuan tuntas. <strong className="text-red-600">Open</strong> = masih ada temuan residual yang dibawa ke Risk Register untuk siklus berikutnya. Hasil penutupan otomatis tercatat di Riwayat Audit.</p>
        <div className="flex flex-col gap-2">
          {audits.map(a => {
            const st = penutupan[a.no];
            const allClosed = a.temuan.length > 0 && a.residual.length === 0;
            return (
              <div key={a.no} className="rounded-xl border border-gray-100 p-3 flex flex-wrap items-center gap-3">
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-gray-500">{a.no}</span>
                    <span className="text-xs font-bold text-gray-800">{a.unit}</span>
                    {st && <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${st.status === "Close" ? "bg-green-50 text-green-600" : "bg-red-50 text-red-600"}`}>{st.status}</span>}
                  </div>
                  <div className="text-[10px] text-gray-500 mt-0.5">{a.temuan.length} temuan · {a.rtl.length} RTL · {a.closed.length} tuntas · <span className={a.residual.length ? "text-red-600 font-semibold" : ""}>{a.residual.length} residual</span></div>
                  {st && <div className="text-[9px] text-gray-400 mt-0.5">Ditetapkan {st.tgl} oleh {st.oleh}{st.residualKe ? ` · Residual masuk Risk Register ${st.residualKe}` : ""}</div>}
                </div>
                {canEdit && !st && (
                  <div className="flex gap-1.5">
                    <button disabled={!allClosed} title={allClosed ? undefined : "Masih ada temuan yang belum tuntas"}
                      onClick={() => setConfirm({ title: `Tutup audit ${a.no} (Close)?`, body: `Seluruh ${a.temuan.length} temuan ${a.unit} dinyatakan tuntas dan semua RTL berstatus Close. Audit akan dicatat Selesai di Riwayat dan tidak dapat diubah lagi.`, label: "Ya, Close Audit", tone: "teal",
                        fn: () => { a.rtl.forEach(r => setTlStatusRtl(r.id, "Close")); setPenutupan(prev => ({ ...prev, [a.no]: { status: "Close", tgl: today(), oleh: user?.name ?? "Auditor" } })); notify({ title: `Audit ${a.no} ditutup (Close)`, body: `${a.unit}: seluruh tindak lanjut tuntas.`, tag: "Audit", roles: ["full", "auditee", "rektor"], unit: a.unit }); } })}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: "#22c55e" }}>Close</button>
                    <button disabled={a.residual.length === 0} title={a.residual.length ? undefined : "Tidak ada temuan residual"}
                      onClick={() => setConfirm({ title: `Tetapkan audit ${a.no} sebagai Open?`, body: `${a.residual.length} temuan residual ${a.unit} belum tuntas — RTL-nya berstatus Open, sedangkan RTL yang sudah tuntas berstatus Close. Setelah ini Anda dapat menambahkan temuan residual ke Risk Register.`, label: "Ya, Tetapkan Open", tone: "red",
                        fn: () => { a.rtl.forEach(r => setTlStatusRtl(r.id, a.closed.some(t => t.id === r.temuanId) ? "Close" : "Open")); setPenutupan(prev => ({ ...prev, [a.no]: { status: "Open", tgl: today(), oleh: user?.name ?? "Auditor" } })); notify({ title: `Audit ${a.no} berstatus Open`, body: `${a.unit}: ${a.residual.length} temuan residual.`, tag: "Audit", roles: ["full", "auditee", "backoffice"], unit: a.unit }); } })}
                      className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: "#ef4444" }}>Open</button>
                  </div>
                )}
                {canEdit && st?.status === "Open" && !st.residualKe && (
                  <button onClick={() => setConfirm({ title: "Tambahkan temuan residual ke Risk Register?", body: `${a.residual.length} temuan (${a.residual.map(t => t.id).join(", ")}) akan ditambahkan ke Risk Register Back Office sebagai dasar telaah PKPT siklus berikutnya.`, label: "Ya, Tambahkan", tone: "amber",
                    fn: () => {
                      const tgl = today();
                      const baru = a.residual.filter(t => !residualList.some(r => r.id === `RES-${t.id}`)).map(t => ({ id: `RES-${t.id}`, auditNo: a.no, unit: t.unit, uraian: t.deskripsi, kategori: t.kategori, tingkat: t.tingkat, tgl }));
                      setResidualList(prev => [...baru, ...prev]);
                      setPenutupan(prev => ({ ...prev, [a.no]: { ...prev[a.no], residualKe: tgl } }));
                      notify({ title: `${baru.length} risiko residual dari ${a.no}`, body: `${a.unit}: ditambahkan ke Risk Register untuk telaah siklus berikutnya.`, tag: "Risiko", roles: ["backoffice", "full"] });
                    } })}
                    className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100">Tambahkan temuan residual ke Risk Register</button>
                )}
              </div>
            );
          })}
          {audits.length === 0 && <div className="text-center py-6 text-xs text-gray-400">Belum ada audit dengan temuan.</div>}
        </div>
      </div>

      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.5)" }} onClick={() => setConfirm(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-5" onClick={e => e.stopPropagation()}>
            <div className="text-sm font-black text-gray-800">{confirm.title}</div>
            <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">{confirm.body}</p>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setConfirm(null)} className="flex-1 text-xs font-semibold py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
              <button onClick={() => { confirm.fn(); setConfirm(null); }} className="flex-1 text-xs font-bold py-2 rounded-lg text-white" style={{ background: toneCls[confirm.tone] }}>{confirm.label}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PwRTLList() {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const showVerif = false;
  const [detailRtlId, setDetailRtlId] = useState<number | null>(null);
  const [filterRTL, setFilterRTL] = useState("Semua");
  const { rtlList, temuanList, kirimBukti, setTlStatusRtl, updateRtl, tambahRtl } = useContext(TemuanCtx);
  const [editingBukti, setEditingBukti] = useState<{ id: number; value: string } | null>(null);
  const [editRtl, setEditRtl] = useState<{ id: number | null; temuanId: string; rencana: string; pic: string; target: string; link: string; bukti: string } | null>(null);
  const rtlCode = (id: number) => `RTL-${String(id).padStart(3, "0")}`;

  const sisaHari = sisaHariRtl;
  const temuanDesc = (id: string) => temuanList.find(t => t.id === id)?.deskripsi ?? id;
  const auditOf = (id: string) => temuanList.find(t => t.id === id)?.auditNo ?? "";

  const baseRTL2 = myUnit ? rtlList.filter(r => r.unit === myUnit) : rtlList;
  const rtlRows2 = filterRTL === "Semua" ? baseRTL2 : baseRTL2.filter(r => rtlTlStatus(r) === filterRTL);
  const countStatus = (st: TlStatus) => baseRTL2.filter(r => rtlTlStatus(r) === st).length;
  const rtlSummary = TL_STATUS_LIST.map(st => ({ name: st, value: baseRTL2.filter(r => rtlTlStatus(r) === st).length, color: TL_STATUS_STYLE[st].color }));

  return (
    <div className="flex flex-col gap-4">
      {/* Auditee header */}
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}></div>
          <div className="flex-1">
            <div className="text-sm font-black text-purple-800">Tindak Lanjut Rekomendasi (RTL) — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Selesaikan setiap rekomendasi sebelum batas waktu dan upload bukti penyelesaian.</div>
          </div>
        </div>
      )}
      {myUnit && !showVerif && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {TL_STATUS_LIST.map(st => (
            <div key={st} className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm text-center">
              <div className="text-2xl font-black" style={{ color: TL_STATUS_STYLE[st].color }}>{countStatus(st)}</div>
              <div className="text-[10px] text-gray-400 mt-0.5">{st}</div>
            </div>
          ))}
        </div>
      )}
      {myUnit && !showVerif && (
        <div className="p-3 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-700">
          <strong>Cara menyelesaikan RTL:</strong> Klik ikon edit pada kolom Aksi untuk memperbarui isian RTL serta menambah link dokumen RTL dan bukti pelaksanaan. Jatuh tempo ditetapkan saat menambah RTL dan tidak dapat diubah. Auditor SPI akan memantau pelaksanaan RTL melalui tautan tersebut dan memperbarui status secara langsung.
        </div>
      )}

      {/* Area + Waterfall charts */}
      {!showVerif && !myUnit && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Area chart trend */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Tren RTL per Bulan</h4>
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
              <h4 className="text-xs font-bold text-gray-700">Status RTL per Unit Kerja</h4>
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
          <div>
            <h4 className="text-xs font-bold text-gray-700">{myUnit ? `Daftar Tindak Lanjut (RTL) — ${myUnit}` : "Rencana Tindak Lanjut dari Auditee"}</h4>
            {!myUnit && <p className="text-[10px] text-gray-400 mt-0.5">Form dan link dokumen RTL yang disusun & dikirim auditee. Pemantauan status dilakukan di Monitoring Tindak Lanjut.</p>}
          </div>
          {myUnit && canEdit && (
            <button onClick={() => setEditRtl({ id: null, temuanId: temuanList.find(t => t.unit === myUnit)?.id ?? "", rencana: "", pic: "", target: "", link: "", bukti: "" })}
              className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white flex items-center gap-1 hover:opacity-90" style={{ background: "var(--tsu-teal)" }}>
              <span className="text-sm leading-none">+</span> Tambah RTL
            </button>
          )}
        </div>
        {false && (
        <div className="flex gap-3 mb-3">
          {rtlSummary.map(d=>(
            <div key={d.name} className="flex-1 text-center">
              <div className="text-xl font-black" style={{ color: d.color, fontFamily:"'Plus Jakarta Sans',sans-serif" }}>{d.value}</div>
              <div className="text-[9px] text-gray-400">{d.name}</div>
            </div>
          ))}
        </div>
        )}
        {/* Filter pills */}
        {myUnit && <div className="flex gap-2 flex-wrap mb-3">
          {["Semua", ...TL_STATUS_LIST].map(f => (
            <button key={f} onClick={() => setFilterRTL(f)} title={f === "Semua" ? undefined : TL_STATUS_STYLE[f as TlStatus].desc}
              className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
              style={filterRTL === f
                ? { background: f === "Semua" ? "var(--tsu-teal)" : TL_STATUS_STYLE[f as TlStatus].color, color: "#fff", borderColor: f === "Semua" ? "var(--tsu-teal)" : TL_STATUS_STYLE[f as TlStatus].color }
                : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
              {f}
            </button>
          ))}
        </div>}
        {myUnit ? (
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left border-b border-gray-100">
            {["ID RTL","Temuan","Judul RTL","Jatuh Tempo","Status","Aksi"].map(h=><th key={h} className="pb-2 text-[10px] text-gray-400 font-semibold whitespace-nowrap pr-3">{h}</th>)}
          </tr></thead>
          <tbody>
            {rtlRows2.length === 0 && (
              <tr><td colSpan={6} className="py-6 text-center text-xs text-gray-400">Belum ada RTL untuk filter ini.</td></tr>
            )}
            {rtlRows2.map(r => {
              const tl = rtlTlStatus(r);
              const sisa = sisaHari(r.target);
              const isLate = tl !== "Close" && sisa < 0;
              return (
                <tr key={r.id} className={`border-b border-gray-50 last:border-0 ${isLate ? "bg-red-50/60" : ""}`}>
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{rtlCode(r.id)}</td>
                  <td className="py-2 pr-3 max-w-[220px]">
                    <div className="font-mono text-[9px] text-gray-400">{r.temuanId}</div>
                    <div className="text-[10px] text-gray-600 truncate" title={temuanDesc(r.temuanId)}>{temuanDesc(r.temuanId)}</div>
                  </td>
                  <td className="py-2 pr-3 max-w-[260px]">
                    <div className="text-[11px] font-semibold text-gray-700 leading-snug">{r.rencana}</div>
                  </td>
                  <td className="py-2 pr-3 whitespace-nowrap">
                    <div className="text-[10px] text-gray-600">{r.target}</div>
                    {tl !== "Close" && <div className={`text-[9px] font-bold ${sisa < 0 ? "text-red-600" : sisa <= 7 ? "text-amber-600" : "text-gray-400"}`}>{sisa < 0 ? `${Math.abs(sisa)} hari lewat` : `${sisa} hari lagi`}</div>}
                  </td>
                  <td className="py-2 pr-3">
                    <span title={`${TL_STATUS_STYLE[tl].desc} (diperbarui oleh Auditor SPI)`} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full whitespace-nowrap ${TL_STATUS_STYLE[tl].cls}`}>{tl}</span>
                  </td>
                  <td className="py-2">
                    <div className="flex items-center gap-1">
                    {r.link && <AksiBtn kind="link" title="Buka Dokumen RTL" href={r.link} />}
                    {r.bukti && <AksiBtn kind="link" title="Buka Bukti Pelaksanaan" href={r.bukti} />}
                    {canEdit && (
                      <AksiBtn kind="edit" title={`Edit ${rtlCode(r.id)}`}
                        onClick={() => setEditRtl({ id: r.id, temuanId: r.temuanId, rencana: r.rencana, pic: r.pic, target: tglIdToIso(r.target), link: r.link ?? "", bukti: r.bukti ?? "" })} />
                    )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        </div>
        ) : (
        <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead><tr className="text-left border-b border-gray-100">
            {["ID RTL","Unit Kerja","Temuan","Rencana Tindak Lanjut","PIC","Jatuh Tempo","Dokumen","Aksi"].map(h=><th key={h} className="pb-2 text-[10px] text-gray-400 font-semibold whitespace-nowrap pr-3">{h}</th>)}
          </tr></thead>
          <tbody>
            {baseRTL2.length === 0 && (
              <tr><td colSpan={8} className="py-6 text-center text-xs text-gray-400">Belum ada RTL yang dikirim auditee.</td></tr>
            )}
            {baseRTL2.map(r => (
              <tr key={r.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50">
                <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{rtlCode(r.id)}</td>
                <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{r.unit}</td>
                <td className="py-2 pr-3 max-w-[220px]">
                  <div className="font-mono text-[9px] text-gray-400">{auditOf(r.temuanId)} · {r.temuanId}</div>
                  <div className="text-[10px] text-gray-600 truncate" title={temuanDesc(r.temuanId)}>{temuanDesc(r.temuanId)}</div>
                </td>
                <td className="py-2 pr-3 max-w-[260px] text-[11px] font-semibold text-gray-700 leading-snug">{r.rencana}</td>
                <td className="py-2 pr-3 text-[10px] text-gray-500 whitespace-nowrap">{r.pic}</td>
                <td className="py-2 pr-3 text-[10px] text-gray-500 whitespace-nowrap">{r.target}</td>
                <td className="py-2 pr-3">
                  <div className="flex items-center gap-1">
                    {r.link ? <AksiBtn kind="link" title="Buka Dokumen RTL" href={r.link} /> : <span className="text-[9px] text-gray-300 italic whitespace-nowrap">Belum ada link</span>}
                  </div>
                </td>
                <td className="py-2"><AksiBtn kind="detail" title="Lihat Form RTL" onClick={() => setDetailRtlId(r.id)} /></td>
              </tr>
            ))}
          </tbody>
        </table>
        </div>
        )}
      </div>}

      {detailRtlId !== null && (() => {
        const r = rtlList.find(x => x.id === detailRtlId);
        if (!r) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.45)" }} onClick={() => setDetailRtlId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-800">Form {rtlCode(r.id)}</div>
                  <div className="text-[10px] text-gray-400">Dikirim oleh auditee {r.unit}</div>
                </div>
                <button onClick={() => setDetailRtlId(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Tutup">×</button>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                {([["Temuan", `${r.temuanId} · ${temuanDesc(r.temuanId)}`], ["Audit", auditOf(r.temuanId) || "—"], ["Rencana Tindak Lanjut", r.rencana], ["PIC", r.pic], ["Jatuh Tempo", r.target]] as [string, string][]).map(([k, v]) => (
                  <div key={k}><div className="text-[10px] font-semibold text-gray-400">{k}</div><div className="text-xs text-gray-700">{v}</div></div>
                ))}
                <div className="flex gap-2 pt-1">
                  {r.link ? <a href={r.link} target="_blank" rel="noreferrer" className="text-[11px] font-bold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Buka Dokumen RTL</a>
                    : <span className="text-[10px] text-gray-400 italic">Auditee belum melampirkan link dokumen RTL.</span>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Modal input link bukti RTL */}
      {editingBukti && (
        <LinkModal
          title="Link Bukti RTL"
          description="Tempel link Google Drive atau tautan dokumen bukti tindak lanjut."
          value={editingBukti.value}
          onChange={v => setEditingBukti(p => p ? { ...p, value: v } : null)}
          onSave={() => {
            if (editingBukti.value.trim()) {
              kirimBukti(editingBukti.id, editingBukti.value.trim());
            }
          }}
          onClose={() => setEditingBukti(null)}
        />
      )}

      {/* Modal edit RTL (Auditee) */}
      {editRtl && (() => {
        const isNew = editRtl.id === null;
        const temuanUnit = temuanList.filter(t => t.unit === myUnit);
        const valid = editRtl.temuanId && editRtl.rencana.trim() && editRtl.pic.trim() && editRtl.target;
        const inp = "w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.45)" }} onClick={() => setEditRtl(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md" onClick={e => e.stopPropagation()}>
              <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                <div>
                  <div className="text-sm font-bold text-gray-800">{isNew ? "Tambah RTL" : `Edit ${rtlCode(editRtl.id!)}`}</div>
                  <div className="text-[10px] text-gray-400">{isNew ? "Status awal: Diterima (Progres bila bukti diisi). Selanjutnya diperbarui Auditor SPI." : "Status RTL diperbarui oleh Auditor SPI"}</div>
                </div>
                <button onClick={() => setEditRtl(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Tutup">×</button>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Temuan</span>
                  {isNew ? (
                    <select value={editRtl.temuanId} onChange={e => setEditRtl({ ...editRtl, temuanId: e.target.value })} className={inp}>
                      {temuanUnit.length === 0 && <option value="">Belum ada temuan untuk unit ini</option>}
                      {temuanUnit.map(t => <option key={t.id} value={t.id}>{t.id} · {t.deskripsi}</option>)}
                    </select>
                  ) : (
                    <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2"><span className="font-mono text-gray-400">{editRtl.temuanId}</span> · {temuanDesc(editRtl.temuanId)}</div>
                  )}
                </label>
                <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Judul RTL</span>
                  <textarea rows={2} value={editRtl.rencana} onChange={e => setEditRtl({ ...editRtl, rencana: e.target.value })} className={inp} /></label>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">PIC</span>
                    <input value={editRtl.pic} onChange={e => setEditRtl({ ...editRtl, pic: e.target.value })} className={inp} /></label>
                  <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Jatuh Tempo</span>
                    {isNew ? (
                      <input type="date" value={editRtl.target} onChange={e => setEditRtl({ ...editRtl, target: e.target.value })} className={inp} />
                    ) : (
                      <div className="text-xs text-gray-600 bg-gray-50 rounded-lg px-3 py-2" title="Jatuh tempo tidak dapat diubah setelah RTL dibuat">{tglIsoToId(editRtl.target)}</div>
                    )}
                  </label>
                </div>
                <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Link Dokumen RTL</span>
                  <input type="url" placeholder="https://drive.google.com/..." value={editRtl.link} onChange={e => setEditRtl({ ...editRtl, link: e.target.value })} className={inp} /></label>
                <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Link Bukti Pelaksanaan</span>
                  <input type="url" placeholder="https://drive.google.com/..." value={editRtl.bukti} onChange={e => setEditRtl({ ...editRtl, bukti: e.target.value })} className={inp} /></label>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                <button onClick={() => setEditRtl(null)} className="text-xs font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
                <button disabled={!valid}
                  onClick={() => {
                    const v = { rencana: editRtl.rencana.trim(), pic: editRtl.pic.trim(), target: tglIsoToId(editRtl.target), link: editRtl.link.trim() || null, bukti: editRtl.bukti.trim() || null };
                    if (editRtl.id === null) tambahRtl(editRtl.temuanId, v); else updateRtl(editRtl.id, v);
                    setEditRtl(null);
                  }}
                  className="text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--tsu-teal)" }}>{isNew ? "Tambah" : "Simpan"}</button>
              </div>
            </div>
          </div>
        );
      })()}

    </div>
  );
}

function PwRiwayat({ subSection }: { subSection: string }) {
  const user = useContext(UserCtx);
  const myUnit = user?.role === "auditee" ? user.unit : null;
  const canEdit = user?.role !== "rektor";
  const units = ["Fak. Teknik","LPPM","BAAK","Sarpras","BAUK","LPM"];
  const [activeUnit, setActiveUnit] = useState(myUnit ?? units[0]);
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const { laporanList, rencanaList } = useContext(AuditCtx);
  const { penutupan } = useContext(LapanganCtx);
  const statusPenutupan = (auditNo?: string) => {
    const p = auditNo ? penutupan[auditNo] : undefined;
    return p ? (p.status === "Close" ? "Selesai" : "Open (Residual)") : null;
  };

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
        status: statusPenutupan(l.auditNo) ?? (l.status === "Diterima" ? "Selesai" : "Berjalan"),
      };
      if (!result[l.unit]) result[l.unit] = [];
      result[l.unit].unshift(entry);
    });

    // Derive from rencanaList (active plans without LHA yet)
    const laporanUnits = new Set(laporanList.map(l => l.unit));
    rencanaList.filter(r => r.status === "Disetujui" && !laporanUnits.has(r.unit)).forEach(r => {
      const tahun = r.tglMulai.match(/\d{4}/)?.[0] ?? "2025";
      const entry = { tahun, jenis: r.jenis, ketua: r.tim.split(",")[0].trim(), temuan: 0, rtl: 0, status: statusPenutupan(r.no) ?? "Berjalan" };
      if (!result[r.unit]) result[r.unit] = [];
      result[r.unit].unshift(entry);
    });

    return result;
  }, [laporanList, rencanaList, penutupan]);

  type Berulang = { temuan: string; ids: string[]; units: string[]; frekuensi: number; rekomendasi: string; tren: "Meningkat" | "Stabil" };
  const { temuanList } = useContext(TemuanCtx);
  const [berulang, setBerulang] = useState<Berulang[]>([
    { temuan:"Dokumentasi tidak lengkap",     ids:["R-004"],          units:["LPPM","BAAK","LPM"],   frekuensi:3, rekomendasi:"Perlu SOP baku dokumentasi dan monitoring rutin per kuartal.", tren:"Meningkat" },
    { temuan:"Aset tidak terdokumentasi",      ids:["R-001","R-002"],  units:["Sarpras","BAUK"],      frekuensi:2, rekomendasi:"Integrasikan sistem SIMAK dengan checklist audit tahunan.",     tren:"Stabil"    },
    { temuan:"SOP tidak diperbarui",           ids:["R-003"],          units:["BAAK","LPM"],          frekuensi:2, rekomendasi:"Jadwalkan review SOP wajib setiap awal tahun akademik.",        tren:"Stabil"    },
    { temuan:"Laporan terlambat",              ids:["R-008"],          units:["LPM","LPPM"],          frekuensi:2, rekomendasi:"Tetapkan penanggung jawab pelaporan dan reminder otomatis.",   tren:"Meningkat" },
  ]);
  const [formBerulang, setFormBerulang] = useState<{ temuan: string; ids: string[]; rekomendasi: string; tren: "Meningkat" | "Stabil" } | null>(null);
  const [hapusBerulang, setHapusBerulang] = useState<number | null>(null);

  const showBerulang = subSection === "Temuan Berulang";
  const unitBerulang = myUnit ? berulang.filter(b => b.units.includes(myUnit)) : berulang;

  return (
    <div className="flex flex-col gap-4">
      {/* Auditee: header + ringkasan khusus unit */}
      {myUnit && (
        <div className="rounded-xl border border-purple-100 p-4 flex items-start gap-3" style={{ background: "#f5f3ff" }}>
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0" style={{ background: "#7c3aed", color: "#fff" }}></div>
          <div>
            <div className="text-sm font-black text-purple-800">Riwayat Audit — Unit {myUnit}</div>
            <div className="text-xs text-purple-500 mt-0.5">Rekam jejak seluruh audit yang pernah dilaksanakan di unit <strong>{myUnit}</strong>, termasuk temuan berulang.</div>
          </div>
        </div>
      )}
      {myUnit && (() => {
        const unitRiwayat = riwayat[myUnit] ?? [];
        const statusCls = (st: string) => st === "Selesai" ? "bg-green-50 text-green-600" : st === "Berjalan" ? "bg-amber-50 text-amber-600" : st === "Open (Residual)" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500";
        return (
          <div className="flex flex-col gap-4">
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-700">Riwayat Audit — {myUnit}</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-gray-50 text-left">
                    {["No","Tahun","Jenis Audit","Ketua Tim","Temuan","RTL","Status"].map(h => <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {unitRiwayat.map((r, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-[10px] text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-bold text-gray-700">{r.tahun}</td>
                        <td className="px-4 py-3 text-gray-600">Audit {r.jenis}</td>
                        <td className="px-4 py-3 text-gray-500">{r.ketua}</td>
                        <td className="px-4 py-3 text-center font-black text-red-500">{r.temuan}</td>
                        <td className="px-4 py-3 text-center font-black" style={{ color: "var(--tsu-teal)" }}>{r.rtl}</td>
                        <td className="px-4 py-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusCls(r.status)}`}>{r.status}</span></td>
                      </tr>
                    ))}
                    {unitRiwayat.length === 0 && <tr><td colSpan={7} className="text-center py-6 text-xs text-gray-400">Belum ada riwayat audit.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="bg-white rounded-xl border border-amber-100 shadow-sm overflow-hidden">
              <div className="px-4 py-3 border-b border-amber-100">
                <h4 className="text-xs font-bold text-amber-700">Temuan Berulang — {myUnit}</h4>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead><tr className="bg-amber-50/50 text-left">
                    {["No","Temuan","Frekuensi"].map(h => <th key={h} className="px-4 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {unitBerulang.map((b, i) => (
                      <tr key={i} className="border-t border-gray-50 hover:bg-gray-50">
                        <td className="px-4 py-3 text-[10px] text-gray-400">{i + 1}</td>
                        <td className="px-4 py-3 font-semibold text-gray-700">{b.temuan}</td>
                        <td className="px-4 py-3"><span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full whitespace-nowrap">{b.frekuensi}x muncul</span></td>
                      </tr>
                    ))}
                    {unitBerulang.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-xs text-gray-400">Tidak ada temuan berulang di unit {myUnit}.</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
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
              <h4 className="text-xs font-bold text-gray-700">Diagram Riwayat Audit per Unit Kerja</h4>
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
            <h4 className="text-xs font-bold text-gray-700 mb-1">Tren Temuan per Unit (per Tahun)</h4>
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
            <h4 className="text-xs font-bold text-gray-700 mb-3">Heatmap Intensitas Audit</h4>
            {(() => {
              const tahuns = ["2022","2023","2024","2025"];
              const heatData: Record<string, Record<string, number>> = {
                FakTeknik:     { "2022": 4, "2023": 4, "2024": 2, "2025": 3 },
                LPPM:          { "2022": 0, "2023": 0, "2024": 3, "2025": 2 },
                BAAK:          { "2022": 0, "2023": 3, "2024": 0, "2025": 2 },
                Sarpras:       { "2022": 5, "2023": 0, "2024": 3, "2025": 4 },
                BAUK:          { "2022": 0, "2023": 0, "2024": 0, "2025": 0 },
                LPM:           { "2022": 0, "2023": 2, "2024": 0, "2025": 0 },
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
      {!showBerulang && !myUnit && <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
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
              Export Riwayat
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
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status==="Selesai"?"bg-green-50 text-green-600":r.status==="Berjalan"?"bg-amber-50 text-amber-600":r.status==="Open (Residual)"?"bg-red-50 text-red-600":"bg-gray-100 text-gray-500"}`}>{r.status}</span>
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
      {showBerulang && !myUnit && <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-center justify-between mb-1">
          <h4 className="text-xs font-bold text-gray-700">Temuan Berulang</h4>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Lintas Unit</span>
            {canEdit && <button onClick={() => setFormBerulang({ temuan: "", ids: [], rekomendasi: "", tren: "Stabil" })}
              className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Temuan Berulang</button>}
          </div>
        </div>
        {/* brief summary stat */}
        <p className="text-[10px] text-gray-500 mb-3">
          <span className="font-bold text-red-600">{berulang.length} temuan berulang</span> ditemukan di{" "}
          <span className="font-bold text-gray-700">{new Set(berulang.flatMap(b => b.units)).size} unit</span> berbeda dalam 3 tahun terakhir.
        </p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="bg-gray-50 text-left">
              {["No","Temuan Berulang","ID Temuan","Unit Kerja","Frekuensi","Tren","Rekomendasi",...(canEdit ? ["Aksi"] : [])].map(h => <th key={h} className="px-3 py-2.5 text-[10px] font-bold text-gray-400 uppercase tracking-wider whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {berulang.map((b, i) => (
                <tr key={i} className="border-t border-gray-50 hover:bg-gray-50 align-top">
                  <td className="px-3 py-2.5 text-gray-400">{i + 1}</td>
                  <td className="px-3 py-2.5 font-semibold text-gray-700 min-w-[160px]">{b.temuan}</td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {b.ids.map(id => <span key={id} title={temuanList.find(t => t.id === id)?.deskripsi} className="font-mono text-[9px] font-bold px-1.5 py-0.5 rounded bg-gray-100 text-gray-600">{id}</span>)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex flex-wrap gap-1">
                      {b.units.map(u => <span key={u} className="text-[9px] px-1.5 py-0.5 rounded whitespace-nowrap" style={{ background:"var(--tsu-teal-light)", color:"var(--tsu-teal)" }}>{u}</span>)}
                    </div>
                  </td>
                  <td className="px-3 py-2.5"><span className="text-[10px] font-bold text-red-500 bg-red-50 px-2 py-0.5 rounded-full">{b.frekuensi}x</span></td>
                  <td className="px-3 py-2.5 whitespace-nowrap"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${b.tren === "Meningkat" ? "bg-red-50 text-red-600" : "bg-gray-100 text-gray-500"}`}>{b.tren === "Meningkat" ? "↑ Meningkat" : "→ Stabil"}</span></td>
                  <td className="px-3 py-2.5 text-[10px] text-amber-800 min-w-[220px]">{b.rekomendasi}</td>
                  {canEdit && <td className="px-3 py-2.5"><AksiBtn kind="hapus" title="Hapus temuan berulang" onClick={() => setHapusBerulang(i)} /></td>}
                </tr>
              ))}
              {berulang.length === 0 && <tr><td colSpan={8} className="py-6 text-center text-xs text-gray-400">Belum ada temuan berulang.</td></tr>}
            </tbody>
          </table>
        </div>
        {hapusBerulang !== null && (
          <ConfirmModal message={`Hapus temuan berulang "${berulang[hapusBerulang]?.temuan}"?`}
            onConfirm={() => { setBerulang(prev => prev.filter((_, k) => k !== hapusBerulang)); setHapusBerulang(null); }}
            onCancel={() => setHapusBerulang(null)} />
        )}
        {formBerulang && (() => {
          const f = formBerulang;
          const valid = f.temuan.trim() && f.ids.length >= 1;
          const inp = "w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400";
          return (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(15,23,42,0.45)" }} onClick={() => setFormBerulang(null)}>
              <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col" onClick={e => e.stopPropagation()}>
                <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <div className="text-sm font-bold text-gray-800">Tambah Temuan Berulang</div>
                    <div className="text-[10px] text-gray-400">Pilih ID temuan dari Daftar Temuan yang memiliki pola sama.</div>
                  </div>
                  <button onClick={() => setFormBerulang(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none" aria-label="Tutup">×</button>
                </div>
                <div className="px-5 py-4 flex flex-col gap-3 overflow-y-auto">
                  <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Judul Temuan Berulang</span>
                    <input value={f.temuan} onChange={e => setFormBerulang({ ...f, temuan: e.target.value })} placeholder="Contoh: Dokumentasi tidak lengkap" className={inp} /></label>
                  <div className="flex flex-col gap-1">
                    <span className="text-[10px] font-semibold text-gray-500">ID Temuan ({f.ids.length} dipilih)</span>
                    <div className="border border-gray-200 rounded-lg max-h-52 overflow-y-auto divide-y divide-gray-50">
                      {temuanList.map(t => (
                        <label key={t.id} className="flex items-start gap-2 px-3 py-2 text-[11px] cursor-pointer hover:bg-gray-50">
                          <input type="checkbox" className="mt-0.5 accent-teal-600" checked={f.ids.includes(t.id)}
                            onChange={() => setFormBerulang({ ...f, ids: f.ids.includes(t.id) ? f.ids.filter(x => x !== t.id) : [...f.ids, t.id] })} />
                          <span className="font-mono text-[10px] font-bold text-gray-500 w-12 flex-shrink-0">{t.id}</span>
                          <span className="flex-1 text-gray-700">{t.deskripsi}</span>
                          <span className="text-[9px] text-gray-400 whitespace-nowrap">{t.unit}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                  <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Rekomendasi</span>
                    <textarea rows={2} value={f.rekomendasi} onChange={e => setFormBerulang({ ...f, rekomendasi: e.target.value })} className={inp} /></label>
                  <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-500">Tren</span>
                    <select value={f.tren} onChange={e => setFormBerulang({ ...f, tren: e.target.value as "Meningkat" | "Stabil" })} className={inp}>
                      <option value="Stabil">Stabil</option><option value="Meningkat">Meningkat</option>
                    </select></label>
                </div>
                <div className="px-5 py-3 border-t border-gray-100 flex justify-end gap-2">
                  <button onClick={() => setFormBerulang(null)} className="text-xs font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
                  <button disabled={!valid} onClick={() => {
                    const units = Array.from(new Set(f.ids.map(id => temuanList.find(t => t.id === id)?.unit).filter((u): u is string => !!u)));
                    setBerulang(prev => [...prev, { temuan: f.temuan.trim(), ids: f.ids, units, frekuensi: f.ids.length, rekomendasi: f.rekomendasi.trim() || "—", tren: f.tren }]);
                    setFormBerulang(null);
                  }} className="text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--tsu-teal)" }}>Tambah</button>
                </div>
              </div>
            </div>
          );
        })()}
      </div>}

    </div>
  );
}

const pwEvents: Record<number, { label: string; type: string }[]> = {
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

const siklusData = [
  { unit: "BAAK",              start: 1, dur: 2 },
  { unit: "LPPM",              start: 2, dur: 2 },
  { unit: "Sarpras",           start: 4, dur: 3 },
  { unit: "BAUK",              start: 5, dur: 3 },
  { unit: "Fak. Teknik",       start: 7, dur: 2 },
  { unit: "LPM",               start: 9, dur: 2 },
];

function SiklusAuditPanel({ onlyUnit }: { onlyUnit: string | null }) {
  const rows = onlyUnit ? siklusData.filter(d => d.unit === onlyUnit) : siklusData;
  const ganttData = rows.map(d => ({ name: d.unit, mulai: d.start, durasi: d.dur }));
  if (rows.length === 0) return <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm text-xs text-gray-400 text-center">Unit {onlyUnit} belum masuk siklus audit tahun ini.</div>;
  return (
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
        {rows.map((d, i) => (
          <div key={i} className="flex items-center gap-2 p-2 rounded-lg bg-gray-50 text-xs">
            <span className="w-2 h-2 rounded-sm flex-shrink-0" style={{ background: "var(--tsu-teal)" }} />
            <span className="font-medium text-gray-700">{d.unit}</span>
            <span className="text-gray-400 ml-auto">{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"][d.start - 1]}–{["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agt","Sep","Okt","Nov","Des"][d.start + d.dur - 2]}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// Agenda SPI — data periodik 1 tahun. Backend: tabel `agenda_spi` (tanggal, judul, jenis, pihak[]),
// rapat dari Jadwal Rapat (RapatCtx) ikut digabung otomatis.
type AgendaItem = { tgl: number; bln: number; judul: string; jenis: "rapat" | "audit" | "rtl" | "deadline"; pihak: string[]; jam?: string; tempat?: string; sumber?: "rapat" };
const AGENDA_AUDITOR = ["Budi Santoso", "Ratna Dewi", "Andi Prasetyo", "Siti Aisyah"];
const AGENDA_UNIT = ["BAAK", "LPPM", "Sarpras", "BAUK", "LPM", "Fak. Teknik", "Perpustakaan", "PMB", "Marcomm", "S1-Manajemen"];
const AGENDA_TARGET = [6, 12, 19, 23, 31, 15, 5, 11, 28, 21, 9, 7];
const AGENDA_SEED: AgendaItem[] = (() => {
  let seed = 7;
  const rnd = (n: number) => { seed = (seed * 9301 + 49297) % 233280; return Math.floor((seed / 233280) * n); };
  const daysIn = [31,28,31,30,31,30,31,31,30,31,30,31];
  const out: AgendaItem[] = [];
  AGENDA_TARGET.forEach((t, mi) => {
    for (let i = 0; i < t; i++) {
      let tgl = 1 + rnd(daysIn[mi]);
      const dow = new Date(2025, mi, tgl).getDay();
      if (dow === 0) tgl = Math.min(daysIn[mi], tgl + 1); else if (dow === 6) tgl = Math.max(1, tgl - 1);
      const unit = AGENDA_UNIT[rnd(AGENDA_UNIT.length)];
      const a1 = AGENDA_AUDITOR[rnd(4)];
      const a2 = AGENDA_AUDITOR.filter(x => x !== a1)[rnd(3)];
      const k = rnd(10);
      if (k < 3) out.push({ tgl, bln: mi, jenis: "rapat", judul: ["Rapat Internal SPI", "Rapat Koordinasi Tim Audit", "Rapat Evaluasi Mingguan"][rnd(3)], pihak: ["Kepala SPI", "Anggota SPI"] });
      else if (k < 6) out.push({ tgl, bln: mi, jenis: "audit", judul: `${["Audit", "Entry Meeting", "Exit Meeting", "Audit Lapangan"][rnd(4)]} ${unit}`, pihak: [`${a1} (Ketua Tim)`, `${a2} (Anggota)`, `Unit Kerja ${unit}`] });
      else if (k < 8) out.push({ tgl, bln: mi, jenis: "rtl", judul: `RTL ${unit}`, pihak: [a1, `Unit Kerja ${unit}`] });
      else out.push({ tgl, bln: mi, jenis: "deadline", judul: `Deadline ${["Laporan Audit", "Tindak Lanjut", "Dokumen Bukti"][rnd(3)]} ${unit}`, pihak: [a1, `Unit Kerja ${unit}`] });
    }
  });
  return out;
})();
// Ringkasan agenda SPI 1 tahun — ditampilkan di bagian atas menu Kalender (Back Office).
function AgendaRingkasanSPI() {
  const { rapatList } = useContext(RapatCtx);
  const monthShort = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];

  const agenda = useMemo<AgendaItem[]>(() => {
    const fromRapat: AgendaItem[] = rapatList.filter(r => r.status !== "Batal").flatMap(r => {
      const [d, m, y] = r.tgl.split(" ");
      const bln = monthShort.indexOf(m);
      if (y !== "2025" || bln < 0) return [];
      return [{ tgl: parseInt(d), bln, judul: r.judul, jenis: "rapat" as const, pihak: r.peserta, jam: r.jam, tempat: r.tempat, sumber: "rapat" as const }];
    });
    return [...AGENDA_SEED, ...fromRapat];
  }, [rapatList]);

  const countJenis = (j: AgendaItem["jenis"]) => agenda.filter(a => a.jenis === j).length;

  return (
    <div className="grid grid-cols-5 gap-3">
        {[
          { label:"Total Agenda 2025",  value:agenda.length,          cls:"bg-teal-50 border-teal-100 text-teal-700"       },
          { label:"Rapat",              value:countJenis("rapat"),    cls:"bg-blue-50 border-blue-100 text-blue-700"       },
          { label:"Audit",              value:countJenis("audit"),    cls:"bg-purple-50 border-purple-100 text-purple-700" },
          { label:"RTL",                value:countJenis("rtl"),      cls:"bg-amber-50 border-amber-100 text-amber-700"    },
          { label:"Deadline",           value:countJenis("deadline"), cls:"bg-red-50 border-red-100 text-red-700"          },
        ].map(s => (
          <div key={s.label} className={`rounded-xl border p-3 flex flex-col gap-1 ${s.cls}`}>
            <div className="text-2xl font-black leading-none">{s.value}</div>
            <div className="text-[9px] font-semibold opacity-80">{s.label}</div>
          </div>
        ))}
    </div>
  );
}

function PemberitahuanJadwalPanel({ unit }: { unit: string }) {
  const { suratKeluar } = useContext(SuratKeluarCtx);
  const { rapatList } = useContext(RapatCtx);
  const { rencanaList } = useContext(AuditCtx);
  const rencana = rencanaList.filter(r => r.unit === unit);
  const auditUnit = new Set(rencana.map(r => r.no));
  // Surat Pemberitahuan terkirim untuk audit unit ini (relasi auditNo; fallback pencocokan teks untuk data lama)
  const surat = suratKeluar.filter(s => s.disposisi !== "Draft" && (s.jenis ? s.jenis === "Pemberitahuan" : /pemberitahuan/i.test(s.perihal))
    && (s.auditNo ? auditUnit.has(s.auditNo) : s.kepada.toLowerCase().includes(unit.toLowerCase())));
  const rapat = rapatList.filter(r => r.peserta.includes(unit) && /entry|exit|kick-off|penutupan|audit/i.test(r.judul));
  const rapatStyle: Record<string, string> = { Terjadwal: "bg-blue-50 text-blue-600", Selesai: "bg-green-50 text-green-600", Batal: "bg-gray-100 text-gray-500" };
  const { jadwalSetuju, setJadwalSetuju } = useContext(LapanganCtx);
  const notify = useContext(NotifyCtx);
  return (
    <div className="flex flex-col gap-4">
      <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700 mb-3">Rencana Audit (Program Audit) — {unit}</h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100">
              {["No PA","Jenis Audit","Tim Auditor","Anggaran","Tgl Mulai","Status"].map(h => <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {rencana.map(r => (
                <tr key={r.no} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 font-bold">{r.no}</td>
                  <td className="py-2 pr-3 text-gray-600">{r.jenis}</td>
                  <td className="py-2 pr-3 text-gray-500">{r.tim}</td>
                  <td className="py-2 pr-3 text-gray-600">{r.anggaran}</td>
                  <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{r.tglMulai}</td>
                  <td className="py-2"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${r.status==="Disetujui"?"bg-green-50 text-green-600":"bg-gray-100 text-gray-500"}`}>{r.status}</span></td>
                </tr>
              ))}
              {rencana.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-xs text-gray-400">Belum ada rencana audit untuk unit {unit}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700">Surat Pemberitahuan Audit — {unit}</h4>
        <p className="text-[10px] text-gray-400 mb-3">Bersumber dari Surat Keluar Back Office yang ditujukan ke unit Anda.</p>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead><tr className="border-b border-gray-100">
              {["No. Surat","Tanggal","Perihal","Kepada","Status","Dokumen"].map(h => <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>)}
            </tr></thead>
            <tbody>
              {surat.map(s => (
                <tr key={s.no} className="border-b border-gray-50 hover:bg-gray-50">
                  <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{s.no}</td>
                  <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{s.tgl}</td>
                  <td className="py-2 pr-3 font-medium text-gray-700">{s.perihal}</td>
                  <td className="py-2 pr-3 text-gray-500">{s.kepada}</td>
                  <td className="py-2 pr-3"><span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">{s.disposisi}</span></td>
                  <td className="py-2">{s.link
                    ? <AksiBtn kind="link" title="Buka Surat" href={s.link} />
                    : <span className="text-[10px] text-gray-300">Belum ada link</span>}</td>
                </tr>
              ))}
              {surat.length === 0 && <tr><td colSpan={6} className="text-center py-6 text-xs text-gray-400">Belum ada surat pemberitahuan audit untuk unit {unit}.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
      <div className="bg-white rounded-xl border border-purple-100 p-4 shadow-sm">
        <h4 className="text-xs font-bold text-gray-700">Jadwal Rapat Audit (Entry / Exit Meeting)</h4>
        <p className="text-[10px] text-gray-400 mb-3">Bersumber dari Kalender & Persiapan Audit Back Office dengan unit Anda sebagai peserta.</p>
        <div className="flex flex-col gap-2">
          {rapat.map(r => (
            <div key={r.id} className="flex items-start justify-between gap-3 p-3 rounded-xl border border-gray-100">
              <div>
                <div className="text-xs font-bold text-gray-700">{r.judul}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{r.tgl} · {r.jam} WIB · {r.tempat}</div>
                <div className="text-[10px] text-gray-400 mt-0.5">Peserta: {pesertaLabel(r.peserta)}</div>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${rapatStyle[r.status] ?? "bg-gray-100 text-gray-500"}`}>{r.status}</span>
                {r.status === "Terjadwal" && r.auditNo && (jadwalSetuju[r.id]?.auditee
                  ? <span className="text-[10px] font-semibold text-green-600">Tanggal disetujui</span>
                  : <button onClick={() => { setJadwalSetuju(prev => ({ ...prev, [r.id]: { ...prev[r.id], auditee: true } })); notify({ title: `${unit} menyetujui jadwal ${r.judul}`, body: `${r.tgl} · ${r.jam} WIB`, tag: "Rapat", roles: ["backoffice", "pengawasan", "full"] }); }}
                      className="text-[10px] font-bold px-3 py-1 rounded-lg text-white" style={{ background: "#7c3aed" }}>Setujui Tanggal</button>)}
              </div>
            </div>
          ))}
          {rapat.length === 0 && <div className="text-center py-6 text-xs text-gray-400">Belum ada rapat audit yang ditujukan ke unit {unit}.</div>}
        </div>
      </div>
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

  const events = pwEvents;
  const typeStyle: Record<string, { dot: string; badge: string }> = {
    audit:    { dot:"bg-teal-500",  badge:"bg-teal-50 text-teal-700"  },
    deadline: { dot:"bg-red-500",   badge:"bg-red-50 text-red-600"    },
    meeting:  { dot:"bg-amber-400", badge:"bg-amber-50 text-amber-700"},
    rapat:    { dot:"bg-purple-500",badge:"bg-purple-50 text-purple-700"},
  };
  const today = 22;

  const agenda = Object.entries(events).sort(([a],[b])=>+a-+b).map(([day, evs])=>({ day:+day, evs }));


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

  if (myUnit && subSection === "Pemberitahuan & Jadwal") return <PemberitahuanJadwalPanel unit={myUnit} />;
  if (subSection === "Siklus Audit") return <SiklusAuditPanel onlyUnit={myUnit ?? null} />;

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
          <div className="w-10 h-10 rounded-lg flex items-center justify-center text-xl" style={{ background: "var(--tsu-teal-light)" }}></div>
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
          <h4 className="text-xs font-bold text-gray-700 mb-3">Kalender Unit {myUnit} — Mei 2025</h4>
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
          <h4 className="text-xs font-bold text-gray-700 mb-3">Daftar Jadwal — Unit {myUnit}</h4>
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
                  {canEdit && <AksiBtn kind="setujui" active={done} title={done ? "Selesai — klik untuk membatalkan" : "Tandai Selesai"}
                    onClick={() => setDoneDeadlines(p => ({ ...p, [key]: !p[key] }))} />}
                </div>
              );
            })}
            {enriched.length === 0 && <p className="text-[10px] text-gray-400 py-4 text-center">Belum ada jadwal untuk unit ini.</p>}
          </div>
        </div>
      </div>
    );
  }

  // ── Shared helpers ──
  type PriItem = { day: number; label: string; type: string; sisa: number; priority: "Kritis"|"Tinggi"|"Sedang"|"Normal" };
  const todayDay = 22;
  const allDl: PriItem[] = Object.entries(events)
    .flatMap(([day, evs]) => evs.map(ev => {
      const sisa = +day - todayDay;
      const priority: "Kritis"|"Tinggi"|"Sedang"|"Normal" =
        sisa < 0  ? "Kritis" :
        sisa <= 3 ? "Tinggi" :
        sisa <= 7 ? "Sedang" : "Normal";
      return { day: +day, ...ev, sisa, priority };
    }))
    .sort((a, b) => a.sisa - b.sisa);

  const priorityCls: Record<string, string> = {
    Kritis: "bg-red-50 border-red-200 text-red-700",
    Tinggi: "bg-orange-50 border-orange-200 text-orange-700",
    Sedang: "bg-amber-50 border-amber-200 text-amber-700",
    Normal: "bg-gray-50 border-gray-200 text-gray-600",
  };

  return (
    <div className="flex flex-col gap-4">

      {/* ── Kalender Pengawasan (formerly Jadwal Audit) ── */}
      {(
        <>
          {/* 1. Kalender grid */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
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
                    {events[d]?.map((ev,ei)=>(
                      <span key={ei} className={`w-2 h-2 rounded-full ${typeStyle[ev.type].dot}`} title={ev.label}/>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Agenda Bulan Ini */}
          {(() => {
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
                  <h4 className="text-xs font-bold text-gray-700">Agenda Bulan Ini — Mei 2025</h4>
                  <div className="flex gap-1.5">
                    {["Semua","Audit","Rapat","Deadline"].map(f => (
                      <button key={f} onClick={() => setAgendaFilter(f)}
                        className="text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                        style={agendaFilter === f
                          ? { background:"var(--tsu-teal)", color:"#fff", borderColor:"var(--tsu-teal)" }
                          : { background:"#f8fafc", color:"#64748b", borderColor:"#e2e8f0" }}>
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

          {/* 3. Deadline & Reminder list */}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Deadline & Reminder — Mei 2025</h4>
              <div className="flex gap-1.5">
                {["Semua","Kritis","Tinggi","Sedang","Normal"].map(f => (
                  <button key={f} onClick={() => setDeadlineFilter(f)}
                    className="text-[9px] font-semibold px-2 py-0.5 rounded-full border transition-all"
                    style={deadlineFilter === f
                      ? { background:"var(--tsu-teal)", color:"#fff", borderColor:"var(--tsu-teal)" }
                      : { background:"#f8fafc", color:"#64748b", borderColor:"#e2e8f0" }}>
                    {f}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex flex-col gap-2">
              {(deadlineFilter === "Semua" ? allDl : allDl.filter(d => d.priority === deadlineFilter)).map((item, i) => {
                const key = `dl-${item.day}-${i}`;
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
                    {canEdit && (
                      <AksiBtn kind="setujui" active={done} title={done ? "Selesai — klik untuk membatalkan" : "Tandai Selesai"}
                        onClick={() => setDoneDeadlines(p => ({ ...p, [key]: !p[key] }))} />
                    )}
                  </div>
                );
              })}
              {allDl.length === 0 && <p className="text-[10px] text-gray-400 py-4 text-center">Tidak ada item.</p>}
            </div>
          </div>
        </>
      )}

    </div>
  );
}

// ── Tab content ───────────────────────────────────────────────────────────────

function TabPengawasan({ section, subSection }: { section: string; subSection: string }) {
  return (
      <div className="flex flex-col gap-4">
        {section === "ringkasan" && <PwRingkasan />}
        {section === "risiko"    && <PwRisiko    subSection={subSection} />}
        {section === "audit"     && <PwAudit     subSection={subSection} />}
        {section === "rtl"       && <PwRTL       subSection={subSection} />}
        {section === "riwayat"   && <PwRiwayat   subSection={subSection} />}
        {section === "regulasi"  && <SectionD    subSection={subSection} readOnly />}
        {section === "kalender"  && <PwKalender  subSection={subSection} />}
      </div>
  );
}

// ── Back Office section data ──────────────────────────────────────────────────

const boSections = [
  { key: "R", label: "Ringkasan Back Office",           icon: "", color: "bg-teal-600" },
  { key: "A", label: "Administrasi & Kesekretariatan", icon: "", color: "bg-teal-500" },
  { key: "B", label: "Perencanaan Audit",               icon: "", color: "bg-blue-500" },
  { key: "C", label: "Manajemen SDM Auditor",           icon: "", color: "bg-purple-500" },
  { key: "D", label: "Perpustakaan Regulasi & SOP",     icon: "", color: "bg-amber-500" },
  { key: "F", label: "Kalender Terintegrasi",           icon: "", color: "bg-indigo-500" },
  { key: "G", label: "Perencanaan Anggaran",            icon: "", color: "bg-emerald-600" },
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
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
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
              <span className="text-lg flex-shrink-0"></span>
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
              <span className="text-base"></span>
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
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
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
              <span className="text-xs flex-shrink-0"></span>
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
              <span className="text-base"></span>
              <p className="text-xs font-semibold text-green-700">Data berhasil disimpan!</p>
            </div>
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2.5 mb-4">
              <span className="text-xs flex-shrink-0 mt-0.5"></span>
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

const BULAN_ID = ["Jan","Feb","Mar","Apr","Mei","Jun","Jul","Agu","Sep","Okt","Nov","Des"];
const tglIdToIso = (t: string) => {
  const m = t.match(/^(\d{1,2}) (\S+) (\d{4})$/);
  if (!m) return t;
  const b = BULAN_ID.indexOf(m[2]) + 1;
  return b ? `${m[3]}-${String(b).padStart(2, "0")}-${m[1].padStart(2, "0")}` : t;
};
const tglIsoToId = (t: string) => {
  const m = t.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  return m ? `${Number(m[3])} ${BULAN_ID[Number(m[2]) - 1]} ${m[1]}` : t;
};

type TFMField =
  | { key: string; label: string; type: "text" | "url" | "date" | "textarea"; placeholder?: string; required?: boolean }
  | { key: string; label: string; type: "select"; options: string[]; required?: boolean };

function TambahFormModal({ title, fields, onClose, onSave, initial }: { title: string; fields: TFMField[]; onClose: () => void; onSave?: (vals: Record<string, string>) => void; initial?: Record<string, string> }) {
  const [vals, setVals] = useState<Record<string, string>>(initial ?? {});
  const [step, setStep] = useState<"form" | "confirm" | "saved">("form");
  const hasLink = fields.some(f => f.type === "url");
  const requiredFilled = fields
    .filter(f => f.required !== false && f.type !== "url")
    .every(f => (vals[f.key] ?? "").trim());
  const set = (k: string, v: string) => setVals(p => ({ ...p, [k]: v }));

  function handleSimpan() {
    if (hasLink && (vals[fields.find(f => f.type === "url")!.key] ?? "").trim()) { setStep("confirm"); } else { onSave?.(vals); setStep("saved"); }
  }
  function handleSesuai() { onSave?.(vals); setStep("saved"); }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto py-4"
      style={{ background: "rgba(0,0,0,0.4)" }}
      onClick={() => { if (step !== "saved") onClose(); }}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md mx-4 my-auto" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h4 className="text-sm font-bold text-gray-800">{title}</h4>
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
              <span className="text-lg flex-shrink-0"></span>
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
              <span className="text-base"></span>
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
  const navigateTo = useContext(NavCtx);
  const user = useContext(UserCtx);
  const isFull = user?.role === "full";
  const komponenAnggaran = [
    { komponen: "Honorarium", rencana: 55, realisasi: 48 },
    { komponen: "Perj. Dinas", rencana: 40, realisasi: 32 },
    { komponen: "ATK & Cetak", rencana: 25, realisasi: 22 },
    { komponen: "Konsumsi",    rencana: 30, realisasi: 28 },
    { komponen: "Lain-lain",   rencana: 35, realisasi: 12 },
  ];
  const agendaMendatang = rapatList.filter(r => r.status === "Terjadwal").slice(0, 3);
  const actionItems = [
    { id: 1, kegiatan: "RTL Terlambat — Marcomm", unit: "Marcomm", deadlineFull: "10 Mei 2025", relativeTime: "17 hari lalu", isOverdue: true, daysInfo: "Terlambat 17 hari", tag: "RTL", prioritas: "Kritis", deskripsi: "Tindak lanjut rekomendasi audit belum dikirim. Segera koordinasi dengan kepala unit Marcomm untuk penyelesaian.", pic: "Siti Aisyah",
      navFull: ["pengawasan","rtl","Rencana Tindak Lanjut",undefined] as [string,string,string,undefined],
      navBO:   ["backoffice","A","Surat Masuk & Keluar","Keluar"] as [string,string,string,"Keluar"] },
    { id: 2, kegiatan: "Pengiriman LHA Sarpras", unit: "Sarpras", deadlineFull: "18 Mei 2025", relativeTime: "1 hari lagi", isOverdue: false, daysInfo: "Jatuh tempo 1 hari", tag: "LHA", prioritas: "Kritis", deskripsi: "Laporan Hasil Audit Sarpras harus dikirim ke pimpinan paling lambat besok.", pic: "Budi Santoso",
      navFull: ["pengawasan","audit","Rencana Audit",undefined] as [string,string,string,undefined],
      navBO:   ["backoffice","A","Arsip Dokumen Audit",undefined] as [string,string,string,undefined] },
    { id: 3, kegiatan: "Audit Pendahuluan LPPM", unit: "LPPM", deadlineFull: "26 Mei 2025", relativeTime: "9 hari lagi", isOverdue: false, daysInfo: "Sisa 9 hari", tag: "Audit", prioritas: "Tinggi", deskripsi: "Tahap pendahuluan audit kepatuhan LPPM meliputi pengumpulan data dan wawancara awal.", pic: "Ratna Dewi",
      navFull: ["pengawasan","audit","Entry Meeting",undefined] as [string,string,string,undefined],
      navBO:   ["backoffice","B","PKPT",undefined] as [string,string,string,undefined] },
    { id: 4, kegiatan: "Update RTL BAUK Q1", unit: "BAUK", deadlineFull: "31 Mei 2025", relativeTime: "14 hari lagi", isOverdue: false, daysInfo: "Sisa 14 hari", tag: "RTL", prioritas: "Tinggi", deskripsi: "Unit BAUK wajib memperbarui status tindak lanjut untuk semua rekomendasi Q1 2025.", pic: "Andi Prasetyo",
      navFull: ["pengawasan","rtl","Rencana Tindak Lanjut",undefined] as [string,string,string,undefined],
      navBO:   ["backoffice","B","PKPT",undefined] as [string,string,string,undefined] },
    { id: 5, kegiatan: "Pengumpulan PKPT Semester II", unit: "Semua Unit", deadlineFull: "30 Jun 2025", relativeTime: "44 hari lagi", isOverdue: false, daysInfo: "Sisa 44 hari", tag: "Rencana", prioritas: "Normal", deskripsi: "Setiap unit wajib menyampaikan usulan kegiatan untuk Program Kerja Pengawasan Tahunan semester II.", pic: "Kepala SPI",
      navFull: ["backoffice","B","PKPT",undefined] as [string,string,string,undefined],
      navBO:   ["backoffice","B","PKPT",undefined] as [string,string,string,undefined] },
    { id: 6, kegiatan: "Penyusunan Laporan Tahunan SPI", unit: "Back Office", deadlineFull: "15 Jul 2025", relativeTime: "59 hari lagi", isOverdue: false, daysInfo: "Sisa 59 hari", tag: "Rencana", prioritas: "Normal", deskripsi: "Kompilasi dan penyusunan laporan tahunan SPI mencakup semua kegiatan audit dan administrasi 2025.", pic: "Budi Santoso",
      navFull: ["backoffice","A","Arsip Dokumen Audit",undefined] as [string,string,string,undefined],
      navBO:   ["backoffice","A","Arsip Dokumen Audit",undefined] as [string,string,string,undefined] },
  ];

  // Agenda detail popup
  const [agendaDetailId, setAgendaDetailId] = useState<number | null>(null);

  // Administrasi chart
  const [adminPeriod, setAdminPeriod] = useState<"bulanan" | "triwulanan">("bulanan");
  const adminBulanan = [
    { period: "Jan", masuk: 8,  keluar: 10, rapat: 2 },
    { period: "Feb", masuk: 12, keluar: 14, rapat: 3 },
    { period: "Mar", masuk: 10, keluar: 12, rapat: 4 },
    { period: "Apr", masuk: 15, keluar: 16, rapat: 3 },
    { period: "Mei", masuk: 28, keluar: 22, rapat: 4 },
  ];
  const adminTriwulanan = [
    { period: "Q1 2025", masuk: 30, keluar: 36, rapat: 9  },
    { period: "Q2 YTD",  masuk: 43, keluar: 38, rapat: 7  },
  ];
  const adminChartData = adminPeriod === "bulanan" ? adminBulanan : adminTriwulanan;

  // SDM Auditor — Riwayat Penugasan
  const [sdmYear, setSdmYear] = useState("2024");
  const [sdmPopupAuditor, setSdmPopupAuditor] = useState<string | null>(null);
  const sdmYearData: Record<string, { auditor: string; penugasan: number }[]> = {
    "2023": [
      { auditor: "Budi Santoso", penugasan: 10 },
      { auditor: "Siti Aisyah",  penugasan: 8  },
      { auditor: "Ratna Dewi",   penugasan: 7  },
    ],
    "2024": [
      { auditor: "Budi Santoso", penugasan: 12 },
      { auditor: "Siti Aisyah",  penugasan: 10 },
      { auditor: "Ratna Dewi",   penugasan: 9  },
    ],
    "2025": [
      { auditor: "Budi Santoso", penugasan: 5 },
      { auditor: "Siti Aisyah",  penugasan: 4 },
      { auditor: "Ratna Dewi",   penugasan: 3 },
    ],
  };
  const sdmChartData = sdmYearData[sdmYear];
  const sdmMostActive = sdmChartData.reduce((a, b) => a.penugasan >= b.penugasan ? a : b);
  const sdmRiwayatDetail: Record<string, { program: string; unit: string; peran: string; periode: string; status: string }[]> = {
    "Budi Santoso": [
      { program: "Audit Kinerja Akademik",   unit: "BAAK",        peran: "Ketua Tim", periode: "Jan–Mar 2025", status: "Selesai"  },
      { program: "Audit Keuangan Sarpras",   unit: "Sarpras",     peran: "Ketua Tim", periode: "Apr–Jun 2025", status: "Berjalan" },
      { program: "Audit Kepatuhan Keuangan", unit: "BAUK",        peran: "Ketua Tim", periode: "Q3 2025",      status: "Rencana"  },
      { program: "Audit Kinerja LPPM",       unit: "LPPM",        peran: "Ketua Tim", periode: "Q2 2024",      status: "Selesai"  },
      { program: "Audit Regulasi BAAK",      unit: "BAAK",        peran: "Ketua Tim", periode: "Q1 2024",      status: "Selesai"  },
    ],
    "Siti Aisyah": [
      { program: "Audit Keuangan Sarpras",   unit: "Sarpras",     peran: "Anggota",   periode: "Apr–Jun 2025", status: "Berjalan" },
      { program: "Audit Kepatuhan Keuangan", unit: "BAUK",        peran: "Anggota",   periode: "Q3 2025",      status: "Rencana"  },
      { program: "Audit Kinerja Fak. Teknik",unit: "Fak. Teknik", peran: "Anggota",   periode: "Q3 2024",      status: "Selesai"  },
      { program: "Audit SOP PMB",            unit: "PMB",         peran: "Ketua Tim", periode: "Q1 2024",      status: "Selesai"  },
    ],
    "Ratna Dewi": [
      { program: "Audit Kinerja Akademik",   unit: "BAAK",        peran: "Anggota",   periode: "Jan–Mar 2025", status: "Selesai"  },
      { program: "Audit Kinerja Fak. Teknik",unit: "Fak. Teknik", peran: "Ketua Tim", periode: "Q3 2025",      status: "Rencana"  },
      { program: "Audit Kepatuhan LPPM",     unit: "LPPM",        peran: "Anggota",   periode: "Q1 2024",      status: "Selesai"  },
      { program: "Audit SDM Internal",       unit: "SDM",         peran: "Ketua Tim", periode: "Q4 2024",      status: "Selesai"  },
    ],
  };

  // PKPT popup
  const pkptPrograms = [
    { no: 1, program: "Audit Kinerja Akademik",       unit: "BAAK",        periode: "Q1 2025", ketua: "Budi Santoso",  status: "Selesai"      },
    { no: 2, program: "Audit Kepatuhan LPPM",          unit: "LPPM",        periode: "Q1 2025", ketua: "Ratna Dewi",    status: "Selesai"      },
    { no: 3, program: "Audit Keuangan Sarpras",        unit: "Sarpras",     periode: "Q2 2025", ketua: "Budi Santoso",  status: "Berjalan"     },
    { no: 4, program: "Audit SOP Kemahasiswaan",       unit: "LPM",         periode: "Q2 2025", ketua: "Andi Prasetyo", status: "Direncanakan" },
    { no: 5, program: "Audit Kinerja Fak. Teknik",     unit: "Fak. Teknik", periode: "Q3 2025", ketua: "Ratna Dewi",    status: "Direncanakan" },
    { no: 6, program: "Audit Kepatuhan Keuangan",      unit: "BAUK",        periode: "Q3 2025", ketua: "Budi Santoso",  status: "Direncanakan" },
  ];

  // KPI per menu Back Office
  const [popupMenu, setPopupMenu] = useState<string | null>(null);

  const kpiMenu = [
    {
      key: "A", label: "Administrasi", icon: "", accent: "#0e8080", lightBg: "#f0fdfa",
      items: [
        { label: "Surat Terproses",  target: 56,  real: 50,  sat: "Surat" },
        { label: "Rapat Terlaksana", target: 20,  real: 18,  sat: "Rapat" },
        { label: "Dokumen Terarsip", target: 150, real: 124, sat: "Dok"   },
      ],
    },
    {
      key: "B", label: "Perencanaan Audit", icon: "", accent: "#3b82f6", lightBg: "#eff6ff",
      items: [
        { label: "Realisasi PKPT",               target: 6,   real: 3,  sat: "Program" },
        { label: "PKPT Tepat Waktu",             target: 100, real: 67, sat: "%"       },
        { label: "Unit Teraudit",                target: 8,   real: 5,  sat: "Unit"    },
        { label: "Unit Risiko Tinggi Termonitor", target: 4,   real: 4,  sat: "Unit"    },
      ],
    },
    {
      key: "C", label: "Manajemen SDM", icon: "", accent: "#8b5cf6", lightBg: "#f5f3ff",
      items: [
        { label: "Auditor Bersertifikat",  target: 10,  real: 8,  sat: "Orang" },
        { label: "Penugasan Tepat Waktu",  target: 100, real: 83, sat: "%"     },
        { label: "Pelatihan Terlaksana",   target: 4,   real: 2,  sat: "Sesi"  },
      ],
    },
    {
      key: "D", label: "Regulasi & SOP", icon: "", accent: "#f59e0b", lightBg: "#fffbeb",
      items: [
        { label: "Pedoman/SOP Aktif",    target: 15, real: 12, sat: "Dok" },
        { label: "Peraturan Terdaftar",  target: 20, real: 17, sat: "Dok" },
      ],
    },
    {
      key: "G", label: "Anggaran", icon: "", accent: "#16a34a", lightBg: "#f0fdf4",
      items: [
        { label: "Realisasi Anggaran",  target: 191, real: 128, sat: "Jt"  },
        { label: "LPJ Tepat Waktu",     target: 10,  real: 9,   sat: "LPJ" },
      ],
    },
  ];

  const menuScore = (menu: typeof kpiMenu[0]) => {
    const scores = menu.items
      .filter(it => !(it as any).alert)
      .map(it => Math.min(100, Math.round((it.real / it.target) * 100)));
    return scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
  };

  const popupData = kpiMenu.find(m => m.key === popupMenu) ?? null;

  return (
    <div className="flex flex-col gap-4">
      {/* KPI — kartu per menu, horizontal scroll */}
      <div>
        <h3 className="text-sm font-bold text-gray-700 mb-2">KPI Modul Back Office</h3>
        <div className="overflow-x-auto pb-1">
          <div className="flex gap-3" style={{ minWidth: "max-content" }}>
            {kpiMenu.map(menu => {
              const score = menuScore(menu);
              const color = score >= 85 ? "#22c55e" : score >= 65 ? "#f59e0b" : "#ef4444";
              return (
                <button key={menu.key}
                  onClick={() => setPopupMenu(menu.key)}
                  className="bg-white rounded-xl border border-gray-100 p-3.5 shadow-sm hover:shadow-md transition-all text-left hover:border-gray-200 flex-shrink-0"
                  style={{ width: 180 }}>
                  <div className="flex items-center justify-between mb-2.5">
                    <span className="text-xl">{menu.icon}</span>
                    <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full text-white" style={{ background: color }}>
                      {score}%
                    </span>
                  </div>
                  <div className="text-[11px] font-bold text-gray-700 leading-tight mb-2">{menu.label}</div>
                  <div className="w-full bg-gray-100 rounded-full h-1.5 mb-1">
                    <div className="h-1.5 rounded-full transition-all" style={{ width: `${score}%`, background: color }} />
                  </div>
                  <div className="text-[9px] text-gray-400">{menu.items.length} indikator · klik untuk detail</div>
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <TugasSiklusAuditPanel />

      {/* Popup modal detail KPI per menu */}
      {popupData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.4)" }}
          onClick={() => setPopupMenu(null)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="px-5 py-4 flex items-center gap-3 border-b border-gray-100" style={{ background: popupData.lightBg }}>
              <span className="text-xl">{popupData.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: popupData.accent }}>KPI Menu {popupData.key}</div>
                <div className="text-sm font-black text-gray-800 leading-tight">{popupData.label}</div>
              </div>
              <button onClick={() => setPopupMenu(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none flex-shrink-0">✕</button>
            </div>
            <div className="divide-y divide-gray-50">
              {popupData.items.map((it, i) => {
                const isAlert = (it as any).alert;
                if (isAlert) {
                  return (
                    <div key={i} className="px-5 py-3 flex items-center gap-3 bg-amber-50">
                      <span className="text-base flex-shrink-0"></span>
                      <div className="flex-1">
                        <div className="text-[11px] font-semibold text-amber-700">{it.label}</div>
                        <div className="text-[9px] text-amber-600 mt-0.5">Perlu perhatian segera</div>
                      </div>
                      <span className="text-lg font-black text-amber-700">{it.real}</span>
                    </div>
                  );
                }
                const pct = Math.min(100, Math.round((it.real / it.target) * 100));
                const barColor = pct >= 85 ? "#22c55e" : pct >= 65 ? "#f59e0b" : "#ef4444";
                const status   = pct >= 85 ? "Baik" : pct >= 65 ? "Cukup" : "Kurang";
                const badgeCls = pct >= 85 ? "bg-green-50 text-green-600" : pct >= 65 ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-500";
                return (
                  <div key={i} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <span className="text-[11px] font-semibold text-gray-700 leading-tight">{it.label}</span>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${badgeCls}`}>{status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-100 rounded-full h-1.5">
                        <div className="h-1.5 rounded-full" style={{ width: `${pct}%`, background: barColor }} />
                      </div>
                      <span className="text-[10px] font-bold text-gray-700 w-12 text-right flex-shrink-0">
                        {it.real} / {it.target} {it.sat}
                      </span>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-1">{pct}% tercapai</div>
                  </div>
                );
              })}
            </div>
            <div className="px-5 py-3 border-t border-gray-100 flex justify-end">
              <button onClick={() => setPopupMenu(null)}
                className="text-xs font-semibold px-4 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Row 1: Administrasi — full width horizontal */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-xs font-bold text-gray-700">Administrasi</h4>
            <p className="text-[10px] text-gray-400">Ringkasan surat & rapat bulan ini</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className="flex rounded-lg overflow-hidden border border-gray-200">
              {(["bulanan","triwulanan"] as const).map(p => (
                <button key={p} onClick={() => setAdminPeriod(p)}
                  className="text-[9px] font-semibold px-2 py-1 transition-colors"
                  style={adminPeriod === p
                    ? { background: "var(--tsu-teal)", color: "#fff" }
                    : { background: "#fff", color: "#94a3b8" }}>
                  {p === "bulanan" ? "Bulanan" : "Triwulan"}
                </button>
              ))}
            </div>
            <AksiBtn kind="detail" title="Lihat Jadwal Rapat di Kalender" onClick={() => navigateTo("backoffice", "F", "")} />
          </div>
        </div>
        <div className="flex gap-5 items-start">
          {/* Left: stat tiles stacked 2x2 */}
          <div className="grid grid-cols-2 gap-2 flex-shrink-0" style={{ width: 196 }}>
            {[
              { label: "Surat Masuk",   val: "28",  color: "text-teal-600",   hoverBg: "hover:bg-teal-50 hover:border-teal-200",   fn: () => navigateTo("backoffice", "A", "Surat Masuk & Keluar", "Masuk")  },
              { label: "Surat Keluar",  val: "22",  color: "text-blue-600",   hoverBg: "hover:bg-blue-50 hover:border-blue-200",    fn: () => navigateTo("backoffice", "A", "Surat Masuk & Keluar", "Keluar") },
              { label: "Rapat Selesai", val: "4",   color: "text-purple-600", hoverBg: "hover:bg-purple-50 hover:border-purple-200", fn: () => navigateTo("backoffice", "F", "")                                },
              { label: "Arsip Dok.",    val: "124", color: "text-gray-700",   hoverBg: "hover:bg-gray-100 hover:border-gray-300",   fn: () => navigateTo("backoffice", "A", "Arsip Dokumen Audit")             },
            ].map(s => (
              <button key={s.label} onClick={s.fn}
                className={`text-center p-2.5 rounded-xl bg-gray-50 border border-transparent transition-all cursor-pointer group ${s.hoverBg}`}>
                <div className={`text-2xl font-black ${s.color}`}>{s.val}</div>
                <div className="text-[8px] text-gray-400 leading-tight mt-0.5 group-hover:text-gray-600 transition-colors">{s.label}</div>
              </button>
            ))}
          </div>
          {/* Right: line chart */}
          <div className="flex-1 min-w-0">
            <div className="text-[9px] font-semibold text-gray-500 mb-1">Tren Aktivitas Administrasi</div>
            <ResponsiveContainer width="100%" height={130}>
              <LineChart data={adminChartData} margin={{ top: 4, right: 8, left: -22, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="period" tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 8, fill: "#94a3b8" }} axisLine={false} tickLine={false} width={28} />
                <Tooltip
                  contentStyle={{ fontSize: 9, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                  itemStyle={{ padding: "1px 0" }}
                  formatter={(v: unknown, name: unknown) => [`${v}`, name === "masuk" ? "Surat Masuk" : name === "keluar" ? "Surat Keluar" : "Rapat"] as [string, string]}
                  labelStyle={{ fontWeight: 700, marginBottom: 4, color: "#374151" }}
                />
                <Line type="monotone" dataKey="masuk"  stroke="#0e8080" strokeWidth={2} dot={{ r: 3, fill: "#0e8080" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="keluar" stroke="#3b82f6" strokeWidth={2} dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
                <Line type="monotone" dataKey="rapat"  stroke="#8b5cf6" strokeWidth={2} dot={{ r: 3, fill: "#8b5cf6" }} activeDot={{ r: 5 }} />
              </LineChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1">
              {[
                { label: "Surat Masuk",  color: "#0e8080" },
                { label: "Surat Keluar", color: "#3b82f6" },
                { label: "Rapat",        color: "#8b5cf6" },
              ].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[9px] text-gray-400">
                  <span className="w-4 h-0.5 rounded-full inline-block" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 2: PKPT — full width horizontal */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-xs font-bold text-gray-700">PKPT — Detail Progres</h4>
            <p className="text-[10px] text-gray-400">Program Kerja Pengawasan Tahunan 2025</p>
          </div>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-[9px] font-bold text-teal-700 bg-teal-50 px-2 py-0.5 rounded-full">2025</span>
            <button onClick={() => navigateTo("backoffice", "B", "PKPT")}
              className="text-[9px] font-semibold px-3 py-1 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors whitespace-nowrap">
              Buka PKPT →
            </button>
          </div>
        </div>
        <div className="flex gap-5 items-start">
          {/* Left: donut + legend + progress */}
          <div className="flex-shrink-0" style={{ width: 220 }}>
            <button
              className="w-full flex items-center gap-3 rounded-xl px-2 py-2 hover:bg-blue-50 transition-colors cursor-pointer border border-transparent hover:border-blue-100"
              onClick={() => navigateTo("backoffice", "B", "PKPT")}>
              {(() => {
                const slices = [
                  { label: "Selesai",      count: 2, color: "#22c55e" },
                  { label: "Berjalan",     count: 1, color: "#3b82f6" },
                  { label: "Direncanakan", count: 3, color: "#f59e0b" },
                ];
                const total = 6;
                const r = 32, cx = 40, cy = 40;
                const circ = 2 * Math.PI * r;
                let cum = 0;
                return (
                  <svg width={80} height={80} style={{ flexShrink: 0 }}>
                    <circle cx={cx} cy={cy} r={r} fill="none" stroke="#f1f5f9" strokeWidth={12} />
                    {slices.map((s, i) => {
                      const dash = (s.count / total) * circ;
                      const el = (
                        <circle key={i} cx={cx} cy={cy} r={r} fill="none"
                          stroke={s.color} strokeWidth={12}
                          strokeDasharray={`${dash} ${circ - dash}`}
                          strokeDashoffset={circ / 4 - cum} />
                      );
                      cum += dash;
                      return el;
                    })}
                    <text x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" fontSize={16} fontWeight={800} fill="#1e293b">{total}</text>
                    <text x={cx} y={cy + 10} textAnchor="middle" dominantBaseline="middle" fontSize={8}  fill="#94a3b8">program</text>
                  </svg>
                );
              })()}
              <div className="flex flex-col gap-2 flex-1 text-left">
                {[
                  { label: "Selesai",      count: 2, pct: "33%", color: "#22c55e" },
                  { label: "Berjalan",     count: 1, pct: "17%", color: "#3b82f6" },
                  { label: "Direncanakan", count: 3, pct: "50%", color: "#f59e0b" },
                ].map(s => (
                  <div key={s.label} className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: s.color }} />
                    <span className="text-[10px] text-gray-600 flex-1">{s.label}</span>
                    <span className="text-xs font-black text-gray-800">{s.count}</span>
                    <span className="text-[9px] text-gray-400 w-8 text-right">{s.pct}</span>
                  </div>
                ))}
              </div>
            </button>
            <button onClick={() => navigateTo("backoffice", "B", "PKPT")}
              className="mt-2 w-full rounded-xl border border-gray-100 px-3 py-2 hover:bg-blue-50 hover:border-blue-100 transition-colors text-left">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex-1 h-2.5 bg-gray-100 rounded-full overflow-hidden flex">
                  <div className="h-2.5 transition-all" style={{ width: "33%", background: "#22c55e" }} />
                  <div className="h-2.5 transition-all" style={{ width: "17%", background: "#3b82f6" }} />
                </div>
                <span className="text-[10px] font-bold text-gray-700 flex-shrink-0">50%</span>
              </div>
              <p className="text-[9px] text-gray-400">Realisasi PKPT — 2 selesai · 1 berjalan · 3 direncanakan</p>
            </button>
          </div>
          {/* Right: program table */}
          <div className="flex-1 min-w-0 flex flex-col">
            <div className="text-[9px] font-semibold text-gray-500 mb-1.5 uppercase tracking-wider">Daftar Program Audit</div>
            <div className="overflow-y-auto overflow-x-auto flex-1" style={{ maxHeight: 200 }}>
              <table className="w-full text-xs">
                <thead className="sticky top-0 bg-white z-10">
                  <tr className="border-b border-gray-100">
                    {["No","Program Audit","Unit","Periode","Ketua Tim","Status"].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pkptPrograms.map(p => (
                    <tr key={p.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] text-gray-400">{p.no}</td>
                      <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{p.program}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.unit}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.periode}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.ketua}</td>
                      <td className="py-2">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          p.status === "Selesai"      ? "bg-green-50 text-green-600" :
                          p.status === "Berjalan"     ? "bg-blue-50 text-blue-600"  :
                                                        "bg-amber-50 text-amber-600"
                        }`}>{p.status}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Row 3: Realisasi Anggaran — full width horizontal */}
      <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
        <div className="flex items-start justify-between mb-3">
          <div>
            <h4 className="text-xs font-bold text-gray-700">Realisasi Anggaran per Komponen</h4>
            <p className="text-[10px] text-gray-400">Rencana vs realisasi (Rp Juta)</p>
          </div>
          <AksiBtn kind="detail" title="Lihat Detail Rencana Anggaran" onClick={() => navigateTo("backoffice", "G", "Rencana Anggaran")} />
        </div>
        <div className="flex gap-5 items-start">
          {/* Left: summary KPI tiles */}
          <div className="flex flex-col gap-2 flex-shrink-0" style={{ width: 196 }}>
            {[
              { label: "Total Rencana",  val: "Rp 191 Jt", color: "text-gray-700",  bg: "bg-gray-50",   border: "border-gray-100"   },
              { label: "Realisasi",      val: "Rp 128 Jt", color: "text-teal-700",  bg: "bg-teal-50",   border: "border-teal-100"   },
              { label: "Persentase",     val: "67%",        color: "text-blue-700",  bg: "bg-blue-50",   border: "border-blue-100"   },
              { label: "LPJ Tepat Waktu",val: "9 / 10",    color: "text-green-700", bg: "bg-green-50",  border: "border-green-100"  },
            ].map(s => (
              <div key={s.label} className={`flex items-center justify-between px-3 py-2 rounded-xl border ${s.bg} ${s.border}`}>
                <span className="text-[9px] text-gray-500">{s.label}</span>
                <span className={`text-xs font-black ${s.color}`}>{s.val}</span>
              </div>
            ))}
          </div>
          {/* Right: wider bar chart */}
          <div className="flex-1 min-w-0">
            <ResponsiveContainer width="100%" height={140}>
              <BarChart data={komponenAnggaran} barSize={14} barGap={3} margin={{ top: 4, right: 8, left: -14, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                <XAxis dataKey="komponen" tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fontSize: 9, fill: "#94a3b8" }} axisLine={false} tickLine={false} unit="Jt" />
                <Tooltip contentStyle={{ fontSize: 9, borderRadius: 8, border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }} formatter={(v: unknown, name: unknown) => [`Rp ${v} Jt`, name === "rencana" ? "Rencana" : "Realisasi"] as [string,string]} />
                <Bar dataKey="rencana"   fill="#cbd5e1" radius={[3,3,0,0]} />
                <Bar dataKey="realisasi" fill="var(--tsu-teal)" radius={[3,3,0,0]} />
              </BarChart>
            </ResponsiveContainer>
            <div className="flex items-center gap-4 mt-1">
              {[{ label: "Rencana", color: "#cbd5e1" }, { label: "Realisasi", color: "var(--tsu-teal)" }].map(l => (
                <span key={l.label} className="flex items-center gap-1.5 text-[9px] text-gray-400">
                  <span className="w-3 h-3 rounded inline-block" style={{ background: l.color }} />
                  {l.label}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Row 4: SDM + Agenda Mendatang — 2 columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* SDM card */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs font-bold text-gray-700">SDM — Riwayat Penugasan</h4>
              <p className="text-[10px] text-gray-400">Jumlah penugasan per auditor</p>
            </div>
            <div className="flex rounded-lg overflow-hidden border border-gray-200 flex-shrink-0">
              {["2023","2024","2025"].map(y => (
                <button key={y} onClick={() => setSdmYear(y)}
                  className="text-[9px] font-semibold px-2 py-1 transition-colors"
                  style={sdmYear === y
                    ? { background: "var(--tsu-teal)", color: "#fff" }
                    : { background: "#fff", color: "#94a3b8" }}>
                  {y}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <div className="text-center px-3 py-2 rounded-xl bg-gray-50 border border-gray-100 flex-shrink-0">
              <div className="text-2xl font-black text-gray-700">3</div>
              <div className="text-[8px] text-gray-400">Total Auditor</div>
            </div>
            <div className="flex-1 rounded-xl px-3 py-2 flex items-center gap-2"
              style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}>
              <div className="text-lg flex-shrink-0"></div>
              <div>
                <div className="text-[8px] font-bold uppercase tracking-wider" style={{ color: "var(--tsu-teal)" }}>Most Active</div>
                <div className="text-[11px] font-black text-gray-800 leading-tight">{sdmMostActive.auditor}</div>
                <div className="text-[9px] font-semibold" style={{ color: "var(--tsu-teal)" }}>{sdmMostActive.penugasan} Penugasan</div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="text-[8px] text-gray-400 uppercase tracking-wider font-semibold">Klik bar untuk detail riwayat</div>
            {sdmChartData.map((d) => {
              const maxVal = Math.max(...sdmChartData.map(x => x.penugasan));
              const pct = Math.round((d.penugasan / maxVal) * 100);
              const isTop = d.auditor === sdmMostActive.auditor;
              const firstName = d.auditor.split(" ")[0];
              return (
                <button key={d.auditor}
                  className="w-full flex items-center gap-2 rounded-lg px-1 py-0.5 hover:bg-gray-50 transition-colors group"
                  title={`${d.auditor} — ${d.penugasan} penugasan (${sdmYear})`}
                  onClick={() => setSdmPopupAuditor(d.auditor)}>
                  <span className="text-[9px] text-gray-600 group-hover:text-teal-700 font-medium transition-colors flex-shrink-0"
                    style={{ width: 56, textAlign: "right" }}>
                    {firstName}
                  </span>
                  <div className="flex-1 h-6 bg-gray-100 rounded-lg overflow-hidden">
                    <div className="h-6 rounded-lg flex items-center justify-end pr-2 transition-all duration-500"
                      style={{ width: `${pct}%`, background: isTop ? "var(--tsu-teal)" : "#94a3b8" }}>
                      <span className="text-[8px] font-bold text-white">{d.penugasan}</span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>

          <AksiBtn kind="detail" title="Lihat Detail SDM" className="mt-auto self-end" onClick={() => navigateTo("backoffice", "C", "Riwayat Penugasan")} />
        </div>

        {/* Agenda Mendatang card — matches SDM card height */}
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col gap-3 h-full">
          <div className="flex items-center justify-between flex-shrink-0">
            <div>
              <h4 className="text-xs font-bold text-gray-700">Agenda Mendatang</h4>
              <p className="text-[10px] text-gray-400">Jadwal rapat & kegiatan terdekat</p>
            </div>
            <button onClick={() => navigateTo("backoffice", "F", "")}
              className="text-[9px] font-semibold text-teal-600 hover:text-teal-800 transition-colors whitespace-nowrap">
              Lihat Semua →
            </button>
          </div>

          {agendaMendatang.length === 0 ? (
            <div className="text-center py-8 text-[10px] text-gray-400 flex-1">Belum ada agenda mendatang.</div>
          ) : (
            <div className="relative pl-5 flex-1 overflow-y-auto min-h-0">
              <div className="absolute left-[9px] top-3 bottom-3 w-px bg-gray-200" />
              <div className="flex flex-col gap-3">
                {agendaMendatang.map((a, i) => {
                  const isNearest = i === 0;
                  const pesertaLabel = (list: string[]) => list.length <= 2 ? list.join(", ") : `${list.slice(0, 2).join(", ")} +${list.length - 2}`;
                  return (
                    <button key={a.id} className="relative flex items-start gap-2.5 text-left w-full group"
                      onClick={() => setAgendaDetailId(a.id)}>
                      <div className="absolute -left-5 top-2 flex items-center justify-center" style={{ width: 18 }}>
                        <div className={`w-3 h-3 rounded-full border-2 transition-all flex-shrink-0 ${
                          isNearest ? "border-teal-500 bg-teal-500 shadow-sm shadow-teal-200"
                                    : "border-gray-300 bg-white group-hover:border-teal-400"}`} />
                      </div>
                      <div className={`flex-1 rounded-xl p-3 transition-all ${
                        isNearest ? "bg-teal-50 border border-teal-100"
                                  : "bg-gray-50 border border-transparent group-hover:border-gray-200 group-hover:bg-white"}`}>
                        {isNearest && <span className="text-[7px] font-black uppercase tracking-widest text-teal-600 block mb-0.5">● Terdekat</span>}
                        <div className={`text-[10px] font-bold leading-snug ${isNearest ? "text-teal-800" : "text-gray-700"}`}>{a.judul}</div>
                        <div className="flex items-center gap-2 mt-1 flex-wrap">
                          <span className="text-[9px] text-gray-500 font-medium">{a.tgl}</span>
                          <span className="text-gray-300">·</span>
                          <span className="text-[9px] text-gray-400">{a.jam} WIB</span>
                        </div>
                        <div className="text-[9px] text-gray-400 mt-0.5 truncate">{a.tempat}</div>
                        {a.peserta.length > 0 && <div className="text-[8px] text-gray-400 mt-0.5 truncate">{pesertaLabel(a.peserta)}</div>}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <button onClick={() => navigateTo("backoffice", "F", "")}
            className="w-full text-[9px] font-semibold py-1.5 rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-700 transition-colors flex-shrink-0">
            Lihat Semua Agenda →
          </button>
        </div>
      </div>

      {/* SDM — Riwayat Penugasan popup */}
      {sdmPopupAuditor && (() => {
        const detail = sdmRiwayatDetail[sdmPopupAuditor] ?? [];
        const stat = sdmChartData.find(d => d.auditor === sdmPopupAuditor);
        const statusBadge = (s: string) =>
          s === "Selesai"  ? "bg-green-50 text-green-600"  :
          s === "Berjalan" ? "bg-blue-50 text-blue-600"    :
                             "bg-amber-50 text-amber-600";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setSdmPopupAuditor(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xl mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-base font-black text-white flex-shrink-0"
                    style={{ background: "var(--tsu-teal)" }}>
                    {sdmPopupAuditor.charAt(0)}
                  </div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">{sdmPopupAuditor}</div>
                    <div className="text-[10px] text-gray-400">
                      Riwayat Penugasan · {stat?.penugasan ?? 0} penugasan ({sdmYear})
                      {sdmPopupAuditor === sdmMostActive.auditor && (
                        <span className="ml-1.5 text-[8px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light,#f0fdfa)", color: "var(--tsu-teal)" }}>Most Active</span>
                      )}
                    </div>
                  </div>
                </div>
                <button onClick={() => setSdmPopupAuditor(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  Tutup
                </button>
              </div>
              {/* Table */}
              <div className="overflow-x-auto max-h-72">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white z-10">
                    <tr className="border-b border-gray-100">
                      {["Program Audit","Unit","Peran","Periode","Status"].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-gray-400 px-4 py-2 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {detail.map((r, i) => (
                      <tr key={i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                        <td className="px-4 py-2.5 font-medium text-gray-700 whitespace-nowrap">{r.program}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.unit}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.peran}</td>
                        <td className="px-4 py-2.5 text-gray-500 whitespace-nowrap">{r.periode}</td>
                        <td className="px-4 py-2.5">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusBadge(r.status)}`}>{r.status}</span>
                        </td>
                      </tr>
                    ))}
                    {detail.length === 0 && (
                      <tr><td colSpan={5} className="px-4 py-6 text-center text-[10px] text-gray-400">Belum ada data riwayat.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
              <div className="px-5 py-3 border-t border-gray-100 bg-gray-50 text-[9px] text-gray-400">
                Menampilkan riwayat penugasan dari menu Manajemen SDM → Riwayat Penugasan
              </div>
            </div>
          </div>
        );
      })()}

      {/* Agenda detail popup */}
      {agendaDetailId !== null && (() => {
        const agenda = agendaMendatang.find(a => a.id === agendaDetailId) ?? null;
        if (!agenda) return null;
        const pic = agenda.peserta[0] ?? "—";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center"
            style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setAgendaDetailId(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
              onClick={e => e.stopPropagation()}>
              {/* Header */}
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-2">
                  <span className="text-base"></span>
                  <div className="text-sm font-bold text-gray-800">Detail Agenda</div>
                </div>
                <button onClick={() => setAgendaDetailId(null)}
                  className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 hover:bg-gray-200 text-gray-600 transition-colors">
                  Tutup
                </button>
              </div>

              <div className="p-5 flex flex-col gap-3">
                {/* Judul */}
                <div className="text-sm font-bold text-gray-800 leading-snug">{agenda.judul}</div>

                {/* Date / Time / Location grid */}
                <div className="grid grid-cols-2 gap-2">
                  <div className="rounded-xl p-3" style={{ background: "#f0fdfa", border: "1px solid #99f6e4" }}>
                    <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: "var(--tsu-teal)" }}>Tanggal</div>
                    <div className="text-xs font-bold text-gray-800">{agenda.tgl}</div>
                  </div>
                  <div className="rounded-xl p-3 bg-blue-50 border border-blue-100">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-blue-600 mb-1">Waktu</div>
                    <div className="text-xs font-bold text-gray-800">{agenda.jam} WIB</div>
                  </div>
                  <div className="rounded-xl p-3 bg-gray-50 border border-gray-100 col-span-2">
                    <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1">Lokasi / Media</div>
                    <div className="text-xs font-semibold text-gray-700">{agenda.tempat}</div>
                  </div>
                </div>

                {/* PIC */}
                <div className="rounded-xl p-3 bg-amber-50 border border-amber-100">
                  <div className="text-[8px] font-bold uppercase tracking-wider text-amber-600 mb-1">PIC / Koordinator</div>
                  <div className="text-xs font-semibold text-gray-700">{pic}</div>
                </div>

                {/* Peserta */}
                <div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Peserta</div>
                  <div className="flex flex-wrap gap-1.5">
                    {agenda.peserta.map(p => (
                      <span key={p} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-600">{p}</span>
                    ))}
                  </div>
                </div>

                {/* Deskripsi singkat */}
                <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                  <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1">Deskripsi Singkat</div>
                  <div className="text-[10px] text-gray-600 leading-relaxed">
                    {agenda.judul.toLowerCase().includes("tinjauan") && "Rapat tinjauan manajemen SPI untuk mengevaluasi pelaksanaan program kerja dan hasil audit semester berjalan."}
                    {agenda.judul.toLowerCase().includes("koordinasi") && "Koordinasi perencanaan program audit tahun 2025 meliputi penyusunan PKPT dan pembagian penugasan auditor."}
                    {agenda.judul.toLowerCase().includes("rtl") && "Evaluasi status tindak lanjut rekomendasi audit semester I bersama unit-unit yang terlibat."}
                    {!agenda.judul.toLowerCase().includes("tinjauan") && !agenda.judul.toLowerCase().includes("koordinasi") && !agenda.judul.toLowerCase().includes("rtl") && "Kegiatan terjadwal sesuai program kerja SPI tahun 2025."}
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

function FormTambahRapat({ onSave, onCancel, initial }: { onSave: (r: Omit<Rapat,"id"|"status">) => void; onCancel: () => void; initial?: Rapat }) {
  const isEdit = !!initial;
  const [judul,   setJudul]  = useState(initial?.judul ?? "");
  const [tgl,     setTgl]    = useState(initial ? tglIdToIso(initial.tgl) : "");
  const [jam,     setJam]    = useState(initial ? initial.jam.replace(".", ":") : "");
  const [tempat,  setTempat] = useState(initial?.tempat ?? "");
  const [peserta, setPeserta] = useState<string[]>(initial?.peserta ?? ["Kepala SPI", "Tim Auditor", "Staf Back Office"]);

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
    onSave(isEdit ? { judul, tgl: tglIsoToId(tgl), jam: jam.replace(":", "."), tempat: tempat || "TBD", peserta } : { judul, tgl, jam, tempat: tempat || "TBD", peserta });
    setJudul(""); setTgl(""); setJam(""); setTempat("");
    setPeserta(["Kepala SPI", "Tim Auditor", "Staf Back Office"]);
  }

  const allUnitsSelected = UNIT_KERJA_LIST.every(u => peserta.includes(u));
  const allInternalSelected = PESERTA_INTERNAL.every(p => peserta.includes(p));

  return (
    <div className="border border-teal-200 rounded-xl p-4 bg-teal-50 flex flex-col gap-4 mb-4">
      <div className="flex items-center justify-between">
        <div className="text-xs font-bold text-teal-800">{isEdit ? "Edit Rapat" : "Form Tambah Rapat Baru"}</div>
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
            <span className="text-[10px] font-bold text-gray-700">Internal SPI</span>
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
            <span className="text-[10px] font-bold text-gray-700">Unit Kerja (26 unit)</span>
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
          {isEdit ? "Simpan Perubahan" : `Simpan & Kirim Notif ke ${peserta.length} Peserta`}
        </button>
        <button onClick={onCancel}
          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
          Batal
        </button>
      </div>
    </div>
  );
}

function SectionA({ subSection, suratTabHint }: { subSection: string; suratTabHint?: "Masuk" | "Keluar" }) {
  // Jadwal Rapat umum dikelola di Kalender; Entry Meeting audit di Perencanaan Audit › Persiapan Audit.
  const active = subSection || "Surat Masuk & Keluar";
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [suratTab, setSuratTab] = useState<"Masuk" | "Keluar">(suratTabHint ?? "Masuk");
  React.useEffect(() => { if (suratTabHint) setSuratTab(suratTabHint); }, [suratTabHint]);
  const [pendingDelete, setPendingDelete] = useState<{ msg: string; confirmLabel?: string; fn: () => void } | null>(null);
  const [arsipSearch, setArsipSearch] = useState("");
  const [arsipFilter, setArsipFilter] = useState("Semua");
  const [suratSearch, setSuratSearch] = useState("");
  const [editSurat, setEditSurat] = useState<{ tab: "Masuk" | "Keluar"; idx: number } | null>(null);
  const [editArsip, setEditArsip] = useState<number | null>(null);


  const [suratMasuk, setSuratMasuk] = useState([
    { no: "001/SPI/V/2025",  tgl: "20 Mei 2025", perihal: "Undangan Rapat Koordinasi",       dari: "Rektorat",          disposisi: "Diproses", link: null as string | null },
    { no: "005/SPI/V/2025",  tgl: "19 Mei 2025", perihal: "Permintaan Data Audit BAAK",       dari: "BAAK",              disposisi: "Selesai",  link: null as string | null },
    { no: "009/EXT/V/2025",  tgl: "17 Mei 2025", perihal: "Laporan Hasil Pemeriksaan BPK",    dari: "BPK RI",            disposisi: "Selesai",  link: "https://drive.google.com/file/lhp-bpk-2025" as string | null },
    { no: "011/SPI/V/2025",  tgl: "15 Mei 2025", perihal: "Nota Dinas Evaluasi RTL",          dari: "Wakil Rektor II",   disposisi: "Diproses", link: null as string | null },
    { no: "014/SPI/IV/2025", tgl: "10 Apr 2025", perihal: "Undangan Workshop Audit Internal", dari: "BPKP Perwakilan",   disposisi: "Selesai",  link: null as string | null },
  ]);

  const { suratKeluar, setSuratKeluar } = useContext(SuratKeluarCtx);

  const [arsipBase, setArsipBase] = useState([
    { nama: "LHA Fakultas Teknik 2024",      unit: "Fak. Teknik",   tahun: "2024", tipe: "LHA",    tipeIcon: "LHA",   link: "https://drive.google.com/file/lha-fak-teknik-2024" },
    { nama: "KKA LPPM Audit Kinerja 2024",   unit: "LPPM",          tahun: "2024", tipe: "KKA",    tipeIcon: "KKA",   link: "https://drive.google.com/file/kka-lppm-2024" },
    { nama: "Notulen Rapat 20 Mei 2025",     unit: "SPI",           tahun: "2025", tipe: "Notulen",tipeIcon: "NOTUl", link: "https://drive.google.com/file/notulen-rapat-mei-2025" },
    { nama: "Laporan RTL Sarpras Q1 2025",   unit: "Sarpras",       tahun: "2025", tipe: "RTL",    tipeIcon: "RTL",   link: "https://drive.google.com/file/rtl-sarpras-q1-2025" },
    { nama: "LHA BAAK Audit Kepatuhan 2023", unit: "BAAK",          tahun: "2023", tipe: "LHA",    tipeIcon: "LHA",   link: "https://drive.google.com/file/lha-baak-2023" },
    { nama: "KKA Keuangan Semester II 2024", unit: "BAUK",          tahun: "2024", tipe: "KKA",    tipeIcon: "KKA",   link: "https://drive.google.com/file/kka-keuangan-s2-2024" },
    { nama: "RTL Audit Humas 2024",          unit: "Marcomm",       tahun: "2024", tipe: "RTL",    tipeIcon: "RTL",   link: "https://drive.google.com/file/rtl-humas-2024" },
    { nama: "Notulen Exit Meeting LPPM",     unit: "LPPM",          tahun: "2025", tipe: "Notulen",tipeIcon: "NOTU",  link: "https://drive.google.com/file/notulen-exit-lppm-2025" },
  ]);
  const arsipDoks = arsipBase.map((d, idx) => ({ ...d, idx })).filter(d =>
    (arsipFilter === "Semua" || d.tipe === arsipFilter) &&
    d.nama.toLowerCase().includes(arsipSearch.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-4">
      {/* Surat Masuk & Keluar */}
      {active === "Surat Masuk & Keluar" && (
        <div className="flex flex-col gap-4">
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
              <input value={suratSearch} onChange={e => setSuratSearch(e.target.value)}
                placeholder={`Cari no. surat, perihal, ${suratTab === "Masuk" ? "pengirim" : "tujuan"}...`}
                className="flex-1 min-w-0 mx-3 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400" />
              {canEdit && <button onClick={() => setTambahModal(suratTab === "Masuk" ? "Surat Masuk" : "Surat Keluar")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
                + {suratTab === "Masuk" ? "Tambah Surat Masuk" : "Tambah Surat Keluar"}
              </button>}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["No. Surat", "Tanggal", "Perihal", suratTab === "Masuk" ? "Dari" : "Kepada", "Status", "Arsip", "Aksi"].map(h => (
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {(suratTab === "Masuk" ? suratMasuk : suratKeluar)
                    .map((s, i) => ({ s, i }))
                    .filter(({ s }) => {
                      const q = suratSearch.trim().toLowerCase();
                      return !q || [s.no, s.tgl, s.perihal, "dari" in s ? s.dari : s.kepada].some(v => v.toLowerCase().includes(q));
                    })
                    .map(({ s, i }) => (
                    <tr key={s.no + i} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] font-mono text-gray-500 whitespace-nowrap">{s.no}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{s.tgl}</td>
                      <td className="py-2 pr-3 text-gray-700 max-w-[180px] truncate">{s.perihal}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{"dari" in s ? s.dari : s.kepada}</td>
                      <td className="py-2 pr-3">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                          s.disposisi === "Selesai" || s.disposisi === "Diterima" ? "bg-green-50 text-green-600" :
                          s.disposisi === "Diproses" || s.disposisi === "Terkirim" ? "bg-blue-50 text-blue-600" :
                          "bg-gray-100 text-gray-500"}`}>{s.disposisi}</span>
                      </td>
                      <td className="py-2 pr-3 whitespace-nowrap">
                        {s.link
                          ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-700">Sudah Terarsip</span>
                          : <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-gray-100 text-gray-400">Belum Terarsip</span>}
                      </td>
                      <td className="py-2">
                        <div className="flex items-center gap-1">
                          {/* Edit */}
                          {canEdit && (
                            <button title="Edit" onClick={() => setEditSurat({ tab: suratTab, idx: i })} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-gray-400 hover:text-amber-500 transition-colors">
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg>
                            </button>
                          )}
                          {/* Status buttons — Masuk (Selesai bersifat final) */}
                          {suratTab === "Masuk" && canEdit && s.disposisi === "Diterima" && (
                            <button title="Tandai Diproses" onClick={() => setSuratMasuk(prev => prev.map((x,j) => j===i ? {...x, disposisi:"Diproses"} : x))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-blue-100 hover:bg-blue-50 text-blue-300 hover:text-blue-500 transition-colors">
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M13 8A5 5 0 1 1 8 3M13 3v4h-4"/></svg>
                            </button>
                          )}
                          {suratTab === "Masuk" && canEdit && s.disposisi !== "Selesai" && s.disposisi !== "Diterima" && (
                            <button title="Tandai Selesai" onClick={() => setSuratMasuk(prev => prev.map((x,j) => j===i ? {...x, disposisi:"Selesai"} : x))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-green-100 hover:bg-green-50 text-green-300 hover:text-green-600 transition-colors">
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5,8.5 6.5,12.5 13.5,4"/></svg>
                            </button>
                          )}
                          {/* Status buttons — Keluar */}
                          {suratTab === "Keluar" && canEdit && s.disposisi === "Terkirim" && (
                            <button title="Tandai Diterima" onClick={() => setSuratKeluar(prev => prev.map((x,j) => j===i ? {...x, disposisi:"Diterima"} : x))}
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-green-100 hover:bg-green-50 text-green-300 hover:text-green-600 transition-colors">
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="2.5,8.5 6.5,12.5 13.5,4"/></svg>
                            </button>
                          )}
                          {/* Link softfile */}
                          {s.link ? (
                            <a href={s.link} target="_blank" rel="noreferrer" title="Lihat Softfile"
                              className="w-7 h-7 flex items-center justify-center rounded-lg border border-teal-100 hover:bg-teal-50 text-teal-400 hover:text-teal-600 transition-colors">
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6.5 9.5a3.5 3.5 0 0 0 4.95 0l1.41-1.41a3.5 3.5 0 0 0-4.95-4.95L7.09 4.5"/><path d="M9.5 6.5a3.5 3.5 0 0 0-4.95 0L3.14 7.91a3.5 3.5 0 0 0 4.95 4.95L9.91 11.5"/></svg>
                            </a>
                          ) : (
                            <button title="Belum ada softfile" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-100 text-gray-300 cursor-not-allowed">
                              <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><path d="M6.5 9.5a3.5 3.5 0 0 0 4.95 0l1.41-1.41a3.5 3.5 0 0 0-4.95-4.95L7.09 4.5"/><path d="M9.5 6.5a3.5 3.5 0 0 0-4.95 0L3.14 7.91a3.5 3.5 0 0 0 4.95 4.95L9.91 11.5"/></svg>
                            </button>
                          )}
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
            {arsipDoks.map(d => (
              <div key={d.idx} className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center text-[10px] font-black flex-shrink-0 ${d.tipe === "LHA" ? "bg-teal-50 text-teal-600" : d.tipe === "KKA" ? "bg-purple-50 text-purple-600" : d.tipe === "RTL" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600"}`}>
                  
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs font-medium text-gray-700 truncate">{d.nama}</div>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${d.tipe === "LHA" ? "bg-teal-50 text-teal-600" : d.tipe === "KKA" ? "bg-purple-50 text-purple-600" : d.tipe === "RTL" ? "bg-amber-50 text-amber-600" : "bg-gray-100 text-gray-500"}`}>{d.tipe}</span>
                    <span className="text-[9px] text-gray-400">{d.unit} · {d.tahun}</span>
                  </div>
                </div>
                <div className="flex gap-1 flex-shrink-0">
                  <AksiBtn kind="link" title="Buka Arsip" href={d.link} />
                  {canEdit && <AksiBtn kind="edit" title="Edit Arsip" onClick={() => setEditArsip(d.idx)} />}
                  {canEdit && <AksiBtn kind="hapus" title="Hapus Arsip" onClick={() => setPendingDelete({ msg: `Hapus arsip "${d.nama}"?`, fn: () => setArsipBase(prev => prev.filter(a => a.nama !== d.nama)) })} />}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
      {tambahModal === "Surat Masuk" && (
        <TambahFormModal title="Tambah Surat Masuk" fields={[
          { key:"no",      label:"No Surat",              type:"text",   placeholder:"001/SPI/VI/2025" },
          { key:"tgl",     label:"Tanggal",               type:"date" },
          { key:"perihal", label:"Perihal",               type:"text" },
          { key:"dari",    label:"Dari (Pengirim)",       type:"text" },
          { key:"link",    label:"Link Scan Surat (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setSuratMasuk(prev => [{ no: v.no || "-", tgl: v.tgl ? tglIsoToId(v.tgl) : "-", perihal: v.perihal || "-", dari: v.dari || "-", disposisi: "Diterima", link: v.link || null }, ...prev])}
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
        onSave={(v) => setSuratKeluar(prev => [{ no: v.no || "-", tgl: v.tgl ? tglIsoToId(v.tgl) : "-", perihal: v.perihal || "-", kepada: v.kepada || "-", disposisi: "Terkirim", link: v.link || null }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {editSurat && (() => {
        const masuk = editSurat.tab === "Masuk";
        const s = masuk ? suratMasuk[editSurat.idx] : suratKeluar[editSurat.idx];
        if (!s) return null;
        const pihak = "dari" in s ? s.dari : s.kepada;
        return (
          <TambahFormModal key={`${editSurat.tab}-${editSurat.idx}`} title={`Edit Surat ${editSurat.tab}`}
            initial={{ no: s.no, tgl: tglIdToIso(s.tgl), perihal: s.perihal, pihak, disposisi: s.disposisi, link: s.link ?? "" }}
            fields={[
              { key:"no",        label:"No Surat", type:"text" },
              { key:"tgl",       label:"Tanggal",  type:"date" },
              { key:"perihal",   label:"Perihal",  type:"text" },
              { key:"pihak",     label: masuk ? "Dari (Pengirim)" : "Kepada (Tujuan)", type:"text" },
              { key:"disposisi", label:"Status",   type:"select", options: masuk ? ["Diterima","Diproses","Selesai"] : ["Terkirim","Diterima"] },
              { key:"link",      label: masuk ? "Link Scan Surat (Google Drive)" : "Link Draft Surat (Google Drive)", type:"url", required:false },
            ]}
            onSave={v => {
              const base = { no: v.no || "-", tgl: v.tgl ? tglIsoToId(v.tgl) : "-", perihal: v.perihal || "-", disposisi: v.disposisi || s.disposisi, link: v.link?.trim() || null };
              if (masuk) setSuratMasuk(prev => prev.map((x, j) => j === editSurat.idx ? { ...x, ...base, dari: v.pihak || "-" } : x));
              else setSuratKeluar(prev => prev.map((x, j) => j === editSurat.idx ? { ...x, ...base, kepada: v.pihak || "-" } : x));
            }}
            onClose={() => setEditSurat(null)} />
        );
      })()}
      {editArsip !== null && arsipBase[editArsip] && (() => {
        const d = arsipBase[editArsip];
        return (
          <TambahFormModal key={editArsip} title="Edit Dokumen Arsip"
            initial={{ nama: d.nama, unit: d.unit, tahun: d.tahun, tipe: d.tipe, link: d.link }}
            fields={[
              { key:"nama",  label:"Nama Dokumen", type:"text" },
              { key:"unit",  label:"Unit Kerja",   type:"select", options:["BAAK","BAKPU","BAUK","Sarpras","SDM","BPU","D3-DKV","D3-DPT","D3-SI","D3-TI","Fak. Sains & Hum.","Fak. Teknik","Fak. Vokasi","KUI","LPM","LPPM","Perpustakaan","PMB","S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi","S1-ReKom","S1-Sistem Informasi","Marcomm","PIKD","SPI"] },
              { key:"tahun", label:"Tahun",        type:"select", options:["2025","2024","2023","2022"] },
              { key:"tipe",  label:"Tipe Dokumen", type:"select", options:["LHA","KKA","RTL","Notulen"] },
              { key:"link",  label:"Link Dokumen (Google Drive)", type:"url" },
            ]}
            onSave={v => setArsipBase(prev => prev.map((x, j) => j === editArsip ? { ...x, nama: v.nama || x.nama, unit: v.unit || x.unit, tahun: v.tahun || x.tahun, tipe: v.tipe || x.tipe, tipeIcon: v.tipe || x.tipe, link: v.link?.trim() || x.link } : x))}
            onClose={() => setEditArsip(null)} />
        );
      })()}
      {tambahModal === "Tambah Dokumen Arsip" && (
        <TambahFormModal title="Tambah Dokumen Arsip" fields={[
          { key:"nama",  label:"Nama Dokumen",            type:"text" },
          { key:"unit",  label:"Unit Kerja",              type:"select", options:["BAAK","BAKPU","BAUK","Sarpras","SDM","BPU","D3-DKV","D3-DPT","D3-SI","D3-TI","Fak. Sains & Hum.","Fak. Teknik","Fak. Vokasi","KUI","LPM","LPPM","Perpustakaan","PMB","S1-Informatika","S1-Manajemen","S1-PGSD","S1-Psikologi","S1-ReKom","S1-Sistem Informasi","Marcomm","PIKD","SPI"] },
          { key:"tahun", label:"Tahun",                   type:"select", options:["2025","2024","2023","2022"] },
          { key:"tipe",  label:"Tipe Dokumen",            type:"select", options:["LHA","KKA","RTL","Notulen"] },
          { key:"link",  label:"Link Dokumen (Google Drive)", type:"url" },
        ]}
        onSave={(v) => setArsipBase(prev => [{ nama: v.nama || "-", unit: v.unit || "-", tahun: v.tahun || "-", tipe: v.tipe || "-", tipeIcon: v.tipe || "-", link: v.link || "#" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {pendingDelete && (
        <ConfirmModal
          message={pendingDelete.msg}
          confirmLabel={pendingDelete.confirmLabel}
          onConfirm={() => { pendingDelete.fn(); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

// ── Persiapan Audit (Back Office): Penjadwalan Entry Meeting → Surat Pemberitahuan & Tugas ──
const PERSIAPAN_SEKSI: Record<string, string> = { "Penjadwalan Entry Meeting": "persiapan-jadwal", "Surat Pemberitahuan & Tugas": "persiapan-surat" };
function nextNoSurat(list: SuratKeluarItem[]): string {
  const n = Math.max(0, ...list.map(s => parseInt(s.no) || 0)) + 1;
  return `${String(n).padStart(3, "0")}/SPI/V/2025`;
}
function PersiapanAuditPanel({ initialTab }: { initialTab?: string }) {
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const notify = useContext(NotifyCtx);
  const { rencanaList } = useContext(AuditCtx);
  const { rapatList, addRapat, batalkanRapat } = useContext(RapatCtx);
  const { suratKeluar, setSuratKeluar } = useContext(SuratKeluarCtx);
  const { jadwalSetuju } = useContext(LapanganCtx);
  const [jenisSurat, setJenisSurat] = useState<"Pemberitahuan" | "Tugas">("Pemberitahuan");
  const [formFor, setFormFor] = useState<string | null>(null);
  const [form, setForm] = useState({ tgl: "", jam: "", tempat: "" });
  const [kirimSurat, setKirimSurat] = useState<string | null>(null);
  const [kirimLink, setKirimLink] = useState("");
  const [pendingBatal, setPendingBatal] = useState<{ msg: string; fn: () => void } | null>(null);
  // Tautan "Persiapan Audit › <bagian>" menggulir ke bagian terkait pada halaman tunggal
  useEffect(() => { const id = initialTab && PERSIAPAN_SEKSI[initialTab]; if (id) document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [initialTab]);

  // Gate: hanya Rencana Audit Disetujui dengan checklist lengkap & dikonfirmasi auditor
  const siap = rencanaList.filter(rencanaSiapJadwal);
  const menunggu = rencanaList.filter(r => r.status === "Disetujui" && !rencanaSiapJadwal(r));
  const approval = (em?: Rapat) => em ? (jadwalSetuju[em.id] ?? {}) : {};
  const chip = (ok?: boolean) => ok ? "bg-green-50 text-green-600" : "bg-gray-100 text-gray-500";
  const inputCls = "w-full border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:outline-none focus:border-teal-400 bg-white";

  function simpanJadwal(r: RencanaItem) {
    if (!form.tgl || !form.jam || !form.tempat.trim()) return;
    addRapat({ judul: `Entry Meeting ${r.no} — ${r.unit}`, tgl: tglIsoToId(form.tgl), jam: form.jam.replace(":", "."), tempat: form.tempat.trim(),
      peserta: ["Kepala SPI", "Tim Auditor", "Staf Back Office", r.unit], auditNo: r.no });
    notify({ title: `Mohon setujui tanggal Entry Meeting ${r.no}`, body: `${r.unit} · ${tglIsoToId(form.tgl)} ${form.jam.replace(":", ".")} WIB · ${form.tempat.trim()}`, tag: "Rapat", roles: ["pengawasan", "auditee"], unit: r.unit });
    setFormFor(null); setForm({ tgl: "", jam: "", tempat: "" });
  }

  return (
    <div className="flex flex-col gap-4">
      {(
        <div id="persiapan-jadwal" className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm scroll-mt-4">
          <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2"><span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white" style={{ background: "var(--tsu-teal)" }}>1</span>Penjadwalan Entry Meeting</h4>
          <p className="text-[10px] text-gray-400 mt-0.5 mb-3">Hanya Rencana Audit yang disetujui Ketua dengan checklist lengkap. Jadwal berlaku setelah disetujui Auditor dan Auditee; untuk mengubah jadwal, batalkan rapat lama lalu jadwalkan ulang.</p>
          <div className="flex flex-col gap-2">
            {siap.length === 0 && <div className="text-center py-6 text-[10px] text-gray-400">Belum ada Rencana Audit yang siap dijadwalkan.</div>}
            {siap.map(r => {
              const em = entryMeetingOf(rapatList, r.no);
              const nBatal = rapatList.filter(x => x.auditNo === r.no && x.status === "Batal").length;
              const st = approval(em);
              return (
                <div key={r.no} className="rounded-xl border border-gray-100 p-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-gray-700 flex items-center gap-1.5 flex-wrap">
                        <span className="font-mono text-[10px] text-teal-700 bg-teal-50 px-1.5 py-0.5 rounded">{r.no}</span>{r.unit} · Audit {r.jenis}
                        {nBatal > 0 && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-500">{nBatal}× dibatalkan</span>}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">Tim {r.tim}{r.pkptNo !== undefined ? ` · PKPT #${r.pkptNo}` : ""}</div>
                      {em && <>
                        <div className="text-[11px] text-gray-600 mt-1.5 font-medium">{em.tgl} · {em.jam} WIB · {em.tempat}</div>
                        <div className="flex gap-1.5 mt-1.5 flex-wrap">
                          {em.status === "Selesai"
                            ? <span className="text-[9px] font-bold px-2 py-0.5 rounded-full bg-green-50 text-green-600">Entry Meeting selesai</span>
                            : <>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${chip(st.auditor)}`}>Auditor: {st.auditor ? "Setuju" : "Menunggu"}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${chip(st.auditee)}`}>Auditee: {st.auditee ? "Setuju" : "Menunggu"}</span>
                            </>}
                        </div>
                      </>}
                    </div>
                    {canEdit && (em
                      ? em.status === "Terjadwal" && (
                        <button onClick={() => setPendingBatal({ msg: `Batalkan "${em.judul}" (${em.tgl})? Persetujuan jadwal akan di-reset dan Entry Meeting harus dijadwalkan ulang.`, fn: () => {
                            batalkanRapat(em.id);
                            notify({ title: `Entry Meeting ${r.no} dibatalkan`, body: `${r.unit}: jadwal ${em.tgl} dibatalkan, menunggu penjadwalan ulang.`, tag: "Rapat", roles: ["pengawasan", "auditee", "full"], unit: r.unit });
                          } })}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 whitespace-nowrap">Batalkan untuk Reschedule</button>)
                      : formFor !== r.no && (
                        <button onClick={() => { setFormFor(r.no); setForm({ tgl: "", jam: "", tempat: "" }); }}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>{nBatal > 0 ? "Jadwalkan Ulang" : "Jadwalkan Entry Meeting"}</button>))}
                  </div>
                  {formFor === r.no && !em && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-[1fr_110px_1.4fr_auto] gap-2 items-end rounded-lg bg-teal-50/60 border border-teal-100 p-3">
                      <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-600">Tanggal *</span>
                        <input type="date" value={form.tgl} onChange={e => setForm(f => ({ ...f, tgl: e.target.value }))} className={inputCls} /></label>
                      <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-600">Jam *</span>
                        <input type="time" value={form.jam} onChange={e => setForm(f => ({ ...f, jam: e.target.value }))} className={inputCls} /></label>
                      <label className="flex flex-col gap-1"><span className="text-[10px] font-semibold text-gray-600">Tempat *</span>
                        <input value={form.tempat} onChange={e => setForm(f => ({ ...f, tempat: e.target.value }))} placeholder={`Ruang Rapat ${r.unit}`} className={inputCls} /></label>
                      <div className="flex gap-1.5">
                        <button onClick={() => setFormFor(null)} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 bg-white">Batal</button>
                        <button disabled={!form.tgl || !form.jam || !form.tempat.trim()} onClick={() => simpanJadwal(r)}
                          className="text-[10px] font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--tsu-teal)" }}>Simpan Jadwal</button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          {menunggu.length > 0 && (
            <div className="mt-3 rounded-lg border border-dashed border-gray-200 px-3 py-2 text-[10px] text-gray-500">
              <span className="font-bold">Belum memenuhi syarat:</span> {menunggu.map(r => `${r.no} (${r.unit}, checklist ${(r.checklist ?? []).filter(Boolean).length}/${CHECKLIST_RENCANA.length}${(r.checklist ?? []).every(Boolean) && (r.checklist ?? []).length ? ", belum dikonfirmasi" : ""})`).join(" · ")}
            </div>
          )}
        </div>
      )}

      {(
        <div id="persiapan-surat" className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm scroll-mt-4">
          <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
            <div>
              <h4 className="text-xs font-bold text-gray-700 flex items-center gap-2"><span className="w-5 h-5 rounded-full text-[10px] font-black flex items-center justify-center text-white" style={{ background: "var(--tsu-teal)" }}>2</span>Surat Pemberitahuan & Tugas <span className="font-semibold text-gray-400">· {jenisSurat === "Pemberitahuan" ? "Pemberitahuan Audit (ke Auditee)" : "Surat Tugas (ke Tim Auditor)"}</span></h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Surat dapat dibuat setelah jadwal Entry Meeting disetujui Auditor dan Auditee. Draft dikirim melalui Surat Keluar.</p>
            </div>
            <div className="flex gap-1 bg-gray-50 rounded-lg p-0.5">
              {(["Pemberitahuan", "Tugas"] as const).map(j => (
                <button key={j} onClick={() => setJenisSurat(j)} className={`text-[10px] font-semibold px-3 py-1 rounded-md ${jenisSurat === j ? "bg-white shadow-sm text-teal-700" : "text-gray-500"}`}>{j === "Pemberitahuan" ? "Pemberitahuan" : "Surat Tugas"}</button>
              ))}
            </div>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead><tr className="border-b border-gray-100">
                {["Audit","Unit","Entry Meeting","Persetujuan Jadwal","No. Surat","Status","Aksi"].map(h => <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>)}
              </tr></thead>
              <tbody>
                {siap.length === 0 && <tr><td colSpan={7} className="py-6 text-center text-[10px] text-gray-400">Belum ada Rencana Audit yang siap.</td></tr>}
                {siap.map(r => {
                  const em = entryMeetingOf(rapatList, r.no);
                  const st = approval(em);
                  const ok = !!em && (em.status === "Selesai" || (!!st.auditor && !!st.auditee));
                  const surat = suratKeluar.find(s => s.auditNo === r.no && s.jenis === jenisSurat);
                  return (
                    <tr key={r.no} className="border-b border-gray-50 hover:bg-gray-50 align-top">
                      <td className="py-2 pr-3 font-mono text-[10px] font-bold text-teal-700">{r.no}</td>
                      <td className="py-2 pr-3 font-semibold text-gray-700 whitespace-nowrap">{r.unit}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{em ? `${em.tgl} · ${em.jam}` : <span className="text-gray-300">Belum dijadwalkan</span>}</td>
                      <td className="py-2 pr-3">{em ? <div className="flex gap-1">
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${chip(st.auditor || em.status === "Selesai")}`}>Auditor</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ${chip(st.auditee || em.status === "Selesai")}`}>Auditee</span>
                      </div> : "—"}</td>
                      <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 whitespace-nowrap">{surat?.no ?? "—"}</td>
                      <td className="py-2 pr-3">{surat
                        ? <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${surat.disposisi === "Draft" ? "bg-gray-100 text-gray-500" : "bg-teal-50 text-teal-700"}`}>{surat.disposisi}{surat.disposisi !== "Draft" ? ` · ${surat.tgl}` : ""}</span>
                        : <span className="text-[9px] text-gray-300">Belum dibuat</span>}</td>
                      <td className="py-2"><div className="flex gap-1 items-center">
                        {!surat && (ok
                          ? canEdit && <button onClick={() => {
                              const no = nextNoSurat(suratKeluar);
                              setSuratKeluar(prev => [{ no, tgl: RTL_TODAY_LABEL, perihal: jenisSurat === "Pemberitahuan" ? `Pemberitahuan Audit ${r.unit}` : `Surat Tugas Audit ${r.no} — ${r.unit}`,
                                kepada: jenisSurat === "Pemberitahuan" ? `Kepala ${r.unit}` : `Tim Auditor (${r.tim})`, disposisi: "Draft", link: null, auditNo: r.no, jenis: jenisSurat }, ...prev]);
                            }} className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>Buat Draft</button>
                          : <span className="text-[9px] text-amber-600 italic whitespace-nowrap">{em ? "Menunggu persetujuan jadwal" : "Jadwalkan Entry Meeting dulu"}</span>)}
                        {surat?.disposisi === "Draft" && canEdit && (
                          <button onClick={() => { setKirimSurat(surat.no); setKirimLink(""); }} className="text-[10px] font-bold px-2.5 py-1 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>Kirim</button>
                        )}
                        {surat?.link && <AksiBtn kind="link" title="Buka Surat" href={surat.link} />}
                      </div></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {kirimSurat && (() => {
        const s = suratKeluar.find(x => x.no === kirimSurat);
        if (!s) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setKirimSurat(null)}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              <div>
                <div className="text-sm font-black text-gray-800">Kirim Surat {s.jenis === "Tugas" ? "Tugas" : "Pemberitahuan"}</div>
                <p className="text-[10px] text-gray-400 mt-0.5">{s.no} · {s.perihal} · kepada {s.kepada}</p>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-500">Link dokumen surat (Google Drive, opsional)</span>
                <input type="url" value={kirimLink} onChange={e => setKirimLink(e.target.value)} placeholder="https://drive.google.com/…" className={inputCls} />
              </label>
              <div className="flex justify-end gap-2">
                <button onClick={() => setKirimSurat(null)} className="text-xs font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
                <button onClick={() => {
                    const unit = rencanaList.find(r => r.no === s.auditNo)?.unit;
                    setSuratKeluar(prev => prev.map(x => x.no === s.no ? { ...x, disposisi: "Terkirim", tgl: RTL_TODAY_LABEL, link: kirimLink.trim() || null } : x));
                    notify(s.jenis === "Tugas"
                      ? { title: `Surat Tugas ${s.auditNo} diterbitkan`, body: `${s.no} · ${s.perihal}`, tag: "Audit", roles: ["pengawasan", "full"] }
                      : { title: `Surat Pemberitahuan Audit ${s.auditNo}`, body: `${s.no} · ${s.perihal}`, tag: "Audit", roles: ["auditee", "full"], unit });
                    setKirimSurat(null);
                  }} className="text-xs font-bold px-4 py-2 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>Kirim Surat</button>
              </div>
            </div>
          </div>
        );
      })()}
      {pendingBatal && (
        <ConfirmModal message={pendingBatal.msg} confirmLabel="Ya, Batalkan"
          onConfirm={() => { pendingBatal.fn(); setPendingBatal(null); }}
          onCancel={() => setPendingBatal(null)} />
      )}
    </div>
  );
}

// ── Tugas Siklus Audit (Ringkasan Back Office) — alur chevron per tahap siklus ──
function TugasSiklusAuditPanel() {
  const navigateTo = useContext(NavCtx);
  const user = useContext(UserCtx);
  const { pkptList } = useContext(PkptCtx);
  const { rencanaList } = useContext(AuditCtx);
  const { rapatList } = useContext(RapatCtx);
  const { suratKeluar } = useContext(SuratKeluarCtx);
  const { jadwalSetuju } = useContext(LapanganCtx);
  const isKetua = user?.role === "full";
  const siap = rencanaList.filter(rencanaSiapJadwal);
  const jadwalOk = (em?: Rapat) => { const st = em ? jadwalSetuju[em.id] : undefined; return !!em && (em.status === "Selesai" || (!!st?.auditor && !!st?.auditee)); };
  const suratKurang = siap.reduce((acc, r) => {
    const em = entryMeetingOf(rapatList, r.no);
    if (!jadwalOk(em)) return acc;
    return acc + (["Pemberitahuan", "Tugas"] as const).filter(j => { const x = suratKeluar.find(s => s.auditNo === r.no && s.jenis === j); return !x || x.disposisi === "Draft"; }).length;
  }, 0);
  const tahap = [
    { label: "Susun PKPT",          desc: "Draft / revisi",                 pic: "Back Office", n: pkptList.filter(p => p.approval === "Draft" || p.approval === "Revisi").length, tone: "#64748b", sub: "PKPT" },
    { label: "Persetujuan Ketua",   desc: isKetua ? "Menunggu Anda" : "Diajukan ke Ketua", pic: "Ketua",  n: pkptList.filter(p => p.approval === "Diajukan").length, tone: "#d97706", sub: "PKPT" },
    { label: "Rencana Audit",       desc: "PKPT disetujui, belum diteruskan", pic: "Auditor",   n: pkptList.filter(p => p.approval === "Disetujui" && !rencanaList.some(r => r.pkptNo === p.no)).length, tone: "#0284c7", sub: "PKPT" },
    { label: "Jadwal Entry Meeting", desc: "Siap, belum dijadwalkan",       pic: "Back Office", n: siap.filter(r => !entryMeetingOf(rapatList, r.no)).length, tone: "#0d9488", sub: "Persiapan Audit › Penjadwalan Entry Meeting" },
    { label: "Persetujuan Jadwal",  desc: "Auditor / Auditee belum setuju", pic: "Auditor & Auditee", n: siap.filter(r => { const em = entryMeetingOf(rapatList, r.no); return em?.status === "Terjadwal" && !jadwalOk(em); }).length, tone: "#7c3aed", sub: "Persiapan Audit › Penjadwalan Entry Meeting" },
    { label: "Surat Pemberitahuan & Tugas", desc: "Perlu dibuat / dikirim", pic: "Back Office", n: suratKurang, tone: "#2563eb", sub: "Persiapan Audit › Surat Pemberitahuan & Tugas" },
  ];
  const total = tahap.reduce((a, t) => a + t.n, 0);
  const maxN = Math.max(...tahap.map(t => t.n));
  const ARROW = 16;
  const clip = (first: boolean) => first
    ? `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%)`
    : `polygon(0 0, calc(100% - ${ARROW}px) 0, 100% 50%, calc(100% - ${ARROW}px) 100%, 0 100%, ${ARROW}px 50%)`;
  return (
    <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
        <div>
          <h3 className="text-sm font-bold text-gray-700">Tugas Siklus Audit</h3>
          <p className="text-[10px] text-gray-400 mt-0.5">Antrean kerja per tahap, dari penyusunan PKPT hingga surat pemberitahuan. Klik tahap untuk membuka halamannya.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold px-2.5 py-1 rounded-full" style={total ? { background: "#fef3c7", color: "#b45309" } : { background: "#dcfce7", color: "#15803d" }}>
            {total ? `${total} tugas tertunda` : "Semua tahap beres"}
          </span>
        </div>
      </div>
      <div className="overflow-x-auto pb-1">
        <div className="flex" style={{ minWidth: 860 }}>
          {tahap.map((t, i) => {
            const aktif = t.n > 0;
            const bottleneck = aktif && t.n === maxN;
            const bg = bottleneck ? t.tone : aktif ? `${t.tone}1f` : "#f1f5f9";
            const fg = bottleneck ? "#fff" : aktif ? t.tone : "#94a3b8";
            return (
              <button key={t.label} onClick={() => navigateTo("backoffice", "B", t.sub)}
                title={`${t.label}: ${t.n} tugas · ${t.pic}`}
                className="group relative flex-1 text-left transition-transform hover:-translate-y-0.5 focus:outline-none"
                style={{ marginLeft: i === 0 ? 0 : -ARROW + 4 }}>
                <div className="h-[92px] flex flex-col justify-center transition-[filter] group-hover:brightness-95"
                  style={{ clipPath: clip(i === 0), background: bg, color: fg, paddingLeft: i === 0 ? 14 : ARROW + 10, paddingRight: ARROW + 8 }}>
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 h-4 rounded-full text-[9px] font-black flex items-center justify-center flex-shrink-0"
                      style={{ background: bottleneck ? "rgba(255,255,255,0.25)" : aktif ? "#fff" : "#e2e8f0", color: bottleneck ? "#fff" : aktif ? t.tone : "#94a3b8" }}>{i + 1}</span>
                    <span className="text-[10px] font-bold leading-tight truncate">{t.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1 mt-1">
                    <span className="text-2xl font-black leading-none">{t.n}</span>
                    {!aktif && <span className="text-[9px] font-bold text-green-600">beres</span>}
                  </div>
                  <div className="text-[9px] leading-tight mt-0.5 truncate" style={{ opacity: bottleneck ? 0.85 : 1, color: bottleneck ? "#fff" : "#94a3b8" }}>{t.desc}</div>
                </div>
                <div className="text-[9px] font-semibold text-gray-400 mt-1.5" style={{ paddingLeft: i === 0 ? 14 : ARROW + 10 }}>{t.pic}</div>
              </button>
            );
          })}
        </div>
      </div>
      {maxN > 0 && (() => { const b = tahap.find(t => t.n === maxN)!; return (
        <div className="mt-2 flex items-center gap-2 text-[10px] text-gray-500">
          <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ background: b.tone }} />
          Antrean terbanyak di tahap <span className="font-bold" style={{ color: b.tone }}>{b.label}</span> ({b.n}) — PIC {b.pic}.
        </div>
      ); })()}
    </div>
  );
}

function SectionB({ subSection }: { subSection: string }) {
  // "Persiapan Audit › <tab>" memungkinkan tautan langsung ke tab Persiapan Audit
  const [activeRaw, persiapanHint] = (subSection || "Audit Universe").split(" › ");
  const active = activeRaw;
  const user = useContext(UserCtx);
  const canEdit = user?.role !== "rektor";
  const isKetua = user?.role === "full";
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ msg: string; confirmLabel?: string; fn: () => void } | null>(null);
  const [editUniverse, setEditUniverse] = useState<number | null>(null);
  const [editPkpt, setEditPkpt] = useState<number | null>(null);
  const [detailPkpt, setDetailPkpt] = useState<number | null>(null);
  // PKPT disusun Back Office → diajukan ke Ketua → Disetujui / Revisi. Penerusan ke Rencana Audit dilakukan Auditor.
  const [revisiPkpt, setRevisiPkpt] = useState<number | null>(null);
  const [revisiCatatan, setRevisiCatatan] = useState("");
  const [usulRisk, setUsulRisk] = useState<{ id: string; unit: string; kategori: string } | null>(null);
  const [pkptFilter, setPkptFilter] = useState<"Semua" | PkptApproval>("Semua");
  const { rencanaList, laporanList } = useContext(AuditCtx);
  const { pkptList: pkptData, setPkptList: setPkptData } = useContext(PkptCtx);
  const notify = useContext(NotifyCtx);
  const [editRiskId, setEditRiskId] = useState<string | null>(null);
  const levelBadge = (l: string) =>
    l === "Tinggi" ? "bg-red-50 text-red-600" : l === "Sedang" ? "bg-amber-50 text-amber-600" : "bg-green-50 text-green-600";

  const [universeData, setUniverseData] = useState([
    { no: 1, unit: "BAAK",               kategori: "Layanan Akademik", terakhir: "Apr 2024", frekuensi: "Tahunan",    risiko: "Sedang", status: "Aktif" },
    { no: 2, unit: "LPPM",               kategori: "Penelitian",       terakhir: "Mar 2025", frekuensi: "Tahunan",    risiko: "Rendah", status: "Aktif" },
    { no: 3, unit: "Sarpras",            kategori: "Infrastruktur",    terakhir: "Jan 2025", frekuensi: "Semesteran", risiko: "Tinggi", status: "Aktif" },
    { no: 4, unit: "BAUK",               kategori: "Keuangan",         terakhir: "Feb 2025", frekuensi: "Semesteran", risiko: "Tinggi", status: "Aktif" },
    { no: 5, unit: "Marcomm",            kategori: "Promosi",          terakhir: "Okt 2024", frekuensi: "2 Tahunan",  risiko: "Rendah", status: "Aktif" },
    { no: 6, unit: "Fak. Teknik",        kategori: "Akademik",         terakhir: "Mei 2025", frekuensi: "Tahunan",    risiko: "Sedang", status: "Aktif" },
    { no: 7, unit: "Marcomm",            kategori: "Akademik",         terakhir: "Des 2024", frekuensi: "Tahunan",    risiko: "Sedang", status: "Aktif" },
    { no: 8, unit: "LPM",                kategori: "Layanan Mhs",      terakhir: "Sep 2024", frekuensi: "2 Tahunan",  risiko: "Rendah", status: "Tidak Aktif" },
  ]);


  const { residualList, penutupan } = useContext(LapanganCtx);
  // Tahap pelaksanaan PKPT diturunkan dari Rencana Audit terkait (tidak dicampur dengan status persetujuan)
  function pkptTahap(p: PkptItem): { label: string; cls: string; ra?: RencanaItem } {
    const ra = rencanaList.find(r => r.pkptNo === p.no);
    if (!ra) return p.approval === "Disetujui"
      ? { label: "Menunggu diteruskan Auditor", cls: "bg-sky-50 text-sky-600" }
      : { label: "—", cls: "text-gray-300" };
    const selesai = penutupan[ra.no]?.status === "Close" || laporanList.some(l => l.auditNo === ra.no && l.status === "Diterima");
    if (selesai) return { label: `${ra.no} · Selesai`, cls: "bg-green-50 text-green-600", ra };
    if (ra.status === "Disetujui") return { label: `${ra.no} · Berjalan`, cls: "bg-blue-50 text-blue-600", ra };
    return { label: `${ra.no} · ${ra.status === "Diajukan" ? "Menunggu Ketua" : "Draft"}`, cls: "bg-teal-50 text-teal-700", ra };
  }
  function ajukanKeKetua(p: PkptItem) {
    setPkptData(prev => prev.map(x => x.no === p.no ? { ...x, approval: "Diajukan" } : x));
    notify({ title: `PKPT #${p.no} diajukan ke Ketua`, body: `${p.program} (${p.unit}) · Rp ${p.anggaran.toFixed(1)} Jt menunggu persetujuan.`, tag: "Audit", roles: ["full"] });
  }
  function setujuiPkpt(p: PkptItem) {
    setPkptData(prev => prev.map(x => x.no === p.no ? { ...x, approval: "Disetujui", catatanKetua: undefined } : x));
    notify({ title: `PKPT #${p.no} disetujui Ketua`, body: `${p.program} (${p.unit}) siap diteruskan Auditor menjadi Rencana Audit.`, tag: "Audit", roles: ["backoffice", "pengawasan"] });
  }
  // Temuan residual dari Penutupan Audit (status Open) masuk sebagai baris Risk Register
  function withResidual<T extends { no: number; id: string }>(base: T[]): T[] {
    const lvl: Record<string, [number, number]> = { Tinggi: [4, 4], Sedang: [3, 3], Rendah: [2, 2] };
    const extra = residualList.filter(r => !base.some(b => b.id === r.id)).map((r, k) => {
      const [km, dp] = lvl[r.tingkat] ?? [3, 3];
      return { ...base[0], no: base.length + k + 1, id: r.id, unit: r.unit, uraian: `Residual ${r.auditNo}: ${r.uraian}`, penyebab: "Tindak lanjut audit belum tuntas", dampakDesc: "—",
        kategori: r.kategori, kemungkinan: km, dampak: dp, pengendalian: "—", efektivitas: "Kurang", kemungkinanResidual: km, dampakResidual: dp,
        rencanamitigasi: "Dibahas pada telaah PKPT siklus berikutnya", pic: "-", target: "-", periode: "Siklus berikutnya", status: "Belum Ditindaklanjuti",
        progress: 0, tanggalReview: r.tgl, catatanSPI: `Temuan residual dari Penutupan Audit ${r.auditNo}.`, buktiPengendalian: null, riwayat: [] } as T;
    });
    return [...extra, ...base];
  }
  const [riskData, setRiskData] = useState(() => withResidual([
    {
      no: 1, id: "RSK-001", unit: "BAUK", uraian: "Ketidakakuratan pelaporan keuangan",
      penyebab: "SDM akuntansi terbatas; sistem informasi keuangan belum terintegrasi.",
      dampakDesc: "Opini audit disclaimer, sanksi BPK/BPKP, kerugian reputasi institusi.",
      kategori: "Keuangan", kemungkinan: 4, dampak: 5,
      pengendalian: "Rekonsiliasi bulanan, review 4 mata, validasi laporan oleh kepala bagian.",
      efektivitas: "Cukup", kemungkinanResidual: 2, dampakResidual: 4,
      rencanamitigasi: "Implementasi sistem ERP terintegrasi Q3 2025; pelatihan akuntansi triwulanan.",
      pic: "Budi Santoso", target: "Des 2025", periode: "Q2 2025", status: "Proses",
      progress: 45, tanggalReview: "15 Mei 2025",
      catatanSPI: "Rekonsiliasi sudah berjalan rutin, masih ada selisih minor. Perlu peningkatan kompetensi SDM keuangan.",
      buktiPengendalian: "https://drive.google.com/file/rekonsiliasi-bauk-q2-2025",
      riwayat: [
        { tgl: "15 Mei 2025", catatan: "Review Q2 — rekonsiliasi sudah berjalan, selisih berkurang 30%.", pic: "Budi Santoso" },
        { tgl: "10 Feb 2025", catatan: "Identifikasi awal — selisih laporan ditemukan saat audit Q4 2024.", pic: "Ratna Dewi" },
      ],
    },
    {
      no: 2, id: "RSK-002", unit: "Sarpras", uraian: "Kerusakan aset tetap tidak terpantau",
      penyebab: "Tidak ada sistem pemeliharaan preventif; inventaris aset tidak diperbarui.",
      dampakDesc: "Gangguan operasional perkuliahan, biaya perbaikan darurat tinggi, risiko keselamatan.",
      kategori: "Aset", kemungkinan: 4, dampak: 4,
      pengendalian: "Inspeksi fisik semesteran oleh tim Sarpras.",
      efektivitas: "Kurang", kemungkinanResidual: 3, dampakResidual: 3,
      rencanamitigasi: "Penerapan CMMS; pembaruan SIMAK-BMN; SOP pemeliharaan preventif bulanan.",
      pic: "Ratna Dewi", target: "Sep 2025", periode: "Q2 2025", status: "Terlambat",
      progress: 20, tanggalReview: "10 Apr 2025",
      catatanSPI: "Target Q1 terlewat. Proses tender CMMS belum dimulai. Perlu eskalasi ke Wakil Rektor II.",
      buktiPengendalian: null,
      riwayat: [
        { tgl: "10 Apr 2025", catatan: "Review Q1 — progress tertinggal dari jadwal, belum ada tindak lanjut konkret.", pic: "Ratna Dewi" },
        { tgl: "5 Jan 2025",  catatan: "Risiko diidentifikasi dari temuan audit Sarpras 2024.", pic: "Budi Santoso" },
      ],
    },
    {
      no: 3, id: "RSK-003", unit: "BAAK", uraian: "SOP penerimaan mahasiswa tidak dipatuhi",
      penyebab: "SOP belum disosialisasikan ke seluruh staf; rotasi pegawai tinggi.",
      dampakDesc: "Pelanggaran regulasi, komplain mahasiswa, risiko akreditasi program studi.",
      kategori: "Kepatuhan", kemungkinan: 3, dampak: 4,
      pengendalian: "Review SOP tahunan dan pelatihan orientasi staf baru.",
      efektivitas: "Cukup", kemungkinanResidual: 2, dampakResidual: 3,
      rencanamitigasi: "Revisi dan sosialisasi SOP PMB Q2 2025; monitoring kepatuhan bulanan.",
      pic: "Andi Prasetyo", target: "Jun 2025", periode: "Q1 2025", status: "Proses",
      progress: 60, tanggalReview: "20 Mei 2025",
      catatanSPI: "Revisi SOP sudah selesai; sosialisasi ke staf dijadwalkan 10 Juni 2025.",
      buktiPengendalian: "https://drive.google.com/file/sop-pmb-revisi-2025",
      riwayat: [
        { tgl: "20 Mei 2025", catatan: "Revisi SOP selesai, jadwal sosialisasi ditetapkan.", pic: "Andi Prasetyo" },
        { tgl: "15 Mar 2025", catatan: "Temuan audit Q1 — 3 dari 10 proses PMB tidak sesuai SOP.", pic: "Ratna Dewi" },
      ],
    },
    {
      no: 4, id: "RSK-004", unit: "LPPM", uraian: "Dokumentasi penelitian tidak lengkap",
      penyebab: "Kurangnya pemahaman dosen terhadap standar dokumentasi; sistem pelaporan manual.",
      dampakDesc: "Risiko saat akreditasi lembaga penelitian; dana penelitian tidak dapat dipertanggungjawabkan.",
      kategori: "Operasional", kemungkinan: 3, dampak: 3,
      pengendalian: "Checklist dokumen penelitian & validasi saat pencairan dana.",
      efektivitas: "Cukup", kemungkinanResidual: 2, dampakResidual: 2,
      rencanamitigasi: "Pengembangan sistem informasi penelitian terintegrasi; pelatihan dokumentasi.",
      pic: "Siti Aisyah", target: "Agt 2025", periode: "Q2 2025", status: "Proses",
      progress: 50, tanggalReview: "5 Mei 2025",
      catatanSPI: "Checklist sudah diterapkan di 70% penelitian aktif. Sistem informasi masih dalam pengembangan.",
      buktiPengendalian: "https://drive.google.com/file/checklist-penelitian-lppm-2025",
      riwayat: [
        { tgl: "5 Mei 2025",  catatan: "Monitoring tengah tahun — checklist berjalan, cakupan 70%.", pic: "Siti Aisyah" },
        { tgl: "20 Jan 2025", catatan: "Identifikasi risiko dari evaluasi laporan penelitian 2024.", pic: "Budi Santoso" },
      ],
    },
    {
      no: 5, id: "RSK-005", unit: "SPI", uraian: "Keterlambatan pelaporan tindak lanjut (RTL)",
      penyebab: "Koordinasi lintas unit lemah; kurangnya monitoring proaktif oleh SPI.",
      dampakDesc: "Akumulasi rekomendasi tidak ditindaklanjuti; penilaian negatif dari auditor eksternal.",
      kategori: "Kepatuhan", kemungkinan: 3, dampak: 3,
      pengendalian: "Monitoring RTL mingguan via sistem informasi SPI.",
      efektivitas: "Cukup", kemungkinanResidual: 2, dampakResidual: 2,
      rencanamitigasi: "Penerapan dashboard RTL real-time; reminder otomatis H-7 sebelum deadline.",
      pic: "Budi Santoso", target: "Sep 2025", periode: "Q2 2025", status: "Proses",
      progress: 65, tanggalReview: "18 Mei 2025",
      catatanSPI: "Dashboard sudah digunakan sejak April. Keterlambatan turun 40% dibanding Q4 2024.",
      buktiPengendalian: "https://drive.google.com/file/laporan-monitoring-rtl-mei-2025",
      riwayat: [
        { tgl: "18 Mei 2025", catatan: "Dashboard RTL aktif; reminder sudah berjalan otomatis.", pic: "Budi Santoso" },
        { tgl: "10 Feb 2025", catatan: "Diidentifikasi: 8 RTL terlambat dari Q4 2024.", pic: "Ratna Dewi" },
      ],
    },
    {
      no: 6, id: "RSK-006", unit: "TI/Sistem", uraian: "Akses sistem informasi tidak terkontrol",
      penyebab: "Tidak ada kebijakan manajemen hak akses; akun ex-pegawai belum dinonaktifkan.",
      dampakDesc: "Kebocoran data sensitif, manipulasi data akademik/keuangan.",
      kategori: "Teknologi", kemungkinan: 2, dampak: 4,
      pengendalian: "Review hak akses semesteran; audit log akses sistem.",
      efektivitas: "Efektif", kemungkinanResidual: 1, dampakResidual: 3,
      rencanamitigasi: "Kebijakan IAM formal; otomasi penonaktifan akun saat off-boarding.",
      pic: "Andi Prasetyo", target: "Jun 2025", periode: "Q1 2025", status: "Selesai",
      progress: 100, tanggalReview: "30 Apr 2025",
      catatanSPI: "Review hak akses selesai. 12 akun tidak aktif sudah dinonaktifkan. Kebijakan IAM disahkan.",
      buktiPengendalian: "https://drive.google.com/file/kebijakan-iam-2025-signed",
      riwayat: [
        { tgl: "30 Apr 2025", catatan: "Pengendalian selesai — kebijakan IAM resmi berlaku.", pic: "Andi Prasetyo" },
        { tgl: "15 Mar 2025", catatan: "Review hak akses — 12 akun tidak aktif ditemukan.", pic: "Andi Prasetyo" },
        { tgl: "5 Jan 2025",  catatan: "Identifikasi risiko dari audit IT Q4 2024.", pic: "Budi Santoso" },
      ],
    },
    {
      no: 7, id: "RSK-007", unit: "BAKPU", uraian: "Pengelolaan data kepegawaian tidak akurat",
      penyebab: "Data ganda dan tidak terkini di SIMPEG; proses validasi manual.",
      dampakDesc: "Kesalahan penggajian, tunjangan tidak tepat sasaran, risiko hukum ketenagakerjaan.",
      kategori: "Operasional", kemungkinan: 3, dampak: 3,
      pengendalian: "Rekonsiliasi data kepegawaian triwulanan.",
      efektivitas: "Cukup", kemungkinanResidual: 2, dampakResidual: 2,
      rencanamitigasi: "Integrasi SIMPEG dengan sistem penggajian; validasi data tahunan.",
      pic: "Siti Aisyah", target: "Des 2025", periode: "Q2 2025", status: "Belum Ditindaklanjuti",
      progress: 0, tanggalReview: "—",
      catatanSPI: "Risiko baru diidentifikasi dari temuan audit BAKPU Mei 2025. Rencana tindak lanjut sedang disusun.",
      buktiPengendalian: null,
      riwayat: [
        { tgl: "10 Mei 2025", catatan: "Identifikasi risiko dari temuan audit BAKPU. Menunggu rencana mitigasi formal.", pic: "Ratna Dewi" },
      ],
    },
  ]));
  // Residual baru dari Penutupan Audit (setelah mount) ikut masuk Risk Register
  useEffect(() => {
    setRiskData(prev => { const next = withResidual(prev); return next.length === prev.length ? prev : next; });
  }, [residualList]);


  // Risk Register state
  const [rrSearch,       setRrSearch]       = useState("");
  const [rrFilterUnit,   setRrFilterUnit]   = useState("Semua");
  const [rrFilterKat,    setRrFilterKat]    = useState("Semua");
  const [rrFilterLevel,  setRrFilterLevel]  = useState("Semua");
  const [rrFilterStatus, setRrFilterStatus] = useState("Semua");
  const [rrFilterPIC,    setRrFilterPIC]    = useState("Semua");
  const [rrFilterPeriode,setRrFilterPeriode]= useState("Semua");
  const [rrDetailId,     setRrDetailId]     = useState<string | null>(null);

  return (
    <div className="flex flex-col gap-4">
      {/* Audit Universe */}
      {active === "Audit Universe" && (
        <div className="flex flex-col gap-4">
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
                        {canEdit && <button title="Edit" onClick={() => setEditUniverse(u.no)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg></button>}
                        {canEdit && u.status === "Aktif" && <button title="Nonaktifkan" onClick={() => setPendingDelete({ msg: `Nonaktifkan unit "${u.unit}" dari Audit Universe?`, confirmLabel: "Ya, Nonaktifkan", fn: () => setUniverseData(prev => prev.map(x => x.no === u.no ? { ...x, status: "Tidak Aktif" } : x)) })} className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"><circle cx="8" cy="8" r="6"/><line x1="3.8" y1="3.8" x2="12.2" y2="12.2"/></svg></button>}
                      </div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {active === "Persiapan Audit" && <PersiapanAuditPanel initialTab={persiapanHint} />}

      {/* PKPT */}
      {active === "PKPT" && (() => {
        const count = (a: PkptApproval) => pkptData.filter(p => p.approval === a).length;
        const disetujui = count("Disetujui");
        const rows = pkptFilter === "Semua" ? pkptData : pkptData.filter(p => p.approval === pkptFilter);
        return (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h4 className="text-xs font-bold text-gray-700">Program Kerja Pengawasan Tahunan (PKPT) 2025</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Disusun Back Office dari Risk Register → diajukan ke Ketua → disetujui. PKPT disetujui diteruskan Auditor menjadi Rencana Audit.</p>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="w-32 bg-gray-100 rounded-full h-1.5">
                    <div className="h-1.5 rounded-full bg-green-500" style={{ width: `${pkptData.length ? (disetujui / pkptData.length) * 100 : 0}%` }} />
                  </div>
                  <span className="text-[10px] text-gray-400">{disetujui} dari {pkptData.length} program disetujui Ketua</span>
                </div>
              </div>
              {canEdit && <button onClick={() => setTambahModal("Tambah Program Audit")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Tambah Program</button>}
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {(["Semua", "Draft", "Diajukan", "Revisi", "Disetujui"] as const).map(f => (
                <button key={f} onClick={() => setPkptFilter(f)}
                  className="text-[10px] font-semibold px-2.5 py-1 rounded-full border transition-all"
                  style={pkptFilter === f
                    ? { background: "var(--tsu-teal)", color: "#fff", borderColor: "var(--tsu-teal)" }
                    : { background: "#f8fafc", color: "#64748b", borderColor: "#e2e8f0" }}>
                  {f === "Semua" ? "Semua" : PKPT_APPROVAL_STYLE[f].label} <span className="opacity-70">{f === "Semua" ? pkptData.length : count(f)}</span>
                </button>
              ))}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["No","Program Audit","Unit Sasaran","Periode","Auditor Ketua","Anggaran (Rp Jt)","Status","Rencana Audit","Aksi"].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.length === 0 && <tr><td colSpan={9} className="py-6 text-center text-[10px] text-gray-400">Tidak ada program dengan status ini.</td></tr>}
                  {rows.map(p => {
                    const tahap = pkptTahap(p);
                    const st = PKPT_APPROVAL_STYLE[p.approval];
                    const bisaUbah = canEdit && (p.approval === "Draft" || p.approval === "Revisi");
                    return (
                    <tr key={p.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors align-top">
                      <td className="py-2 pr-3 text-[10px] text-gray-400">{p.no}</td>
                      <td className="py-2 pr-3 font-medium text-gray-700">
                        {p.program}
                        {p.riskId && <div className="text-[9px] font-semibold text-rose-500 mt-0.5">dari Risk Register {p.riskId}</div>}
                      </td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.unit}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.periode}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.ketua}</td>
                      <td className="py-2 pr-3 text-gray-700 font-semibold">{p.anggaran.toFixed(1)}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${st.cls}`}>{st.label}</span></td>
                      <td className="py-2 pr-3">
                        {p.approval === "Revisi" && p.catatanKetua
                          ? <div className="max-w-[260px] rounded-lg bg-red-50 border border-red-100 px-2 py-1.5 text-[10px] text-red-700 leading-snug"><span className="font-bold">Catatan Ketua:</span> {p.catatanKetua}</div>
                          : <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${tahap.cls}`}>{tahap.label}</span>}
                      </td>
                      <td className="py-2"><div className="flex gap-1 items-center">
                        <AksiBtn kind="detail" title="Lihat Detail" onClick={() => setDetailPkpt(p.no)} />
                        {bisaUbah && <AksiBtn kind="edit" title="Edit Program" onClick={() => setEditPkpt(p.no)} />}
                        {bisaUbah && !isKetua && (
                          <button onClick={() => ajukanKeKetua(p)} className="h-7 px-2 flex items-center rounded-lg text-white text-[9px] font-bold whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>
                            {p.approval === "Revisi" ? "Ajukan Ulang" : "Ajukan ke Ketua"}
                          </button>
                        )}
                        {isKetua && p.approval === "Diajukan" && <>
                          <AksiBtn kind="setujui" title="Setujui PKPT" onClick={() => setujuiPkpt(p)} />
                          <button onClick={() => { setRevisiCatatan(""); setRevisiPkpt(p.no); }} className="h-7 px-2 flex items-center rounded-lg border border-red-200 text-red-600 text-[9px] font-bold whitespace-nowrap hover:bg-red-50 transition-colors">Revisi</button>
                        </>}
                        {!isKetua && p.approval === "Diajukan" && <span className="text-[9px] text-amber-600 italic whitespace-nowrap">Menunggu Ketua</span>}
                      </div></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
        );
      })()}

      {/* Risk Register */}
      {active === "Risk Register" && (() => {
        const riskLevel = (k: number, d: number) => { const s = k*d; return s >= 15 ? "Tinggi" : s >= 9 ? "Sedang" : "Rendah"; };
        const levelColor = (l: string) => l === "Tinggi" ? { dot: "#ef4444", bg: "bg-red-50",   text: "text-red-600"   }
                                        : l === "Sedang"  ? { dot: "#f59e0b", bg: "bg-amber-50", text: "text-amber-600" }
                                        :                   { dot: "#22c55e", bg: "bg-green-50", text: "text-green-600" };
        const statusColor = (s: string) =>
          s === "Selesai"               ? "bg-green-50 text-green-600" :
          s === "Proses"                ? "bg-blue-50 text-blue-600"   :
          s === "Terlambat"             ? "bg-red-50 text-red-600"     :
          s === "Belum Ditindaklanjuti" ? "bg-gray-100 text-gray-500"  : "bg-amber-50 text-amber-600";

        const allUnits   = ["Semua", ...Array.from(new Set(riskData.map(r => r.unit)))];
        const allKat     = ["Semua", ...Array.from(new Set(riskData.map(r => r.kategori)))];
        const allPIC     = ["Semua", ...Array.from(new Set(riskData.map(r => r.pic)))];
        const allPeriode = ["Semua", ...Array.from(new Set(riskData.map(r => r.periode)))];

        const filtered = riskData.filter(r => {
          const level = riskLevel(r.kemungkinan, r.dampak);
          return (
            (rrFilterUnit   === "Semua" || r.unit     === rrFilterUnit)   &&
            (rrFilterKat    === "Semua" || r.kategori === rrFilterKat)    &&
            (rrFilterLevel  === "Semua" || level      === rrFilterLevel)  &&
            (rrFilterStatus === "Semua" || r.status   === rrFilterStatus) &&
            (rrFilterPIC    === "Semua" || r.pic      === rrFilterPIC)    &&
            (rrFilterPeriode=== "Semua" || r.periode  === rrFilterPeriode)&&
            (rrSearch === "" || r.uraian.toLowerCase().includes(rrSearch.toLowerCase()) || r.id.toLowerCase().includes(rrSearch.toLowerCase()) || r.unit.toLowerCase().includes(rrSearch.toLowerCase()))
          );
        });

        const countLevel = (l: string) => riskData.filter(r => riskLevel(r.kemungkinan, r.dampak) === l).length;
        const detailRisk = rrDetailId ? riskData.find(r => r.id === rrDetailId) : null;

        return (
          <div className="flex flex-col gap-4">
            {/* Summary strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "Total Risiko",  val: riskData.length, colorTxt: "text-gray-800",   bg: "bg-white" },
                { label: "Risiko Tinggi", val: countLevel("Tinggi"), colorTxt: "text-red-600",   bg: "bg-red-50",   border: "border-red-100"   },
                { label: "Risiko Sedang", val: countLevel("Sedang"), colorTxt: "text-amber-600", bg: "bg-amber-50", border: "border-amber-100" },
                { label: "Risiko Rendah", val: countLevel("Rendah"), colorTxt: "text-green-600", bg: "bg-green-50", border: "border-green-100" },
              ].map(s => (
                <div key={s.label} className={`rounded-xl border p-3 shadow-sm flex items-center gap-3 ${s.bg} ${(s as any).border ?? "border-gray-100"}`}>
                  <div className={`text-2xl font-black ${s.colorTxt}`}>{s.val}</div>
                  <div className="text-[9px] font-semibold text-gray-500 leading-tight">{s.label}</div>
                </div>
              ))}
            </div>

            {/* Filters + Search */}
            <div className="bg-white rounded-xl border border-gray-100 p-3 shadow-sm">
              <div className="flex flex-wrap gap-2 items-center">
                <input value={rrSearch} onChange={e => setRrSearch(e.target.value)}
                  placeholder="Cari ID, uraian, unit…"
                  className="border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:border-teal-400 flex-1 min-w-[160px]" />
                {[
                  { label:"Unit",     val: rrFilterUnit,    opts: allUnits,                                          set: setRrFilterUnit   },
                  { label:"Kategori", val: rrFilterKat,     opts: allKat,                                            set: setRrFilterKat    },
                  { label:"Level",    val: rrFilterLevel,   opts: ["Semua","Tinggi","Sedang","Rendah"],               set: setRrFilterLevel  },
                  { label:"Status",   val: rrFilterStatus,  opts: ["Semua","Belum Ditindaklanjuti","Proses","Terlambat","Selesai"], set: setRrFilterStatus },
                  { label:"PIC",      val: rrFilterPIC,     opts: allPIC,                                            set: setRrFilterPIC    },
                  { label:"Periode",  val: rrFilterPeriode, opts: allPeriode,                                        set: setRrFilterPeriode},
                ].map(f => (
                  <select key={f.label} value={f.val} onChange={e => f.set(e.target.value)}
                    className="border border-gray-200 rounded-lg px-2 py-1.5 text-[10px] text-gray-600 focus:outline-none focus:border-teal-400 bg-white">
                    {f.opts.map(o => <option key={o}>{o === "Semua" ? `${f.label}: Semua` : o}</option>)}
                  </select>
                ))}
                <div className="ml-auto flex-shrink-0">
                  {canEdit && (
                    <button onClick={() => setTambahModal("Tambah Risiko")}
                      className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white flex items-center gap-1" style={{ background: "var(--tsu-teal)" }}>
                      + Tambah Risiko
                    </button>
                  )}
                </div>
              </div>
              <div className="text-[9px] text-gray-400 mt-2">{filtered.length} dari {riskData.length} risiko ditampilkan · Skor = Kemungkinan × Dampak (1–5)</div>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-gray-50 border-b border-gray-100">
                      {["ID Risiko","Uraian Risiko","Risiko Awal","Residual","Status","Aksi"].map(h => (
                        <th key={h} className="text-left text-[10px] font-bold text-gray-400 px-3 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-8 text-center text-[10px] text-gray-400">Tidak ada risiko yang cocok dengan filter.</td></tr>
                    )}
                    {filtered.map(r => {
                      const skor    = r.kemungkinan * r.dampak;
                      const level   = riskLevel(r.kemungkinan, r.dampak);
                      const lc      = levelColor(level);
                      const skorRes = r.kemungkinanResidual * r.dampakResidual;
                      const levelRes= riskLevel(r.kemungkinanResidual, r.dampakResidual);
                      const lcRes   = levelColor(levelRes);
                      return (
                        <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                          <td className="px-3 py-2.5 font-mono text-[10px] text-gray-500 whitespace-nowrap">{r.id}</td>
                          <td className="px-3 py-2.5 text-gray-700 max-w-[260px]">
                            <div className="truncate font-medium" title={r.uraian}>{r.uraian}</div>
                            <div className="text-[9px] text-gray-400 mt-0.5">{r.unit} · {r.kategori}</div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black" style={{ color: lc.dot }}>{skor}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${lc.bg} ${lc.text}`}>{level}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5 whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-black" style={{ color: lcRes.dot }}>{skorRes}</span>
                              <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${lcRes.bg} ${lcRes.text}`}>{levelRes}</span>
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex flex-col gap-0.5">
                              <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block ${statusColor(r.status)}`}>{r.status}</span>
                              {(() => { const pk = pkptData.find(p => p.riskId === r.id); return pk ? (
                                <span title={pk.program} className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full inline-block whitespace-nowrap ${PKPT_APPROVAL_STYLE[pk.approval].cls}`}>PKPT #{pk.no} · {PKPT_APPROVAL_STYLE[pk.approval].label}</span>
                              ) : null; })()}
                              {r.progress > 0 && (
                                <div className="w-full h-1 bg-gray-100 rounded-full overflow-hidden mt-0.5">
                                  <div className="h-1 rounded-full" style={{ width: `${r.progress}%`, background: r.status === "Selesai" ? "#22c55e" : r.status === "Terlambat" ? "#ef4444" : "var(--tsu-teal)" }} />
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2.5">
                            <div className="flex items-center gap-1">
                              {/* Detail */}
                              <button title="Lihat Detail" onClick={() => setRrDetailId(r.id)}
                                className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-blue-50 hover:border-blue-200 text-gray-400 hover:text-blue-500 transition-colors">
                                <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg>
                              </button>
                              {/* Edit */}
                              {canEdit && (
                                <button title="Edit Risiko" onClick={() => setEditRiskId(r.id)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-amber-50 hover:border-amber-200 text-gray-400 hover:text-amber-500 transition-colors">
                                  <svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg>
                                </button>
                              )}
                              {/* Usulkan ke PKPT — risiko (terutama residual) yang belum masuk program */}
                              {canEdit && !pkptData.some(p => p.riskId === r.id) && (
                                <button title="Usulkan ke PKPT" onClick={() => setUsulRisk({ id: r.id, unit: r.unit, kategori: r.kategori })}
                                  className={`h-7 px-2 flex items-center rounded-lg border text-[9px] font-bold whitespace-nowrap transition-colors ${levelRes !== "Rendah" || r.id.startsWith("RES") || r.uraian.startsWith("Residual") ? "border-teal-300 text-teal-700 bg-teal-50 hover:bg-teal-100" : "border-gray-200 text-gray-500 hover:bg-gray-50"}`}>
                                  Usulkan ke PKPT
                                </button>
                              )}
                              {/* Hapus */}
                              {canEdit && (
                                <AksiBtn kind="hapus" title="Hapus Risiko" onClick={() => setPendingDelete({ msg: `Hapus risiko "${r.id} — ${r.uraian.slice(0,40)}"?`, fn: () => setRiskData(prev => prev.filter(x => x.id !== r.id)) })} />
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Detail Popup */}
            {detailRisk && (() => {
              const skor    = detailRisk.kemungkinan * detailRisk.dampak;
              const level   = riskLevel(detailRisk.kemungkinan, detailRisk.dampak);
              const lc      = levelColor(level);
              const skorRes = detailRisk.kemungkinanResidual * detailRisk.dampakResidual;
              const levelRes= riskLevel(detailRisk.kemungkinanResidual, detailRisk.dampakResidual);
              const lcRes   = levelColor(levelRes);
              const efektivitasColor = detailRisk.efektivitas === "Efektif" ? "bg-green-50 text-green-600" : detailRisk.efektivitas === "Cukup" ? "bg-amber-50 text-amber-600" : "bg-red-50 text-red-600";
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setRrDetailId(null)}>
                  <div role="dialog" aria-modal="true" className="bg-white w-full max-w-xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl flex flex-col"
                    onClick={e => e.stopPropagation()}>
                    {/* Popup header */}
                    <div className="flex items-start justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0" style={{ background: lc.dot + "18" }}>
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono text-[10px] font-bold text-gray-500">{detailRisk.id}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${lc.bg} ${lc.text}`}>{level}</span>
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusColor(detailRisk.status)}`}>{detailRisk.status}</span>
                        </div>
                        <div className="text-sm font-bold text-gray-800 leading-snug max-w-xs">{detailRisk.uraian}</div>
                        <div className="text-[10px] text-gray-500 mt-1">{detailRisk.unit} · {detailRisk.kategori} · {detailRisk.periode}</div>
                      </div>
                      <button onClick={() => setRrDetailId(null)} className="text-gray-400 hover:text-gray-600 text-xl flex-shrink-0 ml-3">✕</button>
                    </div>

                    <div className="flex-1 overflow-y-auto p-5 flex flex-col gap-5">
                      {/* Skor perbandingan */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Profil Risiko</div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className={`rounded-xl p-3 border ${lc.bg}`} style={{ borderColor: lc.dot + "40" }}>
                            <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: lc.dot }}>Risiko Awal</div>
                            <div className="text-2xl font-black" style={{ color: lc.dot }}>{skor}</div>
                            <div className="text-[9px] text-gray-600 mt-0.5">K:{detailRisk.kemungkinan} × D:{detailRisk.dampak} · {level}</div>
                          </div>
                          <div className={`rounded-xl p-3 border ${lcRes.bg}`} style={{ borderColor: lcRes.dot + "40" }}>
                            <div className="text-[8px] font-bold uppercase tracking-wider mb-1" style={{ color: lcRes.dot }}>Risiko Residual</div>
                            <div className="text-2xl font-black" style={{ color: lcRes.dot }}>{skorRes}</div>
                            <div className="text-[9px] text-gray-600 mt-0.5">K:{detailRisk.kemungkinanResidual} × D:{detailRisk.dampakResidual} · {levelRes}</div>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-2">
                          <div className="text-[9px] text-gray-500">Penurunan skor:</div>
                          <div className="font-bold text-[10px] text-green-600">−{skor - skorRes} poin ({Math.round((1 - skorRes/skor)*100)}%)</div>
                        </div>
                      </div>

                      {/* Identifikasi */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Identifikasi Risiko</div>
                        <div className="flex flex-col gap-2">
                          <div className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                            <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1">Penyebab Risiko</div>
                            <div className="text-[10px] text-gray-700 leading-relaxed">{detailRisk.penyebab}</div>
                          </div>
                          <div className="rounded-xl p-3 bg-red-50 border border-red-100">
                            <div className="text-[8px] font-bold uppercase tracking-wider text-red-400 mb-1">Dampak Potensial</div>
                            <div className="text-[10px] text-gray-700 leading-relaxed">{detailRisk.dampakDesc}</div>
                          </div>
                        </div>
                      </div>

                      {/* Pengendalian */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Pengendalian & Mitigasi</div>
                        <div className="flex flex-col gap-2">
                          <div className="rounded-xl p-3 bg-teal-50 border border-teal-100">
                            <div className="flex items-center justify-between mb-1">
                              <div className="text-[8px] font-bold uppercase tracking-wider text-teal-600">Pengendalian Saat Ini</div>
                              <span className={`text-[8px] font-bold px-2 py-0.5 rounded-full ${efektivitasColor}`}>{detailRisk.efektivitas}</span>
                            </div>
                            <div className="text-[10px] text-gray-700 leading-relaxed">{detailRisk.pengendalian}</div>
                          </div>
                          <div className="rounded-xl p-3 bg-blue-50 border border-blue-100">
                            <div className="text-[8px] font-bold uppercase tracking-wider text-blue-600 mb-1">Rencana Mitigasi</div>
                            <div className="text-[10px] text-gray-700 leading-relaxed">{detailRisk.rencanamitigasi}</div>
                          </div>
                        </div>
                      </div>

                      {/* Monitoring SPI */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Monitoring SPI</div>
                        <div className="rounded-xl border border-gray-100 overflow-hidden">
                          <div className="px-4 py-3 bg-gray-50 flex items-center gap-4 flex-wrap">
                            <div>
                              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">PIC</div>
                              <div className="text-[10px] font-semibold text-gray-700">{detailRisk.pic}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Target</div>
                              <div className="text-[10px] font-semibold text-gray-700">{detailRisk.target}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Review Terakhir</div>
                              <div className="text-[10px] font-semibold text-gray-700">{detailRisk.tanggalReview}</div>
                            </div>
                            <div>
                              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Progress</div>
                              <div className="text-[10px] font-bold" style={{ color: "var(--tsu-teal)" }}>{detailRisk.progress}%</div>
                            </div>
                          </div>
                          {detailRisk.progress > 0 && (
                            <div className="px-4 py-2 border-t border-gray-100">
                              <div className="w-full h-2 bg-gray-100 rounded-full overflow-hidden">
                                <div className="h-2 rounded-full transition-all" style={{ width: `${detailRisk.progress}%`, background: detailRisk.status === "Selesai" ? "#22c55e" : detailRisk.status === "Terlambat" ? "#ef4444" : "var(--tsu-teal)" }} />
                              </div>
                            </div>
                          )}
                          <div className="px-4 py-3 border-t border-gray-100">
                            <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider mb-1">Catatan SPI</div>
                            <div className="text-[10px] text-gray-600 leading-relaxed">{detailRisk.catatanSPI}</div>
                          </div>
                          {detailRisk.buktiPengendalian && (
                            <div className="px-4 py-3 border-t border-gray-100 flex items-center justify-between">
                              <div className="text-[8px] font-bold text-gray-400 uppercase tracking-wider">Bukti Pengendalian</div>
                              <AksiBtn kind="link" title="Buka Bukti Pengendalian" href={detailRisk.buktiPengendalian} />
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Riwayat tindak lanjut */}
                      <div>
                        <div className="text-[9px] font-bold uppercase tracking-wider text-gray-400 mb-2">Riwayat Tindak Lanjut</div>
                        <div className="relative pl-4">
                          <div className="absolute left-1 top-2 bottom-2 w-px bg-gray-200" />
                          <div className="flex flex-col gap-3">
                            {detailRisk.riwayat.map((h, i) => (
                              <div key={i} className="relative">
                                <div className="absolute -left-4 top-1.5 w-2 h-2 rounded-full border-2 border-gray-300 bg-white" style={i === 0 ? { borderColor: "var(--tsu-teal)", background: "var(--tsu-teal)" } : {}} />
                                <div className="rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="text-[9px] font-bold text-gray-600">{h.tgl}</span>
                                    <span className="text-[9px] text-gray-400">{h.pic}</span>
                                  </div>
                                  <div className="text-[10px] text-gray-600 leading-relaxed">{h.catatan}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}
      {editUniverse !== null && (() => {
        const u = universeData.find(x => x.no === editUniverse);
        if (!u) return null;
        return (
          <TambahFormModal key={u.no} title="Edit Unit Audit Universe"
            initial={{ unit: u.unit, kategori: u.kategori, terakhir: u.terakhir, frekuensi: u.frekuensi, risiko: u.risiko, status: u.status }}
            fields={[
              { key:"unit",      label:"Nama Unit Kerja",   type:"text" },
              { key:"kategori",  label:"Kategori",          type:"select", options:["Layanan Akademik","Penelitian","Infrastruktur","Keuangan","Promosi","Akademik","Layanan Mhs"] },
              { key:"terakhir",  label:"Terakhir Diaudit",  type:"text", placeholder:"Mei 2025", required:false },
              { key:"frekuensi", label:"Frekuensi Audit",   type:"select", options:["Tahunan","Semesteran","2 Tahunan"] },
              { key:"risiko",    label:"Tingkat Risiko",    type:"select", options:["Tinggi","Sedang","Rendah"] },
              { key:"status",    label:"Status",            type:"select", options:["Aktif","Tidak Aktif"] },
            ]}
            onSave={v => setUniverseData(prev => prev.map(x => x.no === u.no ? { ...x, unit: v.unit || x.unit, kategori: v.kategori || x.kategori, terakhir: v.terakhir || "-", frekuensi: v.frekuensi || x.frekuensi, risiko: v.risiko || x.risiko, status: v.status || x.status } : x))}
            onClose={() => setEditUniverse(null)} />
        );
      })()}
      {editPkpt !== null && (() => {
        const p = pkptData.find(x => x.no === editPkpt);
        if (!p) return null;
        return (
          <TambahFormModal key={p.no} title={`Edit Program Audit${p.approval === "Revisi" ? " (Revisi)" : ""}`}
            initial={{ program: p.program, unit: p.unit, periode: p.periode, ketua: p.ketua, anggaran: String(p.anggaran) }}
            fields={[
              { key:"program",  label:"Nama Program Audit", type:"text" },
              { key:"unit",     label:"Unit Kerja",          type:"select", options:UNIT_KERJA_LIST },
              { key:"periode",  label:"Periode",             type:"text", placeholder:"Q1 2025" },
              { key:"ketua",    label:"Ketua Tim Auditor",   type:"text" },
              { key:"anggaran", label:"Anggaran (Rp Jt)",    type:"text", placeholder:"0.0" },
            ]}
            onSave={v => setPkptData(prev => prev.map(x => x.no === p.no ? { ...x, program: v.program || x.program, unit: v.unit || x.unit, periode: v.periode || x.periode, ketua: v.ketua || x.ketua, anggaran: parseFloat(v.anggaran) || 0 } : x))}
            onClose={() => setEditPkpt(null)} />
        );
      })()}
      {detailPkpt !== null && (() => {
        const p = pkptData.find(x => x.no === detailPkpt);
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setDetailPkpt(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="text-sm font-bold text-gray-800">Detail Program Audit</div>
                <button onClick={() => setDetailPkpt(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div className="text-sm font-bold text-gray-800 leading-snug">{p.program}</div>
                <div className="grid grid-cols-2 gap-2">
                  {[["Unit Sasaran", p.unit], ["Periode", p.periode], ["Auditor Ketua", p.ketua], ["Anggaran", `Rp ${p.anggaran.toFixed(1)} Jt`], ["Sumber Risiko", p.riskId ?? "—"], ["Rencana Audit", pkptTahap(p).label]].map(([k, v]) => (
                    <div key={k} className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                      <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1">{k}</div>
                      <div className="text-xs font-semibold text-gray-700">{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Status Persetujuan</div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${PKPT_APPROVAL_STYLE[p.approval].cls}`}>{PKPT_APPROVAL_STYLE[p.approval].label}</span>
                  {p.catatanKetua && <div className="mt-2 rounded-xl p-3 bg-red-50 border border-red-100 text-[10px] text-red-700 leading-relaxed"><span className="font-bold">Catatan Ketua:</span> {p.catatanKetua}</div>}
                </div>
              </div>
            </div>
          </div>
        );
      })()}
      {editRiskId !== null && (() => {
        const r = riskData.find(x => x.id === editRiskId);
        if (!r) return null;
        const skala = (v: string, d: number) => Math.min(5, Math.max(1, parseInt(v) || d));
        return (
          <TambahFormModal key={r.id} title={`Edit Risiko ${r.id}`}
            initial={{
              unit: r.unit, uraian: r.uraian, kategori: r.kategori, penyebab: r.penyebab, dampakDesc: r.dampakDesc,
              kemungkinan: String(r.kemungkinan), dampak: String(r.dampak),
              pengendalian: r.pengendalian, efektivitas: r.efektivitas,
              kemungkinanResidual: String(r.kemungkinanResidual), dampakResidual: String(r.dampakResidual),
              rencanamitigasi: r.rencanamitigasi, pic: r.pic, target: r.target, periode: r.periode,
              status: r.status, progress: String(r.progress), catatanSPI: r.catatanSPI, buktiPengendalian: r.buktiPengendalian ?? "",
            }}
            fields={[
              { key:"unit",                label:"Unit / Bagian",              type:"select", options:["BAAK","BAKPU","BAUK","Sarpras","SDM","LPPM","LPM","Marcomm","Fak. Teknik","Fak. Sains & Hum.","Fak. Vokasi","SPI","TI/Sistem"] },
              { key:"uraian",              label:"Uraian Risiko",              type:"textarea" },
              { key:"kategori",            label:"Kategori",                   type:"select", options:["Keuangan","Aset","Kepatuhan","Operasional","Teknologi"] },
              { key:"penyebab",            label:"Penyebab",                   type:"textarea", required:false },
              { key:"dampakDesc",          label:"Uraian Dampak",              type:"textarea", required:false },
              { key:"kemungkinan",         label:"Kemungkinan Awal (1–5)",     type:"select", options:["1","2","3","4","5"] },
              { key:"dampak",              label:"Dampak Awal (1–5)",          type:"select", options:["1","2","3","4","5"] },
              { key:"pengendalian",        label:"Pengendalian yang Ada",      type:"textarea", required:false },
              { key:"efektivitas",         label:"Efektivitas Pengendalian",   type:"select", options:["Efektif","Cukup","Kurang"] },
              { key:"kemungkinanResidual", label:"Kemungkinan Residual (1–5)", type:"select", options:["1","2","3","4","5"] },
              { key:"dampakResidual",      label:"Dampak Residual (1–5)",      type:"select", options:["1","2","3","4","5"] },
              { key:"rencanamitigasi",     label:"Rencana Mitigasi",           type:"textarea", required:false },
              { key:"pic",                 label:"PIC",                        type:"select", options:["Budi Santoso","Ratna Dewi","Andi Prasetyo","Siti Aisyah"] },
              { key:"target",              label:"Target Penyelesaian",        type:"text", placeholder:"Des 2025" },
              { key:"periode",             label:"Periode",                    type:"text", placeholder:"Q2 2025" },
              { key:"status",              label:"Status",                     type:"select", options:["Belum Ditindaklanjuti","Proses","Terlambat","Selesai"] },
              { key:"progress",            label:"Progress (%)",               type:"text", placeholder:"0–100" },
              { key:"catatanSPI",          label:"Catatan SPI",                type:"textarea", required:false },
              { key:"buktiPengendalian",   label:"Link Bukti Pengendalian (Google Drive)", type:"url", required:false },
            ]}
            onSave={v => setRiskData(prev => prev.map(x => x.id !== r.id ? x : {
              ...x,
              unit: v.unit || x.unit, uraian: v.uraian || x.uraian, kategori: v.kategori || x.kategori,
              penyebab: v.penyebab ?? x.penyebab, dampakDesc: v.dampakDesc ?? x.dampakDesc,
              kemungkinan: skala(v.kemungkinan, x.kemungkinan), dampak: skala(v.dampak, x.dampak),
              pengendalian: v.pengendalian ?? x.pengendalian, efektivitas: v.efektivitas || x.efektivitas,
              kemungkinanResidual: skala(v.kemungkinanResidual, x.kemungkinanResidual), dampakResidual: skala(v.dampakResidual, x.dampakResidual),
              rencanamitigasi: v.rencanamitigasi ?? x.rencanamitigasi, pic: v.pic || x.pic, target: v.target || x.target,
              periode: v.periode || x.periode, status: v.status || x.status,
              progress: Math.min(100, Math.max(0, parseInt(v.progress) || 0)),
              catatanSPI: v.catatanSPI ?? x.catatanSPI, buktiPengendalian: v.buktiPengendalian?.trim() || null,
            }))}
            onClose={() => setEditRiskId(null)} />
        );
      })()}
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
      {(tambahModal === "Tambah Program Audit" || usulRisk) && (
        <TambahFormModal key={usulRisk?.id ?? "baru"} title={usulRisk ? `Usulkan ${usulRisk.id} ke PKPT` : "Tambah Program Audit"}
          initial={usulRisk ? { unit: UNIT_KERJA_LIST.includes(usulRisk.unit) ? usulRisk.unit : "", program: `Audit ${usulRisk.kategori} ${usulRisk.unit}` } : undefined}
          fields={[
          { key:"program",  label:"Nama Program Audit", type:"text" },
          { key:"unit",     label:"Unit Kerja",          type:"select", options:UNIT_KERJA_LIST },
          { key:"periode",  label:"Periode",             type:"text",   placeholder:"Q1 2025" },
          { key:"ketua",    label:"Ketua Tim Auditor",   type:"select", options:["Budi Santoso","Ratna Dewi","Andi Prasetyo","Siti Aisyah"] },
          { key:"anggaran", label:"Anggaran (Rp Jt)",    type:"text",   placeholder:"0.0" },
        ]}
        onSave={(v) => {
          const no = Math.max(0, ...pkptData.map(x => x.no)) + 1;
          setPkptData(prev => [{ no, program: v.program || "-", unit: v.unit || "-", periode: v.periode || "-", ketua: v.ketua || "-", anggaran: parseFloat(v.anggaran) || 0, approval: "Draft", riskId: usulRisk?.id }, ...prev]);
          if (usulRisk) setRiskData(prev => prev.map(x => x.id !== usulRisk.id ? x : { ...x, riwayat: [{ tgl: RTL_TODAY_LABEL, catatan: `Diusulkan ke PKPT #${no} (Draft) untuk telaah program.`, pic: user?.name ?? "Back Office" }, ...x.riwayat] }));
        }}
        onClose={() => { setTambahModal(null); setUsulRisk(null); }} />
      )}
      {revisiPkpt !== null && (() => {
        const p = pkptData.find(x => x.no === revisiPkpt);
        if (!p) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setRevisiPkpt(null)}>
            <div role="dialog" aria-modal="true" className="bg-white rounded-2xl shadow-2xl w-full max-w-md p-5 flex flex-col gap-3" onClick={e => e.stopPropagation()}>
              <div>
                <div className="text-sm font-black text-gray-800">Kembalikan PKPT untuk Revisi</div>
                <p className="text-[10px] text-gray-400 mt-0.5">#{p.no} — {p.program} ({p.unit}) · Rp {p.anggaran.toFixed(1)} Jt</p>
              </div>
              <label className="flex flex-col gap-1">
                <span className="text-[10px] font-bold text-gray-500">Catatan Ketua <span className="text-red-500">*</span></span>
                <textarea value={revisiCatatan} onChange={e => setRevisiCatatan(e.target.value)} rows={4} autoFocus
                  placeholder="Contoh: persempit ruang lingkup, sesuaikan anggaran, ganti periode…"
                  className="border border-gray-200 rounded-lg px-3 py-2 text-xs focus:outline-none focus:border-teal-400 resize-none" />
              </label>
              <div className="flex justify-end gap-2">
                <button onClick={() => setRevisiPkpt(null)} className="text-xs font-semibold px-4 py-2 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
                <button disabled={!revisiCatatan.trim()}
                  onClick={() => {
                    const catatan = revisiCatatan.trim();
                    setPkptData(prev => prev.map(x => x.no === p.no ? { ...x, approval: "Revisi", catatanKetua: catatan } : x));
                    notify({ title: `PKPT #${p.no} perlu revisi`, body: `${p.program}: ${catatan}`, tag: "Audit", roles: ["backoffice"] });
                    setRevisiPkpt(null);
                  }}
                  className="text-xs font-bold px-4 py-2 rounded-lg text-white disabled:opacity-40" style={{ background: "#dc2626" }}>Kirim Revisi</button>
              </div>
            </div>
          </div>
        );
      })()}
      {tambahModal === "Tambah Risiko" && (
        <TambahFormModal title="Tambah Risiko" fields={[
          { key:"id",                   label:"ID Risiko",                       type:"text",     placeholder:"RSK-008" },
          { key:"unit",                 label:"Unit / Bagian",                   type:"select",   options:["BAAK","BAKPU","BAUK","Sarpras","SDM","LPPM","LPM","Marcomm","Fak. Teknik","Fak. Sains & Hum.","Fak. Vokasi","SPI","TI/Sistem"] },
          { key:"uraian",               label:"Uraian Risiko",                   type:"textarea" },
          { key:"kategori",             label:"Kategori",                        type:"select",   options:["Keuangan","Aset","Kepatuhan","Operasional","Teknologi"] },
          { key:"kemungkinan",          label:"Kemungkinan Awal (1–5)",          type:"text",     placeholder:"1" },
          { key:"dampak",               label:"Dampak Awal (1–5)",               type:"text",     placeholder:"1" },
          { key:"pengendalian",         label:"Pengendalian yang Ada",           type:"text" },
          { key:"kemungkinanResidual",  label:"Kemungkinan Residual (1–5)",      type:"text",     placeholder:"1" },
          { key:"dampakResidual",       label:"Dampak Residual (1–5)",           type:"text",     placeholder:"1" },
          { key:"pic",                  label:"PIC",                             type:"select",   options:["Budi Santoso","Ratna Dewi","Andi Prasetyo","Siti Aisyah"] },
          { key:"target",               label:"Target Penyelesaian",             type:"text",     placeholder:"Des 2025" },
          { key:"periode",              label:"Periode",                         type:"text",     placeholder:"Q2 2025" },
        ]}
        onSave={(v) => setRiskData(prev => [{
          no: prev.length + 1,
          id: v.id || `RSK-${String(prev.length + 1).padStart(3,"0")}`,
          unit: v.unit || "-",
          uraian: v.uraian || "-",
          penyebab: "—",
          dampakDesc: "—",
          kategori: v.kategori || "-",
          kemungkinan: Math.min(5, Math.max(1, parseInt(v.kemungkinan) || 1)),
          dampak: Math.min(5, Math.max(1, parseInt(v.dampak) || 1)),
          pengendalian: v.pengendalian || "-",
          efektivitas: "Cukup",
          kemungkinanResidual: Math.min(5, Math.max(1, parseInt(v.kemungkinanResidual) || 1)),
          dampakResidual: Math.min(5, Math.max(1, parseInt(v.dampakResidual) || 1)),
          rencanamitigasi: "—",
          pic: v.pic || "-",
          target: v.target || "-",
          periode: v.periode || "-",
          status: "Belum Ditindaklanjuti",
          progress: 0,
          tanggalReview: "—",
          catatanSPI: "—",
          buktiPengendalian: null,
          riwayat: [],
        }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {pendingDelete && (
        <ConfirmModal
          message={pendingDelete.msg}
          confirmLabel={pendingDelete.confirmLabel}
          onConfirm={() => { pendingDelete.fn(); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
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
  const [pendingBatal, setPendingBatal] = useState<{ msg: string; fn: () => void } | null>(null);
  const [detailPelatihan, setDetailPelatihan] = useState<number | null>(null);
  const [editPelatihan, setEditPelatihan] = useState<number | null>(null);

  const [auditorList, setAuditorList] = useState([
    { nama: "Budi Santoso, S.E.",   inisial: "BS", jabatan: "Auditor Madya",  sertif: "CIA, CISA", diperbarui: "Jan 2025", status: "Aktif"  },
    { nama: "Ratna Dewi, M.Ak.",    inisial: "RD", jabatan: "Auditor Muda",   sertif: "CPA",       diperbarui: "Feb 2025", status: "Aktif"  },
    { nama: "Andi Prasetyo, S.Kom.",inisial: "AP", jabatan: "Auditor Muda",   sertif: "CISA",      diperbarui: "Mar 2025", status: "Aktif"  },
    { nama: "Siti Aisyah, S.E.",    inisial: "SA", jabatan: "Auditor Pertama",sertif: "—",         diperbarui: "Apr 2025", status: "Proses" },
  ]);

  // Riwayat Penugasan diturunkan dari tim pada Rencana Audit (anggota pertama = Ketua Tim)
  const { rencanaList, laporanList } = useContext(AuditCtx);
  const { pkptList } = useContext(PkptCtx);
  const { penutupan } = useContext(LapanganCtx);
  const NAMA_AUDITOR: Record<string, string> = { "Budi S.": "Budi Santoso", "Ratna D.": "Ratna Dewi", "Andi P.": "Andi Prasetyo", "Siti A.": "Siti Aisyah" };
  const penugasanData = rencanaList.flatMap(r => {
    const selesai = penutupan[r.no]?.status === "Close" || laporanList.some(l => l.auditNo === r.no && l.status === "Diterima");
    const status = selesai ? "Selesai" : r.status === "Disetujui" ? "Berjalan" : "Rencana";
    const program = pkptList.find(p => p.no === r.pkptNo)?.program ?? `Audit ${r.jenis} ${r.unit}`;
    return r.tim.split(",").map(t => t.trim()).filter(Boolean).map((t, i) => ({
      auditor: NAMA_AUDITOR[t] ?? t, auditNo: r.no, program, unit: r.unit, peran: i === 0 ? "Ketua Tim" : "Anggota", periode: r.tglMulai, status,
    }));
  }).map((p, i) => ({ no: i + 1, ...p }));

  const [pelatihanData, setPelatihanData] = useState([
    { no: 1, judul: "Workshop Audit Berbasis Risiko", peserta: "Budi, Ratna",    tgl: "10 Jun 2025", penyelenggara: "BPKP Pusat",   anggaran: 4.5, status: "Terdaftar", link: null as string | null },
    { no: 2, judul: "Pelatihan CISA Online",          peserta: "Siti Aisyah",    tgl: "15 Jul 2025", penyelenggara: "ISACA",         anggaran: 8.0, status: "Terdaftar" },
    { no: 3, judul: "Seminar Standar Audit 2025",     peserta: "Semua Auditor",  tgl: "2 Agt 2025",  penyelenggara: "IAPI",          anggaran: 6.5, status: "Terdaftar" },
    { no: 4, judul: "Diklat Auditor Madya",           peserta: "Budi Santoso",   tgl: "Sep 2025",    penyelenggara: "BPKP",          anggaran: 12.0,status: "Rencana"   },
    { no: 5, judul: "Workshop Forensik Audit",        peserta: "Ratna, Andi",    tgl: "Okt 2025",    penyelenggara: "IIA Indonesia",  anggaran: 5.0, status: "Rencana"   },
    { no: 6, judul: "Pelatihan GRC Internal",         peserta: "Semua Auditor",  tgl: "Nov 2025",    penyelenggara: "Internal SPI",  anggaran: 2.5, status: "Selesai"   },
  ]);

  const pelatihanBadge = (st: string) =>
    st === "Selesai" ? "bg-green-50 text-green-600" : st === "Terdaftar" ? "bg-blue-50 text-blue-600" : st === "Dibatalkan" ? "bg-red-50 text-red-500" : "bg-gray-100 text-gray-500";

  const auditorNames = ["Semua", ...Array.from(new Set(penugasanData.map(p => p.auditor)))];
  const filteredPenugasan = filterAuditor === "Semua" ? penugasanData : penugasanData.filter(p => p.auditor === filterAuditor);

  // Opsi C: skor kompetensi (1–5) per domain, diinput Kepala SPI di modal Detail/Evaluasi Auditor.
  // Backend: tabel `auditor_competencies` (auditor_id → users, domain, skor, dinilai_oleh, tgl_penilaian).
  const kompetensiDomains = sdmRadarAuditors.map(r => r.subject);
  const canEvaluate = user?.role === "full";
  const [kompetensi, setKompetensi] = useState<Record<string, { skor: number[]; dinilai: string; catatan: string }>>(() => {
    const seed: Record<string, string> = { BS: "Budi", RD: "Ratna", AP: "Andi", SA: "Siti" };
    return Object.fromEntries(Object.entries(seed).map(([ini, k]) => [ini, {
      skor: sdmRadarAuditors.map(r => r[k as "Budi"] as number),
      dinilai: "Jan 2025",
      catatan: "",
    }]));
  });
  const [detailAuditor, setDetailAuditor] = useState<string | null>(null);
  const [draftSkor, setDraftSkor] = useState<number[]>([]);
  const [draftCatatan, setDraftCatatan] = useState("");
  const [draftProfil, setDraftProfil] = useState({ nama: "", jabatan: "", sertif: "", status: "" });
  const openDetail = (ini: string) => {
    const k = kompetensi[ini];
    const a = auditorList.find(x => x.inisial === ini);
    if (a) setDraftProfil({ nama: a.nama, jabatan: a.jabatan, sertif: a.sertif, status: a.status });
    setDraftSkor(k ? [...k.skor] : kompetensiDomains.map(() => 0));
    setDraftCatatan(k?.catatan ?? "");
    setDetailAuditor(ini);
  };
  const saveEvaluasi = () => {
    if (!detailAuditor) return;
    const now = new Date().toLocaleDateString("id-ID", { month: "short", year: "numeric" });
    setAuditorList(prev => prev.map(a => a.inisial !== detailAuditor ? a : {
      ...a, nama: draftProfil.nama.trim() || a.nama, jabatan: draftProfil.jabatan || a.jabatan,
      sertif: draftProfil.sertif.trim() || "—", status: draftProfil.status || a.status, diperbarui: now,
    }));
    if (canEvaluate) setKompetensi(prev => ({ ...prev, [detailAuditor]: { skor: draftSkor, dinilai: now, catatan: draftCatatan } }));
    setDetailAuditor(null);
  };

  const auditors = auditorList.map(a => {
    const parts = a.nama.split(",")[0].trim().split(/\s+/);
    return { key: a.inisial, label: parts[0] + (parts[1] ? ` ${parts[1][0]}.` : "") };
  });
  const cellStyle = (v: number) => v >= 4 ? { bg: "#dcfce7", text: "#166534" } : v >= 2 ? { bg: "#fef9c3", text: "#854d0e" } : { bg: "#fee2e2", text: "#991b1b" };

  return (
    <div className="flex flex-col gap-4">
      {/* Kompetensi Auditor */}
      {active === "Kompetensi Auditor" && (
        <div className="flex flex-col gap-4">
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold text-gray-700">Matriks Kompetensi Auditor</h4>
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
            {kompetensiDomains.map((subject, di) => (
              <div key={subject} className="flex items-center gap-1 mb-1">
                <span className="text-[10px] text-gray-600 w-36 flex-shrink-0">{subject}</span>
                {auditors.map(a => {
                  const v = kompetensi[a.key]?.skor[di] ?? 0;
                  if (!v) return <div key={a.key} className="flex-1 h-8 rounded-lg flex items-center justify-center font-black text-sm bg-gray-50 text-gray-300" title="Belum dinilai">—</div>;
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
                        {canEdit && <button title="Edit" onClick={() => openDetail(a.inisial)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg></button>}
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
            <div>
              <h4 className="text-xs font-bold text-gray-700">Riwayat Penugasan Auditor</h4>
              <p className="text-[10px] text-gray-400 mt-0.5">Diturunkan otomatis dari Tim Auditor pada Rencana Audit.</p>
            </div>
            <select value={filterAuditor} onChange={e => setFilterAuditor(e.target.value)}
              className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-600 focus:outline-none">
              {auditorNames.map(n => <option key={n}>{n}</option>)}
            </select>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["No","Nama Auditor","No PA","Program Audit","Unit Sasaran","Peran","Tgl Mulai","Status"].map(h=>(
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {filteredPenugasan.map(p => (
                  <tr key={p.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 text-[10px] text-gray-400">{p.no}</td>
                    <td className="py-2 pr-3 font-medium text-gray-700 whitespace-nowrap">{p.auditor}</td>
                    <td className="py-2 pr-3 font-mono text-[10px] text-gray-500 font-bold whitespace-nowrap">{p.auditNo}</td>
                    <td className="py-2 pr-3 text-gray-600">{p.program}</td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.unit}</td>
                    <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${p.peran === "Ketua Tim" ? "bg-purple-50 text-purple-600" : "bg-gray-100 text-gray-500"}`}>{p.peran}</span></td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.periode}</td>
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
              <p className="text-[10px] text-gray-400 mt-0.5">{pelatihanData.filter(t => t.status === "Terdaftar" || t.status === "Rencana").length} pelatihan mendatang</p>
            </div>
            {canEdit && <button onClick={() => setTambahModal("Daftarkan Pelatihan")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>+ Daftarkan Pelatihan</button>}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-gray-100">
                  {["Nama Pelatihan","Peserta","Tanggal","Status","Aksi"].map(h=>(
                    <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {pelatihanData.map(t => (
                  <tr key={t.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                    <td className="py-2 pr-3 max-w-[240px]">
                      <div className="font-medium text-gray-700 truncate" title={t.judul}>{t.judul}</div>
                      <div className="text-[9px] text-gray-400 mt-0.5">{t.penyelenggara}</div>
                    </td>
                    <td className="py-2 pr-3 text-gray-500 max-w-[140px] truncate">{t.peserta}</td>
                    <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{t.tgl}</td>
                    <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${pelatihanBadge(t.status)}`}>{t.status}</span></td>
                    <td className="py-2"><div className="flex gap-1">
                      <button title="Lihat Detail" onClick={() => setDetailPelatihan(t.no)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-blue-50 hover:border-blue-200 hover:text-blue-500"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 8s2.5-5 7-5 7 5 7 5-2.5 5-7 5-7-5-7-5z"/><circle cx="8" cy="8" r="2"/></svg></button>
                      {canEdit && <button title="Edit" onClick={() => setEditPelatihan(t.no)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg></button>}
                      {canEdit && (t.status === "Terdaftar" || t.status === "Rencana") && (
                        <button title="Batalkan Pelatihan" onClick={() => setPendingBatal({ msg: `Batalkan pelatihan "${t.judul}"?`, fn: () => setPelatihanData(prev => prev.map(x => x.no === t.no ? { ...x, status: "Dibatalkan" } : x)) })}
                          className="w-7 h-7 flex items-center justify-center rounded-lg border border-red-100 text-red-300 hover:bg-red-50 hover:text-red-500 transition-colors"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><line x1="4" y1="4" x2="12" y2="12"/><line x1="12" y1="4" x2="4" y2="12"/></svg></button>
                      )}
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
          { key:"jabatan", label:"Jabatan",               type:"select", options:["Auditor Madya","Auditor Muda","Auditor Pertama","Kepala SPI"] },
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
        onSave={(v) => setPelatihanData(prev => [{ no: Math.max(0, ...prev.map(x => x.no)) + 1, judul: v.judul || "-", peserta: v.peserta || "-", tgl: v.tgl || "-", penyelenggara: v.penyelenggara || "-", anggaran: parseFloat(v.anggaran) || 0, status: "Terdaftar", link: v.link?.trim() || null }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {editPelatihan !== null && (() => {
        const t = pelatihanData.find(x => x.no === editPelatihan);
        if (!t) return null;
        return (
          <TambahFormModal key={t.no} title="Edit Pelatihan"
            initial={{ judul: t.judul, peserta: t.peserta, tgl: t.tgl, penyelenggara: t.penyelenggara, anggaran: String(t.anggaran), status: t.status, link: t.link ?? "" }}
            fields={[
              { key:"judul",        label:"Judul Pelatihan / Seminar",  type:"text" },
              { key:"peserta",      label:"Peserta",                    type:"text", placeholder:"Nama auditor, pisahkan dengan koma" },
              { key:"tgl",          label:"Tanggal Pelaksanaan",        type:"text", placeholder:"Jun 2025" },
              { key:"penyelenggara",label:"Penyelenggara",              type:"text" },
              { key:"anggaran",     label:"Anggaran (Rp Jt)",           type:"text", placeholder:"0.0" },
              { key:"status",       label:"Status",                     type:"select", options:["Rencana","Terdaftar","Selesai","Dibatalkan"] },
              { key:"link",         label:"Link Info / Sertifikat (Google Drive)", type:"url", required:false },
            ]}
            onSave={v => setPelatihanData(prev => prev.map(x => x.no !== t.no ? x : {
              ...x, judul: v.judul || x.judul, peserta: v.peserta || x.peserta, tgl: v.tgl || x.tgl,
              penyelenggara: v.penyelenggara || x.penyelenggara, anggaran: parseFloat(v.anggaran) || 0,
              status: v.status || x.status, link: v.link?.trim() || null,
            }))}
            onClose={() => setEditPelatihan(null)} />
        );
      })()}
      {detailPelatihan !== null && (() => {
        const t = pelatihanData.find(x => x.no === detailPelatihan);
        if (!t) return null;
        const pesertaList = t.peserta === "Semua Auditor"
          ? auditorList.map(a => a.nama.split(",")[0])
          : t.peserta.split(",").map(x => x.trim()).filter(Boolean);
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.45)" }} onClick={() => setDetailPelatihan(null)}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="text-sm font-bold text-gray-800">Detail Pelatihan</div>
                <button onClick={() => setDetailPelatihan(null)} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
              </div>
              <div className="p-5 flex flex-col gap-3">
                <div>
                  <div className="text-sm font-bold text-gray-800 leading-snug">{t.judul}</div>
                  <span className={`inline-block mt-1.5 text-[9px] font-bold px-2 py-0.5 rounded-full ${pelatihanBadge(t.status)}`}>{t.status}</span>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  {[["Tanggal", t.tgl], ["Penyelenggara", t.penyelenggara], ["Anggaran", `Rp ${t.anggaran.toFixed(1)} Jt`], ["Jumlah Peserta", `${pesertaList.length} auditor`]].map(([k, v]) => (
                    <div key={k} className="rounded-xl p-3 bg-gray-50 border border-gray-100">
                      <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1">{k}</div>
                      <div className="text-xs font-semibold text-gray-700">{v}</div>
                    </div>
                  ))}
                </div>
                <div>
                  <div className="text-[8px] font-bold uppercase tracking-wider text-gray-400 mb-1.5">Peserta</div>
                  <div className="flex flex-wrap gap-1.5">
                    {pesertaList.map(p => <span key={p} className="text-[9px] font-medium px-2 py-0.5 rounded-full bg-purple-50 text-purple-700">{p}</span>)}
                  </div>
                </div>
                {t.link
                  ? <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50"><span className="text-[10px] text-gray-500">Info / Sertifikat</span><AksiBtn kind="link" title="Buka Info / Sertifikat" href={t.link} /></div>
                  : <div className="text-[9px] text-gray-400">Belum ada link info / sertifikat.</div>}
              </div>
            </div>
          </div>
        );
      })()}
      {pendingBatal && (
        <ConfirmModal message={pendingBatal.msg} confirmLabel="Ya, Batalkan"
          onConfirm={() => { pendingBatal.fn(); setPendingBatal(null); }}
          onCancel={() => setPendingBatal(null)} />
      )}
      {detailAuditor && (() => {
        const a = auditorList.find(x => x.inisial === detailAuditor);
        if (!a) return null;
        const k = kompetensi[detailAuditor];
        const filled = draftSkor.filter(v => v > 0);
        const avg = filled.length ? (filled.reduce((x, y) => x + y, 0) / filled.length).toFixed(1) : "—";
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={() => setDetailAuditor(null)}>
            <div className="bg-white rounded-xl shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-full bg-purple-100 text-purple-700 text-xs font-bold flex items-center justify-center">{a.inisial}</div>
                  <div>
                    <div className="text-sm font-bold text-gray-800">Edit Data Auditor</div>
                    <div className="text-[10px] text-gray-400">Profil, sertifikasi, dan evaluasi kompetensi</div>
                  </div>
                </div>
                <button onClick={() => setDetailAuditor(null)} className="text-gray-400 hover:text-gray-600 text-lg leading-none">×</button>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3 border-b border-gray-100">
                <h4 className="text-xs font-bold text-gray-700">Data Auditor</h4>
                <div className="grid grid-cols-2 gap-2">
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-gray-500">Nama Lengkap & Gelar</label>
                    <input value={draftProfil.nama} onChange={e => setDraftProfil(p => ({ ...p, nama: e.target.value }))}
                      className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400" />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Jabatan</label>
                    <select value={draftProfil.jabatan} onChange={e => setDraftProfil(p => ({ ...p, jabatan: e.target.value }))}
                      className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:border-teal-400">
                      {["Auditor Madya","Auditor Muda","Auditor Pertama","Kepala SPI"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500">Status</label>
                    <select value={draftProfil.status} onChange={e => setDraftProfil(p => ({ ...p, status: e.target.value }))}
                      className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-2 py-2 bg-white focus:outline-none focus:border-teal-400">
                      {["Aktif","Proses","Tidak Aktif"].map(o => <option key={o}>{o}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-gray-500">Sertifikasi</label>
                    <input value={draftProfil.sertif === "—" ? "" : draftProfil.sertif} onChange={e => setDraftProfil(p => ({ ...p, sertif: e.target.value }))}
                      placeholder="CIA, CISA, CPA..."
                      className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-teal-400" />
                  </div>
                </div>
              </div>
              <div className="px-5 py-4 flex flex-col gap-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-gray-700">{canEvaluate ? "Evaluasi Kompetensi" : "Skor Kompetensi"}</h4>
                  <span className="text-[10px] text-gray-400">Rata-rata <b className="text-gray-700">{avg}</b> / 5 · Dinilai {k?.dinilai ?? "—"}</span>
                </div>
                {kompetensiDomains.map((d, di) => {
                  const v = draftSkor[di] ?? 0;
                  return (
                    <div key={d} className="flex items-center gap-2">
                      <span className="text-[10px] text-gray-600 w-32 flex-shrink-0">{d}</span>
                      <div className="flex gap-1 flex-1">
                        {[1, 2, 3, 4, 5].map(n => {
                          const on = v >= n;
                          const s = cellStyle(v);
                          return (
                            <button key={n} type="button" disabled={!canEvaluate}
                              onClick={() => setDraftSkor(prev => prev.map((x, i) => i === di ? (x === n ? 0 : n) : x))}
                              className={`flex-1 h-7 rounded-md text-[10px] font-bold transition-colors ${canEvaluate ? "cursor-pointer hover:opacity-80" : "cursor-default"}`}
                              style={on ? { background: s.bg, color: s.text } : { background: "#f9fafb", color: "#d1d5db" }}>{n}</button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
                <div>
                  <label className="text-[10px] font-semibold text-gray-500">Catatan Evaluasi</label>
                  <textarea value={draftCatatan} onChange={e => setDraftCatatan(e.target.value)} disabled={!canEvaluate} rows={2}
                    placeholder={canEvaluate ? "Rekomendasi pengembangan / pelatihan…" : "—"}
                    className="mt-1 w-full text-xs border border-gray-200 rounded-lg px-3 py-2 focus:outline-none disabled:bg-gray-50 disabled:text-gray-500" />
                </div>
                {!canEvaluate && <p className="text-[9px] text-gray-400">Penilaian kompetensi hanya dapat diubah oleh Kepala SPI.</p>}
              </div>
              <div className="flex justify-end gap-2 px-5 py-3 border-t border-gray-100">
                <button onClick={() => setDetailAuditor(null)} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50">Batal</button>
                <button onClick={saveEvaluasi} disabled={!draftProfil.nama.trim()} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background: "var(--tsu-teal)" }}>Simpan Perubahan</button>
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── Regulasi & SOP (store bersama): dikelola Back Office, dibaca Auditor ─────
const PEDOMAN_AWAL = [
    { icon: "", judul: "Pedoman Audit Internal SPI",    deskripsi: "Panduan pelaksanaan audit internal sesuai standar AAIPI",         versi: "v3.1", berlaku: "Jan 2025", link: "https://drive.google.com/file/pedoman-audit-internal-spi", status: "Berlaku" },
    { icon: "", judul: "Kode Etik Auditor Internal",    deskripsi: "Prinsip dan aturan perilaku auditor internal universitas",        versi: "v2.0", berlaku: "Jan 2025", link: "https://drive.google.com/file/kode-etik-auditor", status: "Berlaku" },
    { icon: "", judul: "SOP Pelaksanaan Audit Kinerja", deskripsi: "Prosedur standar operasional audit kinerja unit kerja",           versi: "v1.5", berlaku: "Feb 2025", link: "https://drive.google.com/file/sop-audit-kinerja", status: "Berlaku" },
    { icon: "", judul: "SOP Audit Kepatuhan",           deskripsi: "Prosedur audit kepatuhan terhadap regulasi dan kebijakan",        versi: "v1.2", berlaku: "Feb 2025", link: "https://drive.google.com/file/sop-audit-kepatuhan", status: "Berlaku" },
    { icon: "", judul: "Panduan Kertas Kerja Audit",    deskripsi: "Format dan panduan pengisian kertas kerja audit (KKA)",           versi: "v2.3", berlaku: "Mar 2025", link: "https://drive.google.com/file/panduan-kka", status: "Berlaku" },
    { icon: "", judul: "Pedoman Audit Berbasis Risiko", deskripsi: "Kerangka audit berbasis risiko untuk perencanaan dan pelaksanaan", versi: "v1.0", berlaku: "Apr 2025", link: "https://drive.google.com/file/pedoman-audit-risiko", status: "Revisi" },
  ];
const PERATURAN_AWAL = [
    { nomor: "Peraturan Rektor No. 12/2024",    judul: "Tata Kelola Pengawasan Internal",        instansi: "Rektor",        terbit: "Des 2024", status: "Berlaku", link: "https://drive.google.com/file/peraturan-rektor-12-2024" as string | null },
    { nomor: "Permendikbud No. 63/2021",         judul: "Standar Nasional Pendidikan Tinggi",     instansi: "Kemdikbud",     terbit: "2021",     status: "Berlaku", link: "https://drive.google.com/file/permendikbud-63-2021" as string | null },
    { nomor: "Peraturan BPK No. 1/2017",         judul: "Standar Pemeriksaan Keuangan Negara",   instansi: "BPK RI",        terbit: "2017",     status: "Berlaku", link: "https://drive.google.com/file/peraturan-bpk-1-2017" as string | null },
    { nomor: "Permendagri No. 78/2012",          judul: "Tata Kearsipan di Lingkungan Kemendagri",instansi: "Kemendagri",    terbit: "2012",     status: "Berlaku", link: "https://drive.google.com/file/permendagri-78-2012" as string | null },
    { nomor: "Peraturan Rektor No. 5/2022",      judul: "Manajemen Risiko Universitas",           instansi: "Rektor",        terbit: "2022",     status: "Dicabut", link: null as string | null },
  ];
const STANDAR_AWAL = [
    { judul: "IPPF — International Professional Practices Framework", isi: "Kerangka praktik profesional internasional yang dikeluarkan IIA, mencakup standar, kode etik, dan panduan implementasi audit internal global.", link: "https://drive.google.com/file/ippf-framework" as string | null, status: "Berlaku" },
    { judul: "Standar Audit AAIPI 2023",                               isi: "Standar audit internal yang diterbitkan Asosiasi Auditor Internal Pemerintah Indonesia, wajib diterapkan oleh SPI perguruan tinggi negeri.",  link: "https://drive.google.com/file/standar-aaipi-2023" as string | null, status: "Berlaku" },
    { judul: "SPIP — Sistem Pengendalian Intern Pemerintah",           isi: "Kerangka pengendalian intern berdasarkan PP No. 60/2008 yang menjadi acuan tata kelola dan pengawasan di lingkungan instansi pemerintah.",  link: "https://drive.google.com/file/spip-pp-60-2008" as string | null, status: "Berlaku" },
    { judul: "IIA Standard 2100 — Nature of Work",                     isi: "Standar yang mengatur lingkup pekerjaan audit internal: evaluasi manajemen risiko, pengendalian, dan tata kelola organisasi.",                link: "https://drive.google.com/file/iia-standard-2100" as string | null, status: "Berlaku" },
    { judul: "SNI ISO 31000:2018 — Manajemen Risiko",                  isi: "Standar nasional Indonesia untuk manajemen risiko, memberikan panduan prinsip, kerangka kerja, dan proses manajemen risiko.",                link: "https://drive.google.com/file/sni-iso-31000-2018" as string | null, status: "Berlaku" },
    { judul: "COSO ERM Framework 2017",                                isi: "Kerangka manajemen risiko perusahaan dari Committee of Sponsoring Organizations yang mengintegrasikan strategi, kinerja, dan risiko.",         link: "https://drive.google.com/file/coso-erm-2017" as string | null, status: "Berlaku" },
  ];
type PedomanItem = typeof PEDOMAN_AWAL[number];
type PeraturanItem = typeof PERATURAN_AWAL[number];
type StandarItem = typeof STANDAR_AWAL[number];
interface RegulasiCtxType {
  pedomanBase: PedomanItem[]; setPedomanBase: React.Dispatch<React.SetStateAction<PedomanItem[]>>;
  peraturanBase: PeraturanItem[]; setPeraturanBase: React.Dispatch<React.SetStateAction<PeraturanItem[]>>;
  standarList: StandarItem[]; setStandarList: React.Dispatch<React.SetStateAction<StandarItem[]>>;
}
const RegulasiCtx = createContext<RegulasiCtxType>({
  pedomanBase: PEDOMAN_AWAL, setPedomanBase: () => {}, peraturanBase: PERATURAN_AWAL, setPeraturanBase: () => {}, standarList: STANDAR_AWAL, setStandarList: () => {},
});

// readOnly: tampilan Auditor (menu Regulasi & SOP di Modul Pengawasan) — hanya melihat & membuka dokumen
function SectionD({ subSection, readOnly = false }: { subSection: string; readOnly?: boolean }) {
  const active = subSection || "Pedoman Audit";
  const user = useContext(UserCtx);
  const canEdit = !readOnly && user?.role !== "rektor";
  const { pedomanBase, setPedomanBase, peraturanBase, setPeraturanBase, standarList, setStandarList } = useContext(RegulasiCtx);
  const [tambahModal, setTambahModal] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [searchPeraturan, setSearchPeraturan] = useState("");
  const [editPedoman, setEditPedoman] = useState<number | null>(null);
  const [editStandar, setEditStandar] = useState<number | null>(null);
  const [editPeraturan, setEditPeraturan] = useState<number | null>(null);
  const statusDokBadge = (st: string) =>
    st === "Berlaku" ? "bg-green-50 text-green-600" : st === "Revisi" ? "bg-amber-50 text-amber-600" : st === "Draft" ? "bg-gray-100 text-gray-500" : "bg-red-50 text-red-500";

  const pedomanList = pedomanBase.map((d, idx) => ({ ...d, idx })).filter(d => d.judul.toLowerCase().includes(search.toLowerCase()));

  const peraturanList = peraturanBase.map((d, idx) => ({ ...d, idx })).filter(d => {
    const q = searchPeraturan.trim().toLowerCase();
    return !q || [d.nomor, d.judul, d.instansi, d.terbit, d.status].some(f => f.toLowerCase().includes(q));
  });


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
                  <div className="flex gap-1.5 items-center">
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusDokBadge(d.status)}`}>{d.status}</span>
                    <span className="text-[9px] text-gray-400">{d.versi} · {d.berlaku}</span>
                  </div>
                  <div className="flex gap-1">
                    {d.link && d.link !== "#" ? <a href={d.link} target="_blank" rel="noreferrer" title="Buka Link" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l.9-.9"/></svg></a> : <span title="Belum ada link" className="w-7 h-7 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l.9-.9"/></svg></span>}
                    {canEdit && <button title="Edit" onClick={() => setEditPedoman(d.idx)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
          {/* Standar Referensi — merged from Standar Audit */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <div className="flex items-center justify-between mb-3">
              <div className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">Standar Referensi</div>
              {canEdit && <button onClick={() => setTambahModal("Tambah Standar")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-teal-200 text-teal-600 hover:bg-teal-50">+ Tambah Standar</button>}
            </div>
            <div className="flex flex-col gap-2">
              {standarList.map((s, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <div className="text-xs font-semibold text-gray-700 leading-tight">{s.judul}</div>
                      <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusDokBadge(s.status)}`}>{s.status}</span>
                    </div>
                    <div className="text-[9px] text-gray-400 mt-0.5 leading-relaxed line-clamp-2">{s.isi}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    {s.link ? <a href={s.link} target="_blank" rel="noreferrer" title="Buka Link" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l.9-.9"/></svg></a> : <span title="Belum ada link" className="w-7 h-7 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l.9-.9"/></svg></span>}
                    {canEdit && <button title="Edit" onClick={() => setEditStandar(i)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg></button>}
                  </div>
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
              {canEdit && <button onClick={() => setTambahModal("Tambah Peraturan")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white whitespace-nowrap" style={{ background: "var(--tsu-teal)" }}>+ Tambah Peraturan</button>}
            </div>
          </div>
          <input value={searchPeraturan} onChange={e => setSearchPeraturan(e.target.value)}
            placeholder="Cari nomor, judul, instansi, tahun, atau status..." className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs mb-3 focus:outline-none focus:border-teal-400" />
          {peraturanList.length === 0 && <div className="text-[10px] text-gray-400 text-center py-6">Tidak ada peraturan yang cocok.</div>}
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
                    <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${statusDokBadge(r.status)}`}>{r.status}</span>
                    {r.link ? <a href={r.link} target="_blank" rel="noreferrer" title="Buka Link" className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-teal-50 hover:border-teal-200 hover:text-teal-600"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l.9-.9"/></svg></a> : <span title="Belum ada link" className="w-7 h-7 flex items-center justify-center rounded-lg border border-dashed border-gray-200 text-gray-300"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M6.5 9.5a3 3 0 0 0 4.2 0l2.3-2.3a3 3 0 0 0-4.2-4.2l-.9.9"/><path d="M9.5 6.5a3 3 0 0 0-4.2 0L3 8.8A3 3 0 0 0 7.2 13l.9-.9"/></svg></span>}
                    {canEdit && <button title="Edit" onClick={() => setEditPeraturan(r.idx)} className="w-7 h-7 flex items-center justify-center rounded-lg border border-gray-200 text-gray-400 transition-colors hover:bg-amber-50 hover:border-amber-200 hover:text-amber-500"><svg viewBox="0 0 16 16" className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11.5 2.5l2 2-8 8H3.5v-2l8-8z"/></svg></button>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {tambahModal === "Tambah Standar" && (
        <TambahFormModal title="Tambah Standar Referensi" fields={[
          { key:"judul",  label:"Nama Standar",                  type:"text", placeholder:"mis. IIA Global Internal Audit Standards 2024" },
          { key:"isi",    label:"Ringkasan / Ruang Lingkup",     type:"textarea" },
          { key:"status", label:"Status",                        type:"select", options:["Berlaku","Revisi","Draft","Dicabut"] },
          { key:"link",   label:"Link Dokumen (Google Drive)",   type:"url", required:false },
        ]}
        onSave={(v) => setStandarList(prev => [...prev, { judul: v.judul || "-", isi: v.isi || "-", status: v.status || "Berlaku", link: v.link?.trim() || null }])}
        onClose={() => setTambahModal(null)} />
      )}
      {editPedoman !== null && pedomanBase[editPedoman] && (() => {
        const d = pedomanBase[editPedoman];
        return (
          <TambahFormModal key={editPedoman} title="Edit Pedoman / SOP"
            initial={{ judul: d.judul, deskripsi: d.deskripsi, versi: d.versi, berlaku: d.berlaku, status: d.status, link: d.link === "#" ? "" : d.link }}
            fields={[
              { key:"judul",    label:"Judul Pedoman / SOP",          type:"text" },
              { key:"deskripsi",label:"Deskripsi Singkat",             type:"textarea" },
              { key:"versi",    label:"Versi",                         type:"text", placeholder:"v1.0" },
              { key:"berlaku",  label:"Berlaku Sejak",                 type:"text", placeholder:"Jan 2025" },
              { key:"status",   label:"Status",                        type:"select", options:["Berlaku","Revisi","Draft","Dicabut"] },
              { key:"link",     label:"Link Dokumen (Google Drive)",   type:"url", required:false },
            ]}
            onSave={v => setPedomanBase(prev => prev.map((x, i) => i !== editPedoman ? x : {
              ...x, judul: v.judul || x.judul, deskripsi: v.deskripsi || x.deskripsi, versi: v.versi || x.versi,
              berlaku: v.berlaku || x.berlaku, status: v.status || x.status, link: v.link?.trim() || "#",
            }))}
            onClose={() => setEditPedoman(null)} />
        );
      })()}
      {editStandar !== null && standarList[editStandar] && (() => {
        const d = standarList[editStandar];
        return (
          <TambahFormModal key={editStandar} title="Edit Standar Referensi"
            initial={{ judul: d.judul, isi: d.isi, status: d.status, link: d.link ?? "" }}
            fields={[
              { key:"judul",  label:"Nama Standar",                  type:"text" },
              { key:"isi",    label:"Ringkasan / Ruang Lingkup",     type:"textarea" },
              { key:"status", label:"Status",                        type:"select", options:["Berlaku","Revisi","Draft","Dicabut"] },
              { key:"link",   label:"Link Dokumen (Google Drive)",   type:"url", required:false },
            ]}
            onSave={v => setStandarList(prev => prev.map((x, i) => i !== editStandar ? x : {
              ...x, judul: v.judul || x.judul, isi: v.isi || x.isi, status: v.status || x.status, link: v.link?.trim() || null,
            }))}
            onClose={() => setEditStandar(null)} />
        );
      })()}
      {editPeraturan !== null && peraturanBase[editPeraturan] && (() => {
        const d = peraturanBase[editPeraturan];
        return (
          <TambahFormModal key={editPeraturan} title="Edit Peraturan"
            initial={{ nomor: d.nomor, judul: d.judul, instansi: d.instansi, terbit: d.terbit, status: d.status, link: d.link ?? "" }}
            fields={[
              { key:"nomor",    label:"Nomor Peraturan",               type:"text" },
              { key:"judul",    label:"Judul",                         type:"text" },
              { key:"instansi", label:"Instansi Penerbit",             type:"text" },
              { key:"terbit",   label:"Tahun Terbit",                  type:"text" },
              { key:"status",   label:"Status",                        type:"select", options:["Berlaku","Revisi","Draft","Dicabut"] },
              { key:"link",     label:"Link Dokumen (Google Drive)",   type:"url", required:false },
            ]}
            onSave={v => setPeraturanBase(prev => prev.map((x, i) => i !== editPeraturan ? x : {
              ...x, nomor: v.nomor || x.nomor, judul: v.judul || x.judul, instansi: v.instansi || x.instansi,
              terbit: v.terbit || x.terbit, status: v.status || x.status, link: v.link?.trim() || null,
            }))}
            onClose={() => setEditPeraturan(null)} />
        );
      })()}
      {tambahModal === "Tambah Pedoman" && (
        <TambahFormModal title="Tambah Pedoman / SOP" fields={[
          { key:"judul",    label:"Judul Pedoman / SOP",          type:"text" },
          { key:"deskripsi",label:"Deskripsi Singkat",             type:"textarea" },
          { key:"versi",    label:"Versi",                         type:"text", placeholder:"v1.0" },
          { key:"berlaku",  label:"Berlaku Sejak",                 type:"text", placeholder:"Jan 2025" },
          { key:"status",   label:"Status",                        type:"select", options:["Berlaku","Revisi","Draft","Dicabut"] },
          { key:"link",     label:"Link Dokumen (Google Drive)",   type:"url" },
        ]}
        onSave={(v) => setPedomanBase(prev => [{ icon: "", judul: v.judul || "-", deskripsi: v.deskripsi || "-", versi: v.versi || "v1.0", berlaku: v.berlaku || "-", link: v.link || "#", status: v.status || "Berlaku" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Peraturan" && (
        <TambahFormModal title="Tambah Peraturan" fields={[
          { key:"nomor",    label:"Nomor Peraturan",               type:"text", placeholder:"Peraturan Rektor No. X/YYYY" },
          { key:"judul",    label:"Judul",                         type:"text" },
          { key:"instansi", label:"Instansi Penerbit",             type:"text" },
          { key:"terbit",   label:"Tahun Terbit",                  type:"text", placeholder:"2025" },
          { key:"status",   label:"Status",                        type:"select", options:["Berlaku","Revisi","Draft","Dicabut"] },
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
  const { rapatList, addRapat, batalkanRapat, selesaiRapat, updateRapat } = useContext(RapatCtx);
  const navigateTo = useContext(NavCtx);
  const { rtlList } = useContext(TemuanCtx);
  const [showRapatForm, setShowRapatForm] = useState(false);
  const [pendingSelesai, setPendingSelesai] = useState<{ msg: string; fn: () => void } | null>(null);
  const [pendingDelete, setPendingDelete] = useState<{ msg: string; fn: () => void } | null>(null);
  const today = 22;
  const days = Array.from({ length: 31 }, (_, i) => i + 1);
  const [doneIds, setDoneIds] = useState<number[]>([]);
  const [editRapatId, setEditRapatId] = useState<number | null>(null);
  const [detailRapatId, setDetailRapatId] = useState<number | null>(null);

  const rapatMendatang = rapatList.filter(r => r.status === "Terjadwal");

  const events: Record<number, { label: string; color: string }[]> = {
    26: [{ label: "Audit LPPM",     color: "bg-purple-500" }],
  };
  const rtlAktif = rtlList.filter(r => rtlTlStatus(r) !== "Close");
  rtlAktif.forEach(r => {
    const [d, m, y] = r.target.split(" ");
    if (m === "Mei" && y === "2025") {
      (events[parseInt(d)] ??= []).push({ label: `Deadline RTL ${r.unit}`, color: sisaHariRtl(r.target) < 0 ? "bg-red-500" : "bg-amber-500" });
    }
  });

  const reminders = [
    ...rtlAktif.map(r => {
      const sisa = sisaHariRtl(r.target);
      return { id: 1000 + r.id, label: `${sisa < 0 ? "RTL Terlambat" : "RTL"} — ${r.unit} (${r.temuanId})`, deadline: r.target, tag: sisa < 0 ? "Overdue" : "RTL", prioritas: sisa < 0 ? "Kritis" : sisa <= 7 ? "Tinggi" : "Normal", sisa };
    }).sort((a, b) => a.sisa - b.sisa),
    { id: 4, label: "Audit Pendahuluan LPPM",          deadline: "26 Mei 2025", tag: "Audit",    prioritas: "Tinggi" },
    { id: 5, label: "Koordinasi Program Audit 2025",   deadline: "28 Mei 2025", tag: "Rapat",    prioritas: "Normal" },
    { id: 6, label: "Pengumpulan PKPT Semester II",    deadline: "30 Jun 2025", tag: "Rencana",  prioritas: "Normal" },
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
          <AgendaRingkasanSPI />
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
              <div>
                <h4 className="text-xs font-bold text-gray-700">Agenda Mendatang</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Rapat umum SPI. Entry Meeting audit dijadwalkan melalui Perencanaan Audit › Persiapan Audit.</p>
              </div>
              {canEdit && <button onClick={() => { setEditRapatId(null); setShowRapatForm(v => !v); }} className="flex-shrink-0 flex items-center gap-1 text-[10px] font-semibold px-3 py-1.5 rounded-lg text-white" style={{ background: "var(--tsu-teal)" }}>
                + Tambah Rapat
              </button>}
            </div>
            {showRapatForm && canEdit && (
              <FormTambahRapat
                onSave={r => { addRapat(r); setShowRapatForm(false); }}
                onCancel={() => setShowRapatForm(false)} />
            )}
            {editRapatId !== null && canEdit && (() => {
              const r = rapatList.find(x => x.id === editRapatId);
              return r ? (
                <FormTambahRapat key={r.id} initial={r}
                  onSave={v => { updateRapat(r.id, v); setEditRapatId(null); }}
                  onCancel={() => setEditRapatId(null)} />
              ) : null;
            })()}
            <div className="flex flex-col gap-2">
              {rapatMendatang.length === 0 && (
                <div className="text-center py-6 text-[10px] text-gray-400">Belum ada agenda mendatang.</div>
              )}
              {rapatMendatang.map((r) => (
                <div key={r.id} className="flex flex-col gap-1">
                <div className="flex items-center gap-3 p-3 rounded-xl border border-gray-100 hover:bg-gray-50 transition-colors">
                  <div className="flex-shrink-0 text-center bg-teal-50 rounded-lg px-2 py-1.5 min-w-[52px]">
                    <div className="text-[10px] text-teal-600 font-bold leading-tight">{r.tgl.split(" ").slice(0,2).join(" ")}</div>
                    <div className="text-[9px] text-teal-400">{r.jam}</div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-gray-700 flex items-center gap-1.5 flex-wrap">
                      {r.judul}
                      {r.auditNo && <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-purple-50 text-purple-600">Entry Meeting · {r.auditNo}</span>}
                    </div>
                    <div className="text-[10px] text-gray-400">{r.tempat} · {pesertaLabel(r.peserta)}</div>
                  </div>
                  <div className="flex gap-1 flex-shrink-0">
                    <AksiBtn kind="detail" active={detailRapatId === r.id} title={detailRapatId === r.id ? "Tutup Detail" : "Lihat Detail"} onClick={() => setDetailRapatId(v => v === r.id ? null : r.id)} />
                    {canEdit && !r.auditNo && <AksiBtn kind="edit" title="Edit Rapat" onClick={() => { setShowRapatForm(false); setEditRapatId(r.id); }} />}
                    {canEdit && r.auditNo && <AksiBtn kind="edit" title="Jadwal Entry Meeting dikelola di Persiapan Audit" onClick={() => navigateTo("backoffice", "B", "Persiapan Audit › Penjadwalan Entry Meeting")} />}
                    {canEdit && <AksiBtn kind="setujui" title="Tandai Selesai" onClick={() => setPendingSelesai({ msg: `Tandai rapat "${r.judul}" sebagai selesai?`, fn: () => selesaiRapat(r.id) })} />}
                    {canEdit && <AksiBtn kind="batal" title="Batalkan Rapat" onClick={() => setPendingDelete({ msg: `Batalkan rapat "${r.judul}"?`, fn: () => batalkanRapat(r.id) })} />}
                  </div>
                </div>
                {detailRapatId === r.id && (
                  <div className="ml-[64px] px-3 py-2 rounded-lg bg-gray-50 border border-gray-100 text-[10px] text-gray-600 leading-relaxed">
                    <div><span className="font-bold text-gray-500">Tanggal:</span> {r.tgl} · {r.jam}</div>
                    <div><span className="font-bold text-gray-500">Tempat:</span> {r.tempat}</div>
                    <div><span className="font-bold text-gray-500">Peserta:</span> {r.peserta.join(", ")}</div>
                  </div>
                )}
                </div>
              ))}
            </div>
          </div>
          {/* Deadline & Reminder — merged into Jadwal Rapat */}
          {overdue.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 p-4 shadow-sm">
              <h4 className="text-xs font-bold text-red-600 mb-3">Overdue ({overdue.length})</h4>
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
                    {canEdit && <AksiBtn kind="setujui" title="Tandai Selesai" onClick={() => setDoneIds(prev => [...prev, r.id])} />}
                  </div>
                ))}
              </div>
            </div>
          )}
          <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm">
            <h4 className="text-xs font-bold text-gray-700 mb-3">Deadline Mendatang ({mendatang.length})</h4>
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
                  {canEdit && <AksiBtn kind="setujui" title="Tandai Selesai" onClick={() => setDoneIds(prev => [...prev, r.id])} />}
                </div>
              ))}
              {mendatang.length === 0 && <p className="text-xs text-gray-400 text-center py-4">Semua deadline selesai </p>}
            </div>
            {doneIds.length > 0 && (
              <div className="text-center mt-2">
                <button onClick={() => setDoneIds([])} className="text-[10px] text-gray-400 hover:text-gray-600 underline">Reset semua ({doneIds.length} selesai)</button>
              </div>
            )}
          </div>
        </div>
      )}

      {pendingDelete && (
        <ConfirmModal
          message={pendingDelete.msg}
          confirmLabel="Ya, Batalkan"
          onConfirm={() => { pendingDelete.fn(); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
      {pendingSelesai && (
        <ConfirmModal
          message={pendingSelesai.msg}
          confirmLabel="Ya, Selesai"
          onConfirm={() => { pendingSelesai.fn(); setPendingSelesai(null); }}
          onCancel={() => setPendingSelesai(null)}
        />
      )}
    </div>
  );
}

function TabBackoffice({ section, subSection, suratTabHint }: { section: string; subSection: string; suratTabHint?: "Masuk" | "Keluar" }) {
  return (
    <div className="flex flex-col gap-4">
      {section === "R" && <SectionRingkasan />}
      {section === "A" && <SectionA subSection={subSection} suratTabHint={suratTabHint} />}
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
    { label: "Laporan Excel Semester I",   icon: "", link: "https://docs.google.com/spreadsheets/d/laporan-keuangan-s1-2025", color: "border-green-200 text-green-700 hover:bg-green-50" },
    { label: "Laporan PDF Semester II",    icon: "", link: "https://drive.google.com/file/laporan-pdf-s2-2024",              color: "border-red-200 text-red-600 hover:bg-red-50"      },
    { label: "Ringkasan Anggaran Tahunan", icon: "", link: "https://docs.google.com/spreadsheets/d/ringkasan-anggaran-2025",  color: "border-blue-200 text-blue-600 hover:bg-blue-50"   },
  ]);

  const komponenAnggaran = [
    { komponen: "Honorarium", rencana: 55, realisasi: 48 },
    { komponen: "Perj. Dinas", rencana: 40, realisasi: 32 },
    { komponen: "ATK & Cetak", rencana: 25, realisasi: 22 },
    { komponen: "Konsumsi",    rencana: 30, realisasi: 28 },
    { komponen: "Lain-lain",   rencana: 35, realisasi: 12 },
  ];

  // Rencana Anggaran bersumber dari anggaran program PKPT (dikelola di Perencanaan Audit › PKPT)
  const { pkptList } = useContext(PkptCtx);
  const navigateTo = useContext(NavCtx);
  const totalRencana = pkptList.reduce((s, d) => s + d.anggaran, 0);
  const totalDisetujui = pkptList.filter(p => p.approval === "Disetujui").reduce((s, d) => s + d.anggaran, 0);
  const [pendingDelete, setPendingDelete] = useState<{ msg: string; confirmLabel?: string; fn: () => void } | null>(null);

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
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div>
                <h4 className="text-xs font-bold text-gray-700">Rencana Anggaran 2025 — per Program PKPT</h4>
                <p className="text-[10px] text-gray-400 mt-0.5">Total usulan <span className="font-bold text-gray-700">Rp {totalRencana.toFixed(1)} Jt</span> · disetujui Ketua <span className="font-bold text-green-600">Rp {totalDisetujui.toFixed(1)} Jt</span>. Anggaran diubah melalui PKPT.</p>
              </div>
              <button onClick={() => navigateTo("backoffice", "B", "PKPT")} className="text-[10px] font-semibold px-3 py-1.5 rounded-lg border border-teal-200 text-teal-700 hover:bg-teal-50">Lihat di PKPT</button>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-100">
                    {["No PKPT","Program Audit","Unit Sasaran","Periode","Anggaran (Rp Jt)","Persetujuan","Aksi"].map(h=>(
                      <th key={h} className="text-left text-[10px] font-bold text-gray-400 pb-2 pr-3 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {pkptList.map(p => (
                    <tr key={p.no} className="border-b border-gray-50 hover:bg-gray-50 transition-colors">
                      <td className="py-2 pr-3 text-[10px] text-gray-400">#{p.no}</td>
                      <td className="py-2 pr-3 font-medium text-gray-700">{p.program}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.unit}</td>
                      <td className="py-2 pr-3 text-gray-500 whitespace-nowrap">{p.periode}</td>
                      <td className="py-2 pr-3 font-semibold text-gray-700">{p.anggaran.toFixed(1)}</td>
                      <td className="py-2 pr-3"><span className={`text-[9px] font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${PKPT_APPROVAL_STYLE[p.approval].cls}`}>{PKPT_APPROVAL_STYLE[p.approval].label}</span></td>
                      <td className="py-2"><AksiBtn kind="detail" title="Lihat di PKPT" onClick={() => navigateTo("backoffice", "B", "PKPT")} /></td>
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
                    <span className="ml-auto opacity-60" aria-hidden="true"><AksiSvg kind="link" /></span>
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
      {tambahModal === "Tambah Komponen Realisasi" && (
        <TambahFormModal title="Tambah Komponen Realisasi" fields={[
          { key:"komponen", label:"Komponen",          type:"text" },
          { key:"sub",      label:"Sub-Komponen",      type:"text" },
          { key:"jumlah",   label:"Jumlah Realisasi (Rp Jt)", type:"text", placeholder:"0.0" },
          { key:"sumber",   label:"Sumber Dana",       type:"select", options:["DIPA","BOPTN","PNBP","Dana Mandiri"] },
          { key:"link",     label:"Link Dokumen Pendukung (Google Drive)", type:"url", required:false },
        ]}
        onSave={(v) => setLaporanLinks(prev => [{ label: `${v.komponen || "Komponen"} — ${v.sub || ""}`.trim().replace(/—\s*$/, ""), icon: "", link: v.link || "#", color: "border-teal-200 text-teal-700 hover:bg-teal-50" }, ...prev])}
        onClose={() => setTambahModal(null)} />
      )}
      {tambahModal === "Tambah Link Laporan" && (
        <TambahFormModal title="Tambah Laporan Keuangan" fields={[
          { key:"label",   label:"Nama Laporan",                       type:"text",   placeholder:"Laporan Excel Semester I 2025" },
          { key:"format",  label:"Format",                             type:"select", options:["Excel / Sheets","PDF","Ringkasan"] },
          { key:"semester",label:"Periode / Semester",                 type:"text",   placeholder:"Sem I 2025" },
          { key:"link",    label:"Link Laporan (Google Sheets / Drive)",type:"url" },
        ]}
        onSave={(v) => {
          const icon = "";
          setLaporanLinks(prev => [{ label: `${v.label || "Laporan"} ${v.semester || ""}`.trim(), icon, link: v.link || "#", color: "border-teal-200 text-teal-700 hover:bg-teal-50" }, ...prev]);
        }}
        onClose={() => setTambahModal(null)} />
      )}
      {pendingDelete && (
        <ConfirmModal
          message={pendingDelete.msg}
          confirmLabel={pendingDelete.confirmLabel}
          onConfirm={() => { pendingDelete.fn(); setPendingDelete(null); }}
          onCancel={() => setPendingDelete(null)}
        />
      )}
    </div>
  );
}

function IndeksKomposit({ data = kpiData }: { data?: KpiKategori[] }) {
  const nilai = hitungIndeksKomposit(data);
  const kat = nilai === null ? null : getKategoriIndeks(nilai);


  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        <div className="bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex items-center justify-between gap-3" style={{ borderTop: "3px solid var(--tsu-gold)" }}>
          <div>
            <div className="text-[10px] font-bold" style={{ color: "var(--tsu-teal-dark)" }}>Indeks Komposit</div>
            <div className="text-2xl font-black mt-1" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif", color: "var(--tsu-gold)" }}>{nilai === null ? "Belum tersedia" : `${nilai.toLocaleString("id-ID", { minimumFractionDigits: 1 })}%`}</div>
          </div>
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{ background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" }}>{kat?.label ?? "—"}</span>
        </div>
        <div className="md:col-span-2 bg-white rounded-xl border border-gray-100 p-4 shadow-sm flex flex-col justify-center" style={{ borderLeft: "4px solid var(--tsu-teal)" }}>
          <div className="text-[10px] font-bold uppercase tracking-wide" style={{ color: "var(--tsu-teal-dark)" }}>Tindakan Manajemen</div>
          <div className="text-xs font-semibold text-gray-600 mt-1">{kat?.tindakan ?? "Belum ditetapkan SPI"}</div>
        </div>
      </div>
    </div>
  );
}

// ── Pengaturan Sistem ─────────────────────────────────────────────────────────

export const DEMO_USERS_EXT = [
  { id:1, nama:"Setiyowati, S.Kom., M.Kom.", email:"ketua@spi.tsu.ac.id",       role:"full",       unit:"—",       jabatan:"Kepala SPI",           aktif:true },
  { id:2, nama:"Budi Santoso, S.E.",         email:"auditor@spi.tsu.ac.id",     role:"pengawasan", unit:"—",       jabatan:"Auditor Internal",    aktif:true },
  { id:3, nama:"Dewi Rahayu, A.Md.",         email:"backoffice@spi.tsu.ac.id",  role:"backoffice", unit:"—",       jabatan:"Staff Back Office",   aktif:true },
  { id:4, nama:"Ahmad Fauzi, S.Pd.",         email:"baak@auditee.tsu.ac.id",    role:"auditee",    unit:"BAAK",    jabatan:"Kabag BAAK",          aktif:true },
  { id:5, nama:"Rina Kusuma, S.E.",          email:"keuangan@auditee.tsu.ac.id",role:"auditee",    unit:"BAUK",    jabatan:"Kabag BAUK",          aktif:true },
  { id:6, nama:"Hendra Wijaya, S.T.",        email:"sarpras@auditee.tsu.ac.id", role:"auditee",    unit:"Sarpras", jabatan:"Kabag Sarpras",       aktif:true },
  { id:7, nama:"Siti Nurhaliza, M.Pd.",      email:"akademik@auditee.tsu.ac.id",role:"auditee",    unit:"Akademik",jabatan:"Kabag Akademik",      aktif:false },
];

export type UserRow = typeof DEMO_USERS_EXT[0] & { mustChange?: boolean };

const ROLE_LABEL_MAP: Record<string,string> = {
  full:"Akses Penuh", pengawasan:"Pengawasan", backoffice:"Back Office", auditee:"Auditee", rektor:"Rektor",
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

type PrefsMap = Record<string, Record<string, boolean>>;
function PengaturanSistem({ user, onClose, onPasswordChanged, userList, setUserList, onUpdateUser, config, setConfig, prefs, setPrefs }: {
  user: User; onClose: () => void; onPasswordChanged: () => void;
  userList: UserRow[]; setUserList: React.Dispatch<React.SetStateAction<UserRow[]>>;
  onUpdateUser: (patch: Partial<User>) => void;
  config: AppConfig; setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  prefs: PrefsMap; setPrefs: React.Dispatch<React.SetStateAction<PrefsMap>>;
}) {
  const tabs = [
    { id:"profil", label:"Profil & Akun" },
    ...(user.role === "full" ? [
      { id:"users",  label:"Manajemen User" },
      { id:"config", label:"Konfigurasi Sistem" },
    ] : []),
    { id:"notif", label:"Preferensi Notifikasi" },
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
  const [fotoPreview, setFotoPreview]   = useState<string | null>(user.foto ?? null);
  const [profilError, setProfilError]   = useState("");

  function saveProfilHandler() {
    setProfilError("");
    const nama = namaEdit.trim();
    const email = emailEdit.trim();
    if (!nama) { setProfilError("Nama tidak boleh kosong."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setProfilError("Format email tidak valid."); return; }
    if (ACCOUNTS.some(a => a.email === email && a.email !== user.email)) { setProfilError("Email sudah dipakai akun lain."); return; }
    const patch: Partial<User> = { name: nama, initials: makeInitials(nama) || user.initials, email, foto: fotoPreview ?? undefined };
    if (user.role === "full") { patch.jabatan = jabatanEdit.trim() || user.jabatan; patch.unit = unitEdit.trim() || undefined; }
    const oldEmail = user.email;
    onUpdateUser(patch);
    setUserList(prev => prev.map(u => u.email === oldEmail
      ? { ...u, nama, email, jabatan: patch.jabatan ?? u.jabatan, unit: user.role === "full" ? (unitEdit.trim() || u.unit) : u.unit }
      : u));
    setProfilSaved(true);
    setTimeout(() => setProfilSaved(false), 2000);
  }
  function handleFotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) { setProfilError("Ukuran foto maksimal 2 MB."); e.target.value = ""; return; }
    const reader = new FileReader();
    reader.onload = ev => setFotoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }

  // Profil — jabatan & unit editable for full
  const [jabatanEdit, setJabatanEdit] = useState(user.jabatan);
  const [unitEdit, setUnitEdit]       = useState(user.unit ?? "");

  // Manajemen User
  const [showAddForm, setShowAddForm]     = useState(false);
  const [userFilter, setUserFilter]       = useState("semua");
  const [newUser, setNewUser]             = useState({ nama:"", email:"", role:"auditee", unit:"", jabatan:"", password:"" });
  const [showNewPw, setShowNewPw]         = useState(false);
  const [resetTarget, setResetTarget]     = useState<number | null>(null);
  const [resetPw, setResetPw]             = useState("");
  const [showPw, setShowPw]                 = useState<Record<string,boolean>>({});
  const [confirmAct, setConfirmAct]       = useState<{ kind:"edit"|"toggle"; id:number } | null>(null);
  const [pwNotice, setPwNotice]           = useState("");
  const [pwError, setPwError]             = useState("");
  const [editUserId, setEditUserId]       = useState<number | null>(null);
  const [editUserData, setEditUserData]   = useState({ nama:"", email:"", jabatan:"", unit:"", role:"" });

  const filteredUsers = userFilter === "semua" ? userList : userList.filter(u => u.role === userFilter);

  const [userError, setUserError] = useState("");

  function toggleAktif(id: number) {
    const target = userList.find(u => u.id === id);
    if (!target) return;
    if (target.email === user.email) { setUserError("Anda tidak dapat menonaktifkan akun Anda sendiri."); return; }
    const aktif = !target.aktif;
    const acc = ACCOUNTS.find(a => a.email === target.email);
    if (acc) acc.aktif = aktif;
    setUserList(prev => prev.map(u => u.id === id ? { ...u, aktif } : u));
    setUserError("");
    setPwNotice(aktif ? `Akun ${target.email} diaktifkan kembali.` : `Akun ${target.email} dinonaktifkan dan tidak dapat login.`);
  }
  function addUserHandler() {
    if (!newUser.nama || !newUser.email) return;
    setUserError("");
    const emailBaru = newUser.email.trim();
    if (!/^\S+@\S+\.\S+$/.test(emailBaru)) { setUserError("Format email tidak valid."); return; }
    if (userList.some(u => u.email.toLowerCase() === emailBaru.toLowerCase()) || ACCOUNTS.some(a => a.email.toLowerCase() === emailBaru.toLowerCase())) { setUserError("Email sudah terdaftar."); return; }
    if (newUser.role === "auditee" && !newUser.unit.trim()) { setUserError("Unit kerja wajib diisi untuk role Auditee."); return; }
    if (newUser.password.length < 8) { setUserError("Password sementara minimal 8 karakter."); return; }
    const { password, ...akun } = { ...newUser, email: emailBaru };
    setUserList(prev => [...prev, { ...akun, id: prev.length + 1, aktif: true, mustChange: true }]);
    ACCOUNTS.push({
      email: akun.email.trim(), password, name: akun.nama, jabatan: akun.jabatan || ROLE_LABEL_MAP[akun.role],
      initials: akun.nama.split(" ").filter(Boolean).slice(0, 2).map(w => w[0]?.toUpperCase()).join(""),
      role: akun.role as User["role"], avatarColor: "bg-teal-500", unit: akun.unit || undefined, mustChangePassword: true, aktif: true,
    });
    setPwNotice(`Akun ${akun.email} dibuat. Serahkan password sementara ke pengguna; pengguna akan diminta menggantinya saat login.`);
    setNewUser({ nama:"", email:"", role:"auditee", unit:"", jabatan:"", password:"" });
    setShowAddForm(false);
  }
  function resetPasswordHandler() {
    const target = userList.find(u => u.id === resetTarget);
    if (!target || resetPw.length < 8) return;
    const acc = ACCOUNTS.find(a => a.email === target.email);
    if (acc) { acc.password = resetPw; acc.mustChangePassword = true; }
    setUserList(prev => prev.map(u => u.id === resetTarget ? { ...u, mustChange: true } : u));
    setPwNotice(`Password ${target.email} direset. Serahkan password sementara ke pengguna; pengguna akan diminta menggantinya saat login.`);
    setResetTarget(null); setResetPw("");
  }
  function startEditUser(u: typeof DEMO_USERS_EXT[0]) {
    setEditUserId(u.id);
    setEditUserData({ nama: u.nama, email: u.email, jabatan: u.jabatan, unit: u.unit, role: u.role });
  }
  function saveEditUser() {
    const target = userList.find(u => u.id === editUserId);
    if (!target) return;
    setUserError("");
    const email = editUserData.email.trim();
    if (!editUserData.nama.trim()) { setUserError("Nama tidak boleh kosong."); return; }
    if (!/^\S+@\S+\.\S+$/.test(email)) { setUserError("Format email tidak valid."); return; }
    if (userList.some(u => u.id !== target.id && u.email.toLowerCase() === email.toLowerCase())) { setUserError("Email sudah dipakai akun lain."); return; }
    const role = target.email === user.email ? target.role : editUserData.role;
    const data = { ...editUserData, nama: editUserData.nama.trim(), email: target.email === user.email ? target.email : email, role };
    const acc = ACCOUNTS.find(a => a.email === target.email);
    if (acc) {
      acc.name = data.nama; acc.email = data.email; acc.jabatan = data.jabatan || acc.jabatan;
      acc.role = role as User["role"]; acc.unit = data.unit && data.unit !== "—" ? data.unit : undefined;
      acc.initials = makeInitials(data.nama) || acc.initials;
    }
    setUserList(prev => prev.map(u => u.id === editUserId ? { ...u, ...data } : u));
    setEditUserId(null);
  }

  // Konfigurasi
  const [namaSystem, setNamaSystem]       = useState(config.namaSystem);
  const [namaInstitusi, setNamaInstitusi] = useState(config.namaInstitusi);
  const [tahunAnggaran, setTahunAnggaran] = useState(config.tahunAnggaran);
  const [periodeAudit, setPeriodeAudit]   = useState(config.periodeAudit);
  const [logoPreview, setLogoPreview]     = useState<string | undefined>(config.logo);
  const [configError, setConfigError]     = useState("");
  const [configSaved, setConfigSaved]     = useState(false);

  function handleLogoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 1024 * 1024) { setConfigError("Ukuran logo maksimal 1 MB."); e.target.value = ""; return; }
    setConfigError("");
    const reader = new FileReader();
    reader.onload = ev => setLogoPreview(ev.target?.result as string);
    reader.readAsDataURL(file);
    e.target.value = "";
  }
  function saveConfigHandler() {
    if (!namaSystem.trim() || !namaInstitusi.trim()) { setConfigError("Nama sistem dan nama institusi tidak boleh kosong."); return; }
    setConfigError("");
    setConfig({ namaSystem: namaSystem.trim(), namaInstitusi: namaInstitusi.trim(), tahunAnggaran, periodeAudit, logo: logoPreview });
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  }

  // Notifikasi
  const [notifPrefs, setNotifPrefs] = useState<Record<string,boolean>>(
    prefs[user.email] ?? NOTIF_PREFS_DEFAULT[user.role] ?? {}
  );
  function toggleNotif(key: string) {
    setNotifPrefs(prev => ({ ...prev, [key]: !prev[key] }));
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center md:p-4"
      style={{ background:"rgba(15,23,42,0.65)", backdropFilter:"blur(6px)" }}>
      <div className="bg-white md:rounded-2xl shadow-2xl w-full flex flex-col md:flex-row overflow-hidden h-dvh md:h-auto md:max-h-[640px] md:max-w-[900px]">

        {/* Mobile top tab bar — hidden on desktop */}
        <div className="md:hidden flex-shrink-0 flex border-b border-gray-100"
          style={{ background:"linear-gradient(90deg,var(--tsu-teal-dark) 0%,var(--tsu-teal) 100%)" }}>
          <div className="flex overflow-x-auto flex-1">
            {tabs.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                className={`flex-shrink-0 px-4 py-3 text-xs font-semibold transition-colors border-b-2 ${
                  tab === t.id
                    ? "border-white text-white"
                    : "border-transparent text-white/60 hover:text-white"
                }`}>
                {t.label}
              </button>
            ))}
          </div>
          <button onClick={onClose} className="flex-shrink-0 px-4 py-3 text-white/70 hover:text-white text-lg leading-none">
            ✕
          </button>
        </div>

        {/* Desktop sidebar kiri — hidden on mobile */}
        <div className="hidden md:flex w-56 flex-shrink-0 flex-col border-r border-white/10"
          style={{ background:"linear-gradient(180deg,var(--tsu-teal-dark) 0%,var(--tsu-teal) 100%)" }}>
          <div className="px-4 py-5 border-b border-white/10">
            <div className="text-sm font-black text-white">Pengaturan</div>
            <div className="text-[10px] text-white/60 mt-0.5">{config.namaSystem}</div>
          </div>
          <div className="px-4 py-3 border-b border-white/10">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${user.avatarColor}`}>
                {user.foto ? <img src={user.foto} alt="" className="w-full h-full object-cover" /> : user.initials}
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
                <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white flex-shrink-0 overflow-hidden ${user.avatarColor}`}>
                  {fotoPreview
                    ? <img src={fotoPreview} alt="foto" className="w-full h-full object-cover" />
                    : user.initials}
                </div>
                <div>
                  <input id="foto-upload-input" type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                    onChange={handleFotoChange} />
                  <button
                    onClick={() => (document.getElementById("foto-upload-input") as HTMLInputElement)?.click()}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 text-gray-700 cursor-pointer transition-colors">
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
                  <input value={user.role === "full" ? jabatanEdit : user.jabatan}
                    onChange={e => setJabatanEdit(e.target.value)}
                    disabled={user.role !== "full"}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all ${
                      user.role === "full"
                        ? "border-gray-200 text-gray-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                        : "border-gray-100 text-gray-400 bg-gray-50 cursor-not-allowed"
                    }`} />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1.5">Unit Kerja</label>
                  <input value={user.role === "full" ? unitEdit : (user.unit ?? "—")}
                    onChange={e => setUnitEdit(e.target.value)}
                    disabled={user.role !== "full"}
                    className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none transition-all ${
                      user.role === "full"
                        ? "border-gray-200 text-gray-700 focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                        : "border-gray-100 text-gray-400 bg-gray-50 cursor-not-allowed"
                    }`} />
                </div>
              </div>

              {profilError && <p className="text-[11px] text-red-500">{profilError}</p>}
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
                      <input type={showPw[label] ? "text" : "password"} value={val} onChange={e => set(e.target.value)} placeholder={ph}
                        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 transition-all" />
                      <label className="mt-1.5 flex items-center gap-1.5 text-[10px] text-gray-500 cursor-pointer select-none w-fit">
                        <input type="checkbox" checked={!!showPw[label]} onChange={e => setShowPw(p => ({ ...p, [label]: e.target.checked }))} />
                        Tampilkan password
                      </label>
                    </div>
                  ))}
                  {pwBaru && pwKonfirmasi && pwBaru !== pwKonfirmasi && (
                    <p className="text-[10px] text-red-500">Password baru tidak cocok.</p>
                  )}
                  {pwError && <p className="text-[10px] text-red-500">{pwError}</p>}
                  <button onClick={() => {
                    setPwError("");
                    const acc = ACCOUNTS.find(a => a.email === user.email);
                    if (acc && acc.password !== pwLama) { setPwError("Password lama salah."); return; }
                    if (pwBaru.length < 8) { setPwError("Password baru minimal 8 karakter."); return; }
                    if (pwBaru === pwLama) { setPwError("Password baru harus berbeda dari password lama."); return; }
                    if (pwBaru === pwKonfirmasi) {
                      if (acc) { acc.password = pwBaru; acc.mustChangePassword = false; }
                      onPasswordChanged();
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
                        <option value="rektor">Rektor</option>
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
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 flex flex-col gap-2">
                    <label className="text-[10px] font-bold text-amber-800">Password Sementara *</label>
                    <div className="flex gap-2 items-center">
                      <input type={showNewPw ? "text" : "password"} autoComplete="new-password" value={newUser.password}
                        onChange={e => setNewUser(p => ({ ...p, password: e.target.value }))}
                        placeholder="Min. 8 karakter"
                        className="flex-1 border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-teal-400" />
                      <button type="button" onClick={() => setShowNewPw(v => !v)}
                        className="text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border border-amber-200 bg-white hover:bg-amber-100">
                        {showNewPw ? "Sembunyikan" : "Tampilkan"}
                      </button>
                    </div>
                    {newUser.password && newUser.password.length < 8 && (
                      <p className="text-[10px] text-red-500">Password minimal 8 karakter.</p>
                    )}
                    <p className="text-[10px] text-amber-700">Diisi manual oleh Kepala SPI lalu diserahkan ke pengguna. Saat pengguna login, muncul peringatan agar segera mengganti password ini.</p>
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

              {confirmAct && (() => {
                const t = userList.find(x => x.id === confirmAct.id);
                const nonaktif = confirmAct.kind === "toggle" && !!t?.aktif;
                const msg = confirmAct.kind === "edit"
                  ? `Apakah Anda yakin ingin menyimpan perubahan data akun ${t?.nama}?`
                  : nonaktif
                    ? `Apakah Anda yakin ingin menonaktifkan akun ${t?.nama}? Pengguna tidak akan bisa login sampai diaktifkan kembali.`
                    : `Apakah Anda yakin ingin mengaktifkan kembali akun ${t?.nama}?`;
                return (
                  <div className="fixed inset-0 z-[70] flex items-center justify-center p-4" style={{ background:"rgba(15,23,42,0.6)" }}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 flex flex-col gap-4">
                      <h3 className="text-sm font-black text-gray-800">{confirmAct.kind === "edit" ? "Simpan Perubahan" : nonaktif ? "Nonaktifkan Akun" : "Aktifkan Akun"}</h3>
                      <p className="text-xs text-gray-600 leading-relaxed">{msg}</p>
                      <div className="flex gap-2 justify-end">
                        <button onClick={() => setConfirmAct(null)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">Batal</button>
                        <button onClick={() => { if (confirmAct.kind === "edit") saveEditUser(); else toggleAktif(confirmAct.id); setConfirmAct(null); }}
                          className={`text-xs font-bold px-3 py-1.5 rounded-lg text-white ${nonaktif ? "bg-red-500" : ""}`}
                          style={nonaktif ? undefined : { background:"var(--tsu-teal)" }}>
                          Ya, Yakin
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })()}
              {userError && (
                <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 flex items-start justify-between gap-3">
                  <p className="text-xs text-red-700">{userError}</p>
                  <button onClick={() => setUserError("")} className="text-[10px] font-semibold text-red-600 flex-shrink-0">Tutup</button>
                </div>
              )}
              {pwNotice && (
                <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 flex items-start justify-between gap-3">
                  <p className="text-xs text-emerald-800">{pwNotice}</p>
                  <button onClick={() => setPwNotice("")} className="text-[10px] font-semibold text-emerald-700 flex-shrink-0">Tutup</button>
                </div>
              )}
              {resetTarget !== null && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 flex flex-col gap-2">
                  <div className="text-xs font-bold text-amber-800">Reset password: {userList.find(u => u.id === resetTarget)?.email}</div>
                  <input type="text" value={resetPw} onChange={e => setResetPw(e.target.value)} placeholder="Password sementara baru (min. 8 karakter)"
                    className="w-full border border-amber-200 rounded-lg px-2.5 py-1.5 text-xs bg-white focus:outline-none focus:border-teal-400" />
                  <div className="flex gap-2">
                    <button onClick={resetPasswordHandler} disabled={resetPw.length < 8}
                      className="text-xs font-bold px-3 py-1.5 rounded-lg text-white disabled:opacity-40" style={{ background:"var(--tsu-teal)" }}>Simpan</button>
                    <button onClick={() => { setResetTarget(null); setResetPw(""); }}
                      className="text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">Batal</button>
                  </div>
                </div>
              )}

              <div className="flex gap-1 flex-wrap">
                {["semua","full","pengawasan","backoffice","auditee","rektor"].map(f => (
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
                      editUserId === u.id ? (
                        <tr key={u.id} className="border-b border-teal-100 bg-teal-50/40">
                          <td colSpan={5} className="px-4 py-3">
                            <div className="grid grid-cols-2 gap-2 mb-2">
                              {([
                                { label:"Nama",    key:"nama",    ph:"Nama lengkap" },
                                { label:"Email",   key:"email",   ph:"email@tsu.ac.id" },
                                { label:"Jabatan", key:"jabatan", ph:"Jabatan" },
                                { label:"Unit",    key:"unit",    ph:"Unit kerja" },
                              ] as { label:string; key: keyof typeof editUserData; ph:string }[]).map(({ label, key, ph }) => (
                                <div key={key}>
                                  <label className="block text-[9px] font-semibold text-gray-500 mb-0.5">{label}</label>
                                  <input value={editUserData[key]}
                                    onChange={e => setEditUserData(p => ({ ...p, [key]: e.target.value }))}
                                    placeholder={ph}
                                    className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-teal-400 transition-all" />
                                </div>
                              ))}
                              <div>
                                <label className="block text-[9px] font-semibold text-gray-500 mb-0.5">Role</label>
                                <select value={editUserData.role}
                                  onChange={e => setEditUserData(p => ({ ...p, role: e.target.value }))}
                                  className="w-full border border-gray-200 rounded-lg px-2 py-1 text-xs bg-white focus:outline-none focus:border-teal-400 transition-all">
                                  <option value="full">Akses Penuh</option>
                                  <option value="pengawasan">Pengawasan</option>
                                  <option value="backoffice">Back Office</option>
                                  <option value="auditee">Auditee</option>
                                  <option value="rektor">Rektor</option>
                                </select>
                              </div>
                            </div>
                            <div className="flex gap-2">
                              <button onClick={() => setConfirmAct({ kind:"edit", id: u.id })}
                                className="text-[9px] font-bold px-3 py-1 rounded-lg text-white"
                                style={{ background:"var(--tsu-teal)" }}>
                                ✓ Simpan
                              </button>
                              <button onClick={() => setEditUserId(null)}
                                className="text-[9px] font-semibold px-3 py-1 rounded-lg border border-gray-200 bg-white hover:bg-gray-50">
                                Batal
                              </button>
                            </div>
                          </td>
                        </tr>
                      ) : (
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
                            u.role === "rektor"     ? "bg-red-50 text-red-600" :
                            "bg-purple-50 text-purple-700"
                          }`}>{ROLE_LABEL_MAP[u.role]}</span>
                        </td>
                        <td className="px-4 py-3 text-gray-500">{u.unit || "—"}</td>
                        <td className="px-4 py-3">
                          <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${
                            u.aktif ? "bg-emerald-50 text-emerald-700" : "bg-gray-100 text-gray-400"
                          }`}>{u.aktif ? "Aktif" : "Nonaktif"}</span>
                          {u.mustChange && (
                            <div className="mt-1 text-[9px] font-semibold text-amber-600">Wajib ganti password</div>
                          )}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            <AksiBtn kind="edit" title="Edit User" onClick={() => startEditUser(u)} />
                            <button onClick={() => { setResetTarget(u.id); setResetPw(""); }}
                              className="text-[9px] font-semibold px-2 py-1 rounded-lg border border-amber-100 text-amber-600 hover:bg-amber-50">
                              Reset Password
                            </button>
                            <button onClick={() => setConfirmAct({ kind:"toggle", id: u.id })}
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
                      )
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
                      onChange={handleLogoChange} />
                    {logoPreview && <img src={logoPreview} alt="Logo" className="h-12 object-contain" />}
                    <div className="text-xs text-gray-400">{logoPreview ? "Klik untuk mengganti logo" : "Klik untuk unggah logo"}</div>
                    <div className="text-[10px] text-gray-300">PNG, SVG — maks 1 MB</div>
                  </div>
                </div>
              </div>

              {configError && <p className="text-[11px] text-red-500">{configError}</p>}
              <div className="flex items-center gap-3">
                <button onClick={saveConfigHandler}
                  className="text-xs font-bold px-4 py-2 rounded-xl text-white transition-all hover:opacity-90"
                  style={{ background:"linear-gradient(135deg,var(--tsu-teal-dark),var(--tsu-teal))" }}>
                  {configSaved ? "✓ Konfigurasi Tersimpan" : "Simpan Konfigurasi"}
                </button>
              </div>

              <div className="border border-amber-200 bg-amber-50 rounded-xl p-4 max-w-lg">
                <div className="text-xs font-bold text-amber-800 mb-1">ℹ Catatan Level 1</div>
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
                <button onClick={() => { setPrefs(p => ({ ...p, [user.email]: notifPrefs })); setPrefSaved(true); setTimeout(() => setPrefSaved(false), 2000); }}
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

function RektorDetailModal({ title, rows, link, extra, onClose }: {
  title: string; rows: [string, React.ReactNode][]; link?: string | null; extra?: React.ReactNode; onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.4)" }} onClick={onClose}>
      <div className="bg-white rounded-2xl shadow-2xl p-5 w-full max-w-md" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-gray-800">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-lg leading-none">✕</button>
        </div>
        <dl className="flex flex-col gap-1.5">
          {rows.map(([k, v]) => (
            <div key={k} className="flex gap-3 text-[11px]">
              <dt className="w-36 flex-shrink-0 text-gray-400">{k}</dt>
              <dd className="flex-1 text-gray-700 font-medium break-words">{v}</dd>
            </div>
          ))}
        </dl>
        {extra}
        {link && (
          <div className="mt-4 flex items-center justify-between gap-2 px-3 py-2 rounded-lg bg-gray-50"><span className="text-[11px] text-gray-500">Dokumen</span><AksiBtn kind="link" title="Buka Dokumen" href={link} /></div>
        )}
        <p className="mt-3 text-[10px] text-gray-400">Tampilan baca saja.</p>
      </div>
    </div>
  );
}

function RektorDashboard({ user, onLogout, users, setUsers, onUpdateUser, config, setConfig, prefs, setPrefs }: {
  user: User; onLogout: () => void; users: UserRow[]; setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
  onUpdateUser: (patch: Partial<User>) => void; config: AppConfig; setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  prefs: PrefsMap; setPrefs: React.Dispatch<React.SetStateAction<PrefsMap>>;
}) {
  // Rektor: seluruh angka diturunkan dari store bersama (PKPT, Rencana, LHA, Temuan, RTL) — baca saja.
  const { laporanList, rencanaList } = useContext(AuditCtx);
  const { rtlList, temuanList } = useContext(TemuanCtx);
  const { pkptList } = useContext(PkptCtx);
  const { penutupan } = useContext(LapanganCtx);
  const [detailLha, setDetailLha] = useState<string | null>(null);
  const [detailRtl, setDetailRtl] = useState<number | null>(null);
  const [detailIsu, setDetailIsu] = useState<string | null>(null);
  const [lhaAll, setLhaAll] = useState(false);
  const [rtlAll, setRtlAll] = useState(false);
  const [showLogout, setShowLogout] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [pwWarn, setPwWarn] = useState(!!user.mustChangePassword);

  const TAHUN = RTL_TODAY.getFullYear();
  const QTR_NOW = Math.floor(RTL_TODAY.getMonth() / 3) + 1;
  const pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
  const RANK: Record<string, number> = { Tinggi: 3, Sedang: 2, Rendah: 1 };

  // ── Program audit (PKPT disetujui) & statusnya ────────────────────────────
  type ProgStatus = "Selesai" | "Berjalan" | "Rencana";
  const programs = pkptList.filter(p => p.approval === "Disetujui").map(p => {
    const ra = rencanaList.find(r => r.pkptNo === p.no);
    const selesai = !!ra && (penutupan[ra.no]?.status === "Close" || laporanList.some(l => l.auditNo === ra.no && l.status === "Diterima"));
    const status: ProgStatus = selesai ? "Selesai" : ra?.status === "Disetujui" ? "Berjalan" : "Rencana";
    const [q, y] = p.periode.replace("Q", "").split(" ").map(Number);
    const tertunda = status === "Rencana" && (y < TAHUN || (y === TAHUN && q <= QTR_NOW));
    return { ...p, ra, status, tertunda };
  });
  const progCount = (st: ProgStatus) => programs.filter(p => p.status === st).length;
  const nProg = programs.length, nSelesai = progCount("Selesai"), nBerjalan = progCount("Berjalan"), nRencana = progCount("Rencana");

  // ── RTL, temuan, LHA ───────────────────────────────────────────────────────
  const temuanOf = (id: string) => temuanList.find(t => t.id === id);
  const rtlRows = rtlList.map(r => {
    const t = temuanOf(r.temuanId);
    return { ...r, temuan: t, prioritas: t?.tingkat ?? "Rendah", eff: rtlEffStatus(r), sisa: sisaHariRtl(r.target) };
  });
  const rtlClose = rtlRows.filter(r => rtlTlStatus(r) === "Close").length;
  const rtlTerlambat = rtlRows.filter(r => r.eff === "Terlambat");
  const temuanTinggi = temuanList.filter(t => t.tingkat === "Tinggi");
  const tinggiOpen = temuanTinggi.filter(t => t.status !== "Selesai").map(t => {
    const rtl = rtlRows.filter(r => r.temuanId === t.id && r.eff !== "Selesai");
    return { ...t, rtl, lewat: rtl.some(r => r.eff === "Terlambat"), tanpaRtl: !rtlRows.some(r => r.temuanId === t.id) };
  });
  const lhaTerbit = laporanList.filter(l => l.status === "Diterima");
  const lhaBelum = laporanList.filter(l => l.status !== "Diterima");
  const lhaLabel = (st: string) => st === "Diterima" ? "Terbit" : st === "Revisi" ? "Revisi" : "Dalam Proses";

  const kpi = [
    { label: "Program Audit Selesai", value: `${nSelesai} / ${nProg}`, ctx: `${pct(nSelesai, nProg)}% program PKPT ${TAHUN} terlaksana`, bar: pct(nSelesai, nProg), tone: "#2563eb", tint: "#eff6ff", icon: <IconClipboard className="w-5 h-5" /> },
    { label: "Penyelesaian RTL",      value: `${rtlClose} / ${rtlRows.length}`, ctx: `${pct(rtlClose, rtlRows.length)}% rekomendasi ditutup (Close)`, bar: pct(rtlClose, rtlRows.length), tone: "#0d9488", tint: "#f0fdfa", icon: <IconCheck className="w-5 h-5" /> },
    { label: "Temuan Risiko Tinggi Terbuka", value: `${tinggiOpen.length}`, ctx: `dari ${temuanTinggi.length} temuan risiko tinggi · ${tinggiOpen.filter(t => t.lewat).length} lewat tenggat`, bar: null, tone: "#dc2626", tint: "#fef2f2", icon: <IconAlert className="w-5 h-5" /> },
    { label: "Penyelesaian LHA",      value: `${lhaTerbit.length} / ${laporanList.length}`, ctx: `${pct(lhaTerbit.length, laporanList.length)}% laporan hasil audit diterbitkan`, bar: pct(lhaTerbit.length, laporanList.length), tone: "#7c3aed", tint: "#f5f3ff", icon: <IconDoc className="w-5 h-5" /> },
  ];

  // ── Tren bulanan: snapshot bulan lalu (Level 1, belum ada backend) + bulan berjalan dari data live ──
  // progres audit = rata-rata tahap program PKPT (Rencana 0 · Berjalan 50 · Selesai 100)
  const BULAN = ["Jan", "Feb", "Mar", "Apr", "Mei", "Jun", "Jul", "Agu", "Sep", "Okt", "Nov", "Des"];
  const SNAPSHOT = [
    { audit: 0,  rtl: 0,  tinggi: 0 },
    { audit: 7,  rtl: 0,  tinggi: 1 },
    { audit: 14, rtl: 0,  tinggi: 2 },
    { audit: 21, rtl: 17, tinggi: 4 },
  ];
  const progresAudit = nProg ? Math.round((nSelesai * 100 + nBerjalan * 50) / nProg) : 0;
  const tren = [
    ...SNAPSHOT.slice(0, RTL_TODAY.getMonth()).map((d, i) => ({ bulan: BULAN[i], ...d })),
    { bulan: BULAN[RTL_TODAY.getMonth()], audit: progresAudit, rtl: pct(rtlClose, rtlRows.length), tinggi: tinggiOpen.length },
  ];
  const trenAkhir = tren[tren.length - 1], trenAwal = tren[Math.max(0, tren.length - 2)];

  // ── Distribusi level temuan terbuka ───────────────────────────────────────
  const temuanOpen = temuanList.filter(t => t.status !== "Selesai");
  const distribusi = [
    { label: "Tinggi", color: "#ef4444", n: temuanOpen.filter(t => t.tingkat === "Tinggi").length },
    { label: "Sedang", color: "#f59e0b", n: temuanOpen.filter(t => t.tingkat === "Sedang").length },
    { label: "Rendah", color: "#22c55e", n: temuanOpen.filter(t => t.tingkat === "Rendah").length },
  ];

  // ── Perhatian pimpinan: diurutkan menurut tingkat risiko, lalu urgensi (bukan waktu input) ──
  type Isu = { key: string; judul: string; ringkas: string; tone: string; tint: string; icon: React.ReactNode; risiko: number; urgensi: number;
    detail: { utama: string; meta: string; badge: string; badgeCls: string }[] };
  const rtlTerlambatTinggi = rtlTerlambat.some(r => r.prioritas === "Tinggi");
  const isuList: Isu[] = ([
    { key: "temuan", judul: "Temuan risiko tinggi belum selesai", tone: "#dc2626", tint: "#fef2f2", icon: <IconAlert className="w-4 h-4" />,
      ringkas: `${tinggiOpen.length} temuan · ${tinggiOpen.filter(t => t.lewat).length} RTL lewat tenggat · ${tinggiOpen.filter(t => t.tanpaRtl).length} belum ada RTL`,
      risiko: 3, urgensi: tinggiOpen.filter(t => t.lewat).length * 2 + tinggiOpen.filter(t => t.tanpaRtl).length,
      detail: [...tinggiOpen].sort((a, b) => Number(b.lewat) - Number(a.lewat) || Number(b.tanpaRtl) - Number(a.tanpaRtl)).map(t => ({
        utama: t.deskripsi, meta: `${t.unit} · ${t.kategori} · ${t.id}`,
        badge: t.lewat ? "RTL lewat tenggat" : t.tanpaRtl ? "Belum ada RTL" : "RTL berjalan",
        badgeCls: t.lewat ? "bg-red-50 text-red-600" : t.tanpaRtl ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600" })) },
    { key: "rtl", judul: "Tindak lanjut melewati tenggat", tone: "#ea580c", tint: "#fff7ed", icon: <IconClock className="w-4 h-4" />,
      ringkas: `${rtlTerlambat.length} rekomendasi · terlama ${rtlTerlambat.length ? Math.max(...rtlTerlambat.map(r => -r.sisa)) : 0} hari`,
      risiko: rtlTerlambatTinggi ? 3 : 2, urgensi: rtlTerlambat.length ? Math.max(...rtlTerlambat.map(r => -r.sisa)) / 30 : 0,
      detail: [...rtlTerlambat].sort((a, b) => (RANK[b.prioritas] ?? 0) - (RANK[a.prioritas] ?? 0) || a.sisa - b.sisa).map(r => ({
        utama: r.rencana, meta: `${r.unit} · PIC ${r.pic} · target ${r.target}`, badge: `Lewat ${-r.sisa} hari`, badgeCls: "bg-red-50 text-red-600" })) },
    { key: "lha", judul: "LHA belum disetujui", tone: "#7c3aed", tint: "#f5f3ff", icon: <IconDoc className="w-4 h-4" />,
      ringkas: `${lhaBelum.length} laporan · ${lhaBelum.filter(l => l.status === "Revisi").length} dalam revisi`,
      risiko: 2, urgensi: lhaBelum.filter(l => l.status === "Revisi").length + lhaBelum.length * 0.5,
      detail: [...lhaBelum].sort((a, b) => Number(b.status === "Revisi") - Number(a.status === "Revisi")).map(l => ({
        utama: `${l.no} — ${l.unit}`, meta: `${l.temuan} temuan · ${l.rekomendasi} rekomendasi`, badge: lhaLabel(l.status),
        badgeCls: l.status === "Revisi" ? "bg-amber-50 text-amber-600" : "bg-blue-50 text-blue-600" })) },
    { key: "program", judul: "Program audit tertunda", tone: "#d97706", tint: "#fffbeb", icon: <IconCalendar className="w-4 h-4" />,
      ringkas: `${programs.filter(p => p.tertunda).length} program belum dimulai sesuai periode PKPT`,
      risiko: 1, urgensi: programs.filter(p => p.tertunda).length,
      detail: programs.filter(p => p.tertunda).map(p => ({
        utama: p.program, meta: `${p.unit} · jadwal ${p.periode} · ketua ${p.ketua}`, badge: p.ra ? "Rencana masih draft" : "Belum ada rencana", badgeCls: "bg-amber-50 text-amber-600" })) },
  ] as Isu[]).filter(i => i.detail.length > 0).sort((a, b) => b.risiko - a.risiko || b.urgensi - a.urgensi);
  const isuAktif = isuList.find(i => i.key === detailIsu);

  // ── Tabel ringkas: urutkan yang butuh perhatian lebih dulu ────────────────
  const LHA_ORDER: Record<string, number> = { Revisi: 0, "Dalam Proses": 1, Terbit: 2 };
  const lhaRows = [...laporanList].sort((a, b) => LHA_ORDER[lhaLabel(a.status)] - LHA_ORDER[lhaLabel(b.status)]);
  const EFF_ORDER: Record<string, number> = { Terlambat: 0, "Menunggu Verifikasi": 1, Proses: 2, Selesai: 3 };
  const rtlSorted = [...rtlRows].sort((a, b) => EFF_ORDER[a.eff] - EFF_ORDER[b.eff] || (RANK[b.prioritas] ?? 0) - (RANK[a.prioritas] ?? 0) || a.sisa - b.sisa);
  const MAX_ROWS = 5;
  const lhaCls = (l: string) => l === "Terbit" ? "bg-green-50 text-green-700" : l === "Revisi" ? "bg-amber-50 text-amber-700" : "bg-blue-50 text-blue-700";
  const prioCls = (l: string) => l === "Tinggi" ? "bg-red-50 text-red-600" : l === "Sedang" ? "bg-amber-50 text-amber-700" : "bg-sky-50 text-sky-700";
  const effLabel = (e: RtlStatus) => e === "Proses" ? "Dalam Proses" : e;
  const effCls = (e: RtlStatus) => e === "Selesai" ? "bg-green-50 text-green-700" : e === "Terlambat" ? "bg-orange-50 text-orange-600" : e === "Menunggu Verifikasi" ? "bg-purple-50 text-purple-700" : "bg-blue-50 text-blue-700";

  // ── Riwayat audit per tahun (tahun berjalan live + historis) ──────────────
  const riwayatTahun = (() => {
    const map = new Map<string, { program: number; selesai: number; berjalan: number }>();
    map.set(String(TAHUN), { program: nProg, selesai: nSelesai, berjalan: nBerjalan });
    Object.values(RIWAYAT_HISTORIS).flat().forEach(r => {
      const cur = map.get(r.tahun) ?? { program: 0, selesai: 0, berjalan: 0 };
      cur.program++; if (r.status === "Selesai") cur.selesai++; else cur.berjalan++;
      map.set(r.tahun, cur);
    });
    return [...map.entries()].sort((a, b) => b[0].localeCompare(a[0])).slice(0, 3);
  })();

  const card = "bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04)]";
  const heading = { fontFamily: "'Plus Jakarta Sans', sans-serif" };
  const TH = ({ children, right }: { children: React.ReactNode; right?: boolean }) => (
    <th className={`text-[10px] font-semibold text-slate-400 px-3 py-2 whitespace-nowrap bg-slate-50/80 ${right ? "text-right" : "text-left"}`}>{children}</th>
  );
  const LihatSemua = ({ open, total, onClick }: { open: boolean; total: number; onClick: () => void }) => total > MAX_ROWS ? (
    <button onClick={onClick} className="text-[11px] font-semibold text-blue-600 hover:text-blue-700 flex items-center gap-1 flex-shrink-0">
      {open ? "Ringkas" : `Lihat Semua (${total})`} <IconArrow className={`w-3.5 h-3.5 transition-transform ${open ? "-rotate-90" : ""}`} />
    </button>
  ) : null;

  return (
    <div className="min-h-dvh flex flex-col" style={{ fontFamily: "'Inter', sans-serif", background: "#f4f7fb" }}>
      {/* Top bar */}
      <header className="flex-shrink-0 flex items-center justify-between px-3 md:px-6 py-3 shadow-sm"
        style={{ background: "linear-gradient(90deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}>
        <div className="flex items-center gap-2 md:gap-3 min-w-0">
          <img src={config.logo ?? logoTSU} alt="Logo" className="h-7 md:h-8 flex-shrink-0 bg-white rounded-lg px-2 py-1 object-contain" />
          <div className="hidden sm:block">
            <div className="text-[10px] font-bold text-white leading-tight tracking-widest uppercase">Sistem Informasi SPI</div>
            <div className="text-[9px] text-blue-300">{config.namaInstitusi}</div>
          </div>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
          <div className="text-right hidden md:block">
            <div className="text-xs font-bold text-white">{user.name}</div>
            <div className="text-[10px] text-blue-300">{user.jabatan}</div>
          </div>
          <div className={`w-8 h-8 rounded-full overflow-hidden flex-shrink-0 flex items-center justify-center text-xs font-black text-white ${user.avatarColor}`}>
            {user.foto ? <img src={user.foto} alt="" className="w-full h-full object-cover" /> : user.initials}
          </div>
          <div className="h-4 w-px bg-white/20" />
          <button onClick={() => setShowSettings(true)}
            className="text-[10px] font-semibold text-white/80 hover:text-white px-2 py-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
            Pengaturan
          </button>
          <button onClick={() => setShowLogout(true)}
            className="text-[10px] font-semibold text-red-700 border border-red-600 px-2 py-1 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0">
            Keluar
          </button>
        </div>
      </header>

      {/* Page body */}
      <main className="flex-1 overflow-y-auto p-3 sm:p-6">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-4">
        {pwWarn && (
          <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
            <div>
              <div className="text-xs font-bold text-amber-800">Segera ganti password sementara Anda</div>
              <p className="text-[11px] text-amber-700 mt-0.5">Akun Anda masih memakai password sementara dari Kepala SPI. Demi keamanan, ganti dengan password pribadi di Pengaturan.</p>
            </div>
            <button onClick={() => setShowSettings(true)}
              className="text-xs font-bold px-3 py-2 rounded-xl text-white flex-shrink-0" style={{ background:"var(--tsu-teal)" }}>
              Ubah Password Sekarang
            </button>
          </div>
        )}

        {/* Sapaan & periode */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-2xl flex items-center justify-center text-white flex-shrink-0 shadow-sm"
              style={{ background: "linear-gradient(135deg,#3b82f6,#1d4ed8)" }}>
              <IconShield className="w-6 h-6" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-extrabold text-slate-800 leading-tight" style={heading}>Selamat datang, Bapak/Ibu Rektor</h1>
              <p className="text-xs text-slate-500 mt-0.5 truncate">Ringkasan kinerja pengawasan internal — {config.namaInstitusi}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 text-slate-500">
              <IconCalendar className="w-4 h-4 text-slate-400" />
              <div className="leading-tight"><div className="text-[10px] text-slate-400">Data per</div><div className="text-[11px] font-semibold text-slate-600">{RTL_TODAY_LABEL}</div></div>
            </div>
            <div className={`${card} flex items-center gap-2.5 px-3.5 py-2`}>
              <IconCalendar className="w-4 h-4 text-blue-600" />
              <div className="leading-tight"><div className="text-[10px] text-slate-400">Periode</div><div className="text-xs font-bold text-slate-700">Tahun {TAHUN}</div></div>
            </div>
          </div>
        </div>

        {/* 1. Ringkasan eksekutif — 4 indikator utama dengan konteks */}
        <section aria-label="Ringkasan eksekutif" className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {kpi.map(k => (
            <div key={k.label} className={`${card} p-5 flex gap-4`}>
              <div className="w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: k.tint, color: k.tone }}>{k.icon}</div>
              <div className="flex-1 min-w-0">
                <div className="text-xs font-semibold text-slate-600">{k.label}</div>
                <div className="text-3xl font-extrabold text-slate-800 mt-1 tabular-nums" style={heading}>{k.value}</div>
                <div className="text-[11px] mt-1 leading-snug" style={{ color: k.bar === null ? "#64748b" : k.tone }}>{k.ctx}</div>
                {k.bar !== null
                  ? <div className="h-1.5 rounded-full bg-slate-100 mt-3 overflow-hidden"><div className="h-full rounded-full transition-all" style={{ width: `${k.bar}%`, background: k.tone }} /></div>
                  : <div className="mt-3 text-[10px] font-bold uppercase tracking-wide text-red-600">Perlu perhatian segera</div>}
              </div>
            </div>
          ))}
        </section>

        <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,3fr)_minmax(300px,1fr)] gap-4 items-start">
          {/* ── Kolom utama ── */}
          <div className="flex flex-col gap-4 min-w-0">
            <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)] gap-4">
              {/* 2. Tren kinerja pengawasan — satu grafik */}
              <section className={`${card} p-5`}>
                <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800" style={heading}>Tren Kinerja Pengawasan</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">Bulanan, {tren[0].bulan} – {trenAkhir.bulan} {TAHUN}</p>
                  </div>
                  <div className="flex items-center gap-3 text-[10px] text-slate-500 flex-wrap">
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500" />Progres audit</span>
                    <span className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-teal-500" />Penyelesaian RTL</span>
                    <span className="flex items-center gap-1.5"><span className="w-2.5 h-2 rounded-sm bg-red-300" />Temuan risiko tinggi terbuka</span>
                  </div>
                </div>
                <div className="h-[230px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={tren} margin={{ top: 10, right: 4, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="gAudit" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#3b82f6" stopOpacity={0.18} /><stop offset="100%" stopColor="#3b82f6" stopOpacity={0} /></linearGradient>
                        <linearGradient id="gRtl" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#14b8a6" stopOpacity={0.18} /><stop offset="100%" stopColor="#14b8a6" stopOpacity={0} /></linearGradient>
                      </defs>
                      <CartesianGrid stroke="#eef2f7" vertical={false} />
                      <XAxis dataKey="bulan" tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="pct" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} tickFormatter={v => `${v}%`} tick={{ fontSize: 10, fill: "#94a3b8" }} axisLine={false} tickLine={false} />
                      <YAxis yAxisId="n" orientation="right" allowDecimals={false} domain={[0, (max: number) => Math.max(5, max + 1)]} tick={{ fontSize: 10, fill: "#fca5a5" }} axisLine={false} tickLine={false} width={24} />
                      <Tooltip contentStyle={{ fontSize: 11, borderRadius: 10, border: "1px solid #e2e8f0" }}
                        formatter={(v, name) => name === "tinggi" ? [`${v} temuan`, "Risiko tinggi terbuka"] : [`${v}%`, name === "audit" ? "Progres audit" : "Penyelesaian RTL"]} />
                      <Bar yAxisId="n" dataKey="tinggi" fill="#fecaca" radius={[4, 4, 0, 0]} barSize={18} />
                      <Area yAxisId="pct" type="monotone" dataKey="audit" stroke="#3b82f6" strokeWidth={2.5} fill="url(#gAudit)" dot={{ r: 3, fill: "#3b82f6" }} activeDot={{ r: 5 }} />
                      <Area yAxisId="pct" type="monotone" dataKey="rtl" stroke="#14b8a6" strokeWidth={2.5} fill="url(#gRtl)" dot={{ r: 3, fill: "#14b8a6" }} activeDot={{ r: 5 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-3 pt-3 border-t border-slate-100">
                  {([["Progres audit", trenAkhir.audit, trenAwal.audit, "%", true], ["Penyelesaian RTL", trenAkhir.rtl, trenAwal.rtl, "%", true], ["Risiko tinggi terbuka", trenAkhir.tinggi, trenAwal.tinggi, "", false]] as const).map(([lbl, now, prev, unit, naikBaik]) => {
                    const d = now - prev; const baik = d === 0 ? null : (d > 0) === naikBaik;
                    return (
                      <div key={lbl}>
                        <div className="text-[10px] text-slate-400">{lbl}</div>
                        <div className="flex items-baseline gap-1.5">
                          <span className="text-sm font-bold text-slate-700 tabular-nums">{now}{unit}</span>
                          <span className={`text-[10px] font-semibold ${baik === null ? "text-slate-400" : baik ? "text-green-600" : "text-red-500"}`}>{d > 0 ? "▲" : d < 0 ? "▼" : "•"} {Math.abs(d)}{unit} vs {trenAwal.bulan}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Distribusi level temuan terbuka */}
              <section className={`${card} p-5`}>
                <h2 className="text-sm font-bold text-slate-800" style={heading}>Distribusi Level Temuan</h2>
                <p className="text-[11px] text-slate-400 mt-0.5">Temuan yang masih terbuka</p>
                <div className="flex flex-col items-center gap-4 mt-4">
                  <div className="relative w-[150px] h-[150px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={distribusi.filter(d => d.n > 0)} dataKey="n" nameKey="label" innerRadius={52} outerRadius={72} startAngle={90} endAngle={-270} strokeWidth={2} stroke="#fff">
                          {distribusi.filter(d => d.n > 0).map(d => <Cell key={d.label} fill={d.color} />)}
                        </Pie>
                      </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                      <span className="text-2xl font-extrabold text-slate-800" style={heading}>{temuanOpen.length}</span>
                      <span className="text-[10px] text-slate-400">temuan</span>
                    </div>
                  </div>
                  <div className="w-full flex flex-col gap-2">
                    {distribusi.map(d => (
                      <div key={d.label} className="flex items-center gap-2 text-[11px]">
                        <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: d.color }} />
                        <span className="flex-1 text-slate-600">{d.label}</span>
                        <span className="font-bold text-slate-800 tabular-nums">{d.n}</span>
                        <span className="w-9 text-right text-slate-400 tabular-nums">{pct(d.n, temuanOpen.length)}%</span>
                      </div>
                    ))}
                  </div>
                </div>
              </section>
            </div>

            {/* 4. Ringkasan LHA & RTL — dua tabel berdampingan, baca saja */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <section className={`${card} overflow-hidden`}>
                <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800" style={heading}>Laporan Hasil Audit (LHA)</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">{lhaTerbit.length} terbit · {lhaBelum.length} belum disetujui</p>
                  </div>
                  <LihatSemua open={lhaAll} total={lhaRows.length} onClick={() => setLhaAll(v => !v)} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead><tr><TH>No.</TH><TH>Unit Kerja</TH><TH>Jenis Audit</TH><TH>Status</TH><TH>Tanggal Terbit</TH></tr></thead>
                    <tbody>
                      {(lhaAll ? lhaRows : lhaRows.slice(0, MAX_ROWS)).map((l, i) => {
                        const lbl = lhaLabel(l.status);
                        return (
                          <tr key={l.no} tabIndex={0} title={`Lihat detail ${l.no}`} onClick={() => setDetailLha(l.no)} onKeyDown={e => { if (e.key === "Enter") setDetailLha(l.no); }}
                            className="border-t border-slate-100 cursor-pointer hover:bg-slate-50 focus:outline-none focus:bg-blue-50/50 transition-colors">
                            <td className="px-3 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                            <td className="px-3 py-3"><div className="font-semibold text-slate-700">{l.unit}</div><div className="text-[10px] text-slate-400">{l.no}</div></td>
                            <td className="px-3 py-3 text-slate-500">{rencanaList.find(r => r.no === l.auditNo)?.jenis ?? "—"}</td>
                            <td className="px-3 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${lhaCls(lbl)}`}>{lbl}</span></td>
                            <td className="px-3 py-3 text-slate-500 whitespace-nowrap">{lbl === "Terbit" ? l.tgl : "—"}</td>
                          </tr>
                        );
                      })}
                      {lhaRows.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Belum ada LHA.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>

              <section className={`${card} overflow-hidden`}>
                <div className="px-5 pt-5 pb-3 flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-bold text-slate-800" style={heading}>Tindak Lanjut Rekomendasi (RTL)</h2>
                    <p className="text-[11px] text-slate-400 mt-0.5">{rtlClose} selesai · {rtlTerlambat.length} terlambat · diurutkan menurut urgensi</p>
                  </div>
                  <LihatSemua open={rtlAll} total={rtlSorted.length} onClick={() => setRtlAll(v => !v)} />
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-[11px]">
                    <thead><tr><TH>No.</TH><TH>Unit Kerja</TH><TH>Prioritas</TH><TH>Status</TH><TH>Target Selesai</TH></tr></thead>
                    <tbody>
                      {(rtlAll ? rtlSorted : rtlSorted.slice(0, MAX_ROWS)).map((r, i) => (
                        <tr key={r.id} tabIndex={0} title="Lihat detail RTL" onClick={() => setDetailRtl(r.id)} onKeyDown={e => { if (e.key === "Enter") setDetailRtl(r.id); }}
                          className="border-t border-slate-100 cursor-pointer hover:bg-slate-50 focus:outline-none focus:bg-blue-50/50 transition-colors">
                          <td className="px-3 py-3 text-slate-400 tabular-nums">{i + 1}</td>
                          <td className="px-3 py-3"><div className="font-semibold text-slate-700">{r.unit}</div><div className="text-[10px] text-slate-400 truncate max-w-[150px]">{r.rencana}</div></td>
                          <td className="px-3 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md ${prioCls(r.prioritas)}`}>{r.prioritas}</span></td>
                          <td className="px-3 py-3"><span className={`text-[10px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${effCls(r.eff)}`}>{effLabel(r.eff)}</span></td>
                          <td className={`px-3 py-3 whitespace-nowrap ${r.eff === "Terlambat" ? "font-semibold text-orange-600" : "text-slate-500"}`}>{r.target}</td>
                        </tr>
                      ))}
                      {rtlSorted.length === 0 && <tr><td colSpan={5} className="px-3 py-6 text-center text-slate-400">Belum ada RTL.</td></tr>}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
          </div>

          {/* ── Kolom kanan ── */}
          <aside className="flex flex-col gap-4 min-w-0">
            {/* 3. Perhatian pimpinan */}
            <section className={`${card} overflow-hidden`}>
              <div className="px-5 py-3.5 flex items-center gap-2.5" style={{ background: "linear-gradient(90deg,#fef2f2,#fff)" }}>
                <span className="w-7 h-7 rounded-full bg-red-100 text-red-600 flex items-center justify-center"><IconAlert className="w-4 h-4" /></span>
                <div className="flex-1">
                  <h2 className="text-sm font-bold text-slate-800" style={heading}>Perhatian Pimpinan</h2>
                  <p className="text-[10px] text-slate-400">Diurutkan menurut risiko & urgensi</p>
                </div>
              </div>
              <div className="divide-y divide-slate-100">
                {isuList.map(isu => (
                  <button key={isu.key} onClick={() => setDetailIsu(isu.key)}
                    className="w-full text-left px-5 py-3.5 flex items-center gap-3 hover:bg-slate-50 transition-colors group">
                    <span className="w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0" style={{ background: isu.tint, color: isu.tone }}>{isu.icon}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-800">{isu.judul}</div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">{isu.ringkas}</div>
                    </div>
                    <IconArrow className="w-4 h-4 text-slate-300 group-hover:text-slate-500 flex-shrink-0" />
                  </button>
                ))}
                {isuList.length === 0 && <div className="px-5 py-6 text-center text-[11px] text-slate-400">Tidak ada isu yang memerlukan perhatian.</div>}
              </div>
            </section>

            {/* Progres program audit */}
            <section className={`${card} p-5`}>
              <h2 className="text-sm font-bold text-slate-800" style={heading}>Progres Program Audit {TAHUN}</h2>
              <div className="flex gap-0.5 h-2.5 rounded-full overflow-hidden mt-3 bg-slate-100">
                {[[nSelesai, "#22c55e"], [nBerjalan, "#3b82f6"], [nRencana, "#cbd5e1"]].map(([n, c], i) => (n as number) > 0 && <div key={i} style={{ flex: n as number, background: c as string }} />)}
              </div>
              <div className="flex flex-col gap-2 mt-3">
                {([["Selesai", nSelesai, "#22c55e"], ["Berjalan", nBerjalan, "#3b82f6"], ["Rencana", nRencana, "#cbd5e1"]] as const).map(([l, n, c]) => (
                  <div key={l} className="flex items-center gap-2 text-[11px]">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }} />
                    <span className="flex-1 text-slate-600">{l}</span>
                    <span className="font-bold text-slate-800 tabular-nums">{n}</span>
                    <span className="w-9 text-right text-slate-400 tabular-nums">{pct(n, nProg)}%</span>
                  </div>
                ))}
              </div>
              <p className="text-[10px] text-slate-400 mt-3">Dari {nProg} program PKPT yang disetujui.</p>
            </section>

            {/* Riwayat audit ringkas */}
            <section className={`${card} p-5`}>
              <h2 className="text-sm font-bold text-slate-800" style={heading}>Riwayat Audit</h2>
              <p className="text-[11px] text-slate-400 mt-0.5">Ringkasan {riwayatTahun[riwayatTahun.length - 1]?.[0]} – {riwayatTahun[0]?.[0]}</p>
              <div className="mt-3 rounded-xl border border-slate-100 divide-y divide-slate-100">
                {riwayatTahun.map(([th, r]) => (
                  <div key={th} className="flex items-center gap-3 px-3 py-2.5 text-[11px]">
                    <span className="text-sm font-bold text-slate-800 w-11 tabular-nums" style={heading}>{th}</span>
                    <span className="text-slate-500 flex-1">{r.program} program</span>
                    <span className="flex items-center gap-1 text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-green-500" />{r.selesai} selesai</span>
                    {r.berjalan > 0 && <span className="flex items-center gap-1 text-slate-500"><span className="w-1.5 h-1.5 rounded-full bg-blue-500" />{r.berjalan} berjalan</span>}
                  </div>
                ))}
              </div>
              <div className="mt-4 rounded-xl bg-blue-50/70 border border-blue-100 px-3 py-2.5 flex gap-2.5">
                <span className="w-5 h-5 rounded-full bg-blue-600 text-white text-[10px] font-bold flex items-center justify-center flex-shrink-0">i</span>
                <p className="text-[10px] text-slate-600 leading-relaxed">Dashboard ini menampilkan ringkasan untuk pengambilan keputusan pimpinan. Seluruh data bersifat <strong>baca saja</strong> — status, verifikasi, dan persetujuan dokumen dilakukan oleh SPI.</p>
              </div>
            </section>
          </aside>
        </div>
        </div>

        {/* Detail perhatian pimpinan (baca saja) */}
        {isuAktif && (
          <RektorDetailModal title={isuAktif.judul} rows={[]} onClose={() => setDetailIsu(null)}
            extra={
              <div className="flex flex-col gap-2 max-h-[60vh] overflow-y-auto -mt-1">
                <p className="text-[11px] text-slate-500">{isuAktif.ringkas}</p>
                {isuAktif.detail.map((d, i) => (
                  <div key={i} className="rounded-xl border border-slate-100 px-3 py-2.5 flex items-start gap-3">
                    <span className="text-[10px] font-bold text-slate-400 tabular-nums mt-0.5">{i + 1}</span>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-700 leading-snug">{d.utama}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{d.meta}</div>
                    </div>
                    <span className={`text-[9px] font-semibold px-2 py-0.5 rounded-md whitespace-nowrap ${d.badgeCls}`}>{d.badge}</span>
                  </div>
                ))}
              </div>
            } />
        )}
        {(() => {
          const l = laporanList.find(x => x.no === detailLha);
          if (!l) return null;
          const rows: [string, React.ReactNode][] = [
            ["No LHA", l.no], ["Audit", l.auditNo ? `${l.auditNo} — ${rencanaList.find(a => a.no === l.auditNo)?.jenis ?? ""}` : "—"],
            ["Unit", l.unit], ["Tanggal", l.tgl], ["Status", lhaLabel(l.status)],
            ["Temuan", l.temuan], ["Rekomendasi", l.rekomendasi], ["Revisi ke", l.revisiKe ?? 0],
          ];
          return (
            <RektorDetailModal title="Detail LHA" rows={rows} onClose={() => setDetailLha(null)}
              link={l.status === "Diterima" ? l.link : null}
              extra={l.riwayatRevisi && l.riwayatRevisi.length > 0 ? (
                <div className="mt-3">
                  <div className="text-[10px] font-bold text-gray-500 uppercase mb-1">Riwayat Revisi</div>
                  {l.riwayatRevisi.map((rv, i) => <div key={i} className="text-[11px] text-gray-600">{rv.tgl} — {rv.catatan}</div>)}
                </div>
              ) : null} />
          );
        })()}
        {(() => {
          const r = rtlRows.find(x => x.id === detailRtl);
          if (!r) return null;
          const rows: [string, React.ReactNode][] = [
            ["Temuan", r.temuan?.deskripsi ?? r.temuanId], ["Unit", r.unit], ["Prioritas", r.prioritas],
            ["Rencana Tindak Lanjut", r.rencana], ["PIC", r.pic], ["Target", r.target],
            ["Status", <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${effCls(r.eff)}`}>{effLabel(r.eff)}</span>],
            ["Progres", `${r.progres}%`], ["Tanggal Selesai", r.tglSelesai || "—"],
          ];
          return <RektorDetailModal title="Detail RTL" rows={rows} onClose={() => setDetailRtl(null)} link={r.bukti} />;
        })()}
      </main>

      {/* Logout confirm */}
      {showSettings && (
        <PengaturanSistem user={user} onClose={() => setShowSettings(false)}
          onPasswordChanged={() => { setPwWarn(false); setUsers(prev => prev.map(u => u.email === user.email ? { ...u, mustChange: false } : u)); }}
          userList={users} setUserList={setUsers} onUpdateUser={onUpdateUser} config={config} setConfig={setConfig} prefs={prefs} setPrefs={setPrefs} />
      )}
      {showLogout && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={() => setShowLogout(false)}>
          <div className="bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={e => e.stopPropagation()}>
            <div className="text-2xl mb-3"></div>
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

export default function Dashboard({ user, onLogout, users, setUsers, onUpdateUser, config, setConfig, prefs, setPrefs }: {
  user: User; onLogout: () => void; users: UserRow[]; setUsers: React.Dispatch<React.SetStateAction<UserRow[]>>;
  onUpdateUser: (patch: Partial<User>) => void; config: AppConfig; setConfig: React.Dispatch<React.SetStateAction<AppConfig>>;
  prefs: PrefsMap; setPrefs: React.Dispatch<React.SetStateAction<PrefsMap>>;
}) {
  const [sidebarOpen, setSidebarOpen]             = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [showNotifModal, setShowNotifModal]       = useState(false);
  const [showSettings, setShowSettings]           = useState(false);
  const [pwWarn, setPwWarn]                       = useState(!!user.mustChangePassword);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [rapatList, setRapatList]                 = useState<Rapat[]>(RAPAT_AWAL);
  const [suratKeluar, setSuratKeluar]             = useState<SuratKeluarItem[]>(SURAT_KELUAR_AWAL);
  const [readNotifIds, setReadNotifIds] = useState<Set<number>>(new Set());

  type Notif = { id: number; icon: string; title: string; body: string; time: string; tag: string; roles: string[]; unit?: string };
  const [allNotifs, setAllNotifs] = useState<Notif[]>([
    { id:1,  icon:"", title:"RTL Sarpras jatuh tempo",              body:"Tindak lanjut rekomendasi R-003 batas akhir 3 hari lagi.",         time:"5 mnt lalu",  tag:"Deadline", roles:["full","pengawasan"] },
    { id:2,  icon:"", title:"Audit BAAK selesai",                    body:"LHA sudah diterbitkan dan tersedia di modul Riwayat.",              time:"1 jam lalu",  tag:"Audit",    roles:["full","pengawasan","rektor"] },
    { id:3,  icon:"", title:"Rapat Tinjauan Manajemen besok",        body:"Rapat dijadwalkan pukul 09.00 — Ruang Sidang Utama.",              time:"2 jam lalu",  tag:"Rapat",    roles:["full","pengawasan","backoffice","auditee","rektor"] },
    { id:4,  icon:"", title:"PKPT baru diunggah",                    body:"Rencana Kerja Pengawasan Tahunan 2025 telah diperbarui.",           time:"3 jam lalu",  tag:"Info",     roles:["full","backoffice"] },
    { id:5,  icon:"", title:"Auditor baru ditambahkan",              body:"Dwi Santoso, CISA — telah terdaftar di modul SDM.",                time:"Kemarin",     tag:"SDM",      roles:["full","backoffice"] },
    { id:7,  icon:"", title:"Realisasi anggaran kurang dari 80%",    body:"Penyerapan anggaran Q2 masih 67% — perlu evaluasi segera.",        time:"Hari ini",    tag:"Anggaran", roles:["full","backoffice","rektor"] },
    { id:8,  icon:"", title:"Rekomendasi baru dari auditor",         body:"2 rekomendasi baru pada audit BAAK perlu ditindaklanjuti.",        time:"6 mnt lalu",  tag:"RTL",      roles:["auditee"] },
    { id:9,  icon:"", title:"Deadline RTL #2 dalam 4 hari",          body:"Mohon segera unggah bukti tindak lanjut sebelum batas waktu.",    time:"30 mnt lalu", tag:"Deadline", roles:["auditee"] },
    { id:10, icon:"", title:"Jadwal audit unit Anda ditetapkan",     body:"Audit unit dijadwalkan mulai 5 Juni 2025.",                        time:"1 hari lalu", tag:"Audit",    roles:["auditee"] },
    { id:11, icon:"", title:"Verifikasi RTL disetujui",              body:"Tindak lanjut R-001 telah diverifikasi dan diterima auditor.",     time:"2 jam lalu",  tag:"RTL",      roles:["auditee"] },
    { id:12, icon:"", title:"Laporan Pengawasan Q2 tersedia",        body:"Ringkasan hasil audit dan status RTL semester I sudah dapat dilihat di dashboard.", time:"1 hari lalu", tag:"Audit", roles:["rektor"] },
    { id:13, icon:"", title:"Indeks Komposit naik ke 82,4%",         body:"Skor pengawasan meningkat dari Q1 (78,9%) berdasarkan 5 dimensi audit.",          time:"3 hari lalu", tag:"Info",  roles:["rektor"] },
  ]);

  function addRapat(r: Omit<Rapat, "id" | "status">) {
    const newId = Date.now();
    setRapatList(prev => [{ ...r, id: newId, status: "Terjadwal" }, ...prev]);
    const notifRoles = pesertaToRoles(r.peserta);
    setAllNotifs(prev => [{
      id: newId,
      icon: "",
      title: `Rapat baru: ${r.judul}`,
      body: `${r.tgl} · ${r.jam} · ${r.tempat} · Peserta: ${pesertaLabel(r.peserta)}`,
      time: "Baru saja",
      tag: "Rapat",
      roles: notifRoles.length > 0 ? notifRoles : ["full"],
    }, ...prev]);
  }

  const [temuanList, setTemuanList] = useState<TemuanRisiko[]>(TEMUAN_AWAL);
  const [rtlList, setRtlList] = useState<RtlItem[]>(RTL_AWAL);
  // Rencana Audit & LHA dipakai bersama oleh Pengawasan, Back Office (PKPT → Rencana Audit), dan Rektor.
  const [laporanList, setLaporanList] = useState<LaporanItem[]>(LAPORAN_AWAL);
  const [rencanaList, setRencanaList] = useState<RencanaItem[]>(RENCANA_AWAL);
  const [draftList, setDraftList] = useState<DraftTemuan[]>(DRAFT_AWAL);
  const [uploadDocs, setUploadDocs] = useState<DokLink>({});
  const [jadwalSetuju, setJadwalSetuju] = useState<JadwalSetuju>({ 7: { auditor: true, auditee: true } });
  const [pedomanBase, setPedomanBase] = useState<PedomanItem[]>(PEDOMAN_AWAL);
  const [peraturanBase, setPeraturanBase] = useState<PeraturanItem[]>(PERATURAN_AWAL);
  const [standarList, setStandarList] = useState<StandarItem[]>(STANDAR_AWAL);
  const regulasiCtxValue: RegulasiCtxType = { pedomanBase, setPedomanBase, peraturanBase, setPeraturanBase, standarList, setStandarList };
  // PKPT dipakai bersama: Back Office (penyusunan), Ketua (persetujuan), Auditor (diteruskan ke Rencana Audit), Anggaran & Ringkasan.
  const [pkptList, setPkptList] = useState<PkptItem[]>(PKPT_AWAL);
  const [penutupan, setPenutupan] = useState<Record<string, PenutupanAudit>>({});
  const [residualList, setResidualList] = useState<ResidualRisk[]>([]);
  const lapanganCtxValue: LapanganCtxType = { penutupan, setPenutupan, residualList, setResidualList, draftList, setDraftList, uploadDocs, setUploadDocs, jadwalSetuju, setJadwalSetuju };
  const laporanView = useMemo(() => laporanList.map(l => {
    if (!l.auditNo) return l;
    const ids = temuanList.filter(t => t.auditNo === l.auditNo).map(t => t.id);
    return { ...l, temuan: ids.length, rekomendasi: rtlList.filter(r => ids.includes(r.temuanId)).length };
  }), [laporanList, temuanList, rtlList]);
  const auditCtxValue: AuditCtxType = { laporanList: laporanView, setLaporanList, rencanaList, setRencanaList };

  function pushNotif(n: Omit<Notif, "id" | "icon" | "time">) {
    setAllNotifs(prev => [{ ...n, id: Math.max(0, ...prev.map(x => x.id)) + 1, icon: "", time: "Baru saja" }, ...prev]);
  }

  function addTemuan(t: Omit<TemuanRisiko, "status">) {
    if (temuanList.some(x => x.id === t.id)) {
      const n = Math.max(0, ...temuanList.map(x => parseInt(x.id.replace(/\D/g, "")) || 0)) + 1;
      t = { ...t, id: `R-${String(n).padStart(3, "0")}` };
    }
    setTemuanList(prev => [{ ...t, status: "Belum Ditindak" }, ...prev]);
    pushNotif({ title: `Temuan risiko baru — ${t.unit}`, body: `${t.id}: ${t.deskripsi}. Mohon susun rencana tindak lanjut.`, tag: "RTL", roles: ["auditee"], unit: t.unit });
  }

  function ajukanRtl(temuanId: string, v: { rencana: string; pic: string; target: string; link: string | null }) {
    const t = temuanList.find(x => x.id === temuanId);
    if (!t || rtlList.some(r => r.temuanId === temuanId)) return;
    setRtlList(prev => [{
      id: Math.max(0, ...prev.map(x => x.id)) + 1, temuanId, unit: t.unit,
      rencana: v.rencana, pic: v.pic, target: v.target ? tglIsoToId(v.target) : "-",
      link: v.link, progres: 0, bukti: null, hasil: null, catatan: "", verifikator: "—", tglSelesai: "—",
    }, ...prev]);
    setTemuanList(prev => prev.map(x => x.id === temuanId ? { ...x, status: "Proses" } : x));
    pushNotif({ title: `RTL baru — ${t.unit}`, body: `${temuanId}: ${v.rencana} (PIC ${v.pic}).`, tag: "RTL", roles: ["full", "pengawasan"] });
  }

  function setProgresRtl(id: number, progres: number) {
    setRtlList(prev => prev.map(r => r.id === id ? { ...r, progres: Math.max(0, Math.min(100, progres)) } : r));
  }

  function kirimBukti(id: number, link: string) {
    const r = rtlList.find(x => x.id === id);
    if (!r) return;
    setRtlList(prev => prev.map(x => x.id === id ? { ...x, bukti: link, tlStatus: x.tlStatus === "Close" ? "Close" : "Progres", catatan: "" } : x));
    pushNotif({ title: `Bukti RTL diunggah — ${r.unit}`, body: `${r.temuanId}: Bukti pelaksanaan telah diunggah (${r.rencana}).`, tag: "RTL", roles: ["full", "pengawasan"] });
  }

  function verifikasiRtl(id: number, hasil: "Diterima" | "Ditolak", catatan: string, verifikator: string) {
    const r = rtlList.find(x => x.id === id);
    if (!r) return;
    setRtlList(prev => prev.map(x => x.id === id ? { ...x, hasil, catatan: catatan.trim(), verifikator, tglSelesai: hasil === "Diterima" ? RTL_TODAY_LABEL : "—" } : x));
    setTemuanList(prev => prev.map(x => x.id === r.temuanId ? { ...x, status: hasil === "Diterima" ? "Selesai" : "Proses" } : x));
    pushNotif({
      title: hasil === "Diterima" ? "Verifikasi RTL disetujui" : "Verifikasi RTL ditolak",
      body: `${r.temuanId}: ${r.rencana}${hasil === "Ditolak" && catatan.trim() ? ` — Catatan: ${catatan.trim()}` : ""}`,
      tag: "RTL", roles: ["auditee", "full", "pengawasan", "rektor"].filter(x => x !== "rektor" || hasil === "Diterima"), unit: r.unit,
    });
  }

  function setTlStatusRtl(id: number, status: TlStatus) {
    const r = rtlList.find(x => x.id === id);
    if (!r) return;
    setRtlList(prev => prev.map(x => x.id === id ? { ...x, tlStatus: status, tglSelesai: status === "Close" ? RTL_TODAY_LABEL : "—" } : x));
    setTemuanList(prev => prev.map(x => x.id === r.temuanId ? { ...x, status: status === "Close" ? "Selesai" : "Proses" } : x));
    if (r.tlStatus !== status) {
      pushNotif({ title: `Status RTL diperbarui — ${status}`, body: `RTL-${String(r.id).padStart(3, "0")} (${r.temuanId}): ${r.rencana}`, tag: "RTL", roles: ["auditee"], unit: r.unit });
    }
  }

  function updateRtl(id: number, patch: { rencana: string; pic: string; target: string; link: string | null; bukti: string | null }) {
    const r = rtlList.find(x => x.id === id);
    if (!r) return;
    const buktiBaru = !!patch.bukti && patch.bukti !== r.bukti;
    setRtlList(prev => prev.map(x => x.id === id ? {
      ...x, ...patch,
      tlStatus: buktiBaru && rtlTlStatus(x) === "Diterima" ? "Progres" : x.tlStatus,
    } : x));
    pushNotif({ title: `RTL diperbarui — ${r.unit}`, body: `RTL-${String(id).padStart(3, "0")} (${r.temuanId}): ${buktiBaru ? "Bukti pelaksanaan diperbarui." : "Isian RTL diperbarui."}`, tag: "RTL", roles: ["full", "pengawasan"] });
  }

  function tambahRtl(temuanId: string, v: { rencana: string; pic: string; target: string; link: string | null; bukti: string | null }) {
    const t = temuanList.find(x => x.id === temuanId);
    if (!t) return;
    const id = Math.max(0, ...rtlList.map(x => x.id)) + 1;
    setRtlList(prev => [{
      id, temuanId, unit: t.unit, rencana: v.rencana, pic: v.pic, target: v.target,
      link: v.link, progres: 0, bukti: v.bukti, hasil: null, catatan: "", verifikator: "—", tglSelesai: "—",
      tlStatus: v.bukti ? "Progres" : "Diterima",
    }, ...prev]);
    setTemuanList(prev => prev.map(x => x.id === temuanId && x.status === "Belum Ditindak" ? { ...x, status: "Proses" } : x));
    pushNotif({ title: `RTL baru — ${t.unit}`, body: `RTL-${String(id).padStart(3, "0")} (${temuanId}): ${v.rencana} (PIC ${v.pic}).`, tag: "RTL", roles: ["full", "pengawasan"] });
  }

  const temuanCtxValue: TemuanCtxType = { temuanList, rtlList, addTemuan, ajukanRtl, setProgresRtl, kirimBukti, verifikasiRtl, setTlStatusRtl, updateRtl, tambahRtl };

  function updateRapat(id: number, r: Omit<Rapat, "id" | "status">) {
    const lama = rapatList.find(x => x.id === id);
    setRapatList(prev => prev.map(x => x.id === id ? { ...x, ...r } : x));
    // Entry Meeting dijadwal ulang → persetujuan auditor & auditee harus diberikan ulang
    if (lama && (lama.auditNo || r.auditNo) && (lama.tgl !== r.tgl || lama.jam !== r.jam || lama.tempat !== r.tempat)) {
      setJadwalSetuju(prev => { const next = { ...prev }; delete next[id]; return next; });
      const roles = pesertaToRoles(r.peserta);
      pushNotif({ title: `Jadwal ulang: ${r.judul}`, body: `${r.tgl} · ${r.jam} · ${r.tempat}. Mohon setujui ulang tanggal Entry Meeting.`, tag: "Rapat", roles: roles.length > 0 ? roles : ["full"] });
    }
  }

  function selesaiRapat(id: number) {
    setRapatList(prev => prev.map(r => r.id === id ? { ...r, status: "Selesai" } : r));
  }

  function batalkanRapat(id: number) {
    setRapatList(prev => prev.map(r => r.id === id ? { ...r, status: "Batal" } : r));
    // persetujuan jadwal Entry Meeting tidak berlaku lagi setelah dibatalkan
    setJadwalSetuju(prev => { if (!(id in prev)) return prev; const next = { ...prev }; delete next[id]; return next; });
  }

  const myPrefs = prefs[user.email];
  const TAG_KEYWORD: Record<string,string> = { Deadline:"deadline", Rapat:"rapat", Audit:"audit", RTL:"rtl", Arsip:"arsip", SDM:"auditor" };
  const notifAllowed = (tag: string) => {
    const kw = TAG_KEYWORD[tag];
    if (!myPrefs || !kw) return true;
    const keys = Object.keys(myPrefs).filter(k => k.toLowerCase().includes(kw));
    return keys.length === 0 || keys.some(k => myPrefs[k]);
  };
  const myNotifs = allNotifs.filter(n => n.roles.includes(user.role) && notifAllowed(n.tag) && (!n.unit || user.role !== "auditee" || n.unit === user.unit));
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
  const navGroupsView = user.role === "auditee"
    ? navGroups.map(g => {
        if (g.key !== "pengawasan") return g;
        const by = (k: string) => g.items.find(i => i.sectionKey === k)!;
        const rest = g.items.filter(i => !["ringkasan", "kalender", "audit", "risiko", "regulasi"].includes(i.sectionKey));
        return { ...g, items: [
          by("ringkasan"),
          { ...by("audit"), children: ["Pemberitahuan & Jadwal", "Entry Meeting", "Draft Temuan & Konfirmasi", "Exit Meeting"] },
          by("risiko"),
          ...rest.map(it => it.sectionKey === "riwayat" ? { ...it, label: "Riwayat Audit", children: [] as string[] } : it.sectionKey === "rtl" ? { ...it, children: ["Tindak Lanjut (RTL)"] } : it),
          { ...by("kalender"), children: [] as string[] },
        ] };
      })
    : navGroups;
  const defaultItem = navGroupsView.find(g => g.key === defaultModule)?.items.find(i => i.sectionKey === defaultSection);

  const [activeModule, setActiveModule]     = useState(defaultModule);
  const [activeSection, setActiveSection]   = useState(defaultSection);
  const [activeSubSection, setActiveSubSection] = useState(defaultItem?.children?.[0] ?? "");
  const [suratTabHint, setSuratTabHint] = useState<"Masuk" | "Keluar">("Masuk");

  const canAccess = (key: string) => {
    if (user.role === "full")       return true;
    if (user.role === "rektor")     return true;          // lihat semua, read-only
    if (user.role === "pengawasan") return key === "pengawasan";
    if (user.role === "backoffice") return key === "backoffice";
    if (user.role === "auditee")    return key === "pengawasan";
    return false;
  };

  function toggleSidebar() {
    if (window.innerWidth < 768) {
      setMobileSidebarOpen(v => !v);
    } else {
      setSidebarOpen(v => !v);
    }
  }

  function navigate(module: string, section: string) {
    setActiveModule(module);
    setActiveSection(section);
    const firstChild = navGroupsView.find(g => g.key === module)?.items.find(i => i.sectionKey === section)?.children?.[0] ?? "";
    setActiveSubSection(firstChild);
    setMobileSidebarOpen(false);
  }

  const navigateFull: NavFn = (module, section, subSection, suratTab) => {
    setActiveModule(module);
    setActiveSection(section);
    setActiveSubSection(subSection);
    if (suratTab) setSuratTabHint(suratTab);
    setMobileSidebarOpen(false);
  };

  const activeNavItem = navGroupsView.find(g => g.key === activeModule)?.items.find(i => i.sectionKey === activeSection);
  // Auditee: Pemetaan Risiko digabung ke halaman Temuan Risiko
  const activeChildren = (activeNavItem?.children ?? []).filter(c => !(user.role === "auditee" && c === "Pemetaan Risiko"));

  const roleBadge = ({
    full:        { label: "Akses Penuh",                          style: { background: "var(--tsu-teal-light)", color: "var(--tsu-teal-dark)" } },
    rektor:      { label: "Rektor — Lihat Saja",                  style: { background: "#fef2f2", color: "#991b1b" } },
    pengawasan:  { label: "Modul Pengawasan",                     style: { background: "var(--tsu-teal-light)", color: "var(--tsu-teal)" } },
    backoffice:  { label: "Back Office",                          style: { background: "var(--tsu-gold-light)", color: "#a0620a" } },
    auditee:     { label: `Auditee — ${user.unit ?? "Unit"}`,     style: { background: "#f5f3ff", color: "#7c3aed" } },
  } as Record<string, { label: string; style: React.CSSProperties }>)[user.role];

  const activeLabel = [...navGroupsView.flatMap(g => g.items)].find(
    i => i.sectionKey === activeSection
  )?.label ?? "Dashboard SPI";

  if (user.role === "rektor") {
    return (
      <RapatCtx.Provider value={{ rapatList, addRapat, batalkanRapat, selesaiRapat, updateRapat }}>
    <SuratKeluarCtx.Provider value={{ suratKeluar, setSuratKeluar }}>
        <TemuanCtx.Provider value={temuanCtxValue}>
        <AuditCtx.Provider value={auditCtxValue}><LapanganCtx.Provider value={lapanganCtxValue}><PkptCtx.Provider value={{ pkptList, setPkptList }}><RegulasiCtx.Provider value={regulasiCtxValue}>
        <UserCtx.Provider value={user}>
          <RektorDashboard user={user} onLogout={onLogout} users={users} setUsers={setUsers} onUpdateUser={onUpdateUser} config={config} setConfig={setConfig} prefs={prefs} setPrefs={setPrefs} />
        </UserCtx.Provider>
        </RegulasiCtx.Provider></PkptCtx.Provider></LapanganCtx.Provider></AuditCtx.Provider>
        </TemuanCtx.Provider>
      </SuratKeluarCtx.Provider>
      </RapatCtx.Provider>
    );
  }

  return (
    <NavCtx.Provider value={navigateFull}>
    <RapatCtx.Provider value={{ rapatList, addRapat, batalkanRapat, selesaiRapat, updateRapat }}>
    <SuratKeluarCtx.Provider value={{ suratKeluar, setSuratKeluar }}>
    <NotifyCtx.Provider value={pushNotif}>
    <TemuanCtx.Provider value={temuanCtxValue}>
    <AuditCtx.Provider value={auditCtxValue}><LapanganCtx.Provider value={lapanganCtxValue}><PkptCtx.Provider value={{ pkptList, setPkptList }}><RegulasiCtx.Provider value={regulasiCtxValue}>
    <UserCtx.Provider value={user}>
    <div className="flex h-dvh overflow-hidden" style={{ fontFamily: "'Inter', sans-serif", background: "#f1f5f9" }}>
      {/* Mobile sidebar backdrop */}
      {mobileSidebarOpen && (
        <div className="fixed inset-0 z-30 bg-black/50 md:hidden" onClick={() => setMobileSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={[
          "flex-shrink-0 flex flex-col overflow-y-auto transition-all duration-300",
          // Mobile: fixed overlay, translate in/out
          "fixed top-0 left-0 z-40 w-60 h-dvh",
          mobileSidebarOpen ? "translate-x-0" : "-translate-x-full",
          // Desktop: in-flow, width-based collapse
          "md:relative md:h-auto md:z-auto md:translate-x-0",
          sidebarOpen ? "md:w-60 md:min-w-[240px]" : "md:w-0 md:min-w-0 md:overflow-hidden",
        ].join(" ")}
        style={{ background: "linear-gradient(180deg, var(--tsu-teal-dark) 0%, var(--tsu-teal) 100%)" }}
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
          {navGroupsView.filter((g) => canAccess(g.key)).map((group) => (
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
        <header className="flex-shrink-0 bg-white border-b border-gray-200 flex items-center gap-2 md:gap-4 px-3 md:px-6 py-3">
          <button onClick={toggleSidebar} className="text-gray-500 hover:text-gray-700 transition-colors flex-shrink-0">
            <IconMenu className="w-5 h-5" />
          </button>
          <div className="flex-1 min-w-0">
            <h1 className="text-base md:text-xl font-bold text-gray-800 truncate" style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}>{activeLabel}</h1>
            <p className="hidden md:block text-xs text-gray-400">{activeModule === "pengawasan" ? "Modul Pengawasan SPI" : "Modul Back Office SPI"}</p>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-gray-500 border border-gray-200 rounded-lg px-3 py-2 flex-shrink-0">
            <span>Periode:</span>
            <span className="font-semibold text-gray-700">Tahun 2025</span>
            <IconCalendar className="w-4 h-4 text-gray-400" />
          </div>
          <div className="relative flex-shrink-0">
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
          <div className="flex items-center gap-2 flex-shrink-0">
            <div className={`w-8 h-8 rounded-full overflow-hidden flex items-center justify-center text-white font-bold text-xs flex-shrink-0 ${user.avatarColor}`}>
              {user.foto ? <img src={user.foto} alt="" className="w-full h-full object-cover" /> : user.initials}
            </div>
            <div className="hidden md:block">
              <div className="text-xs font-semibold text-gray-700 leading-tight">{user.name}</div>
              <div className="flex items-center gap-1">
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded-full" style={roleBadge.style}>{roleBadge.label}</span>
              </div>
            </div>
            <IconChevron className="hidden md:block w-4 h-4 text-gray-400" />
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
                  style={activeSubSection === child || activeSubSection.startsWith(`${child} › `)
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
        <main className="flex-1 overflow-y-auto p-3 md:p-5">
          {pwWarn && (
            <div className="mb-4 rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <div className="text-xs font-bold text-amber-800">Segera ganti password sementara Anda</div>
                <p className="text-[11px] text-amber-700 mt-0.5">Akun Anda masih memakai password sementara dari Kepala SPI. Demi keamanan, ganti dengan password pribadi di Pengaturan Sistem.</p>
              </div>
              <button onClick={() => setShowSettings(true)}
                className="text-xs font-bold px-3 py-2 rounded-xl text-white flex-shrink-0" style={{ background:"var(--tsu-teal)" }}>
                Ubah Password Sekarang
              </button>
            </div>
          )}
          {/* Indeks komposit shown for full-access & rektor on pengawasan ringkasan */}
          {user.role === "full" && activeModule === "pengawasan" && activeSection === "ringkasan" && (
            <div className="mb-4"><IndeksKomposit /></div>
          )}
          {activeModule === "pengawasan" && <TabPengawasan section={activeSection} subSection={activeSubSection} />}
          {activeModule === "backoffice" && <TabBackoffice section={activeSection} subSection={activeSubSection} suratTabHint={suratTabHint} />}
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
      <PengaturanSistem user={user} onClose={() => setShowSettings(false)} onPasswordChanged={() => { setPwWarn(false); setUsers(prev => prev.map(u => u.email === user.email ? { ...u, mustChange: false } : u)); }} userList={users} setUserList={setUsers} onUpdateUser={onUpdateUser} config={config} setConfig={setConfig} prefs={prefs} setPrefs={setPrefs} />
    )}

    {/* Konfirmasi Keluar */}
    {showLogoutConfirm && (
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
        style={{ background:"rgba(15,23,42,0.6)", backdropFilter:"blur(6px)" }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="px-6 pt-6 pb-2 flex flex-col items-center text-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-red-50 flex items-center justify-center text-2xl">
              
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
              <span className="text-amber-500 flex-shrink-0 mt-0.5"></span>
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
    </RegulasiCtx.Provider></PkptCtx.Provider></LapanganCtx.Provider></AuditCtx.Provider>
    </TemuanCtx.Provider>
    </NotifyCtx.Provider>
    </SuratKeluarCtx.Provider>
    </RapatCtx.Provider>
    </NavCtx.Provider>
  );
}
