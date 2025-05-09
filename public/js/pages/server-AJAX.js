export const serverSucc = (message = "Server Success") => {
    return $(`<div id="server-success"><p id="server-success-message">${message}<p></div>`);
};

export const serverFail = (message = "Server Fail") => {
    return $(`<div id="server-fail"><p id="server-fail-message">${message}<p></div>`);
};
