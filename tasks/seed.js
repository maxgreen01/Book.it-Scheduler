// Database seeder, which empties all database collections and populates them with simulated data

import { faker } from "@faker-js/faker";
import { dbConnection, closeConnection } from "../config/mongoConnection.js";
import { createUser } from "../data/users.js";
import { createComment } from "../data/comments.js";
import { Availability, WeeklyAvailability } from "../public/js/classes/availabilities.js";
import { addResponseToMeeting, createMeeting, getMeetingById, updateMeetingNote } from "../data/meetings.js";
import { Response } from "../public/js/classes/responses.js";
import { formatDateAsString } from "../public/js/helpers.js";

// define the seed procedure, which is called below
async function seed() {
    //todo change nuser back when done testing
    const N_USR = 4; // create n users
    const N_COM = 25; // create n comments
    const N_MTG = 15; // create n meetings

    // random user generation
    console.log(`\nGenerating ${N_USR} users...`);
    const userIds = [];
    for (let i = 0; i < N_USR; i++) {
        const fname = faker.person.firstName();
        const lname = faker.person.lastName();
        let username = `${fname}${lname}${faker.number.int({ max: 1000 })}`.replaceAll(/[-']/g, ""); // remove special characters from username

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

        console.log(`Adding user #${i}: ${fname} ${lname}`);
        if (i == 0) {
            const brendan = await createUser({
                uid: "Brendan123",
                password: "Brendan123!",
                firstName: "Brendan",
                lastName: "Lee",
                description: faker.lorem.sentences({ min: 0, max: 2 }),
                profilePicture: "_default.jpg",
                availability: new WeeklyAvailability(generateWeeklyAvailability()),
            });
            userIds.push("Brendan123");
            console.log("Brendan Added");
        }

        const user = await createUser({
            uid: username,
            //FIXME: Test Password so I can login and check comments
            password: "TestPass2!",
            firstName: fname,
            lastName: lname,
            description: faker.lorem.sentences({ min: 0, max: 2 }),
            profilePicture: "_default.jpg",
            availability: new WeeklyAvailability(generateWeeklyAvailability()),
        });
        userIds.push(user._id);
    }

    // random meeting generation
    console.log(`\nGenerating ${N_MTG} meetings...`);
    const meetingIds = [];
    for (let i = 0; i < N_MTG; i++) {
        // randomly select users to be involved in this meeting
        const meetingUsers = faker.helpers.arrayElements(userIds, faker.number.int({ min: 1, max: 4 }));

        const startDate = formatDateAsString(faker.date.soon({ days: 60 }));
        const endDate = formatDateAsString(faker.date.soon({ days: 10, refDate: startDate }));

        const duration = faker.number.int({ min: 1, max: 6 }); // stored as 30-min intervals

        const meetingStart = faker.number.int({ min: 1, max: 40 });
        const meetingEnd = faker.number.int({ min: meetingStart + duration, max: Math.min(48, meetingStart + duration + 10) });

        //todo: uncomment when done testing dashboard --bl
        const newMeeting = {
            name: faker.lorem.words(faker.number.int({ min: 1, max: 4 })),
            description: faker.lorem.sentences(faker.number.int({ min: 1, max: 6 })),
            duration: (duration / 2).toString(), // convert to a string input in hours
            owner: faker.helpers.arrayElement(meetingUsers),
            dateStart: startDate,
            dateEnd: endDate,
            timeStart: meetingStart.toString(),
            timeEnd: meetingEnd.toString(),
        };

        console.log(`Adding meeting #${i}: ${newMeeting.name}`);
        const addedMeeting = await createMeeting(newMeeting);
        meetingIds.push(addedMeeting._id);

        const randomSlotGenerator = () => {
            const slots = new Array(48).fill(0);
            for (let i = meetingStart; i <= meetingEnd; i++) {
                //80% of being available
                slots[i] = Math.random() < 0.8 ? 1 : 0;
            }

            return slots;
        };

        for (const user of meetingUsers) {
            let arrOfAvailability = [];
            for (const date of addedMeeting.dates) {
                const newAvailability = new Availability(randomSlotGenerator(), date);
                arrOfAvailability.push(newAvailability);
            }
            const response = new Response(user, arrOfAvailability);
            await addResponseToMeeting(addedMeeting._id, response);

            // for about half of the involved users, add a private comment
            if (Math.random() > 0.5) {
                const note = faker.lorem.sentences(faker.number.int({ min: 3, max: 10 }));
                await updateMeetingNote(addedMeeting._id, user, note);
            }
        }
    }

    // random comment generation
    console.log(`\nGenerating ${N_COM} comments...`);
    const commentIds = [];
    for (let i = 0; i < N_COM; i++) {
        // randomly select a user and meeting for this comment
        const meetingId = faker.helpers.arrayElement(meetingIds);
        const meeting = await getMeetingById(meetingId);
        const allMeetingMembers = meeting.users;
        allMeetingMembers.push(meeting.owner);
        const userId = faker.helpers.arrayElement(allMeetingMembers);

        const comment = await createComment({
            uid: userId,
            meetingId: meetingId,
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
