import { validateArrayElements, validateAvailabilityObj, validateUserId } from "../clientValidation.js";
import { Availability, enforceAllSameDate } from "./availabilities.js";

export class Response {
    // the ID of the user who submitted this Response
    uid = null;

    // Array of Availability Objects corresponding to the dates of a meeting
    availabilities = null;

    constructor(uid, availabilityArr) {
        this.uid = validateUserId(uid, "UID for Response Object");
        this.availabilities = validateArrayElements(availabilityArr, "Availability Array", (elem) => validateAvailabilityObj(elem));
    }

    // static mergeResponsesToAvailability(responseArr, startTime = 0, endTime = 48) {
    //     responseArr = validateArrayElements(responseArr, "Array Availability Objects", (availability) => validateAvailabilityObj(availability));

    //     //add all Availability Objects in the responses to an array
    //     let availabilityObjs = [];
    //     for (let responseObj of responseArr) {
    //         availabilityObjs.push(responseObj.availabilities);
    //     }

    //     //Check if all availability objects have the same date before merging
    //     enforceAllSameDate(availabilityObjs, availabilityObjs[0].date);

    //     return Availability.mergeAvailability(availabilityObjs, startTime, endTime);
    // }
}
