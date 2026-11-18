// SOLMARINA — titik masuk make.fun (Node 22, pustaka standar saja).
// Game-nya berupa file statis polos di game/ (three.js di-vendor di bawah
// game/vendor/, tanpa request jaringan saat bermain). Program ini
// mengantarkannya: menyalin game/ dan screenshots/ dari samping file ini
// ke /output lalu menulis /output/dossier.json dengan pustaka make.fun
// yang di-vendor. Program ini menulis byte yang persis sama di setiap
// run: salinannya salinan file polos dan buildDossier deterministik,
// jadi dua run grader selalu sepakat.
//
// Jalankan lokal dengan `node serve.ts`, lalu buka http://localhost:8080.
// Di luar grader, MAKEFUN_OUTPUT_DIR menggantikan /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts

import { cpSync, existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

const here = fileURLToPath(new URL('.', import.meta.url));
const out = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';

mkdirSync(out, { recursive: true });
cpSync(join(here, 'game'), join(out, 'game'), { recursive: true });
mkdirSync(join(out, 'screenshots'), { recursive: true });
if (existsSync(join(here, 'screenshots'))) cpSync(join(here, 'screenshots'), join(out, 'screenshots'), { recursive: true });

// Batas milik scorer sendiri (reference/gate.json): hanya text_max_bytes
// yang membentuk byte; sisanya menolak entri yang akan ditolak scorer
// (lebih dari 4 screenshot atau satu di atas 256 KiB; lebih dari 993 file
// di game/ atau 48 MiB file game secara keseluruhan, atau path di bawah
// game/ yang lebih dari 1000 byte).
writeFileSync(
  join(out, 'dossier.json'),
  buildDossier(out, {
    text_max_bytes: 163840,
    screenshots: { max: 4, max_bytes: 262144 },
    game_max_files: 993,
    game_max_bytes: 50331648,
    game_path_max_bytes: 1000,
  }),
);
