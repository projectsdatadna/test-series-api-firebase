const AWS = require('aws-sdk');

const s3 = new AWS.S3();
const dynamodb = new AWS.DynamoDB.DocumentClient();

const S3_BUCKET = process.env.S3_BUCKET;
const DYNAMO_TABLE = process.env.DYNAMO_TABLE;

/**
 * Upload image buffer to S3
 * @param {Buffer} buffer - Image buffer
 * @param {string} imageId - Unique image ID
 * @returns {Promise<object>} - { s3Key, imageUrl }
 */
async function uploadImageToS3(buffer, imageId) {
  if (!S3_BUCKET) {
    throw new Error('S3_BUCKET environment variable not set');
  }

  const s3Key = `generated-images/${imageId}.png`;

  await s3.putObject({
    Bucket: S3_BUCKET,
    Key: s3Key,
    Body: buffer,
    ContentType: 'image/png',
  }).promise();

  const imageUrl = `https://${S3_BUCKET}.s3.${process.env.AWS_REGION}.amazonaws.com/${s3Key}`;

  console.log(`S3: ${s3Key}`);

  return { s3Key, imageUrl };
}

/**
 * Store image metadata in DynamoDB
 * @param {object} metadata - Image metadata
 * @returns {Promise<void>}
 */
async function storeImageMetadata(metadata) {
  if (!DYNAMO_TABLE) {
    throw new Error('DYNAMO_TABLE environment variable not set');
  }

  const {
    imageId,
    prompt,
    enrichedPrompt,
    imageType,
    model,
    subject,
    language,
    langCode,
    isNonEnglish,
    title,
    labels,
    diagramHTML,
    s3Key,
    imageUrl,
    contentId,
    visualIndex,
  } = metadata;

  await dynamodb.put({
    TableName: DYNAMO_TABLE,
    Item: {
      imageId,
      prompt,
      enrichedPrompt,
      imageType,
      model,
      subject,
      language,
      langCode,
      isNonEnglish,
      title,
      labels: typeof labels === 'string' ? labels : JSON.stringify(labels),
      diagramHTML: diagramHTML || null,
      s3Key,
      imageUrl,
      contentId: contentId || null,
      visualIndex: visualIndex ?? null,
      createdAt: new Date().toISOString(),
    },
  }).promise();

  console.log(`DynamoDB: ${imageId}`);
}

/**
 * Retrieve image metadata from DynamoDB
 * @param {string} imageId - Image ID
 * @returns {Promise<object>} - Image metadata
 */
async function getImageMetadata(imageId) {
  if (!DYNAMO_TABLE) {
    throw new Error('DYNAMO_TABLE environment variable not set');
  }

  const result = await dynamodb.get({
    TableName: DYNAMO_TABLE,
    Key: { imageId },
  }).promise();

  return result.Item || null;
}

/**
 * Update image metadata in DynamoDB
 * @param {string} imageId - Image ID
 * @param {object} updates - Fields to update
 * @returns {Promise<void>}
 */
async function updateImageMetadata(imageId, updates) {
  if (!DYNAMO_TABLE) {
    throw new Error('DYNAMO_TABLE environment variable not set');
  }

  const updateExpression = Object.keys(updates)
    .map((key, idx) => `${key} = :val${idx}`)
    .join(', ');

  const expressionAttributeValues = {};
  Object.entries(updates).forEach(([key, value], idx) => {
    expressionAttributeValues[`:val${idx}`] = value;
  });

  await dynamodb.update({
    TableName: DYNAMO_TABLE,
    Key: { imageId },
    UpdateExpression: `SET ${updateExpression}`,
    ExpressionAttributeValues: expressionAttributeValues,
  }).promise();

  console.log(`DynamoDB updated: ${imageId}`);
}

module.exports = {
  uploadImageToS3,
  storeImageMetadata,
  getImageMetadata,
  updateImageMetadata,
};
