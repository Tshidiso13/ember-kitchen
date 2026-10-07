# Ember Kitchen architecture

```text
Expo customer app
      |
      | HTTPS / JSON
      v
NestJS API  --------------------> PostgreSQL
      ^                              |
      |                              | Prisma
      |                              v
React admin dashboard <--------- business data
```

## Ownership rules

The mobile app owns only presentation state and the local basket. The server owns identity, menu availability, category data, favourites, user profile data, restaurant settings, prices, delivery fees, order totals and order status.

The admin dashboard never talks directly to PostgreSQL. It uses the same NestJS API and receives access only when the authenticated user's role is `ADMIN`.

## Main routes

Public:
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/refresh`
- `GET /api/menu`
- `GET /api/settings`

Customer authenticated:
- `POST /api/auth/logout`
- `GET/PATCH /api/users/me`
- `GET/POST/DELETE /api/favourites`
- `GET/POST /api/orders`

Admin authenticated:
- `GET /api/admin/dashboard`
- `GET/PATCH /api/admin/orders`
- `GET/POST/PATCH/DELETE /api/admin/menu`
- `GET/POST/PATCH /api/admin/categories`
- `GET /api/admin/customers`
- `GET/PATCH /api/admin/settings`
