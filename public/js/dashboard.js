//script used to add links to meeting cards & bookings on the dashboard page

document.addEventListener("DOMContentLoaded", () => {
    const bookingItems = document.querySelectorAll(".booking-item");

    //link booked meetings
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
    const checkbox = document.querySelector(".sidebar-checkbox");
});
