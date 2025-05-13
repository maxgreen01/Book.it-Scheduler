import { validateImageFileType } from "../clientValidation.js";
import { createUserDocument } from "../documentCreation.js";
import { serverFail } from "../pages/server-AJAX.js";

//returns a matrix form of the user's response when submit is clicked
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
        if (files && files[0]) {
            let pfp = files[0];
            validateImageFileType(pfp.name, "Profile Picture");
            if (pfp.size > 5000000) throw new Error("Profile Picture must be under 5MB");
        }
        if (password != confirmPassword) throw new Error("Passwords do not match");
        createUserDocument(
            {
                firstName,
                lastName,
                description,
                password: password === "" ? undefined : password,
            },
            true
        );
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
