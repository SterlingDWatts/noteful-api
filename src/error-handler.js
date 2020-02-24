const { NODE_ENV } = require("./config");
const logger = require("./logger");

function errorHandler(error, req, res, next) {
  let response;
  if (NODE_ENV === "productions") {
    response = { error: { message: "server error" } };
  } else {
    console.log(error);
    logger.error(error.message);
    response = { message: error.massage, error };
  }
  res.status(500).json(response);
}

module.exports = errorHandler;
