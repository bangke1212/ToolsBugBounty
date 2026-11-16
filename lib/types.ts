export type Severity = "Critical" | "High" | "Medium" | "Low";

export type ReportStatus =
  | "Baru"
  | "Triase"
  | "Diterima"
  | "Ditolak"
  | "Duplikat"
  | "Dibayar";

export interface ChainInfo {
  id: number;
  name: string;
  network: string;
  testnet: boolean;
  symbol: string;
  explorer: string;
}

export interface TierRewards {
  Critical: number;
  High: number;
  Medium: number;
  Low: number;
}

export interface Program {
  id: string;
  name: string;
  description: string;
  chainId: number;
  token: string;
  pool: number;
  escrowLocked: number;
  totalPaid: number;
  tiers: TierRewards;
  demo?: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  title: string;
  programId: string;
  vulnClass: string;
  skillName?: string;
  severity: Severity;
  description: string;
  poc: string;
  target: string;
  hunter: string;
  status: ReportStatus;
  demo?: boolean;
  createdAt: string;
  paidAmount?: number;
}

export interface Payout {
  id: string;
  reportId: string;
  reportTitle: string;
  programName: string;
  hunter: string;
  chainId: number;
  amount: number;
  token: string;
  txHash: string;
  createdAt: string;
}

export const SEVERITIES: Severity[] = ["Critical", "High", "Medium", "Low"];

export const STATUS_FLOW: Record<ReportStatus, ReportStatus[]> = {
  Baru: ["Triase"],
  Triase: ["Diterima", "Ditolak", "Duplikat"],
  Diterima: ["Dibayar"],
  Ditolak: [],
  Duplikat: [],
  Dibayar: [],
};

export function shortAddress(addr: string): string {
  if (addr.length <= 13) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

export function shortHash(hash: string): string {
  if (hash.length <= 15) return hash;
  return hash.slice(0, 10) + "..." + hash.slice(-6);
}

export function formatAmount(n: number): string {
  return n.toLocaleString("id-ID", { maximumFractionDigits: 4 });
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleString("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
