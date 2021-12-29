const { Server } = require("socket.io");

const Message = require("../models/Message");
const User = require("../models/User");
const Group = require("../models/Group");
const jwt = require("jsonwebtoken");

const CORS_ORIGIN = process.env.CORS ? process.env.CORS.split(",") : "*";

module.exports = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
    },
  });

  // auth middlewares
  io.use((socket, next) => {
    try {
      let handshake = socket.handshake;
      const data = jwt.verify(handshake.auth.token, process.env.SECRET);

      User.findOne({ _id: data.sub })
        .select("-groups")
        .then((user) => {
          if (user) {
            return next();
          } else {
            return next(new Error("handshake failed."));
          }
        })
        .catch((error) => {
          return next(error);
        });
    } catch (error) {
      return next(error);
    }
  });

  io.on("connection", (socket) => {
    // Join room
    socket.on("join", (groupId) => {
      socket.join(groupId);
    });

    // Leave room
    socket.on("leave", (groupId) => {
      socket.leave(groupId);
    });

    // Save message in database
    // Send message to a room
    socket.on("sendMessage", ({ to, from, text }) => {
      Message.create({
        sender: from,
        text: text,
      })
        .then((msg) => {
          Group.findOne({ _id: to }).then((group) => {
            // Add message to input.group
            group.messages.push(msg);
            group.save();

            Message.findOne({ _id: msg.id })
              .populate("sender")
              .then((savedMsg) => {
                socket.broadcast.to(to).emit("getMessage", savedMsg);
              })
              .catch((error) => console.log(error));
          });
        })
        .catch((error) => {
          console.log(error);
        });
    });
  });
};
