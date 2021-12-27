const Router = require("@koa/router");
const passport = require("../passport");

const validate = require("validate.js");
const Group = require("../models/Group");

const router = new Router({
  prefix: "/groups",
});

router.get(
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    const user = ctx.state.user;

    try {
      const groups = await Group.find({
        creator: user.id,
      }).sort({ createdAt: "desc" });

      return (ctx.body = groups);
    } catch (error) {
      ctx.throw(500, error);
    }
    ctx.body = "All groupes created by you.";
  }
);

router.post(
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    let user = ctx.state.user;

    try {
      const constraints = {
        name: {
          presence: {
            allowEmpty: false,
          },
        },
      };

      const error = validate(ctx.request.body, constraints);

      if (error)
        return (ctx.body = {
          success: false,
          error,
        });

      const group = await Group.create({
        name: ctx.request.body.name,
        creator: user.id,
      });

      if (group === null)
        return (ctx.body = {
          success: false,
          message: "Group creation failed.",
        });

      return (ctx.body = {
        success: true,
        group: group,
      });
    } catch (error) {
      ctx.throw(500, error);
    }
  }
);

module.exports = router;
