/**
 * update-profile — TokaiHub Lambda
 *
 * Updates a student's profile fields in tokaihub-users.
 * Handles: enrolled course IDs, cumulative GPA, last semester GPA.
 *
 * ─── Setup in Lambda Console ──────────────────────────────────────────────────
 *  Runtime : Node.js 22.x
 *  Handler : update-profile.handler
 *  Method  : PUT  /profile
 *  Auth    : JWT Authorizer (Cognito User Pool) — add in API Gateway
 *
 * ─── Required Environment Variable ───────────────────────────────────────────
 *  USERS_TABLE  →  tokaihub-users   (set in Lambda Configuration → Environment variables)
 *
 * ─── Required IAM Permission (add to Lambda execution role) ──────────────────
 *  dynamodb:UpdateItem  on  arn:aws:dynamodb:ap-northeast-1:*:table/tokaihub-users
 *
 * ─── Request Body (JSON) ─────────────────────────────────────────────────────
 *  {
 *    "selectedCourseIds": ["TTK085", "TTT032"],   // course codes, not local IDs
 *    "cumulativeGpa": 3.66,
 *    "lastSemGpa": 3.73
 *  }
 *  All fields are optional — only provided fields are updated.
 *
 * ─── Response ────────────────────────────────────────────────────────────────
 *  200  { "success": true,  "profile": { ...updatedAttributes } }
 *  400  { "error": "No fields to update" | "Invalid JSON body" | "Validation error" }
 *  401  { "error": "Unauthorized" }
 *  500  { "error": "Internal server error" }
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamo = DynamoDBDocumentClient.from(
  new DynamoDBClient({ region: process.env.AWS_REGION ?? 'ap-northeast-1' })
);

const USERS_TABLE = process.env.USERS_TABLE ?? 'tokaihub-users';

const CORS_HEADERS = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'PUT,OPTIONS',
};

function respond(statusCode, body) {
  return { statusCode, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

export const handler = async (event) => {
  // ── CORS preflight ────────────────────────────────────────────────────────
  if (event.requestContext?.http?.method === 'OPTIONS') {
    return respond(200, {});
  }

  // ── Auth: extract userId from Cognito JWT sub claim ───────────────────────
  const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
  if (!userId) {
    return respond(401, { error: 'Unauthorized' });
  }

  // ── Parse body ────────────────────────────────────────────────────────────
  let body;
  try {
    body = JSON.parse(event.body ?? '{}');
  } catch {
    return respond(400, { error: 'Invalid JSON body' });
  }

  const { selectedCourseIds, cumulativeGpa, lastSemGpa } = body;

  // ── Validate ──────────────────────────────────────────────────────────────
  if (selectedCourseIds !== undefined) {
    if (!Array.isArray(selectedCourseIds) || selectedCourseIds.some(id => typeof id !== 'string')) {
      return respond(400, { error: 'selectedCourseIds must be an array of strings' });
    }
  }

  const isValidGpa = (v) => v === undefined || (typeof v === 'number' && v >= 0 && v <= 4);
  if (!isValidGpa(cumulativeGpa) || !isValidGpa(lastSemGpa)) {
    return respond(400, { error: 'GPA values must be numbers between 0 and 4' });
  }

  // ── Build UpdateExpression dynamically ────────────────────────────────────
  const setParts = [];
  const names = {};
  const values = {};

  if (selectedCourseIds !== undefined) {
    setParts.push('#selectedCourseIds = :selectedCourseIds');
    names['#selectedCourseIds'] = 'selectedCourseIds';
    values[':selectedCourseIds'] = selectedCourseIds;
  }

  if (cumulativeGpa !== undefined) {
    setParts.push('#cumulativeGpa = :cumulativeGpa');
    names['#cumulativeGpa'] = 'cumulativeGpa';
    values[':cumulativeGpa'] = cumulativeGpa;
  }

  if (lastSemGpa !== undefined) {
    setParts.push('#lastSemGpa = :lastSemGpa');
    names['#lastSemGpa'] = 'lastSemGpa';
    values[':lastSemGpa'] = lastSemGpa;
  }

  // Always stamp updatedAt
  setParts.push('#updatedAt = :updatedAt');
  names['#updatedAt'] = 'updatedAt';
  values[':updatedAt'] = new Date().toISOString();

  // Need at least one real field beyond updatedAt
  if (setParts.length < 2) {
    return respond(400, { error: 'No fields to update' });
  }

  // ── DynamoDB UpdateItem ───────────────────────────────────────────────────
  try {
    const result = await dynamo.send(new UpdateCommand({
      TableName: USERS_TABLE,
      Key: { userId },
      UpdateExpression: `SET ${setParts.join(', ')}`,
      ExpressionAttributeNames: names,
      ExpressionAttributeValues: values,
      ConditionExpression: 'attribute_exists(userId)', // reject if user doesn't exist
      ReturnValues: 'ALL_NEW',
    }));

    return respond(200, { success: true, profile: result.Attributes });

  } catch (err) {
    if (err.name === 'ConditionalCheckFailedException') {
      return respond(404, { error: 'User profile not found' });
    }
    console.error('[update-profile] DynamoDB error:', err);
    return respond(500, { error: 'Internal server error' });
  }
};
