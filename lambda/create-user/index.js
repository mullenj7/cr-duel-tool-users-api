const { PutItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');

const client = new DynamoDBClient({});

const {
  tableName
} = process.env;




export const handler = async (event) => {
  try {
    const { response } = event;
    const { userAttributes } = response;
    const {username} = userAttributes;
    console.log(response);

    const timestamp = new Date().toISOString();
    const params = {
      TableName: tableName,
      ConditionExpression: 'attribute_not_exists(id)',
    };
    params.Item = JSON.parse(event);
    params.Item.id = username;
    params.Item.created = timestamp;
    params.Item.lastModified = timestamp;

    const command = new PutItemCommand({
      params
    });

    response = await client.send(command);
    console.log(response);
    return response;
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