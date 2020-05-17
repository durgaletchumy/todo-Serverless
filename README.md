# Functionality of the application

This application creates, removes, updates and retrieves the ToDo items. Each ToDo item can optionally have an attachment image. Once the attachment is uploaded it will trigger an SNS event to resize the image to a fixed size to be displayed in the client. Each user only has access to TODO items that he/she has created.


# Functions implemented

* `Auth` - this function implements a custom authorizer for API Gateway that should be added to all other functions.

* `GetTodos` - returns all ToDos for a current user. A user id can be extracted from a JWT token that is sent by the frontend

* `CreateTodo` - creates a new ToDo for a current user. A shape of data send by a client application to this function can be found in the `CreateTodoRequest.ts` file

* `UpdateTodo` - updates a TODO item created by a current user. A shape of data send by a client application to this function can be found in the `UpdateTodoRequest.ts` file

The id of an item that should be updated is passed as a URL parameter.

It should return an empty body.

* `DeleteTodo` - should delete a TODO item created by a current user. Expects an id of a TODO item to remove.

It should return an empty body.

* `GenerateUploadUrl` - returns a pre-signed URL that can be used to upload an attachment file for a TODO item.

* `ResizeImage` - Resizes the image that was uploaded through the upload URL based on an SNS event that is published when an object is created in the S3 bucket.


# How to run the application

## Frontend

To run a client application run the following commands:

```
cd client
npm install
npm run start
```

This should start a development server with the React application that will interact with the ToDo serverless application.

# Postman collection

An alternative way to test your API, you can use the Postman collection that contains sample requests. You can find a Postman collection in this project. 
