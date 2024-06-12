import { Context, SNSEvent, EventBridgeEvent, SQSEvent } from "aws-lambda";

export const isLambdaRequest = (context: unknown): context is Context => {
  const c = context as Context;
  return (
    c &&
    typeof c.functionName === "string" &&
    typeof c.awsRequestId === "string"
  );
};

export const isSNSRequest = (event: unknown): event is SNSEvent => {
  const e = event as SNSEvent;
  if (e && Array.isArray(e.Records)) {
    if (e.Records.length === 0) {
      return false;
    }
    const record = e.Records[0];
    const recordAttributes =
      record &&
      record.Sns &&
      typeof record.Sns.MessageId === "string" &&
      typeof record.Sns.Message === "string" &&
      typeof record.Sns.Timestamp === "string";
    if (recordAttributes) {
      return true;
    }
  }
  return false;
};

export const isCorrelationIdRequest = (
  event: unknown,
): event is { x_correlation_id: string } => {
  const e = event as { x_correlation_id: string };
  return e && typeof e.x_correlation_id === "string";
};

/* eslint-disable @typescript-eslint/no-explicit-any */
export const isEventBridgeRequest = (
  event: unknown,
): event is EventBridgeEvent<string, any> => {
  const e = event as EventBridgeEvent<string, any>;
  return (
    e &&
    typeof e.id === "string" &&
    typeof e.source === "string" &&
    typeof e.account === "string"
  );
};
/* eslint-disable @typescript-eslint/no-explicit-any */

export const isSQSRequest = (event: unknown): event is SQSEvent => {
  const e = event as SQSEvent;
  if (e && Array.isArray(e.Records)) {
    if (e.Records.length === 0) {
      return false;
    }
    const record = e.Records[0];
    const recordAttributes =
      record &&
      typeof record.messageId === "string" &&
      typeof record.receiptHandle === "string" &&
      typeof record.md5OfBody === "string";
    if (recordAttributes) {
      return true;
    }
  }
  return false;
};
