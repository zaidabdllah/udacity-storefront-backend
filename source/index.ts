import express from 'express';
import dotenv from 'dotenv';
import DBService from './database/DBService';

dotenv.config();

const DB = DBService;

DB.testConnection()//to verify database connection before starting the server

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.use('/', (req, res) => {
    res.status(200)
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

export default app;