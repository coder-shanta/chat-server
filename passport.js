const passport = require('koa-passport');
const { Strategy, ExtractJwt } = require('passport-jwt');
const User = require('./models/User');

passport.use(
    new Strategy(
        {
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            secretOrKey: process.env.SECRET
        },
        (payload, done) => {
            User.findOne({ _id: payload.sub })
                .then((user) => {
                    done(null, user);
                })
                .catch((error) => done(error));
        }
    )
);

module.exports = passport;
