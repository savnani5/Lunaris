/* eslint-disable camelcase */
import { clerkClient, WebhookEvent } from '@clerk/nextjs/server';
import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook } from "svix";

import { createUser, deleteUser, updateUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  // Add debug logging
  console.log('Webhook received');
  
  const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;

  if (!WEBHOOK_SECRET) {
    console.error('Missing WEBHOOK_SECRET');
    return new Response("Missing WEBHOOK_SECRET", {
      status: 500,
    });
  }

  // Get the headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  // If there are no headers, error out
  if (!svix_id || !svix_timestamp || !svix_signature) {
    console.error('Missing svix headers');
    return new Response("Error occurred -- no svix headers", {
      status: 400,
    });
  }

  // Get the body
  const payload = await req.json();
  const body = JSON.stringify(payload);


  // Create a new Svix instance with your secret.
  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;

  // Verify the payload with the headers
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Error occured", {
      status: 400,
    });
  }

  // Get the ID and type
  const { id } = evt.data;
  const eventType = evt.type;

  // CREATE
  if (eventType === "user.created") {
    try {
      const { 
        id, 
        email_addresses, 
        first_name, 
        last_name, 
        unsafe_metadata 
      } = evt.data;

      const userData = {
        clerk_id: id,
        email: email_addresses[0].email_address,
        firstName: first_name ?? '',
        lastName: last_name ?? '',
        referredBy: unsafe_metadata?.referralSource?.toString() || undefined
      };

      const newUser = await createUser(userData);

      if (!newUser) {
        console.error('Failed to create user in database');
        return NextResponse.json({ 
          message: "Failed to create user", 
          success: false 
        }, { status: 500 });
      }

      // Set public metadata
      try {
        await clerkClient.users.updateUserMetadata(id, {
          publicMetadata: {
            userId: newUser._id,
          },
        });
      } catch (metadataError) {
        // Log but don't fail the whole operation
        console.log("Clerk metadata update failed - this is non-critical");
      }

      return NextResponse.json({ 
        message: "User created successfully", 
        user: newUser,
        success: true 
      });
    } catch (error) {
      console.error('Error in user.created webhook:', error);
      return NextResponse.json({ 
        message: "Internal server error", 
        success: false 
      }, { status: 500 });
    }
  }

  // UPDATE
  if (eventType === "user.updated") {
    const { id, email_addresses, first_name, last_name, created_at } = evt.data;
    const updateTimestamp = new Date().getTime();
    const createTimestamp = new Date(created_at).getTime();
    const isPostCreateUpdate = updateTimestamp - createTimestamp < 5000; // within 5 seconds

    const user = {
      clerk_id: id,
      email: email_addresses[0]?.email_address,
      firstName: first_name || '',
      lastName: last_name || ''
    };

    try {
      const updatedUser = await updateUser(id, user);
      return NextResponse.json({ message: "OK", user: updatedUser });
    } catch (error) {
      if (isPostCreateUpdate) {
        console.log("User update skipped - post-creation event");
        return NextResponse.json({ message: "OK" });
      }
      
      console.error("Error updating user:", error);
      return NextResponse.json({ 
        message: "Failed to update user", 
        success: false 
      }, { status: 500 });
    }
  }

  // DELETE
  if (eventType === "user.deleted") {
    const { id } = evt.data;

    const deletedUser = await deleteUser(id!);

    return NextResponse.json({ message: "OK", user: deletedUser });
  }

  // console.log(`Webhook with and ID of ${id} and type of ${eventType}`);
  console.log("Webhook received");

  return new Response("", { status: 200 });
}