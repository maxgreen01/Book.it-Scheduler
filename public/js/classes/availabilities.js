import { isSameDay, validateArrayElements, validateAvailabilityObj, validateDateObj, validateIntRange, ValidationError } from "../clientValidation.js";

// Make sure all the Availability objects in an array (assumed to already be validated) have the same `date` property
const enforceAllSameDate = (availabilityArray, commonDate) => {
    for (const availability of availabilityArray) {
        if (!isSameDay(availability.date, commonDate)) {
            throw new ValidationError(`Expected all array elements to have the same Date, but the dates ${commonDate} and ${availability.date} have different ones`);
        }
    }
};

export class Availability {
    // int array of 48 representing 30 mins chunks of time
    // slots[0] = 1: Available at 12:00 am
    // slots[1] = 0: Not Available at 12:30 am
    // and so on...
    slots = null;

    // the date that this object corresponds to
    date = null;

    constructor(intArray, date = null, skipDateCheck = false) {
        // FIXME - if using Duck Typing in validation funcs like `validateAvailability`, replace the below logic with that function call

        // validate the time slots
        intArray = validateArrayElements(intArray, "Slots Array", (elem) => validateIntRange(elem, "Availability Slot Integer", 0), 48);

        // OPTIONAL: Check if date is a valid date object
        if (!skipDateCheck) date = validateDateObj(date);

        //move to validation.js

        this.slots = intArray;
        this.date = date;
    }

    // Return a new availability obj of when everyone is available
    // availArray: Array of Availability Objects
    static mergeAvailability(availArray, startTime = 0, endTime = 48) {
        //TODO: if a user has other events booked, take those in a parameter and remove user availability

        //validate the array of Availability Objects
        availArray = validateArrayElements(availArray, "Availability Array", (elem) => validateAvailabilityObj(elem));
        const commonDate = availArray[0].date;
        enforceAllSameDate(availArray, commonDate);

        // actually merge the timeslots of each Availability Object
        const mergedSlots = new Array(48).fill(0);
        for (const availability of availArray) {
            for (let i = startTime; i < endTime; i++) {
                mergedSlots[i] += availability.slots[i];
            }
        }

        // construct the resulting object
        return new Availability(mergedSlots, commonDate);
    }
}

// Weekly (Default) Availability Object
//FIXME: When initializing the Weekly Availability Object in the user's profile page make sure to fill it in as 1s!
export class WeeklyAvailability {
    // Array of 7 Availability Objects, with the index corresponding to the day of the week (with 0 meaning Sunday)
    days = [];

    constructor(inputArray) {
        // FIXME - if using Duck Typing in validation funcs like `validateAvailability`, replace the below logic with that function call

        inputArray = validateArrayElements(
            inputArray,
            "Input Array for Weekly Availability",
            (elem) => {
                return validateArrayElements(elem, "Sub-Input Array for Weekly Availability", (subElem) => validateIntRange(subElem, "Availability Slot Integer", 0, 1), 48);
            },
            7
        );

        // actually populate the object with Availability Objects
        // FIXME - if the data is validated above, we can probably return the converted object directly from the validation function
        for (const data of inputArray) {
            this.days.push(new Availability(data, undefined, true));
        }
    }
}
