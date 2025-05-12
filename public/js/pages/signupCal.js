let isMouseDown = false;
let isDeselecting = false;
let selectedSlots = new Set();

document.addEventListener("DOMContentLoaded", () => {
    const timeslotElements = document.querySelectorAll(".response-slot");

    //apply listeners to all elements: mousedown (click), mouseover (drag), mouseup (release)
    for (let ts of timeslotElements) {
        // Click inside a cell: Start selection
        ts.addEventListener("mousedown", (e) => {
            isMouseDown = true;
            // if already selected start a deselect. else start select
            if (ts.classList.contains("selected")) {
                isDeselecting = true;
                ts.classList.remove("selected");
                selectedSlots.delete(ts);
            } else {
                isDeselecting = false;
                ts.classList.add("selected");
                selectedSlots.add(ts);
            }
            e.preventDefault(); //prevent selecting text on mousedown
        });

        // Mouse dragged over a cell: Continue behavior
        ts.addEventListener("mouseover", (e) => {
            //if holding the mouse when mousing over, select or deselect
            if (isMouseDown) {
                // cell selected & deselecting - remove cell
                // cell not selected & selecting - select cell
                // else no-op
                if (ts.classList.contains("selected") && isDeselecting) {
                    ts.classList.remove("selected");
                    selectedSlots.delete(ts);
                } else if (!ts.classList.contains("selected") && !isDeselecting) {
                    ts.classList.add("selected");
                    selectedSlots.add(ts);
                }
            }
            e.preventDefault();
        });

        // Click released inside cell: End selection
        ts.addEventListener("mouseup", () => {
            isMouseDown = false;
            isDeselecting = false;
        });
        $("#submit-response-button").hide();
    }

    // Click released OUTside cell: End selection
    document.addEventListener("mouseup", () => {
        isMouseDown = false;
        isDeselecting = false;
    });
});
