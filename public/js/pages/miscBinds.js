$("#genBackButton").click(() => {
    //kinda stupid but it prevents the browser from just resending the last request and getting stuck in a error loop -PV
    const reload = window.location.href;
    window.location.href = reload;
});

//bind to the back button on the edit meeting page
$("#editMeetingBack").click(() => {
    const url = $("#editMeetingBack").attr("data");
    window.location.href = url;
});
