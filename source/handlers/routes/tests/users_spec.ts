import request from 'supertest';
import DBService from '../../../database/DBService';
import app from '../../../index';

describe('Users routes', () => {
    beforeAll(async () => {
        const result = await DBService.query<{ current_database: string }>('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(process.env.POSTGRES_TEST_DB as string);
    });

    beforeEach(async () => {
        await DBService.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
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
});
