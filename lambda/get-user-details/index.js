const { GetItemCommand, DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { DynamoDBDocumentClient, GetCommand } = require('@aws-sdk/lib-dynamodb');

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

const getUserDetails = async (id) => {
  const params = {
    TableName: table,
    Key: {
      id: id,
    },
  };

  const response = await ddbDocClient.send(
    new GetCommand({
      TableName: table,
      Key: {
        id: id,
      },
    }))

  console.log(response);

  return response.Item;
};

exports.handler = async (event) => {
  try {
    console.log(event);
    const { pathParameters = {} } = event;
    const { id } = pathParameters;
    console.log('path params ', pathParameters);

    const userDetails = await getUserDetails(id);

    console.log(userDetails);

    const response = {
      "statusCode": 200,
      "headers": { 'Access-Control-Allow-Origin': '*' },
      "body": JSON.stringify(userDetails)
    }

    console.log(response);
    return response;
  } catch (err) {
    console.log(err);
    // if error thrown by us, just return it
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
