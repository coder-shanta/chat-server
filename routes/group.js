const Router = require("@koa/router");
const validate = require("validate.js");
const { isValidObjectId } = require("mongoose");

const passport = require("../passport");
const Group = require("../models/Group");
const User = require("../models/User");
const Message = require("../models/Message");

const router = new Router({
  prefix: "/groups",
});

// Returns all groups associated with auth.user
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

// Returns all groups created by auth.user
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

// Create a new group
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

      // Create group
      const group = await Group.create({
        name: ctx.request.body.name,
        creator: user,
      });

      if (group === null)
        return (ctx.body = {
          success: false,
          message: "Group creation failed.",
        });

      // Save group to user.groups
      user.groups.push(group._id);
      await user.save();

      // Add mamber to group.mambers & group.admin
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

      // Get input.group ...
      const group = await Group.findOne({ _id: ctx.request.body.groupId });

      if (group === null)
        return (ctx.body = {
          success: false,
          message: "Sorry, Group was deleted.",
        });

      // If auth.user is a admin of this input.group
      if (group.admins.indexOf(user.id) !== -1) {
        // If input.user is alrady in this group
        if (group.mambers.indexOf(ctx.request.body.userId) !== -1) {
          return (ctx.body = {
            success: false,
            message: "This user has alrady in this group.",
          });
        } else {
          // Add input.user to input.group
          group.mambers.push(ctx.request.body.userId);
          await group.save();

          // Add input.group to input.user
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

// Return group with mambers and messages
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

      // If auth.user is a mamber of input.group
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

        // add admin kay to mamber field
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

// Returns all mambers of a group
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

      // If auth.user is a mamber of input.group
      if (group.mambers.indexOf(user.id) !== -1) {
        let group = await Group.findOne({
          _id: ctx.params.id,
        }).populate("mambers", "-groups");

        const rm = [];

        // Add admin key to mamber field
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

// Returns messages of a group
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

      // If auth.user is a mamber of input.group
      if (group.mambers.indexOf(user.id) !== -1) {
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

// Add message on a group
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

      // If auth.user is a mamber of input.group
      if (group.mambers.indexOf(user.id) !== -1) {
        // Create message
        const message = await Message.create({
          text: ctx.request.body.text,
          sender: user.id,
        });

        // Add message on input.group
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
