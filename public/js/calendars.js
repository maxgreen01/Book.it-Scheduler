//component included in a script tag where calendar clickables are needed
//can integrate this into a main.js client script if necessary

//state variables
let isMouseDown = false;
let isDeselecting = false;
let selectedSlots = new Set();

const editButton = document.getElementById("edit-response-button");
const submitButton = document.getElementById("submit-response-button");

//returns a matrix form of the user's response when submit is clicked
//TODO: If we want to send data as Responses instead of matrices, construct them here
function availabilityFromCalendar() {
    const calendarColumns = document.querySelectorAll(".calendar-column");
    let responseMatrix = [];

    //find all slots under this column and push it to the response
    for (let ts of calendarColumns) {
        const responseSlots = ts.querySelectorAll(".response-slot");
        const colValues = [];
        for (let slot of responseSlots) {
            colValues.push(slot.classList.contains("selected") ? 1 : 0);
        }
        responseMatrix.push(colValues);
    }
    return responseMatrix;
}

//respond button clicked
editButton.addEventListener("click", () => {
    //toggle off meeting calendar
    const timeslots = document.querySelectorAll(".timeslot");
    for (let ts of timeslots) {
        ts.hidden = true;
    }

    //replace with response
    const responseSlots = document.querySelectorAll(".response-slot");
    for (let ts of responseSlots) {
        ts.hidden = false;
    }

    //replace self with submit button
    editButton.hidden = true;
    submitButton.hidden = false;
});

//listener for submit button
//TODO: POST reponse here!!
submitButton.addEventListener("click", () => {
    //toggle off response
    const timeslots = document.querySelectorAll(".timeslot");
    for (let ts of timeslots) {
        ts.hidden = false;
    }

    //replace with meeting calendar
    const responseSlots = document.querySelectorAll(".response-slot");
    for (let ts of responseSlots) {
        ts.hidden = true;
    }

    //replace self with edit response button
    //TODO: If we don't want the user to submit two responses, set both hiddens to false. Else, call Update() on response obj
    editButton.hidden = false;
    submitButton.hidden = true;

    //TODO: Send over the complete matrix to the server or make response object here and send it
    console.log(availabilityFromCalendar()); //right now just log in browser console
});

//on page load register the listeners
document.addEventListener("DOMContentLoaded", () => {
    const timeslotElements = document.querySelectorAll(".response-slot");

    //apply listeners to all elements: mousedown (click), mouseover (drag), mouseup (release)
    for (let ts of timeslotElements) {
        // Click inside a cell: Start selection
        ts.addEventListener("mousedown", (e) => {
            isMouseDown = true;
            // if already selected start a deselect. else start select
            if (ts.classList.contains("selected")) {
                isDeselecting = true;
                ts.classList.remove("selected");
                selectedSlots.delete(ts);
            } else {
                isDeselecting = false;
                ts.classList.add("selected");
                selectedSlots.add(ts);
            }
            e.preventDefault(); //prevent selecting text on mousedown
        });

        // Mouse dragged over a cell: Continue behavior
        ts.addEventListener("mouseover", (e) => {
            //if holding the mouse when mousing over, select or deselect
            if (isMouseDown) {
                // cell selected & deselecting - remove cell
                // cell not selected & selecting - select cell
                // else no-op
                if (ts.classList.contains("selected") && isDeselecting) {
                    ts.classList.remove("selected");
                    selectedSlots.delete(ts);
                } else if (!ts.classList.contains("selected") && !isDeselecting) {
                    ts.classList.add("selected");
                    selectedSlots.add(ts);
                }
            }
            e.preventDefault();
        });

        // Click released inside cell: End selection
        ts.addEventListener("mouseup", () => {
            isMouseDown = false;
            isDeselecting = false;
        });
    }

    // Click released OUTside cell: End selection
    document.addEventListener("mouseup", () => {
        isMouseDown = false;
        isDeselecting = false;
    });
});
