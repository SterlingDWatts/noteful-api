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
  folder_id: note.folder_id,
  content: xss(note.content)
});

notesRouter
  .route("/")
  .get((req, res, next) => {
    NotesService.getAllNotes(req.app.get("db"))
      .then(notes => {
        res.json(notes.map(serializeNote));
      })
      .catch(next);
  })
  .post(jsonParser, (req, res, next) => {
    const { name, folder_id, content } = req.body;
    const newNote = { name, folder_id, content };

    NotesService.insertNote(req.app.get("db"), newNote)
      .then(note => {
        res
          .status(201)
          .location(path.posix.join(req.originalUrl + `/${note.id}`))
          .json(serializeNote(note));
      })
      .catch(next);
  });

notesRouter
  .route("/:note_id")
  .all((req, res, next) => {
    const { note_id } = req.params;
    NotesService.getById(req.app.get("db"), note_id)
      .then(note => {
        if (!note) {
          logger.error(`Note with id ${note_id} not found`);
          return res.status(404).json({
            error: { message: "Note Not Found" }
          });
        }
        res.note = note;
        next();
      })
      .catch(next);
  })
  .get((req, res, next) => {
    res.json(serializeNote(res.note));
  });

module.exports = notesRouter;
