import DBService from '../../database/DBService';
import { ProductModel } from '../product';

describe('ProductModel', () => {
    const model = new ProductModel();

    beforeAll(async () => {
        const result = await DBService.query<{ current_database: string }>('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(process.env.POSTGRES_TEST_DB as string);
    });

    beforeEach(async () => {
        await DBService.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');
    });

    afterAll(async () => {
        await DBService.query('TRUNCATE TABLE products RESTART IDENTITY CASCADE');
    });

    it('has the expected public methods', () => {
        expect(model.index).toBeDefined();
        expect(model.show).toBeDefined();
        expect(model.create).toBeDefined();
        expect(model.showByCategory).toBeDefined();
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
});
