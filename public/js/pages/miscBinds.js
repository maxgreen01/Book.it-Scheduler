$("#genBackButton").click(() => {
    //kinda stupid but it prevents the browser from just resending the last request and getting stuck in a error loop -PV
    const reload = window.location.href;
    window.location.href = reload;
});
