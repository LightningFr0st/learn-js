const express = require('express');
const { graphqlHTTP } = require('express-graphql');
const cookieParser = require('cookie-parser');
const jwt = require('jsonwebtoken');
const authRouter = require('./routes/auth');
const tasksRouter = require('./routes/tasks');
const path = require('path');
const { graphqlSchema } = require('./graphql/schema');
const { graphqlResolvers } = require('./graphql/resolvers');
const fs = require('fs');

const app = express();
const PORT = 3000;
const JWT_SECRET = 'your-secret-key';

const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

app.use(express.json());
app.use(cookieParser());
app.use('/uploads', express.static('uploads'));
app.use(express.static('public'));

app.use('/api/auth', authRouter);
app.use('/api/tasks', require('./middleware/auth'), tasksRouter);

app.use('/graphql', (req, res) => {
  const token = req.cookies.token;
  let user = null;
  
  if (token) {
    try {
      user = jwt.verify(token, JWT_SECRET);
    } catch (error) {
    }
  }

  return graphqlHTTP({
    schema: graphqlSchema,
    rootValue: graphqlResolvers,
    context: { user },
    graphiql: true
  })(req, res);
});

app.all('/{*any}', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});