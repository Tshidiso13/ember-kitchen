# Ember Kitchen — Full Stack

Ember Kitchen is now a full-stack restaurant ordering system, not a local-only prototype.

## Applications

- **Mobile customer app (root)** — React Native + Expo SDK 57
- **API (`backend/`)** — NestJS + Prisma + PostgreSQL
- **Admin (`admin/`)** — React + Vite web dashboard

## Customer features

- Register, sign in, refresh sessions and sign out
- Access/refresh JWT authentication
- Tokens stored with Expo SecureStore on Android/iOS
- Live menu and categories from the backend
- Search and category filtering
- Account-based favourites
- Basket with extras and special requests
- Delivery or collection ordering
- Server-side price and delivery-fee validation
- Order history and live order status
- Reorder available items
- Customer profile, phone and delivery address
- Restaurant accepting-orders state

## Admin features

- Separate admin sign-in
- Operational dashboard metrics
- View every order and its customer/items
- Change order status: pending → confirmed → preparing → ready / out for delivery → completed
- View menu and toggle item availability
- Create menu items
- View customers and order counts
- Edit restaurant name, phone, collection address, delivery fee, minimum order and ordering availability

## Backend protections

- Passwords hashed with bcrypt
- Short-lived access tokens + refresh-token rotation
- Refresh tokens are hashed before database storage
- Role-protected admin endpoints
- DTO validation with unknown-field rejection
- Menu prices are never trusted from the mobile client
- Order totals are calculated by the API from current database prices
- Unavailable dishes cannot be ordered
- Database-level unique constraints and relations

## 1. Mobile app — Expo SDK 57

The project remains on the SDK 57 family. The important versions in this project are:

- Expo `57.x`
- React Native `0.86.3`
- React `19.2.3`
- React Native Web `0.21.x`

Create `.env` from `.env.example`.

For a **physical phone using Expo Go**, `localhost` points to the phone, not your computer. Use your computer's LAN IPv4 address:

```env
EXPO_PUBLIC_API_URL=http://192.168.1.20:5000/api
```

Replace `192.168.1.20` with the IPv4 address shown by `ipconfig` on the PC. The phone and PC must be on the same network.

Windows PowerShell:

```powershell
npm.cmd install
npx.cmd expo start -c
```

## 2. Backend

Create a PostgreSQL database (local PostgreSQL, Neon, Supabase Postgres, Railway Postgres, etc.). Then:

```powershell
cd backend
copy .env.example .env
npm.cmd install
npx.cmd prisma generate
npx.cmd prisma migrate dev --name init
npm.cmd run prisma:seed
npm.cmd run start:dev
```

Edit `backend/.env` before migration. At minimum set:

```env
DATABASE_URL="postgresql://..."
JWT_ACCESS_SECRET="a-long-random-value"
JWT_REFRESH_SECRET="another-long-random-value"
ADMIN_EMAIL="your-admin-email@example.com"
ADMIN_PASSWORD="a-strong-unique-password"
```

The API will run at:

```text
http://localhost:5000/api
```

The seed creates the admin account, restaurant settings and the current Ember Kitchen menu in the database. After that, the database is the source of truth.

## 3. Admin dashboard

```powershell
cd admin
copy .env.example .env
npm.cmd install
npm.cmd run dev
```

Default local API setting:

```env
VITE_API_URL=http://localhost:5000/api
```

Open the Vite URL shown in the terminal and sign in using `ADMIN_EMAIL` and `ADMIN_PASSWORD` from the backend environment.

## Order/payment scope

Orders are real database records. The current payment method is **pay on delivery / pay on collection**; there is no fake card payment UI. An online gateway such as PayFast can be added later without changing order ownership or totals.

## Production before public release

Use HTTPS URLs, production PostgreSQL, strong unique secrets, a real restaurant address/phone, licensed food images, a production CORS allow-list, automated backups, logging/monitoring, and an online payment gateway only if Ember Kitchen wants prepaid orders.
