const knex = require("knex");
const app = require("../src/app");
const { makeFoldersArray, makeMaliciousFolder } = require("./folders.fixtures");

describe("Folders Endpoints", function() {
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

    beforeEach("insert folders", () => {
      return db.into("folders").insert(testFolders);
    });

    it("responds with 401 Unauthorized for GET /api/folders", () => {
      return supertest(app)
        .get("/api/folders")
        .expect(401, {
          error: "Unauthorized request"
        });
    });

    it("responds with 401 Unauthorized for GET /api/folders/:folder_id", () => {
      const folderId = 123456;
      return supertest(app)
        .get(`/api/folders/${folderId}`)
        .expect(401, {
          error: "Unauthorized request"
        });
    });
  });

  describe(`GET /api/folders`, () => {
    context(`Given no folders`, () => {
      it(`responds with 200 and an empty list`, () => {
        return supertest(app)
          .get("/api/folders")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, []);
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert folders", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with 200 and all the folders", () => {
        return supertest(app)
          .get("/api/folders")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, testFolders);
      });
    });

    context(`Given an XSS attack folder`, () => {
      const { malicousFolder, expectedFolder } = makeMaliciousFolder();

      beforeEach("insert folders", () => {
        return db.into("folders").insert([malicousFolder]);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get("/api/folders")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, [expectedFolder]);
      });
    });
  });

  describe(`GET /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it("responds with 404", () => {
        const folderId = 123456;
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: "Folder Not Found" } });
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert folders", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with 200 and the specified folder", () => {
        const folderId = 2;
        const expectedFolder = testFolders[folderId - 1];
        return supertest(app)
          .get(`/api/folders/${folderId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedFolder);
      });
    });

    context(`Given an XSS attack folder`, () => {
      const { malicousFolder, expectedFolder } = makeMaliciousFolder();

      beforeEach("insert malicous folder", () => {
        return db.into("folders").insert([malicousFolder]);
      });

      it("removes XSS attack content", () => {
        return supertest(app)
          .get(`/api/folders/${malicousFolder.id}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(200, expectedFolder);
      });
    });
  });

  describe(`POST /api/folders`, () => {
    it("responds with 400 missing 'name' if not supplied", () => {
      const newFolder = {
        id: 1
      };
      return supertest(app)
        .post("/api/folders")
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .send(newFolder)
        .expect(400, { error: { message: "'name' is required" } });
    });

    it("creates a folder, responding with 201 and the new folder", () => {
      const newFolder = {
        id: 1,
        name: "Test folder"
      };
      return supertest(app)
        .post("/api/folders")
        .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
        .send(newFolder)
        .expect(201)
        .expect(res => {
          expect(res.body.name).to.eql(newFolder.name);
          expect(res.headers.location).to.eql(`/api/folders/${res.body.id}`);
        });
    });

    context("Given an XSS attack folder", () => {
      it("removes XSS attack content from response", () => {
        const { malicousFolder, expectedFolder } = makeMaliciousFolder();
        return supertest(app)
          .post("/api/folders")
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(malicousFolder)
          .expect(201)
          .expect(res => {
            expect(res.body.name).to.eql(expectedFolder.name);
          });
      });
    });
  });

  describe(`DELETE /api/folders/:folder_id`, () => {
    context(`Given no folders`, () => {
      it("responds with 404", () => {
        const folderId = 123456;
        return supertest(app)
          .delete(`/api/folders/${folderId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, { error: { message: "Folder Not Found" } });
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert folders", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with 204 and removes the folder", () => {
        const idToRemove = 2;
        const expectedFolders = testFolders.filter(
          folder => folder.id !== idToRemove
        );
        return supertest(app)
          .delete(`/api/folders/${idToRemove}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(204)
          .then(res => {
            supertest(app)
              .get("/api/folders")
              .expect(expectedFolders);
          });
      });
    });
  });

  describe(`PATCH /api/folders/:folder_id`, () => {
    context(`Given there are no folders`, () => {
      it("responds with 404", () => {
        const folderId = 123456;
        return supertest(app)
          .patch(`/api/folders/${folderId}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .expect(404, {
            error: { message: "Folder Not Found" }
          });
      });
    });

    context(`Given there are folders in the database`, () => {
      const testFolders = makeFoldersArray();

      beforeEach("insert folderrs", () => {
        return db.into("folders").insert(testFolders);
      });

      it("responds with 204 and updates the folder", () => {
        const idToUpdate = 1;
        const updateFolder = {
          name: "New Folder Name!"
        };
        const expectedFolder = {
          ...testFolders[idToUpdate - 1],
          ...updateFolder
        };
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(updateFolder)
          .expect(204);
      });

      it("responds with 400 when no required fields are supplied", () => {
        const idToUpdate = 1;
        const updateFolder = {
          words: "This isn't a category"
        };
        return supertest(app)
          .patch(`/api/folders/${idToUpdate}`)
          .set("Authorization", `Bearer ${process.env.API_TOKEN}`)
          .send(updateFolder)
          .expect(400, {
            error: {
              message: "Request body must contain 'name'"
            }
          });
      });
    });
  });
});
