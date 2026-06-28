# ⬡ core.api

> Kumpulan REST API siap pakai — Downloader, AI, Tools, Search, dan masih banyak lagi.

[![Status](https://img.shields.io/badge/status-active-4ade80?style=flat-square)](https://www.core-api.my.id)
[![Deploy](https://img.shields.io/badge/deploy-vercel-000?style=flat-square&logo=vercel)](https://vercel.com)
[![Made by](https://img.shields.io/badge/made%20by-Nixx-7c6af7?style=flat-square)](https://wa.me/6281410502451)

---

## 🌐 Base URL

```
https://www.core-api.my.id
```

---

## 📦 Endpoints

### 🔍 SEARCH

| Nama | Endpoint | Parameter |
|------|----------|-----------|
| YouTube Search | `GET /api/search/ytsearch` | `query` |
| LK21 Search | `GET /api/search/lk21` | `query` |

---

### 👤 STALK

| Nama | Endpoint | Parameter |
|------|----------|-----------|
| Instagram Stalk | `GET /api/stalk/igstalk` | `username` |

---

### 🤖 AI

| Nama | Endpoint | Parameter |
|------|----------|-----------|
| Chat GPT | `GET /api/ai/gpt` | `text`, `sessionId` |
| Text To Image | `GET /api/ai/txt2img` | `prompt` |

---

### 🎨 MAKER

| Nama | Endpoint | Parameter |
|------|----------|-----------|
| Remove Background | `GET /api/maker/removebg` | `url` |

---

### ⬇️ DOWNLOAD

| Nama | Endpoint | Parameter |
|------|----------|-----------|
| MediaFire Download | `GET /api/download/mediafire` | `url` |
| Youtube MP4 Download | `GET /api/download/ytmp4` | `url` |
| Facebook Download | `GET /api/download/facebook` | `url` |
| Spotify Download | `GET /api/download/spotifydl` | `url` |

---

### ℹ️ INFO

| Nama | Endpoint | Parameter |
|------|----------|-----------|
| API Info | `GET /api/info/api` | — |

---

## 📋 Response Format

Semua endpoint mengembalikan response dalam format JSON:

```json
{
  "status": true,
  "creator": "Nixx",
  "result": {}
}
```

### ❌ Error Response

```json
{
  "status": false,
  "creator": "Nixx",
  "message": "Pesan error",
  "error": "Detail error"
}
```

---

## 💡 Contoh Penggunaan

#### YouTube Search
```bash
GET https://www.core-api.my.id/api/search/ytsearch?query=lofi music
```

#### Chat GPT
```bash
GET https://www.core-api.my.id/api/ai/gpt?text=Halo siapa kamu&sessionId=abc123
```

#### Spotify Download
```bash
GET https://www.core-api.my.id/api/download/spotifydl?url=https://open.spotify.com/track/xxx
```

---

## 🛠️ Tech Stack

```
⬡  Node.js          — Runtime
⬡  Vercel           — Serverless deployment
⬡  Vanilla JS       — Frontend
⬡  GitHub           — Source & database storage
```

---

## 📁 Struktur Project

```
├── core/
│   └── api/
│       ├── ai/
│       ├── download/
│       ├── info/
│       ├── maker/
│       ├── search/
│       ├── stalk/
│       ├── chat.js
│       └── list.js
├── main/
│   ├── index.html
│   ├── script.js
│   ├── style.css
│   └── database.json
├── package.json
└── vercel.json
```

---

## 👨‍💻 Developer

<table>
  <tr>
    <td align="center">
      <b>Nixx</b><br/>
      <a href="https://wa.me/6281410502451">WhatsApp</a>
    </td>
  </tr>
</table>

---

<div align="center">
  <sub>⬡ core.api — By Nixx</sub>
</div>
