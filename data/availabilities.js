import { validateArrayElements, ValidationError } from "../utils/validation.js";

//Check if every date is the same in all the array of Availability objects
const sameDate = (availabilityArray) => {
    if (!Array.isArray(availabilityArray) || availabilityArray.length === 0) {
        throw new ValidationError("Array is empty or not a valid array!");
    }
    let initialDate = availabilityArray[0].date;
    for (let elem of availabilityArray) {
        if (elem.date.getTime() !== initialDate.getTime()) {
            throw new ValidationError(`Expected all elements to have the same Date, but the dates ${initialDate} and ${elem.date} are different!`);
        }
    }
};

class Availability {
    //int array of 48 representing 30 mins chunks of time
    //slots[0] = 1: Available at 12:00 am
    //slots[0] = 0: Not Available at 12:30 am
    //and so on...
    slots = null;
    //the date that the Availability is representing
    date = null;

    constructor(array = new Array(48).fill(0), date = null, skipDateCheck = false) {
        //check that each element of the array is an int and it's 48 elements
        validateArrayElements(
            array,
            "Slots Array",
            (elem) => {
                if (!Number.isInteger(elem)) {
                    throw new ValidationError(`${elem} is not a valid Integer!`);
                }
                return elem;
            },
            48
        );

        //OPTIONAL: Check if date is a valid date object
        if (!(date instanceof Date) && !skipDateCheck) {
            throw new ValidationError(`${date} is not a valid Date Object!`);
        }
        this.slots = array;
        this.date = date;
    }

    //Return a new availability obj of when everyone is available
    //AvailArray: Array of Availability Objects
    //AvailArray: Array of Davailability Objects
    commonAvail(AvailArray, dAvailArr = []) {
        //validate the array of Availability Objects
        validateArrayElements(AvailArray, "Availability Array", (elem) => {
            if (!(elem instanceof Availability)) {
                throw new ValidationError(`${elem} is not a valid Availability object`);
            }
            return elem;
        });
        sameDate(AvailArray);

        const commonDate = AvailArray[0].date;
        let merged_slots = new Array(48).fill(0);
        for (let elem of AvailArray) {
            for (let i = 0; i < 48; i++) {
                if (elem.slots[i] !== -1) {
                    merged_slots[i] = merged_slots[i] + elem.slots[i];
                }
            }
        }

        //validate the array of Davailability Objects
        if (dAvailArr.length !== 0) {
            validateArrayElements(dAvailArr, "Default Availability Array", (elem) => {
                if (!(elem instanceof Davailability)) {
                    throw new ValidationError(`${elem} is not a valid Default Availability object!`);
                }
            });
        }
        for (let elem of dAvailArr) {
            for (let i = 0; i < 48; i++) {
                if (elem[commonDate.getDay()].slot[i] !== -1) {
                    merged_slots[i] = merged_slots[i] + elem[commonDate.getDay()].slot[i];
                }
            }
        }

        return new Availability(merged_slots, commonDate);
    }
}

//Default Availability Object
//Arrslot is a array of 7 Availability Object with the index corresponding to the Day of the Week
class Davailability {
    arrSlots = [];

    constructor(inputArray) {
        if (!Array.isArray(inputArray) || inputArray.length !== 7) {
            throw new ValidationError(`Array ${inputArray} should be an array of 7 elements`);
        }
        let i = 0;
        for (let elem of inputArray) {
            validateArrayElements(
                elem,
                "Slots Array",
                (elem) => {
                    if (!Number.isInteger(elem)) {
                        throw new ValidationError(`${elem} is not a valid Integer!`);
                    }
                    return elem;
                },
                48
            );
            this.arrSlots[i] = new Availability(elem, i, true);
            i++;
        }
    }
}

export { Availability, Davailability };
