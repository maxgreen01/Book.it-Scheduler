import { Availability, WeeklyAvailability } from "./classes/availabilities.js";
import { Note } from "./classes/notes.js";
import { Response } from "./classes/responses.js";

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

// Throw an error if a variable is undefined, not a string, or has length outside the specified bounds.
// If `minLen` is `undefined`, throw an error if the string is empty. To allow empty strings, use `minLen = 0`.
// Return the trimmed string if it is valid.
export function validateAndTrimString(str, label = "String", minLen, maxLen) {
    if (typeof str !== "string") throw new ValidationError(`${label} must be a string`);
    const trimmed = str.trim();
    if (typeof minLen === "undefined" && trimmed.length === 0) throw new ValidationError(`${label} cannot be empty`);
    if (trimmed.length < minLen) throw new ValidationError(`${label} is shorter than ${minLen} character(s)`);
    if (trimmed.length > maxLen) throw new ValidationError(`${label} is longer than ${maxLen} character(s)`);
    return trimmed;
}

// Throw an error if the trimmed string does not match the given regex, or has length outside the specified bounds.
// Return the trimmed string if it is valid.
export function validateStrUsingRegex(str, regex, label = "String", minLen, maxLen, errorMsg = "disallowed") {
    str = validateAndTrimString(str, label, minLen, maxLen);
    if (!str.match(regex)) throw new ValidationError(`${label} "${str}" contains ${errorMsg} characters`);
    return str;
}

// Throw an error if the trimmed string contains any letters other than a-z or A-Z, or has length outside the specified bounds.
// Return the trimmed string if it is valid.
export function validateAlphabetical(str, label = "String", minLen, maxLen) {
    return validateStrUsingRegex(str, /^[a-zA-Z]+$/, label, minLen, maxLen, "non-alphabetical");
}

// Same as `validateAlphabetical`, but numbers are also allowed in the string
export function validateAlphanumeric(str, label = "String", minLen, maxLen) {
    return validateStrUsingRegex(str, /^[a-zA-Z0-9]+$/, label, minLen, maxLen, "non-alphanumeric");
}

// Same as `validateAlphabetical`, but hyphens, apostrophes, and spaces are also allowed in the string (for user's first/last name)
export function validateAlphabeticalExtended(str, label = "String", minLen, maxLen) {
    return validateStrUsingRegex(str, /^[a-zA-Z'-]+$/, label, minLen, maxLen, "disallowed");
}

//
// ============ Number-Related Validation ============
//

// Throw an error if the input is not a Number, is NaN, or is outside the given bounds.
// Return the given number if it is valid.
export function validateNumber(num, label = "Number", min, max) {
    if (typeof num !== "number" || Number.isNaN(num) || num < min || num > max) throw new ValidationError(`${label} "${num}" is invalid or out of range`);
    return num;
}

// Convert a string to an int, and throw an error if it is NaN or outside the given bounds.
// Return the converted number if it is valid.
export function convertStrToInt(str, label = "Number", min, max) {
    const num = Number.parseInt(str);
    validateNumber(num, label, min, max);
    return num;
}

// Convert a string to a float, and throw an error if it is NaN or outside the given bounds.
// Return the converted number if it is valid.
export function convertStrToFloat(str, label = "Number", min, max) {
    const num = Number.parseFloat(str);
    validateNumber(num, label, min, max);
    return num;
}

export function validateIntRange(int, label = "Number", min, max) {
    const num = validateNumber(int, label, min, max);
    if (!Number.isInteger(int)) {
        throw new ValidationError(`${num} is does not have a type of Integer!`);
    }
    return num;
}

//
// ============ Database-Related Validation ============
//

// Throw an error if a string is not valid or is not a valid `uid`.
// A `uid` is considered valid if it is alphanumeric and contains between 3 and 30 characters.
// Return the trimmed `uid` (converted to lowercase for case-insensitive operations) if it is valid.
export function validateUserId(uid) {
    return validateAlphanumeric(uid, "User ID", 3, 30).toLowerCase();
}

// Throw an error if a string is not valid or does not represent not a valid ObjectId.
// Return the trimmed string if it represents a valid ObjectId.
export function validateStrAsObjectId(id, label) {
    id = validateAndTrimString(id, label);
    const validObjectIdRegex = /^[0-9a-fA-F]{24}$/; // replaces ObjectId.isValid() so this can be used on client side
    if (id.length !== 24 || !validObjectIdRegex.test(id)) throw new ValidationError(`${label} "${id}" does not represent a valid ObjectId string`);
    return id;
}

//validate that an Object is a valid Availability Object
export function validateAvailabilityObj(obj, skipDateCheck = false) {
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
            validateIntRange(elem, "Availability Int Slot", 0, Number.MAX_SAFE_INTEGER);
            throw new ValidationError(`${elem} is not a valid Integer in the slots array {$obj.slots}!`);
        }
    }
    return obj;
}

//validate that an Object is a valid weeklyAvailability Object
//validate that an Object is a valid weeklyAvailability Object
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

//validate that an Object is a valid Notes object
export function validateNoteObj(obj) {
    if (!(obj instanceof Note)) {
        throw new ValidationError(`${obj} is not a valid Notes Object!`);
    }
    obj.uid = validateUserId(obj.uid);
    obj.noteString = validateAndTrimString(obj.noteString, "Note String", 3, 5000);
}

//validate that an Object is a valid Responses object
export function validateResponseObj(obj) {
    if (!(obj instanceof Response)) {
        throw new ValidationError(`${obj} is not a valid Response Object!`);
    }
    obj.uid = validateUserId(obj.uid);
    validateAvailabilityObj(obj.availability);
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

// Throw an error if a variable is undefined, or not an array.
// If `numElements` is `undefined`, throw an error if the array is empty.
// Otherwise, throw an error if the array does not have exactly the specified number of elements.
// If valid, run `map` on the array using the given function and return the result.
export function validateArrayElements(arr, label = "Array", func, numElements) {
    if (!Array.isArray(arr)) throw new ValidationError(`${label} must be an array`);
    if (typeof numElements === "undefined" && arr.length === 0) throw new ValidationError(`${label} cannot be empty`);
    if (typeof numElements !== "undefined" && arr.length !== numElements) throw new ValidationError(`${label} does not have ${numElements} elements`);
    return arr.map(func);
}

// Throw an error if the type (extension) of a file does not match one of the allowed image types.
// Return the file extension if it is one of the allowed image types.
export function validateImageFileType(fileName, label) {
    fileName = validateAndTrimString(fileName, label);
    const match = /\.(jpg|jpeg|png)$/i.exec(fileName);
    if (!match) throw new ValidationError(`${label} is not one of the allowed image file types`);
    return match[1].toLowerCase(); // return the matched file extension
}
