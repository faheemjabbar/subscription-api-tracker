import Subscription from '../models/subscription.model.js'
import { workflowClient } from '../config/upstash.js'
import { SERVER_URL } from '../config/env.js'

export const createSubscription = async (req, res, next) => {
  try {
    const subscription = await Subscription.create({
      ...req.body,
      user: req.user._id,
    });

    // Try to trigger workflow, but don't fail if it doesn't work
    let workflowRunId = null;
    try {
      const result = await workflowClient.trigger({
        url: `${SERVER_URL}/api/v1/workflows/subscription/reminder`,
        body: {
          subscriptionId: subscription._id.toString(),
        },
        headers: {
          'content-type': 'application/json',
        },
        retries: 0,
      });
      workflowRunId = result.workflowRunId;
      console.log('✅ Workflow triggered successfully:', workflowRunId);
    } catch (workflowError) {
      console.error('⚠️  Workflow trigger failed (subscription still created):', workflowError.message);
      // Don't throw - subscription is still created successfully
    }

    res.status(201).json({ 
      success: true, 
      data: { 
        subscription, 
        workflowRunId,
        workflowStatus: workflowRunId ? 'scheduled' : 'not_scheduled'
      } 
    });
  } catch (e) {
    next(e);
  }
}

export const getUserSubscriptions = async (req, res, next) => {
  try {
    // Check if the user is the same as the one in the token
    if(req.user._id.toString() !== req.params.id) {
      const error = new Error('You are not authorized to view these subscriptions');
      error.statusCode = 403;
      throw error;
    }

    const subscriptions = await Subscription.find({ user: req.params.id });

    res.status(200).json({ success: true, data: subscriptions });
  } catch (e) {
    next(e);
  }
}