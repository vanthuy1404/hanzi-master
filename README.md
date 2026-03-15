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
