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
