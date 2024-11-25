'use server'

import { revalidatePath } from "next/cache";
import { ProjectModel } from '@/lib/database/models/project.model';
import { connectToDatabase } from '@/lib/database/mongodb';
import { ObjectId } from 'mongodb';
import { handleError } from "@/lib/utils";
import { updateUserCredits } from './user.actions';

// CREATE
export async function createProject(projectData: Omit<ProjectModel, '_id' | 'created_at' | 'clip_ids' | 'transcript' | 'status' | 'progress'>) {
  try {
    const { db } = await connectToDatabase();

    const newProject = new ProjectModel(
      new ObjectId().toString(),
      projectData.clerk_user_id,
      projectData.youtube_video_url,
      projectData.title,
      projectData.thumbnail,
      [],
      null,
      'created',
      new Date(),
      projectData.processing_timeframe,
      projectData.video_quality,
      projectData.required_credits,
      0,
      '',
      projectData.videoDuration,
      projectData.project_type
    );

    const result = await db.collection('project').insertOne({
      ...newProject.toObject(),
      _id: new ObjectId(newProject._id)
    });

    if (!result.insertedId) {
      throw new Error("Failed to create project");
    }

    // Update user's project_ids
    await db.collection('user').updateOne(
      { clerk_id: projectData.clerk_user_id },
      { $push: { project_ids: newProject._id } } as any
    );

    return JSON.parse(JSON.stringify(newProject));
  } catch (error) {
    handleError(error);
  }
}

// READ
export async function getProjectById(projectId: string) {
  try {
    const { db } = await connectToDatabase();

    const project = await db.collection('project').findOne({ _id: new ObjectId(projectId) });

    if (!project) throw new Error("Project not found");

    return JSON.parse(JSON.stringify(ProjectModel.fromObject(project)));
  } catch (error) {
    handleError(error);
  }
}

export async function getProjectsByUserId(userId: string) {
  try {
    const { db } = await connectToDatabase();

    const projects = await db.collection('project')
      .find({ clerk_user_id: userId })
      .toArray();

    return JSON.parse(JSON.stringify(projects.map((project: any) => ProjectModel.fromObject(project))));
  } catch (error) {
    handleError(error);
  }
}

// UPDATE
export async function updateProject(projectId: string, projectData: Partial<ProjectModel>) {
  try {
    const { db } = await connectToDatabase();

    const updatedProject = await db.collection('project').findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      { $set: projectData },
      { returnDocument: 'after' }
    );

    if (!updatedProject?.value) throw new Error("Project update failed");
    
    return JSON.parse(JSON.stringify(ProjectModel.fromObject(updatedProject.value)));
  } catch (error) {
    handleError(error);
  }
}

// DELETE
export async function deleteProject(projectId: string) {
  try {
    const { db } = await connectToDatabase();

    const deletedProject = await db.collection('project').findOneAndDelete({ _id: new ObjectId(projectId) });

    if (!deletedProject?.value) {
      throw new Error("Project not found");
    }

    // Remove project_id from user's project_ids
    await db.collection('user').updateOne(
      { clerk_id: deletedProject.value.clerk_user_id },
      { $pull: { project_ids: projectId } } as any
    );

    revalidatePath("/");

    return JSON.parse(JSON.stringify(ProjectModel.fromObject(deletedProject.value)));
  } catch (error) {
    handleError(error);
  }
}

// Update PROJECT STATUS
export async function updateProjectStatus(projectId: string, status: string, stage: string, progress: number | null) {
  try {
    const { db } = await connectToDatabase();

    const updateData: { status: string; stage: string; progress?: number } = { status, stage };
    if (progress !== null) {
      updateData.progress = progress;
    }

    const project = await db.collection('project').findOne({ _id: new ObjectId(projectId) });

    if (!project) {
      throw new Error("Project not found");
    }

    const updatedProject = await db.collection('project').findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      { $set: updateData },
      { returnDocument: 'after' }
    );

    if (!updatedProject?.value) throw new Error("Project update failed");

    // If the project status is changing to 'failed', refund the credits
    if (status === 'failed' && project.status !== 'failed') {
      await updateUserCredits(project.clerk_user_id, project.required_credits);
    }
    
    return JSON.parse(JSON.stringify(ProjectModel.fromObject(updatedProject.value)));
  } catch (error) {
    console.error('Error updating project status:', error);
    return null; // Return null instead of throwing an error
  }
}

// UPDATE PROJECT CLIPS
export async function updateProjectClips(projectId: string, clipId: string, action: 'add' | 'remove') {
  try {
    const { db } = await connectToDatabase();

    const updateOperation = action === 'add'
      ? { $addToSet: { clip_ids: clipId } }
      : { $pull: { clip_ids: clipId } };

    const updatedProject = await db.collection('project').findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      updateOperation as any,
      { returnDocument: 'after' }
    );

    if (!updatedProject?.value) throw new Error(`Failed to ${action} clip ${action === 'add' ? 'to' : 'from'} project`);

    return JSON.parse(JSON.stringify(ProjectModel.fromObject(updatedProject.value)));
  } catch (error) {
    handleError(error);
  }
}

// New function to update project progress
export async function updateProjectProgress(projectId: string, progress: number) {
  try {
    const { db } = await connectToDatabase();

    const updatedProject = await db.collection('project').findOneAndUpdate(
      { _id: new ObjectId(projectId) },
      { $set: { progress: progress } },
      { returnDocument: 'after' }
    );

    if (!updatedProject?.value) throw new Error("Project progress update failed");
    
    return JSON.parse(JSON.stringify(ProjectModel.fromObject(updatedProject.value)));
  } catch (error) {
    handleError(error);
  }
}
