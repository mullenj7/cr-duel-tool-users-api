const AWS = require('aws-sdk');

const {
  region, userPoolId, userClientId, logLevel,
} = process.env;

const pino = require('pino-lambda').default;

const logger = pino({
  name: 'API Authenticate users',
  level: logLevel,
});

// Set the region
AWS.config.update({ region });

const CognitoIdentityServiceProvider = new AWS.CognitoIdentityServiceProvider(
  { apiVersion: '2016-04-19', region },
);

class ErrorResponse {
  constructor(
    message = 'Failed to authenticate user',
    statusCode = 500,
  ) {
    this.statusCode = statusCode;
    this.body = JSON.stringify({ message });
    this.headers = {
      'Content-Type': 'application/json',
    };
  }
}

async function authenticateUser(username, password, poolId, clientId) {
  const authenticateParams = {
    AuthFlow: 'ADMIN_NO_SRP_AUTH', /* required */
    AuthParameters: {
      USERNAME: username,
      PASSWORD: password,
    },
    UserPoolId: poolId,
    ClientId: clientId,
  };
  logger.debug(`Params: ${JSON.stringify(authenticateParams)}`);
  const response = await CognitoIdentityServiceProvider
    .adminInitiateAuth(authenticateParams).promise();
  return response;
}

exports.handler = async (event, context) => {
  try {
    logger.withRequest(event, context);
    const body = JSON.parse(event.body);
    const response = await authenticateUser(body.username, body.password, userPoolId, userClientId);

    return response;
  } catch (err) {
    logger.error({ err }, 'Handler Error');
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
