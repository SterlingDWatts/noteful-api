const knex = require("knex");
const app = require("../src/app");
const { makeFoldersArray } = require("./folders.fixtures");
const { makeNotesArray, makeMaliciousNote } = require("./notes.fixtures");

describe(`Notes endpoints`, () => {
  let db;

  before("make knex instance", () => {
    db = knex({
      client: "pg",
      connection: process.env.TEST_DB_URL
    });
    app.set("db", db);
  });

  after("disconnect from db", () => db.destroy());

  before("clean the table", () =>
    db.raw("TRUNCATE notes, folders RESTART IDENTITY CASCADE")
  );

  afterEach("cleanup", () =>
    db.raw("TRUNCATE notes, folders RESTART IDENTITY CASCADE")
  );

  describe(`Unauthorized requests`, () => {
    const testFolders = makeFoldersArray();
    const testNotes = makeNotesArray();

    beforeEach("insert notes", () => {
      return db
        .into("folders")
        .insert(testFolders)
        .then(() => {
          return db.into("notes").insert(testNotes);
        });
    });

    it("responds 401 Unauthorized for GET /api/notes", () => {
      supertest(app)
        .get("/api/notes")
        .expect(401, {
          error: "Unauthorized request"
        });
    });
  });

  describe(`GET /api/notes`, () => {
    context(`Given no notes`, () => {
      it("responds with 200 and an empty list", () => {
        supertest(app)
          .get("/api/notes")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context(`Given there are notes in the database`, () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach("insert notes", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(testNotes);
          });
      });

      it("responds with 200 and all the notes", () => {
        supertest(app)
          .get("/api/notes")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testNotes);
      });
    });

    context(`Given an XSS attack note`, () => {
      const testFolders = makeFoldersArray();
      const { maliciousNote, expectedNote } = makeMaliciousNote();

      beforeEach("insert notes", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert([maliciousNote]);
          });
      });

      it("removes the XSS attack content", () => {
        return supertest(app)
          .get("/api/notes")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [expectedNote]);
      });
    });
  });

  describe(`GET /api/notes/:note_id`, () => {
    context(`Given no notes`, () => {
      it("responds with 404", () => {
        const noteId = 123456;
        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: "Note Not Found" } });
      });
    });

    context(`Given there are notes in the database`, () => {
      const testFolders = makeFoldersArray();
      const testNotes = makeNotesArray();

      beforeEach("insert notes", () => {
        const NotesCorrectedDates = testNotes.map(note => {
          return {
            ...note,
            modified: new Date(note.modified)
          };
        });
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert(NotesCorrectedDates);
          });
      });

      it("responds with 200 and the expected note", () => {
        const noteId = 2;
        const expectedNote = testNotes[noteId - 1];

        return supertest(app)
          .get(`/api/notes/${noteId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedNote);
      });
    });

    context(`Given an XSS attack note`, () => {
      const testFolders = makeFoldersArray();
      const { maliciousNote, expectedNote } = makeMaliciousNote();

      beforeEach("insert malicious note", () => {
        return db
          .into("folders")
          .insert(testFolders)
          .then(() => {
            return db.into("notes").insert([maliciousNote]);
          });
      });

      it("removes the XSS attack content", () => {
        return supertest(app)
          .get(`/api/notes/${maliciousNote.id}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedNote);
      });
    });
  });

  describe(`POST /api/notes`, () => {
    const testFolders = makeFoldersArray();
    beforeEach("insert note", () => {
      return db.into("folders").insert(testFolders);
    });

    it("creates a note, responding with 201 and the new note", () => {
      const newNote = {
        name: "This is a new note",
        folder_id: 1,
        content: "This is the content for the new note"
      };
      return supertest(app)
        .post("/api/notes")
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .send(newNote)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newNote.name);
          expect(res.body.folder_id).to.eql(newNote.folder_id);
          expect(res.body.content).to.eql(newNote.content);
          expect(res.body).to.have.property("id");
          expect(res.headers.location).to.eql(`/api/notes/${res.body.id}`);
        });
    });
  });
});
