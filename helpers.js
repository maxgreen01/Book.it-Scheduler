import { ObjectId } from "mongodb";

const exportedMethods = {
    // Throw an error if a variable is undefined, not a string, or an empty string.
    // Return the trimmed string if it is valid.
    validateAndTrimString(str) {
        if (typeof str !== "string" || str.trim().length === 0) throw new Error(`Invalid or empty string input "${str}"`);
        return str.trim();
    },

    // Throw an error if the trimmed string contains any letters other than a-z or A-Z (or space), or has length lower than the specified minimum.
    // Return the trimmed string if it is valid.
    validateAlphabetical(str, minLen) {
        str = this.validateAndTrimString(str);
        // regex to check if the string is at least 1 a-z or A-Z character, anchored from beginning to end
        if (!str.match(/^[a-zA-Z ]+$/)) throw new Error(`String input "${str}" contains non-alphabetical characters`);
        if (str.length < minLen) throw new Error(`String input "${str}" is shorter than ${minLen} characters`);
        return str;
    },

    // same as `validateAlphabetical`, but numbers are also allowed in the string
    validateAlphanumeric(str, minLen) {
        str = this.validateAndTrimString(str);
        if (!str.match(/^[a-zA-Z0-9 ]+$/)) throw new Error(`String input "${str}" contains non-alphanumeric characters`);
        if (str.length < minLen) throw new Error(`String input "${str}" is shorter than ${minLen} characters`);
        return str;
    },

    // Throw an error unless a string is in the format "Firstname Lastname", with at least 3 characters in each name part.
    // Return the trimmed string if it is valid.
    validateName(str) {
        const nameParts = this.validateAndTrimString(str).split(" ");
        if (nameParts.length !== 2) throw new Error(`Name "${str}" does not have the proper format`);
        return nameParts.map((part) => this.validateAlphabetical(part, 3)).join(" ");
    },

    // Throw an error if a variable is undefined, not an array, or an empty array.
    // If valid, run `map` on the array using the given function and return the result.
    validateArrayElements(arr, func) {
        if (!Array.isArray(arr) || arr.length === 0) throw new Error("Invalid or empty array input!");
        return arr.map(func);
    },

    // Throw an error if the input is not a Number, is NaN, or is outside the given bounds.
    // Return the given number.
    validateNumber(num, min, max) {
        if (typeof num !== "number" || Number.isNaN(num) || num < min || num > max) throw new Error(`Invalid number "${num}"`);
        return num;
    },

    // Convert a string to an int, and throw an error if it is NaN or outside the given bounds.
    // Return the converted number.
    convertStrToInt(str, min, max) {
        const num = Number.parseInt(str);
        this.validateNumber(num, min, max);
        return num;
    },

    // Convert a string to a float, and throw an error if it is NaN or outside the given bounds.
    // Return the converted number.
    convertStrToFloat(str, min, max) {
        const num = Number.parseFloat(str);
        this.validateNumber(num, min, max);
        return num;
    },

    // Throw an error if a string is not valid or is not a valid ObjectId.
    // Return the trimmed string if it is a valid ObjectId.
    validateObjectId(id) {
        id = this.validateAndTrimString(id);
        if (!ObjectId.isValid(id)) throw new Error(`Object ID ${id} is not valid!`);
        return id;
    },

    // Throw an error if a string is not valid or is not a valid ObjectId.
    // Return the converted ObjectID object if it is valid.
    convertStrToObjectId(id) {
        return ObjectId.createFromHexString(this.validateObjectId(id));
    },
};

export default exportedMethods;
