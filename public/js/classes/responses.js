import { validateArrayElements, validateAvailabilityObj, validateUserId } from "../clientValidation.js";
import { Availability } from "./availabilities.js";

export class Response {
    // the ID of the user who submitted this Response
    uid = null;

    // Array of Availability Objects corresponding to the dates of a meeting
    availabilities = null;

    constructor(uid, availabilityArr) {
        this.uid = validateUserId(uid, "UID for Response Object");
        this.availabilities = validateArrayElements(availabilityArr, "Availability Array", (elem) => validateAvailabilityObj(elem));
    }

    static mergeResponsesToAvailability(responseArr, startTime = 0, endTime = 48) {
        responseArr = validateArrayElements(responseArr, "Array Availability Objects", (availability) => validateAvailabilityObj(availability));

        // FIXME - only merge availabilities that correspond to the same date -- maybe using `isSameDate` in validation file
        let availabilityObjs;
        for (let responseObj of responseArr) {
            availabilityObjs.append(responseObj.availabilities);
        }
        return Availability.mergeAvailability(availabilityObjs, startTime, endTime);
    }
}
