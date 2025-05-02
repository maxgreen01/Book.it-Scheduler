//class for notes
//two fields uid, and the representing the note itself

import { validateAndTrimString, validateUserId } from "../clientValidation.js";

export class Note {
    uid = null;
    noteString = null;

    constructor(uid, newNote) {
        uid = validateUserId(uid);
        this.uid = uid;
        newNote = validateAndTrimString(newNote, "Note String", 1, 5000);
        this.noteString = newNote;
    }
}
