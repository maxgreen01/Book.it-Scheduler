import { convertStrToInt, validateDateObj, validateIntRange, ValidationError } from "../clientValidation.js";
import { createMeetingDocument } from "../documentCreation.js";
import { formatDateAsMinMaxString } from "../helpers.js";

// Set error text in html element with id "error"
function setError(err, elemId) {
    const errNode = document.getElementById(elemId);
    errNode.innerHTML = `${err.message}`;
}

// find form elements
const createMeetingForm = document.getElementById("createMeeting");
const editMeetingForm = document.getElementById("editMeeting");
const bookMeetingForm = document.getElementById("bookMeeting");

// If meeting creation form fields are not valid, prevent submission and display an error
function validateCreateMeeting(event) {
    const titleInput = document.getElementById("titleInput");
    const descriptionInput = document.getElementById("descriptionInput");
    const durationInput = document.getElementById("durationInput");
    const dateStartInput = document.getElementById("dateStartInput");
    const dateEndInput = document.getElementById("dateEndInput");
    const timeStartInput = document.getElementById("timeStartInput");
    const timeEndInput = document.getElementById("timeEndInput");

    // convert dates from UTC time into local timezone (to match other funcs)

    try {
        const meeting = createMeetingDocument({
            name: titleInput.value,
            description: descriptionInput.value,
            duration: durationInput.value,
            owner: "xxx", // actually populated on the server, but needed to pass validation
            dateStart: dateStartInput.value,
            dateEnd: dateEndInput.value,
            timeStart: timeStartInput.value,
            timeEnd: timeEndInput.value,
        });
    } catch (err) {
        event.preventDefault();
        setError(err, "error");
    }
}

// If meeting editing form fields are not valid, prevent submission and display an error
function validateEditMeeting(event) {
    const titleInput = document.getElementById("titleInput");
    const descriptionInput = document.getElementById("descriptionInput");
    const durationInput = document.getElementById("durationInput");

    try {
        const meeting = createMeetingDocument(
            {
                name: titleInput.value,
                description: descriptionInput.value,
                duration: durationInput.value,
                timeStart: editMeetingForm.dataset.timeStart,
                timeEnd: editMeetingForm.dataset.timeEnd,
            },
            true
        );
        console.log(meeting);
    } catch (err) {
        event.preventDefault();
        setError(err, "edit-error");
    }
}

// ensure fields are valid and within the list of computed times before booking
function validateBookMeeting(event) {
    const dateInput = document.getElementById("dateInput");
    const timeStartInput = document.getElementById("timeStartInput");

    try {
        // validate inputs themselves
        let date, timeStart;
        try {
            const [year, month, day] = dateInput.value.split("-").map(Number);
            date = validateDateObj(new Date(year, month - 1, day), "Meeting Booking Date");
        } catch {
            throw new ValidationError("You must select a valid Date");
        }
        try {
            timeStart = validateIntRange(convertStrToInt(timeStartInput.value), "Meeting Booking Time", 0, 47);
        } catch {
            throw new ValidationError(`You must select a valid Start Time and End Time`);
        }

        // make sure the date is (at least partially) contained within one of the best times
        // note: to check if the booking time is entirely contained, we'll also need to get access to the meeting `duration` here
        const bestTimes = JSON.parse(bookMeetingForm.dataset.bestTimes); // todo replace HTML dataset with AJAX request if there's time
        let match = false;
        for (const time of bestTimes) {
            // move on if the date doesn't match
            if (formatDateAsMinMaxString(date) !== time.minmaxDate) {
                continue;
            }

            // check if the selected time is within the date range
            // note: this is where you would make changes to check if the booking time is entirely contained
            if (timeStart >= time.timeStart && timeStart < time.timeEnd) {
                match = true;
                break;
            }
            // else the current time doesn't contain the selected date, so keep checking
        }

        if (!match) {
            throw new Error("Meeting Booking must be (at least partially) contained within one of the computed best times");
        }
        // else continue to server
    } catch (err) {
        event.preventDefault();
        setError(err, "booking-error");
    }
}

// remove a meeting's booking, and return it to `pending`

// Attach event handlers
if (createMeetingForm) createMeetingForm.addEventListener("submit", validateCreateMeeting);
if (editMeetingForm) editMeetingForm.addEventListener("submit", validateEditMeeting);
if (bookMeetingForm) bookMeetingForm.addEventListener("submit", validateBookMeeting);
