import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, PutCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "tokaihub";

/**
 * Cognito Post-Confirmation Trigger
 * Automatically creates the initial user profile record in DynamoDB.
 */
export const handler = async (event) => {
  try {
    console.log("EVENT:", JSON.stringify(event));

    const { sub, email, name } = event.request.userAttributes;

    // ✅ OPTIONAL at this stage (Google users will add this later in the app)
    const studentId = event.request.userAttributes["custom:studentId"] || "PENDING";

    // ✅ Determine class (A / B)
    // Logic: Parses the last 4 digits of the student ID
    let studentClass = "A";
    if (studentId !== "PENDING") {
      const num = parseInt(studentId.slice(-4));
      if (num >= 1200 && num <= 1299) {
        studentClass = "B";
      }
    }

    const now = new Date().toISOString();

    // ✅ FULL USER ENTITY (aligned with TokaiHub Unified Schema)
    const userItem = {
      PK: `USER#${sub}`,
      SK: "PROFILE",

      userId: sub,
      entityType: "USER",

      fullName: name || studentId,
      email,
      studentId,
      class: studentClass,
      institutionId: "TOKAI-JP",

      cumulativeGpa: 0,
      lastSemGpa: 0,

      enrolledCourses: [],
      selectedCourseIds: [],

      createdAt: now,
      updatedAt: now,
    };

    // ✅ Save to DynamoDB safely
    await ddb.send(new PutCommand({
      TableName: TABLE_NAME,
      Item: userItem,
      ConditionExpression: "attribute_not_exists(PK)" // prevents duplicate user creation
    }));

    console.log("User created:", userItem);

    return event;

  } catch (error) {
    console.error("ERROR:", error);
    throw error;
  }
};
