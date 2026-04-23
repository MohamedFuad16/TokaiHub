import { 
  CognitoIdentityProviderClient, 
  ListUsersCommand, 
  AdminLinkProviderForUserCommand 
} from "@aws-sdk/client-cognito-identity-provider";

const client = new CognitoIdentityProviderClient({});

export const handler = async (event) => {
  console.log("PreSignUp Event:", JSON.stringify(event, null, 2));

  // Only run this logic if the user is signing up via an external identity provider (e.g., Google)
  if (event.triggerSource === "PreSignUp_ExternalProvider") {
    const email = event.request.userAttributes.email;
    const providerName = event.userName.split("_")[0]; // e.g., "Google"
    const providerUserId = event.userName.split("_")[1];

    if (!email) {
      console.log("No email found in external provider attributes. Proceeding as normal.");
      return event;
    }

    try {
      // 1. Search for an existing user with the same email
      const listUsersCommand = new ListUsersCommand({
        UserPoolId: event.userPoolId,
        Filter: `email = "${email}"`
      });
      
      const { Users } = await client.send(listUsersCommand);

      if (Users && Users.length > 0) {
        // Find a native Cognito user (not another external provider identity)
        const nativeUser = Users.find(user => user.UserStatus !== "EXTERNAL_PROVIDER");

        if (nativeUser) {
          console.log(`Found existing native user with username: ${nativeUser.Username}. Linking accounts...`);

          // 2. Link the external provider to the existing native user
          const linkCommand = new AdminLinkProviderForUserCommand({
            UserPoolId: event.userPoolId,
            DestinationUser: {
              ProviderName: "Cognito",
              ProviderAttributeValue: nativeUser.Username
            },
            SourceUser: {
              ProviderName: providerName,
              ProviderAttributeName: "Cognito_Subject",
              ProviderAttributeValue: providerUserId
            }
          });

          await client.send(linkCommand);
          console.log("Successfully linked accounts.");

          // 3. Mark the email as verified to ensure smooth login
          event.response.autoVerifyEmail = true;
          event.response.autoConfirmUser = true;
        } else {
          console.log("Existing user found, but it is an external provider identity. Proceeding as normal.");
        }
      }
    } catch (error) {
      console.error("Error during identity linking:", error);
      // Depending on requirements, you might want to throw the error to halt sign-up
      // or let it proceed to standard Cognito duplicate email exception.
    }
  }

  return event;
};
