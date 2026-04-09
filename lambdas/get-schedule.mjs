import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, QueryCommand, BatchGetCommand, GetCommand } from "@aws-sdk/lib-dynamodb";

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

    const day = event.queryStringParameters?.day;

    // 1️⃣ Try to get classes from tokaihub-classes (per-user schedule)
    const classesRes = await ddb.send(new QueryCommand({
      TableName: TABLES.CLASSES,
      KeyConditionExpression: day
        ? "userId = :uid AND begins_with(classId, :day)"
        : "userId = :uid",
      ExpressionAttributeValues: day
        ? { ":uid": userId, ":day": `${day}#` }
        : { ":uid": userId },
    }));

    const classItems = classesRes.Items || [];

    // 2️⃣ If no class entries, fall back to enrolledCourses from tokaihub-users
    if (classItems.length === 0) {
      console.log("No tokaihub-classes entries — falling back to enrolledCourses");

      const userRes = await ddb.send(new GetCommand({
        TableName: TABLES.USERS,
        Key: { userId }
      }));

      const enrolledCourses = userRes.Item?.enrolledCourses || [];

      if (enrolledCourses.length === 0) {
        return response({ classes: [] });
      }

      // Batch get course details
      const coursesRes = await ddb.send(new BatchGetCommand({
        RequestItems: {
          [TABLES.COURSES]: {
            Keys: enrolledCourses.map(id => ({ courseId: id }))
          }
        }
      }));

      const courses = coursesRes.Responses?.[TABLES.COURSES] || [];

      const result = courses.map(c => ({
        courseId: c.courseId,
        courseName: c.courseName,
        startTime: null,
        endTime: null,
        roomNumber: null,
        professorName: null,
        dayOfWeek: null,
        credits: c.credits,
        overview: c.overview,
      }));

      return response({ classes: result });
    }

    // 3️⃣ Standard path: class entries exist — batch get course names
    const courseIds = [...new Set(classItems.map(c => c.courseId))];

    const coursesRes = await ddb.send(new BatchGetCommand({
      RequestItems: {
        [TABLES.COURSES]: {
          Keys: courseIds.map(id => ({ courseId: id }))
        }
      }
    }));

    const courses = coursesRes.Responses?.[TABLES.COURSES] || [];

    const courseMap = {};
    for (const c of courses) {
      courseMap[c.courseId] = c;
    }

    const result = classItems.map(cls => ({
      courseId: cls.courseId,
      courseName: courseMap[cls.courseId]?.courseName || cls.courseId,
      startTime: cls.startTime,
      endTime: cls.endTime,
      roomNumber: cls.roomNumber,
      professorName: cls.professorName,
      dayOfWeek: cls.dayOfWeek,
      credits: courseMap[cls.courseId]?.credits,
    }));

    return response({ classes: result });

  } catch (error) {
    console.error(error);
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
      "Access-Control-Allow-Methods": "GET,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}
