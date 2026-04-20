import bcrypt from 'bcrypt';
import DBService from '../database/DBService';

export type User = {
    id?: number;
    username: string;
    first_name?: string;
    last_name?: string;
    password?: string;
    password_digest?: string;
};

export type UserPublic = {
    id: number;
    username: string;
    first_name: string;
    last_name: string;
};

export type RecentPurchase = {
    order_id: number;
    product_id: number;
    quantity: number;
    name: string;
    price: number | string;
    category: string | null;
};

export type UserWithRecentPurchases = UserPublic & {
    recent_purchases: RecentPurchase[];
};

export class UserModel {
    async index(): Promise<UserPublic[]> {
        try {
            const sql = 'SELECT id, username, first_name, last_name FROM users ORDER BY id ASC';
            const result = await DBService.query<UserPublic>(sql);
            return result.rows;
        } catch (err) {
            throw new Error(`failed to retrieve users, ${err}`);
        }
    }

    async show(identifier: number | string): Promise<UserWithRecentPurchases | null> {
        try {
            let sql: string;
            let value: number | string;
            const isNumber = !isNaN(Number(identifier));

            if (isNumber) {
                sql = 'SELECT id, username, first_name, last_name FROM users WHERE id = $1';
                value = Number(identifier);
            } else {
                sql = 'SELECT id, username, first_name, last_name FROM users WHERE username = $1';
                value = identifier;
            }

            const result = await DBService.query<UserPublic>(sql, [value]);
            const user = result.rows[0];

            if (!user) return null;

            const recentPurchases = await this.getRecentPurchases(user.id);
            return { ...user, recent_purchases: recentPurchases };
        } catch (err) {
            throw new Error(`failed to retrieve user (${identifier}), ${err}`);
        }
    }

    private async getRecentPurchases(userId: number, limit = 5): Promise<RecentPurchase[]> {
        try {
            const sql = `SELECT o.id AS order_id,
                    op.product_id,
                    op.quantity,
                    p.name,
                    p.price,
                    p.category
                FROM orders o
                INNER JOIN order_products op ON op.order_id = o.id
                INNER JOIN products p ON p.id = op.product_id
                WHERE o.user_id = $1 AND o.status = 'complete'
                ORDER BY o.id DESC, op.id DESC
                LIMIT $2;`;

            const result = await DBService.query<RecentPurchase>(sql, [userId, limit]);
            return result.rows;
        } catch (err) {
            throw new Error(`failed to retrieve recent purchases for user (${userId}), ${err}`);
        }
    }

    async create(data: User): Promise<User> {
        try {
            const sql = 'INSERT INTO users (username, first_name, last_name, password_digest) VALUES ($1, $2, $3, $4) RETURNING *';

            const pepper = process.env.BCRYPT_PEPPER as string;
            const saltRounds = Number(process.env.BCRYPT_SALT_ROUNDS);

            const hash = bcrypt.hashSync(data.password + pepper, saltRounds);

            const result = await DBService.query<User>(sql, [data.username.toLowerCase(), data.first_name, data.last_name, hash]);

            return result.rows[0];
        } catch (err) {
            throw new Error(`failed to create user (${data.username}), ${err}`);
        }
    }

    async authenticate(username: string, password: string): Promise<User | null> {
        try {
            const sql = 'SELECT * FROM users WHERE username = $1';

            const result = await DBService.query<User>(sql, [username.toLowerCase()]);

            const user = result.rows[0];

            if (!user) return null;

            const pepper = process.env.BCRYPT_PEPPER as string;

            const isValid = bcrypt.compareSync(password + pepper, user.password_digest as string);

            if (isValid) {
                return user;
            }

            return null;
        } catch (err) {
            throw new Error(`failed to verify password for user (${username}), ${err}`);
        }
    }
}