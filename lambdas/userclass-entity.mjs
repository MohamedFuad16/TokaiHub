import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import {
    DynamoDBDocumentClient,
    QueryCommand,
    GetCommand,
    UpdateCommand,
    BatchGetCommand
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
// 📚 GET AVAILABLE COURSES (A/B + ALL + user's enrolled)
//
async function getAvailableCourses(userId) {
    // 1️⃣ Get user profile (need class + enrolledCourses)
    const userRes = await ddb.send(new GetCommand({
        TableName: TABLE_NAME,
        Key: { PK: `USER#${userId}`, SK: "PROFILE" }
    }));

    const user = userRes.Item;
    if (!user) return response({ error: "User not found" }, 404);

    const userClass = user.class || "A";
    // All course codes the user is actually enrolled in
    const enrolledCodes = [
        ...(user.enrolledCourses || []),
        ...(user.selectedCourseIds || [])
    ].filter(Boolean);

    // 2️⃣ Fetch class-specific + ALL classgroup courses in parallel
    const [classRes, allRes] = await Promise.all([
        ddb.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: { ":pk": `CLASSGROUP#${userClass}` }
        })),
        ddb.send(new QueryCommand({
            TableName: TABLE_NAME,
            KeyConditionExpression: "PK = :pk",
            ExpressionAttributeValues: { ":pk": "CLASSGROUP#ALL" }
        }))
    ]);

    const classGroupItems = [
        ...(classRes.Items || []),
        ...(allRes.Items || [])
    ];

    // Codes already covered by the classgroup query
    const classGroupCodes = new Set(classGroupItems.map(i => i.courseCode).filter(Boolean));

    // 3️⃣ Find enrolled courses NOT in the classgroup results — need direct META fetch
    const missingCodes = [...new Set(enrolledCodes)].filter(code => !classGroupCodes.has(code));

    // 4️⃣ BatchGet COURSE#META for ALL unique codes (classgroup + missing enrolled)
    const allCodes = [...new Set([...classGroupCodes, ...missingCodes])];

    if (allCodes.length === 0) return response([]);

    const metaRes = await ddb.send(new BatchGetCommand({
        RequestItems: {
            [TABLE_NAME]: {
                Keys: allCodes.map(code => ({
                    PK: `COURSE#${code}`,
                    SK: "META"
                }))
            }
        }
    }));

    const metaMap = {};
    (metaRes.Responses?.[TABLE_NAME] || []).forEach(m => {
        metaMap[m.courseCode] = m;
    });

    // 5️⃣ Build final list:
    //    - classgroup items merged with their META (META wins on schedule fields)
    //    - missing enrolled courses added purely from META
    const fromClassGroup = classGroupItems.map(item => {
        const meta = metaMap[item.courseCode] || {};
        return {
            ...item,
            ...meta,
            courseCode: item.courseCode,
            title: meta.courseName || meta.title || item.courseName || item.courseCode,
        };
    });

    const fromMissingEnrolled = missingCodes
        .filter(code => metaMap[code]) // only if META exists in DB
        .map(code => ({
            ...metaMap[code],
            courseCode: code,
            title: metaMap[code].courseName || metaMap[code].title || code,
        }));

    // Deduplicate by courseCode
    const seen = new Set();
    const result = [...fromClassGroup, ...fromMissingEnrolled].filter(item => {
        if (!item.courseCode || seen.has(item.courseCode)) return false;
        seen.add(item.courseCode);
        return true;
    });

    console.log(`[getAvailableCourses] userId=${userId} class=${userClass} total=${result.length} (classgroup=${fromClassGroup.length} + directEnrolled=${fromMissingEnrolled.length})`);

    return response(result);
}

//
// ✏️ UPDATE USER COURSES & PROFILE
//
async function updateCourses(userId, event) {
    const body = event.body ? JSON.parse(event.body) : {};
    console.log(`[updateCourses] User: ${userId}, Body:`, JSON.stringify(body));

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
        attrValues[":cumGpa"] = Number(cumulativeGpa);
        attrNames["#cumGpa"] = "cumulativeGpa";
    }

    if (lastSemGpa !== undefined) {
        updateExp.push("#lastGpa = :lastGpa");
        attrValues[":lastGpa"] = Number(lastSemGpa);
        attrNames["#lastGpa"] = "lastSemGpa";
    }

    updateExp.push("#updatedAt = :updatedAt");
    attrValues[":updatedAt"] = new Date().toISOString();
    attrNames["#updatedAt"] = "updatedAt";

    console.log(`[updateCourses] UpdateExpression: SET ${updateExp.join(", ")}`);

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