//file that contains various helpers that can be anywhere client side

import { getMeetingById } from "../../data/meetings.js";
import { Availability } from "./classes/availabilities.js";
import { isSameDay, validateArrayElements, validateIntRange, validateResponseArrHasSameDate, validateResponseObj, ValidationError } from "./clientValidation.js";

//Takes in an array of Response Objects and returns a new array containing the dates of that
export function MergedResponsesAsAvailabilityArray(responseArr, meetingStart, meetingEnd) {
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
    validateResponseArrHasSameDate(responseArr);

    const mergedAvailabilities = [];
    for (let i = 0; i < responseArr[0].availabilities.length; i++) {
        const availabilitiesAtDate = [];
        for (const response of responseArr) {
            availabilitiesAtDate.push(response.availabilities[i]);
        }
        const mergedAvailability = Availability.mergeAvailability(availabilitiesAtDate, meetingStart, meetingEnd);
        mergedAvailabilities.push(mergedAvailability);
    }

    return mergedAvailabilities;
}

/*
Takes in a ResponseArr, and returns a object
{ meetingStart: int, MeetingEnd:int }
of the times when everyone is available
*/
function computeBestTimesHelper(responseArr, meetingStart, meetingDuration) {
    //validate all responses in ResponseArr
    validateArrayElements(responseArr, "Response Array", (response) => {
        validateResponseObj(response);
    });

    //validate Meeting Start, End, and Duration
    validateIntRange(meetingStart, "Meeting Start", 0, 47);
    validateIntRange(meetingDuration, "Meeting Duration", 0, 47);

    //check that the dates for all the Availability objects in the Response Objects are the same (and in the same order too!)
    validateResponseArrHasSameDate(responseArr);

    const possibleTimes = [];
    //for loop for day of availability
    for (let i = 0; i < responseArr[0].availabilities.length; i++) {
        let usersAvailable = 0;
        let currDate = responseArr[0].availabilities[i].date;
        //loop for each response
        for (const response of responseArr) {
            let durationOpen = true;
            //check if each response from meetingStart to the meetingDuration has everyone open
            for (let j = meetingStart; j <= meetingStart + meetingDuration; j++) {
                if (response.availabilities[i].slots[j] === 0) {
                    durationOpen = false;
                }
            }
            if (durationOpen) usersAvailable++;
        }
        if (usersAvailable === responseArr.length) {
            const meetingTime = {
                meetingStart,
                meetingEnd: meetingDuration + meetingStart,
                date: currDate,
            };
            possibleTimes.push(meetingTime);
        }
    }
    return possibleTimes;
}

//returns an array of objects that have the best time of all users
/*
[
{meetingStart: int,
meetingEnd: int}
]
*/
export function computeBestTimes(responseArr, meetingStart, meetingEnd, meetingDuration) {
    if (meetingStart > meetingEnd) {
        throw new ValidationError(`Meeting ending time (${meetingEnd}) is before starting time (${meetingStart})!`);
    }
    validateIntRange(meetingEnd, "Meeting End", 0, 47);
    let possibleTimes = [];
    for (let i = meetingStart; i <= meetingEnd - meetingDuration; i++) {
        const possibleTime = computeBestTimesHelper(responseArr, i, meetingDuration);
        if (possibleTime) possibleTimes = possibleTimes.concat(possibleTime);
    }
    return possibleTimes;
}

//FIX ME: TEST FUNCTIONS REMOVE LATER!!!!!!
const testMeeting = await getMeetingById("681ce9972d81de549f5a7bcf");
const meetingResponse = testMeeting.responses;

console.log(computeBestTimes(meetingResponse, 19, 25, 1));
