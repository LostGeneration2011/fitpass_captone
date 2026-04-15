# 🐛 GOOGLE OAUTH DEBUG CHECKLIST

## ⚠️ CÁC LỖI PHỔ BIẾN VÀ CÁCH FIX NHANH

### 1️⃣ LỖI: `Unknown argument googleId` - Prisma Client chưa regenerate

**Triệu chứng:**
```
PrismaClientValidationError: Unknown argument `googleId`. Available options are marked with ?.
```

**Nguyên nhân:** 
- Đã thêm fields mới vào `schema.prisma` (googleId, provider, avatar)
- Đã chạy `npx prisma db push` 
- **NHƯNG QUÊN** chạy `npx prisma generate`

**FIX NHANH (1 phút):**
```powershell
# Step 1: Stop backend (Ctrl+C hoặc taskkill)
taskkill /F /IM node.exe /T

# Step 2: Regenerate Prisma Client
cd fitpass-captone\backend
npx prisma generate

# Step 3: Restart backend
npm run dev
```

**GHI NHỚ:** 
- ✅ Sau mỗi lần thay đổi `schema.prisma` → PHẢI chạy `prisma generate`
- ✅ Không thể generate khi backend đang chạy (file locked)
- ✅ Thứ tự: `db push` → `generate` → `restart server`

---

### 2️⃣ LỖI: Google Sign In button loading vô tận

**Triệu chứng:**
- Click "Đăng nhập bằng Google" → Spinner quay mãi
- Backend log: `GET /api/auth/google/callback ... 200` (thành công)
- Nhưng app không navigate, không toast, không gì cả

**Nguyên nhân:**
- `WebBrowser.openAuthSessionAsync()` không tự động parse callback URL
- Backend redirect về deep link nhưng app không xử lý `result.type === 'success'`
- Chỉ xử lý `result.type === 'cancel'` → Nếu thành công thì không có code xử lý

**FIX NHANH:**
```typescript
const result = await WebBrowser.openAuthSessionAsync(
  googleAuthUrl,
  'fitpass://auth/callback'
);

// ❌ WRONG: Chỉ check cancel
if (result.type === 'cancel') { ... }

// ✅ CORRECT: Phải check success trước
if (result.type === 'success' && result.url) {
  // Parse result.url để lấy token và user
  const params = new URLSearchParams(result.url.split('?')[1]);
  const token = params.get('token');
  const userStr = params.get('user');
  // ... xử lý login
} else if (result.type === 'cancel') {
  // Xử lý cancel
}
```

**GHI NHỚ:**
- ✅ `WebBrowser.openAuthSessionAsync` trả về object `{ type, url }`
- ✅ Phải xử lý `type === 'success'` để parse callback URL
- ✅ Phải reset `setGoogleLoading(false)` trong MỌI trường hợp (success/cancel/error)

---

### 3️⃣ LỖI: `No matching version found for expo-web-browser@~14.0.6`

**Triệu chứng:**
```
npm error notarget No matching version found for expo-web-browser@~14.0.6
```

**Nguyên nhân:**
- Version không tồn tại trên npm registry
- Expo SDK 54 tương thích với version khác

**FIX NHANH:**
```json
// package.json - Thử các version này theo thứ tự:
"expo-web-browser": "~14.0.0"  // Try first
"expo-web-browser": "^13.0.3"  // If above fails
```

**GHI NHỚ:**
- ✅ Check version tương thích: https://docs.expo.dev/versions/latest/
- ✅ Dùng `~` cho minor version, `^` cho major version

---

### 4️⃣ LỖI: Deep link không hoạt động

**Triệu chứng:**
- Backend redirect về `fitpass://auth/callback?token=...`
- App không nhận được callback
- Browser vẫn mở, không close

**Nguyên nhân:**
- `app.json` chưa có `"scheme": "fitpass"`
- Hoặc Linking listener chưa được setup

**FIX NHANH:**
```json
// app.json
{
  "expo": {
    "scheme": "fitpass",  // ← QUAN TRỌNG!
    ...
  }
}
```

```typescript
// login.tsx
useEffect(() => {
  const subscription = Linking.addEventListener('url', handleDeepLink);
  return () => subscription.remove();
}, []);
```

**GHI NHỚ:**
- ✅ Scheme phải match với backend redirect URL
- ✅ iOS cần rebuild sau khi thay đổi scheme
- ✅ Android auto-detect, không cần rebuild

---

## 🔧 DEBUG WORKFLOW CHUẨN

### Khi implement Google OAuth từ đầu:

1. **Backend Schema (5 phút)**
   ```bash
   # Add fields to schema.prisma
   npx prisma db push
   npx prisma generate  # ← QUAN TRỌNG!
   ```

2. **Backend Code (10 phút)**
   ```bash
   npm install passport passport-google-oauth20
   # Create passport.ts, update routes
   npm run dev
   ```

3. **Mobile App (10 phút)**
   ```bash
   npm install expo-web-browser
   # Update app.json with scheme
   # Update login.tsx
   npx expo start
   ```

4. **Google Cloud Console (5 phút)**
   - Create OAuth credentials
   - Add ngrok URL to authorized origins/redirects
   - Add test users

5. **Test (2 phút)**
   - Click Google button
   - Check console logs
   - Verify navigation

**TỔNG THỜI GIAN:** ~30 phút (nếu không gặp lỗi)

---

## 📊 DEBUG CHECKLIST KHI GẶP LỖI

- [ ] Prisma Client đã regenerate? (`npx prisma generate`)
- [ ] Backend đang chạy? (port 3001)
- [ ] Ngrok đang chạy? (check URL)
- [ ] Google Cloud Console có test users?
- [ ] `app.json` có scheme `"fitpass"`?
- [ ] `expo-web-browser` đã cài? (`npm list expo-web-browser`)
- [ ] `handleGoogleSignIn` xử lý `result.type === 'success'`?
- [ ] `setGoogleLoading(false)` trong mọi trường hợp?

---

## 🚨 LỖI NGHIÊM TRỌNG CẦN BIẾT

### Password field nullable
```prisma
// ❌ WRONG: Google users sẽ bị lỗi
password String

// ✅ CORRECT: Cho phép null với Google users
password String?
```

### Provider logic
```typescript
// Khi link existing user với Google:
provider: user.provider === 'local' ? 'both' : 'google'

// User có thể đăng nhập cả 2 cách:
// 1. Email + Password (nếu có password)
// 2. Google Sign In (nếu có googleId)
```

---

## 📝 NOTES

**Thời gian debug thực tế cho issue này:** 3 lần thử nghiệm
1. Lần 1: Quên `prisma generate` → 5 phút
2. Lần 2: `expo-web-browser` version sai → 3 phút  
3. Lần 3: Không xử lý `result.type === 'success'` → 10 phút

**Nếu có checklist này từ đầu:** ~30 giây (check 3 items đầu)

---

## 🎯 QUICK FIX COMMANDS

```powershell
# Reset everything và start lại
taskkill /F /IM node.exe /T
cd fitpass-captone\backend
npx prisma generate
npm run dev

cd fitpass-app
npx expo start --clear
```

**Mọi lỗi Google OAuth thường do 1 trong 4 nguyên nhân:**
1. Prisma Client chưa regenerate
2. WebBrowser callback không xử lý đúng
3. Deep link scheme chưa config
4. Google Cloud test users chưa add

**Fix theo thứ tự này → 90% sẽ work!** ✅
