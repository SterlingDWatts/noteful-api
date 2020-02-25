const path = require("path");
const express = require("express");
const { isWebUri } = require("valid-url");
const xss = require("xss");
const logger = require("../logger");
const FoldersService = require("./folders-service");

const foldersRouter = express.Router();
const jsonParser = express.json();

const serializeFolder = folder => ({
  id: folder.id,
  name: xss(folder.name)
});

foldersRouter
  .route("/")
  .get((req, res, next) => {
    FoldersService.getAllFolders(req.app.get("db"))
      .then(folders => {
        res.json(folders.map(serializeFolder));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { name } = req.body;
    const newFolder = { name };
    if (!name) {
      logger.error("'name' is required");
      return res.status(400).send({
        error: { message: "'name' is required" }
      });
    }
    FoldersService.insertFolder(req.app.get("db"), newFolder)
      .then(folder => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl + `/${folder.id}`))
          .json(serializeFolder(folder));
      })
      .catch(next);
  });

foldersRouter
  .route("/:folder_id")
  .all((req, res, next) => {
    const { folder_id } = req.params;
    FoldersService.getById(req.app.get("db"), folder_id)
      .then(folder => {
        if (!folder) {
          logger.error(`Folder with id ${folder_id} not found`);
          return res.status(404).json({
            error: { message: "Folder Not Found" }
          });
        }
        res.folder = folder;
        next();
      })
      .catch(next);
  })
  .get((req, res) => {
    res.json(serializeFolder(res.folder));
  })
  .delete((req, res, next) => {
    FoldersService.deleteFolder(req.app.get("db"), req.params.folder_id).then(
      () => {
        res.status(204).end();
      }
    );
  });

module.exports = foldersRouter;
