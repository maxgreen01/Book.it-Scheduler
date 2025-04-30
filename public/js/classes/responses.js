import { validateAvailabilityObj, validateStrAsObjectId } from "../../../utils/validation";

export class Response {
    uid = null;
    availability = null;

    constructor(suid, availabilityArr) {
        validateStrAsObjectId(suid, "Uid for Response Object");
        this.uid = suid;
        validateArrayElements(AvailArray, "Availability Array", (elem) => {
            validateAvailabilityObj(elem);
        });
        this.availability = availabilityArr;
    }
}
