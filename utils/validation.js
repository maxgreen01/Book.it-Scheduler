import { ObjectId } from "mongodb";
import { getAllUserIDs } from "../data/users.js";

const exportedMethods = {
    //
    // ============ String Validation ============
    //

    // Throw an error if a variable is undefined, not a string, or an empty string (unless `ignoreEmpty` is `true`).
    // Return the trimmed string if it is valid.
    validateAndTrimString(str, label = "String", ignoreEmpty) {
        if (typeof str !== "string" || (!ignoreEmpty && str.trim().length === 0)) throw new Error(`${label} "${str}" is invalid or empty`);
        return str.trim();
    },

    // Throw an error if the trimmed string contains any letters other than a-z or A-Z, or has length lower than the specified minimum.
    // Return the trimmed string if it is valid.
    validateAlphabetical(str, label = "String", minLen) {
        str = this.validateAndTrimString(str);
        // regex to check if the string is at least 1 a-z or A-Z character, anchored from beginning to end
        if (!str.match(/^[a-zA-Z]+$/)) throw new Error(`${label} "${str}" contains non-alphabetical characters`);
        if (str.length < minLen) throw new Error(`${label} "${str}" is shorter than ${minLen} characters`);
        return str;
    },

    // same as `validateAlphabetical`, but hyphens and apostrophes are also allowed in the string (for user names)
    validateAlphabeticalExtended(str, label = "String", minLen) {
        str = this.validateAndTrimString(str);
        if (!str.match(/^[a-zA-Z\-']+$/)) throw new Error(`${label} "${str}" contains non-alphanumeric characters`);
        if (str.length < minLen) throw new Error(`${label} "${str}" is shorter than ${minLen} characters`);
        return str;
    },

    // same as `validateAlphabetical`, but numbers are also allowed in the string
    validateAlphanumeric(str, label = "String", minLen) {
        str = this.validateAndTrimString(str);
        if (!str.match(/^[a-zA-Z0-9]+$/)) throw new Error(`${label} "${str}" contains non-alphanumeric characters`);
        if (str.length < minLen) throw new Error(`${label} "${str}" is shorter than ${minLen} characters`);
        return str;
    },

    //
    // ============ Number-Related Validation ============
    //

    // Throw an error if the input is not a Number, is NaN, or is outside the given bounds.
    // Return the given number.
    validateNumber(num, label = "Number", min, max) {
        if (typeof num !== "number" || Number.isNaN(num) || num < min || num > max) throw new Error(`${label} "${num}" is invalid or out of range`);
        return num;
    },

    // Convert a string to an int, and throw an error if it is NaN or outside the given bounds.
    // Return the converted number.
    convertStrToInt(str, label = "Number", min, max) {
        const num = Number.parseInt(str);
        this.validateNumber(num, label, min, max);
        return num;
    },

    // Convert a string to a float, and throw an error if it is NaN or outside the given bounds.
    // Return the converted number.
    convertStrToFloat(str, label = "Number", min, max) {
        const num = Number.parseFloat(str);
        this.validateNumber(num, label, min, max);
        return num;
    },

    //
    // ============ Database-Related Validation ============
    //

    // Throw an error if a string is not valid or is not a valid `uid`.
    // A `uid` is considered valid if it is alphanumeric and contains at least 3 characters.
    // Return the trimmed `uid` if it is valid and unique.
    validateUserId(uid) {
        return this.validateAlphanumeric(uid, "User ID", 3);
    },

    // Throw an error if a string is not valid or is not a valid `uid`.
    // If the `uid` is valid, return a boolean indicating whether it is already in use in the DB.
    async isUserIdUnique(uid) {
        uid = this.validateUserId(uid);
        return (await getAllUserIDs()).includes(uid);
    },

    // Throw an error if a string is not valid or does not represent not a valid ObjectId.
    // Return the trimmed string if it represents a valid ObjectId.
    validateStrAsObjectId(id, label) {
        id = this.validateAndTrimString(id, label);
        if (!ObjectId.isValid(id)) throw new Error(`${label} "${id}" is not valid`);
        return id;
    },

    // Throw an error if a string is not valid or is not a valid ObjectId.
    // Return the converted ObjectID object if it is valid.
    convertStrToObjectId(id, label) {
        return ObjectId.createFromHexString(this.validateStrAsObjectId(id, label));
    },

    //
    // ============ Misc Validation & Utility ============
    //

    // Remove leading and trailing spaces from a string, and replace all whitespace with a single space.
    // Return the sanitized string, or throw an error if the string is invalid or empty.
    sanitizeSpaces(str, label) {
        str = this.validateAndTrimString(str, label);
        return str.replaceAll(/\s+/g, " ");
    },

    // Throw an error if a variable is undefined, not an array, or an empty array.
    // Optionally, also ensure that the array has exactly the number of specified elements.
    // If valid, run `map` on the array using the given function and return the result.
    validateArrayElements(arr, label = "Array", func, numElements) {
        if (!Array.isArray(arr) || (!numElements && arr.length === 0)) throw new Error(`${label} is invalid or empty`);
        if (numElements && arr.length !== numElements) throw new Error(`${label} does not have ${numElements} elements`);
        return arr.map(func);
    },
};

export default exportedMethods;
