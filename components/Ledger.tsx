import { getChain } from "../lib/chains";
import { formatAmount, formatDate, shortAddress, shortHash } from "../lib/types";
import type { Payout } from "../lib/types";

export default function Ledger({ payouts }: { payouts: Payout[] }) {
  if (payouts.length === 0) {
    return (
      <p className="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-center text-sm text-slate-500">
        Belum ada pembayaran. Pembayaran tercatat di sini setelah laporan berstatus Diterima dibayar dari escrow.
      </p>
    );
  }
  return (
    <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white shadow-sm">
      <table className="w-full min-w-160 text-left text-sm">
        <thead>
          <tr className="border-b border-slate-200 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
            <th className="px-4 py-3">Hash TX (simulasi)</th>
            <th className="px-4 py-3">Laporan</th>
            <th className="px-4 py-3">Hunter</th>
            <th className="px-4 py-3">Chain</th>
            <th className="px-4 py-3 text-right">Jumlah</th>
            <th className="px-4 py-3">Waktu</th>
          </tr>
        </thead>
        <tbody>
          {payouts.map((p) => {
            const chain = getChain(p.chainId);
            return (
              <tr key={p.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <a
                    href={`${chain.explorer}/tx/${p.txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="font-mono text-blue-700 underline"
                    title="Hash simulasi — tidak ada transaksi sungguhan di explorer"
                  >
                    {shortHash(p.txHash)}
                  </a>
                  <span className="ml-2 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-semibold text-amber-800">
                    SIMULASI
                  </span>
                </td>
                <td className="px-4 py-3">
                  <span className="font-medium text-slate-900">{p.reportTitle}</span>
                  <span className="block text-xs text-slate-500">{p.programName}</span>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-700">{shortAddress(p.hunter)}</td>
                <td className="px-4 py-3 text-slate-700">
                  {chain.name} <span className="text-xs text-slate-400">({chain.id})</span>
                </td>
                <td className="px-4 py-3 text-right font-bold text-emerald-700">
                  +{formatAmount(p.amount)} {p.token}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">{formatDate(p.createdAt)}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
