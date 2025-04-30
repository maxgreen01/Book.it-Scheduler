// custom error class to identify validation errors (i.e. HTTP 400 errors) as opposed to server errors
export class ValidationError extends Error {
    constructor(message) {
        super(message);
        this.name = this.constructor.name;
    }
}

//
// ============ String Validation ============
//

// Throw an error if a variable is undefined, not a string, or an empty string (unless `ignoreEmpty` is `true`).
// Return the trimmed string if it is valid.
export function validateAndTrimString(str, label = "String", ignoreEmpty) {
    if (typeof str !== "string" || (!ignoreEmpty && str.trim().length === 0)) throw new ValidationError(`${label} "${str}" is invalid or empty`);
    return str.trim();
}

// Throw an error if the trimmed string does not match the given regex, or has length lower than the specified minimum.
// Return the trimmed string if it is valid.
export function validateStrUsingRegex(str, regex, label = "String", errorMsg = "disallowed", minLen) {
    str = validateAndTrimString(str);
    if (!str.match(regex)) throw new ValidationError(`${label} "${str}" contains ${errorMsg} characters`);
    if (str.length < minLen) throw new ValidationError(`${label} "${str}" is shorter than ${minLen} characters`);
    return str;
}

// Throw an error if the trimmed string contains any letters other than a-z or A-Z, or has length lower than the specified minimum.
// Return the trimmed string if it is valid.
export function validateAlphabetical(str, label = "String", minLen) {
    return validateStrUsingRegex(str, /^[a-zA-Z]+$/, label, "non-alphabetical", minLen);
}

// same as `validateAlphabetical`, but hyphens and apostrophes are also allowed in the string (for user names)
export function validateAlphabeticalExtended(str, label = "String", minLen) {
    return validateStrUsingRegex(str, /^[a-zA-Z'-]+$/, label, "non-alphabetical", minLen);
}

// same as `validateAlphabetical`, but numbers are also allowed in the string
export function validateAlphanumeric(str, label = "String", minLen) {
    return validateStrUsingRegex(str, /^[a-zA-Z0-9]+$/, label, "non-alphanumeric", minLen);
}

//
// ============ Number-Related Validation ============
//

// Throw an error if the input is not a Number, is NaN, or is outside the given bounds.
// Return the given number.
export function validateNumber(num, label = "Number", min, max) {
    if (typeof num !== "number" || Number.isNaN(num) || num < min || num > max) throw new ValidationError(`${label} "${num}" is invalid or out of range`);
    return num;
}

// Convert a string to an int, and throw an error if it is NaN or outside the given bounds.
// Return the converted number.
export function convertStrToInt(str, label = "Number", min, max) {
    const num = Number.parseInt(str);
    validateNumber(num, label, min, max);
    return num;
}

// Convert a string to a float, and throw an error if it is NaN or outside the given bounds.
// Return the converted number.
export function convertStrToFloat(str, label = "Number", min, max) {
    const num = Number.parseFloat(str);
    validateNumber(num, label, min, max);
    return num;
}

//
// ============ Database-Related Validation ============
//

// Throw an error if a string is not valid or is not a valid `uid`.
// A `uid` is considered valid if it is alphanumeric and contains at least 3 characters.
// Return the trimmed `uid` (converted to lowercase for case-insensitive operations) if it is valid.
export function validateUserId(uid) {
    return validateAlphanumeric(uid, "User ID", 3).toLowerCase();
}

// Throw an error if a string is not valid or does not represent not a valid ObjectId.
// Return the trimmed string if it represents a valid ObjectId.
export function validateStrAsObjectId(id, label) {
    id = validateAndTrimString(id, label);
    const validObjectIdRegex = /^[0-9a-fA-F]{24}$/; // replaces ObjectId.isValid() so this can be used on client side
    if (id.length !== 24 || !validObjectIdRegex.test(id)) throw new ValidationError(`${label} "${id}" is not valid`);
    return id;
}

//
// ============ Misc Validation & Utility ============
//

// Remove leading and trailing spaces from a string, and replace all whitespace with a single space.
// Return the sanitized string, or throw an error if the string is invalid or empty.
export function sanitizeSpaces(str, label) {
    str = validateAndTrimString(str, label);
    return str.replaceAll(/\s+/g, " ");
}

// Throw an error if a variable is undefined, not an array, or an empty array.
// Optionally, also ensure that the array has exactly the number of specified elements.
// If valid, run `map` on the array using the given function and return the result.
export function validateArrayElements(arr, label = "Array", func, numElements) {
    if (!Array.isArray(arr) || (!numElements && arr.length === 0)) throw new ValidationError(`${label} is invalid or empty`);
    if (numElements && arr.length !== numElements) throw new ValidationError(`${label} does not have ${numElements} elements`);
    return arr.map(func);
}

import { Availability, WeeklyAvailability } from "./classes/availabilities.js";

//validate that a Object is a valid Availability Object
export function validateAvailabilityObj(obj, skipDateCheck) {
    if (!(obj instanceof Availability)) {
        throw new ValidationError(`${obj} is not a valid Availability Object!`);
    }
    if (!(obj.date instanceof Date) && !skipDateCheck) {
        throw new ValidationError(`${date} is not a valid Date Object!`);
    }
    if (obj.slots.length !== 48) {
        throw new ValidationError(`${obj.slots} is not a valid slots array of 48 elements!`);
    }
    for (let elem of obj.slots) {
        if (!Number.isInteger(elem)) {
            throw new ValidationError(`${elem} is not a valid Integer in the slots array {$obj.slots}!`);
        }
    }
    return obj;
}

//validate that a Object is a valid weeklyAvailability Object
export function validateWeeklyAvailabilityObj(obj) {
    if (!(obj instanceof WeeklyAvailability)) {
        throw new ValidationError(`${obj} is not a valid weeklyAvailability Object!`);
    }
    if (obj.arrSlots.length !== 7) {
        throw new ValidationError(`${obj.arrSlots} is not a valid arrSlots array of 7 elements!`);
    }
    for (let i = 0; i < 7; i++) {
        const AvailabilityElem = obj.arrSlots[i];
        if (!(AvailabilityElem instanceof Availability)) {
            throw new ValidationError(`${obj.arrSlots[i]} is not a valid Availability Object!`);
        }
        if (AvailabilityElem.date !== i) {
            throw new ValidationError(`Date ${obj.arrSlots[i].Date} does not match the expect date of ${i}!`);
        }
        validateAvailabilityObj(obj.arrSlots[i], true);
    }
    return obj;
}
