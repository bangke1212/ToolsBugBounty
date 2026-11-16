import { CHAINS } from "../lib/chains";
import { shortAddress } from "../lib/types";
import type { BugBountyStore } from "../lib/store";

export default function WalletBar({ store }: { store: BugBountyStore }) {
  const { wallet, chain, chainId, connectWallet, disconnectWallet, switchChain } = store;

  // Saldo simulasi deterministik per chain (bukan saldo sungguhan).
  const fakeBalance = (((chainId % 7) + 5) / 10 + 1).toFixed(2);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex flex-wrap items-center gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
            Wallet (Simulasi)
          </p>
          {wallet ? (
            <p className="mt-1 font-mono text-sm font-semibold text-slate-900">
              {shortAddress(wallet)}
              <span className="ml-2 rounded-full bg-emerald-100 px-2 py-0.5 font-sans text-xs font-semibold text-emerald-800">
                Terhubung (simulasi)
              </span>
            </p>
          ) : (
            <p className="mt-1 text-sm text-slate-600">
              Belum terhubung. Wallet ini hanya simulasi — tidak ada private key dan tidak ada dana sungguhan.
            </p>
          )}
        </div>

        <label className="flex items-center gap-2 text-sm">
          <span className="font-medium text-slate-700">Chain</span>
          <select
            value={chainId}
            onChange={(e) => switchChain(Number(e.target.value))}
            className="max-w-56 rounded-lg border border-slate-300 bg-white px-2 py-2 text-sm font-medium text-slate-900"
            aria-label="Pilih chain EVM"
          >
            <optgroup label="Mainnet">
              {CHAINS.filter((c) => !c.testnet).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.id}
                </option>
              ))}
            </optgroup>
            <optgroup label="Testnet">
              {CHAINS.filter((c) => c.testnet).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} · {c.id}
                </option>
              ))}
            </optgroup>
          </select>
        </label>

        {wallet ? (
          <>
            <span className="rounded-lg bg-slate-100 px-3 py-2 font-mono text-sm font-semibold text-slate-800">
              {fakeBalance} {chain.symbol}
            </span>
            <button
              onClick={disconnectWallet}
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Putuskan
            </button>
          </>
        ) : (
          <button
            onClick={connectWallet}
            className="rounded-lg bg-blue-700 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-800"
          >
            Hubungkan Wallet (Simulasi)
          </button>
        )}
      </div>
      <p className="mt-3 text-xs leading-relaxed text-slate-500">
        Chain aktif: <strong className="text-slate-700">{chain.name}</strong> — chain ID{" "}
        <span className="font-mono">{chain.id}</span> · {chain.testnet ? "Testnet" : "Mainnet"} ·{" "}
        <a
          href={chain.explorer}
          target="_blank"
          rel="noreferrer"
          className="font-medium text-blue-700 underline"
        >
          Buka explorer
        </a>
      </p>
    </div>
  );
}
