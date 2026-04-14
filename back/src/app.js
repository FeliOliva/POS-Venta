const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const express = require('express');
const cors = require('cors');
const { notFound } = require('./middlewares/notFound');
const { errorHandler } = require('./middlewares/errorHandler');

const authRoutes = require('./modules/auth/routes');
const usersRoutes = require('./modules/users/routes');
const productsRoutes = require('./modules/products/routes');
const salesRoutes = require('./modules/sales/routes');
const cashRoutes = require('./modules/cash/routes');

const app = express();

app.use(cors({ origin: true }));
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/products', productsRoutes);
app.use('/api/sales', salesRoutes);
app.use('/api/cash', cashRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = { app };
