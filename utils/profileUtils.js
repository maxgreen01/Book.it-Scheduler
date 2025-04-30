// Utility functions relating to the User profile

import path from "node:path";
import fs from "node:fs/promises";
import { __rootdir } from "./routeUtils.js";
import { validateUserId, validateImageFileType } from "./validation.js";
import { getUserById } from "../data/users.js";

// directory where profile photos are stored
const imagesDir = path.join(__rootdir, "/public/images");

// name of default profile picture
export const defaultProfilePicture = "_default.jpg";

//
// ================= FUNCTIONS =================
//

// Update a user's profile picture by deleting the existing file and uploading a new one
// If successful, return the name of the newly uploaded file.
export async function updateProfilePicture(uid, pfpFile) {
    // get the stored data for this user
    const user = await getUserById(uid);

    // delete the existing profile picture (if it isn't the default)
    try {
        if (user.profilePicture !== defaultProfilePicture) {
            await fs.unlink(path.join(imagesDir, user.profilePicture));
        }
    } catch (err) {
        console.warn(`Error deleting old profile picture for user ${uid}: ${err.message}`);
    }

    // upload the new picture, and return its name
    return await uploadProfilePicture(uid, pfpFile);
}

// Upload a profile picture to the server's filesystem.
// If successful, return the name of the newly uploaded file.
export async function uploadProfilePicture(uid, pfpFile) {
    // rename the file
    uid = validateUserId(uid);
    const extension = validateImageFileType(pfpFile.name, "Profile Picture Name");
    const filename = `${uid}.${extension}`;

    // upload the file to the filesystem
    await pfpFile.mv(path.join(imagesDir, filename));

    // file successfully uploaded, so return its name
    return filename;
}
