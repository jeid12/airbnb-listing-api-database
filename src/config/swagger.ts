import swaggerJSDoc from "swagger-jsdoc";
import swaggerUi from "swagger-ui-express";
import type { Express } from "express";

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
          ? process.env["API_URL"] ?? "https://your-app.railway.app"
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

export function setupSwagger(app: Express): void {
  app.use("/api-docs", swaggerUi.serve, swaggerUi.setup(swaggerSpec));
  app.get("/api-docs.json", (_req, res) => res.json(swaggerSpec));
  const port = process.env["PORT"] ?? 3000;
  console.log(`Swagger docs → http://localhost:${port}/api-docs`);
}
