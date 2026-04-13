import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    QueryCommand,
    GetCommand,
    UpdateCommand
} from "@aws-sdk/lib-dynamodb";

const client = new DynamoDBClient({});
const ddb = DynamoDBDocumentClient.from(client);

const TABLE_NAME = "tokaihub";

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

        // ROUTES
        if (method === "GET" && action === "profile") {
            return getProfile(userId);
        }

        if (method === "GET" && action === "courses") {
            return getAvailableCourses(userId);
        }

        if (method === "PUT" && action === "updateCourses") {
            return updateCourses(userId, event);
        }

        return response({ error: "Invalid route" }, 400);

    } catch (err) {
        console.error(err);
        return response({ error: err.message }, 500);
    }
};

//
// 👤 GET USER PROFILE
//
async function getProfile(userId) {
    const res = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
            PK: `USER#${userId}`,
            SK: "PROFILE"
        }
    }));

    return response(res.Item || {});
}

//
// 📚 GET AVAILABLE COURSES (A/B + ALL)
//
async function getAvailableCourses(userId) {
    // 1️⃣ Get user
    const userRes = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: {
            PK: `USER#${userId}`,
            SK: "PROFILE"
        }
    }));

    const user = userRes.Item;

    if (!user) {
        return response({ error: "User not found" }, 404);
    }

    const userClass = user.class;

    // 2️⃣ Fetch class-specific courses
    const classRes = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
            ":pk": `CLASSGROUP#${userClass}`
        }
    }));

    // 3️⃣ Fetch ALL courses
    const allRes = await ddb.send(new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: "PK = :pk",
        ExpressionAttributeValues: {
            ":pk": "CLASSGROUP#ALL"
        }
    }));

    const combined = [
        ...(classRes.Items || []),
        ...(allRes.Items || [])
    ];

    return response(combined);
}

//
// ✏️ UPDATE USER COURSES & PROFILE
//
async function updateCourses(userId, event) {
    const body = event.body ? JSON.parse(event.body) : {};

    const { selectedCourseIds, enrolledCourses, cumulativeGpa, lastSemGpa } = body;

    if (!selectedCourseIds && !enrolledCourses && cumulativeGpa === undefined && lastSemGpa === undefined) {
        return response({ error: "Nothing to update" }, 400);
    }

    let updateExp = [];
    let attrValues = {};
    let attrNames = {};

    if (selectedCourseIds) {
        updateExp.push("#selected = :selected");
        attrValues[":selected"] = selectedCourseIds;
        attrNames["#selected"] = "selectedCourseIds";
    }

    if (enrolledCourses) {
        updateExp.push("#enrolled = :enrolled");
        attrValues[":enrolled"] = enrolledCourses;
        attrNames["#enrolled"] = "enrolledCourses";
    }

    if (cumulativeGpa !== undefined) {
        updateExp.push("#cumGpa = :cumGpa");
        attrValues[":cumGpa"] = cumulativeGpa.toString();
        attrNames["#cumGpa"] = "cumulativeGpa";
    }

    if (lastSemGpa !== undefined) {
        updateExp.push("#lastGpa = :lastGpa");
        attrValues[":lastGpa"] = lastSemGpa.toString();
        attrNames["#lastGpa"] = "lastSemGpa";
    }

    updateExp.push("#updatedAt = :updatedAt");
    attrValues[":updatedAt"] = new Date().toISOString();
    attrNames["#updatedAt"] = "updatedAt";

    await ddb.send(new UpdateCommand({
        TableName: TABLE_NAME,
        Key: {
            PK: `USER#${userId}`,
            SK: "PROFILE"
        },
        UpdateExpression: "SET " + updateExp.join(", "),
        ExpressionAttributeValues: attrValues,
        ExpressionAttributeNames: attrNames
    }));

    return response({ message: "Updated successfully" });
}

//
// RESPONSE
//
function response(body, statusCode = 200) {
    return {
        statusCode,
        headers: {
            "Content-Type": "application/json",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Headers": "*",
            "Access-Control-Allow-Methods": "GET,PUT,OPTIONS",
        },
        body: JSON.stringify(body),
    };
}