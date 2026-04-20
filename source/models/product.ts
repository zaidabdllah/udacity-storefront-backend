import DBService from '../database/DBService';

export type Product = {
    id?: number;
    name: string;
    price: number | string;
    category?: string;
    total_sold?: number | string;
};

export class ProductModel {
    async index(): Promise<Product[]> {
        try {
            const sql = 'SELECT * FROM products ORDER BY id ASC';
            const result = await DBService.query<Product>(sql);
            return result.rows;
        } catch (err) {
            throw new Error(`failed to retrieve products, ${err}`);
        }
    }

    async show(id: number): Promise<Product | null> {
        try {
            const sql = 'SELECT * FROM products WHERE id = $1';
            const result = await DBService.query<Product>(sql, [id]);
            return result.rows[0] || null;
        } catch (err) {
            throw new Error(`failed to retrieve product (${id}), ${err}`);
        }
    }   

    async create(data: Product): Promise<Product> {
        try {   
            const sql = 'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING *';
            const result = await DBService.query<Product>(sql, [data.name, data.price, data.category?.toLowerCase()]);
            return result.rows[0];
        } catch (err) {
            throw new Error(`failed to create product (${data.name}), ${err}`);
        }
    }

    async showByCategory(category: string): Promise<Product[]> {
        try {
            const sql = 'SELECT * FROM products WHERE category = $1 ORDER BY id ASC';
            const result = await DBService.query<Product>(sql, [category.toLowerCase()]);
            return result.rows;
        } catch (err) {
            throw new Error(`failed to retrieve products by category (${category}), ${err}`);
        }
    }

    async update(id: number, data: Partial<Product>): Promise<Product | null> {
        try {
            const setClauses: string[] = [];
            const values: Array<string | number> = [];

            if (data.name !== undefined) {
                values.push(data.name);
                setClauses.push(`name = $${values.length}`);
            }

            if (data.price !== undefined) {
                values.push(data.price);
                setClauses.push(`price = $${values.length}`);
            }

            if (data.category !== undefined) {
                values.push(data.category.toLowerCase());
                setClauses.push(`category = $${values.length}`);
            }

            if (setClauses.length === 0) {
                return null;
            }

            values.push(id);

            const sql = `UPDATE products
                SET ${setClauses.join(', ')}
                WHERE id = $${values.length}
                RETURNING *;`;

            const result = await DBService.query<Product>(sql, values);

            return result.rows[0] || null;
        } catch (err) {
            throw new Error(`failed to update product (${id}), ${err}`);
        }
    }

    async delete(id: number): Promise<Product | null> {
        try {
            const sql = 'DELETE FROM products WHERE id = $1 RETURNING *';
            const result = await DBService.query<Product>(sql, [id]);
            return result.rows[0] || null;
        } catch (err) {
            throw new Error(`failed to delete product (${id}), ${err}`);
        }
    }

    async GetpopularProducts(limit: number): Promise<Product[]> {
        try {
            const sql = `SELECT p.id, p.name, p.price, p.category, SUM(oi.quantity) AS total_sold
                FROM products p
                INNER JOIN order_products oi ON oi.product_id = p.id
                INNER JOIN orders o ON o.id = oi.order_id
                WHERE o.status = 'complete'
                GROUP BY p.id
                ORDER BY total_sold DESC
                LIMIT $1;`;
            const result = await DBService.query<Product>(sql, [limit]);
            return result.rows;
        }
        catch (err) {
            throw new Error(`failed to retrieve popular products, ${err}`);
        }
    }
}
