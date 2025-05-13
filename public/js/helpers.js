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
    validateIntRange(meetingStart, "Meeting Start Time", 0, 47);
    validateIntRange(meetingEnd, "Meeting End Time", 1, 48);
    if (meetingStart >= meetingEnd) {
        throw new ValidationError("Meeting End Time must be later than Start Time");
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
        for (let i = meetingStart; i < meetingEnd; i++) {
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
                        timeEnd: i, // timeEnd is the time AFTER everyone is available
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
                timeEnd: meetingEnd, // timeEnd is the time AFTER everyone is available
                users: numUsers,
            });
        }
    } // end of loop over dates

    return possibleTimes;
}

// Given the result of `mergeResponses` return an array of objects (with human-readable fields) representing the best times for all users, optionally with a boolean indicating whether each time is too short.
export function computeBestTimes(mergedAvailabilities, meetingStart, meetingEnd, numUsers, meetingDuration, keepShortTimes = true) {
    let bestTimes = [];
    // loop until we start getting available times (or run out of users, meaning there are no times)
    while (numUsers > 1) {
        let times = computeBestTimesHelper(mergedAvailabilities, meetingStart, meetingEnd, numUsers);
        if (times.length == 0) {
            // not all users are available, so try again searching for fewer people
            numUsers -= 1;
            continue;
        } else {
            // check if any of the chunks are too short for the meeting duration
            if (!keepShortTimes) {
                // discard meetings that are too short
                times = times.filter((time) => !(meetingDuration > time.timeEnd - time.timeStart));
            } else {
                // mark meetings as being too short or not, and save them all
                for (const time of times) {
                    time.tooShort = meetingDuration > time.timeEnd - time.timeStart;
                }
            }

            // save all the responses
            bestTimes = bestTimes.concat(times);

            if (times.length == 0 || times.every((time) => time.tooShort)) {
                // all times are too short, so keep iterating
                numUsers -= 1;
                continue;
            } else {
                // the best times have been found, so exit the loop
                break;
            }
        }
    } // end of `while` loop

    // additional field conversions
    for (const time of bestTimes) {
        time.minmaxDate = formatDateAsMinMaxString(time.date); // store a copy formatted like Date pickers for validation
    }

    return bestTimes;
}

// Convert a single timeslot index (from 0-48) into its corresponding human-readable label.
// Note that indices map to the "start" of the corresponding timeslot, so `0` corresponds to the start of the "12:00 AM" timeslot.
// For example, `13` => "6:30 AM"
export function convertIndexToLabel(timeIndex) {
    if (typeof timeIndex === "undefined") throw new Error("Unable to format time index: no index given");

    const hours24 = Math.floor(timeIndex / 2) % 48; // round down since "2:30" is still in hour "2"
    const minutes = timeIndex % 2 === 0 ? "00" : "30";
    const meridian = hours24 >= 12 ? "PM" : "AM";
    const hours12 = hours24 % 12 || 12; // account for midnight when hours12 == 0

    // construct the time string
    return `${hours12}:${minutes} ${meridian}`;
}

// Generate an array representing the human-readable labels between a start time index (inclusive) and end time index (exclusive).
// If `asObject` is true, this returns objects with the label string stored in the `label` property, and the `small` boolean property indicating whether the time is on a half-hour
export function constructTimeLabels(timeStart, timeEnd, asObject = false) {
    const labels = [];
    for (let i = timeStart; i < timeEnd; i++) {
        const label = convertIndexToLabel(i);

        // add the result to the output
        if (asObject) {
            labels.push({ label: label, small: i % 2 == 1 });
        } else {
            labels.push(label);
        }
    }
    return labels;
}

const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const daysOfWeek = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
// transform a Date object into an object with properties `day` and `dow`, representing the formatted day of the month and corresponding day of the week
export function augmentFormatDate(date) {
    const month = monthNames[date.getMonth()];
    const dayOfMonth = date.getDate();
    const dayOfWeek = daysOfWeek[date.getDay()];
    return { day: `${month} ${dayOfMonth}`, dow: `${dayOfWeek}` };
}

// convert a Date into a string like "YYYY-MM-DD" which can be used for setting the `min` or `max` property of a date picker
export function formatDateAsMinMaxString(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// given a `meeting.invitations` object, return the users who have replied with a certain status
export function filterByInviteStatus(invitations, status) {
    if (!invitations) return;
    return Object.keys(invitations).filter((uid) => invitations[uid] === status);
}

// split a `meeting.invitations` object into an object with 3 arrays, representing the users who have replied with each status
export function categorizeInvitations(invitations) {
    if (!invitations) return;
    return {
        accepted: filterByInviteStatus(invitations, 1),
        pending: filterByInviteStatus(invitations, 0),
        declined: filterByInviteStatus(invitations, -1),
    };
}
