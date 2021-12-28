const Router = require("@koa/router");
const bcrypt = require("bcrypt");
const validate = require("validate.js");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const randomcolor = require("randomcolor");

const router = new Router({
  prefix: "/auth",
});

router.post("/login", async (ctx) => {
  try {
    const constraints = {
      email: {
        presence: true,
        email: true,
      },
      password: {
        presence: true,
        length: {
          minimum: 6,
          maximum: 128,
        },
      },
    };

    const error = validate(ctx.request.body, constraints);

    if (error)
      return (ctx.body = {
        success: false,
        error,
      });

    const user = await User.findOne({
      email: ctx.request.body.email,
    }).select("+hash");

    if (user === null)
      return (ctx.body = {
        success: false,
        message: "Email and password don't match.",
      });

    const match = bcrypt.compareSync(ctx.request.body.password, user.hash);

    if (!match)
      return (ctx.body = {
        success: false,
        message: "Email and password don't match.",
      });

    const token = jwt.sign(
      {
        sub: user.id,
      },
      process.env.SECRET
    );

    return (ctx.body = {
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        token: token,
      },
    });
  } catch (error) {
    ctx.throw(500, error);
  }
});

router.post("/register", async (ctx) => {
  try {
    const constraints = {
      name: {
        presence: true,
        type: "string",
      },
      email: {
        presence: true,
        email: true,
      },
      password: {
        presence: true,
        type: "string",
        length: {
          minimum: 6,
          maximum: 128,
        },
      },
    };

    const error = validate(ctx.request.body, constraints);

    if (error)
      return (ctx.body = {
        success: false,
        error,
      });

    const user = await User.findOne({ email: ctx.request.body.email });

    if (user !== null)
      return (ctx.body = {
        success: false,
        message: "Email alrady exist.",
      });

    const salt = await bcrypt.genSaltSync(10);
    const hash = await bcrypt.hashSync(ctx.request.body.password, salt);

    const newUser = await User.create({
      ...ctx.request.body,
      hash,
      avaterColor: randomcolor({
        luminosity: "dark",
      }),
    });

    const token = jwt.sign(
      {
        sub: newUser.id,
      },
      process.env.SECRET
    );

    return (ctx.body = {
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        token: token,
      },
    });
  } catch (error) {
    ctx.throw(500, error);
  }
});

module.exports = router;
