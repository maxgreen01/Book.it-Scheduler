import { validateArrayElements, validateAvailabilityObj, validateUserId } from "../clientValidation.js";
import { Availability } from "./availabilities.js";

export class Response {
    uid = null;
    availability = null;

    constructor(uid, availabilityArr) {
        validateUserId(uid, "UID for Response Object");
        this.uid = uid;
        validateArrayElements(availabilityArr, "Availability Array", (elem) => {
            validateAvailabilityObj(elem);
        });
        this.availability = availabilityArr;
    }

    static mergeResponsesToAvailability(responseArr, startTime = 0, endTime = 48) {
        validateArrayElements(responseArr, "Array Availability Objects", (elem) => {
            validateAvailabilityObj(elem);
        });
        let availabilityObjs;
        for (let responseObj of responseArr) {
            availabilityObjs.append(responseObj.availability);
        }
        return Availability.mergeAvailability(availabilityObjs, startTime, endTime);
    }
}
