import { useCallback, useEffect, useMemo, useState } from "react";
import type { Payout, Program, Report, ReportStatus, Severity } from "./types";
import { getChain } from "./chains";

const STORAGE_KEY = "bb-onchain-v1";

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `id-${Date.now()}-${Math.floor(Math.random() * 1e9)}`;
}

function randomHex(len: number): string {
  const chars = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * 16)];
  }
  return out;
}

export function randomAddress(): string {
  return "0x" + randomHex(40);
}

export function randomTxHash(): string {
  return "0x" + randomHex(64);
}

const NOW = "2026-11-16T16:30:00+07:00";

export const SEED_PROGRAMS: Program[] = [
  {
    id: "seed-program-1",
    name: "Contoh — Protokol Lending DeFi",
    description:
      "Program bounty contoh untuk protokol lending DeFi. Scope: smart contract lending, oracle harga, dan antarmuka web.",
    chainId: 11155111,
    token: "ETH",
    pool: 10,
    escrowLocked: 10,
    totalPaid: 0,
    tiers: { Critical: 5, High: 2, Medium: 0.5, Low: 0.1 },
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-program-2",
    name: "Contoh — Marketplace NFT",
    description:
      "Program bounty contoh untuk marketplace NFT. Scope: smart contract marketplace, sistem listing, dan antarmuka web.",
    chainId: 84532,
    token: "ETH",
    pool: 5,
    escrowLocked: 5,
    totalPaid: 0,
    tiers: { Critical: 2, High: 1, Medium: 0.3, Low: 0.05 },
    demo: true,
    createdAt: NOW,
  },
];

export const SEED_REPORTS: Report[] = [
  {
    id: "seed-report-1",
    title: "Contoh — IDOR pada endpoint profil pengguna",
    programId: "seed-program-1",
    vulnClass: "IDOR",
    skillName: "idor-vulnerability-hunting",
    severity: "High",
    description:
      "Contoh laporan: mengubah parameter ID pada endpoint profil memungkinkan akses data pengguna lain tanpa otorisasi.",
    poc: "1. Login sebagai pengguna A. 2. Panggil endpoint profil dengan ID pengguna B. 3. Respons mengembalikan data pengguna B.",
    target: "api.contoh-dapp.id/users/{id}",
    hunter: "0x7a3f9c1e5b2846d08a1f3c7e9b2d0456a8c1e3f5",
    status: "Baru",
    demo: true,
    createdAt: NOW,
  },
  {
    id: "seed-report-2",
    title: "Contoh — XSS tersimpan di kolom komentar",
    programId: "seed-program-2",
    vulnClass: "XSS",
    skillName: "dom-based-cross-site-scripting-xss",
    severity: "Medium",
    description:
      "Contoh laporan: kolom komentar tidak membersihkan input sehingga skrip dapat tersimpan dan dieksekusi di browser pengunjung lain.",
    poc: "1. Kirim komentar dengan muatan uji di lingkungan lab. 2. Buka halaman sebagai pengguna lain. 3. Muatan tereksekusi saat halaman dimuat.",
    target: "marketplace.contoh-dapp.id/komentar",
    hunter: "0x9b21d4a7c803e5961f4a2b8d0c3e5f7a91b2c4d6",
    status: "Triase",
    demo: true,
    createdAt: NOW,
  },
];

interface StoredState {
  wallet: string | null;
  chainId: number;
  programs: Program[];
  reports: Report[];
  payouts: Payout[];
}

interface NewProgramInput {
  name: string;
  description: string;
  chainId: number;
  token: string;
  pool: number;
  tiers: Program["tiers"];
}

interface NewReportInput {
  title: string;
  programId: string;
  vulnClass: string;
  skillName?: string;
  severity: Severity;
  description: string;
  poc: string;
  target: string;
  hunter: string;
}

export function useBugBountyStore() {
  const [wallet, setWallet] = useState<string | null>(null);
  const [chainId, setChainId] = useState<number>(11155111);
  const [programs, setPrograms] = useState<Program[]>(SEED_PROGRAMS);
  const [reports, setReports] = useState<Report[]>(SEED_REPORTS);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [hydrated, setHydrated] = useState(false);

  // Muat state dari localStorage setelah mount (hindari mismatch SSR).
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const data = JSON.parse(raw) as StoredState;
        if (Array.isArray(data.programs)) setPrograms(data.programs);
        if (Array.isArray(data.reports)) setReports(data.reports);
        if (Array.isArray(data.payouts)) setPayouts(data.payouts);
        if (typeof data.chainId === "number") setChainId(data.chainId);
        if (typeof data.wallet === "string") setWallet(data.wallet);
      }
    } catch {
      // localStorage rusak / tidak tersedia: tetap pakai seed.
    }
    setHydrated(true);
  }, []);

  // Simpan state ke localStorage setiap kali berubah.
  useEffect(() => {
    if (!hydrated) return;
    try {
      const data: StoredState = { wallet, chainId, programs, reports, payouts };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
      // Penyimpanan penuh / tidak tersedia: abaikan.
    }
  }, [wallet, chainId, programs, reports, payouts, hydrated]);

  const connectWallet = useCallback(() => {
    setWallet(randomAddress());
  }, []);

  const disconnectWallet = useCallback(() => {
    setWallet(null);
  }, []);

  const switchChain = useCallback((id: number) => {
    setChainId(id);
  }, []);

  const createProgram = useCallback((input: NewProgramInput) => {
    const program: Program = {
      id: uid(),
      name: input.name,
      description: input.description,
      chainId: input.chainId,
      token: input.token.trim().toUpperCase() || getChain(input.chainId).symbol,
      pool: input.pool,
      escrowLocked: input.pool,
      totalPaid: 0,
      tiers: input.tiers,
      createdAt: new Date().toISOString(),
    };
    setPrograms((prev) => [program, ...prev]);
    return program;
  }, []);

  const createReport = useCallback((input: NewReportInput) => {
    const report: Report = {
      id: uid(),
      title: input.title,
      programId: input.programId,
      vulnClass: input.vulnClass,
      skillName: input.skillName || undefined,
      severity: input.severity,
      description: input.description,
      poc: input.poc,
      target: input.target,
      hunter: input.hunter,
      status: "Baru",
      createdAt: new Date().toISOString(),
    };
    setReports((prev) => [report, ...prev]);
    return report;
  }, []);

  const setReportStatus = useCallback((reportId: string, status: ReportStatus) => {
    setReports((prev) =>
      prev.map((r) => (r.id === reportId ? { ...r, status } : r))
    );
  }, []);

  // Bayar laporan yang sudah Diterima: lepas jumlah tier dari escrow ke hunter.
  const payReport = useCallback(
    (reportId: string): { ok: boolean; message: string } => {
      const report = reports.find((r) => r.id === reportId);
      if (!report) return { ok: false, message: "Laporan tidak ditemukan." };
      if (report.status !== "Diterima") {
        return { ok: false, message: "Hanya laporan berstatus Diterima yang bisa dibayar." };
      }
      const program = programs.find((p) => p.id === report.programId);
      if (!program) return { ok: false, message: "Program tidak ditemukan." };
      const amount = program.tiers[report.severity];
      if (program.escrowLocked < amount) {
        return {
          ok: false,
          message: `Escrow tidak mencukupi (tersedia ${program.escrowLocked} ${program.token}, butuh ${amount} ${program.token}).`,
        };
      }
      const payout: Payout = {
        id: uid(),
        reportId: report.id,
        reportTitle: report.title,
        programName: program.name,
        hunter: report.hunter,
        chainId: program.chainId,
        amount,
        token: program.token,
        txHash: randomTxHash(),
        createdAt: new Date().toISOString(),
      };
      setPayouts((prev) => [payout, ...prev]);
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === program.id
            ? { ...p, escrowLocked: p.escrowLocked - amount, totalPaid: p.totalPaid + amount }
            : p
        )
      );
      setReports((prev) =>
        prev.map((r) =>
          r.id === report.id ? { ...r, status: "Dibayar", paidAmount: amount } : r
        )
      );
      return { ok: true, message: `Dibayar ${amount} ${program.token} (simulasi).` };
    },
    [reports, programs]
  );

  const resetDemo = useCallback(() => {
    setPrograms(SEED_PROGRAMS);
    setReports(SEED_REPORTS);
    setPayouts([]);
    setChainId(11155111);
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      // abaikan
    }
  }, []);

  const stats = useMemo(() => {
    const escrowByToken = new Map<string, number>();
    const paidByToken = new Map<string, number>();
    for (const p of programs) {
      escrowByToken.set(p.token, (escrowByToken.get(p.token) ?? 0) + p.escrowLocked);
      paidByToken.set(p.token, (paidByToken.get(p.token) ?? 0) + p.totalPaid);
    }
    const hunters = new Set(reports.map((r) => r.hunter.toLowerCase()));
    const byStatus = new Map<string, number>();
    for (const r of reports) {
      byStatus.set(r.status, (byStatus.get(r.status) ?? 0) + 1);
    }
    return {
      totalPrograms: programs.length,
      totalReports: reports.length,
      totalPayouts: payouts.length,
      escrowByToken: [...escrowByToken.entries()],
      paidByToken: [...paidByToken.entries()],
      totalHunters: hunters.size,
      byStatus,
    };
  }, [programs, reports, payouts]);

  return {
    wallet,
    chainId,
    chain: getChain(chainId),
    programs,
    reports,
    payouts,
    stats,
    hydrated,
    connectWallet,
    disconnectWallet,
    switchChain,
    createProgram,
    createReport,
    setReportStatus,
    payReport,
    resetDemo,
  };
}

export type BugBountyStore = ReturnType<typeof useBugBountyStore>;
