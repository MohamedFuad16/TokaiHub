import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLES = {
  CLASSES: "tokaihub-classes",
  COURSES: "tokaihub-courses",
  USERS: "tokaihub-users",
};

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      return response({ error: "Unauthorized" }, 401);
    }

    const courseId = event.pathParameters?.courseId;

    if (!courseId) {
      return response({ error: "courseId is required" }, 400);
    }

    // 1️⃣ Get course base info
    const courseRes = await ddb.send(new GetCommand({
      TableName: TABLES.COURSES,
      Key: { courseId }
    }));

    const course = courseRes.Item;

    if (!course) {
      return response({ error: "Course not found" }, 404);
    }

    // 2️⃣ Get user's schedule entry for this course (created by enroll-courses)
    const classRes = await ddb.send(new QueryCommand({
      TableName: TABLES.CLASSES,
      KeyConditionExpression: "userId = :uid",
      FilterExpression: "courseId = :cid",
      ExpressionAttributeValues: {
        ":uid": userId,
        ":cid": courseId
      }
    }));

    const userClass = classRes.Items?.[0] || null;

    // 3️⃣ If no user-specific class entry, look up user's class to show correct section info
    let roomNumber = userClass?.roomNumber ?? null;
    let professorName = userClass?.professorName ?? null;
    let startTime = userClass?.startTime ?? null;
    let endTime = userClass?.endTime ?? null;
    let dayOfWeek = userClass?.dayOfWeek ?? null;
    let sectionId = userClass?.sectionId ?? null;
    let status = userClass?.status ?? null;

    if (!userClass) {
      const userRes = await ddb.send(new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId }
      }));
      sectionId = userRes.Item?.class ?? null;
    }

    // Serialize allowedClasses (Set → Array) so it JSON-serializes correctly
    let allowedClasses = course.allowedClasses;
    if (allowedClasses instanceof Set || (allowedClasses && typeof allowedClasses.values === "function")) {
      allowedClasses = [...allowedClasses];
    }

    return response({
      ...course,
      allowedClasses,
      roomNumber,
      professorName,
      startTime,
      endTime,
      dayOfWeek,
      sectionId,
      status,
    });

  } catch (error) {
    console.error("ERROR:", error);
    return response({ error: error.message }, 500);
  }
};

function response(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,OPTIONS"
    },
    body: JSON.stringify(body),
  };
}
