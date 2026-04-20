import DBService from '../../database/DBService';
import { UserModel, User } from '../user';

describe('UserModel', () => {
    const model = new UserModel();

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
        expect(model.authenticate).toBeDefined();
    });

    it('creates a user with a hashed password', async () => {
        const created = await model.create({
            username: 'zaid',
            first_name: 'Zaid',
            last_name: 'Abdallah',
            password: 'secret123'
        });

        expect(created.id).toBe(1);
        expect(created.username).toBe('zaid');
        expect(created.password_digest).toBeDefined();
        expect(created.password_digest).not.toBe('secret123');
    });

    it('returns all users from index in ascending id order', async () => {
        await model.create({ username: 'alpha', first_name: 'A', last_name: 'One', password: 'secret123' });
        await model.create({ username: 'beta', first_name: 'B', last_name: 'Two', password: 'secret123' });

        const users = await model.index();

        expect(users.length).toBe(2);
        expect(users[0].username).toBe('alpha');
        expect(users[1].username).toBe('beta');
        expect((users[0] as User).password_digest).toBeUndefined();
    });

    it('shows a user by id and by username', async () => {
        await model.create({
            username: 'finder',
            first_name: 'Find',
            last_name: 'Me',
            password: 'secret123'
        });

        const byId = await model.show(1);
        const byUsername = await model.show('finder');

        expect(byId?.username).toBe('finder');
        expect(byId?.recent_purchases.length).toBe(0);
        expect(byUsername?.id).toBe(1);
        expect(byUsername?.recent_purchases.length).toBe(0);
    });

    it('returns only the 5 most recent purchases from completed orders', async () => {
        const created = await model.create({
            username: 'purchaseuser',
            first_name: 'Purchase',
            last_name: 'User',
            password: 'secret123'
        });

        const userId = created.id as number;

        for (let i = 1; i <= 6; i += 1) {
            const productResult = await DBService.query<{ id: number }>(
                'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id',
                [`Recent Product ${i}`, 10 + i, 'tools']);

            const orderResult = await DBService.query<{ id: number }>(
                `INSERT INTO orders (user_id, status) VALUES ($1, 'complete') RETURNING id`,
                [userId]);

            await DBService.query(
                `INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [orderResult.rows[0].id, productResult.rows[0].id, i]);
        }

        const activeProduct = await DBService.query<{ id: number }>(
            'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id',
            ['Active Product', 99, 'tools']);
        const activeOrder = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'active') RETURNING id`,
            [userId]);

        await DBService.query(
            `INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
            [activeOrder.rows[0].id, activeProduct.rows[0].id, 1]);

        const found = await model.show(userId);

        expect(found).not.toBeNull();
        expect(found?.recent_purchases.length).toBe(5);
        expect(found?.recent_purchases[0].name).toBe('Recent Product 6');
        expect(found?.recent_purchases[0].order_id).toBe(6);
        expect(found?.recent_purchases[4].name).toBe('Recent Product 2');
        expect(found?.recent_purchases.every((purchase) => purchase.name !== 'Active Product')).toBeTrue();
    });

    it('authenticates with correct credentials and fails with invalid ones', async () => {
        await model.create({
            username: 'authuser',
            first_name: 'Auth',
            last_name: 'User',
            password: 'secret123'
        });

        const valid = await model.authenticate('authuser', 'secret123');
        const invalidPassword = await model.authenticate('authuser', 'wrongpass');
        const invalidUser = await model.authenticate('missing', 'secret123');

        expect(valid).not.toBeNull();
        expect(valid?.username).toBe('authuser');
        expect(invalidPassword).toBeNull();
        expect(invalidUser).toBeNull();
    });
});
