import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "tokaihub-courses";

export const handler = async (event) => {
  console.log("==== START REQUEST ====");

  try {
    console.log("EVENT:", JSON.stringify(event, null, 2));

    const headers = event.headers || {};

    const studentClass =
      headers["x-student-class"] ||
      headers["X-Student-Class"] ||
      null;

    console.log("Extracted studentClass:", studentClass);

    if (!studentClass) {
      console.log("❌ Missing student class header");
      return response({ error: "Missing student class" }, 400);
    }

    console.log("🔍 Scanning DynamoDB table:", TABLE_NAME);

    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));

    const items = data.Items || [];
    console.log(`📊 Total items fetched: ${items.length}`);

    const filtered = items.filter(course => {
      const allowed = course.allowedClasses;
      if (!allowed) return false;

      // DynamoDBDocumentClient converts SS → JS Set, but we handle all cases
      // to avoid instanceof Set issues across SDK versions.
      let classArray;
      if (allowed instanceof Set) {
        classArray = [...allowed];
      } else if (Array.isArray(allowed)) {
        classArray = allowed;
      } else if (typeof allowed === "object" && allowed.values) {
        // AWS SDK custom Set object (has .values() iterator)
        classArray = [...allowed.values()];
      } else {
        return false;
      }

      return classArray.includes(studentClass);
    });

    console.log("🎯 Filtered result count:", filtered.length);

    return response(filtered);

  } catch (err) {
    console.error("❌ ERROR:", err);
    return response({ error: err.message }, 500);
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
