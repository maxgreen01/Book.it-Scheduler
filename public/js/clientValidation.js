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
export function convertStrToInt(str, label = "Integer", min, max) {
    const num = Number.parseInt(str);
    return validateNumber(num, label, min, max);
}

// Convert a string to a float, and throw an error if it is NaN or outside the given bounds.
// Return the converted number if it is valid.
export function convertStrToFloat(str, label = "Float", min, max) {
    const num = Number.parseFloat(str);
    return validateNumber(num, label, min, max);
}

export function validateIntRange(int, label = "Integer", min, max = Number.MAX_SAFE_INTEGER) {
    const num = validateNumber(int, label, min, max);
    if (!Number.isInteger(int)) {
        throw new ValidationError(`${label} is not an integer`);
    }
    return num;
}

//
// ============ Database-Related Validation ============
//

// Throw an error if a string is not valid or is not a valid `uid`.
// A `uid` is considered valid if it is alphanumeric and contains between 3 and 30 characters.
// Return the trimmed `uid` if it is valid.
export function validateUserId(uid) {
    return validateAlphanumeric(uid, "Username", 3, 30);
}

// Throw an error if a password does not match password requirements
// Note that this does NOT trim the string
export function validatePassword(password) {
    if (typeof password !== "string") throw new ValidationError("Password must be a string");
    if (password.length < 8) throw new ValidationError("Password should be at least 8 characters");
    if (!/[A-Z]/.test(password)) throw new ValidationError("Password must contain an uppercase letter");
    if (!/[0-9]/.test(password)) throw new ValidationError("Password must contain a number");
    if (/^[A-z0-9]*$/.test(password)) throw new ValidationError("Password must contain a special character");
    return password;
}

// Throw an error if a string is not valid or does not represent not a valid ObjectId.
// Return the trimmed string if it represents a valid ObjectId.
export function validateStrAsObjectId(id, label = "ObjectId String") {
    id = validateAndTrimString(id, label);
    const validObjectIdRegex = /^[0-9a-fA-F]{24}$/; // replaces ObjectId.isValid() so this can be used on client side
    if (id.length !== 24 || !validObjectIdRegex.test(id)) throw new ValidationError(`${label} "${id}" does not represent a valid ObjectId string`);
    return id;
}

//
// ============ Object & Class Validation ============
//

// Throw an error if an object contains any fields other than the allowed ones, which are passed as an array of strings.
// The object is not *required* to have all of these fields, because the value of each field should be checked individually and separately.
// Return the original object if it only contains valid fields.
export function validateObjectKeys(obj, allowedFields, label = "Object") {
    if (typeof obj !== "object") throw new ValidationError(`${label} must be an object`);
    validateArrayElements(allowedFields, `${label}'s required fields`, (field) => {
        if (typeof field !== "string") throw new ValidationError(`${label}'s required fields must be strings`);
    });

    // find and report disallowed fields
    const objKeys = Object.keys(obj);
    const invalidFields = objKeys.filter((key) => !allowedFields.includes(key));
    if (invalidFields.length > 0) {
        throw new ValidationError(`${label} contains invalid fields: ${JSON.stringify(invalidFields)}`);
    }
    return obj;
}

// Check whether two Date objects represent the same calendar day
export function isSameDay(firstDate, secondDate) {
    if (typeof firstDate == "undefined" || typeof secondDate == "undefined") return false;
    return firstDate.getFullYear() === secondDate.getFullYear() && firstDate.getMonth() === secondDate.getMonth() && firstDate.getDate() === secondDate.getDate();
}

// Validate that an object is a valid JS Date Object.
// Return the original object if it is valid.
export function validateDateObj(obj, label = "Date") {
    if (!(obj instanceof Date) || Number.isNaN(obj.valueOf())) throw new ValidationError(`${label} is not a valid Date Object`);
    return obj;
}

// Validate that an object is a valid Availability Object.
// If `skipDateCheck == true`, don't validate that `obj.date` is a valid JS Date Object.
// Return the validated object if it is valid.
export function validateAvailabilityObj(obj, skipDateCheck = false) {
    const allowedKeys = ["slots", "date"];
    obj = validateObjectKeys(obj, allowedKeys, "Availability Object");

    if (!skipDateCheck) obj.date = validateDateObj(obj.date, "Availability Object's Date");
    obj.slots = validateArrayElements(obj.slots, "Availability Object's Slots", (slot) => validateIntRange(slot, "Availability Object's Slot", 0), 48);

    return obj;
}

// Validate that an object is a valid WeeklyAvailability Object.
// Return the validated object if it is valid.
export function validateWeeklyAvailabilityObj(obj) {
    const allowedFields = ["days"];
    obj = validateObjectKeys(obj, allowedFields, "WeeklyAvailability Object");

    obj.days = validateArrayElements(obj.days, "WeeklyAvailability Days", (availabilityObj) => validateAvailabilityObj(availabilityObj, true), 7);

    return obj;
}

// Validate that a string is a valid Note or Comment body.
// Return the validated body if it is valid.
export function validateCommentNoteBody(str, label = "Body") {
    return validateAndTrimString(str, label, 1, 5000);
}

// Validate that an object is a valid Responses Object.
// If `allowedDates` is defined, verify that the `date` property of each Availability object in the Response corresponds to one of the allowed dates.
// Return the validated object if it is valid.
export function validateResponseObj(obj, allowedDates = undefined) {
    const allowedKeys = ["uid", "availabilities"];
    obj = validateObjectKeys(obj, allowedKeys, "Response Object");

    obj.uid = validateUserId(obj.uid);
    obj.availabilities = validateArrayElements(obj.availabilities, "Response Object's Availability Array", (elem) => validateAvailabilityObj(elem));

    if (allowedDates !== undefined) {
        // Make sure the `date` of each Availability object is a valid date, with no duplicate dates

        allowedDates = validateArrayElements(allowedDates, "Allowed Response Dates", (date) => validateDateObj(date));

        // make sure each of the Availability objects has a `date` corresponding to one of the specified dates.
        // FIXME make sure there aren't multiple Availability objects with the same Date -- could remove from `allowedDates`?
        for (const availability of obj.availabilities) {
            const isDateValid = allowedDates.some((date) => {
                isSameDay(date, availability.date);
            });

            if (!isDateValid) {
                throw new ValidationError(`Response Object contains an Availability object with a date that is not allowed`);
            }
        }
    }

    return obj;
}

// Check if each element in the ResponseArr has the same date in the same order as all others (and in the same order).
// Return the array of dates contained by all Response Objects if the checks succeed
export function validateResponseArrHasSameDates(responseArr) {
    validateArrayElements(responseArr, "Response Array", (response) => {
        validateResponseObj(response);
    });

    const responseDates = responseArr[0].availabilities.map((avail) => avail.date);

    validateArrayElements(responseArr, "Response Array", (response) => {
        const availabilities = response.availabilities;
        for (let i = 0; i < availabilities.length; i++) {
            if (!isSameDay(responseDates[i], availabilities[i].date)) {
                throw new Error("Response Objects must have all the same dates!");
            }
        }
    });
    return responseDates;
}

// Validate that an object is a valid bookedTime for a meeting.
// Return the validated object if it is valid.
export function validateBookedTimeObj(obj) {
    const allowedKeys = ["date", "timeStart", "timeEnd"];
    obj = validateObjectKeys(obj, allowedKeys, "Meeting Booking Object");

    obj.date = validateDateObj(obj.date, "Meeting Booking Date");
    obj.timeStart = validateIntRange(obj.timeStart, "Meeting Booking Start Time", 0, 47);
    obj.timeEnd = validateIntRange(obj.timeEnd, "Meeting Booking End Time", 1, 48);
    if (obj.timeStart >= obj.timeEnd) throw new ValidationError("Meeting Booking Start Time must be before End Time");

    return obj;
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
    try {
        return arr.map(func);
    } catch (err) {
        throw new ValidationError(`Error iterating elements of ${label}:   ${err.message}`);
    }
}

// Throw an error if the type (extension) of a file does not match one of the allowed image types.
// Return the file extension if it is one of the allowed image types.
export function validateImageFileType(fileName, label = "Image File") {
    fileName = validateAndTrimString(fileName, label);
    const match = /\.(jpg|jpeg|png)$/i.exec(fileName);
    if (!match) throw new ValidationError(`${label} is not one of the allowed image file types`);
    return match[1].toLowerCase(); // return the matched file extension
}
