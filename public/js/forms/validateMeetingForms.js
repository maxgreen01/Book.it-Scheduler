import { createMeetingDocument } from "../documentCreation.js";

// Set error text in html element with id "error"
function setError(err, elemId) {
    const errNode = document.getElementById(elemId);
    errNode.innerHTML = `${err.message}`;
}

// find form elements
const createMeetingForm = document.getElementById("createMeeting");
const editMeetingForm = document.getElementById("editMeeting");

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

// Attach event handlers
if (createMeetingForm) createMeetingForm.addEventListener("submit", validateCreateMeeting);
if (editMeetingForm) editMeetingForm.addEventListener("submit", validateEditMeeting);
