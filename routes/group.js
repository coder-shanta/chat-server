const Router = require("@koa/router");
const passport = require("../passport");

const validate = require("validate.js");
const Group = require("../models/Group");
const User = require("../models/User");
const Message = require("../models/Message");
const { isValidObjectId } = require("mongoose");

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
      const my = await User.findOne({ _id: user.id }).populate({
        path: "groups",

        populate: {
          path: "creator",
          options: {
            select: "name",
          },
        },
        options: {
          sort: {
            updatedAt: -1,
          },
        },
      });

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
        creator: user,
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

// get group info and messages
router.get(
  "/:id",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    const user = ctx.state.user;

    try {
      const query = {};

      query.limit = parseInt(ctx.query.limit, 10) || 10;
      query.skip = parseInt(ctx.query.skip, 10) || 0;

      if (!isValidObjectId(ctx.params.id))
        return (ctx.body = {
          success: false,
          message: "Sorry, Group not found.",
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
        }).populate([
          {
            path: "mambers",
            options: {
              select: "-groups",
            },
          },
          {
            path: "messages",

            populate: {
              path: "sender",
              options: {
                select: "-groups",
              },
            },

            options: {
              sort: {
                createdAt: -1,
              },
              limit: query.limit,
              skip: query.skip,
            },
          },
        ]);

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

        const json = JSON.stringify(group);

        const object = JSON.parse(json);

        object.mambers = rm;
        object.messages.reverse();

        return (ctx.body = {
          success: true,
          data: object,
        });
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

// get 20 messages of a group
router.get(
  "/:id/messages",
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
      }).populate({
        path: "messages",
        populate: {
          path: "sender",
          select: "-groups",
        },
      });

      if (group === null)
        return (ctx.body = {
          success: false,
          message: "Sorry, Group was deleted.",
        });

      if (group.mambers.indexOf(user.id) !== -1) {
        // You are a mamber of this group

        return (ctx.body = group.messages);
      } else {
        return (ctx.body = {
          success: false,
          message: "Sorry, You are not a mamber of this group.",
        });
      }
    } catch (error) {
      ctx.throw(500, error);
    }
  }
);

// post a messages on this group
router.post(
  "/:id/messages",
  passport.authenticate("jwt", {
    session: false,
  }),
  async (ctx) => {
    const user = ctx.state.user;

    try {
      const constraints = {
        text: {
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

      const group = await Group.findOne({
        _id: ctx.params.id,
      });

      if (group === null)
        return (ctx.body = {
          success: false,
          message: "Sorry, Group was deleted.",
        });

      if (group.mambers.indexOf(user.id) !== -1) {
        // You are a mamber of this group
        // let group = await Group.findOne({
        //   _id: ctx.params.id,
        // }).populate("mambers", "-groups");

        const message = await Message.create({
          text: ctx.request.body.text,
          sender: user.id,
        });

        group.messages.push(message.id);
        await group.save();

        return (ctx.body = {
          success: true,
          message: message,
        });
      } else {
        return (ctx.body = {
          success: false,
          message: "Sorry, You are not a mamber of this group.",
        });
      }
    } catch (error) {
      ctx.throw(500, error);
    }
  }
);
module.exports = router;
