const {
  ListUsersCommand,
  CognitoIdentityProviderClient,
} = require('@aws-sdk/client-cognito-identity-provider');

const {
  userPoolId, region,
} = process.env;


const client = new CognitoIdentityProviderClient({});

const arrayToObject = (array, keyField, valueField) => Object.assign({}, ...array
  .map((item) => ({ [item[keyField]]: item[valueField] })));

const formatUserAttributes = (users) => users.map((user) => {
  const attributes = arrayToObject(user.Attributes, 'Name', 'Value');
  return {
    ...user,
    Attributes: attributes,
  };
});

class ErrorResponse {
  constructor(
    message = 'Failed to retrieve users',
    statusCode = 500,
  ) {
    this.statusCode = statusCode;
    this.body = JSON.stringify({ message });
    this.headers = {
      'Content-Type': 'application/json',
    };
  }
}

exports.handler = async (event, context) => {
  try {
    console.log(event, context);
    const queryStringParameters = { event };

    const { limit, paginationToken } = queryStringParameters;

    const listUserParams = {
      UserPoolId: userPoolId,
    };

    if (paginationToken) {
      listUserParams.PaginationToken = paginationToken;
    }
    if (limit && limit > 0) {
      listUserParams.Limit = limit;
    }

    const command = new ListUsersCommand({
      UserPoolId: userPoolId,
    });

    const response = await client.send(command);

    console.log(response);

    response.Users = formatUserAttributes(response.Users);

    console.debug(response);
    return response;
  } catch (err) {
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
