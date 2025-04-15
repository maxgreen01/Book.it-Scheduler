//Database seed
//Empties database collections and populates it.
import { faker } from "@faker-js/faker"
import {dbConnection, closeConnection} from '../config/mongoConnection.js';
import { createComment } from "../data/comments.js";
import { ObjectId } from "mongodb";


//empty database before anything gets done
const db = await dbConnection();
await db.dropDatabase();


async function seed () {

    const N_USR = 20    //create n users
    const N_COM = 25    //create n comments
    const N_MTG = 5     //create n meetings

    
    //random user generation logic
    //TODO: Add Schema params (...) for users & createUser function

    const uids = [];
    for (let i = 0; i < N_USR; i++) {

        /* replace this line with the below when createUser() is implemented */
        uids.push(faker.internet.username())    

    //   const user = await createUser(
    //     faker.internet.username(),
    //     // (...)
    //   );
    //   uids.push(user.uid);
    }


    //random comment generation logic. 
    const cids = [];
    for (let i = 0; i < N_COM; i++) {

        
        /* replace this line with the below when we have a createComment() */
        cids.push(new ObjectId());

    //   const uid = faker.helpers.arrayElement(uids);  //assign to random user
    //   const comment = await createComment(
    //     uid,
    //     faker.lorem.sentences({min: 2, max: 4})
    //   );
    //   cids.push(comment._id);
    }

    
    //random meeting generation. Users & Comments are inserted under meetings.
    //TODO: Add Schema params (...) for users & createMeeting function

    for (let i = 0; i < N_MTG; i++) {

        //randomly select users & comments for this meeting
        const meetingUsers = faker.helpers.arrayElements(uids, faker.number.int({ min: 1, max: 4 }));
        const meetingComments = faker.helpers.arrayElements(cids, faker.number.int({ min: 1, max: 5 })); 

        /* Uncomment the below when we have createMeeting() */

        // await createMeeting(
        //   // (...)
        // );
    }

    console.log("Seed Success")
}


try {
    await seed()
} catch (e) {
    console.error("Seed Failure: ", e.message)
} finally {closeConnection()}

