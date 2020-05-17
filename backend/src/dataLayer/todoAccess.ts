import * as AWS  from 'aws-sdk'
import Jimp from 'jimp/es'
import { DocumentClient } from 'aws-sdk/clients/dynamodb'
import { TodoItem } from '../models/TodoItem'
import { TodoUpdate } from '../models/TodoUpdate'
import { S3EventRecord } from 'aws-lambda'
import { createLogger } from '../utils/logger'

const todoAccessLogger = createLogger('todoAccessLogger')

const AWSXRay = require('aws-xray-sdk')

const XAWS = AWSXRay.captureAWS(AWS)

export class TodoAccess {
  constructor(
    private readonly docClient: DocumentClient = new XAWS.DynamoDB.DocumentClient(),
    private readonly todoTable = process.env.TODO_TABLE,
    private readonly todoIndex = process.env.TODO_ID_INDEX,
    private readonly s3 = new XAWS.S3({ signatureVersion: 'v4' }),
    private readonly bucketName = process.env.TODO_IMAGES_BUCKET,
    private readonly thumbnailImagesBucket = process.env.THUMBNAIL_IMAGES_BUCKET,
    private readonly urlExpiration = process.env.SIGNED_URL_EXPIRATION) {}

  async createTodo(todo: TodoItem): Promise<TodoItem> {
    await this.docClient.put({
      TableName: this.todoTable,
      Item: todo
    }).promise()

    return todo
  }

  async getTodo(userId:string, todoId:string) {

    let items = []

    if (todoId) {
      const result = await this.docClient.query({
        TableName: this.todoTable,
        IndexName: this.todoIndex,
        KeyConditionExpression: 'todoId=:todoId and userId=:userId',
        ExpressionAttributeValues: {
          ':userId': userId,
          ':todoId': todoId
        },
        ScanIndexForward: false
      }).promise()

      console.log('result1', result)      
      items = result.Items
    } else {
      const result = await this.docClient.query({
        TableName: this.todoTable,
        IndexName: this.todoIndex,
        KeyConditionExpression: 'userId = :userId',
        ExpressionAttributeValues: {
          ':userId': userId
        },
        ScanIndexForward: false
      }).promise()
      
      console.log('result2', result)
      items = result.Items
    }

    console.log('items',items)
    return items
  }

  async updateTodo(userId:string, createdAt:string, updatedTodo:TodoUpdate) {
     await this.docClient.update({
      TableName: this.todoTable,
      Key:{
        "userId": userId,
        "createdAt": createdAt
      },
      UpdateExpression: "set #n=:name, dueDate=:dueDate, done=:done",
      ExpressionAttributeValues:{
        ":name": updatedTodo.name,
        ":dueDate": updatedTodo.dueDate,
        ":done": updatedTodo.done
      },
      ExpressionAttributeNames:{
        "#n": "name"
      },
      ReturnValues:"UPDATED_NEW"
    }).promise()
  }

  async deleteTodo(userId:string, createdAt:string) {
    await this.docClient.delete({
      TableName: this.todoTable,
      Key:{
        "userId": userId,
        "createdAt": createdAt
      }
    }).promise()
  }

  async createTodoImage(userId:string, createdAt:string, imageId:string) {
    const thumbnailImagesBucket = this.thumbnailImagesBucket
    todoAccessLogger.info('imageId',imageId)
    const newItem = await this.docClient.update({
      TableName: this.todoTable,
      Key:{
        "userId": userId,
        "createdAt": createdAt
      },
      UpdateExpression: "set attachmentUrl=:attachmentUrl",
      ExpressionAttributeValues:{
        ":attachmentUrl": `https://${thumbnailImagesBucket}.s3.amazonaws.com/${imageId}`
      },
      ReturnValues:"UPDATED_NEW"
    }).promise()

    todoAccessLogger.info('newItem',newItem)
    return newItem
  }

  async getUploadUrl(imageId:string) {
    const url = this.s3.getSignedUrl( 'putObject', {
      Bucket: this.bucketName,
      Key: imageId,
      Expires: this.urlExpiration
    })

    return url
  }

  async resizeImage(snsRecord:S3EventRecord) {
    const key = snsRecord.s3.object.key
    const todoImageBucket = this.bucketName
    const thumbnailImagesBucket = this.thumbnailImagesBucket
  
    const response = await this.s3
      .getObject({
        Bucket: todoImageBucket,
        Key: key
      }).promise()
  
    const body = response.Body
    const originalImage = await Jimp.read(body)
  
    originalImage.resize(150, Jimp.AUTO)
    
    const resizedImageBuffer = await originalImage.getBufferAsync(Jimp.AUTO)
  
    await this.s3
      .putObject({
        Bucket: thumbnailImagesBucket,
        Key: key,
        Body: resizedImageBuffer
      }).promise()
  }
}