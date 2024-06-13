import { APIGatewayEvent, Context } from "aws-lambda";
import { Logger } from "@aws-lambda-powertools/logger";
import middy from "@middy/core";
import {
  correlationIdMiddleware,
  PowerToolsLoggerOptions,
} from "./correlation-id-middleware";
import { ExtendedGlobal } from "./extended-global";
declare const global: ExtendedGlobal;

const context = {
  getRemainingTimeInMillis: () => 0,
  functionName: "functionName",
  functionVersion: "functionVersion",
  invokedFunctionArn: "invokedFunctionArn",
  memoryLimitInMB: "memoryLimitInMB",
  awsRequestId: "awsRequestId",
  logGroupName: "logGroupName",
  logStreamName: "logStreamName",
  identity: {},
  clientContext: {},
};

describe("correlation id tests", () => {
  test("global correlation values should be undefined inside the handler if it could not extracted", async () => {
    const handler = middy(() => {
      expect(global.x_correlation_id).toEqual(undefined);
      expect(global.x_correlation_trigger).toEqual(undefined);
      expect(global.x_correlation_status).toEqual(undefined);
    });
    handler.use(correlationIdMiddleware());
    const event = {};
    await handler(event, {} as Context);
  });

  test("global correlation values should not be available outside the handler", async () => {
    const handler = middy(() => {});
    handler.use(correlationIdMiddleware());
    const event = {};
    expect(global.x_correlation_id).toBeUndefined();
    expect(global.x_correlation_trigger).toBeUndefined();
    expect(global.x_correlation_status).toBeUndefined();
    await handler(event, context as Context);
    expect(global.x_correlation_id).toBeUndefined();
    expect(global.x_correlation_trigger).toBeUndefined();
    expect(global.x_correlation_status).toBeUndefined();
  });

  describe("AWS API Gateway requests", () => {
    test("AWS API Gateway event creates correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("requestId");
        expect(global.x_correlation_trigger).toEqual("APIGateway");
        expect(global.x_correlation_status).toEqual("created");
      });
      handler.use(correlationIdMiddleware());
      const event: APIGatewayEvent = {
        resource: "resource",
        httpMethod: "GET",
        isBase64Encoded: false,
        requestContext: {
          requestId: "requestId",
        },
      } as APIGatewayEvent;
      await handler(event, context as Context);

      const logger = new Logger();
      const handlerPowerTools = middy(() => {
        expect(global.x_correlation_id).toEqual("requestId");
        expect(global.x_correlation_trigger).toEqual("APIGateway");
        expect(global.x_correlation_status).toEqual("created");
        expect(logger.getPersistentLogAttributes().x_correlation_id).toEqual(
          "requestId",
        );
      });
      const powertoolsLogger: PowerToolsLoggerOptions = {
        logger,
      };
      handlerPowerTools.use(correlationIdMiddleware(powertoolsLogger));
    });

    test("AWS API Gateway event transfers correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("x_correlation_id");
        expect(global.x_correlation_trigger).toEqual("APIGateway");
        expect(global.x_correlation_status).toEqual("passed");
      });
      handler.use(correlationIdMiddleware());
      const event: APIGatewayEvent = {
        resource: "resource",
        httpMethod: "GET",
        isBase64Encoded: false,
        requestContext: {
          requestId: "requestId",
        },
        headers: {
          x_correlation_id: "x_correlation_id",
        },
      } as unknown as APIGatewayEvent;
      await handler(event, context as Context);
    });
  });

  describe("AWS Lambda requests", () => {
    test("AWS Lambda context creates correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("awsRequestId");
        expect(global.x_correlation_trigger).toEqual("Lambda");
        expect(global.x_correlation_status).toEqual("created");
      });
      handler.use(correlationIdMiddleware());
      const event = {};
      const lambdaContext: Context = {
        functionName: "functionName",
        awsRequestId: "awsRequestId",
      } as Context;
      await handler(event, lambdaContext);
    });

    test("AWS Lambda passed correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("x_correlation_id");
        expect(global.x_correlation_trigger).toEqual("Lambda");
        expect(global.x_correlation_status).toEqual("passed");
      });
      handler.use(correlationIdMiddleware());
      const event = {
        x_correlation_id: "x_correlation_id",
      };
      await handler(event, context as Context);
    });
  });

  describe("AWS SNS requests", () => {
    test("SNS Event creates correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("messageId");
        expect(global.x_correlation_trigger).toEqual("SNS");
        expect(global.x_correlation_status).toEqual("created");
      });
      handler.use(correlationIdMiddleware());
      const event = {
        Records: [
          {
            Sns: {
              MessageId: "messageId",
              Message: "message",
              Timestamp: "timestamp",
            },
          },
        ],
      };
      await handler(event, context as Context);
    });

    test("SNS Event transfers correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("x_correlation_id");
        expect(global.x_correlation_trigger).toEqual("SNS");
        expect(global.x_correlation_status).toEqual("passed");
      });
      handler.use(correlationIdMiddleware());
      const event = {
        Records: [
          {
            Sns: {
              MessageId: "messageId",
              Message: "message",
              Timestamp: "timestamp",
              MessageAttributes: {
                x_correlation_id: {
                  Type: "String",
                  Value: "x_correlation_id",
                },
              },
            },
          },
        ],
      };
      await handler(event, context as Context);
    });
  });

  describe("AWS SQS requests", () => {
    test("SQS Event creates correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("messageId");
        expect(global.x_correlation_trigger).toEqual("SQS");
        expect(global.x_correlation_status).toEqual("created");
      });
      handler.use(correlationIdMiddleware());
      const event = {
        Records: [
          {
            messageId: "messageId",
            receiptHandle: "receiptHandle",
            body: "body",
            md5OfBody: "md5OfBody",
            eventSource: "eventSource",
            eventSourceARN: "eventSourceARN",
            awsRegion: "awsRegion",
          },
        ],
      };
      await handler(event, context as Context);
    });

    test("SQS Event transfers correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("x_correlation_id");
        expect(global.x_correlation_trigger).toEqual("SQS");
        expect(global.x_correlation_status).toEqual("passed");
      });
      handler.use(correlationIdMiddleware());
      const event = {
        Records: [
          {
            messageId: "messageId",
            receiptHandle: "receiptHandle",
            body: "body",
            md5OfBody: "md5OfBody",
            eventSource: "eventSource",
            eventSourceARN: "eventSourceARN",
            awsRegion: "awsRegion",
            messageAttributes: {
              x_correlation_id: {
                stringValue: "x_correlation_id",
                dataType: "String",
              },
            },
          },
        ],
      };
      await handler(event, context as Context);
    });
  });

  describe("AWS EventBridge requests", () => {
    test("EventBridge Event creates correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("eventBridgeEventId");
        expect(global.x_correlation_trigger).toEqual(
          "EventBridge: detail-type",
        );
        expect(global.x_correlation_status).toEqual("created");
      });
      handler.use(correlationIdMiddleware());
      const event = {
        id: "eventBridgeEventId",
        "detail-type": "detail-type",
        source: "source",
        account: "account",
      };
      await handler(event, context as Context);
    });

    test("EventBridge Event transfers correlation id", async () => {
      const handler = middy(() => {
        expect(global.x_correlation_id).toEqual("x_correlation_id");
        expect(global.x_correlation_trigger).toEqual(
          "EventBridge: detail-type",
        );
        expect(global.x_correlation_status).toEqual("passed");
      });
      handler.use(correlationIdMiddleware());
      const event = {
        id: "eventBridgeEventId",
        "detail-type": "detail-type",
        source: "source",
        account: "account",
        detail: {
          x_correlation_id: "x_correlation_id",
        },
      };
      await handler(event, context as Context);
    });
  });
});
