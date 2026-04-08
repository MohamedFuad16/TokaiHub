import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "tokaihub-courses";

export const handler = async (event) => {
  console.log("==== START REQUEST ====");

  try {
    console.log("EVENT:", JSON.stringify(event, null, 2));

    console.log("🔍 Scanning DynamoDB table:", TABLE_NAME);

    const data = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));

    const items = data.Items || [];
    console.log(`📊 Total items fetched: ${items.length}`);

    return response(items);

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
