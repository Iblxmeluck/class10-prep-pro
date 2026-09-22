/** Members sign in with a username; auth needs an email, so we derive one. */
export const emailForUsername = (username: string) =>
  `${username.trim().toLowerCase()}@members.cbse10.local`;
