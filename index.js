const Koa = require('koa'),
    json = require('koa-json'),
    logger = require('koa-logger'),
    body = require('koa-bodyparser');

const mongoose = require('mongoose');

// Load routes
const root = require('./routes');
const auth = require('./routes/auth');

const passport = require('./passport');

// Database connection
mongoose
    .connect(process.env.DB_URL, {
        useUnifiedTopology: true,
        useNewUrlParser: true
    })
    .then(() => console.log('Database connected!'))
    .catch((error) => {
        console.log(`Database error: ${error.message}`);
        process.exit(1);
    });

const app = new Koa();

app.use(passport.initialize());

const port = process.env.PORT || 3000;

app.use(logger()).use(json()).use(body());

app.use(root.routes()).use(auth.routes());

app.listen(port, () => console.log(`Server runing at http://localhost:3000`));
