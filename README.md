# SOLMARINA — Sun Coast Getaway

[![competition](https://img.shields.io/badge/make.fun-gta6--01-ff6b35)](https://make.fun)
[![engine](https://img.shields.io/badge/engine-three.js%200.160-000000)](https://threejs.org)
[![missions](https://img.shields.io/badge/missions-3%20story-22c55e)](https://make.fun)

Rae baru tiba di Solmarina — kota pesisir yang sunyi di permukaan dan berutang di mana-mana — dengan satu koper dan satu nama di buku Marlo. Antar paket fajar, tagih tiga utang, lalu kabur lewat pelabuhan timur sebelum lima bintang buronan menutup seluruh kota. Di antara misi, kota ini hidup sendiri: 14 mobil lalu lintas dan 26 pejalan kaki di trotoar, mobil parkir yang bisa dicuri, preman pantai yang bisa diajak berantem, dan polisi yang mengejar makin keras setiap kali Rae berbuat onar.

Tiap 90 detik Rush Hour melanda selama 45 detik: lalu lintas melipat tiga dari 14 menjadi 42 mobil, tiga roadblock polisi jatuh di jalan utama dan benar-benar menghentikan arus, sementara bayaran misi naik 50% — kekacauan yang paling menguntungkan di Solmarina. Semuanya deterministik (seed 7, simulasi fixed-step 60 Hz), dengan HUD lengkap berisi health, bintang wanted, uang, panel misi, waypoint beam, dan minimap live, plus musik dan SFX synth WebAudio tanpa satu pun file audio.

Dibangun dalam 20 modul satu-tugas (kota, lalu lintas, kerumunan, kendaraan, wanted, combat, misi, Rush Hour, HUD, audio, dan lainnya) di atas three.js 0.160.0 yang di-vendor, dimainkan dengan keyboard dan mouse, dan disimpan otomatis via localStorage.

Mainkan: `node serve.ts` lalu buka http://localhost:8080 — WASD jalan & nyetir, E interaksi/curi mobil, Space pukul, F tembak, P jeda.
