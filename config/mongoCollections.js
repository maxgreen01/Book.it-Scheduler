import { dbConnection } from "./mongoConnection.js";

/* This will allow you to have one reference to each collection per app */
/* Feel free to copy and paste this this */
const getCollectionFn = (collection) => {
    let _col = undefined;

    return async () => {
        if (!_col) {
            const db = await dbConnection();
            _col = await db.collection(collection);
        }

        return _col;
    };
};

// export used collections
export const meetingsCollection = getCollectionFn("meetings");
export const commentsCollection = getCollectionFn("comments");
export const usersCollection = getCollectionFn("users");
