/* create users table */
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(20) NOT NULL UNIQUE
    CHECK (
        char_length(username) BETWEEN 3 AND 20
        AND username = lower(username)
        AND username ~ '^[a-z0-9._]+$'
    ),
    first_name VARCHAR(15),
    last_name VARCHAR(15),
    password_digest TEXT NOT NULL
);