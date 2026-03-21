# Hanzi Master Frontend (Next.js)

Frontend-only cho dang nhap/dang ky, ket noi API NestJS da co san.

## 1. Chay local

1. Tao file env:
```bash
cp .env.local.example .env.local
```

2. Sua `.env.local`:
```bash
NEXT_PUBLIC_API_BASE_URL=http://localhost:3000
```

3. Chay frontend:
```bash
npm install
npm run dev -- -p 3001
```

Frontend: `http://localhost:3001`  
Backend: `http://localhost:3000`

## 2. API dang su dung

- `POST /auth/register`
- `POST /auth/login`

Token va thong tin user se duoc luu o `localStorage`:
- `auth_token`
- `auth_user`

## 3. Nginx chung 1 cong public voi backend

File mau: `deploy/nginx/hanzi-master.conf`

Kich ban:
- Nginx nghe cong `80`
- Next.js chay `127.0.0.1:3001`
- NestJS chay `127.0.0.1:3000`
- Cac route backend (`/auth`, `/chu-de`, `/tu-vung`, `/ket-ban`, `/chat`) duoc proxy ve NestJS
- Cac route con lai proxy ve Next.js

Nhu vay frontend va backend cung di qua 1 domain/1 cong public.

## 4. Deploy frontend tren Render

Repo da co san file `render.yaml` cho frontend.

### Cach deploy nhanh

1. Push code len GitHub.
2. Tren Render, chon **New +** -> **Blueprint**.
3. Chon repo `chinese-learning-frontend`.
4. Render se tao 1 Node Web Service theo `render.yaml`.
5. Set env `NEXT_PUBLIC_API_BASE_URL` = URL backend Render
   (vi du: `https://chinese-learning-api.onrender.com`).
6. Deploy.

Build/Start:
- Build: `npm ci && npm run build`
- Start: `npm run start`
