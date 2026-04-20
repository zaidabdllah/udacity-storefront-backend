# Storefront Backend API

## Overview
This project implements a TypeScript/Express REST API for a storefront application. It exposes endpoints for:
- user registration and login
- product browsing and management
- cart/order management
- JWT-based protected routes
- PostgreSQL-backed persistence
- Jasmine test coverage for models and endpoints with SuperTest

The backend is designed for a frontend teammate to consume during beta testing, so the project includes authentication, validation, migrations, and repeatable automated tests.

## Tech Stack
- Node.js `>= 20`
- TypeScript
- Express
- PostgreSQL
- db-migrate
- bcrypt
- jsonwebtoken
- Jasmine & SuperTest

## Required Services
A running PostgreSQL server is required before starting the API or running the tests.

This project expects two PostgreSQL databases:
- development database: `storefront_dev`
- test database: `storefront_test`

If PostgreSQL is not available, the application will fail during startup because `DBService.testConnection()` verifies the database connection before the server begins listening.

## Default Ports
- API server: `3000`
- PostgreSQL server: `5432`

## Database Setup
Create the databases from `psql` or any PostgreSQL client:

```sql
CREATE DATABASE storefront_dev;
CREATE DATABASE storefront_test;
```

If you also need a PostgreSQL user:

```sql
CREATE USER storefront_user WITH PASSWORD 'postgres';
GRANT ALL PRIVILEGES ON DATABASE storefront_dev TO storefront_user;
GRANT ALL PRIVILEGES ON DATABASE storefront_test TO storefront_user;
```

If you use the default `postgres` superuser locally, you can keep `POSTGRES_USER=postgres`.

## Environment Variables
Create a `.env` file in the project root. You can start from `example.env`.

```env
ENV=dev
PORT=3000

POSTGRES_HOST=localhost
POSTGRES_PORT=5432
POSTGRES_DB=storefront_dev
POSTGRES_TEST_DB=storefront_test
POSTGRES_USER=postgres
POSTGRES_PASSWORD=your_postgres_password

BCRYPT_PEPPER=your_pepper_secret
BCRYPT_SALT_ROUNDS=10
TOKEN_SECRET=your_jwt_secret
```

### Environment Variable Reference
| Variable | Required | Description |
| --- | --- | --- |
| `ENV` | Yes | `dev` for local development, `test` when running automated tests |
| `PORT` | Yes | Express server port |
| `POSTGRES_HOST` | Yes | PostgreSQL host |
| `POSTGRES_PORT` | Yes | PostgreSQL port |
| `POSTGRES_DB` | Yes | Development database name |
| `POSTGRES_TEST_DB` | Yes | Test database name |
| `POSTGRES_USER` | Yes | PostgreSQL username |
| `POSTGRES_PASSWORD` | Yes | PostgreSQL password |
| `BCRYPT_PEPPER` | Yes | Extra secret appended before hashing passwords |
| `BCRYPT_SALT_ROUNDS` | Yes | bcrypt salt rounds |
| `TOKEN_SECRET` | Yes | JWT signing secret |

`.env` is already ignored by `.gitignore`, which is required because it contains secrets.

## Installation
```bash
npm install
```

## Run Migrations
Development:

```bash
npm run migrate:up
```

If you need to roll back one migration:

```bash
npm run migrate:down
```

Test database migrations:

```bash
npm run migrate:up:test
```

## Start the Server
Development watch mode:

```bash
npm run watch
```

Direct start:

```bash
npm start
```

When startup succeeds, the API is available at:

```text
http://localhost:3000
```

## Automated Tests
Run the full suite:

```bash
npm test
```

What `npm test` does:
1. migrates the test database up
2. runs Jasmine with `ENV=test`
3. rolls migrations back after the run

### Test Coverage Layout
- model tests: `source/models/tests/*.ts`
- endpoint tests: `source/handlers/routes/tests/*.ts`

Suggested review order:
1. verify model specs
2. verify endpoint specs

## Authentication
Protected routes require a Bearer token in the `Authorization` header:

```http
Authorization: Bearer <jwtToken>
```

JWTs are returned after:
- `POST /users/register`
- `POST /users/login`

## Password Security
User passwords are never stored in plain text.

The API stores `password_digest` using:
- `bcrypt`
- `BCRYPT_PEPPER`
- `BCRYPT_SALT_ROUNDS`

## API Summary
Base URL:

```text
http://localhost:3000
```

Route groups:
- `/users`
- `/products`
- `/orders`

The complete API contract, request/response bodies, database schema, and error code catalog are documented in [REQUIREMENTS.md](./REQUIREMENTS.md).

## Database Schema Summary
### `users`
- `id SERIAL PRIMARY KEY`
- `username VARCHAR(20) UNIQUE NOT NULL`
- `first_name VARCHAR(15)`
- `last_name VARCHAR(15)`
- `password_digest TEXT NOT NULL`

### `products`
- `id SERIAL PRIMARY KEY`
- `name VARCHAR(150) NOT NULL`
- `price NUMERIC(10,2) NOT NULL`
- `category VARCHAR(100)`

### `orders`
- `id SERIAL PRIMARY KEY`
- `user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE`
- `status VARCHAR(20) NOT NULL CHECK (status IN ('active', 'complete'))`

### `order_products`
- `id SERIAL PRIMARY KEY`
- `order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE`
- `product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE`
- `quantity INTEGER NOT NULL CHECK (quantity > 0)`
- `UNIQUE (order_id, product_id)`

## Project Structure
```text
source/
  database/
    migrations/
  handlers/
    routes/
      tests/
  middlewares/
  models/
    tests/
  services/
spec/
```

## Notes for Reviewers
- PostgreSQL access is mandatory for both the application and the test suite.
- The API uses public registration and login routes instead of requiring a token to create the first user.
- The `GET /users/:identifier` endpoint supports either numeric user id or username.
- The user show endpoint includes the 5 most recent purchases from completed orders.
- Product update and product delete endpoints are implemented and tested in addition to the core rubric endpoints.
