import { validateArrayElements, validateAvailabilityObj, validateUserId } from "../clientValidation.js";

export class Response {
    // the ID of the user who submitted this Response
    uid = null;

    // Array of Availability Objects corresponding to the dates of a meeting
    availabilities = null;

    constructor(uid, availabilityArr) {
        this.uid = validateUserId(uid, "UID for Response Object");
        this.availabilities = validateArrayElements(availabilityArr, "Availability Array", (elem) => validateAvailabilityObj(elem));
    }
}
