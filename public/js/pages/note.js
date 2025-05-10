import { validateCommentNoteBody } from "../clientValidation.js";
import { serverFail, serverSucc } from "./server-AJAX.js";

//construct initial request to get the User's previous note
const PrevNoteReq = {
    method: "GET",
    url: window.location.href + "/note/",
    contentType: "application/json",
};

//store timeout so we can cancel it later if required
let currTimeoutId = null;

//clear all error and success divs
const clearMessages = () => {
    $("#server-fail").remove();
    $("#server-success").remove();
};

//clear current error/success then wait for 3000ms before clearing again
function clearMessageTimeout() {
    //scroll to the bottom so user can see the message
    //It's honestly a bit of a hack... -PV
    $("#noteSection").scrollTop($("#noteSection")[0].scrollHeight);
    clearMessages();
    if (currTimeoutId !== null) {
        clearTimeout(currTimeoutId);
    }
    currTimeoutId = setTimeout(clearMessages, 3000);
}

//AJAX request to get the User's previous note (if it exists!)
$.ajax(PrevNoteReq)
    .then((response) => {
        if (response.note !== undefined) {
            try {
                validateCommentNoteBody(response.note);
                $("#noteInput").val(response.note);
            } catch (e) {
                const errorDiv = serverFail(`Server failed to send a valid note, and instead sent: ${e.message}`);
                $("#noteSection").append(errorDiv);
            }
        }
    })
    .fail(() => {
        const errorDiv = serverFail("Failed to connect to the server to get your private note! Try reloading page or checking your network connection.");
        $("#noteSection").append(errorDiv);
    });

$("#notesForm").submit((submission) => {
    submission.preventDefault();
    clearMessages();
    try {
        const noteBody = $("#noteInput").val();
        validateCommentNoteBody(noteBody, "Note Input");
        const postNoteReq = {
            method: "POST",
            url: window.location.href + "/note/",
            contentType: "application/json",
            data: JSON.stringify({ noteInput: noteBody }),
        };
        $.ajax(postNoteReq)
            .then(() => {
                clearMessageTimeout();
                const succDiv = serverSucc(`Succesfully uploaded your note to the server`);
                $("#noteSection").append(succDiv);
            })
            .fail((error) => {
                if (error.status === 400) {
                    clearMessageTimeout();
                    const errorDiv = serverFail(`Validation Error: ${error.responseJSON.error}`);
                    $("#noteSection").append(errorDiv);
                } else if (error.status === 500) {
                    clearMessageTimeout();
                    const errorDiv = serverFail(`Server Error: ${error.responseJSON.error}`);
                    $("#noteSection").append(errorDiv);
                } else {
                    clearMessageTimeout();
                    const errorDiv = serverFail(`Unexpected Server Error! Check your connection, or try reloading the page`);
                    $("#noteSection").append(errorDiv);
                }
            });
    } catch (e) {
        clearMessageTimeout();
        const errorDiv = serverFail(`Validation Error: ${e.message}`);
        $("#noteSection").append(errorDiv);
    }
});
