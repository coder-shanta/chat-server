const Router = require("@koa/router");
const passport = require("../passport");

const validate = require("validate.js");
const Group = require("../models/Group");
const User = require("../models/User");

const router = new Router({
  prefix: "/groups",
});

// Get all of your groups
router.get(
  "/",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    const user = ctx.state.user;

    try {
      const my = await User.findOne({ _id: user.id }).populate("groups");

      return (ctx.body = my.groups);
    } catch (error) {
      ctx.throw(500, error);
    }
  }
);

// get all groups created by you
router.get(
  "/me",
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
  }
);

// create a group
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

      user.groups.push(group._id);
      await user.save();

      group.mambers.push(user.id);
      group.admins.push(user.id);
      await group.save();

      return (ctx.body = {
        success: true,
        group: group,
      });
    } catch (error) {
      ctx.throw(500, error);
    }
  }
);

// Add mamber to a group
router.post(
  "/add",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    const user = ctx.state.user;

    try {
      const constraints = {
        userId: {
          presence: {
            allowEmpty: false,
          },
        },
        groupId: {
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

      const group = await Group.findOne({ _id: ctx.request.body.groupId });

      if (group === null)
        return (ctx.body = {
          success: false,
          message: "Sorry, Group was deleted.",
        });

      if (group.admins.indexOf(user.id) !== -1) {
        if (group.mambers.indexOf(ctx.request.body.userId) !== -1) {
          return (ctx.body = {
            success: false,
            message: "This user has alrady in this group.",
          });
        } else {
          group.mambers.push(ctx.request.body.userId);
          await group.save();

          const sUser = await User.findOne({ _id: ctx.request.body.userId });
          sUser.groups.push(group.id);
          await sUser.save();

          return (ctx.body = {
            success: true,
            message: "New User added succesfully.",
          });
        }
      } else {
        return (ctx.body = {
          success: false,
          message: "Sorry, You can't do this. Only admin can add mamber.",
        });
      }
    } catch (error) {
      ctx.throw(500, error);
    }
  }
);

// get all mambers of a group
router.get(
  "/:id/mambers",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    const user = ctx.state.user;

    try {
      const constraints = {
        id: {
          presence: {
            allowEmpty: false,
          },
        },
      };

      const error = validate(ctx.params, constraints);

      if (error)
        return (ctx.body = {
          success: false,
          error,
        });

      const group = await Group.findOne({
        _id: ctx.params.id,
      });

      if (group === null)
        return (ctx.body = {
          success: false,
          message: "Sorry, Group was deleted.",
        });

      if (group.mambers.indexOf(user.id) !== -1) {
        let group = await Group.findOne({
          _id: ctx.params.id,
        }).populate("mambers", "-groups");

        // all thingis are perfact
        // return (ctx.body = group.mambers);

        const rm = [];

        // add admin field in responce
        group.mambers.forEach((m) => {
          if (group.admins.indexOf(m._id) !== -1) {
            rm.push({
              _id: m._id,
              name: m.name,
              email: m.email,
              avaterColor: m.avaterColor,
              admin: true,
            });
          } else {
            rm.push({
              _id: m._id,
              name: m.name,
              email: m.email,
              avaterColor: m.avaterColor,
              admin: false,
            });
          }
        });

        return (ctx.body = rm);
      } else {
        return (ctx.body = {
          success: false,
          message: "Sorry, You can't see this.",
        });
      }
    } catch (error) {
      ctx.throw(500, error);
    }
  }
);

module.exports = router;
