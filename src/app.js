require("dotenv").config();
const express = require("express");
const morgan = require("morgan");
const helmet = require("helmet");
const cors = require("cors");
const { NODE_ENV } = require("./config");
const validateBearerToken = require("./validate-bearer-token");
const errorHandler = require("./error-handler");
const foldersRouter = require("./folders/folders-router");
const notesRouter = require("./notes/notes-router");

// create Express app
const app = express();

// log 'tiny' output if in production, else log 'common'
app.use(
  morgan(NODE_ENV === "production" ? "tiny" : "common", {
    skip: () => NODE_ENV === "test"
  })
);

// hide sensitive data with 'helmet' and allow cors
app.use(helmet());
app.use(cors());

// authentication middleware
app.use(validateBearerToken);

// folders and notes endpoints
app.use("/api/folders", foldersRouter);
app.use("/api/notes", notesRouter);

// basic endpoint for app.js
app.get("/", (req, res) => {
  res.send("Hello, world!");
});

// error handling middleware gives short response if in production
app.use(errorHandler);

// export the app
module.exports = app;
