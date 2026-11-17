# Hunter Command Center

Prototipe aplikasi untuk **menemukan bug bounty di website dan blockchain**: kelola
target dan scope, jalankan recon terpandu, lacak temuan, susun rantai serangan, minta
analisis AI, dan susun laporan bug bounty — plus modul Platform bounty on-chain di
dalamnya. Dibangun dengan Next.js (App Router), TypeScript, dan Tailwind CSS. State
tersimpan di `localStorage` browser; temuan bisa dibagikan lewat Live Feed (Vercel KV)
bila dikonfigurasi — lihat bagian "Live Feed (Vercel saja)".

> **SIMULASI** — Aplikasi ini adalah prototipe untuk belajar. Tidak ada pemindaian
> sungguhan terhadap target live, belum ada smart contract yang ter-deploy, tidak ada
> dana sungguhan yang bergerak, dan wallet di dalamnya hanya simulasi (tidak ada
> private key / seed phrase). Uji kerentanan hanya pada target dengan izin tertulis.

## Fitur

- **Dashboard**: statistik target, temuan per severity, rantai serangan, panggilan AI,
  program, dan laporan.
- **Target & Scope**: tambah target website (URL) atau smart contract (alamat + chain
  dari 32 chain EVM). Setiap target wajib dikonfirmasi scope berizin sebelum checklist
  apa pun bisa dipakai.
- **Recon Terpandu**: checklist pemeriksaan manual per target — web (header, cookie,
  teknologi, endpoint, IDOR, XSS, SQLi, SSRF, CORS, upload) dan blockchain (source
  terverifikasi, owner/admin, proxy, access control, reentrancy, oracle, panggilan
  eksternal, pause) — berdasarkan taksonomi 191 skill. Progres per target tersimpan.
- **Temuan**: tambah temuan (judul, target, kelas kerentanan dari taksonomi 191 skill,
  severity, deskripsi, langkah pemeriksaan — tanpa payload exploit) dengan alur status
  Baru → Dikonfirmasi → Dilaporkan → Dibayar / Ditolak. Temuan terkonfirmasi bisa
  dikirim ke modul Platform sebagai laporan. Setiap temuan menampilkan badge sinkron
  Live Feed ("Tersinkron" / "Lokal saja" / "Gagal sinkron" + coba lagi).
- **Live Feed (Vercel saja)**: seksi di Dashboard yang menampilkan temuan dari feed
  bersama (Vercel KV) secara live — polling tiap 5 detik, pause saat tab tersembunyi.
  Temuan baru dan perubahan status ke Dikonfirmasi/Dilaporkan otomatis dipublikasi ke
  feed. Kartu feed bisa diimpor ke daftar Temuan lokal ("Simpan ke Temuan", dedupe by
  id). Tanpa KV, aplikasi tetap jalan mode lokal. Lihat bagian "Live Feed (Vercel
  saja)" di bawah.
- **Rantai Serangan**: susun rantai dari temuan (mis. XSS → curi sesi → account
  takeover; SSRF → metadata cloud → RCE) dengan visualisasi langkah dan dampak akhir,
  plus template cepat.
- **AI Assist**: panel analisis memakai model AI yang dikonfigurasi lewat environment
  variable server-side (`MODEL_API_BASE_URL`, `MODEL_API_KEY`, `MODEL_API_MODEL`).
  Bila key belum diisi, panel menampilkan status "AI belum dikonfigurasi" dan beralih
  ke panduan manual terpandu. Lihat bagian "Konfigurasi AI" di bawah.
- **Laporan**: susun laporan bug bounty dari temuan, export Markdown (salin / unduh).
- **Modul Platform (On-Chain)**: fitur aplikasi sebelumnya dipertahankan — program
  bounty (pool escrow + tier Critical / High / Medium / Low), laporan platform,
  triase (Baru → Triase → Diterima / Ditolak / Duplikat → Dibayar), dan Ledger Payout
  dengan hash TX simulasi.
- **Rantai EVM**: chain switcher 32 chain (16 jaringan × mainnet + testnet, chain ID
  terverifikasi dari registry [chainid.network](https://chainid.network/chains.json)).
- **Taksonomi 191 skill**: browser pencarian skill per domain dan difficulty
  (akashrpatil/awesome-offensive-security-skills, Apache-2.0 — hanya nama, domain, dan
  difficulty yang disimpan di `lib/taxonomy.ts`).
- **Pengaturan**: menampilkan model AI aktif (nama model saja, bukan key) dan log
  pemakaian AI otomatis (waktu, model, jenis prompt, estimasi token).
- Data contoh: 2 target, 3 temuan, dan 2 rantai demo berlabel "Contoh" supaya UI tidak
  kosong. Tombol "Reset ke Data Contoh" di Dashboard mengembalikan data awal.

## Cara Menjalankan

```bash
npm install
npm run dev
```

Buka [http://localhost:3000](http://localhost:3000).

## Konfigurasi AI

AI Assist memakai model yang dikonfigurasi **hanya lewat environment variable
server-side** — key tidak pernah ditulis di kode, tidak pernah dikirim ke browser,
dan tidak pernah ditampilkan di UI.

1. Salin `.env.example` menjadi `.env` dan isi nilainya:

```bash
MODEL_API_BASE_URL=https://api.meta.ai/v1
MODEL_API_KEY=(kunci API kamu)
MODEL_API_MODEL=muse-spark-1.3
```

2. Restart server pengembangan setelah mengubah `.env`.
3. Untuk Vercel: isi lewat Project Settings → Environment Variables dengan nama yang
   sama, lalu redeploy.
4. Bila `MODEL_API_KEY` kosong, AI Assist menampilkan status "AI belum
   dikonfigurasi" beserta instruksi di atas, dan panel beralih ke panduan manual
   terpandu. Halaman Pengaturan menampilkan model aktif dan log pemakaian AI.

## Live Feed (Vercel saja)

Live Feed memakai **Vercel KV (Redis milik Vercel)** — tanpa layanan pihak ketiga
baru, tanpa notifikasi HP di jalur ini. Temuan yang hunter simpan, atau yang
statusnya berubah ke Dikonfirmasi/Dilaporkan, dipublikasi otomatis ke KV lewat
`POST /api/findings` (fire-and-forget; kegagalan tidak merusak simpan lokal).
Dashboard mengambil feed lewat `GET /api/findings` dengan polling tiap 5 detik
(`POLL_MS` di `lib/live.ts`), hanya saat tab terlihat dan perangkat online, dengan
dukungan `?since=` untuk delta. Badge di daftar Temuan menunjukkan status sinkron
tiap temuan: "Tersinkron" / "Lokal saja" / "Gagal sinkron" (dengan tombol coba lagi).

Feed hanya berisi temuan yang hunter simpan/konfirmasi — **bukan deteksi otomatis**.
Tanpa KV yang dikonfigurasi, aplikasi tetap jalan mode lokal dan Dashboard
menampilkan status abu-abu "Live belum dikonfigurasi".

Cara mengaktifkan:

1. Di dashboard Vercel project ini: **Storage → Create Database → KV** (Redis),
   lalu attach ke project.
2. Redeploy — environment variable `KV_REST_API_URL` dan `KV_REST_API_TOKEN`
   ter-inject otomatis ke project.
3. Untuk dev lokal: jalankan `vercel env pull` di folder repo, atau salin kedua
   nilai dari dashboard Storage ke file `.env` (jangan commit — `.env` sudah
   di-`.gitignore`).
4. Verifikasi: buka tab Dashboard — badge berubah menjadi **LIVE** hijau dengan
   "diperbarui x detik lalu", dan temuan baru muncul di feed dalam hitungan detik.
   `GET /api/findings` mengembalikan `{ configured: true, findings: [...] }`.

## Build & Cek Tipe

```bash
npm run build
npx tsc --noEmit
```

## Deploy ke Vercel

Hubungkan repo GitHub ini ke Vercel (import project), framework terdeteksi otomatis
sebagai Next.js. Isi environment variable AI di Project Settings → Environment
Variables bila ingin AI Assist aktif. Setiap push ke branch `main` akan auto-deploy
bila project Vercel sudah terhubung ke repo ini.

## Struktur

```
app/            # App Router: layout, page (11 tab), globals.css, api/ai (route AI server-side),
                #   api/findings (route Live Feed server-side, Vercel KV)
components/     # Dashboard, LiveFeed, Targets, Recon, Findings, AttackChains, AiAssist,
                #   ReportBuilder, Settings, WalletBar, Programs, Reports, Ledger,
                #   TaxonomyBrowser
lib/            # chains.ts (32 chain EVM), taxonomy.ts (191 skill ringkas),
                #   types.ts, store.ts (localStorage + seed), recon.ts (checklist),
                #   ai.ts (helper client AI), live.ts (tipe + konstanta Live Feed),
                #   useLiveFeed.ts (hook polling + publish Live Feed)
public/         # Aset statis
```

## Lisensi & Atribusi

- Taksonomi skill: [akashrpatil/awesome-offensive-security-skills](https://github.com/akashrpatil/awesome-offensive-security-skills)
  (CyberSkills Elite, Apache License 2.0).
- Chain ID: registry [chainid.network](https://chainid.network/chains.json).
