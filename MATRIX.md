# Matriks Persyaratan & Kriteria Penilaian — best-cooking-game-20261125-0137

## Baris jangkar (anchor line) — RULES.txt kit (dikutip sebelum menulis file apa pun)
> "Make the best cooking game you can and hand it in."

Kit: best-cooking-game-20261125-0137-kit.tar.gz (8.303.610 byte, sha256 tercatat di kit.json bundle_sha256 fb359e9fb2f637041506b298e8b2185257321710221e68997243e8706956ba3f).
skill.md versi 1.5.285 (dibaca 2026-11-25). Sesi siklus dimulai 2026-11-25 09:28 WIB = 02:28Z, SETELAH pembukaan kompetisi 01:37Z (thinking_in_window LOLOS).
Deadline: 2026-11-25T13:37:00Z (20:37 WIB). Ronde blind berikutnya: 2026-11-25T04:37:00Z (11:37 WIB). Hadiah $250: 1st $60, 2nd $40, 3rd $30, 4th $25, 5th $20, 6-10th $15. Top-40 dev board masuk final heat (3 Swiss + playoff top 12).

## Persyaratan wajib (R) — sumber: detail API + requirements + RULES.txt
- R1 Repo GitHub PUBLIK baru `makefun-best-cooking-game-20261125-0137`, dibuat SETELAH 01:37Z, owner sulan195.
- R2 main.ts (Node 22, stdlib-only) di root: salin game/ + screenshots/ ke /output (MAKEFUN_OUTPUT_DIR di luar grader), tulis /output/dossier.json via buildDossier dari vendor/makefun-game.ts, seperti starter.
- R3 vendor/makefun-game.ts = salinan kit TAK BERUBAH (gate membangun ulang dossier & membandingkan byte-per-byte).
- R4 game/: file+dir biasa saja (tanpa symlink), <=993 entri, <=48 MiB total, index.html <=1 MiB, path <=1000 byte. Semua referensi = `data:` URI atau file di dalam game/; TANPA network (import map max 1 & valid; bare specifier hanya lewat import map).
- R5 game/index.html terbuka di desktop Chrome & dapat dimainkan keyboard+mouse, tanpa network.
- R6 Game memasak LENGKAP, terlihat di screenshot: dapur + papan order, bahan di counter, satu hidangan mid-assembly, timer, piring siap saji.
- R7 Orisinal: ide/seni/suara/musik/nama sendiri; bukan tiruan game komersial.
- R8 screenshots/: 3-4 PNG/JPEG, render ASLI kode game di browser (tanpa edit/komposit/pinjam); pertama menurut nama = cover; tiap file <=256 KiB, sisi panjang <=1280, sisi pendek >=480; nama [huruf/angka/._-]{1,128}, tidak diawali `.`/`-`.
- R9 LICENSE OSI di root (MIT + baris SPDX-License-Identifier: MIT).
- R10 README: 3 badge live make.fun (bounty svg + rank.svg + reward.svg repo sendiri), tautan ke make.fun, tanpa placeholder {owner}. About repo: website di make.fun + topik makefun.
- R11 .makefun/owner.json {"wallet": "w37xQVEhZfrSP4FFnZoTkkVgPnnQBc6tw1BJJnDLhu3"} (preseden entri sebelumnya).
- R12 Transkrip bundle WAJIB: sesi dalam window; >=30% baris terhitung ditulis sesi terekam; >=5 turn asisten berteks/berpikir; >=1 baris --muse-usage; satu file direvisi >=2 pesan asisten; run record; ambang own-work (rival >=20 baris & >=10%, remote >=100 baris & >=40%).
- R13 Submit bertanda tangan wallet w37x (--keypair ~/workspace/makefun/makefun-keypair.json); maks 10/hari, 20 total; entri final = submisi terakhir sebelum deadline.
- R14 TANPA eval/new Function/dynamic import nilai env; tanpa service worker/cookie; tanpa prompt wallet/password/seed; tanpa probing network. (Juga diblokir CSP hosting makefun.gg.)
- R15 Dossier <=1,5 MiB; teks sumber <=163.840 byte; sumber dipecah per file satu tugas jelas, nama file/fungsi deskriptif (kriteria 5).
- R16 Program main.ts jalan 2x, kedua run byte identik; 1 CPU, 1024 MB, 10 dtk.

## Kriteria juri (GLM-4.5? — judge: z-ai/glm-5.3-flash via OpenRouter, pairwise A/B, margin 1-5, 2 call per game, kriteria pertama yang berbeda memutuskan)
- K1 (terpenting) Game memasak lengkap TERLIHAT di screenshot: dapur + papan order, bahan di counter, hidangan mid-assembly, timer, piring siap saji. Bukan game playable = kalah.
- K2 Fun & depth: order memaksa perencanaan rute dapur, resep berkombinasi, tekanan naik tanpa menambah chores.
- K3 Feel & polish: chop & plating respons seketika, timer terasa, service rush terbaca sekilas.
- K4 Look & originality: makanan terlihat layak saji, counter terbaca sekilas, dapur punya ciri sendiri; tiruan komersial kalah.
- K5 Structure: outline sumber menunjukkan file terpecah per tugas jelas, bernama sesuai fungsinya.

## Pelajaran yang diterapkan (dari ~/workspace/makefun-lessons.md)
- L1 Screenshot ADALAH wajah entri (gta6-01): kepadatan props di tepi frame menentukan kesan lengkap; jangan biarkan area kosong mendominasi frame mana pun. -> Setiap shot dipadatkan: papan order penuh, counter berisi bahan, tidak ada sudut kosong.
- L2 Starter kit = house game #2 (dossier starter byte-identik house game). Entri harus JELAS berbeda & lebih baik dari starter (dodge-and-collect) — game memasak sungguhan mengalahkan starter di K1 secara langsung.
- L3 Dev board adalah metrik kebenaran (gta6-01): target = masuk top-40 dev board (cut final heat), bukan sekadar rate vs house. Submit AWAL (sebelum ronde 11:37 WIB bila siap) agar dapat dev rating + umpan balik ronde.
- L4 Recorder bisa mati tanpa seal (gta6-01): bila proses record mati, selesaikan via `record --finish` + usage rows dari muse.db; verifikasi recordings.json.
- L5 Validasi = rentang, bukan sekadar tipe (temuan Luna gta6-01): semua input/state divalidasi rentangnya (indeks resep, uang, timer).
- L6 Teks dalam game Bahasa Inggris (perintah user gta6-01); mikroteks jangan di bawah lantai keterbacaan pada tampilan kecil (news-image-20261122): lantai teks efektif, uji render 300px.
- L7 Template padat vs keterbacaan: kepadatan (K1) diimbangi tipografi besar & panel bersih — jangan korbankan keterbacaan demi jumlah elemen.
- L8 Delta dev rate <1 SE = noise (news-image/gta6-01): jangan revert/resubmit berdasarkan estimasi titik saja; gerbang "tidak terbukti lebih lemah".

## Analisis gap (aturan kepekaan leaderboard 2026-11-23)
- Lawan ukur: 4 house games (starter dodge = #2; 3 lainnya belum terungkap, terbit bersama final kit). Starter BUKAN game memasak -> kalah K1 dari game memasak lengkap mana pun.
- GAP vs starter: (a) bukan game memasak; (b) tanpa papan order/resep; (c) tanpa timer/tekanan layanan; (d) tanpa assembly hidangan.
- ADOPSI: game memasak lengkap + papan order + resep multi-bahan + timer per order + rush.
- LANGKAH MELAMPAUI: starter hanya dodge/collect 1-dimensi; kita bangun loop lengkap pantry->chop->cook->plate->serve dengan 6 resep, kombo, dan rush bertingkat — kedalaman (K2) + feel (K3) yang tidak dimiliki satu pun house game yang diketahui.

## Keputusan build
- Nama game: "Sizzle Station" — one-chef kitchen rush (orisinal).
- Teknologi: vanilla JS + Canvas 2D, tanpa library (tanpa vendor tambahan selain makefun-game.ts); suara synth WebAudio prosedural (tanpa file audio); font sistem (tanpa network).
- Struktur file (satu tugas jelas per file, nama deskriptif — K5): game/index.html, game/src/config.js, random.js, world.js, input.js, audio.js, render.js, shots.js, main.js; serve.ts; main.ts; vendor/makefun-game.ts (kit, tak berubah); shots.json (4 shot: start/play/rush/serve); tests/ (Node, tanpa browser).
- Carbon: TIDAK dipakai untuk v1 — bounty ini peka-kecepatan (ronde 1 pukul 11:37 WIB, jendela 12 jam); jalur cadangan Muse-langsung memimpin per aturan Carbon ("boleh memimpin pada bounty penuntut kecepatan"); keluaran Carbon juga tidak boleh ditempel wholesale karena gerbang reproduces 30%. Carbon boleh dipakai advisori pada iterasi berikutnya bila waktu tersisa.
- Target submit v1: sebelum ronde 11:37 WIB bila build solid; jika tidak, sebelum ronde 2 (14:37 WIB).
