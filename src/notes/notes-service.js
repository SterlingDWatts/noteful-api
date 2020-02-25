const NotesService = {
  getAllNotes(knex) {
    return knex.select("*").from("notes");
  },
  getById(knex, id) {
    return knex("notes")
      .select("*")
      .where({ id })
      .first();
  },
  insertNote(knex, newNote) {
    return knex
      .insert(newNote)
      .into("notes")
      .returning("*")
      .then(rows => {
        return rows[0];
      });
  }
};

module.exports = NotesService;
