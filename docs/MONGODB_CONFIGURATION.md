# MongoDB configuration

Room matching requires the server-only `MONGODB_URI` environment variable. There is no source-code fallback. The standalone script and Next.js API reject missing or whitespace-only values before constructing a database client. The GET health response does not connect to a database.

Use `.env.example` as a blank local template. Supply an authorized database connection value through the deployment environment's existing configuration workflow; never commit it or prefix it with `NEXT_PUBLIC_`. This change does not create accounts, credentials, or database access, and does not validate existing deployment values.

For the verified Vercel project `web-ai-in-action-frontend`, production configuration belongs to its Production environment; preview validation needs a separately authorized Preview value if room-matching integration testing is desired. Do not reuse a connection string that was removed from source or history. Its removal does not prove that it has been invalidated.

The expected database is `room_matching_db`, collection `rooms`, with the existing `room_vector_index` vector-search index over four-dimensional `featureVector` values. Those names come from the existing matching code; they do not establish ownership or prove that a live database is configured.

`npm run test:security` uses synthetic opaque values and stubbed clients. It checks missing configuration, lazy module loading, health checks, input validation, and connection lifecycle without network or real credentials. Passing tests and a READY deployment do not prove that room matching, chat, or speech services have their required business configuration.
