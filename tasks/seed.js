// Database seeder, which empties all database collections and populates them with simulated data

import { faker } from "@faker-js/faker";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import bcrypt from "bcrypt";

import * as userFunctions from "../data/users.js";
import * as commentFunctions from "../data/comments.js";
import { WeeklyAvailability } from "../public/js/classes/availabilities.js";
import { createMeeting, getMeetingById, modifyNoteOfMeeting } from "../data/meetings.js";
import { ValidationError } from "../utils/validation.js";
import { Note } from "../public/js/classes/notes.js";

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
        const username = `${fname}${lname}${faker.number.int({ max: 1000 })}`.replaceAll(/[-']/g, ""); // remove special characters from username

        const randomSlotGenerator = () => {
            const slots = [];

            // First 18 elements: 20% probability (less probability for 12am-9am)
            for (let i = 0; i < 18; i++) {
                slots.push(Math.random() < 0.2 ? 1 : 0);
            }

            // Next 26 elements: 70% probability (more probability of being available 9am-10pm)
            for (let i = 0; i < 26; i++) {
                slots.push(Math.random() < 0.7 ? 1 : 0);
            }

            // Last 4 elements: 50% probability (50% probability of being available from 10pm onward)
            for (let i = 0; i < 4; i++) {
                slots.push(Math.random() < 0.5 ? 1 : 0);
            }

            return slots;
        };

        const generateWeeklyAvailability = () => {
            const weeklySlots = [];
            for (let i = 0; i < 7; i++) {
                weeklySlots.push(randomSlotGenerator());
            }
            return weeklySlots;
        };

        console.log(`Adding user ${i}: ${fname} ${lname}`);
        const user = await userFunctions.createUser({
            uid: username,
            password: await bcrypt.hash(faker.internet.password(), 10),
            firstName: fname,
            lastName: lname,
            description: faker.lorem.sentences({ min: 0, max: 2 }),
            profilePicture: `${username}.jpg`,
            availability: new WeeklyAvailability(generateWeeklyAvailability()),
        });
        userIds.push(user._id);
    }

    // random meeting generation
    const meetingIds = [];
    for (let i = 0; i < N_MTG; i++) {
        // randomly select users for this meeting
        const meetingUsers = faker.helpers.arrayElements(userIds, faker.number.int({ min: 1, max: 4 }));

        const changeDateToStart = (date) => {
            if (!(date instanceof Date)) {
                throw new ValidationError(`Date ${date} is not a valid date object!`);
            }
            return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0);
        };

        const randomDate = changeDateToStart(faker.date.future());
        let meetingDates = [];

        const meetingLengthDays = faker.number.int({ min: 1, max: 7 });
        for (let i = 0; i < meetingLengthDays; i++) {
            let dateToAdd = new Date(randomDate);
            dateToAdd.setDate(dateToAdd.getDate() + i);
            meetingDates.push(dateToAdd);
        }

        const meetingStart = faker.number.int({ min: 1, max: 40 });
        const meetingEnd = faker.number.int({ min: meetingStart, max: 42 });

        const newMeeting = {
            name: faker.lorem.words(faker.number.int({ min: 1, max: 4 })),
            description: faker.lorem.sentences(faker.number.int({ min: 1, max: 6 })),
            duration: faker.number.int({ min: 1, max: 20 }),
            owner: faker.helpers.arrayElement(meetingUsers),
            dates: meetingDates,
            timeStart: meetingStart,
            timeEnd: meetingEnd,
            users: meetingUsers,
        };

        const addedMeeting = await createMeeting(newMeeting);

        for (let user of meetingUsers) {
            const newNote = new Note(user, faker.lorem.sentences(faker.number.int({ min: 3, max: 10 })));
            await modifyNoteOfMeeting(addedMeeting._id, newNote);
        }
        // Uncomment the below when we have createMeeting()

        console.log(`Adding meeting #${i}: ${addedMeeting.name}`);
        meetingIds.push(addedMeeting._id);

        // const meeting = await meetingFuncs.createMeeting(
        //     // (...)
        // );

        // meetingIds.push(meeting._id);
        // todo - add random user responses to the meetings
        //        this should simultaneously fill the users' profile with the corresponding meeting IDs,
        //        which can be done using `modifyUserMeeting()` in `/data/users.js`
    }

    // random comment generation
    const commentIds = [];
    for (let i = 0; i < N_COM; i++) {
        // randomly select a user and meeting for this comment
        const meeting = faker.helpers.arrayElement(meetingIds);
        let meetingUser = await getMeetingById(meeting);
        meetingUser = meetingUser.users;
        meetingUser = faker.helpers.arrayElement(meetingUser);

        const comment = await commentFunctions.createComment({
            uid: meetingUser,
            meetingId: meeting,
            body: faker.lorem.sentences({ min: 2, max: 4 }),
        });

        // lambda to show only a short bit of the comment
        const preview = (str) => (str.length > 40 ? str.slice(0, 30) + "..." : str);

        console.log(`Adding Comment ${i}: ${preview(comment.body)}`);
        commentIds.push(comment._id);
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
