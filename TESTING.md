# Ember Kitchen verification checklist

## Backend

1. Copy `backend/.env.example` to `backend/.env` and set a real PostgreSQL `DATABASE_URL` plus JWT secrets.
2. Run `npm install`, `npx prisma generate`, `npx prisma migrate dev --name init`, and `npm run prisma:seed`.
3. Start the API and confirm `GET /api/menu` and `GET /api/settings` return data.
4. Register a customer and verify the password column contains a hash, never the raw password.
5. Place an order and confirm the database total matches current menu prices plus the configured delivery fee.
6. Mark a menu item unavailable and confirm a new order containing it is rejected.
7. Confirm a customer JWT receives 403 on `/api/admin/*` routes.

## Mobile

1. Set `EXPO_PUBLIC_API_URL` to the computer LAN IP when testing on a physical phone.
2. Register, close the app, reopen it and confirm the secure session restores.
3. Save/unsave a favourite and confirm it follows the account, not just the device.
4. Add an item with an extra and note; change basket quantities.
5. Place a collection order and confirm no delivery fee is charged.
6. Place a delivery order and confirm the configured delivery fee is used.
7. Confirm the order appears under Orders with its backend order number and status.
8. Change the status from the admin dashboard and refresh the customer Orders tab/app to verify the new status.
9. Update profile details, restart, and confirm they reload from the backend.
10. Sign out and confirm protected account/order data is no longer visible.

## Admin

1. Sign in using the seeded admin account.
2. Confirm overview metrics come from current database data.
3. Change an order from PENDING to CONFIRMED and then PREPARING.
4. Toggle a menu item unavailable and verify it disappears from the customer menu after refresh/restart.
5. Create a menu item and verify it appears on the customer app.
6. Change delivery fee / accepting-orders status and confirm checkout reflects the update.
