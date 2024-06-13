import { Logger } from "@aws-lambda-powertools/logger";
import { MiddlewareObj, Request } from "@middy/core";
import { APIGatewayEvent, SQSRecord } from "aws-lambda";
import {
  isSNSRequest,
  isSQSRequest,
  isEventBridgeRequest,
  isLambdaRequest,
  isCorrelationIdRequest,
} from "./typeguards";
import { ExtendedGlobal } from "./extended-global";
declare const global: ExtendedGlobal;

/**
 * Specifies the name of the correlation id attribute.
 *
 * The correlation id is used to correlate logs and traces across different services.
 */
const correlationIdName = "x_correlation_id";

/**
 * Specifies the name of the correlation trigger attribute.
 *
 * The trigger passes an event to the lambda that contains the correlation id.
 * This field specifies the name of the trigger.
 */
const correlationTriggerName = "x_correlation_trigger";

/**
 * Specifies the status of the correlation id.
 * It can either be 'created' or 'passed'.
 *
 * If the correlation id is 'created', it means that the correlation id is created
 * by the middleware otherwise it is 'passed' which means that the correlation id
 * is generated by another service and passed to the current service.
 */
const correlationStatusName = "x_correlation_status";

enum CorrelationStatus {
  CREATED = "created",
  PASSED = "passed",
}

enum CorrelationTrigger {
  API_GATEWAY = "APIGateway",
  SNS = "SNS",
  SQS = "SQS",
  EVENT_BRIDGE = "EventBridge",
  LAMBDA = "Lambda",
}

type CorrelationIdType = {
  x_correlation_id: string;
};

type PowerToolsLoggerOptions = {
  logger: Logger | null;
  options?: {
    logCorrelationId?: boolean;
    logCorrelationTrigger?: boolean;
    logCorrelationStatus?: boolean;
  };
};

const correlationIdMiddleware = (
  powertoolsLoggerOptions?: PowerToolsLoggerOptions,
): MiddlewareObj => {
  if (powertoolsLoggerOptions) {
    if (!powertoolsLoggerOptions.options) {
      // Add default options
      powertoolsLoggerOptions.options = {
        logCorrelationId: true,
        logCorrelationStatus: false,
        logCorrelationTrigger: false,
      };
    }
  }

  function setCorrelationId(correlationId: string) {
    if (
      powertoolsLoggerOptions?.options?.logCorrelationId &&
      powertoolsLoggerOptions?.logger
    ) {
      powertoolsLoggerOptions.logger.addPersistentLogAttributes({
        x_correlation_id: correlationId,
      });
    }
    (global as ExtendedGlobal)[correlationIdName] = correlationId;
  }

  function unsetCorrelationId() {
    if (
      powertoolsLoggerOptions?.options?.logCorrelationId &&
      powertoolsLoggerOptions?.logger
    ) {
      powertoolsLoggerOptions.logger.removePersistentLogAttributes([
        correlationIdName,
      ]);
    }
    delete (global as ExtendedGlobal)[correlationIdName];
  }

  function setCorrelationTrigger(trigger: string) {
    if (
      powertoolsLoggerOptions?.options?.logCorrelationTrigger &&
      powertoolsLoggerOptions?.logger
    ) {
      powertoolsLoggerOptions.logger.addPersistentLogAttributes({
        x_correlation_trigger: trigger,
      });
    }
    (global as ExtendedGlobal)[correlationTriggerName] = trigger;
  }

  function unsetCorrelationTrigger() {
    if (
      powertoolsLoggerOptions?.options?.logCorrelationTrigger &&
      powertoolsLoggerOptions?.logger
    ) {
      powertoolsLoggerOptions.logger.removePersistentLogAttributes([
        correlationTriggerName,
      ]);
    }
    delete (global as ExtendedGlobal)[correlationTriggerName];
  }

  function setCorrelationStatus(status: string) {
    if (
      powertoolsLoggerOptions?.options?.logCorrelationStatus &&
      powertoolsLoggerOptions?.logger
    ) {
      powertoolsLoggerOptions.logger.addPersistentLogAttributes({
        x_correlation_status: status,
      });
    }
    (global as ExtendedGlobal)[correlationStatusName] = status;
  }

  function unsetCorrelationStatus() {
    if (
      powertoolsLoggerOptions?.options?.logCorrelationStatus &&
      powertoolsLoggerOptions?.logger
    ) {
      powertoolsLoggerOptions.logger.removePersistentLogAttributes([
        correlationStatusName,
      ]);
    }
    delete (global as ExtendedGlobal)[correlationStatusName];
  }

  const before = async (request: Request) => {
    if (isAPIGatewayEvent(request.event)) {
      setCorrelationTrigger(CorrelationTrigger.API_GATEWAY);
      if (request.event.headers && request.event.headers[correlationIdName]) {
        setCorrelationId(request.event.headers[correlationIdName]);
        setCorrelationStatus(CorrelationStatus.PASSED);
        return;
      } else {
        setCorrelationId(request.event.requestContext.requestId);
        setCorrelationStatus(CorrelationStatus.CREATED);
        return;
      }
    } else if (isSNSRequest(request.event)) {
      setCorrelationTrigger(CorrelationTrigger.SNS);
      const record = request.event.Records[0];
      if (record) {
        if (
          record.Sns.MessageAttributes &&
          record.Sns.MessageAttributes[correlationIdName]
        ) {
          setCorrelationId(
            record.Sns.MessageAttributes[correlationIdName].Value,
          );
          setCorrelationStatus(CorrelationStatus.PASSED);
          return;
        } else {
          setCorrelationId(record.Sns.MessageId);
          setCorrelationStatus(CorrelationStatus.CREATED);
          return;
        }
      }
    } else if (isSQSRequest(request.event)) {
      const record: SQSRecord | undefined = request.event.Records[0];
      if (!record) {
        return;
      }
      setCorrelationTrigger(CorrelationTrigger.SQS);
      if (
        record.messageAttributes &&
        record.messageAttributes[correlationIdName]
      ) {
        setCorrelationId(
          record.messageAttributes[correlationIdName].stringValue || "N/A",
        );
        setCorrelationStatus(CorrelationStatus.PASSED);
        return;
      } else {
        setCorrelationId(record.messageId);
        setCorrelationStatus(CorrelationStatus.CREATED);
        return;
      }
    } else if (isEventBridgeRequest(request.event)) {
      setCorrelationTrigger("EventBridge: " + request.event["detail-type"]);
      if (request.event.detail && request.event.detail[correlationIdName]) {
        setCorrelationId(request.event.detail[correlationIdName]);
        setCorrelationStatus(CorrelationStatus.PASSED);
        return;
      } else {
        setCorrelationId(request.event.id);
        setCorrelationStatus(CorrelationStatus.CREATED);
        return;
      }
    } else if (isLambdaRequest(request.context)) {
      setCorrelationTrigger(CorrelationTrigger.LAMBDA);
      if (isCorrelationIdRequest(request.event)) {
        setCorrelationId(request.event.x_correlation_id);
        setCorrelationStatus(CorrelationStatus.PASSED);
        return;
      } else {
        setCorrelationId(request.context.awsRequestId);
        setCorrelationStatus(CorrelationStatus.CREATED);
        return;
      }
    }
  };

  const after = async () => {
    unsetCorrelationId();
    unsetCorrelationTrigger();
    unsetCorrelationStatus();
  };

  return {
    before,
    after,
  };
};

const isAPIGatewayEvent = (event: unknown): event is APIGatewayEvent => {
  const e = event as APIGatewayEvent;
  return (
    e &&
    typeof e.resource === "string" &&
    typeof e.httpMethod === "string" &&
    typeof e.isBase64Encoded === "boolean"
  );
};

export {
  correlationIdMiddleware,
  type CorrelationIdType,
  type PowerToolsLoggerOptions,
};
