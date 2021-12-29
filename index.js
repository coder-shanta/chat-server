const { createServer } = require("http");

const Koa = require("koa"),
  json = require("koa-json"),
  logger = require("koa-logger"),
  body = require("koa-bodyparser"),
  cors = require("@koa/cors");

const mongoose = require("mongoose");

// Load socket server
const socketServer = require("./socket/server");

// Load routes
const root = require("./routes");
const auth = require("./routes/auth");
const group = require("./routes/group");
const mamber = require("./routes/mamber");

const passport = require("./passport");

// Init importent variable
const PORT = process.env.PORT || 3000;
const CORS_ORIGIN = process.env.CORS ? process.env.CORS.split(",") : "*";
const DB_URL = process.env.DB_URL || "mongodb://localhost/chat_db";

// Database connection
mongoose
  .connect(DB_URL, {
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

// Apply middlewares
app
  .use(logger())
  .use(json())
  .use(body())
  .use(
    cors({
      origin: CORS_ORIGIN,
    })
  );

// Add routes
app
  .use(root.routes())
  .use(auth.routes())
  .use(group.routes())
  .use(mamber.routes());

// Create http server
const httpServer = createServer(app.callback());

// Create socket server
socketServer(httpServer);

// Server listner
httpServer.listen(PORT, () =>
  console.log(`Server runing at http://localhost:${PORT}`)
);
