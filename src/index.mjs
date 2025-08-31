import { SNSClient, PublishCommand } from "@aws-sdk/client-sns";

const snsClient = new SNSClient({ region: process.env.AWS_REGION });
const TOPIC_ARN = process.env.S3_OBJECT_UPLOADED_TOPIC;

export const handler = async (event) => {

  console.log("Received S3 event:", JSON.stringify(event, null, 2));

  const records = event.Records || [];
  const messages = records.map((r) => {
    const bucket = r.s3.bucket.name;
    const key = decodeURIComponent(r.s3.object.key.replace(/\+/g, " "));
    const size = r.s3.object.size;
    const etag = r.s3.object.eTag;
    const eventTime = r.eventTime;

    return `- s3://${bucket}/${key} (size: ${size}, etag: ${etag}, time: ${eventTime})`;
  });

  const subject = "New S3 Object Uploaded";
  const body =
    `The following object(s) were uploaded:\n\n` +
    messages.join("\n") +
    `\n\nProcessed at: ${new Date().toISOString()}`;

  try {
    const command = new PublishCommand({
      TopicArn: TOPIC_ARN,
      Subject: subject,
      Message: body,
    });
    await snsClient.send(command);

    console.log(`Published message to SNS: ${TOPIC_ARN}`);
    return { status: "ok", published: messages.length };
  } catch (err) {
    console.error("Error publishing to SNS:", err);
    throw err;
  }
};
