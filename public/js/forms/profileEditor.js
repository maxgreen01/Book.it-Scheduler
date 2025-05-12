function toggleEditor(num) {
    let info = document.getElementById("info");
    let editor = document.getElementById("editor");
    let deleter = document.getElementById("deleter");
    info.hidden = num != 0;
    editor.hidden = num != 1;
    deleter.hidden = num != 2;
}

async function deleteUser() {
    await fetch("/profile", { method: "DELETE" });
    window.location.reload();
}

document.getElementById("editProfile").addEventListener("click", () => toggleEditor(1));
document.getElementById("cancelEdit").addEventListener("click", () => toggleEditor(0));
document.getElementById("deleteUser").addEventListener("click", () => toggleEditor(2));
document.getElementById("confirmDelete").addEventListener("click", deleteUser);
document.getElementById("cancelDelete").addEventListener("click", () => toggleEditor(1));
