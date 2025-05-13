// Utility functions relating to the User profile

import path from "node:path";
import fs from "node:fs/promises";
import { __rootdir } from "./routeUtils.js";
import { validateUserId, validateImageFileType } from "./validation.js";
import { getUserById } from "../data/users.js";

// relative path where profile photos are stored
const imagesPath = "/public/images";

// actual (absolute) directory path where profile photos are stored
const __imagesDir = path.join(__rootdir, imagesPath);

// name of default profile picture
export const defaultProfilePicture = "_default.jpg";

//
// ================= FUNCTIONS =================
//

// prepend the `imagesDir` to a profile picture's filename to prepare it for rendering
export function profilePictureToPath(profilePicture) {
    return path.join(imagesPath, profilePicture);
}

// Update a user's profile picture by deleting the existing file and uploading a new one
// If successful, return the name of the newly uploaded file.
export async function updateProfilePicture(uid, pfpFile) {
    // delete the existing profile picture (if it isn't the default)
    await deleteProfilePicture(uid);

    // upload the new picture, and return its name
    return await uploadProfilePicture(uid, pfpFile);
}

export async function deleteProfilePicture(uid) {
    // get the stored data for this user
    const user = await getUserById(uid);
    try {
        if (user.profilePicture !== defaultProfilePicture) {
            await fs.unlink(path.join(__imagesDir, user.profilePicture));
        }
    } catch (err) {
        console.warn(`Error deleting old profile picture for user ${uid}: ${err.message}`);
    }
}

// Upload a profile picture to the server's filesystem.
// If successful, return the name of the newly uploaded file.
export async function uploadProfilePicture(uid, pfpFile) {
    // rename the file
    uid = validateUserId(uid);
    const extension = validateImageFileType(pfpFile.name, "Profile Picture Name");
    const filename = `${uid}.${extension}`;

    // upload the file to the filesystem
    await pfpFile.mv(path.join(__imagesDir, filename));

    // file successfully uploaded, so return its name
    return filename;
}
