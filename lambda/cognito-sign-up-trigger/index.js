import { DynamoDBClient, PutItemCommand } from '@aws-sdk/client-dynamodb';

const client = new DynamoDBClient({});

const {
    tableName
} = process.env;




export const handler = async (event) => {
    try {
        // Only run for new sign-ups, not password resets
        if (event.triggerSource !== 'PostConfirmation_ConfirmSignUp') {
            return event;
        }
        const { userAttributes } = event.request;
        console.log(event.request);

        const timestamp = new Date().toISOString();
       
        const command = new PutItemCommand({
            TableName: tableName,
            ConditionExpression: 'attribute_not_exists(id)',
            Item: {
                id: { S: userAttributes.sub },
                email: { S: userAttributes.email },
                created: { S: timestamp },
                lastModified: { S: timestamp },
                decks: {M: {}},
            }
        });

        const response = await client.send(command);
        console.log(response);
        return event;
    }
    catch (err) {
        console.log({ err }, 'Handler Error');
        // if error thrown by us, just return it
        if ((err instanceof ErrorResponse)) {
            return err;
        }
        let statusCode;
        if (err.statusCode) {
            ({ statusCode } = err);
        }
        // otherwise we'll get the default status code from the class
        return new ErrorResponse(err.message, statusCode);
    }
};