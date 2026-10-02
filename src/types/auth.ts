export type Role = "full" | "pengawasan" | "backoffice" | "auditee" | "rektor";

export interface User {
  email: string;
  password: string;
  name: string;
  jabatan: string;
  initials: string;
  role: Role;
  avatarColor: string;
  unit?: string;
  mustChangePassword?: boolean;
  aktif?: boolean;
  foto?: string;
}

export interface AppConfig {
  namaSystem: string;
  namaInstitusi: string;
  tahunAnggaran: string;
  periodeAudit: string;
  logo?: string;
}

export const DEFAULT_CONFIG: AppConfig = {
  namaSystem: "SIMSPI TSU",
  namaInstitusi: "Universitas Tiga Serangkai",
  tahunAnggaran: "2026",
  periodeAudit: "2026",
};

export function makeInitials(nama: string) {
  return nama.replace(/,.*$/, "").split(" ").filter(Boolean).slice(0, 2).map((w) => w[0]?.toUpperCase()).join("");
}

export const ACCOUNTS: User[] = [
  {
    email: "ketua@spi.tsu.ac.id",
    password: "ketua123",
    name: "Setiyowati, S.Kom., M.Kom.",
    jabatan: "Ketua SPI",
    initials: "SW",
    role: "full",
    avatarColor: "bg-orange-400",
  },
  {
    email: "auditor@spi.tsu.ac.id",
    password: "audit123",
    name: "Budi Santoso, S.E.",
    jabatan: "Auditor Internal",
    initials: "BS",
    role: "pengawasan",
    avatarColor: "bg-blue-500",
  },
  {
    email: "backoffice@spi.tsu.ac.id",
    password: "office123",
    name: "Dewi Rahayu, A.Md.",
    jabatan: "Staff Back Office",
    initials: "DR",
    role: "backoffice",
    avatarColor: "bg-teal-500",
  },
  {
    email: "baak@auditee.tsu.ac.id",
    password: "baak123",
    name: "Ahmad Fauzi, S.Pd.",
    jabatan: "Kabag BAAK",
    initials: "AF",
    role: "auditee",
    unit: "BAAK",
    avatarColor: "bg-purple-500",
  },
  {
    email: "rektor@tsu.ac.id",
    password: "rektor123",
    name: "Prof. Dr. Hendra Wijaya, M.M.",
    jabatan: "Rektor",
    initials: "HW",
    role: "rektor",
    avatarColor: "bg-red-600",
  },
];
