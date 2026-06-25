Nixx API

REST API sederhana yang menyediakan berbagai fitur seperti AI, Search, Downloader, Tools, dan lainnya.

Base URL

https://core-api1.vercel.app

---

Features

AI

GPT Chat

GET /api/ai/gpt

Parameters:

Name| Type| Required| Description
text| string| Yes| Pertanyaan atau pesan
sessionId| number| No| ID percakapan (default: 1)

Example:

/api/ai/gpt?text=Halo&sessionId=1

---

Search

YouTube Search

GET /api/search/ytsearch

Parameters:

Name| Type| Required| Description
query| string| Yes| Kata kunci pencarian

Example:

/api/search/ytsearch?query=MrBeast

---

Downloader

Facebook Downloader

GET /api/download/facebook

Parameters:

Name| Type| Required| Description
url| string| Yes| URL Facebook

Example:

/api/download/facebook?url=https://www.facebook.com/share/v/14dpuyHMtz1/

---

Response Format

Success:

{
  "status": true,
  "creator": "Nixx",
  "result": {}
}

Error:

{
  "status": false,
  "creator": "Nixx",
  "message": "Terjadi kesalahan"
}

---

Session System

Endpoint AI mendukung session.

Contoh:

sessionId=1

Percakapan berikutnya dengan session yang sama akan melanjutkan konteks sebelumnya.

/api/ai/gpt?text=Halo&sessionId=1

/api/ai/gpt?text=Siapa nama saya?&sessionId=1

---

Status

API masih dalam tahap pengembangan dan endpoint akan terus bertambah.

Creator

Nixx
