const Router = require("@koa/router");

const passport = require("../passport");

const router = new Router();

// Return 'Hello World!'
router.get("/", (ctx) => {
  ctx.body = "Hello World!";
});

// Return who make request
router.get(
  "/whoami",
  passport.authenticate("jwt", {
    session: false,
  }),
  (ctx) => {
    ctx.body = ctx.state.user;
  }
);

module.exports = router;
