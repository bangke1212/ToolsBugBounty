// Checklist recon terpandu (bukan pemindaian sungguhan).
// Setiap langkah adalah pengamatan / pemeriksaan manual pada target berizin,
// berdasarkan taksonomi 191 skill (akashrpatil/awesome-offensive-security-skills).
// Tidak ada payload exploit di file ini — hanya nama langkah dan penjelasan.

export interface ReconStep {
  id: string;
  label: string;
  detail: string;
  skill?: string;
}

export const WEB_RECON_STEPS: ReconStep[] = [
  {
    id: "web-headers",
    label: "Periksa security headers",
    detail: "Amati CSP, HSTS, X-Frame-Options, dan header keamanan lain pada respons HTTP.",
    skill: "web-application-recon-and-enumeration",
  },
  {
    id: "web-tech",
    label: "Identifikasi teknologi",
    detail: "Catat framework, server, dan CMS dari header, cookie, dan markup (pengamatan pasif).",
    skill: "web-application-recon-and-enumeration",
  },
  {
    id: "web-endpoints",
    label: "Enumerasi endpoint & parameter",
    detail: "Petakan halaman, form, dan parameter dari sitemap, robots, dan file JS yang dimuat.",
    skill: "api-enumeration-fuzzing-discovery",
  },
  {
    id: "web-auth",
    label: "Uji alur autentikasi",
    detail: "Periksa login, reset password, dan rate limit memakai akun uji sendiri di lab berizin.",
    skill: "Authentication — Complete Deep Dive",
  },
  {
    id: "web-idor",
    label: "Uji IDOR pada parameter ID",
    detail: "Ganti ID objek dengan akun uji sendiri dan amati apakah data akun lain terlihat.",
    skill: "idor-vulnerability-hunting",
  },
  {
    id: "web-xss",
    label: "Uji refleksi input (XSS)",
    detail: "Masukkan teks uji pada kolom input dan amati apakah dikembalikan tanpa encoding.",
    skill: "xss-reflected-stored-dom",
  },
  {
    id: "web-sqli",
    label: "Uji injeksi SQL",
    detail: "Uji parameter dengan input uji dan amati perbedaan respons / pesan error.",
    skill: "sqli-manual-and-automated",
  },
  {
    id: "web-ssrf",
    label: "Uji SSRF pada parameter URL",
    detail: "Periksa apakah parameter URL / gambar membuat server mengambil alamat eksternal.",
    skill: "ssrf-server-side-request-forgery",
  },
  {
    id: "web-cors",
    label: "Periksa CORS & CSRF",
    detail: "Amati header Access-Control dan keberadaan token CSRF pada form.",
    skill: "cors-misconfiguration-exploitation",
  },
  {
    id: "web-upload",
    label: "Uji upload file",
    detail: "Periksa batasan tipe file dan lokasi penyimpanan pada fitur upload.",
    skill: "File Upload Vulnerabilities — Deep Dive",
  },
];

export const CHAIN_RECON_STEPS: ReconStep[] = [
  {
    id: "chain-verified",
    label: "Periksa source terverifikasi",
    detail: "Buka kontrak di explorer; pastikan source terverifikasi dan cocok dengan yang direview.",
    skill: "bug-bounty-workflow-funnel",
  },
  {
    id: "chain-owner",
    label: "Identifikasi owner / admin",
    detail: "Catat alamat owner / admin, timelock, dan multisig bila ada.",
    skill: "bug-bounty-workflow-funnel",
  },
  {
    id: "chain-proxy",
    label: "Periksa proxy / upgradeable",
    detail: "Periksa apakah kontrak memakai proxy dan siapa yang bisa melakukan upgrade.",
    skill: "bug-bounty-workflow-funnel",
  },
  {
    id: "chain-access",
    label: "Periksa access control",
    detail: "Daftar fungsi sensitif dan modifier / peran yang melindunginya.",
    skill: "bug-bounty-workflow-funnel",
  },
  {
    id: "chain-reentrancy",
    label: "Periksa pola reentrancy",
    detail: "Periksa urutan checks-effects-interactions pada fungsi yang memanggil kontrak lain.",
    skill: "bug-bounty-workflow-funnel",
  },
  {
    id: "chain-oracle",
    label: "Periksa oracle & harga",
    detail: "Catat sumber harga eksternal dan risiko manipulasinya.",
    skill: "bug-bounty-workflow-funnel",
  },
  {
    id: "chain-call",
    label: "Periksa panggilan eksternal",
    detail: "Periksa return value call / transfer dan penanganan bila panggilan gagal.",
    skill: "bug-bounty-workflow-funnel",
  },
  {
    id: "chain-pause",
    label: "Periksa pause & event",
    detail: "Periksa mekanisme pause dan event penting untuk monitoring.",
    skill: "bug-bounty-workflow-funnel",
  },
];

// Panduan manual per kelas kerentanan — dipakai sebagai fallback saat AI
// belum dikonfigurasi. Berisi langkah pemeriksaan, bukan payload.
const GUIDANCE: Record<string, string[]> = {
  IDOR: [
    "Buat dua akun uji sendiri pada target berizin.",
    "Amati parameter ID pada URL / body saat mengakses data sendiri.",
    "Ganti ID dengan ID akun uji kedua dan amati apakah datanya terlihat.",
    "Catat endpoint, parameter, dan respons sebagai bukti (tanpa data orang lain).",
  ],
  XSS: [
    "Masukkan teks uji polos pada setiap kolom input dan amati refleksinya.",
    "Periksa apakah input dikembalikan dengan encoding atau mentah.",
    "Periksa flag HttpOnly pada cookie session sebagai penguat dampak.",
    "Uji pada konteks berbeda: refleksi di HTML, atribut, dan skrip.",
  ],
  SSRF: [
    "Cari parameter URL, gambar, atau webhook pada aplikasi.",
    "Arahkan parameter ke alamat uji milik sendiri dan amati respons server.",
    "Periksa apakah server mengikuti redirect atau memanggil layanan internal.",
    "Jangan arahkan ke alamat cloud metadata milik pihak lain.",
  ],
  "SQL Injection": [
    "Uji parameter dengan karakter uji dan amati perubahan respons / error.",
    "Bedakan antara error-based, boolean-based, dan time-based.",
    "Gunakan akun uji dengan hak minimal; jangan dump data.",
    "Catat query yang dicurigai dan parameternya untuk laporan.",
  ],
  JWT: [
    "Periksa algoritma pada header token (alg) dan cara verifikasinya.",
    "Uji token tanpa signature dan dengan kunci berbeda pada akun uji sendiri.",
    "Periksa masa berlaku dan klaim sensitif di dalam token.",
  ],
  Reentrancy: [
    "Cari fungsi yang mengirim ETH / token lalu mengubah state sesudahnya.",
    "Periksa urutan checks-effects-interactions di setiap fungsi sensitif.",
    "Periksa apakah ada guard reentrancy atau pola mutex.",
    "Simulasikan alur pada testnet / fork lokal, bukan mainnet.",
  ],
  "Prompt Injection": [
    "Uji input yang mencoba mengubah instruksi aplikasi AI.",
    "Periksa apakah output membocorkan instruksi sistem.",
    "Uji lewat jalur tidak langsung (dokumen / data yang dibaca model).",
  ],
};

const GENERIC_GUIDANCE: string[] = [
  "Pastikan target sudah dikonfirmasi masuk scope dan berizin.",
  "Jalankan checklist recon untuk kelas ini sampai selesai.",
  "Catat setiap langkah, observasi, dan respons yang ditemukan.",
  "Nilai dampak: apa yang bisa dilakukan penyerang bila temuan ini nyata?",
  "Susun laporan dengan langkah reproduksi yang jelas (tanpa payload exploit).",
];

export function guidanceFor(vulnClass: string): string[] {
  return GUIDANCE[vulnClass] ?? GENERIC_GUIDANCE;
}
