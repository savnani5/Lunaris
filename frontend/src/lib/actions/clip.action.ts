'use server'

import { revalidatePath } from "next/cache";
import { ClipModel } from '@/lib/database/models/clip.model';
import { getDbConnection, releaseConnection } from '@/lib/database/db.utils';
import { ObjectId } from 'mongodb';
import { handleError } from "@/lib/utils";

// CREATE
export async function createClip(clipData: Omit<ClipModel, '_id' | 'created_at'>) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const newClip = new ClipModel(
      new ObjectId().toString(),
      clipData.project_id,
      clipData.title,
      clipData.transcript,
      clipData.s3_uri,
      clipData.score,
      clipData.hook,
      clipData.flow,
      clipData.engagement,
      clipData.trend
    );

    const result = await db.collection('clip').insertOne({
      ...newClip.toObject(),
      _id: new ObjectId(newClip._id)
    });

    if (!result.insertedId) {
      throw new Error("Failed to create clip");
    }

    // Update project's clip_ids
    await db.collection('project').updateOne(
        { _id: new ObjectId(clipData.project_id) },
        { $push: { clip_ids: newClip._id } } as any
      );

    return JSON.parse(JSON.stringify(newClip));
  } catch (error) {
    handleError(error);
  } finally {
    await releaseConnection(connection);
  }
}

// READ
export async function getClipById(clipId: string) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const clip = await db.collection('clip').findOne({ _id: new ObjectId(clipId) });

    if (!clip) throw new Error("Clip not found");

    return JSON.parse(JSON.stringify(ClipModel.fromObject(clip)));
  } catch (error) {
    handleError(error);
  }
}

export async function getClipsByProjectId(projectId: string) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const clips = await db.collection('clip')
      .find({ project_id: projectId })
      .toArray();

    return JSON.parse(JSON.stringify(clips.map((clip: any) => ClipModel.fromObject(clip))));
  } catch (error) {
    handleError(error);
  }
}

// UPDATE
export async function updateClip(clipId: string, clipData: Partial<ClipModel>) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const updatedClip = await db.collection('clip').findOneAndUpdate(
      { _id: new ObjectId(clipId) },
      { $set: clipData },
      { returnDocument: 'after' }
    );

    if (!updatedClip?.value) throw new Error("Clip update failed");
    
    return JSON.parse(JSON.stringify(ClipModel.fromObject(updatedClip.value)));
  } catch (error) {
    handleError(error);
  }
}

// DELETE
export async function deleteClip(clipId: string) {
  const connection = await getDbConnection();
  try {
    const { db } = connection;

    const deletedClip = await db.collection('clip').findOneAndDelete({ _id: new ObjectId(clipId) });

    if (!deletedClip?.value) {
      throw new Error("Clip not found");
    }

    // Remove clip_id from project's clip_ids
    await db.collection('project').updateOne(
      { _id: new ObjectId(deletedClip.value.project_id) },
      { $pull: { clip_ids: clipId } } as any
    );

    revalidatePath("/");

    return JSON.parse(JSON.stringify(ClipModel.fromObject(deletedClip.value)));
  } catch (error) {
    handleError(error);
  }
}
