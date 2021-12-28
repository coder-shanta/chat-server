const mongoose = require("mongoose");
const { Schema, SchemaTypes } = mongoose;

const UserSchema = new Schema({
  name: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    required: true,
  },
  hash: {
    type: String,
    required: true,
    select: false,
  },
  avaterColor: {
    type: String,
    required: true,
  },
  groups: [
    {
      type: SchemaTypes.ObjectId,
      ref: "group",
    },
  ],
});

module.exports = mongoose.model("user", UserSchema);
