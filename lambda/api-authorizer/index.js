const jwt = require('jsonwebtoken');
const fetch = require('node-fetch');
const jose = require('node-jose');

const {
  userPoolId, userClientId
} = process.env;


// Add the pool and client IDs in these arrays for pool authentication
const poolIds = [
  userPoolId,
];

const poolClientIds = [
  userClientId,
];


// Checks token pool and client ID against environment variables
const verifyUserInPool = (token) => {
  const decodedToken = jwt.decode(token, {complete: true});
  const tokenPoolId = decodedToken.iss.split('/').pop();
  const tokenClientId = decodedToken.aud;
  console.log(`Token pool ID: ${tokenPoolId}`);
  console.log(`Token client ID: ${tokenClientId}`);

  return poolIds.includes(tokenPoolId) && poolClientIds.includes(tokenClientId);
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

const verifyToken = async (token) => {
  const matchedKey = await matchPublicKey(token);

  if (!verifyUserInPool(token)) {
    console.log('User not in pool');
    return false;
  }

  // Verifies token and checks for expiration
  const asKey = await jose.JWK.asKey(matchedKey);
  const verificationResult = await jose.JWS.createVerify(asKey).verify(token);
  console.log(`verificationResult: ${verificationResult}`);

  const claims = JSON.parse(verificationResult.payload);
  console.log(`claims: ${claims}`);

  const currentTs = Math.floor(new Date() / 1000);

  if (currentTs > claims.exp) {
    console.log('Token is expired');
    return false;
  }
  return true;
};

exports.handler = async (event, context) => {
  try {
  // console.log(event, context);
  // console.log(JSON.stringify(event));
  // console.log(JSON.stringify(event.headers));
  // console.log(event.headers.Authorization);

  // const verified = await verifyToken(event.headers.Authorization);
  const response = {
    isAuthorized: true,
    context: {},
  };


  return response;
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
