import { validateAndTrimString, validateUserId } from "../clientValidation.js";

export class Note {
    uid = null;
    noteString = null;

    constructor(uid, newNote) {
        this.uid = validateUserId(uid);
        this.noteString = validateAndTrimString(newNote, "Note String", 1, 5000);
    }
}
