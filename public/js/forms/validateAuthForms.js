import { WeeklyAvailability } from "../classes/availabilities.js";
import { validateImageFileType, validatePassword, validateUserId } from "../clientValidation.js";
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
    const files = document.getElementById("profilePictureInput").files;
    const signUpForm = document.getElementById("signup");
    let signUpFormData = new FormData(signUpForm);
    const userDefaultAvail = availabilityFromCalendar();
    signUpFormData.append("availability", JSON.stringify(userDefaultAvail));
    event.preventDefault();
    try {
        const user = createUserDocument(
            {
                firstName,
                lastName,
                description,
                uid,
                password,
                profilePicture: undefined, // pfp validation performed below
                availability: undefined, // TODO availability
            },
            true
        );
        if (files && files[0]) {
            let pfp = files[0];
            validateImageFileType(pfp.name, "Profile Picture");
            if (pfp.size > 5000000) throw new Error("Profile Picture must be under 5MB");
        }
        $.ajax({
            url: "/signup",
            type: "POST",
            data: signUpFormData,
            processData: false,
            contentType: false,
        })
            .then(() => {
                window.location.href = "/profile";
            })
            .fail((e) => {
                $("#server-fail").remove();
                console.log(e);
                const errorDiv = serverFail(e.responseJSON.error);
                event.preventDefault();
                $("#signupFormWrapper").prepend(errorDiv);
            });
    } catch (e) {
        $("#server-fail").remove();
        const errorDiv = serverFail(e.message);
        event.preventDefault();
        $("#signupFormWrapper").prepend(errorDiv);
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
