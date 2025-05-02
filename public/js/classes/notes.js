//class for notes
//two fields uid, and the representing the note itself

import { validateAndTrimString, validateStrAsObjectId } from "../clientValidation.js";

export class Note {
    uid = null;
    noteString = null;

    constructor(uid, newNote) {
        uid = validateStrAsObjectId(uid);
        this.uid = uid;
        newNote = validateAndTrimString(newNote, "Note String", 1, 5000);
        this.noteString = newNote;
    }
}
