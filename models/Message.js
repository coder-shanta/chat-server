const mongoose = require("mongoose");
const { Schema, SchemaTypes } = mongoose;

const MessageSchema = new Schema(
  {
    text: {
      type: String,
      require: true,
    },
    sender: {
      type: SchemaTypes.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("message", MessageSchema);
