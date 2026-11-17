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

// ---------------------------------------------------------------------------
// Hunter Command Center: target, temuan, rantai serangan, log pemakaian AI.
// ---------------------------------------------------------------------------

export type TargetKind = "web" | "contract";

export interface Target {
  id: string;
  kind: TargetKind;
  name: string;
  url?: string;
  contractAddress?: string;
  chainId?: number;
  scopeNote: string;
  authorized: boolean;
  demo?: boolean;
  createdAt: string;
}

export function targetLabel(t: Target): string {
  if (t.kind === "web") return t.url ?? t.name;
  return t.contractAddress ?? t.name;
}

export type FindingStatus = "Baru" | "Dikonfirmasi" | "Dilaporkan" | "Dibayar" | "Ditolak";

export interface Finding {
  id: string;
  title: string;
  targetId: string;
  vulnClass: string;
  skillName?: string;
  severity: Severity;
  description: string;
  steps: string;
  status: FindingStatus;
  demo?: boolean;
  createdAt: string;
  /** Asal temuan: "manual" (default) atau "nuclei" (hasil Scan URL). */
  source?: string;
  /** ID job scan sumber (bila source = "nuclei"). */
  scanId?: string;
  /** Template Nuclei sumber (bila source = "nuclei"). */
  templateId?: string;
  /** URL yang cocok dari output Nuclei (bila source = "nuclei"). */
  matchedUrl?: string;
}

export const FINDING_STATUSES: FindingStatus[] = [
  "Baru",
  "Dikonfirmasi",
  "Dilaporkan",
  "Dibayar",
  "Ditolak",
];

export const FINDING_STATUS_FLOW: Record<FindingStatus, FindingStatus[]> = {
  Baru: ["Dikonfirmasi", "Ditolak"],
  Dikonfirmasi: ["Dilaporkan", "Ditolak"],
  Dilaporkan: ["Dibayar", "Ditolak"],
  Dibayar: [],
  Ditolak: [],
};

export interface ChainStep {
  label: string;
  findingId?: string;
}

export interface AttackChain {
  id: string;
  name: string;
  steps: ChainStep[];
  impact: string;
  demo?: boolean;
  createdAt: string;
}

export type AiPromptKind = "analisis-temuan" | "recon-target" | "rantai-serangan";

export interface AiUsageEntry {
  id: string;
  at: string;
  model: string;
  kind: string;
  promptTokens?: number;
  completionTokens?: number;
  totalTokens?: number;
  ok: boolean;
  note?: string;
}
