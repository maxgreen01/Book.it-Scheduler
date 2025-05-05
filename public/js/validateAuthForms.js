import { validateAndTrimString, validateUserId } from "./clientValidation.js";
import { createUserDocument } from "./documentCreation.js";

function setError(err) {
    const errNode = document.getElementById("error");
    errNode.innerHTML = `${err.message}`;
}

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
                profilePicture: null, // TODO pfp
                availability: null, // TODO availability
            },
            true
        ); // TODO remove true when above is implemented
    } catch (e) {
        event.preventDefault();
        setError(e);
    }
}

function validateLogin(event) {
    const uid = document.getElementById("usernameInput").value;
    const password = document.getElementById("passwordInput").value;
    try {
        validateUserId(uid);
        validateAndTrimString(password, "Password"); // TODO revise
    } catch (e) {
        event.preventDefault();
        setError(e);
    }
}

const signupForm = document.getElementById("signup");
const loginForm = document.getElementById("login");

if (signupForm) signupForm.addEventListener("submit", validateSignup);
if (loginForm) loginForm.addEventListener("submit", validateLogin);
