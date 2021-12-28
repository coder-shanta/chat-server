const Router = require("@koa/router");
const passport = require("../passport");
const User = require("../models/User");

const router = new Router({
  prefix: "/mambers",
});

router.get(
  "/search/:name",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    const name = new RegExp(ctx.params.name, "i");

    const mambers = await User.find({
      $or: [
        {
          name: { $regex: name },
        },
        {
          email: { $regex: name },
        },
      ],
    });

    ctx.body = mambers;
  }
);

module.exports = router;
