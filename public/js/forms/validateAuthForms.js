import { validateImageFileType, validatePassword, validateProfilePicture, validateUserId, ValidationError } from "../clientValidation.js";
import { createUserDocument } from "../documentCreation.js";
import { serverFail } from "../pages/server-AJAX.js";

// Set error text in html element with id "error"
function setError(err) {
    const errNode = document.getElementById("error");
    errNode.innerHTML = `${err.message}`;
}

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

// If signup form fields are not valid, prevent submission and display an error
function validateSignup(event) {
    const firstName = document.getElementById("firstNameInput").value;
    const lastName = document.getElementById("lastNameInput").value;
    const description = document.getElementById("descriptionInput").value;
    const uid = document.getElementById("usernameInput").value;
    const password = document.getElementById("passwordInput").value;
    const confirmPassword = document.getElementById("confirmPasswordInput").value;
    const files = document.getElementById("profilePictureInput").files;
    const signUpForm = document.getElementById("signup");
    let signUpFormData = new FormData(signUpForm);
    const userDefaultAvail = availabilityFromCalendar();
    //append the new field availability which contains the user's default availability
    //It's kinda scuffed but it's the only way I could really figure out how to get this working for the form submission
    signUpFormData.append("availability", JSON.stringify(userDefaultAvail));
    event.preventDefault();
    try {
        if (password != confirmPassword) throw new Error("Passwords do not match");
        const user = createUserDocument(
            {
                firstName,
                lastName,
                description,
                uid,
                password,
                profilePicture: undefined, // checked separately below
            },
            true
        );

        if (files) {
            if (files.length !== 1) throw new ValidationError("Only one profile picture can be submitted");
            validateProfilePicture(files[0]);
        }

        //ajax request to the server will the signup details
        $.ajax({
            url: "/signup",
            type: "POST",
            data: signUpFormData,
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
                $("#signupFormWrapper").prepend(errorDiv);
                //scroll to top of page so user can see error
                $(window).scrollTop(0);
            });
    } catch (e) {
        $("#server-fail").remove();
        const errorDiv = serverFail(e.message);
        event.preventDefault();
        $("#signupFormWrapper").prepend(errorDiv);
        //scroll to top of page so user can see error
        $(window).scrollTop(0);
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
            //submit login if everything passes
            $("#login").submit();
        } catch (err) {
            throw new Error("Either username or password is invalid");
        }
    } catch (e) {
        $("#server-fail").remove();
        const errorDiv = serverFail(e.message);
        $("#formWrapper").prepend(errorDiv);
    }
}

//bind clicking of the submit div
$("#loginSubmit").click((event) => {
    validateLogin(event);
});

// Attach event handlers
const signupForm = document.getElementById("signup");
const loginForm = document.getElementById("login");

if (signupForm) signupForm.addEventListener("submit", validateSignup);
if (loginForm) loginForm.addEventListener("submit", validateLogin);
