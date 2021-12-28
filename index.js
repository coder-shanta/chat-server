const { createServer } = require("http");

const Koa = require("koa"),
  json = require("koa-json"),
  logger = require("koa-logger"),
  body = require("koa-bodyparser");
cors = require("@koa/cors");

const mongoose = require("mongoose");

const socketServer = require("./socket/server");

// Load routes
const root = require("./routes");
const auth = require("./routes/auth");
const group = require("./routes/group");
const mamber = require("./routes/mamber");

const passport = require("./passport");

// Database connection
mongoose
  .connect(process.env.DB_URL, {
    useUnifiedTopology: true,
    useNewUrlParser: true,
  })
  .then(() => console.log("Database connected!"))
  .catch((error) => {
    console.log(`Database error: ${error.message}`);
    process.exit(1);
  });

const app = new Koa();

app.use(passport.initialize());

const port = process.env.PORT || 3000;

const CORS_ORIGIN = process.env.CORS ? process.env.CORS.split(",") : "*";

app
  .use(logger())
  .use(json())
  .use(body())
  .use(
    cors({
      origin: CORS_ORIGIN,
    })
  );

// Add 1 second delay on every request
// app.use(async (ctx, next) => {
//   const wait = async () => {
//     return new Promise((resolve) => {
//       setTimeout(() => {
//         resolve();
//       }, 1000);
//     });
//   };

//   await wait();

//   await next();
// });

app
  .use(root.routes())
  .use(auth.routes())
  .use(group.routes())
  .use(mamber.routes());

const httpServer = createServer(app.callback());

// connect socket server with http server
socketServer(httpServer);

httpServer.listen(port, () =>
  console.log(`Server runing at http://localhost:3000`)
);
