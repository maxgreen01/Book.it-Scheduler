//component included in a script tag where calendar clickables are needed
//can integrate this into a main.js client script if necessary

import { serverFail } from "../pages/server-AJAX.js";

//state variables
let isMouseDown = false;
let isDeselecting = false;
let selectedSlots = new Set();
let viewerUid = null;
const respondents = [];

let onMainCalendar = true;

const calendarTitle = document.getElementById("calendar-title-header");
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
            colValues.push(slot.classList.contains("selected") || slot.classList.contains("blocked-out-slot") ? 0 : 1);
        }
        responseMatrix.push(colValues);
    }
    return responseMatrix;
}

let currTimeoutId = null;

const clearMessages = () => {
    $("#server-fail").remove();
    $("#server-success").remove();
};

//clear current error/success then wait for 3000ms before clearing again
function clearMessageTimeout() {
    clearMessages();
    if (currTimeoutId !== null) {
        clearTimeout(currTimeoutId);
    }
    currTimeoutId = setTimeout(clearMessages, 3000);
}

const getResponsesReq = {
    method: "GET",
    url: window.location.href + "/responses/",
    contentType: "application/json",
};

const genHTMLforRespondees = (users) => {
    let output = "";
    for (const user of users) {
        output += `<p class="userResText">${user}`;
        if (user === viewerUid) {
            output += " (You)";
        }
        output += "</p>";
    }
    return $(`${output}`);
};

const genAllRespondentHTML = (respondents) => {
    let output = "";
    const currURL = window.location.origin;

    for (const responder of respondents) {
        const youHTML = responder === viewerUid ? " (You)" : "";
        output += `<a class="profileLink" href="${currURL}/profile/${responder}">${responder}${youHTML}</a>`;
    }
    return $(`${output}`);
};

const bindSlot = (slot, uids, currUid) => {
    slot.addEventListener("mouseover", () => {
        const respondeeHTML = genHTMLforRespondees(uids, currUid);
        $("#responsePeople").empty();
        $("#edit-response-button").hide();
        $("#responsePeople").append(respondeeHTML);
        $("#responsePeopleHeader").html("Available:");
    });
};

const bindCalendarSlots = (responsesArr, timeStart, uid) => {
    const calendarColumns = document.querySelectorAll(".calendar-column");
    let i = 0;
    for (const ts of calendarColumns) {
        const slots = ts.querySelectorAll(".response-merged");
        let j = timeStart;
        for (const slot of slots) {
            const usersAvail = [];
            for (let response of responsesArr) {
                const isAvail = response.availabilities[i].slots[j] === 1;
                //console.log(response.availabilities[i].slots[j]);
                if (isAvail) usersAvail.push(response.uid);
            }
            j++;
            bindSlot(slot, usersAvail, uid);
        }
        i++;
    }
};

$("#calendarSection").mouseout(() => {
    $("#responsePeople").empty();
    if (onMainCalendar) {
        $("#edit-response-button").show();
        $("#responsePeopleHeader").html("Respondents:");
    }
    const allUsers = genAllRespondentHTML(respondents);
    $("#responsePeople").append(allUsers);
    $("#responsePeople").append(`<p>Hover over the calendar to see who's available!</p>`);
});

$.ajax(getResponsesReq)
    .then((res) => {
        viewerUid = res.uid;
        bindCalendarSlots(res.responses, res.start, res.uid);
        for (const response of res.responses) {
            respondents.push(response.uid);
        }
        const allUsers = genAllRespondentHTML(respondents);
        $("#responsePeople").prepend(allUsers);
    })
    .fail(() => {
        const errorDiv = serverFail("Failed to connect to the server to get your private note! Try reloading page or checking your network connection.");
        $("#responseSection").prepend(errorDiv);
    });

//respond button clicked
if (editButton) {
    editButton.addEventListener("click", () => {
        onMainCalendar = false;
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

        // update calendar title
        calendarTitle.innerHTML = "Your Availability";

        //replace self with submit button
        $("#edit-response-button").hide();
        $("#submit-response-button").show();
    });
}

//listener for submit button
//TODO: POST reponse here!!
if (submitButton) {
    submitButton.addEventListener("click", () => {
        onMainCalendar = true;
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


    // update calendar title
    calendarTitle.innerHTML = "Group's Availability";

    //replace self with edit response button
    //TODO: If we don't want the user to submit two responses, set both hiddens to false. Else, call Update() on response obj
    $("#edit-response-button").show();
    $("#submit-response-button").hide();

    //TODO: Send over the complete matrix to the server or make response object here and send it
    const reqBody = {
        method: "POST",
        data: JSON.stringify(availabilityFromCalendar()),
        url: window.location.href,
        contentType: "application/json",
    };
    $.ajax(reqBody)
        .then(() => {
            window.location.reload();
        })
        .fail(() => {
            const errorDiv = serverFail(`An unexpected error occurred when trying to submit your response! Try reloading the page or checking your network connection.`);
            clearMessageTimeout();
            $("#responseSection").append(errorDiv);
        });
});

//on page load register the listeners
// TODO maybe add a way to query which users are available at the selected time
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
        $("#submit-response-button").hide();
    }

    // Click released OUTside cell: End selection
    document.addEventListener("mouseup", () => {
        isMouseDown = false;
        isDeselecting = false;
    });
});
