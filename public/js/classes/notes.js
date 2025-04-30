//class for notes
//two fields uid, and the representing the note itself

import { validateAndTrimString, validateStrAsObjectId } from "../clientValidation.js";

export class Note {
    uid = null;
    noteString = null;

    //TODO: What does suid mean?????
    constructor(suid, newNote) {
        suid = validateStrAsObjectId(suid);
        this.uid = suid;
        newNote = validateAndTrimString(newNote, "Note String", 3, 5000);
        this.noteString = newNote;
    }
}
