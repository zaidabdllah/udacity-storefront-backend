import DBService from '../../database/DBService';
import { ProductModel } from '../product';

describe('ProductModel', () => {
    const model = new ProductModel();

    beforeAll(async () => {
        const result = await DBService.query<{ current_database: string }>('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(process.env.POSTGRES_TEST_DB as string);
    });

    beforeEach(async () => {
        await DBService.query('TRUNCATE TABLE order_products, orders, products, users RESTART IDENTITY CASCADE');
    });

    afterAll(async () => {
        await DBService.query('TRUNCATE TABLE order_products, orders, products, users RESTART IDENTITY CASCADE');
    });

    it('has the expected public methods', () => {
        expect(model.index).toBeDefined();
        expect(model.show).toBeDefined();
        expect(model.create).toBeDefined();
        expect(model.showByCategory).toBeDefined();
        expect(model.GetpopularProducts).toBeDefined();
    });

    it('creates a product and normalizes category to lowercase', async () => {
        const created = await model.create({
            name: 'Gaming Laptop',
            price: 1299.99,
            category: 'Electronics'
        });

        expect(created.id).toBe(1);
        expect(created.name).toBe('Gaming Laptop');
        expect(Number(created.price)).toBeCloseTo(1299.99, 2);
        expect(created.category).toBe('electronics');
    });

    it('returns all products from index in ascending id order', async () => {
        await model.create({ name: 'Alpha Item', price: 10.5, category: 'home' });
        await model.create({ name: 'Beta Item', price: 20.25, category: 'home' });

        const products = await model.index();

        expect(products.length).toBe(2);
        expect(products[0].id).toBe(1);
        expect(products[1].id).toBe(2);
        expect(products[0].name).toBe('Alpha Item');
        expect(products[1].name).toBe('Beta Item');
    });

    it('shows a product by id and returns null for missing ids', async () => {
        await model.create({ name: 'Desk Lamp', price: 45.99, category: 'home' });

        const found = await model.show(1);
        const missing = await model.show(9999);

        expect(found?.id).toBe(1);
        expect(found?.name).toBe('Desk Lamp');
        expect(missing).toBeNull();
    });

    it('returns products by category in ascending id order', async () => {
        await model.create({ name: 'Notebook', price: 5.0, category: 'Stationery' });
        await model.create({ name: 'Pencil', price: 1.0, category: 'stationery' });
        await model.create({ name: 'Headphones', price: 79.99, category: 'electronics' });

        const stationery = await model.showByCategory('STATIONERY');

        expect(stationery.length).toBe(2);
        expect(stationery[0].name).toBe('Notebook');
        expect(stationery[1].name).toBe('Pencil');
    });

    it('returns most popular products from completed orders only and respects limit', async () => {
        const userResult = await DBService.query<{ id: number }>(
            `INSERT INTO users (username, first_name, last_name, password_digest)
             VALUES ($1, $2, $3, $4)
             RETURNING id`,
            ['popularmodel', 'Pop', 'Model', 'hashed-password']
        );
        const userId = userResult.rows[0].id;

        const hammer = await model.create({ name: 'Hammer', price: 12, category: 'tools' });
        const drill = await model.create({ name: 'Drill', price: 45, category: 'tools' });
        const saw = await model.create({ name: 'Saw', price: 18, category: 'tools' });

        const completeOrder1 = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'complete') RETURNING id`,
            [userId]
        );
        const completeOrder2 = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'complete') RETURNING id`,
            [userId]
        );
        const activeOrder = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'active') RETURNING id`,
            [userId]
        );

        await DBService.query(
            `INSERT INTO order_products (order_id, product_id, quantity)
             VALUES ($1, $2, $3), ($1, $4, $5), ($6, $2, $7), ($6, $8, $9), ($10, $8, $11)`,
            [
                completeOrder1.rows[0].id, hammer.id, 2, drill.id, 5,
                completeOrder2.rows[0].id, 4, saw.id, 1,
                activeOrder.rows[0].id, 100
            ]
        );

        const popular = await model.GetpopularProducts(2) as Array<{ id: number; name: string; total_sold: number | string }>;

        expect(popular.length).toBe(2);
        expect(popular[0].name).toBe('Hammer');
        expect(popular[1].name).toBe('Drill');
        expect(Number(popular[0].total_sold)).toBe(6);
        expect(Number(popular[1].total_sold)).toBe(5);
    });
});
