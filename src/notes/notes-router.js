const path = require("path");
const express = require("express");
const xss = require("xss");
const logger = require("../logger");
const NotesService = require("./notes-service");

const notesRouter = express.Router();
const jsonParser = express.json();

const serializeNote = note => ({
  id: note.id,
  name: xss(note.name),
  modified: note.modified,
  folderId: note.folderId,
  content: xss(note.content)
});

notesRouter.route("/").get((req, res, next) => {
  NotesService.getAllNotes(req.app.get("db"))
    .then(notes => {
      res.json(notes.map(serializeNote));
    })
    .catch(next);
});

module.exports = notesRouter;
