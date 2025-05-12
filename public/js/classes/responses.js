import { validateResponseObj } from "../clientValidation.js";

export class Response {
    // the ID of the user who submitted this Response
    uid = null;

    // Array of Availability Objects corresponding to the dates of a meeting
    availabilities = null;

    constructor(uid, availabilityArr) {
        const validated = validateResponseObj({ uid, availabilities: availabilityArr });
        this.uid = validated.uid;
        this.availabilities = validated.availabilities;
    }
}
