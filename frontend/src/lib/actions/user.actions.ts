'use server'

import { revalidatePath } from "next/cache";
import { UserModel } from '@/lib/database/models/user.model';
import { connectToDatabase } from '@/lib/database/mongodb';
import { INITIAL_CREDITS } from '../constants';
import { handleError } from "@/lib/utils";

// CREATE
export async function createUser(userData: {
  clerk_id: string;
  email: string;
  firstName: string;
  lastName: string;
}) {
  try {
    const { db } = await connectToDatabase();

    const existingUser = await db.collection('user').findOne({ clerk_id: userData.clerk_id });

    if (existingUser) {
      return UserModel.fromObject(existingUser);
    }

    const newUser = new UserModel(
      userData.clerk_id,
      userData.email,
      userData.firstName,
      userData.lastName,
      INITIAL_CREDITS,
      [],
      new Date()
    );
    const result = await db.collection('user').insertOne(newUser.toObject());

    if (!result.insertedId) {
      throw new Error("Failed to create user");
    }

    return JSON.parse(JSON.stringify(newUser));
  } catch (error) {
    handleError(error);
  }
}

// READ
export async function getUserById(userId: string) {
  try {
    const { db } = await connectToDatabase();

    const user = await db.collection('user').findOne({ clerk_id: userId });

    if (!user) throw new Error("User not found");

    return JSON.parse(JSON.stringify(UserModel.fromObject(user)));
  } catch (error) {
    handleError(error);
  }
}

// UPDATE
export async function updateUser(userId: string, userData: Partial<UserModel>) {
  try {
    const { db } = await connectToDatabase();

    // First, check if the user exists
    const existingUser = await db.collection('user').findOne({ clerk_id: userId });

    if (!existingUser) {
      console.log(`User with clerk_id ${userId} not found. Creating new user.`);
      // If user doesn't exist, create a new one
      const newUser = new UserModel(
        userId,
        userData.email || '',
        userData.firstName || '',
        userData.lastName || '',
        INITIAL_CREDITS,
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
  }
}

// DELETE
export async function deleteUser(userId: string) {
  try {
    const { db } = await connectToDatabase();

    const deletedUser = await db.collection('user').findOneAndDelete({ clerk_id: userId });

    if (!deletedUser?.value) {
      console.log(`User with clerk_id ${userId} not found in the database.`);
      return null; // Return null instead of throwing an error
    }

    revalidatePath("/");

    return JSON.parse(JSON.stringify(UserModel.fromObject(deletedUser.value)));
  } catch (error) {
    console.error("Error in deleteUser:", error);
    return null; // Return null in case of any other errors
  }
}

// UPDATE PROJECTS
export async function updateUserProjects(userId: string, projectId: string, action: 'add' | 'remove') {
  console.log(`Attempting to update projects for user: ${userId}, project: ${projectId}, action: ${action}`);
  try {
    const { db } = await connectToDatabase();

    // First, check if the user exists
    const existingUser = await db.collection('user').findOne({ clerk_id: userId });
    if (!existingUser) {
      console.error(`User with clerk_id ${userId} not found in the database.`);
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
      console.error(`User with clerk_id ${userId} found but update failed.`);
      return null;
    }

    console.log(`Successfully updated projects for user: ${userId}`);
    return JSON.parse(JSON.stringify(UserModel.fromObject(updatedUser.value)));
  } catch (error) {
    console.error("Error in updateUserProjects:", error);
    return null;
  }
}

// UPDATE CREDITS
export async function updateUserCredits(userId: string, creditChange: number) {
  try {
    const { db } = await connectToDatabase();

    console.log(`Attempting to update credits for user ${userId} by ${creditChange}`);

    const result = await db.collection('user').findOneAndUpdate(
      { clerk_id: userId },
      { $inc: { credits: creditChange }},
      { new: true }
    );

    if (!result) {
      console.warn(`User credits update failed for user ${userId}. User not found or update failed.`);
      return null;
    }

    console.log(`Successfully updated credits for user ${userId}. New credit balance: ${result.credits}`);
    return JSON.parse(JSON.stringify(UserModel.fromObject(result)));
  } catch (error) {
    console.error(`Error in updateUserCredits for user ${userId}:`, error);
    return null;
  }
}
