"use server";

import { connectToDatabase } from '../database/mongodb';
import { TransactionModel } from '../database/models/transaction.model';
import { ObjectId } from 'mongodb';


declare type CreateTransactionParams = {
    stripeId: string;
    amount: number;
    credits: number;
    planType: string;
    billingCycle: string;
    userId: string;
    createdAt: Date;
    type: string;
};


export async function createTransaction(transaction: CreateTransactionParams) {
  try {
    const { db } = await connectToDatabase();

    const newTransaction = new TransactionModel(
      new ObjectId().toString(),
      transaction.stripeId,
      transaction.amount,
      transaction.planType,
      transaction.billingCycle,
      transaction.credits,
      transaction.userId,
      new Date(),
      transaction.type
    );

    const result = await db.collection('transaction').insertOne({
      ...newTransaction.toObject(),
      _id: new ObjectId(newTransaction._id)
    });

    if (!result.insertedId) {
      throw new Error("Failed to create transaction");
    }

    return { transaction: JSON.parse(JSON.stringify(newTransaction)) };
  } catch (error) {
    console.error('Error in createTransaction:', error);
    return { transaction: null };
  }
}
