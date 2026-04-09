import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, GetCommand, QueryCommand, BatchGetCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLES = {
  USERS: "tokaihub-users",
  CLASSES: "tokaihub-classes",
  COURSES: "tokaihub-courses",
};

const getToday = () => {
  const days = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  return days[new Date().getDay()];
};

export const handler = async (event) => {
  try {
    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      return response({ error: "Unauthorized" }, 401);
    }

    const today = getToday();

    // 1️⃣ Get user profile
    const userRes = await ddb.send(new GetCommand({
      TableName: TABLES.USERS,
      Key: { userId }
    }));

    const user = userRes.Item;

    if (!user) {
      return response({ error: "User not found" }, 404);
    }

    const enrolledCourses = user.enrolledCourses || [];

    // 2️⃣ Get today's classes from tokaihub-classes
    const classesRes = await ddb.send(new QueryCommand({
      TableName: TABLES.CLASSES,
      KeyConditionExpression: "userId = :uid AND begins_with(classId, :day)",
      ExpressionAttributeValues: {
        ":uid": userId,
        ":day": `${today}#`
      }
    }));

    const classItems = classesRes.Items || [];
    let enrichedClasses = [];

    // 3️⃣ If class entries exist, enrich with course names
    if (classItems.length > 0) {
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

      enrichedClasses = classItems.map(cls => ({
        courseId: cls.courseId,
        courseName: courseMap[cls.courseId]?.courseName || cls.courseId,
        startTime: cls.startTime,
        endTime: cls.endTime,
        roomNumber: cls.roomNumber,
        professorName: cls.professorName,
      }));

      enrichedClasses.sort((a, b) => (a.startTime || "").localeCompare(b.startTime || ""));
    }

    // 4️⃣ Return dashboard data — shape matches React DashboardResponse
    return response({
      profile: {
        fullName: user.fullName,
        studentId: user.studentId,
        institutionId: user.institutionId,
        class: user.class,
        cumulativeGpa: user.cumulativeGpa,
        lastSemGpa: user.lastSemGpa,
      },
      // enrolledCourseIds lets the React app rebuild selectedCourseIds if localStorage is lost
      enrolledCourseIds: enrolledCourses,
      todayClasses: enrichedClasses,
      todayDay: today,
    });

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
