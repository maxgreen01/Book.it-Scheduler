$("#genBackButton").click(() => {
    //kinda stupid but it prevents the browser from just resending the last request and getting stuck in a error loop -PV
    const reload = window.location.href;
    window.location.href = reload;
});

//bind to the back button on the edit meeting page
$("#editMeetingBack").click(() => {
    const url = $("#editMeetingBack").attr("data-target");
    window.location.href = url;
});

//bind to when you click the share meeting link button
$("#linkShareButton").click((event) => {
    event.preventDefault();
    //set the text we're going to link to the current page url
    let linkText = window.location.href;
    //the thread on stackoverflow said not to use this method cause it was deprecated, but it works fine so... -PV
    let tempInput = $("<input>");
    $("body").append(tempInput);
    tempInput.val(linkText).select();
    document.execCommand("copy");
    tempInput.remove();
    //set text to link copied
    $("#linkShareButton").html(' <img src="/public/icons/link-svgrepo-com.svg" alt="Calendar Edit" class="button-image" /> Copied Link!');
    //reset text to copy meeting link after 2000ms
    setTimeout(() => {
        $("#linkShareButton").html('<img src="/public/icons/link-svgrepo-com.svg" alt="Calendar Edit" class="button-image" /> Copy Meeting Link');
    }, 2000);
});

$("#profileSubmit").click(() => {
    $("#profileSaveReal").click();
});

$("#cancelProfileEdit").click(() => {
    $("#deleteUser").click();
});

$("#deleteProfile").click(() => {
    $("#deleteUser").click();
});
