import { validatePassword, validateUserId } from "../clientValidation.js";
import { createUserDocument } from "../documentCreation.js";

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
        try {
            validateUserId(uid);
            validatePassword(password);
        } catch (err) {
            throw new Error("Either username or password is invalid");
        }
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
