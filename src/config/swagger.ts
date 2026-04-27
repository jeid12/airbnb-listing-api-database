import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express, Request, Response } from "express";

const PRODUCTION_URL = "https://airbnb-listing-api.onrender.com";
const isProduction = process.env["NODE_ENV"] === "production";

const options: swaggerJSDoc.Options = {
  definition: {
    openapi: "3.0.0",
    info: {
      title: "Airbnb API",
      version: "1.0.0",
      description:
        "A RESTful API for managing Airbnb-style listings, bookings, and users. " +
        "Register or login to get a JWT token, then click **Authorize** to use protected endpoints.",
    },
    servers: [
      {
        url: isProduction
          ? process.env["API_URL"] ?? PRODUCTION_URL
          : `http://localhost:${process.env["PORT"] ?? 3000}`,
        description: isProduction ? "Production" : "Local development",
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: "http",
          scheme: "bearer",
          bearerFormat: "JWT",
          description: "Paste the JWT token you received from POST /auth/login",
        },
      },
    },
  },
  apis: isProduction ? ["./dist/routes/*.js"] : ["./src/routes/*.ts"],
};

const swaggerSpec = swaggerJSDoc(options);

const REDOC_HTML = `<!DOCTYPE html>
<html>
  <head>
    <title>Airbnb API — ReDoc</title>
    <meta charset="utf-8"/>
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <link href="https://fonts.googleapis.com/css?family=Montserrat:300,400,700|Roboto:300,400,700" rel="stylesheet">
    <style>body { margin: 0; padding: 0; }</style>
  </head>
  <body>
    <redoc spec-url='/api-docs.json'></redoc>
    <script src="https://cdn.jsdelivr.net/npm/redoc@latest/bundles/redoc.standalone.js"></script>
  </body>
</html>`;

export function setupSwagger(app: Express): void {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req: Request, res: Response) => res.json(swaggerSpec));
  app.get("/api-redoc", (_req: Request, res: Response) => {
    res.setHeader("Content-Type", "text/html");
    res.send(REDOC_HTML);
  });

  const base = isProduction ? PRODUCTION_URL : `http://localhost:${process.env["PORT"] ?? 3000}`;
  console.log(`Swagger UI  → ${base}/api-docs`);
  console.log(`ReDoc       → ${base}/api-redoc`);
}
