const { Server } = require("socket.io");

const Message = require("../models/Message");
const User = require("../models/User");
const Group = require("../models/Group");

const CORS_ORIGIN = process.env.CORS ? process.env.CORS.split(",") : "*";

module.exports = (httpServer) => {
  const io = new Server(httpServer, {
    cors: {
      origin: CORS_ORIGIN,
    },
  });

  // Socket.io middlewares
  io.use((socket, next) => {
    let handshake = socket.handshake;
    next();
  });

  io.on("connection", (socket) => {
    console.log("A connection made succesfully.", socket.id);

    socket.on("join", (groupId) => {
      socket.join(groupId);
    });

    socket.on("sendMessage", ({ to, from, text }) => {
      Message.create({
        sender: from,
        text: text,
      })
        .then((msg) => {
          Group.findOne({ _id: to }).then((group) => {
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

    socket.on("disconnect", () => {
      socket.leave(socket.id);
      console.log("User Disconnected.", socket.id);
    });
  });
};
