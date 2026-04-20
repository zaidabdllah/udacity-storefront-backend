# Storefront Backend Requirements

## 1. Scope
This API supports a storefront frontend where users can:
- register and log in securely
- browse products
- filter products by category
- view most popular products
- create or retrieve an active cart
- add, update, and remove products inside the cart
- check out the active order
- retrieve completed orders
- retrieve a user profile including the 5 most recent purchases

Base URL:

```text
http://localhost:3000
```

## 2. Authentication Contract
Protected routes require a JWT in the `Authorization` header.

```http
Authorization: Bearer <jwtToken>
```

### Token lifecycle
- token is generated on `POST /users/register`
- token is generated on `POST /users/login`
- token is validated by `verifyAuthToken` on protected routes

### Authentication error responses
| HTTP Status | App Code | Meaning |
| --- | --- | --- |
| `401` | `MISSING_TOKEN` | No `Authorization` header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Header exists but does not contain a Bearer token |
| `401` | `INVALID_TOKEN` | JWT signature is invalid, expired, or cannot be verified |

## 3. Data Shapes

### Product
```json
{
  "id": 1,
  "name": "Wireless Mouse",
  "price": "25.99",
  "category": "accessories"
}
```

### Popular Product
```json
{
  "id": 1,
  "name": "Wireless Mouse",
  "price": "25.99",
  "category": "accessories",
  "total_sold": "18"
}
```

### User Public Shape
```json
{
  "id": 1,
  "username": "zaid",
  "first_name": "Zaid",
  "last_name": "Abdallah"
}
```

### User With Recent Purchases
```json
{
  "id": 1,
  "username": "zaid",
  "first_name": "Zaid",
  "last_name": "Abdallah",
  "recent_purchases": [
    {
      "order_id": 10,
      "product_id": 8,
      "quantity": 2,
      "name": "Mechanical Keyboard",
      "price": "99.95",
      "category": "accessories"
    }
  ]
}
```

### Order Item
```json
{
  "product_id": 3,
  "quantity": 2
}
```

### Order
```json
{
  "id": 5,
  "user_id": 1,
  "status": "active",
  "items": [
    {
      "product_id": 3,
      "name": "Tape Measure",
      "price": "19.99",
      "category": "tools",
      "quantity": 2
    }
  ]
}
```

### Order Product Mutation Result
```json
{
  "id": 7,
  "order_id": 5,
  "product_id": 3,
  "quantity": 2
}
```

## 4. PostgreSQL Database Requirement
This project requires an accessible PostgreSQL server.

The backend will not start successfully without a valid PostgreSQL connection because startup performs a connection check.

Expected databases:
- `storefront_dev`
- `storefront_test`

## 5. Database Schema

### Entity Relationship Summary
- one `user` can have many `orders`
- one `order` belongs to one `user`
- one `order` can contain many `products` through `order_products`
- one `product` can appear in many `orders` through `order_products`

### Table: `users`
| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing user id |
| `username` | `VARCHAR(20)` | `NOT NULL`, `UNIQUE` | Stored lowercase; validated to 3-20 chars; letters/numbers/dot/underscore only |
| `first_name` | `VARCHAR(15)` | nullable | First name |
| `last_name` | `VARCHAR(15)` | nullable | Last name |
| `password_digest` | `TEXT` | `NOT NULL` | bcrypt hash only, never plain text |

### Table: `products`
| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing product id |
| `name` | `VARCHAR(150)` | `NOT NULL` | Product name |
| `price` | `NUMERIC(10,2)` | `NOT NULL`, `CHECK (price >= 0)` | Monetary value |
| `category` | `VARCHAR(100)` | nullable | Stored lowercase by the model |

### Table: `orders`
| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing order id |
| `user_id` | `INTEGER` | `NOT NULL`, `REFERENCES users(id) ON DELETE CASCADE` | Owner of the order |
| `status` | `VARCHAR(20)` | `NOT NULL`, `CHECK (status IN ('active', 'complete'))` | Order state |

### Table: `order_products`
| Column | Type | Constraints | Notes |
| --- | --- | --- | --- |
| `id` | `SERIAL` | `PRIMARY KEY` | Auto-incrementing join row id |
| `order_id` | `INTEGER` | `NOT NULL`, `REFERENCES orders(id) ON DELETE CASCADE` | Related order |
| `product_id` | `INTEGER` | `NOT NULL`, `REFERENCES products(id) ON DELETE CASCADE` | Related product |
| `quantity` | `INTEGER` | `NOT NULL`, `CHECK (quantity > 0)` | Quantity inside order |

Additional constraint:

```sql
UNIQUE (order_id, product_id)
```

This unique key allows the API to increase quantity for an existing product in the same order instead of inserting duplicate order lines.

## 6. API Endpoints

### 6.1 Users

#### `POST /users/register`
Creates a new user account and returns a JWT.

Auth:
- public

Path params:
- none

Request body:
```json
{
  "username": "zaid",
  "first_name": "Zaid",
  "last_name": "Abdallah",
  "password": "secret123"
}
```

Success response:
- HTTP `201 Created`

```json
{
  "ok": true,
  "code": "USER_CREATED",
  "user": {
    "id": 1,
    "username": "zaid",
    "first_name": "Zaid",
    "last_name": "Abdallah"
  },
  "jwtToken": "<token>"
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PASSWORD_REQUIRED` | `password` field is missing |
| `400` | `PASSWORD_TOO_SHORT` | Password is shorter than 6 characters |
| `400` | `USERNAME_REQUIRED` | `username` field is missing |
| `400` | `USERNAME_TOO_SHORT` | Username is shorter than 3 characters |
| `400` | `USERNAME_TOO_LONG` | Username is longer than 20 characters |
| `400` | `USERNAME_CONTAINS_SPACES` | Username contains whitespace |
| `400` | `USERNAME_MUST_CONTAIN_LETTER` | Username has no alphabetic character |
| `400` | `USERNAME_INVALID_FORMAT` | Username does not start with a letter or contains disallowed characters |
| `409` | `USERNAME_ALREADY_EXISTS` | Another user already uses the same username |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `POST /users/login`
Authenticates a user and returns a JWT.

Auth:
- public

Path params:
- none

Request body:
```json
{
  "username": "zaid",
  "password": "secret123"
}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "LOGIN_SUCCESS",
  "user": {
    "id": 1,
    "username": "zaid",
    "first_name": "Zaid",
    "last_name": "Abdallah"
  },
  "jwtToken": "<token>"
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PASSWORD_EMPTY` | Password is missing, empty, or whitespace |
| `400` | `USERNAME_EMPTY` | Username is missing, empty, or whitespace |
| `400` | `PASSWORD_TOO_SHORT` | Password is shorter than 6 characters |
| `400` | `USERNAME_REQUIRED` | Username is missing |
| `400` | `PASSWORD_REQUIRED` | Password is missing |
| `401` | `INVALID_CREDENTIALS` | Username does not exist or password is incorrect |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `GET /users`
Returns all users without password hashes.

Auth:
- JWT required

Path params:
- none

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "USERS_RETRIEVED",
  "users": [
    {
      "id": 1,
      "username": "zaid",
      "first_name": "Zaid",
      "last_name": "Abdallah"
    }
  ]
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `GET /users/:identifier`
Returns one user by numeric id or by username. The response also includes the 5 most recent purchases from completed orders.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `identifier` | `string` | Yes | Either a numeric user id or a username |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "USER_RETRIEVED",
  "user": {
    "id": 1,
    "username": "zaid",
    "first_name": "Zaid",
    "last_name": "Abdallah",
    "recent_purchases": [
      {
        "order_id": 10,
        "product_id": 8,
        "quantity": 2,
        "name": "Mechanical Keyboard",
        "price": "99.95",
        "category": "accessories"
      }
    ]
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `USER_NOT_FOUND` | No user matches the supplied id or username |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

### 6.2 Products

#### `GET /products`
Returns all products.

Auth:
- public

Path params:
- none

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCTS_RETRIEVED",
  "products": [
    {
      "id": 1,
      "name": "Wireless Mouse",
      "price": "25.99",
      "category": "accessories"
    }
  ]
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `GET /products/:id`
Returns one product by id.

Auth:
- public

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `integer` | Yes | Product id |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCT_RETRIEVED",
  "product": {
    "id": 1,
    "name": "Wireless Mouse",
    "price": "25.99",
    "category": "accessories"
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `404` | `PRODUCT_NOT_FOUND` | No product exists for the supplied id |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `POST /products`
Creates a new product.

Auth:
- JWT required

Path params:
- none

Request body:
```json
{
  "name": "Wireless Mouse",
  "price": 25.99,
  "category": "Accessories"
}
```

Success response:
- HTTP `201 Created`

```json
{
  "ok": true,
  "code": "PRODUCT_CREATED",
  "product": {
    "id": 1,
    "name": "Wireless Mouse",
    "price": "25.99",
    "category": "accessories"
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PRODUCT_NAME_REQUIRED` | `name` field is missing |
| `400` | `PRODUCT_NAME_EMPTY` | `name` is empty or whitespace |
| `400` | `PRODUCT_NAME_TOO_LONG` | `name` exceeds 150 characters |
| `400` | `PRODUCT_PRICE_REQUIRED` | `price` is missing |
| `400` | `PRODUCT_PRICE_MUST_BE_NUMBER` | `price` cannot be converted to a valid number |
| `400` | `PRODUCT_PRICE_NEGATIVE` | `price` is below zero |
| `400` | `PRODUCT_PRICE_NOT_LOGICAL` | `price` exceeds the application upper validation limit |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `PATCH /products/:id`
Updates one or more product fields.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `integer` | Yes | Product id |

Request body example:
```json
{
  "name": "New Mouse",
  "price": 30,
  "category": "Electronics"
}
```

Request body rules:
- at least one of `name`, `price`, or `category` must be provided
- the endpoint supports partial updates

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCT_UPDATED",
  "product": {
    "id": 1,
    "name": "New Mouse",
    "price": "30.00",
    "category": "electronics"
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PRODUCT_ID_INVALID` | `id` is not a positive integer |
| `400` | `PRODUCT_UPDATE_FIELDS_REQUIRED` | Body does not contain any updatable field |
| `400` | `PRODUCT_NAME_EMPTY` | Provided `name` is empty or whitespace |
| `400` | `PRODUCT_NAME_TOO_LONG` | Provided `name` exceeds 150 characters |
| `400` | `PRODUCT_PRICE_REQUIRED` | Provided `price` field is empty/null |
| `400` | `PRODUCT_PRICE_MUST_BE_NUMBER` | Provided `price` is not numeric |
| `400` | `PRODUCT_PRICE_NEGATIVE` | Provided `price` is below zero |
| `400` | `PRODUCT_PRICE_NOT_LOGICAL` | Provided `price` exceeds the application upper validation limit |
| `400` | `PRODUCT_CATEGORY_EMPTY` | Provided `category` is empty or whitespace |
| `400` | `PRODUCT_CATEGORY_TOO_LONG` | Provided `category` exceeds 100 characters |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `PRODUCT_NOT_FOUND` | Product id does not exist |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `DELETE /products/:id`
Deletes a product.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `id` | `integer` | Yes | Product id |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCT_DELETED",
  "product": {
    "id": 1,
    "name": "Delete Target",
    "price": "22.00",
    "category": "tools"
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PRODUCT_ID_INVALID` | `id` is not a positive integer |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `PRODUCT_NOT_FOUND` | Product id does not exist |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `GET /products/category/:category`
Returns products filtered by category. Category matching is case-insensitive because categories are normalized to lowercase in storage.

Auth:
- public

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `category` | `string` | Yes | Product category |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCTS_BY_CATEGORY_RETRIEVED",
  "products": [
    {
      "id": 1,
      "name": "USB-C Cable",
      "price": "7.50",
      "category": "accessories"
    }
  ]
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `GET /products/popular/:limit`
Returns the most popular products, ordered by total quantity sold across completed orders only.

Auth:
- public

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `limit` | `integer` | Yes | Maximum number of products to return |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "POPULAR_PRODUCTS_RETRIEVED",
  "products": [
    {
      "id": 1,
      "name": "Route Hammer",
      "price": "12.00",
      "category": "tools",
      "total_sold": "6"
    }
  ]
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `INVALID_LIMIT` | `limit` is not a positive integer |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

### 6.3 Orders

#### `GET /orders/current/:userId`
Returns the active order for a user. If the user has no active order, the API creates one and returns it.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | `integer` | Yes | User id |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "ORDER_CREATED_OR_RETRIEVED",
  "order": {
    "id": 5,
    "user_id": 1,
    "status": "active",
    "items": [
      {
        "product_id": 3,
        "name": "Tape Measure",
        "price": "19.99",
        "category": "tools",
        "quantity": 2
      }
    ]
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `USER_ID_REQUIRED` | `userId` is missing |
| `400` | `USER_ID_INVALID` | `userId` is not a positive integer |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `USER_NOT_FOUND` | No user exists for the supplied id |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `POST /orders/:orderId/product`
Adds a product to an active order. If the product already exists in the same order, quantity is incremented because the API uses `ON CONFLICT ... DO UPDATE`.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `orderId` | `integer` | Yes | Active order id |

Request body:
```json
{
  "product_id": 3,
  "quantity": 2
}
```

Notes:
- treat `quantity` as required for client integrations; omitting it is not part of the supported contract.
- when the same product is added again, quantity increases instead of creating a second row.

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCT_ADDED_TO_ORDER",
  "productInOrder": {
    "id": 7,
    "order_id": 5,
    "product_id": 3,
    "quantity": 2
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PRODUCT_ID_REQUIRED` | `product_id` is missing |
| `400` | `PRODUCT_ID_INVALID` | `product_id` is not a positive integer |
| `400` | `ORDER_ID_INVALID` | `orderId` is not a positive integer |
| `400` | `QUANTITY_INVALID` | `quantity` is not a positive integer |
| `400` | `ORDER_NOT_ACTIVE` | Order exists but status is not `active` |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `404` | `PRODUCT_NOT_FOUND` | Product does not exist |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `PATCH /orders/:orderId/product`
Updates quantity for a product already present in an active order.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `orderId` | `integer` | Yes | Active order id |

Request body:
```json
{
  "product_id": 3,
  "quantity": 5
}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCT_QUANTITY_UPDATED",
  "productInOrder": {
    "id": 7,
    "order_id": 5,
    "product_id": 3,
    "quantity": 5
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PRODUCT_ID_REQUIRED` | `product_id` is missing |
| `400` | `PRODUCT_ID_INVALID` | `product_id` is not a positive integer |
| `400` | `ORDER_ID_INVALID` | `orderId` is not a positive integer |
| `400` | `QUANTITY_REQUIRED` | `quantity` is missing |
| `400` | `QUANTITY_INVALID` | `quantity` is not a positive integer |
| `400` | `ORDER_NOT_ACTIVE` | Order exists but status is not `active` |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `404` | `PRODUCT_NOT_FOUND_IN_ORDER` | Product is not currently inside the target order |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `DELETE /orders/:orderId/product`
Removes a product from an active order.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `orderId` | `integer` | Yes | Active order id |

Request body:
```json
{
  "product_id": 3
}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "PRODUCT_REMOVED_FROM_ORDER",
  "productInOrder": {
    "id": 7,
    "order_id": 5,
    "product_id": 3,
    "quantity": 5
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `PRODUCT_ID_REQUIRED` | `product_id` is missing |
| `400` | `PRODUCT_ID_INVALID` | `product_id` is not a positive integer |
| `400` | `ORDER_ID_INVALID` | `orderId` is not a positive integer |
| `400` | `ORDER_NOT_ACTIVE` | Order exists but status is not `active` |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `404` | `PRODUCT_NOT_FOUND_IN_ORDER` | Product is not currently inside the target order |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `PATCH /orders/:orderId/checkout`
Checks out an active order by changing its status from `active` to `complete`.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `orderId` | `integer` | Yes | Active order id |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "ORDER_CHECKED_OUT",
  "order": {
    "id": 5,
    "user_id": 1,
    "status": "complete",
    "items": [
      {
        "product_id": 3,
        "name": "Saw",
        "price": "19.99",
        "category": "tools",
        "quantity": 2
      }
    ]
  }
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `ORDER_ID_INVALID` | `orderId` is not a positive integer |
| `400` | `ORDER_NOT_ACTIVE` | Order exists but is already complete |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `404` | `ORDER_NOT_FOUND` | Order does not exist |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

#### `GET /orders/completed/:userId`
Returns completed orders for a user.

Auth:
- JWT required

Path params:
| Param | Type | Required | Description |
| --- | --- | --- | --- |
| `userId` | `integer` | Yes | User id |

Request body:
```json
{}
```

Success response:
- HTTP `200 OK`

```json
{
  "ok": true,
  "code": "COMPLETED_ORDERS_RETRIEVED",
  "orders": [
    {
      "id": 5,
      "user_id": 1,
      "status": "complete"
    }
  ]
}
```

Possible errors:
| HTTP Status | App Code | Why it happens |
| --- | --- | --- |
| `400` | `USER_ID_INVALID` | `userId` is not a positive integer |
| `401` | `MISSING_TOKEN` | No token header was sent |
| `401` | `INVALID_TOKEN_FORMAT` | Authorization header is malformed |
| `401` | `INVALID_TOKEN` | JWT cannot be verified |
| `500` | `INTERNAL_SERVER_ERROR` | Unexpected server or database failure |

Behavior note:
- if the user exists but has no completed orders, the endpoint returns `200` with `orders: []`
- the current implementation does not distinguish between a user with no completed orders and a non-existent user id

## 7. Global HTTP Status Policy
| HTTP Status | Meaning in this project |
| --- | --- |
| `200` | Successful read, update, delete, or non-creating mutation |
| `201` | Successful resource creation |
| `400` | Validation error; request shape or parameter values are invalid |
| `401` | Authentication failure; JWT missing, malformed, or invalid |
| `404` | Target resource does not exist |
| `409` | Conflict with existing data, such as duplicate username |
| `500` | Unhandled application or database failure |

## 8. Reviewer Notes
- PostgreSQL is mandatory for the project to work.
- User creation is intentionally public through `POST /users/register`, because requiring a token to create the first user would block initial onboarding.
- Passwords are stored as bcrypt hashes in `password_digest`.
- Product category values are normalized to lowercase.
- The user show endpoint includes the 5 most recent purchases from completed orders only.
- Popular products are computed from completed orders only.
- Product update and product delete endpoints were added as professional completion of the product resource lifecycle.
