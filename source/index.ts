import express from 'express';
import dotenv from 'dotenv';
import DBService from './database/DBService';
import userRoutes from './handlers/routes/users';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
let isServerStarted = false;

app.use(express.json());
app.use('/users', userRoutes);

const startServer = (): void => {
    if (isServerStarted) return;
    isServerStarted = true;

    DBService.testConnection(); // verify DB connection before starting the server

app.listen(port, () => {
console.log(`Server is running on http://localhost:${port}`);
});
};

startServer();

export default app;