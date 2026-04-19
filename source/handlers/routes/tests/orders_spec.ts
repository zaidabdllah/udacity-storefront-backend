import request from 'supertest';
import DBService from '../../../database/DBService';
import app from '../../../index';

describe('Orders routes', () => {
    const registerAndGetAuth = async (username: string): Promise<{ token: string; userId: number }> => {
        const registerResponse = await request(app).post('/users/register').send({
            username,
            first_name: 'Order',
            last_name: 'Route',
            password: 'secret123'
        });

        const token = registerResponse.body.jwtToken as string;
        const result = await DBService.query<{ id: number }>('SELECT id FROM users WHERE username = $1', [username]);

        return { token, userId: result.rows[0].id };
    };

    const createProduct = async (name: string): Promise<number> => {
        const result = await DBService.query<{ id: number }>(
            `INSERT INTO products (name, price, category) VALUES ($1, $2, $3) RETURNING id`,
            [name, 19.99, 'tools']
        );
        return result.rows[0].id;
    };

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

    it('GET /orders/current/:userId requires a token', async () => {
        const response = await request(app).get('/orders/current/1');

        expect(response.status).toBe(401);
        expect(response.body.code).toBe('MISSING_TOKEN');
    });

    it('GET /orders/current/:userId creates and then retrieves the same active order', async () => {
        const { token, userId } = await registerAndGetAuth('orderscurrent');

        const firstResponse = await request(app)
            .get(`/orders/current/${userId}`)
            .set('Authorization', `Bearer ${token}`);
        const secondResponse = await request(app)
            .get(`/orders/current/${userId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(firstResponse.status).toBe(200);
        expect(firstResponse.body.code).toBe('ORDER_CREATED_OR_RETRIEVED');
        expect(firstResponse.body.order.status).toBe('active');

        expect(secondResponse.status).toBe(200);
        expect(secondResponse.body.order.id).toBe(firstResponse.body.order.id);
    });

    it('POST /orders/:orderId/product adds a product to the order', async () => {
        const { token, userId } = await registerAndGetAuth('ordersaddproduct');
        const productId = await createProduct('Tape Measure');
        const orderResponse = await request(app)
            .get(`/orders/current/${userId}`)
            .set('Authorization', `Bearer ${token}`);

        const orderId = orderResponse.body.order.id as number;
        const response = await request(app)
            .post(`/orders/${orderId}/product`)
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity: 2 });

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('PRODUCT_ADDED_TO_ORDER');
        expect(response.body.productInOrder.order_id).toBe(orderId);
        expect(response.body.productInOrder.product_id).toBe(productId);
        expect(response.body.productInOrder.quantity).toBe(2);
    });

    it('PATCH /orders/:orderId/product updates product quantity', async () => {
        const { token, userId } = await registerAndGetAuth('ordersupdateqty');
        const productId = await createProduct('Level Tool');
        const orderResponse = await request(app)
            .get(`/orders/current/${userId}`)
            .set('Authorization', `Bearer ${token}`);
        const orderId = orderResponse.body.order.id as number;

        await request(app)
            .post(`/orders/${orderId}/product`)
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity: 1 });

        const response = await request(app)
            .patch(`/orders/${orderId}/product`)
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity: 5 });

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('PRODUCT_QUANTITY_UPDATED');
        expect(response.body.productInOrder.quantity).toBe(5);
    });

    it('DELETE /orders/:orderId/product removes product from order', async () => {
        const { token, userId } = await registerAndGetAuth('ordersremoveproduct');
        const productId = await createProduct('Safety Glasses');
        const orderResponse = await request(app)
            .get(`/orders/current/${userId}`)
            .set('Authorization', `Bearer ${token}`);
        const orderId = orderResponse.body.order.id as number;

        await request(app)
            .post(`/orders/${orderId}/product`)
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity: 1 });

        const response = await request(app)
            .delete(`/orders/${orderId}/product`)
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId });

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('PRODUCT_REMOVED_FROM_ORDER');
        expect(response.body.productInOrder.product_id).toBe(productId);
    });

    it('PATCH /orders/:orderId/checkout marks order as complete', async () => {
        const { token, userId } = await registerAndGetAuth('orderscheckout');
        const productId = await createProduct('Saw');
        const orderResponse = await request(app)
            .get(`/orders/current/${userId}`)
            .set('Authorization', `Bearer ${token}`);
        const orderId = orderResponse.body.order.id as number;

        await request(app)
            .post(`/orders/${orderId}/product`)
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity: 2 });

        const response = await request(app)
            .patch(`/orders/${orderId}/checkout`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('ORDER_CHECKED_OUT');
        expect(response.body.order.id).toBe(orderId);
        expect(response.body.order.status).toBe('complete');
    });

    it('GET /orders/completed/:userId returns completed orders', async () => {
        const { token, userId } = await registerAndGetAuth('orderscompleted');
        const productId = await createProduct('Work Gloves');
        const orderResponse = await request(app)
            .get(`/orders/current/${userId}`)
            .set('Authorization', `Bearer ${token}`);
        const orderId = orderResponse.body.order.id as number;

        await request(app)
            .post(`/orders/${orderId}/product`)
            .set('Authorization', `Bearer ${token}`)
            .send({ product_id: productId, quantity: 1 });
        await request(app)
            .patch(`/orders/${orderId}/checkout`)
            .set('Authorization', `Bearer ${token}`);

        const response = await request(app)
            .get(`/orders/completed/${userId}`)
            .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(response.body.code).toBe('COMPLETED_ORDERS_RETRIEVED');
        expect(response.body.orders.length).toBe(1);
        expect(response.body.orders[0].id).toBe(orderId);
        expect(response.body.orders[0].status).toBe('complete');
    });
});
