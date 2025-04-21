import { validateStrAsObjectId, ValidationError } from "../utils/validation";

class Response {
    uid = null;
    availability = null;

    constructor(suid, availabilityArr) {
        validateStrAsObjectId(suid, "Uid for Response Object");
        this.uid = suid;
        validateArrayElements(AvailArray, "Availability Array", (elem) => {
            if (!(elem instanceof Availability)) {
                throw new ValidationError(`${elem} is not a valid Availability object`);
            }
            return elem;
        });
        this.availability = availabilityArr;
    }
}

export default Response;
