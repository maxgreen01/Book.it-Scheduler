import { validateProfilePicture, ValidationError } from "../clientValidation.js";
import { createUserDocument } from "../documentCreation.js";
import { serverFail } from "../pages/server-AJAX.js";

//returns a matrix form o
//if the user's response when submit is clicked
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

let editMenuActive = false;

// Set error text in html element with id "error"
function setError(err) {
    $("#server-fail").remove();
    const errorDiv = serverFail(err.message);
    $("#formWrapper").prepend(errorDiv);
}

function toggleEditor(num) {
    let info = document.getElementById("info");
    let editor = document.getElementById("editor");
    let deleter = document.getElementById("deleter");
    info.hidden = num != 0;
    editor.hidden = num != 1;
    deleter.hidden = num != 2;
    if (editor.hidden) {
        editMenuActive = false;
    } else {
        editMenuActive = true;
        calendarBinds();
    }
}

async function deleteUser() {
    await fetch("/profile", { method: "DELETE" });
    window.location.reload();
}

function validateProfile(event) {
    const firstName = document.getElementById("firstNameInput").value;
    const lastName = document.getElementById("lastNameInput").value;
    const description = document.getElementById("descriptionInput").value;
    const password = document.getElementById("passwordInput").value;
    const confirmPassword = document.getElementById("confirmPasswordInput").value;
    const files = document.getElementById("profilePictureInput").files;
    const editForm = document.getElementById("editorForm");
    let editFormData = new FormData(editForm);
    const userDefaultAvail = availabilityFromCalendar();
    editFormData.append("availability", JSON.stringify(userDefaultAvail));
    try {
        if (password !== confirmPassword) throw new Error("Passwords do not match");
        createUserDocument(
            {
                firstName,
                lastName,
                description,
                password: password === "" ? undefined : password,
                profilePicture: undefined, // checked separately below
            },
            true
        );
        if (files) {
            if (files.length > 1) throw new ValidationError("Only one profile picture can be submitted");
            if (files.length == 1) validateProfilePicture(files[0]);
        }
        event.preventDefault();
        //ajax request to the server will the signup details
        $.ajax({
            url: "/profile",
            type: "POST",
            data: editFormData,
            processData: false,
            contentType: false,
        })
            .then(() => {
                //if code 200 then redirect to profile page
                window.location.href = "/profile";
            })
            .fail((e) => {
                //if failure show user the failure at the top of the page
                $("#server-fail").remove();
                let errorDiv = undefined;
                if (e.responseJSON) {
                    errorDiv = serverFail(e.responseJSON.error);
                } else {
                    errorDiv = serverFail("An unknown server error has occurred! Please reload the page or check your network connection.");
                }
                event.preventDefault();
                $("#formWrapper").prepend(errorDiv);
            });
    } catch (e) {
        event.preventDefault();
        setError(e);
    }
}

if (document.getElementById("editProfile")) {
    document.getElementById("editProfile").addEventListener("click", () => toggleEditor(1));
    document.getElementById("cancelEdit").addEventListener("click", () => toggleEditor(0));
    document.getElementById("deleteUser").addEventListener("click", () => toggleEditor(2));
    document.getElementById("confirmDelete").addEventListener("click", deleteUser);
    document.getElementById("cancelDelete").addEventListener("click", () => toggleEditor(1));
    document.getElementById("editorForm").addEventListener("submit", validateProfile);
}

let isMouseDown = false;
let isDeselecting = false;
let selectedSlots = new Set();

const calendarBinds = () => {
    const timeslotElements = document.querySelectorAll(".response-slot");

    //apply listeners to all elements: mousedown (click), mouseover (drag), mouseup (release)
    for (let ts of timeslotElements) {
        // Click inside a cell: Start selection
        ts.addEventListener("mousedown", (e) => {
            if (editMenuActive) {
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
            }
        });

        // Mouse dragged over a cell: Continue behavior
        ts.addEventListener("mouseover", (e) => {
            //if holding the mouse when mousing over, select or deselect
            if (isMouseDown && editMenuActive) {
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
            if (editMenuActive) {
                isMouseDown = false;
                isDeselecting = false;
            }
        });
        $("#submit-response-button").hide();
    }

    // Click released OUTside cell: End selection
    document.addEventListener("mouseup", () => {
        if (editMenuActive) {
            isMouseDown = false;
            isDeselecting = false;
        }
    });
};

$("#pfpUpload").click(() => {
    $("#profilePictureInput").click();
});

//detect if a valid image is uploaded
$("#profilePictureInput").change(function () {
    const file = this.files[0];
    const validTypes = ["image/png", "image/jpeg"];

    if (file && validTypes.includes(file.type)) {
        $("#pfpUpload").text(`Uploaded: ${file.name}`).removeClass("pfp-fail").addClass("pfp-succ");
    } else {
        $("#pfpUpload").text("Invalid file type! Upload a PNG or JPEG instead").removeClass("pfp-succ").addClass("pfp-fail");
    }
});

$("#signUpSubmit").click(() => {
    $("#SignUpButtonReal").click();
});
