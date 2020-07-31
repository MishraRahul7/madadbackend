const express = require("express");
const cors = require("cors");

require("./db/mongoose");
require("dotenv").config();
const userRouter = require("./routes/user");
const app = express();

app.use(cors());
app.use(function (req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET,POST,OPTIONS,PUT,PATCH,DELETE"
  );
  res.setHeader(
    "Access-Control-Allow-Headers",
    "X-Requested-With,content-type"
  );
  res.setHeader("Access-Control-Allow-Credentials", true);
  next();
});
app.use(express.json());
app.use(userRouter);
const port = process.env.PORT;

app.listen(port, () => {
  console.log(`Server is running on port:${port}`);
});
