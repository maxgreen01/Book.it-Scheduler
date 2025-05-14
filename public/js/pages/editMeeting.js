import { serverFail, serverSucc } from "./server-AJAX.js";

const deleteMeetingPrompt = () => {
    return $(`<p class="deletePrompt" id="deletePromptMeeting">
        Are you sure you want to cancel this meeting? This will remove your current booked time (if it exists).
        <button class="yes-delete" id="yesDeleteMeeting">Yes</button>
        <button class="no-delete" id="noDeleteMeeting">No</button>
    </p>`);
};

const restoreMeetingPrompt = () => {
    return $(`<p class="deletePrompt" id="deletePromptMeeting">
        Are you sure you want to restore this meeting?
        <button class="yes-delete" id="yesRestoreMeeting">Yes</button>
        <button class="no-delete" id="noRestoreMeeting">No</button>
    </p>`);
};

const cancelMeetingForm = () => {
    return $(`<form method="POST" name="cancelMeeting" id="cancelMeeting" action="${window.location.pathname}">
            <button class="cancelMeetingButton" type="submit" name="action" value="cancel"> <img src="/public/icons/calendar-xmark-svgrepo-com.svg" alt="Calendar Cancel" class="button-image" /> Cancel Meeting</button>
        </form>`);
};

const restoreMeetingForm = () => {
    return $(`<form method="POST" name="restoreMeeting" id="restoreMeeting" action="${window.location.pathname}">
            <button type="submit" class="restoreMeetingButton" name="action" value="restore"><img src="/public/icons/calendar-arrow-up-svgrepo-com.svg" alt="Calendar Arrow Up" class="button-image" />Restore Meeting</button>
        </form>`);
};

let currTimeoutId = null;

//cleared all error and success divs
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

const registerRestoreMeeting = () => {
    $("#restoreMeeting").submit((submission) => {
        submission.preventDefault();
        $("#deletePromptWrapper").empty();
        $("#deletePromptWrapper").append(restoreMeetingPrompt());
        $("#noRestoreMeeting").click(() => {
            $("#deletePromptWrapper").empty();
        });
        const restoreMeetingReq = {
            url: window.location.href,
            type: "POST",
            data: { action: "restore" },
        };
        $("#yesRestoreMeeting").click(() => {
            $.ajax(restoreMeetingReq)
                .then(() => {
                    $("#editMeetingDetailsWrapper").show();
                    clearMessageTimeout();
                    const successDiv = serverSucc("Successfully restored meeting!");
                    $("#deletePromptWrapper").empty();
                    $("#deletePromptWrapper").prepend(successDiv);
                    $("#restoreMeeting").remove();
                    $("#linkWrapper").prepend(cancelMeetingForm());
                    registerCancelMeeting();
                })
                .fail((e) => {
                    clearMessageTimeout();
                    let errorDiv = undefined;
                    if (e.responseJSON) {
                        errorDiv = serverFail(e.responseJSON.error);
                    } else {
                        errorDiv = serverFail("An unknown server error has occurred! Please reload the page or check your network connection.");
                    }
                    $("#deletePromptWrapper").prepend(errorDiv);
                });
        });
    });
};

const registerCancelMeeting = () => {
    $("#cancelMeeting").submit((submission) => {
        submission.preventDefault();
        $("#deletePromptWrapper").empty();
        $("#deletePromptWrapper").append(deleteMeetingPrompt());
        $("#noDeleteMeeting").click(() => {
            $("#deletePromptWrapper").empty();
        });
        const cancelMeetingReq = {
            url: window.location.href,
            type: "POST",
            data: { action: "cancel" },
        };
        $("#yesDeleteMeeting").click(() => {
            $.ajax(cancelMeetingReq)
                .then(() => {
                    clearMessageTimeout();
                    $("#editMeetingDetailsWrapper").hide();
                    const successDiv = serverSucc("Successfully cancelled meeting!");
                    $("#deletePromptWrapper").empty();
                    $("#deletePromptWrapper").prepend(successDiv);
                    $("#cancelMeeting").remove();
                    $("#linkWrapper").prepend(restoreMeetingForm());
                    registerRestoreMeeting();
                })
                .fail((e) => {
                    clearMessageTimeout();
                    let errorDiv = undefined;
                    if (e.responseJSON) {
                        errorDiv = serverFail(e.responseJSON.error);
                    } else {
                        errorDiv = serverFail("An unknown server error has occurred! Please reload the page or check your network connection.");
                    }
                    $("#deletePromptWrapper").prepend(errorDiv);
                });
        });
    });
};

registerCancelMeeting();
registerRestoreMeeting();
