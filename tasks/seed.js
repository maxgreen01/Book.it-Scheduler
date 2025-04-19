// Database seeder, which empties all database collections and populates them with simulated data

import { faker } from "@faker-js/faker";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import bcrypt from "bcrypt";

// import { createComment } from "../data/comments.js";
import * as userFunctions from "../data/users.js";

// define the seed procedure, which is called below
async function seed() {
    const N_USR = 10; // create n users
    const N_COM = 25; // create n comments
    const N_MTG = 5; // create n meetings

    // random user generation
    const userIds = [];
    for (let i = 0; i < N_USR; i++) {
        const fname = faker.person.firstName();
        const lname = faker.person.lastName();
        const username = `${fname}${lname}${faker.number.int({ max: 1000 })}`;

        console.log(`Adding user ${i}: ${fname} ${lname}`);
        const user = await userFunctions.createUser({
            uid: username,
            password: await bcrypt.hash(faker.internet.password(), 10),
            firstName: fname,
            lastName: lname,
            description: faker.lorem.sentences({ min: 0, max: 2 }),
            profilePicture: `/public/images/${username}.jpg`,
            availability: [0, 0, 0, 0, 0, 0, 0], // todo add random Timeslot objects
        });
        userIds.push(user._id);
    }
    console.log(userIds);

    //

    // random meeting generation
    const meetingIds = [];
    for (let i = 0; i < N_MTG; i++) {
        // randomly select users for this meeting
        const meetingUsers = faker.helpers.arrayElements(userIds, faker.number.int({ min: 1, max: 4 }));

        // Uncomment the below when we have createMeeting()
        // console.log(`Adding comment ${i}`);
        // const meeting = await createMeeting(
        //     // (...)
        // );

        // meetingIds.push(meeting._id);
        // todo - add random user responses to the meetings
        //        this should simultaneously fill the users' profile with the corresponding meeting IDs,
        //        which can be done using `modifyUserMeeting()` in `/data/users.js`
    }

    //

    // random comment generation
    const commentIds = [];
    for (let i = 0; i < N_COM; i++) {
        // randomly select a user and meeting for this comment
        const uid = faker.helpers.arrayElement(userIds);
        // const meeting = faker.helpers.arrayElement(meetingIds);

        // Uncomment the below when we have createComment()
        // const comment = await createComment(
        //     uid,
        //     faker.lorem.sentences({min: 2, max: 4})
        // );
        // commentIds.push(comment._id);
    }

    console.log("Finished seeding the database!");
}

// actually run the seed procedure
try {
    // empty the database each time this is run
    const db = await dbConnection();
    await db.dropDatabase();

    await seed();
} catch (err) {
    console.error("Seed Failure!");
    console.error(err);
} finally {
    await closeConnection();
}
