import { createMeetingDocument } from "../documentCreation.js";

// Set error text in html element with id "error"
function setError(err, elemId) {
    const errNode = document.getElementById(elemId);
    errNode.innerHTML = `${err.message}`;
}

// If meeting creation form fields are not valid, prevent submission and display an error
function validateCreateMeeting(event) {
    const titleInput = document.getElementById("titleInput");
    const descriptionInput = document.getElementById("descriptionInput");
    const durationInput = document.getElementById("durationInput");
    const dateStartInput = document.getElementById("dateStartInput");
    const dateEndInput = document.getElementById("dateEndInput");
    const timeStartInput = document.getElementById("timeStartInput");
    const timeEndInput = document.getElementById("timeEndInput");

    try {
        const meeting = createMeetingDocument({
            name: titleInput.value,
            description: descriptionInput.value,
            duration: durationInput.value,
            owner: "xxx", // actually populated on the server, but needed to pass validation
            dateStart: new Date(dateStartInput.value),
            dateEnd: new Date(dateEndInput.value),
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
const createMeetingForm = document.getElementById("createMeeting");
const editMeetingForm = document.getElementById("editMeeting");

if (createMeetingForm) createMeetingForm.addEventListener("submit", validateCreateMeeting);
if (editMeetingForm) editMeetingForm.addEventListener("submit", validateEditMeeting);
