const { createServer } = require("http");

const Koa = require("koa"),
  json = require("koa-json"),
  logger = require("koa-logger"),
  body = require("koa-bodyparser");
cors = require("@koa/cors");

const mongoose = require("mongoose");

const { Server } = require("socket.io");

// Load routes
const root = require("./routes");
const auth = require("./routes/auth");
const group = require("./routes/group");

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

app
  .use(logger())
  .use(json())
  .use(body())
  .use(
    cors({
      origin: ["http://localhost:3001"],
    })
  );

app.use(root.routes()).use(auth.routes()).use(group.routes());

const httpServer = createServer(app.callback());

const io = new Server(httpServer, {});

io.on("connection", (socket) => {
  console.log("A connection made succesfully.", socket.id);

  socket.on("disconnect", () => {
    console.log("User Disconnected.", socket.id);
  });
});

httpServer.listen(port, () =>
  console.log(`Server runing at http://localhost:3000`)
);
