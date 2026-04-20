import request from 'supertest';
import DBService from '../../../database/DBService';
import app from '../../../index';

describe('Users routes', () => {
    beforeAll(async () => {
        const result = await DBService.query<{ current_database: string }>('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(process.env.POSTGRES_TEST_DB as string);
    });

    beforeEach(async () => {
        await DBService.query('TRUNCATE TABLE order_products, orders, products, users RESTART IDENTITY CASCADE');
    });

    it('POST /users/register creates a user and returns a token', async () => {
        const response = await request(app)
            .post('/users/register')
            .send({
                username: 'routeuser',
                first_name: 'Route',
                last_name: 'User',
                password: 'secret123'
            });

        expect(response.status).toBe(201);
        expect(response.body.ok).toBeTrue();
        expect(response.body.code).toBe('USER_CREATED');
        expect(response.body.jwtToken).toBeDefined();
    });

    it('POST /users/register rejects duplicate usernames', async () => {
        await request(app).post('/users/register').send({
            username: 'duplicate',
            first_name: 'First',
            last_name: 'User',
            password: 'secret123'
        });

        const response = await request(app).post('/users/register').send({
            username: 'duplicate',
            first_name: 'Second',
            last_name: 'User',
            password: 'secret123'
        });

        expect(response.status).toBe(409);
        expect(response.body.code).toBe('USERNAME_ALREADY_EXISTS');
    });

    it('POST /users/login returns a token for valid credentials', async () => {
        await request(app).post('/users/register').send({
            username: 'loginuser',
            first_name: 'Login',
            last_name: 'User',
            password: 'secret123'
        });

        const response = await request(app)
            .post('/users/login')
            .send({ username: 'loginuser', password: 'secret123' });

        expect(response.status).toBe(200);
        expect(response.body.ok).toBeTrue();
        expect(response.body.code).toBe('LOGIN_SUCCESS');
        expect(response.body.jwtToken).toBeDefined();
    });

    it('POST /users/login rejects invalid credentials', async () => {
        const response = await request(app)
            .post('/users/login')
            .send({ username: 'missing', password: 'wrongpass' });

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('INVALID_CREDENTIALS');
    });

    it('GET /users requires a token', async () => {
        const response = await request(app).get('/users');

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('MISSING_TOKEN');
    });

    it('GET /users returns users with a valid token', async () => {
        const registerResponse = await request(app).post('/users/register').send({
            username: 'withtoken',
            first_name: 'With',
            last_name: 'Token',
            password: 'secret123'
        });

        const token = registerResponse.body.jwtToken as string;
        const response = await request(app)
            .get('/users')
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('USERS_RETRIEVED');
        expect(response.body.users.length).toBe(1);
        expect(response.body.users[0].username).toBe('withtoken');
    });

    it('GET /users/:identifier returns user and 404 for missing user', async () => {
        const registerResponse = await request(app).post('/users/register').send({
            username: 'showcase',
            first_name: 'Show',
            last_name: 'Case',
            password: 'secret123'
        });

        const token = registerResponse.body.jwtToken as string;
        const foundResponse = await request(app)
            .get('/users/showcase')
            .set('Authorization', `Bearer ${token}`);
        const missingResponse = await request(app)
            .get('/users/9999')
            .set('Authorization', `Bearer ${token}`);

        expect(foundResponse.status).toBe(200);
        expect(foundResponse.body.code).toBe('USER_RETRIEVED');
        expect(foundResponse.body.user.username).toBe('showcase');

        expect(missingResponse.status).toBe(404);
        expect(missingResponse.body.code).toBe('USER_NOT_FOUND');
    });

    it('GET /users/:id includes the user 5 most recent purchases', async () => {
        const registerResponse = await request(app).post('/users/register').send({
            username: 'recentbuyer',
            first_name: 'Recent',
            last_name: 'Buyer',
            password: 'secret123'
        });

        const token = registerResponse.body.jwtToken as string;
        const userResult = await DBService.query<{ id: number }>(
            'SELECT id FROM users WHERE username = $1', ['recentbuyer']);
        const userId = userResult.rows[0].id;

        for (let i = 1; i <= 6; i += 1) {
            const product = await DBService.query<{ id: number }>(
                'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id',
                [`Route Recent Product ${i}`, 20 + i, 'tools']);

            const order = await DBService.query<{ id: number }>(
                `INSERT INTO orders (user_id, status) VALUES ($1, 'complete') RETURNING id`,
                [userId]);

            await DBService.query(
                `INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
                [order.rows[0].id, product.rows[0].id, i]);
        }

        const activeProduct = await DBService.query<{ id: number }>(
            'INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id',
            ['Route Active Product', 99, 'tools']);
        const activeOrder = await DBService.query<{ id: number }>(
            `INSERT INTO orders (user_id, status) VALUES ($1, 'active') RETURNING id`,
            [userId]);
        await DBService.query(
            `INSERT INTO order_products (order_id, product_id, quantity) VALUES ($1, $2, $3)`,
            [activeOrder.rows[0].id, activeProduct.rows[0].id, 1]);

        const response = await request(app)
            .get(`/users/${userId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('USER_RETRIEVED');
        expect(response.body.user.id).toBe(userId);
        expect(response.body.user.recent_purchases.length).toBe(5);
        expect(response.body.user.recent_purchases[0].name).toBe('Route Recent Product 6');
        expect(response.body.user.recent_purchases[0].order_id).toBe(6);
        expect(response.body.user.recent_purchases[4].name).toBe('Route Recent Product 2');
        expect(response.body.user.recent_purchases.every((purchase: { name: string }) => purchase.name !== 'Route Active Product')).toBeTrue();
    });
});
