import { validateCommentNoteBody } from "../clientValidation.js";

const PrevNoteReq = {
    method: "GET",
    url: window.location.href + "note/",
    contentType: "application/json",
};

$.ajax(PrevNoteReq).then((response) => {
    if (response.note !== "") {
        validateCommentNoteBody(response.note);
        $("#noteInput").val(response.note);
    }
});

$("#notesForm").submit((submission) => {
    submission.preventDefault();
    try {
        const noteBody = $("##noteInput").val;
        console.log(noteBody);
        validateCommentNoteBody(submission);
    } catch (e) {
        //console.log(noteBody);
    }
});
