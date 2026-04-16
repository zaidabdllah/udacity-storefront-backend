import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';

dotenv.config();

const tokenSecret = process.env.TOKEN_SECRET as string;

const verifyAuthToken = (req: Request, res: Response, next: NextFunction): void => {
    try {
        const authorizationHeader = req.headers.authorization;

        if (!authorizationHeader) {
            res.status(401).json({ ok: false, code: 'MISSING_TOKEN', error: 'Access denied, missing token' });
            return;
        }

        const token = authorizationHeader.split(' ')[1];

        if (!token) {
            res.status(401).json({ ok: false, code: 'INVALID_TOKEN_FORMAT', error: 'Access denied, invalid token format' });
            return;
        }

        jwt.verify(token, tokenSecret);
        
        next();
    } catch (error) {
        res.status(401).json({ ok: false, code: 'INVALID_TOKEN', error: `Access denied, ${error}` });
    }
};

export default verifyAuthToken;