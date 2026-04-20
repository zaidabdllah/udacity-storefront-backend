import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { UserModel, User } from '../../models/user';
import jwt from 'jsonwebtoken';
import verifyAuthToken from '../../middlewares/verifyAuthToken';

dotenv.config();

const UserRouter = express.Router();
const userModel = new UserModel();
const tokenSecret = process.env.TOKEN_SECRET as string;

UserRouter.post('/register', async (req: Request, res: Response) => {
    const userData: User = req.body;
    try {
        if (!userData.password) {
            return res.status(400).json({
                ok: false,
                code: 'PASSWORD_REQUIRED',
                error: 'Password is required'
            });
        } else if (userData.password.length < 6) {
            return res.status(400).json({
                ok: false,
                code: 'PASSWORD_TOO_SHORT',
                error: 'Password must be at least 6 characters'
            });
        } else if (!userData.username) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_REQUIRED',
                error: 'Username is required'
            });
        } else if (userData.username.length < 3) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_TOO_SHORT',
                error: 'Username must be at least 3 characters'
            });
        } else if (userData.username.length > 20) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_TOO_LONG',
                error: 'Username must not exceed 20 characters'
            });
        } else if (/\s/.test(userData.username)) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_CONTAINS_SPACES',
                error: 'Username must not contain spaces'
            });
        } else if (!/[a-z]/.test(userData.username)) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_MUST_CONTAIN_LETTER',
                error: 'Username must contain at least one letter'
            });
        } else if (!/^(?=.*[a-zA-Z])[a-zA-Z][a-zA-Z0-9._]{2,19}$/.test(userData.username)) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_INVALID_FORMAT',
                error: 'Username must start with a letter and contain only letters, numbers, dots, and underscores'
            });
        }
        const newUser = await userModel.create(userData);
        delete newUser.password_digest; // Remove password from the response
        const token = jwt.sign({ id: newUser.id, username: newUser.username }, tokenSecret);

        res.status(201).json({ ok: true, code: 'USER_CREATED', user: newUser, jwtToken: token });
    } catch (error) {
        if (error instanceof Error && error.message.includes('duplicate key value violates unique constraint')) {
            return res.status(409).json({
                ok: false,
                code: 'USERNAME_ALREADY_EXISTS',
                error: 'Username already exists'
            });
        } else {
            return res.status(500).json({
                ok: false,
                code: 'INTERNAL_SERVER_ERROR',
                error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}`
            });
        }
    }
});

UserRouter.post('/login', async (req: Request, res: Response) => {
    const { username, password } = req.body;
    try {
        if (typeof password !== 'string' || password.trim().length === 0) {
            return res.status(400).json({
                ok: false,
                code: 'PASSWORD_EMPTY',
                error: 'Password cannot be empty'
            });
        } else if (typeof username !== 'string' || username.trim().length === 0) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_EMPTY',
                error: 'Username cannot be empty'
            });
        } else if (password.length < 6) {
            return res.status(400).json({
                ok: false,
                code: 'PASSWORD_TOO_SHORT',
                error: 'Password must be at least 6 characters'
            });
        } else if (!username) {
            return res.status(400).json({
                ok: false,
                code: 'USERNAME_REQUIRED',
                error: 'Username is required'
            });
        } else if (!password) {
            return res.status(400).json({
                ok: false,
                code: 'PASSWORD_REQUIRED',
                error: 'Password is required'
            });
        }
        const user = await userModel.authenticate(username, password);
        delete user?.password_digest; // Remove password from the response
        if (user) {
            const token = jwt.sign({ id: user.id, username: user.username }, tokenSecret);
            res.status(200).json({ ok: true, code: 'LOGIN_SUCCESS', user, jwtToken: token });
        } else {
            res.status(401).json({ ok: false, code: 'INVALID_CREDENTIALS', error: 'Invalid username or password' });
        }
    } catch (error) {
        return res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

UserRouter.get('/', verifyAuthToken, async (req: Request, res: Response) => {
    try {
        const users = await userModel.index();
        res.status(200).json({ ok: true, code: 'USERS_RETRIEVED', users });
    } catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

UserRouter.get('/:identifier', verifyAuthToken, async (req: Request, res: Response) => {
    const identifier = req.params.identifier as string | number;
    try {
        const user = await userModel.show(identifier);
        if (user) {
            res.status(200).json({ ok: true, code: 'USER_RETRIEVED', user });
        } else {
            res.status(404).json({ ok: false, code: 'USER_NOT_FOUND', error: 'User not found' });
        }
    } catch (error) {
        res.status(500).json({ ok: false, code: 'INTERNAL_SERVER_ERROR', error: `An unexpected error occurred: ${error instanceof Error ? error.message : String(error)}` });
    }
});

export default UserRouter;
