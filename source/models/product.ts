import DBService from '../database/DBService';

export type Product = {
    id?: number;
    name: string;
    price: number | string;
    category?: string;
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
}
