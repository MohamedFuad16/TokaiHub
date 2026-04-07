import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, UpdateCommand, GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLES = {
  USERS: "tokaihub-users",
  CLASSES: "tokaihub-classes",
};

// Static schedule reference — matches data.ts on the frontend.
// Key = courseId (DynamoDB), value = schedule info per section (A/B).
// Add more courses here as needed.
const COURSE_SCHEDULE = {
  TTK085: { day: "MON", start: "09:00", end: "12:10", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 1B303", professorName: "Kyoko Hasegawa" },
      B: { roomNumber: "SHINAGAWA 1B303", professorName: "Kyoko Hasegawa" },
    }
  },
  TTK000: { day: "TUE", start: "09:00", end: "10:30", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 4102", professorName: "Sora Yamamoto" },
      B: { roomNumber: "SHINAGAWA 4102", professorName: "Sora Yamamoto" },
    }
  },
  TTK031: { day: "TUE", start: "10:40", end: "12:10", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 4202", professorName: "Harumi Watanabe" },
      B: { roomNumber: "SHINAGAWA 4202", professorName: "Harumi Watanabe" },
    }
  },
  TTK060: { day: "TUE", start: "13:00", end: "14:30", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 4105", professorName: "Junichi Murayama" },
      B: { roomNumber: "SHINAGAWA 4105", professorName: "Junichi Murayama" },
    }
  },
  TTK035: { day: "THU", start: "09:00", end: "12:10", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 1B202", professorName: "Hironori Nakatani" },
      B: { roomNumber: "SHINAGAWA 1B202", professorName: "Hironori Nakatani" },
    }
  },
  TTK090: { day: "THU", start: "13:00", end: "16:10", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 1B202", professorName: "Mikako Sato" },
      B: { roomNumber: "SHINAGAWA 1B202", professorName: "Mikako Sato" },
    }
  },
  TTK010: { day: "FRI", start: "09:00", end: "10:30", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 1B202", professorName: "Yoshihisa Takayama" },
      B: { roomNumber: "SHINAGAWA 1B202", professorName: "Yoshihisa Takayama" },
    }
  },
  TTK065: { day: "FRI", start: "13:00", end: "14:30", semesterId: "2026-SPRING",
    sections: {
      A: { roomNumber: "SHINAGAWA 4101", professorName: "Satoshi Yamazaki" },
      B: { roomNumber: "SHINAGAWA 4101", professorName: "Satoshi Yamazaki" },
    }
  },
};

export const handler = async (event) => {
  console.log("==== ENROLL START ====");

  try {
    console.log("EVENT:", JSON.stringify(event, null, 2));

    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;
    console.log("userId:", userId);

    let body;
    try {
      body = JSON.parse(event.body || "{}");
    } catch (e) {
      return response({ error: "Invalid JSON body" }, 400);
    }

    const { courseIds } = body;

    if (!userId) {
      return response({ error: "Unauthorized (no userId)" }, 401);
    }

    if (!courseIds || !Array.isArray(courseIds) || courseIds.length === 0) {
      return response({ error: "courseIds must be a non-empty array" }, 400);
    }

    const cleanCourses = courseIds.filter(c => typeof c === "string" && c.trim() !== "");

    // 1️⃣ Update enrolledCourses in tokaihub-users
    await ddb.send(new UpdateCommand({
      TableName: TABLES.USERS,
      Key: { userId },
      UpdateExpression: "SET enrolledCourses = :courses",
      ExpressionAttributeValues: {
        ":courses": cleanCourses
      }
    }));

    console.log("✅ enrolledCourses updated");

    // 2️⃣ Get user to find their class (A or B)
    const userRes = await ddb.send(new GetCommand({
      TableName: TABLES.USERS,
      Key: { userId }
    }));

    const userClass = userRes.Item?.class ?? "A";
    console.log("User class:", userClass);

    // 3️⃣ Create tokaihub-classes entries for each enrolled course
    const classWritePromises = cleanCourses.map(async (courseId) => {
      const schedule = COURSE_SCHEDULE[courseId];
      if (!schedule) {
        console.warn(`No schedule found for course ${courseId} — skipping class entry`);
        return;
      }

      const section = schedule.sections[userClass] ?? schedule.sections["A"];
      const classId = `${schedule.day}#${schedule.start}#${courseId}#${userClass}`;

      const classItem = {
        userId,
        classId,
        courseId,
        dayOfWeek: schedule.day,
        startTime: schedule.start,
        endTime: schedule.end,
        roomNumber: section.roomNumber,
        professorName: section.professorName,
        sectionId: userClass,
        semesterId: schedule.semesterId,
        status: "OPEN",
      };

      await ddb.send(new PutCommand({
        TableName: TABLES.CLASSES,
        Item: classItem,
      }));

      console.log(`✅ Created class entry: ${classId}`);
    });

    await Promise.all(classWritePromises);

    return response({ message: "Courses enrolled and schedule created successfully" });

  } catch (error) {
    console.error("❌ Error:", error);
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
      "Access-Control-Allow-Methods": "OPTIONS,POST"
    },
    body: JSON.stringify(body),
  };
}
