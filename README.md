# Clash Royale Duel Tool Users API

This Repository contains the code for the AWS Lambda functions for the Users API of the Clash Royale Duel Tool App.

The code is written in `Node.js`.

This repo contains the following DynamoDB functions.
- Get User Details
- Get Users
- Update User

It also contains the **API Authorizer** function used to authorize API requests before calling their designated Lambda function.
This Authorizer decodes the JWT token attached to the request, ensures the user is in the correct user group, and validates that the token hasn't expired.

The final Lambda function is an AWS Cognito post-sign up trigger which runs after a new user has successfully signed up, and adds the user to a Users DynamoDB table.
