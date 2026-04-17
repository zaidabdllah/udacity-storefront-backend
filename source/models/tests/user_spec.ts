import DBService from '../../database/DBService';
import { UserModel, User } from '../user';

describe('UserModel', () => {
    const model = new UserModel();

    beforeAll(async () => {
        const result = await DBService.query<{ current_database: string }>('SELECT current_database()');
        expect(result.rows[0].current_database).toBe(process.env.POSTGRES_TEST_DB as string);
    });

    beforeEach(async () => {
        await DBService.query('TRUNCATE TABLE users RESTART IDENTITY CASCADE');
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
        expect(byUsername?.id).toBe(1);
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
