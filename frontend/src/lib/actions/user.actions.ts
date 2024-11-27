'use server'

import { revalidatePath } from "next/cache";
import { UserModel } from '@/lib/database/models/user.model';
import { handleError } from "@/lib/utils";
import { getDbConnection, releaseConnection } from '@/lib/database/db.utils';

// CREATE
export async function createUser(userData: {
  clerk_id: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    // console.log('Checking for existing user:', userData.clerk_id);

    const existingUser = await db.collection('user').findOne({ 
      clerk_id: userData.clerk_id 
    });

    if (existingUser) {
      console.log('User already exists, returning existing user');
      return UserModel.fromObject(existingUser);
    }

    console.log('Creating new user');

    const newUser = new UserModel(
      userData.clerk_id,
      userData.email,
      userData.firstName,
      userData.lastName,
      Number(process.env.INITIAL_CREDITS),
      [],
      new Date(),
    );

    const result = await db.collection('user').insertOne(newUser.toObject());

    if (!result.insertedId) {
      throw new Error("Failed to create user");
    }

    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
  } finally {
    await releaseConnection(connection);
  }
}

// READ
export async function getUserById(userId: string) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const user = await db.collection('user').findOne({ clerk_id: userId });

    if (!user) throw new Error("User not found");

    return JSON.parse(JSON.stringify(UserModel.fromObject(user)));
  } catch (error) {
    handleError(error);
  } finally {
    await releaseConnection(connection);
  }
}

// UPDATE
export async function updateUser(userId: string, userData: Partial<UserModel>) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    // First, check if the user exists
    const existingUser = await db.collection('user').findOne({ clerk_id: userId });

    if (!existingUser) {
      // console.log(`User with clerk_id ${userId} not found. Creating new user.`);
      console.log(`User not found. Creating new user.`);
      const newUser = new UserModel(
        userId,
        userData.email || '',
        userData.firstName || '',
        userData.lastName || '',
        Number(process.env.INITIAL_CREDITS),
        [],
        new Date()
      );
      const result = await db.collection('user').insertOne(newUser.toObject());
      if (!result.insertedId) {
        throw new Error("Failed to create user during update");
      }
      return JSON.parse(JSON.stringify(newUser));
    }

    // If user exists, update the user
    const updatedUser = await db.collection('user').findOneAndUpdate(
      { clerk_id: userId },
      { $set: userData },
      { returnDocument: 'after' }
    );

    if (!updatedUser?.value) throw new Error("User update failed");
    
    return JSON.parse(JSON.stringify(UserModel.fromObject(updatedUser.value)));
  } catch (error) {
    console.error("Error in updateUser:", error);
    return null; // Return null instead of throwing an error
  } finally {
    await releaseConnection(connection);
  }
}

// DELETE
export async function deleteUser(userId: string) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const deletedUser = await db.collection('user').findOneAndDelete({ clerk_id: userId });

    if (!deletedUser?.value) {
      // console.log(`User with clerk_id ${userId} not found in the database.`);
      console.log(`User not found in the database.`);
      return null; // Return null instead of throwing an error
    }

    revalidatePath("/");

    return JSON.parse(JSON.stringify(UserModel.fromObject(deletedUser.value)));
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return null; // Return null in case of any other errors
  } finally {
    await releaseConnection(connection);
  }
}

// UPDATE PROJECTS
export async function updateUserProjects(userId: string, projectId: string, action: 'add' | 'remove') {
  console.log(`Attempting to update projects. Action: ${action}`);
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    // First, check if the user exists
    const existingUser = await db.collection('user').findOne({ clerk_id: userId });
    if (!existingUser) {
      // console.error(`User with clerk_id ${userId} not found in the database.`);
      console.error(`User not found in the database.`);
      return null;
    }

    const updateOperation = action === 'add'
      ? { $addToSet: { project_ids: projectId } }
      : { $push: { project_ids: projectId } };

    const updatedUser = await db.collection('user').findOneAndUpdate(
      { clerk_id: userId },
      updateOperation as any,
      { returnDocument: 'after' }
    );

    if (!updatedUser?.value) {
      // console.error(`User with clerk_id ${userId} found but update failed.`);
      console.error(`User update failed.`);
      return null;
    }

    console.log(`Successfully updated projects`);
    return JSON.parse(JSON.stringify(UserModel.fromObject(updatedUser.value)));
  } catch (error) {
    console.error("Error in updateUserProjects:", error);
    return null;
  } finally {
    await releaseConnection(connection);
  }
}


// UPDATE USER PLAN FIELDS
export async function updateUserPlanFields(userId: string, planData: {
  planType: string | null;
  billingCycle: string | null;
  isSubscribed: boolean;
  planCredits: number;
  nextRenewalDate: Date | null;
  subscriptionId: string | null;
}) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const updateOperation = {
          $set: {
            planType: planData.planType,
            billingCycle: planData.billingCycle,
            isSubscribed: planData.isSubscribed,
            planCredits: planData.planCredits,
            nextRenewalDate: planData.nextRenewalDate,
            subscriptionId: planData.subscriptionId,
      }
    };

    const updatedUser = await db.collection('user').findOneAndUpdate(
      { clerk_id: userId },
      updateOperation,
      { returnDocument: 'after' }
    );

    if (!updatedUser?.value) throw new Error("User plan fields update failed");
    
    return JSON.parse(JSON.stringify(UserModel.fromObject(updatedUser.value)));
  } catch (error) {
    console.error("Error in updateUserPlanFields:", error);
    return null;
  } finally {
    await releaseConnection(connection);
  }
}

// UPDATE USER CREDITS FROM PLAN
export async function updateUserCredits(userId: string, planCredits: number) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    // console.log(`Attempting to update credits for user ${userId} by ${planCredits}`);

    const result = await db.collection('user').findOneAndUpdate(
      { clerk_id: userId },
      { $inc: { credits: planCredits }},
      { returnDocument: 'after' }
    );

    if (!result) {
      console.warn(`User credits update failed for user ${userId}. User not found or update failed.`);
      return null;
    }

    console.log(`Successfully updated credits. New balance: ${result.credits}`);
    return JSON.parse(JSON.stringify(UserModel.fromObject(result)));
  } catch (error) {
    console.error(`Error in updateUserCreditsFromPlan:`, error);
    return null;
  } finally {
    await releaseConnection(connection);
  }
}