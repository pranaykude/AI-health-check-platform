const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

console.log("Connecting to:", process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI)
  .then(() => {
    console.log("SUCCESSFULLY CONNECTED");
    process.exit(0);
  })
  .catch((err) => {
    console.error("FAILED TO CONNECT:", err.message);
    process.exit(1);
  });
