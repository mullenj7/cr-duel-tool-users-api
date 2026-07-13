import { GetItemCommand, DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const {
    region,
    table,
} = process.env;


// Create DynamoDB document client
const client = new DynamoDBClient({ convertEmptyValues: true });
const ddbDocClient = DynamoDBDocumentClient.from(client); // client is DynamoDB client

class ErrorResponse {
    constructor(
        message = 'Failed to retrieve user details',
        statusCode = 500,
    ) {
        this.statusCode = statusCode;
        this.body = JSON.stringify({ message });
        this.headers = {
            'Content-Type': 'application/json',
        };
    }
}




const formatParamsToUpdate = (id, tableParams) => {
    let updateString = '';
    const keyValueMapping = {};
    const attributeNameMapping = {};
    const tableKeys = Object.keys(tableParams);

    for (let i = 0; i < tableKeys.length; i += 1) {
        // if there are nested items
        if (
            typeof tableParams[tableKeys[`${i}`]] === 'object'
            && !Array.isArray(tableParams[tableKeys[`${i}`]])
        ) {
            const nestedfield = Object.keys(tableParams[tableKeys[`${i}`]]);
            for (let j = 0; j < nestedfield.length; j += 1) {
                updateString += ` #${tableKeys[`${i}`]}.#${nestedfield[`${j}`]} = :${tableKeys[`${i}`]}${nestedfield[`${j}`]},`;
                keyValueMapping[`:${tableKeys[`${i}`]}${nestedfield[`${j}`]}`] = tableParams[tableKeys[`${i}`]][nestedfield[`${j}`]];
                attributeNameMapping[`#${tableKeys[`${i}`]}`] = `${tableKeys[`${i}`]}`;
                attributeNameMapping[`#${nestedfield[`${j}`]}`] = `${nestedfield[`${j}`]}`;
            }
        } else {
            updateString += ` #${tableKeys[`${i}`]} = :${tableKeys[`${i}`]},`;
            keyValueMapping[`:${tableKeys[`${i}`]}`] = tableParams[tableKeys[`${i}`]];
            attributeNameMapping[`#${tableKeys[`${i}`]}`] = tableKeys[`${i}`];
        }
    }

    updateString += ' #lastModified = :lastModified';
    attributeNameMapping['#lastModified'] = 'lastModified';
    keyValueMapping[':lastModified'] = new Date().toISOString();

    return {
        TableName: table,
        Key: {
            id,
        },
        UpdateExpression: `set ${updateString}`,
        ExpressionAttributeNames: attributeNameMapping,
        ExpressionAttributeValues: keyValueMapping,
        ReturnValues: 'UPDATED_NEW',
    };
};

const updateItem = async (id, event) => {
    try {
        const params = formatParamsToUpdate(id, event);
        console.log('params ', params);
        const response = await ddbDocClient.send(new UpdateCommand(params));
        console.log('response ', response);
        return response.Attributes;
    } catch (err) {
        throw new ErrorResponse(err);
    }
};


export const handler = async (event) => {
    try {
        // TODO implement
        console.log(event);
        const { id } = event.pathParameters;
        const { body } = event;
        const item = await updateItem(id, JSON.parse(body));
        const response = { // must use this format
            "statusCode": 200,
            "headers": { 'Access-Control-Allow-Origin': '*' },
            "body": JSON.stringify(item)
        }
        return response;
    }
    catch (err) {
        console.log(err);
        if ((err instanceof ErrorResponse)) {
            return err;
        }
        let statusCode;
        if (err.code === 'UserNotFoundException') {
            statusCode = 404;
        } else if (err.statusCode) {
            ({ statusCode } = err);
        }
        // otherwise we'll get the default status code from the class
        return new ErrorResponse(err.message, statusCode);
    }
};
