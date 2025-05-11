import { validateImageFileType, validatePassword, validateUserId } from "./clientValidation.js";
import { createUserDocument } from "./documentCreation.js";

// Set error text in html element with id "error"
function setError(err) {
    const errNode = document.getElementById("error");
    errNode.innerHTML = `${err.message}`;
}

// If signup form fields are not valid, prevent submission and display an error
function validateSignup(event) {
    const firstName = document.getElementById("firstNameInput").value;
    const lastName = document.getElementById("lastNameInput").value;
    const description = document.getElementById("descriptionInput").value;
    const uid = document.getElementById("usernameInput").value;
    const password = document.getElementById("passwordInput").value;
    const files = document.getElementById("profilePictureInput").files;
    try {
        const user = createUserDocument(
            {
                firstName,
                lastName,
                description,
                uid,
                password,
                profilePicture: undefined, // TODO pfp
                availability: undefined, // TODO availability
            },
            true
        ); // TODO remove true when above is implemented
        if (files && files[0]) {
            let pfp = files[0];
            validateImageFileType(pfp.name, "Profile Picture Name");
            if (pfp.size > 5000000) throw new Error("Profile Picture must be under 5MB");
        }
    } catch (e) {
        event.preventDefault();
        setError(e);
    }
}

// If login form fields are not valid, prevent submission and display an error
function validateLogin(event) {
    const uid = document.getElementById("usernameInput").value;
    const password = document.getElementById("passwordInput").value;
    try {
        validateUserId(uid);
        validatePassword(password);
    } catch (e) {
        event.preventDefault();
        setError(e);
    }
}

// Attach event handlers
const signupForm = document.getElementById("signup");
const loginForm = document.getElementById("login");

if (signupForm) signupForm.addEventListener("submit", validateSignup);
if (loginForm) loginForm.addEventListener("submit", validateLogin);
