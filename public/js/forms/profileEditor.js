function toggleEditor() {
    let info = document.getElementById("info");
    let editor = document.getElementById("editor");
    info.hidden = !info.hidden;
    editor.hidden = !editor.hidden;
}

document.getElementById("editProfile").addEventListener("click", toggleEditor);
document.getElementById("cancelEdit").addEventListener("click", toggleEditor);
