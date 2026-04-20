import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import DBService from './database/DBService';
import userRoutes from './handlers/routes/users';
import productRoutes from './handlers/routes/products';
import orderRoutes from './handlers/routes/orders';

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  optionsSuccessStatus: 200
}));


app.use(express.json());
app.use('/users', userRoutes);
app.use('/products', productRoutes);
app.use('/orders', orderRoutes);

DBService.testConnection(); // Check DB connection before starting the server

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

export default app;