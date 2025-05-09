import { validateArrayElements, validateAvailabilityObj, validateResponseObj, validateUserId } from "../clientValidation.js";

export class Response {
    // the ID of the user who submitted this Response
    uid = null;

    // Array of Availability Objects corresponding to the dates of a meeting
    availabilities = null;

    constructor(uid, availabilityArr) {
        validateResponseObj({ uid, availabilities: availabilityArr });
        this.uid = uid;
        this.availabilities = availabilityArr;
    }
}
