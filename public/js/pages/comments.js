import { validateCommentNoteBody, validateUserId } from "../clientValidation.js";
import { serverFail, serverSucc } from "./server-AJAX.js";

//store timeout so we can cancel it later if required
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

//generate comment HTML
const genCommentHTML = (comment) => {
    return $(`<div class="comment-wrapper" id="commentWrapper${comment._id}">
                <div class="comment" id="comment${comment._id}">
                    <p>Author: ${comment.uid}</p>
                    <p>Text: ${comment.body}</p>
                    <p>Created at: ${comment.dateCreated}</p>
                    <button id="commentTrash${comment._id}" class="trashIcon" data="${comment._id}"></button>
                </div>
            </div>`);
};

//function that will bind to the comment's delete icon
const bindCommentDelete = (commentId) => {
    $(`#commentTrash${commentId}`).click(() => {
        const deletePrompt = deleteCommentPrompt(commentId);
        //console.log($(`#deletePrompt${commentId}`));
        //if the delete prompt doesn't already exist create it
        if (!$(`#deletePrompt${commentId}`)[0]) {
            $(`#commentTrash${commentId}`).after(deletePrompt);
        }
        //bind the cancellation of the delete
        $(`#noDelete${commentId}`).click(() => {
            $(`#deletePrompt${commentId}`).remove();
        });
        //bind the acceptance of the delete
        $(`#yesDelete${commentId}`).click(() => {
            const deleteReq = {
                method: "DELETE",
                url: window.location.href + `/comment/${commentId}`,
                contentType: "application/json",
            };
            $.ajax(deleteReq)
                .then(() => {
                    const succDiv = serverSucc("Successfully removed comment!");
                    $(`#comment${commentId}`).remove();
                    clearMessageTimeout();
                    $(`#commentWrapper${commentId}`).append(succDiv);
                    const clearCommentWrapper = () => {
                        $(`#commentWrapper${commentId}`).remove();
                    };
                    setTimeout(clearCommentWrapper, 3000);
                    //update the comment count
                    const commentCount = $("#comment-count");
                    let currCount = parseInt(commentCount.attr("data"));
                    currCount--;
                    commentCount.attr("data", currCount);
                    commentCount.html(`${currCount} comments`);
                })
                .fail((error) => {
                    if (error.status === 400) {
                        clearMessageTimeout();
                        const errorDiv = serverFail(`Validation Error: ${error.responseJSON.error}`);
                        $(`#comment${commentId}`).append(errorDiv);
                    } else if (error.status === 500) {
                        clearMessageTimeout();
                        const errorDiv = serverFail(`Server Error: ${error.responseJSON.error}`);
                        $(`#comment${commentId}`).append(errorDiv);
                    } else {
                        clearMessageTimeout();
                        const errorDiv = serverFail(`Unexpected Server Error! Check your connection, or try reloading the page`);
                        $(`#comment${commentId}`).append(errorDiv);
                    }
                });
        });
    });
};

//generate html for the Comment Deletion Prompt
const deleteCommentPrompt = (commentId) => {
    return $(`<p class="deletePrompt" id="deletePrompt${commentId}">
        Are you sure you want to delete this comment?
        <button class="yes-delete" id="yesDelete${commentId}">Yes</button>
        <button class="no-delete" id="noDelete${commentId}">No</button>
    </p>`);
};

//handle a new comment
$("#commentsForm").submit((submission) => {
    submission.preventDefault();
    clearMessages();
    try {
        //construct AJAX request to post the new comment
        const commentBody = $("#commentInput").val();
        validateCommentNoteBody(commentBody, "Comment Input");
        const postCommentReq = {
            method: "POST",
            url: window.location.href + "/comment/",
            contentType: "application/json",
            data: JSON.stringify({ commentInput: commentBody }),
        };
        $.ajax(postCommentReq)
            .then((res) => {
                //console.log(res);
                //generate the comment html and add it
                const newComment = genCommentHTML(res);
                const commentCount = $("#comment-count");
                commentCount.after(newComment);
                //update the comment count
                let currCount = parseInt(commentCount.attr("data"));
                currCount++;
                commentCount.attr("data", currCount);
                commentCount.html(`${currCount} comments`);
                //reset the comment's input box value
                $("#commentInput").val("");
                //bind delete to the new comment
                bindCommentDelete(res._id);
                //display success message
                const succDiv = serverSucc("Successfully added your comment!");
                clearMessageTimeout();
                $("#commentsForm").append(succDiv);
                $("#commentStart").remove();
            })
            .fail((error) => {
                if (error.status === 400) {
                    clearMessageTimeout();
                    const errorDiv = serverFail(`Validation Error: ${error.responseJSON.error}`);
                    $("#commentsForm").append(errorDiv);
                } else if (error.status === 500) {
                    clearMessageTimeout();
                    const errorDiv = serverFail(`Server Error: ${error.responseJSON.error}`);
                    $("#commentsForm").append(errorDiv);
                } else {
                    clearMessageTimeout();
                    const errorDiv = serverFail(`Unexpected Server Error! Check your connection, or try reloading the page`);
                    $("#commentsForm").append(errorDiv);
                }
            });
    } catch (e) {
        clearMessageTimeout();
        const errorDiv = serverFail(`Validation Error: ${e.message}`);
        $("#commentsForm").append(errorDiv);
    }
});

const getAllCommentsReq = {
    method: "GET",
    url: window.location.href + "/comment/",
    contentType: "application/json",
};

$.ajax(getAllCommentsReq)
    .then((res) => {
        const comments = res.comments;
        const currUser = validateUserId(res.uid);
        for (const comment of comments) {
            if (comment.uid === currUser) {
                bindCommentDelete(`${comment._id}`);
            }
        }
    })
    .fail(() => {
        const errorDiv = serverFail("Failed to connect to the server to get comment data! Try reloading page or checking your network connection.");
        $("#commentSection").prepend(errorDiv);
    });
