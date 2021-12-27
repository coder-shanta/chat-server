const mongoose = require("mongoose");
const { Schema, SchemaTypes } = mongoose;

const GroupSchema = new Schema(
  {
    name: {
      type: String,
      require: true,
    },
    mambers: [
      {
        type: SchemaTypes.ObjectId,
        ref: "user",
      },
    ],
    creator: {
      type: SchemaTypes.ObjectId,
      ref: "user",
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("group", GroupSchema);
