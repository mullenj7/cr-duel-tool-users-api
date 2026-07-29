const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const jose = require('node-jose');

const {
  userPoolId, userClientId
} = process.env;


// Checks token pool and client ID against environment variables
const verifyUserInPool = (token) => {
  const decodedToken = (jwt.decode(token, { complete: true }));
  const decodedTokenPayload = decodedToken.payload;
  const tokenPoolId = decodedTokenPayload.iss.split('/').pop();
  const tokenClientId = decodedTokenPayload.client_id;
  console.log(`Token pool ID: ${tokenPoolId}`);
  console.log(`Token client ID: ${tokenClientId}`);

  return (userPoolId === tokenPoolId) && (userClientId === tokenClientId);
};

// Matches public key in token header to auth response in Cognito
const matchPublicKey = async (token) => {
  const sections = token.split('.');
  let header = jose.util.base64url.decode(sections[0]);
  header = JSON.parse(header);
  const { kid } = header;

  const decodedToken = jwt.decode(token);
  console.log(`decodedToken: ${decodedToken}`);

  const keysUrl = `${decodedToken.iss}/.well-known/jwks.json`;
  const response = await fetch(keysUrl);
  const data = await response.json();
  const { keys } = data;

  const matchedKey = keys.find((key) => key.kid === kid);

  if (!matchedKey) {
    console.log('key not matched');
    return false;
  }

  return matchedKey;
};

const verifyToken = async (token, methodArn) => {
  const matchedKey = await matchPublicKey(token);
  console.log('matched key', matchedKey);

  if (!verifyUserInPool(token)) {
    console.log('User not in pool');
    return {
      isAuthorized: false,
      context: 'User not in pool',
    };
  }

  // Verifies token and checks for expiration
  const asKey = await jose.JWK.asKey(matchedKey);
  const verificationResult = await jose.JWS.createVerify(asKey).verify(token);

  const claims = JSON.parse(verificationResult.payload);
  console.log(`claims: ${JSON.stringify(claims)}`);

  const currentTs = Math.floor(new Date() / 1000);

  const response = {};
  response.principalId = claims.sub;
  const policyDocument = {};
  policyDocument.Version = '2012-10-17';
  policyDocument.Statement = [];
  const statementOne = {};
  statementOne.Action = 'execute-api:Invoke';
  statementOne.Effect = currentTs > claims.exp ? "Deny" : "Allow"; // if token expired then deny
  statementOne.Resource = methodArn;
  policyDocument.Statement[0] = statementOne;
  response.policyDocument = policyDocument;

  return response;
};


exports.handler = async (event, context) => {
  try {

    console.log('event', event);
    console.log(event.authorizationToken);
    console.log(event.methodArn);
    const res = await verifyToken(event.authorizationToken, event.methodArn);
    const response = { // need for cors
      "statusCode": 200,
      "headers": { 'Access-Control-Allow-Origin': '*' },
      "body": res
    }
    console.log(JSON.stringify(response));
    return res;
  }
  catch (err) {
    console.log(err);
    const response = {
      isAuthorized: false,
      context: err,
    };
    return response;
  }
};
