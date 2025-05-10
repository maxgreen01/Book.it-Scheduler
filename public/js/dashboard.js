//script used to add links to meeting cards on the dashboard page
console.log("hello");
document.addEventListener("DOMContentLoaded", () => {
    const meetingCards = document.querySelectorAll(".meeting-card");
    for (let card of meetingCards) {
        card.addEventListener("click", () => {
            const meetingId = card.dataset.id; //references data-id = "meetingId" field
            if (meetingId) {
                window.location.href = `/meetings/${meetingId}`;
            }
        });
    }
});
