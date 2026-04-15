# FitPass Mobile App - Kết nối Production Backend


## Chạy app mobile với từng môi trường


### 1. Local development (API local)
```bash
npm run start:local
# Script sẽ tự động copy .env.local thành .env rồi chạy expo start
```

### 2. Online Railway production (API production)
```bash
npm run start:online
# Script sẽ tự động copy .env.online thành .env rồi chạy expo start
```

### 3. Build app (Expo/EAS build)
- Expo sẽ tự động dùng `.env.production` nếu build profile production.

---

## Cấu trúc file env
- `.env.local`: Dùng cho phát triển local (API localhost hoặc IP LAN)
- `.env.online`: Dùng cho test/preview online (API Railway production)
- `.env.production`: Dùng cho build thực tế (Expo/EAS build production)

Không cần đổi tên file env thủ công, chỉ cần chạy đúng script.
