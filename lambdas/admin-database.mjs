import {
  DynamoDBClient
} from "@aws-sdk/client-dynamodb";

import {
  DynamoDBDocumentClient,
  QueryCommand,
  ScanCommand,
  PutCommand,
  UpdateCommand,
  DeleteCommand,
  GetCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "tokaihub";

/**
 * Admin Database CRUD Lambda
 *
 * ROUTES (via API Gateway → /testDB):
 *   GET    ?action=browse    → browse(pk?, sk?, search?)
 *   POST   ?action=add       → addItem({ PK, SK, ...fields })
 *   PUT    ?action=edit      → editItem({ PK, SK, ...updates })
 *   DELETE ?action=delete    → deleteItem({ PK, SK })
 */

export const handler = async (event) => {
  try {
    const method =
      event.requestContext?.http?.method ||
      event.httpMethod;

    const action = event.queryStringParameters?.action || "";

    if (method === "OPTIONS") {
      return response({});
    }

    const userId = event.requestContext?.authorizer?.jwt?.claims?.sub;

    if (!userId) {
      return response({ error: "Unauthorized" }, 401);
    }

    if (method === "GET" && action === "browse") {
      return browse(event);
    }

    if (method === "POST" && action === "add") {
      return addItem(event);
    }

    if (method === "PUT" && action === "edit") {
      return editItem(event);
    }

    if (method === "DELETE" && action === "delete") {
      return deleteItem(event);
    }

    return response({ error: "Invalid route" }, 400);

  } catch (err) {
    console.error(err);
    return response({ error: err.message }, 500);
  }
};

// Browse — Query by PK (fast) or Scan + search (slower fallback)
async function browse(event) {
  const { pk, sk, search } = event.queryStringParameters || {};

  if (pk) {
    const params = {
      TableName: TABLE_NAME,
      KeyConditionExpression: "PK = :pk",
      ExpressionAttributeValues: { ":pk": pk },
    };

    if (sk) {
      params.KeyConditionExpression += " AND begins_with(SK, :sk)";
      params.ExpressionAttributeValues[":sk"] = sk;
    }

    const res = await ddb.send(new QueryCommand(params));
    return response(res.Items || []);
  }

  const scanRes = await ddb.send(new ScanCommand({ TableName: TABLE_NAME }));
  let items = scanRes.Items || [];

  if (search) {
    const term = search.toLowerCase();
    items = items.filter(item =>
      JSON.stringify(item).toLowerCase().includes(term)
    );
  }

  return response(items);
}

// Add — PutItem with full body as the DynamoDB item
async function addItem(event) {
  const body = JSON.parse(event.body);

  if (!body.PK || !body.SK) {
    return response({ error: "PK and SK required" }, 400);
  }

  await ddb.send(new PutCommand({ TableName: TABLE_NAME, Item: body }));
  return response({ message: "Item created", item: body });
}

// Edit — Dynamic UpdateExpression from body fields (excluding PK/SK)
async function editItem(event) {
  const body = JSON.parse(event.body);
  const { PK, SK, ...updates } = body;

  if (!PK || !SK) {
    return response({ error: "PK and SK required" }, 400);
  }

  const updateKeys = Object.keys(updates);
  if (updateKeys.length === 0) {
    return response({ error: "No fields to update" }, 400);
  }

  const UpdateExpression = "SET " + updateKeys.map((k, i) => `#k${i} = :v${i}`).join(", ");
  const ExpressionAttributeNames = {};
  const ExpressionAttributeValues = {};

  updateKeys.forEach((key, i) => {
    ExpressionAttributeNames[`#k${i}`] = key;
    ExpressionAttributeValues[`:v${i}`] = updates[key];
  });

  await ddb.send(new UpdateCommand({
    TableName: TABLE_NAME,
    Key: { PK, SK },
    UpdateExpression,
    ExpressionAttributeNames,
    ExpressionAttributeValues,
  }));

  return response({ message: "Item updated" });
}

// Delete — removes item by PK + SK
async function deleteItem(event) {
  const body = JSON.parse(event.body);
  const { PK, SK } = body;

  if (!PK || !SK) {
    return response({ error: "PK and SK required" }, 400);
  }

  await ddb.send(new DeleteCommand({ TableName: TABLE_NAME, Key: { PK, SK } }));
  return response({ message: "Item deleted" });
}

// Standard CORS response helper
function response(body, statusCode = 200) {
  return {
    statusCode,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "*",
      "Access-Control-Allow-Methods": "GET,POST,PUT,DELETE,OPTIONS",
    },
    body: JSON.stringify(body),
  };
}
