"use server";

import { redirect } from 'next/navigation'
import Stripe from "stripe";
import { connectToDatabase } from '../database/mongodb';
import { TransactionModel } from '../database/models/transaction.model';
import { updateUserCredits } from './user.actions';
import { ObjectId } from 'mongodb';

declare type CheckoutTransactionParams = {
    plan: string;
    credits: number;
    amount: number;
    userId: string; // Changed from buyerId to userId
  };
  
  declare type CreateTransactionParams = {
    stripeId: string;
    amount: number;
    credits: number;
    plan: string;
    userId: string; // Changed from buyerId to userId
    createdAt: Date;
  };


export async function checkoutCredits(transaction: CheckoutTransactionParams) {
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const amount = Number(transaction.amount) * 100;

  const session = await stripe.checkout.sessions.create({
    line_items: [
      {
        price_data: {
          currency: 'usd',
          unit_amount: amount,
          product_data: {
            name: transaction.plan,
          }
        },
        quantity: 1
      }
    ],
    metadata: {
      plan: transaction.plan,
      credits: transaction.credits,
      userId: transaction.userId, // Changed from buyerId to userId
    },
    mode: 'payment',
    success_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/home`,
    cancel_url: `${process.env.NEXT_PUBLIC_SERVER_URL}/home`,
  })

  redirect(session.url!)
}

export async function createTransaction(transaction: CreateTransactionParams) {
  try {
    const { db } = await connectToDatabase();

    const newTransaction = new TransactionModel(
      new ObjectId().toString(),
      transaction.stripeId,
      transaction.amount,
      transaction.plan,
      transaction.credits,
      transaction.userId
    );

    const result = await db.collection('transaction').insertOne({
      ...newTransaction.toObject(),
      _id: new ObjectId(newTransaction._id)
    });

    if (!result.insertedId) {
      throw new Error("Failed to create transaction");
    }

    // Update user credits and return the updated user
    const updatedUser = await updateUserCredits(transaction.userId, transaction.credits);

    if (!updatedUser) {
      console.warn("User credits update didn't return an updated user, but it might have succeeded.");
    }

    return {
      transaction: JSON.parse(JSON.stringify(newTransaction)),
      user: updatedUser || null
    };
  } catch (error) {
    console.error('Error in createTransaction:', error);
    return { transaction: null, user: null };
  }
}