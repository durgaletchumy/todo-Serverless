import 'source-map-support/register'
import { SNSHandler } from 'aws-lambda'
import { createLogger } from '../../utils/logger'
import { resizeImage } from '../../businessLogic/todo'

const resizeImageLogger = createLogger('resizeImageLogger')

export const handler: SNSHandler = async (event) => {
  resizeImageLogger.info('Processing resize image SNS Handler ', JSON.stringify(event))

  for (const snsRecord of event.Records) {
    const s3EventStr = snsRecord.Sns.Message
    resizeImageLogger.info('S3 Event', s3EventStr)

    const s3Event = JSON.parse(s3EventStr)

    for (const record of s3Event.Records) {
      const resizeImageResponse = await resizeImage(record)
      
      resizeImageLogger.info('resizeImageResponse',resizeImageResponse)
    }
  }
}
