# Worker Scan URL (Nuclei)

Worker ini menjalankan binary [Nuclei](https://github.com/projectdiscovery/nuclei)
(ProjectDiscovery, MIT) terhadap URL target yang sudah masuk antrean, lalu
mengirim hasilnya kembali ke aplikasi Hunter Command Center. Aplikasi di Vercel
**tidak bisa** menjalankan Nuclei sendiri (fungsi serverless berumur pendek dan
tidak bisa menjalankan binary scanner) — karena itu scan selalu lewat worker
terpisah ini.

> **Hanya pindai target berizin** — target milikmu sendiri atau yang memiliki
> program bug bounty. Worker tidak memeriksa izin; izin dikonfirmasi pengguna
> saat membuat job scan di aplikasi (checkbox scope wajib).

## 1. Install Nuclei

Pilih salah satu:

```bash
# Opsi A — Go (disarankan bila Go sudah terpasang)
go install -v github.com/projectdiscovery/nuclei/v3/cmd/nuclei@latest

# Opsi B — unduh rilis resmi
# https://github.com/projectdiscovery/nuclei/releases
# → pilih arsip sesuai OS, ekstrak, letakkan binary `nuclei` di PATH.
```

Verifikasi:

```bash
nuclei -version
nuclei -update-templates   # unduh template pemeriksaan (sekali saja)
```

Bila binary tidak ada di PATH, isi `NUCLEI_PATH` dengan path lengkap ke binary.

## 2. Environment variable

| Variabel | Wajib | Default | Keterangan |
| --- | --- | --- | --- |
| `APP_URL` | Tidak | `http://localhost:3000` | Alamat aplikasi Hunter Command Center (tanpa `/` di akhir). |
| `WORKER_TOKEN` | Ya (produksi) | kosong | Token rahasia yang sama dengan `WORKER_TOKEN` di server aplikasi. Tanpa token, callback hanya diterima bila server berjalan mode lokal/dev. **Jangan commit token ke repo, jangan kirim di chat.** |
| `NUCLEI_PATH` | Tidak | `nuclei` | Path binary Nuclei bila tidak ada di PATH. |
| `POLL_MS` | Tidak | `5000` | Interval cek antrean (milidetik). |
| `SCAN_TIMEOUT_MS` | Tidak | `600000` (10 menit) | Batas waktu satu scan; scan yang lewat batas dihentikan dan berstatus Gagal. |

## 3. Menjalankan worker (lokal)

Dari root repo, pastikan aplikasi dev sudah jalan (`npm run dev`), lalu di
terminal lain:

```bash
APP_URL=http://localhost:3000 WORKER_TOKEN=<redacted> npm run worker
```

Worker akan terus memantau antrean: mengambil job berstatus Antri → klaim
(Berjalan) → menjalankan Nuclei → mengirim hasil ke aplikasi (Selesai/Gagal).
Untuk memproses satu job lalu berhenti (berguna saat mengetes):

```bash
APP_URL=http://localhost:3000 WORKER_TOKEN=<redacted> node worker/worker.mjs --once
```

## 4. Bila Nuclei belum terpasang

Worker **tidak pernah membuat temuan palsu**. Bila binary Nuclei tidak
ditemukan, job dilaporkan berstatus **Worker belum siap** beserta instruksi
install — job tidak menghasilkan temuan apa pun.

## 5. Deploy worker ke VPS nanti

Bila ingin scan berjalan 24 jam tanpa laptop menyala, jalankan worker di VPS
(Ubuntu) sebagai service systemd:

```bash
# 1. Install Node.js 20+, Go, dan Nuclei seperti langkah 1 di atas.
# 2. Clone repo ini, lalu buat file env (JANGAN commit):
#    /opt/hunter-scanner/.env berisi APP_URL + WORKER_TOKEN
# 3. Buat service /etc/systemd/system/hunter-worker.service:
```

```ini
[Unit]
Description=Hunter Command Center — Nuclei worker
After=network.target

[Service]
Type=simple
User=ubuntu
WorkingDirectory=/opt/hunter-scanner
EnvironmentFile=/opt/hunter-scanner/.env
ExecStart=/usr/bin/node worker/worker.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now hunter-worker
sudo systemctl status hunter-worker
```

Catatan keamanan VPS: `WORKER_TOKEN` harus sama dengan yang diisi di
Environment Variables aplikasi Vercel; batasi akses SSH (key saja); worker
hanya menghubungi `APP_URL` milikmu dan tidak membuka port apa pun.

## 6. Hasil scan

Output Nuclei (`-j`, JSONL) diparsing menjadi temuan kandidat: template-id,
nama, severity, URL yang cocok, deskripsi, dan referensi. Setiap temuan
berlabel **"Kandidat — perlu verifikasi manual"** di aplikasi dan hanya bisa
diimpor ke Temuan sebagai status Baru — bukan bug terkonfirmasi.
