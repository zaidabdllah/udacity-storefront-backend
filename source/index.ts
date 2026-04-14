import express from 'express';
const app = express();
const port = 3000;

app.use(express.json());

app.use('/', (req, res) => {
    res.status(200)
    res.send('Hello World!');
});

app.listen(port, () => {
    console.log(`Server is running on http://localhost:${port}`);
});

export default app;