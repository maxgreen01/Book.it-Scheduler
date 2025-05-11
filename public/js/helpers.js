//file that contains various helpers that can be anywhere client side

import { Availability } from "./classes/availabilities.js";
import { validateArrayElements, validateIntRange, validateResponseArrHasSameDates, validateResponseObj, ValidationError } from "./clientValidation.js";

//Takes in an array of Response Objects and returns a new array containing Availability Objects representing the group's availability on each day
export function mergeResponses(responseArr, meetingStart, meetingEnd) {
    //validate all responses in ResponseArr
    validateArrayElements(responseArr, "Response Array", (response) => {
        validateResponseObj(response);
    });

    //validate Meeting Start and End
    validateIntRange(meetingStart, "Meeting Start", 0, 47);
    validateIntRange(meetingEnd, "Meeting Start", 0, 47);
    if (meetingStart > meetingEnd) {
        throw new ValidationError(`Meeting ending time (${meetingEnd}) is before starting time (${meetingStart})!`);
    }

    //check that the dates for all the Availability objects in the Response Objects are the same (and in the same order too!)
    const dates = validateResponseArrHasSameDates(responseArr);

    // merge responses one day at a time
    const mergedAvailabilities = [];
    for (let i = 0; i < dates.length; i++) {
        // extract the Availability objects for the selected date
        const availabilitiesAtDate = [];
        for (const response of responseArr) {
            availabilitiesAtDate.push(response.availabilities[i]);
        }

        // merge the Availabilities for this date
        const mergedAvailability = Availability.mergeAvailability(availabilitiesAtDate, meetingStart, meetingEnd);
        mergedAvailabilities.push(mergedAvailability);
    }

    return mergedAvailabilities;
}

/*
Takes in the result of `mergeResponses`, and returns an array of objects like
{ date: Date, timeStart: int, timeEnd: int, users: int }
representing the times when `numUsers` are available
*/
function computeBestTimesHelper(mergedAvailabilities, meetingStart, meetingEnd, numUsers) {
    const possibleTimes = [];

    // loop over each possible date
    for (const mergedAvailability of mergedAvailabilities) {
        const currDate = mergedAvailability.date;
        const slots = mergedAvailability.slots;

        let start = -1;
        // loop over each timeslot in this day, saving chunks where `numUsers` are available
        for (let i = meetingStart; i <= meetingEnd; i++) {
            if (slots[i] == numUsers) {
                // everyone is available

                if (start == -1) {
                    // start a new chunk
                    start = i;
                }
                // else, do nothing (wait until the chunk ends)
            } else {
                // not everyone is available

                if (start != -1) {
                    // this marks the end of a chunk, so save it and reset
                    const meetingTime = {
                        date: currDate,
                        timeStart: start,
                        timeEnd: i - 1,
                        users: numUsers,
                    };
                    possibleTimes.push(meetingTime);

                    start = -1;
                }
                // else, do nothing (wait to start a new chunk)
            }
        } // end of loop over slots for a particular day

        // if the last few slots of the day are available, save those too
        if (start != -1) {
            possibleTimes.push({
                date: currDate,
                timeStart: start,
                timeEnd: meetingEnd,
                users: numUsers,
            });
        }
    } // end of loop over dates

    return possibleTimes;
}

//returns an array of objects that have the best time for all users, with a boolean indicating whether each chunk is too short
export function computeBestTimes(responseArr, meetingStart, meetingEnd, meetingDuration, keepShortTime = true) {
    const mergedAvailabilities = mergeResponses(responseArr, meetingStart, meetingEnd);

    // calculate all possible times
    let possibleTimes = [];
    let numUsers = responseArr.length;
    // loop until we start getting available times (or run out of users, meaning there are no times)
    while (possibleTimes.length == 0 && numUsers > 0) {
        possibleTimes = computeBestTimesHelper(mergedAvailabilities, meetingStart, meetingEnd, numUsers);
        if (possibleTimes.length == 0) numUsers -= 1; // not all users are available, so try again searching for fewer people
    }

    // check if any of the chunks are too short for the meeting duration

    if (!keepShortTime) {
        possibleTimes.filter((time) => {
            meetingDuration > time.timeEnd - time.timeStart;
        });
    } else {
        for (const time of possibleTimes) {
            time.tooShort = meetingDuration > time.timeEnd - time.timeStart;
        }
    }

    return possibleTimes;
}
