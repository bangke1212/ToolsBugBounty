# Platform Bug Bounty On-Chain

Prototipe DApp platform bug bounty on-chain: program bounty, laporan kerentanan, triase,
escrow, dan payout — di 32 chain EVM (16 jaringan × mainnet + testnet). Dibangun dengan
Next.js (App Router), TypeScript, dan Tailwind CSS. State tersimpan di `localStorage` browser.

> **SIMULASI** — Aplikasi ini adalah prototipe untuk belajar. Belum ada smart contract yang
> ter-deploy, tidak ada dana sungguhan yang bergerak, dan wallet di dalamnya hanya simulasi
> (tidak ada private key / seed phrase). Uji kerentanan hanya pada target dengan izin tertulis.

## Fitur

- **Wallet simulasi** + chain switcher 32 chain EVM (chain ID terverifikasi dari registry
  [chainid.network](https://chainid.network/chains.json)).
- **Program bounty**: buat program (nama, deskripsi, chain, pool escrow + token, tier reward
  Critical / High / Medium / Low) dengan statistik pool, escrow terkunci, dan total dibayar.
- **Laporan**: kirim laporan dengan kelas kerentanan dari taksonomi 191 skill
  (akashrpatil/awesome-offensive-security-skills, Apache-2.0 — hanya nama, domain, dan
  difficulty yang disimpan di `lib/taxonomy.ts`), severity, deskripsi, langkah reproduksi,
  dan target dalam scope. Tanpa payload exploit.
- **Triase**: Baru → Triase → Diterima / Ditolak / Duplikat → Dibayar. Membayar laporan
  melepas jumlah tier dari escrow ke hunter.
- **Ledger Payout**: setiap pembayaran tercatat dengan hash TX simulasi, chain, jumlah,
  alamat hunter, dan waktu.
- **Dashboard statistik**: total program, laporan, escrow terkunci, total dibayar, hunter.
- **Taksonomi 191 skill**: browser pencarian skill per domain dan difficulty.
- Data contoh: 2 program demo + 2 laporan demo berlabel "Contoh" supaya UI tidak kosong.
  Tombol "Reset ke Data Contoh" di Dashboard mengembalikan data awal.

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Build & Cek Tipe

```bash
npm run build
npx tsc --noEmit
```

## Deploy ke Vercel

Hubungkan repo GitHub ini ke Vercel (import project), framework terdeteksi otomatis sebagai
Next.js. Tidak ada environment variable wajib — file `.env.example` hanya berisi placeholder
komentar. Setiap push ke branch `main` akan auto-deploy bila project Vercel sudah terhubung
ke repo ini.

## Struktur

```
app/            # App Router: layout, page (tab Dashboard/Program/Laporan/Ledger/Rantai/Taksonomi), globals.css
components/     # WalletBar, Programs, Reports, Ledger, TaxonomyBrowser
lib/            # chains.ts (32 chain EVM), taxonomy.ts (191 skill ringkas), types.ts, store.ts (localStorage + seed)
public/         # Aset statis
```

## Lisensi & Atribusi

- Taksonomi skill: [akashrpatil/awesome-offensive-security-skills](https://github.com/akashrpatil/awesome-offensive-security-skills)
  (CyberSkills Elite, Apache License 2.0).
- Chain ID: registry [chainid.network](https://chainid.network/chains.json).
