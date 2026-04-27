// Load the SDK for JavaScript
const AWS = require('aws-sdk');

const { userPoolId, region, logLevel } = process.env;

const pino = require('pino-lambda').default;

const logger = pino({
  name: 'Create User users',
  level: logLevel,
});

// Set the region
AWS.config.update({ region });

const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider({
  apiVersion: '2016-04-19', region,
});

class ErrorResponse {
  constructor(
    message = 'Failed to create user',
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
    logger.withRequest(event, context);
    const body = JSON.parse(event.body);

    const createAccountParams = {
      Username: body.username, /* required */
      TemporaryPassword: body.temporaryPassword,
      UserPoolId: userPoolId,
    };

    const result = await CognitoIdentityServiceProvider
      .adminCreateUser(createAccountParams).promise();
    const response = {
      statusCode: 201,
      body: JSON.stringify({
        message: 'User Created',
        result,
      }),
      headers: {
        'Content-Type': 'application/json',
      },
    };

    logger.debug(response);

    return response;
  } catch (err) {
    logger.error({ err }, 'Handler Error');
    // if error thrown by us, just return it
    if ((err instanceof ErrorResponse)) {
      return err;
    }
    let statusCode;
    if (err.code === 'UsernameExistsException') {
      statusCode = 409;
    } else if (err.statusCode) {
      ({ statusCode } = err);
    }
    // otherwise we'll get the default status code from the class
    return new ErrorResponse(err.message, statusCode);
  }
};
