const express = require('express');
const cors = require('cors');
const errorHandler = require('./middleware/errorHandler');

const monthsRouter = require('./routes/months');
const incomeRouter = require('./routes/income');
const expensesRouter = require('./routes/expenses');
const templatesRouter = require('./routes/templates');
const overviewRouter = require('./routes/overview');
const exportRouter   = require('./routes/export');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/months', monthsRouter);
// Nested under months
app.use('/api/months/:monthId/income', incomeRouter);
app.use('/api/months/:monthId/expenses', expensesRouter);
// Top-level income/expense for direct updates/deletes by id
app.use('/api/income', incomeRouter);
app.use('/api/expenses', expensesRouter);
app.use('/api/templates', templatesRouter);
app.use('/api/overview', overviewRouter);
app.use('/api/export',   exportRouter);

app.use(errorHandler);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Personal finance API running on http://0.0.0.0:${PORT}`);
});
