//Data functions for Day-Blocked availability objects
import { validateArrayElements, validateAvailabilityObj, validateIntRange, ValidationError } from "../clientValidation.js";

//Check if every date is the same in all the array of Availability objects
const sameDate = (availabilityArray) => {
    if (!Array.isArray(availabilityArray) || availabilityArray.length === 0) {
        throw new ValidationError("Array is empty or not a valid array!");
    }
    let initialDate = availabilityArray[0].date;
    for (let elem of availabilityArray) {
        if (elem.date.getFullYear() !== initialDate.getFullYear() || elem.date.getMonth() !== initialDate.getMonth() || elem.date.getDate() !== initialDate.getDate()) {
            throw new ValidationError(`Expected all elements to have the same Date, but the dates ${initialDate} and ${elem.date} are different!`);
        }
    }
};

export class Availability {
    //int array of 48 representing 30 mins chunks of time
    //slots[0] = 1: Available at 12:00 am
    //slots[1] = 0: Not Available at 12:30 am
    //and so on...
    slots = null;
    //the date that the Availability is representing
    date = null;

    constructor(intArray, date = null, skipDateCheck = false) {
        //check that each element of the array is an int and it's 48 elements
        validateArrayElements(
            intArray,
            "Slots Array",
            (elem) => {
                validateIntRange(elem, "Availability Slot Integer", 0, Number.MAX_SAFE_INTEGER);
            },
            48
        );

        //OPTIONAL: Check if date is a valid date object
        if (!(date instanceof Date) && !skipDateCheck) {
            throw new ValidationError(`${date} is not a valid Date Object!`);
        }

        //move to validation.js

        this.slots = intArray;
        this.date = date;
    }

    //Return a new availability obj of when everyone is available
    //availArray: Array of Availability Objects
    //weeklyAvailArr: Array of WeeklyAvailability Objects
    static mergeAvailability(availArray, startTime = 0, endTime = 48) {
        //TODO: if a user has other events booked, take those in a parameter and remove user availability

        //validate the array of Availability Objects
        validateArrayElements(availArray, "Availability Array", (elem) => {
            validateAvailabilityObj(elem);
        });
        sameDate(availArray);

        const commonDate = availArray[0].date;
        let mergedSlots = new Array(48).fill(0);
        for (let elem of availArray) {
            for (let i = startTime; i < endTime; i++) {
                if (elem.slots[i] !== -1) {
                    mergedSlots[i] = mergedSlots[i] + elem.slots[i];
                }
            }
        }

        return new Availability(mergedSlots, commonDate);
    }
}

//Default Availability Object
//Arrslot is a array of 7 Availability Object with the index corresponding to the Day of the Week
//FIX ME: When initializing the Weekly Availability Object in the user's profile page make sure to fill it in as 1s!
export class WeeklyAvailability {
    arrSlots = [];

    constructor(inputArray) {
        validateArrayElements(
            inputArray,
            "Input Array for Weekly Availability",
            (elem) => {
                validateArrayElements(
                    elem,
                    "Sub-Input Array for Weekly Availability",
                    (subElem) => {
                        validateIntRange(subElem, "Availability Slot Integer", 0, 1);
                    },
                    48
                );
            },
            7
        );
        let i = 0;

        for (let elem of inputArray) {
            this.arrSlots[i] = new Availability(elem, i, true);
            i++;
        }
    }
}
