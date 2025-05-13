import { validateProfilePicture, ValidationError } from "../clientValidation.js";
import { createUserDocument } from "../documentCreation.js";

// Set error text in html element with id "error"
function setError(err) {
    const errNode = document.getElementById("error");
    errNode.innerHTML = `${err.message}`;
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
            if (files.length !== 1) throw new ValidationError("Only one profile picture can be submitted");
            validateProfilePicture(files[0]);
        }
    } catch (e) {
        event.preventDefault();
        setError(e);
    }
}

document.getElementById("editProfile").addEventListener("click", () => toggleEditor(1));
document.getElementById("cancelEdit").addEventListener("click", () => toggleEditor(0));
document.getElementById("deleteUser").addEventListener("click", () => toggleEditor(2));
document.getElementById("confirmDelete").addEventListener("click", deleteUser);
document.getElementById("cancelDelete").addEventListener("click", () => toggleEditor(1));
document.getElementById("editorForm").addEventListener("submit", validateProfile);
