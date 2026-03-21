# Chinese Learning API

Backend NestJS + Prisma + PostgreSQL.

## 1. Environment

- Node.js 22+
- PostgreSQL
- `.env`:
  - `DATABASE_URL`
  - `JWT_SECRET`
  - `JWT_EXPIRES_IN` (vd: `7d`)
  - `PORT` (mac dinh `3000`)

## 2. Setup va run

```bash
npm install
npx prisma migrate deploy
npx prisma generate
npm run start:dev
```

Base URL: `http://localhost:3000`

## 3. API routes + payload

### 3.1 Health check

`GET /`

Response:

```json
"Hello World!"
```

### 3.2 Auth

#### Dang ky

`POST /auth/register`

Payload:

```json
{
  "username": "alice",
  "email": "alice@example.com",
  "password": "123456"
}
```

Response:

```json
{
  "message": "dang ky thanh cong",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "role_id": null,
    "created_at": "2026-03-10T15:00:00.000Z"
  }
}
```

#### Dang nhap

`POST /auth/login`

Payload:

```json
{
  "username": "alice",
  "password": "123456"
}
```

Response:

```json
{
  "access_token": "<jwt_token>",
  "user": {
    "id": 1,
    "username": "alice",
    "email": "alice@example.com",
    "role_id": null
  }
}
```

#### Profile

`GET /auth/profile`

Header:

```http
Authorization: Bearer <jwt_token>
```

Response:

```json
{
  "user": {
    "sub": 1,
    "username": "alice",
    "role_id": null,
    "iat": 1710000000,
    "exp": 1710600000
  }
}
```

### 3.3 Chu de

Base path: `/chu-de`

#### Lay danh sach chu de

`GET /chu-de`

Response:

```json
[
  {
    "id": 1,
    "ten_chu_de": "HSK1",
    "mo_ta": "Co ban",
    "created_by": 1,
    "created_at": "2026-03-10T15:00:00.000Z"
  }
]
```

#### Lay 1 chu de

`GET /chu-de/:id`

Response:

```json
{
  "id": 1,
  "ten_chu_de": "HSK1",
  "mo_ta": "Co ban",
  "created_by": 1,
  "created_at": "2026-03-10T15:00:00.000Z"
}
```

#### Tao chu de

`POST /chu-de`

Payload:

```json
{
  "ten_chu_de": "HSK2",
  "mo_ta": "Trung cap",
  "created_by": 1
}
```

#### Cap nhat chu de

`PUT /chu-de/:id`

Payload:

```json
{
  "ten_chu_de": "HSK2 update",
  "mo_ta": "Trung cap moi"
}
```

#### Xoa chu de

`DELETE /chu-de/:id`

Response: object chu de da xoa.

### 3.4 Tu vung

Base path: `/tu-vung`

#### Lay danh sach tu vung

`GET /tu-vung`

#### Lay 1 tu vung

`GET /tu-vung/:id`

#### Tao 1 tu vung

`POST /tu-vung`

Payload:

```json
{
  "hanzi": "ni hao",
  "pinyin": "ni hao",
  "pinyin_plain": "ni hao",
  "nghia_vi": "xin chao",
  "nghia_en": "hello",
  "example_cn": "ni hao ma",
  "example_vi": "ban khoe khong",
  "chu_de_id": 1
}
```

Response (neu trung hanzi/pinyin):

```json
{
  "inserted": false,
  "message": "Tu vung da ton tai",
  "existed": {
    "id": 10,
    "hanzi": "ni hao"
  }
}
```

#### Tao nhieu tu vung (JSON)

`POST /tu-vung/bulk?chu_de_id=1`

Payload cach 1 (array):

```json
[
  {
    "hanzi": "xie xie",
    "pinyin": "xie xie",
    "nghia_vi": "cam on"
  },
  {
    "hanzi": "zai jian",
    "pinyin": "zai jian",
    "nghia_vi": "tam biet"
  }
]
```

Payload cach 2 (object):

```json
{
  "chu_de_id": 1,
  "items": [
    {
      "hanzi": "xie xie",
      "pinyin": "xie xie",
      "nghia_vi": "cam on"
    }
  ]
}
```

Response:

```json
{
  "count": 2,
  "skipped": 0
}
```

#### Tao nhieu tu vung (Excel)

`POST /tu-vung/bulk/excel`

Content-Type: `multipart/form-data`

Form-data:

- `file`: file `.xlsx`
- `chu_de_id`: `1` (co the gui qua query `?chu_de_id=1`)

Header trong excel can co:

- `hanzi` (bat buoc)
- `pinyin`
- `pinyin_plain`
- `nghia_vi`
- `nghia_en`
- `example_cn`
- `example_vi`

Response:

```json
{
  "count": 10,
  "skipped": 2
}
```

#### Cap nhat tu vung

`PUT /tu-vung/:id`

Payload:

```json
{
  "nghia_vi": "xin chao ban",
  "example_vi": "xin chao moi nguoi"
}
```

#### Xoa tu vung

`DELETE /tu-vung/:id`

Response: object tu vung da xoa.

### 3.5 Ket ban

Base path: `/ket-ban`

#### Gui loi moi ket ban

`POST /ket-ban/gui-loi-moi`

Payload:

```json
{
  "user_id": 1,
  "friend_id": 2
}
```

Response:

```json
{
  "message": "gui loi moi ket ban thanh cong",
  "data": {
    "id": 1,
    "user_id": 1,
    "friend_id": 2,
    "trang_thai": "pending",
    "created_at": "2026-03-10T15:00:00.000Z"
  }
}
```

#### Chap nhan ket ban

`POST /ket-ban/chap-nhan`

Payload:

```json
{
  "user_id": 1,
  "friend_id": 2
}
```

Response:

```json
{
  "message": "chap nhan ket ban thanh cong",
  "data": {
    "id": 1,
    "user_id": 1,
    "friend_id": 2,
    "trang_thai": "accepted",
    "created_at": "2026-03-10T15:00:00.000Z"
  }
}
```

## 4. Realtime chat module (WebSocket)

Socket.IO namespace: `/chat`

### 4.1 Luong hoat dong

1. Client connect socket den `/chat`.
2. Emit `join_chat` de join room theo cap user.
3. Server emit `chat_history` (100 tin gan nhat).
4. Emit `send_message` de gui tin.
5. Server luu vao `lich_su_chat` va broadcast `new_message`.

Rule:

- Room format: `chat_<minUserId>_<maxUserId>`
- Chi chat duoc khi `ket_ban.trang_thai = accepted`

### 4.2 Events + payload

`join_chat` (client -> server):

```json
{
  "user_id": 1,
  "friend_id": 2
}
```

`chat_history` (server -> client):

```json
{
  "room": "chat_1_2",
  "messages": [
    {
      "id": 11,
      "user_id": 1,
      "friend_id": 2,
      "noi_dung": "xin chao",
      "da_xem": false,
      "created_at": "2026-03-10T15:10:00.000Z"
    }
  ]
}
```

`send_message` (client -> server):

```json
{
  "user_id": 1,
  "friend_id": 2,
  "noi_dung": "ban hoc den dau roi?"
}
```

`new_message` (server -> room):

```json
{
  "id": 12,
  "user_id": 1,
  "friend_id": 2,
  "noi_dung": "ban hoc den dau roi?",
  "da_xem": false,
  "created_at": "2026-03-10T15:11:00.000Z"
}
```

### 4.3 Mau client JS

```js
import { io } from "socket.io-client";

const socket = io("http://localhost:3000/chat", {
  transports: ["websocket"],
});

socket.on("connect", () => {
  socket.emit("join_chat", { user_id: 1, friend_id: 2 });
});

socket.on("chat_history", (payload) => {
  console.log(payload);
});

socket.on("new_message", (message) => {
  console.log(message);
});

function sendMessage(text) {
  socket.emit("send_message", {
    user_id: 1,
    friend_id: 2,
    noi_dung: text,
  });
}
```

## 5. Bang lich_su_chat

Migration da co bang `lich_su_chat`:

- `id`
- `user_id`
- `friend_id`
- `noi_dung`
- `da_xem` (default `false`)
- `created_at`

Index:

- `idx_lich_su_chat_pair_created (user_id, friend_id, created_at)`
- `idx_lich_su_chat_reverse_pair_created (friend_id, user_id, created_at)`

## 6. Commands

```bash
npx prisma validate
npx prisma generate
npm run build
npm run start:dev
```

## 7. Deploy tren Render

Repo da co san file `render.yaml` cho backend.

### Cach deploy nhanh

1. Push code len GitHub.
2. Tren Render, chon **New +** -> **Blueprint**.
3. Chon repo `chinese-learning-api`.
4. Render se doc `render.yaml` va tao 1 Web Service.
5. Tao PostgreSQL tren Render, copy `External Database URL` vao env `DATABASE_URL`.
6. Set them env:
   - `JWT_SECRET`: bat buoc.
   - `JWT_EXPIRES_IN`: mac dinh da la `7d`.
   - `GEMINI_API_KEY`: chi can neu dung tinh nang generate bai tap.
7. Deploy.

Build/Start da duoc cau hinh:
- Build: `npm ci && npx prisma generate && npm run build`
- Start: `npx prisma migrate deploy && npm run start:prod`
