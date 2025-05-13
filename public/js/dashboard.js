//script used to add links to meeting cards & bookings on the dashboard page

document.addEventListener("DOMContentLoaded", () => {
    // set up + button
    document.getElementById("create-meeting").addEventListener("click", () => {
        window.location.href = "/create";
    });

    //link booked meetings to their pages
    const bookingItems = document.querySelectorAll(".booking-item");
    for (let item of bookingItems) {
        item.addEventListener("click", () => {
            const meetingId = item.dataset.id;
            if (meetingId) {
                window.location.href = `/meetings/${meetingId}`;
            }
        });
    }

    //link cards
    const meetingCards = document.querySelectorAll(".meeting-card");
    for (let card of meetingCards) {
        card.addEventListener("click", () => {
            const meetingId = card.dataset.id; //references data-id = "meetingId" field
            if (meetingId) {
                window.location.href = `/meetings/${meetingId}`;
            }
        });
    }

    //connect a listener to the checkbox
    const checkbox = document.querySelector(".sidebar-checkbox input");
    const pastMeetings = document.querySelectorAll(".past-booking");

    checkbox.addEventListener("change", () => {
        pastMeetings.forEach((item) => {
            if (checkbox.checked) {
                // Hide the item if the checkbox is checked
                item.style.display = "none";
            } else {
                // Show the item if the checkbox is unchecked
                item.style.display = "";
            }
        });
    });
});
