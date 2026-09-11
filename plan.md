# Implementation Plan: OAuth2 Authentication (Google + GitHub)

## Overview
Thêm xác thực xã hội (OAuth2) cho Google và GitHub để người dùng đăng nhập/đăng ký an toàn bằng tài khoản bên ngoài.

## Tasks
- [ ] Thêm dependencies: passport, passport-google-oauth20, passport-github2, express-session
- [ ] Tạo routes: `/auth/google`, `/auth/google/callback`, `/auth/github`, `/auth/github/callback`
- [ ] Cấu hình Passport strategies cho Google & GitHub
- [ ] Lưu session / token (secure cookie / DB session)
- [ ] UI: login button + callback handling
- [ ] Viết unit & integration tests
- [ ] Cập nhật docs / env vars (.env.example)
- [ ] QA & rollout (canary → production)

## Detailed Steps
1. Install:
   - npm i passport passport-google-oauth20 passport-github2 express-session
2. Env:
   - thêm GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET, SESSION_SECRET
3. Backend:
   - `src/auth/passport.ts`: cấu hình serializeUser/deserializeUser và strategies
   - `src/routes/auth.ts`: implement routes, redirect to provider, handle callbacks, create/find user in DB
   - Ví dụ route: `GET /auth/google` → `passport.authenticate('google', { scope: ['profile','email'] })`
4. Session:
   - Sử dụng express-session, lưu sessions vào Redis/DB nếu production
5. Frontend:
   - Thêm nút “Sign in with Google/GitHub”, xử lý redirect và hiển thị user info
6. Tests:
   - Unit: strategy config, user upsert logic
   - Integration: simulate OAuth callback (stub), end-to-end login flow
7. Security:
   - Kiểm tra callback origin, dùng HTTPS, set secure cookie flags, validate scopes
8. Rollout:
   - Merge -> deploy on staging, smoke test login, enable for 5% canary users, monitor logs & errors, full rollout

## Acceptance Criteria
- Người dùng có thể đăng nhập bằng Google hoặc GitHub
- Tokens/session lưu an toàn, không lộ secret
- Tests coverage cho logic auth >= 80%
- Docs (.env.example) cập nhật

## Estimated time
- Dev: 1.5–2 days
- Tests & QA: 0.5–1 day
- Rollout & monitoring: 0.5 day

---

# Security checklist — Tokens / Sessions

Dưới đây là checklist chi tiết để đảm bảo tokens và session được lưu trữ an toàn và không lộ secret.

- Secrets: lưu mọi secret ngoài mã nguồn (env vars, GitHub Secrets, Vault). Ghi rõ biến env cần set (GOOGLE_CLIENT_ID, SESSION_SECRET, ...).
- Session store: dùng Redis/DB production-grade (không dùng in-memory). Kết nối Redis qua TLS, giới hạn truy cập mạng.
- Cookie flags: HttpOnly, Secure, SameSite=Lax/Strict; set đúng domain/path và expiry.
- Token lifecycle: access token ngắn hạn; dùng refresh token có rotation; hạn chế scope.
- At-rest encryption: mã hóa trường token trong DB khi cần tuân thủ.
- No secrets in logs: mask/strip tokens & secrets trước khi log; review log config.
- Transport security: HTTPS everywhere, HSTS, TLS 1.2+; force redirect HTTP→HTTPS.
- CSRF & clickjacking: CSRF token cho các POST/PUT; X-Frame-Options header.
- Input validation: kiểm tra redirect_uri, origin, state parameter khi xử lý callback.
- Rate limiting & brute-force: giới hạn attempts trên callback/login endpoints; block abusive IPs.
- Rotation & revocation: có endpoint `/admin/revoke-session` và kế hoạch rotate SESSION_SECRET/keys.
- Secrets lifecycle: periodic rotation, audit trail, and emergency rotation playbook.
- CI static checks: git-secrets/truffleHog, secret-scan trong CI; fail build on secret leak.
- Dependency security: Dependabot or equivalent; run SCA & vuln scans (Snyk/OSS).
- Monitoring & alerts: instrument auth flows, track 5xx, token error rates, and alert on anomalies.
- Tests: unit tests cho auth logic, integration tests simulating OAuth callbacks, end-to-end smoke tests on staging.
- Canary & rollout: deploy to staging → canary (5% users) → full; monitor logs and error budgets.
- Acceptance criteria (security): no secrets in repo, secure cookies, token rotation validated, tests pass, monitoring alerts baseline acceptable.

---

*END*
