export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
  ],
  // Configure schema to include banned and role fields
  schema: {
    user: {
      fields: {
        banned: {
          type: "boolean",
          optional: true,
        },
        role: {
          type: "string",
          optional: true,
        },
      },
    },
  },
};
